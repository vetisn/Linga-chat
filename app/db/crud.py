# app/db/crud.py
from __future__ import annotations

import json
from typing import List, Optional, Iterable, Tuple

from sqlalchemy.orm import Session

from app.db import models


def get_conversation(db: Session, conversation_id: int) -> Optional[models.Conversation]:
    return db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()


def get_conversations(db: Session) -> List[models.Conversation]:
    return (
        db.query(models.Conversation)
        .order_by(models.Conversation.is_pinned.desc(), models.Conversation.id.desc())
        .all()
    )


def create_conversation(
    db: Session,
    title: str = "新对话",
    model: Optional[str] = None,
) -> models.Conversation:
    conversation = models.Conversation(title=title, model=model)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def delete_conversation(db: Session, conversation_id: int) -> None:
    conversation = get_conversation(db, conversation_id)
    if conversation:
        db.delete(conversation)
        db.commit()


def update_conversation_title(db: Session, conversation_id: int, title: str) -> Optional[models.Conversation]:
    conversation = get_conversation(db, conversation_id)
    if not conversation:
        return None
    conversation.title = title
    db.commit()
    db.refresh(conversation)
    return conversation


def update_conversation_model(db: Session, conversation_id: int, model: Optional[str]) -> Optional[models.Conversation]:
    conversation = get_conversation(db, conversation_id)
    if not conversation:
        return None
    conversation.model = model
    db.commit()
    db.refresh(conversation)
    return conversation


def update_conversation_pin(db: Session, conversation_id: int, is_pinned: bool) -> Optional[models.Conversation]:
    conversation = get_conversation(db, conversation_id)
    if not conversation:
        return None
    conversation.is_pinned = is_pinned
    db.commit()
    db.refresh(conversation)
    return conversation


def create_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    token_info: dict = None,
) -> models.Message:
    message_data = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content
    }
    
    # 如果是assistant消息且有token信息，则保存token统计
    if role == "assistant" and token_info:
        message_data.update({
            "model": token_info.get("model"),
            "input_tokens": token_info.get("input_tokens"),
            "output_tokens": token_info.get("output_tokens"),
            "total_tokens": token_info.get("total_tokens")
        })
    
    message = models.Message(**message_data)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages(db: Session, conversation_id: int) -> List[models.Message]:
    return (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.id.asc())
        .all()
    )


def create_uploaded_file(
    db: Session,
    conversation_id: int,
    filename: str,
    filepath: str,
) -> models.UploadedFile:
    uploaded_file = models.UploadedFile(conversation_id=conversation_id, filename=filename, filepath=filepath)
    db.add(uploaded_file)
    db.commit()
    db.refresh(uploaded_file)
    return uploaded_file


def get_uploaded_files(db: Session, conversation_id: int) -> List[models.UploadedFile]:
    return (
        db.query(models.UploadedFile)
        .filter(models.UploadedFile.conversation_id == conversation_id)
        .order_by(models.UploadedFile.id.desc())
        .all()
    )


def get_uploaded_file(db: Session, file_id: int) -> Optional[models.UploadedFile]:
    return db.query(models.UploadedFile).filter(models.UploadedFile.id == file_id).first()


def delete_uploaded_file(db: Session, file_id: int) -> None:
    uploaded_file = get_uploaded_file(db, file_id)
    if uploaded_file:
        db.delete(uploaded_file)
        db.commit()


# ========= 新增：会话扩展（Provider 绑定 & 功能开关） =========

def update_conversation_features(
    db: Session,
    conversation_id: int,
    *,
    enable_knowledge_base: Optional[bool] = None,
    enable_mcp: Optional[bool] = None,
    enable_web_search: Optional[bool] = None,
) -> Optional[models.Conversation]:
    conversation = get_conversation(db, conversation_id)
    if not conversation:
        return None

    if enable_knowledge_base is not None:
        conversation.enable_knowledge_base = enable_knowledge_base
    if enable_mcp is not None:
        conversation.enable_mcp = enable_mcp
    if enable_web_search is not None:
        conversation.enable_web_search = enable_web_search

    db.commit()
    db.refresh(conversation)
    return conversation


def set_conversation_provider(
    db: Session,
    conversation_id: int,
    provider_id: Optional[int],
) -> Optional[models.Conversation]:
    conversation = get_conversation(db, conversation_id)
    if not conversation:
        return None
    conversation.provider_id = provider_id
    db.commit()
    db.refresh(conversation)
    return conversation


# ========= 新增：Provider 相关 CRUD =========

def create_provider(
    db: Session,
    *,
    name: str,
    api_base: str,
    api_key: str,
    default_model: str,
    models_str: Optional[str] = None,
    is_default: bool = False,
) -> models.Provider:
    provider = models.Provider(
        name=name,
        api_base=api_base,
        api_key=api_key,
        default_model=default_model,
        models=models_str,
        is_default=is_default,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def get_provider(db: Session, provider_id: int) -> Optional[models.Provider]:
    return db.query(models.Provider).filter(models.Provider.id == provider_id).first()


def get_provider_by_name(db: Session, name: str) -> Optional[models.Provider]:
    return db.query(models.Provider).filter(models.Provider.name == name).first()


def list_providers(db: Session) -> List[models.Provider]:
    return db.query(models.Provider).order_by(models.Provider.id.asc()).all()


def update_provider(
    db: Session,
    provider_id: int,
    *,
    name: Optional[str] = None,
    api_base: Optional[str] = None,
    api_key: Optional[str] = None,
    default_model: Optional[str] = None,
    models_str: Optional[str] = None,
    is_default: Optional[bool] = None,
) -> Optional[models.Provider]:
    provider = get_provider(db, provider_id)
    if not provider:
        return None

    if name is not None:
        provider.name = name
    if api_base is not None:
        provider.api_base = api_base
    if api_key is not None:
        provider.api_key = api_key
    if default_model is not None:
        provider.default_model = default_model
    if models_str is not None:
        provider.models = models_str
    if is_default is not None:
        provider.is_default = is_default

    db.commit()
    db.refresh(provider)
    return provider


def delete_provider(db: Session, provider_id: int) -> None:
    provider = get_provider(db, provider_id)
    if not provider:
        return
    db.delete(provider)
    db.commit()


# ========= 新增：知识库（多库）相关 CRUD =========

def create_knowledge_base(
    db: Session,
    *,
    name: str,
    description: Optional[str] = None,
) -> models.KnowledgeBase:
    kb = models.KnowledgeBase(name=name, description=description)
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


def get_knowledge_base(db: Session, kb_id: int) -> Optional[models.KnowledgeBase]:
    return db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == kb_id).first()


def list_knowledge_bases(db: Session) -> List[models.KnowledgeBase]:
    return db.query(models.KnowledgeBase).order_by(models.KnowledgeBase.id.asc()).all()


def delete_knowledge_base(db: Session, kb_id: int) -> None:
    kb = get_knowledge_base(db, kb_id)
    if not kb:
        return
    db.delete(kb)
    db.commit()


def create_knowledge_document(
    db: Session,
    *,
    kb_id: Optional[int],
    file_name: str,
    file_path: str,
    content: Optional[str],
    embedding_model: Optional[str] = None,
) -> models.KnowledgeDocument:
    doc = models.KnowledgeDocument(
        kb_id=kb_id,
        file_name=file_name,
        file_path=file_path,
        content=content,
        embedding_model=embedding_model,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_knowledge_document(db: Session, doc_id: int) -> Optional[models.KnowledgeDocument]:
    return (
        db.query(models.KnowledgeDocument)
        .filter(models.KnowledgeDocument.id == doc_id)
        .first()
    )


def list_knowledge_documents(
    db: Session,
    kb_id: Optional[int] = None,
) -> List[models.KnowledgeDocument]:
    q = db.query(models.KnowledgeDocument)
    if kb_id is not None:
        q = q.filter(models.KnowledgeDocument.kb_id == kb_id)
    return q.order_by(models.KnowledgeDocument.id.desc()).all()


def delete_knowledge_document(db: Session, doc_id: int) -> None:
    doc = get_knowledge_document(db, doc_id)
    if not doc:
        return
    db.delete(doc)
    db.commit()


def create_knowledge_chunks(
    db: Session,
    *,
    document_id: int,
    chunks: Iterable[Tuple[int, str, List[float]]],
) -> List[models.KnowledgeChunk]:
    """
    批量创建知识库 chunk。
    chunks: (chunk_index, content, embedding) 列表
    """
    created: List[models.KnowledgeChunk] = []
    for idx, content, embedding in chunks:
        kc = models.KnowledgeChunk(
            document_id=document_id,
            chunk_index=idx,
            content=content,
            embedding=json.dumps(embedding, ensure_ascii=False),
        )
        db.add(kc)
        created.append(kc)
    db.commit()
    for kc in created:
        db.refresh(kc)
    return created


def list_chunks_by_document(
    db: Session,
    document_id: int,
) -> List[models.KnowledgeChunk]:
    return (
        db.query(models.KnowledgeChunk)
        .filter(models.KnowledgeChunk.document_id == document_id)
        .order_by(models.KnowledgeChunk.chunk_index.asc())
        .all()
    )


def list_all_chunks(
    db: Session,
    kb_id: Optional[int] = None,
) -> List[models.KnowledgeChunk]:
    """
    返回所有 chunk，如果 kb_id 不为空，则按知识库过滤：
    join KnowledgeDocument -> KnowledgeBase
    """
    q = db.query(models.KnowledgeChunk)
    if kb_id is not None:
        q = (
            q.join(
                models.KnowledgeDocument,
                models.KnowledgeChunk.document_id == models.KnowledgeDocument.id,
            )
            .filter(models.KnowledgeDocument.kb_id == kb_id)
        )
    return q.all()


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    import math

    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    na = math.sqrt(sum(a * a for a in vec_a))
    nb = math.sqrt(sum(b * b for b in vec_b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def search_knowledge_chunks(
    db: Session,
    *,
    query_embedding: List[float],
    kb_id: Optional[int] = None,
    top_k: int = 5,
) -> List[models.KnowledgeChunk]:
    """
    简易向量检索：在 Python 内做余弦相似度排序。
    后续如果接入专门的向量库，可以只改这里的实现。
    """
    all_chunks = list_all_chunks(db, kb_id=kb_id)
    scored: List[Tuple[float, models.KnowledgeChunk]] = []

    for chunk in all_chunks:
        try:
            emb = json.loads(chunk.embedding)
            if not isinstance(emb, list):
                continue
            score = _cosine_similarity(query_embedding, emb)
            scored.append((score, chunk))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k]]


# ========= 新增：MCP服务器管理 CRUD =========

def create_mcp_server(
    db: Session,
    *,
    name: str,
    description: Optional[str] = None,
    connection_type: str,
    command: Optional[str] = None,
    args: Optional[str] = None,
    url: Optional[str] = None,
    env_vars: Optional[str] = None,
    is_enabled: bool = True,
) -> models.MCPServer:
    mcp_server = models.MCPServer(
        name=name,
        description=description,
        connection_type=connection_type,
        command=command,
        args=args,
        url=url,
        env_vars=env_vars,
        is_enabled=is_enabled,
    )
    db.add(mcp_server)
    db.commit()
    db.refresh(mcp_server)
    return mcp_server


def get_mcp_server(db: Session, server_id: int) -> Optional[models.MCPServer]:
    return db.query(models.MCPServer).filter(models.MCPServer.id == server_id).first()


def get_mcp_server_by_name(db: Session, name: str) -> Optional[models.MCPServer]:
    return db.query(models.MCPServer).filter(models.MCPServer.name == name).first()


def list_mcp_servers(db: Session, enabled_only: bool = False) -> List[models.MCPServer]:
    query = db.query(models.MCPServer)
    if enabled_only:
        query = query.filter(models.MCPServer.is_enabled == True)
    return query.order_by(models.MCPServer.id.asc()).all()


def update_mcp_server(
    db: Session,
    server_id: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    connection_type: Optional[str] = None,
    command: Optional[str] = None,
    args: Optional[str] = None,
    url: Optional[str] = None,
    env_vars: Optional[str] = None,
    is_enabled: Optional[bool] = None,
) -> Optional[models.MCPServer]:
    server = get_mcp_server(db, server_id)
    if not server:
        return None

    if name is not None:
        server.name = name
    if description is not None:
        server.description = description
    if connection_type is not None:
        server.connection_type = connection_type
    if command is not None:
        server.command = command
    if args is not None:
        server.args = args
    if url is not None:
        server.url = url
    if env_vars is not None:
        server.env_vars = env_vars
    if is_enabled is not None:
        server.is_enabled = is_enabled

    db.commit()
    db.refresh(server)
    return server


def delete_mcp_server(db: Session, server_id: int) -> None:
    server = get_mcp_server(db, server_id)
    if not server:
        return
    db.delete(server)
    db.commit()


# ========= 新增：系统设置管理 CRUD =========

def get_setting(db: Session, key: str) -> Optional[models.SystemSetting]:
    """获取单个设置"""
    return db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()


def get_all_settings(db: Session) -> List[models.SystemSetting]:
    """获取所有设置"""
    return db.query(models.SystemSetting).all()


def set_setting(db: Session, key: str, value: str) -> models.SystemSetting:
    """设置或更新设置值"""
    setting = get_setting(db, key)
    if setting:
        setting.value = value
        from datetime import datetime
        setting.updated_at = datetime.utcnow()
    else:
        setting = models.SystemSetting(key=key, value=value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return setting


def delete_setting(db: Session, key: str) -> None:
    """删除设置"""
    setting = get_setting(db, key)
    if setting:
        db.delete(setting)
        db.commit()
