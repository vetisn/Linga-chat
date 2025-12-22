# app/ai/tools.py
import json
import textwrap
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db import crud
from app.db.database import SessionLocal
from app.core.config import settings


# 已有：本地工具定义 -------------------------------------------------


def get_local_time_tool() -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": "get_local_time",
            "description": "获取当前服务器的本地时间。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    }


def run_get_local_time_tool() -> str:
    from datetime import datetime

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def get_calculator_tool() -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": "calculate_expression",
            "description": "计算一个简单的数学表达式，例如 1+2*3。",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "需要计算的数学表达式，例如 '1+2*3'",
                    }
                },
                "required": ["expression"],
            },
        },
    }


def run_calculator_tool(expression: str) -> str:
    # 简单 eval，仅示例，生产环境要加沙盒
    try:
        value = eval(expression, {"__builtins__": {}})
    except Exception as e:
        return f"表达式计算错误: {e}"
    return str(value)


# === 新增：知识库检索工具定义 ====================================


def search_knowledge_tool_schema() -> Dict[str, Any]:
    """
    OpenAI tools schema: 知识库检索工具定义。
    """
    return {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "在已构建的本地知识库中检索与当前问题相关的文本片段，用于增强回答。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "用户问题或需要检索的内容，用于生成向量检索。",
                    },
                    "kb_id": {
                        "type": "integer",
                        "description": "可选，指定要检索的知识库 ID，不填则使用默认知识库。",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "返回最多多少条匹配结果，默认 5。",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    }


def run_search_knowledge_tool(
    *,
    query: str,
    kb_id: Optional[int] = None,
    top_k: int = 5,
    embedding_fn=None,
) -> str:
    """
    知识库检索工具的实际执行逻辑：

    1. 使用 embedding_fn(query) 生成 query 向量；
    2. 用 crud.search_knowledge_chunks 在 DB 中做向量相似度检索；
    3. 把检索到的 chunk 内容拼成一段说明文字返回给大模型。

    embedding_fn: 一个函数，签名类似：
        embedding_fn([text: str]) -> List[List[float]]
    由调用方传入（通常是 AIManager.create_embedding）。
    """
    if embedding_fn is None:
        return "知识库检索工具未配置 embedding 函数，无法完成检索。"

    # 1. 生成查询向量
    embeddings = embedding_fn([query])
    if not embeddings:
        return "无法为当前查询生成向量。"
    query_embedding = embeddings[0]

    # 2. 从 DB 检索
    db: Session = SessionLocal()
    try:
        chunks = crud.search_knowledge_chunks(
            db,
            query_embedding=query_embedding,
            kb_id=kb_id,
            top_k=top_k,
        )
    finally:
        db.close()

    if not chunks:
        return "知识库中没有找到与当前问题足够相关的内容。"

    # 3. 拼接检索结果
    parts: List[str] = []
    for idx, chunk in enumerate(chunks, start=1):
        doc = chunk.document
        kb_name = doc.kb.name if doc and doc.kb else settings.KNOWLEDGE_DEFAULT_KB_NAME
        parts.append(
            textwrap.dedent(
                f"""
                [片段 {idx} | 知识库: {kb_name} | 文档: {doc.file_name if doc else '未知'}]
                {chunk.content}
                """
            ).strip()
        )

    return "\n\n".join(parts)


# === 新增：联网搜索工具定义 ====================================

def web_search_tool_schema() -> Dict[str, Any]:
    """
    OpenAI tools schema: 联网搜索工具定义。
    """
    return {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "在互联网上搜索最新信息，获取实时数据和最新资讯。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词或问题，用于在互联网上查找相关信息。",
                    },
                    "source": {
                        "type": "string",
                        "description": "搜索源，可选值：bing（必应搜索）或 tavily（Tavily搜索）",
                        "enum": ["bing", "tavily"],
                        "default": "bing"
                    },
                },
                "required": ["query"],
            },
        },
    }


def _search_with_bing(query: str, db_session=None) -> str:
    """
    使用必应搜索API
    """
    import requests
    from app.core.config import settings
    from app.db.database import SessionLocal
    from app.db import crud
    
    try:
        # 优先从数据库获取API Key
        bing_api_key = None
        if db_session:
            bing_api_key = crud.get_setting(db_session, "bing_search_api_key")
        
        # 如果数据库没有，使用配置文件
        if not bing_api_key:
            bing_api_key = getattr(settings, 'BING_SEARCH_API_KEY', None)
        
        if not bing_api_key:
            return f"搜索关键词：{query}\n\n由于未配置Bing Search API Key，无法执行实际搜索。\n\n建议：\n1. 在设置中配置Bing Search API Key\n2. 或使用Tavily搜索\n3. 手动搜索关键词：{query}"
        
        # Bing Search API调用
        url = "https://api.bing.microsoft.com/v7.0/search"
        headers = {
            'Ocp-Apim-Subscription-Key': bing_api_key,
            'Content-Type': 'application/json'
        }
        params = {
            'q': query,
            'count': 5,
            'offset': 0,
            'mkt': 'zh-CN',
            'safesearch': 'Moderate'
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            web_pages = data.get("webPages", {}).get("value", [])
            
            if not web_pages:
                return f"搜索关键词：{query}\n\n未找到相关结果。"
            
            # 格式化搜索结果为JSON结构
            results = []
            for page in web_pages[:3]:  # 只取前3个结果
                results.append({
                    "title": page.get("name", "无标题"),
                    "url": page.get("url", ""),
                    "snippet": page.get("snippet", "无内容")
                })
            
            import json
            return json.dumps({
                "query": query,
                "source": "bing",
                "results": results
            }, ensure_ascii=False, indent=2)
        else:
            return f"Bing搜索失败，状态码: {response.status_code}"
            
    except Exception as e:
        return f"Bing搜索失败: {str(e)}"


def _search_with_tavily(query: str, db_session=None) -> str:
    """
    使用Tavily搜索
    """
    import requests
    from app.core.config import settings
    from app.db.database import SessionLocal
    from app.db import crud
    
    try:
        # 优先从数据库获取API Key
        tavily_api_key = None
        if db_session:
            tavily_api_key = crud.get_setting(db_session, "tavily_api_key")
        
        # 如果数据库没有，使用配置文件
        if not tavily_api_key:
            tavily_api_key = getattr(settings, 'TAVILY_API_KEY', None)
        
        if not tavily_api_key:
            return f"搜索关键词：{query}\n\n由于未配置Tavily API Key，无法执行实际搜索。\n\n建议：\n1. 在设置中配置Tavily API Key\n2. 或使用必应搜索\n3. 手动搜索关键词：{query}"
        
        # Tavily API调用
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": tavily_api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": True,
            "include_images": False,
            "include_raw_content": False,
            "max_results": 5
        }
        
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                return f"搜索关键词：{query}\n\n未找到相关结果。"
            
            # 格式化搜索结果为JSON结构
            formatted_results = []
            for result in results[:3]:  # 只取前3个结果
                formatted_results.append({
                    "title": result.get("title", "无标题"),
                    "url": result.get("url", ""),
                    "snippet": result.get("content", "无内容")[:200] + "..."
                })
            
            import json
            return json.dumps({
                "query": query,
                "source": "tavily",
                "results": formatted_results
            }, ensure_ascii=False, indent=2)
        else:
            return f"Tavily搜索失败，状态码: {response.status_code}"
            
    except Exception as e:
        return f"Tavily搜索失败: {str(e)}"


def run_web_search_tool(
    *,
    query: str,
    source: str = "bing",
    db_session=None,
) -> str:
    """
    联网搜索工具的实际执行逻辑：
    
    1. 根据source参数选择搜索引擎
    2. 执行搜索并返回结果
    """
    try:
        if source == "bing":
            return _search_with_bing(query)
        elif source == "tavily":
            return _search_with_tavily(query)
        else:
            return f"不支持的搜索源: {source}"
    except Exception as e:
        return f"搜索失败: {str(e)}"


def _search_with_bing(query: str) -> str:
    """
    使用必应搜索API
    """
    import requests
    from app.core.config import settings
    
    try:
        # 优先从数据库获取API Key，其次从环境变量
        bing_api_key = None
        try:
            db = SessionLocal()
            bing_api_key = crud.get_setting(db, "bing_api_key")
            db.close()
        except:
            pass
        
        if not bing_api_key:
            bing_api_key = getattr(settings, 'BING_SEARCH_API_KEY', None)
        
        if not bing_api_key:
            return f"搜索关键词：{query}\n\n由于未配置Bing Search API Key，无法执行实际搜索。\n\n建议：\n1. 在设置中配置Bing Search API Key\n2. 或使用Tavily搜索\n3. 手动搜索关键词：{query}"
        
        # Bing Search API调用
        url = "https://api.bing.microsoft.com/v7.0/search"
        headers = {
            'Ocp-Apim-Subscription-Key': bing_api_key,
            'Content-Type': 'application/json'
        }
        params = {
            'q': query,
            'count': 5,
            'offset': 0,
            'mkt': 'zh-CN',
            'safesearch': 'Moderate'
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            web_pages = data.get("webPages", {}).get("value", [])
            
            if not web_pages:
                return f"搜索关键词：{query}\n\n未找到相关结果。"
            
            # 格式化搜索结果为JSON结构
            results = []
            for page in web_pages[:3]:  # 只取前3个结果
                results.append({
                    "title": page.get("name", "无标题"),
                    "url": page.get("url", ""),
                    "snippet": page.get("snippet", "无内容")
                })
            
            import json
            return json.dumps({
                "query": query,
                "source": "bing",
                "results": results
            }, ensure_ascii=False, indent=2)
        else:
            return f"Bing搜索失败，状态码: {response.status_code}"
            
    except Exception as e:
        return f"Bing搜索失败: {str(e)}"


def _search_with_tavily(query: str) -> str:
    """
    使用Tavily搜索
    """
    import requests
    from app.core.config import settings
    
    try:
        # 优先从数据库获取API Key，其次从环境变量
        tavily_api_key = None
        try:
            db = SessionLocal()
            tavily_api_key = crud.get_setting(db, "tavily_api_key")
            db.close()
        except:
            pass
        
        if not tavily_api_key:
            tavily_api_key = getattr(settings, 'TAVILY_API_KEY', None)
        
        if not tavily_api_key:
            return f"搜索关键词：{query}\n\n由于未配置Tavily API Key，无法执行实际搜索。\n\n建议：\n1. 在设置中配置Tavily API Key\n2. 或使用必应搜索\n3. 手动搜索关键词：{query}"
        
        # Tavily API调用
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": tavily_api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": True,
            "include_images": False,
            "include_raw_content": False,
            "max_results": 5
        }
        
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                return f"搜索关键词：{query}\n\n未找到相关结果。"
            
            # 格式化搜索结果为JSON结构
            formatted_results = []
            for result in results[:3]:  # 只取前3个结果
                formatted_results.append({
                    "title": result.get("title", "无标题"),
                    "url": result.get("url", ""),
                    "snippet": result.get("content", "无内容")[:200] + "..."
                })
            
            import json
            return json.dumps({
                "query": query,
                "source": "tavily",
                "results": formatted_results
            }, ensure_ascii=False, indent=2)
        else:
            return f"Tavily搜索失败，状态码: {response.status_code}"
            
    except Exception as e:
        return f"Tavily搜索失败: {str(e)}"


# 统一对外接口：根据开关组合返回工具列表 -----------------------------

def get_tools(
    *,
    enable_knowledge_base: bool = False,
    enable_mcp: bool = False,
    enable_web_search: bool = False,
) -> List[Dict[str, Any]]:
    """
    根据功能开关返回需要注册给 OpenAI 的 tools 列表。

    - enable_knowledge_base: 是否启用知识库检索工具 search_knowledge
    - enable_mcp: MCP 相关工具预留（暂未实现）
    - enable_web_search: 是否启用联网搜索工具 web_search
    """
    tools: List[Dict[str, Any]] = []

    # 只有在明确启用时才添加工具，不再默认添加任何工具
    
    # 知识库工具
    if enable_knowledge_base:
        tools.append(search_knowledge_tool_schema())

    # 联网搜索工具
    if enable_web_search:
        tools.append(web_search_tool_schema())

    # MCP 工具（预留，你之后可以在这里 append MCP 相关工具 schema）
    if enable_mcp:
        # tools.append(...)
        pass

    return tools
