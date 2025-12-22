# app/main.py
from __future__ import annotations

import os
import json
import shutil
from typing import Any, Dict, List, Optional

from fastapi import (
    FastAPI,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.core.config import settings
from app.db.database import SessionLocal, engine, Base
from app.db import crud, models
from app.ai.ai_manager import AIManager
from app.ai import tools as ai_tools
from app.utils.logger import logger, log_api_call
from app.utils.context_manager import ContextManager

load_dotenv()

# 数据库初始化（可选）
# 通过环境变量控制是否自动初始化数据库
AUTO_INIT_DB = os.getenv("AUTO_INIT_DB", "0") == "1"
if AUTO_INIT_DB:
    Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 如需限制，可改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


ai_manager = AIManager()


# ========== 基础接口 ==========


@app.post("/init-database")
def init_database():
    """手动初始化数据库（创建所有表）"""
    try:
        Base.metadata.create_all(bind=engine)
        return {"success": True, "message": "数据库初始化成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"数据库初始化失败: {str(e)}")


@app.get("/models")
def get_models():
    return {
        "default": settings.AI_MODEL,
        "models": settings.ai_models,
    }


@app.get("/provider/config")
def get_provider_config():
    """
    原有接口：返回当前运行时的 provider 配置。
    现在的实现：仅返回 .env 的静态配置是否存在，真正的多 Provider 管理用 /providers 系列接口。
    """
    has_key = bool(settings.AI_API_KEY.strip())
    return {
        "api_base": settings.AI_API_BASE,
        "has_key": has_key,
        "default_model": settings.AI_MODEL,
        "models": settings.ai_models,
    }


@app.post("/provider/config")
def set_provider_config(
    api_base: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
):
    """
    原有接口：运行时覆盖当前 provider。
    为了兼容旧前端，这里仍然支持 set_provider，但实际上更推荐使用 /providers 管理。
    """
    try:
        ai_manager.set_provider(
            api_base=api_base or settings.AI_API_BASE,
            api_key=api_key or settings.AI_API_KEY,
            default_model=model or settings.AI_MODEL,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"success": True}


# ========== 会话管理 ==========


@app.post("/conversations")
def create_conversation(
    title: Optional[str] = Form("新对话"),
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    conv = crud.create_conversation(db, title=title, model=model)
    return conv.to_dict()


@app.get("/conversations")
def list_conversations(db: Session = Depends(get_db)):
    conversations = crud.get_conversations(db)
    return [conv.to_dict() for conv in conversations]


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    crud.delete_conversation(db, conversation_id)
    return {"success": True}


@app.post("/conversations/{conversation_id}/title")
def update_conversation_title(
    conversation_id: int,
    title: str = Form(...),
    db: Session = Depends(get_db),
):
    conv = crud.update_conversation_title(db, conversation_id, title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


@app.post("/conversations/{conversation_id}/auto-title")
def auto_generate_conversation_title(
    conversation_id: int,
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    基于对话内容自动生成标题
    """
    import traceback
    
    conversation = crud.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # 获取对话的前几条消息用于生成标题
    messages_db = crud.get_messages(db, conversation_id)
    if len(messages_db) < 2:  # 至少需要一轮对话
        raise HTTPException(status_code=400, detail="对话内容不足，无法生成标题")
    
    # 取前4条消息作为上下文
    context_messages = messages_db[:4]
    context_text = "\n".join([f"{m.role}: {m.content[:200]}" for m in context_messages])  # 限制每条消息长度
    
    # 构建标题生成的提示
    title_prompt = f"""请为以下对话生成一个简洁的标题（不超过10个字）：

{context_text}

要求：
1. 标题要准确概括对话主题
2. 使用中文
3. 不超过10个字
4. 不要包含引号或特殊符号
5. 直接返回标题，不要其他内容

标题："""

    try:
        # 配置AI Provider
        print(f"配置Provider for conversation {conversation_id}")
        _configure_ai_provider_for_conversation(db, conversation)
        
        # 确定使用的模型
        use_model = model or conversation.model or settings.AI_MODEL
        print(f"使用模型: {use_model}")
        
        # 调用AI生成标题
        title_messages = [{"role": "user", "content": title_prompt}]
        print(f"调用AI生成标题...")
        
        # 添加超时和重试机制
        try:
            result = ai_manager.chat(title_messages, model=use_model, stream=False)
            # 从结果中提取内容
            if isinstance(result, dict) and "content" in result:
                generated_title = result["content"]
            else:
                generated_title = str(result)
        except Exception as api_error:
            print(f"API调用失败: {api_error}")
            # 如果API调用失败，使用简单的标题生成逻辑
            user_message = context_messages[0].content if context_messages else "新对话"
            generated_title = user_message[:15] + "..." if len(user_message) > 15 else user_message
            print(f"使用备用标题: {generated_title}")
        
        print(f"生成的标题: {generated_title}")
        
        # 清理生成的标题
        generated_title = str(generated_title).strip().replace('"', '').replace("'", "").replace("标题：", "").replace("标题:", "")
        if len(generated_title) > 10:
            generated_title = generated_title[:10]
        
        # 确保标题不为空
        if not generated_title or generated_title.isspace():
            generated_title = "新对话"
        
        # 更新对话标题
        conv = crud.update_conversation_title(db, conversation_id, generated_title)
        return {"title": generated_title, "conversation": conv.to_dict()}
        
    except Exception as e:
        print(f"标题生成错误: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"标题生成失败: {str(e)}")



@app.post("/conversations/{conversation_id}/pin")
def update_conversation_pin(
    conversation_id: int,
    is_pinned: bool = Form(...),
    db: Session = Depends(get_db),
):
    conv = crud.update_conversation_pin(db, conversation_id, is_pinned)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


@app.post("/conversations/{conversation_id}/model")
def update_conversation_model(
    conversation_id: int,
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    conv = crud.update_conversation_model(db, conversation_id, model)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


# 新增：更新会话功能开关（知识库/MCP/联网搜索）
@app.post("/conversations/{conversation_id}/features")
def update_conversation_features(
    conversation_id: int,
    enable_knowledge_base: Optional[bool] = Form(None),
    enable_mcp: Optional[bool] = Form(None),
    enable_web_search: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
):
    conv = crud.update_conversation_features(
        db,
        conversation_id,
        enable_knowledge_base=enable_knowledge_base,
        enable_mcp=enable_mcp,
        enable_web_search=enable_web_search,
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


# 新增：绑定 Provider 到会话
@app.post("/conversations/{conversation_id}/provider")
def set_conversation_provider(
    conversation_id: int,
    provider_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    conv = crud.set_conversation_provider(db, conversation_id, provider_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


# ========== 消息与聊天 ==========


@app.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    messages = crud.get_messages(db, conversation_id)
    return [msg.to_dict() for msg in messages]


def _configure_ai_provider_for_conversation(
    db: Session,
    conversation: models.Conversation,
    override_provider_id: Optional[int] = None,
) -> None:
    """
    根据会话绑定的 provider 或覆盖参数，配置 AIManager 当前使用的 provider。
    """
    provider: Optional[models.Provider] = None

    if override_provider_id is not None:
        provider = crud.get_provider(db, override_provider_id)
    elif conversation.provider_id:
        provider = crud.get_provider(db, conversation.provider_id)

    if provider:
        ai_manager.set_provider(
            api_base=provider.api_base,
            api_key=provider.api_key,
            default_model=conversation.model or provider.default_model,
        )
    else:
        # 使用全局默认
        ai_manager.set_provider(
            api_base=settings.AI_API_BASE,
            api_key=settings.AI_API_KEY,
            default_model=conversation.model or settings.AI_MODEL,
        )


def _execute_chat_with_tools(
    messages: List[Dict[str, Any]], 
    tools_list: List[Dict[str, Any]], 
    model: Optional[str],
    conversation_id: int,
    db: Session
) -> tuple[str, Dict[str, Any]]:
    """
    执行带工具的对话，包括工具调用循环
    """
    import json
    from app.ai import tools as ai_tools
    
    # 累计token统计
    total_input_tokens = 0
    total_output_tokens = 0
    
    # 工具调用循环
    current_messages = messages.copy()
    max_iterations = 5  # 防止无限循环
    
    for iteration in range(max_iterations):
        # 调用模型
        data = ai_manager.run_with_tools(current_messages, tools=tools_list, model=model, stream=False)
        
        # 累计token统计
        usage = data.get("usage", {})
        total_input_tokens += usage.get("prompt_tokens", 0)
        total_output_tokens += usage.get("completion_tokens", 0)
        
        message = data["choices"][0]["message"]
        current_messages.append(message)
        
        # 检查是否有工具调用
        tool_calls = message.get("tool_calls")
        if not tool_calls:
            # 没有工具调用，返回最终结果
            final_content = message.get("content", "")
            token_info = {
                "model": model or "default",
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
                "total_tokens": total_input_tokens + total_output_tokens
            }
            return final_content, token_info
        
        # 执行工具调用
        for tool_call in tool_calls:
            function_name = tool_call["function"]["name"]
            function_args = json.loads(tool_call["function"]["arguments"])
            
            # 执行工具
            try:
                result = _execute_tool(function_name, function_args, conversation_id, db)
            except Exception as e:
                result = f"工具执行失败: {str(e)}"
            
            # 添加工具调用结果到消息历史
            current_messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": result
            })
    
    # 如果达到最大迭代次数，返回最后的消息
    final_content = current_messages[-1].get("content", "达到最大工具调用次数限制")
    token_info = {
        "model": model or "default",
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
        "total_tokens": total_input_tokens + total_output_tokens
    }
    return final_content, token_info


def _execute_tool(function_name: str, function_args: Dict[str, Any], conversation_id: int, db: Session) -> str:
    """
    执行具体的工具调用
    """
    from app.ai import tools as ai_tools
    
    try:
        if function_name == "get_local_time":
            return ai_tools.run_get_local_time_tool()
        
        elif function_name == "calculate_expression":
            expression = function_args.get("expression", "")
            return ai_tools.run_calculator_tool(expression)
        
        elif function_name == "search_knowledge":
            query = function_args.get("query", "")
            kb_id = function_args.get("kb_id")
            top_k = function_args.get("top_k", 5)
            
            # 创建embedding函数
            def embedding_fn(texts):
                return ai_manager.create_embedding(texts)
            
            return ai_tools.run_search_knowledge_tool(
                query=query,
                kb_id=kb_id,
                top_k=top_k,
                embedding_fn=embedding_fn
            )
        
        elif function_name == "web_search":
            query = function_args.get("query", "")
            source = function_args.get("source", "bing")
            return ai_tools.run_web_search_tool(query=query, source=source)
        
        else:
            return f"未知的工具: {function_name}"
            
    except Exception as e:
        return f"工具执行错误: {str(e)}"


def _build_tools_for_conversation(
    conversation: models.Conversation,
    enable_knowledge_base: Optional[bool],
    enable_mcp: Optional[bool],
    enable_web_search: Optional[bool],
) -> List[Dict[str, Any]]:
    """
    根据会话默认开关 + 本次请求参数，决定启用哪些 tools。
    优先使用本次请求参数，如果为 None 则回退到 conversation 的设置。
    """
    kb_flag = (
        enable_knowledge_base
        if enable_knowledge_base is not None
        else conversation.enable_knowledge_base
    )
    mcp_flag = (
        enable_mcp if enable_mcp is not None else conversation.enable_mcp
    )
    web_flag = (
        enable_web_search
        if enable_web_search is not None
        else conversation.enable_web_search
    )

    return ai_tools.get_tools(
        enable_knowledge_base=kb_flag,
        enable_mcp=mcp_flag,
        enable_web_search=web_flag,
    )


@app.post("/conversations/{conversation_id}/chat")
@log_api_call
def chat_with_conversation(
    conversation_id: int,
    user_text: str = Form(...),
    model: Optional[str] = Form(None),

    # 新增：本次请求的功能开关（可覆盖会话默认）
    enable_knowledge_base: Optional[bool] = Form(None),
    enable_mcp: Optional[bool] = Form(None),
    enable_web_search: Optional[bool] = Form(None),
    web_search_source: Optional[str] = Form(None),  # 搜索源

    # 新增：指定本次使用的 provider（可选）
    provider_id: Optional[int] = Form(None),

    # 新增：是否流式输出（默认 False）
    stream: bool = Form(False),

    db: Session = Depends(get_db),
):
    from datetime import datetime
    start_time = datetime.now()
    
    # 记录聊天请求
    tools_enabled = {
        "knowledge_base": enable_knowledge_base,
        "mcp": enable_mcp,
        "web_search": enable_web_search
    }
    logger.log_chat_request(conversation_id, user_text, model, tools_enabled)
    
    conversation = crud.get_conversation(db, conversation_id)
    if not conversation:
        logger.log_error(Exception("Conversation not found"), f"对话ID {conversation_id} 不存在")
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 1. 写入用户消息
    try:
        user_msg = crud.create_message(db, conversation_id, "user", user_text)
        logger.log_database_operation("CREATE", "messages", user_msg.id, {
            "role": "user", 
            "content_length": len(user_text)
        })
    except Exception as e:
        logger.log_error(e, "创建用户消息失败")
        raise

    # 2. 配置 Provider
    try:
        _configure_ai_provider_for_conversation(db, conversation, override_provider_id=provider_id)
        logger.log_performance("配置Provider", (datetime.now() - start_time).total_seconds())
    except Exception as e:
        logger.log_error(e, "配置Provider失败")
        raise

    # 3. 准备上下文消息
    messages_db = crud.get_messages(db, conversation_id)
    messages: List[Dict[str, Any]] = [
        {"role": m.role, "content": m.content} for m in messages_db
    ]

    # 优化上下文，限制对话轮数为6轮
    messages = ContextManager.optimize_messages(messages, max_turns=6)

    # 如果启用了联网搜索，添加系统提示
    web_flag = (
        enable_web_search
        if enable_web_search is not None
        else conversation.enable_web_search
    )
    if web_flag:
        search_source = web_search_source or "bing"
        system_prompt = f"如需查询最新信息、实时数据或当前事件，请调用 web_search 工具。默认搜索源为 {search_source}。"
        messages.insert(0, {"role": "system", "content": system_prompt})

    # 4. 智能选择工具，减少不必要的工具定义
    conversation_tools = {
        'knowledge_base': enable_knowledge_base if enable_knowledge_base is not None else conversation.enable_knowledge_base,
        'mcp': enable_mcp if enable_mcp is not None else conversation.enable_mcp,
        'web_search': enable_web_search if enable_web_search is not None else conversation.enable_web_search
    }
    
    smart_tools = ContextManager.should_enable_tools(user_text, conversation_tools)
    
    tools_list = _build_tools_for_conversation(
        conversation,
        enable_knowledge_base=smart_tools['knowledge_base'],
        enable_mcp=smart_tools['mcp'],
        enable_web_search=smart_tools['web_search'],
    )

    # 记录聊天上下文
    logger.log_chat_context(messages, tools_list)

    # 如果没有任何工具，就走普通 chat；否则走 run_with_tools
    use_tools = bool(tools_list)

    # 5. 调用大模型
    if not stream:
        try:
            # 记录AI API调用
            logger.log_ai_api_call(
                api_base=ai_manager._provider.api_base,
                model=model or ai_manager._provider.default_model,
                messages_count=len(messages),
                tools_count=len(tools_list),
                stream=False
            )
            
            if use_tools:
                # 执行带工具的对话，包括工具调用循环
                content, token_info = _execute_chat_with_tools(
                    messages, tools_list, model, conversation_id, db
                )
            else:
                result = ai_manager.chat(messages, model=model, stream=False)
                content = result["content"]
                token_info = {
                    "model": result["model"],
                    "input_tokens": result["input_tokens"],
                    "output_tokens": result["output_tokens"],
                    "total_tokens": result["total_tokens"]
                }

            # 记录token使用情况
            logger.log_token_usage(
                model=token_info["model"],
                input_tokens=token_info["input_tokens"],
                output_tokens=token_info["output_tokens"],
                total_tokens=token_info["total_tokens"],
                estimated=token_info.get("estimated", False)
            )

            assistant_msg = crud.create_message(db, conversation_id, "assistant", content, token_info)
            logger.log_database_operation("CREATE", "messages", assistant_msg.id, {
                "role": "assistant",
                "content_length": len(content),
                "token_info": token_info
            })
            
            # 记录整体性能
            total_time = (datetime.now() - start_time).total_seconds()
            logger.log_performance("聊天完成", total_time, {
                "conversation_id": conversation_id,
                "use_tools": use_tools,
                "message_length": len(user_text),
                "response_length": len(content)
            })
            
            return {
                "user_message": {
                    "id": user_msg.id,
                    "role": user_msg.role,
                    "content": user_msg.content,
                    "created_at": user_msg.created_at.isoformat() if user_msg.created_at else None,
                },
                "user_message_id": user_msg.id,  # 明确返回用户消息ID，用于前端确认消息已保存
                "assistant_message": {
                    "id": assistant_msg.id,
                    "role": assistant_msg.role,
                    "content": assistant_msg.content,
                    "created_at": assistant_msg.created_at.isoformat() if assistant_msg.created_at else None,
                    "model": assistant_msg.model,
                    "input_tokens": assistant_msg.input_tokens,
                    "output_tokens": assistant_msg.output_tokens,
                    "total_tokens": assistant_msg.total_tokens,
                },
                "token_info": token_info,
            }
        except Exception as e:
            logger.log_error(e, "AI调用失败", {
                "conversation_id": conversation_id,
                "model": model,
                "use_tools": use_tools,
                "messages_count": len(messages),
                "tools_count": len(tools_list)
            })
            raise HTTPException(status_code=500, detail=f"AI调用失败: {str(e)}")

    # 流式：返回 StreamingResponse，最终拼接完整文本写入 DB
    def event_stream():
        accumulated = []
        token_info = None
        
        # 首先发送 ack 事件，确认用户消息已保存
        yield f"event: ack\n"
        yield f"data: {{\"user_message_id\": {user_msg.id}}}\n\n"
        
        if use_tools:
            # 流式 + tools：执行工具调用并流式返回
            try:
                # 执行带工具的对话，包括工具调用循环
                content, token_info = _execute_chat_with_tools(
                    messages, tools_list, model, conversation_id, db
                )
                
                # 逐字符流式返回
                for char in content:
                    accumulated.append(char)
                    yield f"data: {char}\n\n"
                
                # 发送token信息
                yield f"event: meta\n"
                yield f"data: {json.dumps(token_info)}\n\n"
                yield "data: [DONE]\n\n"
                
                # 写入数据库
                full_text = "".join(accumulated)
                crud.create_message(db, conversation_id, "assistant", full_text, token_info)
                
            except Exception as e:
                yield f"data: [错误] {str(e)}\n\n"
                yield "data: [DONE]\n\n"
        else:
            try:
                # 普通流式对话
                for delta in ai_manager.chat(messages, model=model, stream=True):
                    accumulated.append(delta)
                    yield f"data: {delta}\n\n"
                
                # 流式完成后，获取token统计
                full_text = "".join(accumulated)
                
                # 尝试获取实际的token统计
                try:
                    # 调用一次非流式获取准确的token统计
                    result = ai_manager.chat(messages, model=model, stream=False)
                    token_info = {
                        "model": result.get("model", model or "default"),
                        "input_tokens": result.get("input_tokens", 0),
                        "output_tokens": result.get("output_tokens", 0),
                        "total_tokens": result.get("total_tokens", 0)
                    }
                except:
                    # 如果获取失败，使用估算
                    estimated_input = max(1, len(json.dumps(messages, ensure_ascii=False)) // 4)
                    estimated_output = max(1, len(full_text) // 4)
                    token_info = {
                        "model": model or "default",
                        "input_tokens": estimated_input,
                        "output_tokens": estimated_output,
                        "total_tokens": estimated_input + estimated_output,
                        "estimated": True
                    }
                
                # 发送token信息
                yield f"event: meta\n"
                yield f"data: {json.dumps(token_info)}\n\n"
                yield "data: [DONE]\n\n"
                
                # 完成后将完整回复写入数据库
                crud.create_message(db, conversation_id, "assistant", full_text, token_info)
                
            except Exception as e:
                yield f"data: [错误] {str(e)}\n\n"
                yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ========== 文件上传（对话级） ==========


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/upload")
def upload_file(
    conversation_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    conversation = crud.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    save_dir = os.path.join(UPLOAD_DIR, str(conversation_id))
    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    record = crud.create_uploaded_file(db, conversation_id, file.filename, save_path)
    return record.to_dict()


@app.get("/conversations/{conversation_id}/files")
def list_conversation_files(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    files = crud.get_uploaded_files(db, conversation_id)
    return [file.to_dict() for file in files]


@app.delete("/files/{file_id}")
def delete_conversation_file(file_id: int, db: Session = Depends(get_db)):
    file_record = crud.get_uploaded_file(db, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # 删除本地文件
    try:
        if os.path.exists(file_record.filepath):
            os.remove(file_record.filepath)
    except Exception:
        pass

    crud.delete_uploaded_file(db, file_id)
    return {"success": True}


@app.get("/files/{path:path}")
def get_file(path: str):
    file_path = os.path.join(UPLOAD_DIR, path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


# ========== Provider 管理接口（新增） ==========


@app.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    providers = crud.list_providers(db)
    return [provider.to_dict() for provider in providers]


@app.post("/providers")
def create_provider(
    name: str = Form(...),
    api_base: str = Form(...),
    api_key: str = Form(...),
    default_model: str = Form(...),
    models_str: Optional[str] = Form(None),
    is_default: bool = Form(False),
    db: Session = Depends(get_db),
):
    try:
        # 检查是否已存在同名Provider
        existing = crud.get_provider_by_name(db, name)
        if existing:
            raise HTTPException(status_code=400, detail=f"Provider名称 '{name}' 已存在")
        
        provider = crud.create_provider(
            db,
            name=name,
            api_base=api_base,
            api_key=api_key,
            default_model=default_model,
            models_str=models_str,
            is_default=is_default,
        )
        return provider.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        print(f"创建Provider失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"创建Provider失败: {str(e)}")


@app.post("/providers/{provider_id}")
def update_provider(
    provider_id: int,
    name: Optional[str] = Form(None),
    api_base: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    default_model: Optional[str] = Form(None),
    models_str: Optional[str] = Form(None),
    is_default: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
):
    provider = crud.update_provider(
        db,
        provider_id,
        name=name,
        api_base=api_base,
        api_key=api_key,
        default_model=default_model,
        models_str=models_str,
        is_default=is_default,
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider.to_dict()


@app.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    crud.delete_provider(db, provider_id)
    return {"success": True}


@app.get("/providers/{provider_id}/models")
def get_provider_models(provider_id: int, db: Session = Depends(get_db)):
    """获取指定Provider的模型列表"""
    provider = crud.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    models = []
    if provider.models:
        models = [m.strip() for m in provider.models.split(",") if m.strip()]
    else:
        models = [provider.default_model]
    
    return {
        "provider_id": provider_id,
        "provider_name": provider.name,
        "default_model": provider.default_model,
        "models": models,
    }


@app.get("/models/all")
def get_all_models(db: Session = Depends(get_db)):
    """获取所有Provider的模型列表，用于前端统一显示"""
    providers = crud.list_providers(db)
    all_models = set()
    
    # 添加全局默认模型
    all_models.update(settings.ai_models)
    
    # 添加所有Provider的模型
    for provider in providers:
        if provider.models:
            provider_models = [m.strip() for m in provider.models.split(",") if m.strip()]
            all_models.update(provider_models)
        else:
            all_models.add(provider.default_model)
    
    return {
        "default": settings.AI_MODEL,
        "models": sorted(list(all_models)),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "default_model": p.default_model,
                "models": [m.strip() for m in p.models.split(",") if p.models and m.strip()] or [p.default_model]
            }
            for p in providers
        ]
    }


# ========== 知识库多库管理 + 向量构建接口（新增） ==========


@app.get("/knowledge/bases")
def list_knowledge_bases(db: Session = Depends(get_db)):
    bases = crud.list_knowledge_bases(db)
    return [base.to_dict() for base in bases]


@app.post("/knowledge/bases")
def create_knowledge_base(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    kb = crud.create_knowledge_base(db, name=name, description=description)
    return kb.to_dict()


@app.delete("/knowledge/bases/{kb_id}")
def delete_knowledge_base(kb_id: int, db: Session = Depends(get_db)):
    crud.delete_knowledge_base(db, kb_id)
    return {"success": True}


@app.get("/knowledge/documents")
def list_knowledge_documents(
    kb_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    documents = crud.list_knowledge_documents(db, kb_id=kb_id)
    return [doc.to_dict() for doc in documents]


@app.post("/knowledge/upload")
def upload_knowledge_file(
    kb_id: Optional[int] = Form(None),
    embedding_model: Optional[str] = Form(None),  # 新增：用户选择的向量模型
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    上传一个文件到指定知识库：
    1. 保存原始文件；
    2. 抽取文本（当前简单读为 utf-8 文本，后续可加 PDF/Docx 解析）；
    3. 切分为若干段落；
    4. 调用 embedding 接口生成向量；
    5. 存入 KnowledgeDocument + KnowledgeChunk。
    """
    # 验证向量模型
    selected_embedding_model = embedding_model or settings.EMBEDDING_MODEL
    if selected_embedding_model not in settings.embedding_models:
        raise HTTPException(status_code=400, detail=f"不支持的向量模型: {selected_embedding_model}")
    
    # 1. 保存文件
    kb_dir = os.path.join(UPLOAD_DIR, "knowledge")
    os.makedirs(kb_dir, exist_ok=True)
    save_path = os.path.join(kb_dir, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2. 简单读取文本
    try:
        with open(save_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        # 若不是纯文本，可以在这里接 PDF/Docx 解析逻辑；当前简单返回错误
        raise HTTPException(status_code=400, detail="暂不支持非 UTF-8 文本文件作为知识库源。")

    # 3. 简单切分段落（按行/固定长度）
    paragraphs: List[str] = []
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        paragraphs.append(line)

    if not paragraphs:
        raise HTTPException(status_code=400, detail="文件中未检测到有效文本内容。")

    # 4. 生成向量（使用指定的向量模型）
    embeddings = ai_manager.create_embedding(paragraphs, model=selected_embedding_model)
    if not embeddings or len(embeddings) != len(paragraphs):
        raise HTTPException(status_code=500, detail="向量生成失败，请检查大模型配置。")

    # 5. 写入 DB
    doc = crud.create_knowledge_document(
        db,
        kb_id=kb_id,
        file_name=file.filename,
        file_path=save_path,
        content=content[:2000],  # 可选：存一部分摘要
        embedding_model=selected_embedding_model,  # 记录使用的向量模型
    )

    chunks_data = []
    for idx, (para, emb) in enumerate(zip(paragraphs, embeddings)):
        chunks_data.append((idx, para, emb))
    crud.create_knowledge_chunks(db, document_id=doc.id, chunks=chunks_data)

    return {"success": True, "document": doc.to_dict()}


# ========== 系统设置接口（新增） ==========

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    """获取系统设置"""
    # 从数据库获取保存的设置
    saved_settings = crud.get_all_settings(db)
    settings_dict = {s.key: s.value for s in saved_settings}
    
    return {
        "font_size": settings_dict.get("font_size", "13px"),
        "auto_title_model": settings_dict.get("auto_title_model", "current"),
        "default_search_source": settings_dict.get("default_search_source", "bing"),
        "tavily_api_key": settings_dict.get("tavily_api_key", ""),
        "bing_api_key": settings_dict.get("bing_api_key", ""),  # 添加bing_api_key
        "global_api_key": settings_dict.get("global_api_key", getattr(settings, 'AI_API_KEY', '')),
        "global_api_base": settings_dict.get("global_api_base", getattr(settings, 'AI_API_BASE', 'https://api.openai.com/v1')),
        "global_default_model": settings_dict.get("global_default_model", getattr(settings, 'AI_MODEL', 'gpt-4o-mini')),
    }


@app.post("/settings")
def update_settings(
    font_size: Optional[str] = Form(None),
    auto_title_model: Optional[str] = Form(None),
    theme: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    default_search_source: Optional[str] = Form(None),
    tavily_api_key: Optional[str] = Form(None),
    bing_api_key: Optional[str] = Form(None),  # 修正参数名
    global_api_key: Optional[str] = Form(None),
    global_api_base: Optional[str] = Form(None),
    global_default_model: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """更新系统设置"""
    settings_data = {}
    
    # 保存设置到数据库
    if font_size:
        crud.set_setting(db, "font_size", font_size)
        settings_data["font_size"] = font_size
    if auto_title_model:
        crud.set_setting(db, "auto_title_model", auto_title_model)
        settings_data["auto_title_model"] = auto_title_model
    if theme:
        crud.set_setting(db, "theme", theme)
        settings_data["theme"] = theme
    if language:
        crud.set_setting(db, "language", language)
        settings_data["language"] = language
    if default_search_source:
        crud.set_setting(db, "default_search_source", default_search_source)
        settings_data["default_search_source"] = default_search_source
    if tavily_api_key is not None:  # 允许空字符串
        crud.set_setting(db, "tavily_api_key", tavily_api_key)
        settings_data["tavily_api_key"] = tavily_api_key
    if bing_api_key is not None:  # 允许空字符串，修正字段名
        crud.set_setting(db, "bing_api_key", bing_api_key)
        settings_data["bing_api_key"] = bing_api_key
    
    # 新增：全局API配置
    if global_api_key is not None:
        crud.set_setting(db, "global_api_key", global_api_key)
        settings_data["global_api_key"] = global_api_key
        # 同时更新AI管理器的配置
        ai_manager._provider.api_key = global_api_key
        # 更新环境变量（如果需要持久化）
        import os
        os.environ["AI_API_KEY"] = global_api_key
        
    if global_api_base is not None:
        crud.set_setting(db, "global_api_base", global_api_base)
        settings_data["global_api_base"] = global_api_base
        ai_manager._provider.api_base = global_api_base.rstrip("/")
        os.environ["AI_API_BASE"] = global_api_base
        
    if global_default_model is not None:
        crud.set_setting(db, "global_default_model", global_default_model)
        settings_data["global_default_model"] = global_default_model
        ai_manager._provider.default_model = global_default_model
        os.environ["AI_MODEL"] = global_default_model
    
    return {"success": True, "settings": settings_data}


@app.post("/search/test")
def test_search_connection(
    source: str = Form(...),
    query: str = Form("test search"),
    bing_api_key: Optional[str] = Form(None),
    tavily_api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """测试搜索API连接"""
    try:
        if source == "bing":
            if not bing_api_key:
                # 尝试从数据库获取
                bing_api_key = crud.get_setting(db, "bing_api_key")
                if not bing_api_key:
                    raise HTTPException(status_code=400, detail="请提供Bing API Key")
            
            # 测试Bing搜索
            import requests
            headers = {"Ocp-Apim-Subscription-Key": bing_api_key}
            params = {"q": query, "count": 1}
            response = requests.get(
                "https://api.bing.microsoft.com/v7.0/search",
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
        elif source == "tavily":
            if not tavily_api_key:
                # 尝试从数据库获取
                tavily_api_key = crud.get_setting(db, "tavily_api_key")
                if not tavily_api_key:
                    raise HTTPException(status_code=400, detail="请提供Tavily API Key")
            
            # 测试Tavily搜索
            import requests
            payload = {
                "api_key": tavily_api_key,
                "query": query,
                "max_results": 1
            }
            response = requests.post(
                "https://api.tavily.com/search",
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
        else:
            raise HTTPException(status_code=400, detail="不支持的搜索源")
        
        return {"success": True, "message": f"{source.title()} 搜索连接测试成功"}
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"搜索API连接失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")


@app.post("/test-api-connection")
def test_api_connection():
    """测试全局API连接"""
    try:
        if not ai_manager.is_configured():
            return {"success": False, "error": "请先配置API Key和API Base"}
        
        # 发送测试请求
        test_messages = [{"role": "user", "content": "Hello"}]
        result = ai_manager.chat(test_messages, stream=False)
        
        return {"success": True, "message": "API连接测试成功"}
    except Exception as e:
        return {"success": False, "error": f"API连接测试失败: {str(e)}"}


@app.post("/test-provider-connection")
def test_provider_connection(
    api_base: str = Form(...),
    api_key: str = Form(...),
    model: str = Form(...),
):
    """测试指定Provider的连接"""
    try:
        # 创建临时的AI管理器实例进行测试
        temp_manager = AIManager()
        temp_manager.set_provider(
            api_base=api_base,
            api_key=api_key,
            default_model=model
        )
        
        # 发送测试请求
        test_messages = [{"role": "user", "content": "Hello"}]
        result = temp_manager.chat(test_messages, stream=False)
        
        return {"success": True, "message": "Provider连接测试成功"}
    except Exception as e:
        return {"success": False, "error": f"Provider连接测试失败: {str(e)}"}


@app.get("/api-status")
def get_api_status():
    """获取API配置状态"""
    return {
        "configured": ai_manager.is_configured(),
        "api_base": ai_manager._provider.api_base,
        "has_api_key": bool(ai_manager._provider.api_key),
        "default_model": ai_manager._provider.default_model
    }


# ========== MCP服务器管理接口（新增） ==========


@app.get("/mcp/servers")
def list_mcp_servers(
    enabled_only: bool = False,
    db: Session = Depends(get_db),
):
    """获取MCP服务器列表"""
    servers = crud.list_mcp_servers(db, enabled_only=enabled_only)
    return [server.to_dict() for server in servers]


@app.post("/mcp/servers")
def create_mcp_server(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    connection_type: str = Form(...),  # "stdio" | "http"
    command: Optional[str] = Form(None),
    args: Optional[str] = Form(None),  # JSON字符串
    url: Optional[str] = Form(None),
    env_vars: Optional[str] = Form(None),  # JSON字符串
    is_enabled: bool = Form(True),
    db: Session = Depends(get_db),
):
    """创建MCP服务器配置"""
    # 验证连接类型
    if connection_type not in ["stdio", "http"]:
        raise HTTPException(status_code=400, detail="连接类型必须是 stdio 或 http")
    
    # 验证必要参数
    if connection_type == "stdio" and not command:
        raise HTTPException(status_code=400, detail="stdio类型必须提供command")
    if connection_type == "http" and not url:
        raise HTTPException(status_code=400, detail="http类型必须提供url")
    
    # 验证JSON格式
    if args:
        try:
            json.loads(args)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="args必须是有效的JSON格式")
    
    if env_vars:
        try:
            json.loads(env_vars)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="env_vars必须是有效的JSON格式")
    
    try:
        server = crud.create_mcp_server(
            db,
            name=name,
            description=description,
            connection_type=connection_type,
            command=command,
            args=args,
            url=url,
            env_vars=env_vars,
            is_enabled=is_enabled,
        )
        return server.to_dict()
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="MCP服务器名称已存在")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mcp/servers/{server_id}")
def update_mcp_server(
    server_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    connection_type: Optional[str] = Form(None),
    command: Optional[str] = Form(None),
    args: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    env_vars: Optional[str] = Form(None),
    is_enabled: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
):
    """更新MCP服务器配置"""
    # 验证连接类型
    if connection_type and connection_type not in ["stdio", "http"]:
        raise HTTPException(status_code=400, detail="连接类型必须是 stdio 或 http")
    
    # 验证JSON格式
    if args:
        try:
            json.loads(args)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="args必须是有效的JSON格式")
    
    if env_vars:
        try:
            json.loads(env_vars)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="env_vars必须是有效的JSON格式")
    
    server = crud.update_mcp_server(
        db,
        server_id,
        name=name,
        description=description,
        connection_type=connection_type,
        command=command,
        args=args,
        url=url,
        env_vars=env_vars,
        is_enabled=is_enabled,
    )
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    return server.to_dict()


@app.delete("/mcp/servers/{server_id}")
def delete_mcp_server(server_id: int, db: Session = Depends(get_db)):
    """删除MCP服务器配置"""
    crud.delete_mcp_server(db, server_id)
    return {"success": True}


@app.post("/mcp/servers/{server_id}/test")
def test_mcp_server_connection(server_id: int, db: Session = Depends(get_db)):
    """测试MCP服务器连接"""
    server = crud.get_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    
    # 这里可以实现实际的MCP连接测试逻辑
    # 目前返回模拟结果
    return {
        "success": True,
        "message": f"MCP服务器 {server.name} 连接测试成功",
        "server_info": {
            "name": server.name,
            "type": server.connection_type,
            "status": "connected" if server.is_enabled else "disabled"
        }
    }


@app.get("/mcp/servers/{server_id}/tools")
def get_mcp_server_tools(server_id: int, db: Session = Depends(get_db)):
    """获取MCP服务器提供的工具列表"""
    server = crud.get_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    
    # 这里可以实现实际的MCP工具发现逻辑
    # 目前返回模拟数据
    mock_tools = [
        {
            "name": f"{server.name}_tool_1",
            "description": f"来自 {server.name} 的示例工具1",
            "parameters": {"type": "object", "properties": {}}
        },
        {
            "name": f"{server.name}_tool_2", 
            "description": f"来自 {server.name} 的示例工具2",
            "parameters": {"type": "object", "properties": {}}
        }
    ]
    
    return {
        "server_name": server.name,
        "tools": mock_tools
    }


@app.get("/knowledge/embedding-models")
def get_embedding_models(db: Session = Depends(get_db)):
    """获取可用的向量模型列表 - 基于用户配置的Provider"""
    # 获取所有Provider
    providers = crud.list_providers(db)
    
    # 收集所有Provider中的向量模型
    embedding_models = set()
    
    # 添加全局默认向量模型
    embedding_models.update(settings.embedding_models)
    
    # 从Provider中提取可能的向量模型
    for provider in providers:
        if provider.models:
            provider_models = [m.strip() for m in provider.models.split(",") if m.strip()]
            # 过滤出向量模型（通常包含embedding关键字）
            for model in provider_models:
                if "embedding" in model.lower() or "embed" in model.lower():
                    embedding_models.add(model)
    
    # 如果没有找到任何向量模型，返回空列表
    if not embedding_models:
        return {
            "default": None,
            "models": [],
            "message": "当前Provider中未配置向量模型，请在Provider设置中添加向量模型"
        }
    
    return {
        "default": settings.EMBEDDING_MODEL if settings.EMBEDDING_MODEL in embedding_models else list(embedding_models)[0],
        "models": sorted(list(embedding_models)),
    }


# ========== 静态页面 ==========


@app.get("/")
def index():
    # 返回新的分离后的前端页面
    from fastapi.responses import HTMLResponse

    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index_new.html")
    frontend_path = os.path.abspath(frontend_path)
    if not os.path.exists(frontend_path):
        # 如果新文件不存在，回退到原文件
        frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
        frontend_path = os.path.abspath(frontend_path)
        if not os.path.exists(frontend_path):
            return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)
    
    with open(frontend_path, "r", encoding="utf-8") as f:
        html = f.read()
    return HTMLResponse(html)

@app.get("/style.css")
def get_css():
    # 返回CSS文件
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "style.css")
    frontend_path = os.path.abspath(frontend_path)
    if not os.path.exists(frontend_path):
        raise HTTPException(status_code=404, detail="CSS file not found")
    return FileResponse(frontend_path, media_type="text/css")

@app.get("/script.js")
def get_js():
    # 返回JavaScript文件
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "script.js")
    frontend_path = os.path.abspath(frontend_path)
    if not os.path.exists(frontend_path):
        raise HTTPException(status_code=404, detail="JavaScript file not found")
    return FileResponse(frontend_path, media_type="application/javascript")

@app.get("/favicon.ico")
def get_favicon():
    # 返回favicon文件
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "favicon.ico")
    frontend_path = os.path.abspath(frontend_path)
    if not os.path.exists(frontend_path):
        # 如果没有favicon文件，返回一个简单的响应
        from fastapi.responses import Response
        return Response(content="", media_type="image/x-icon")
    return FileResponse(frontend_path, media_type="image/x-icon")
