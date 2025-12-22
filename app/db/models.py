# app/db/models.py
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, default="新对话")
    model = Column(String(255), nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 新增：绑定到某个 Provider（可空）
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)

    # 新增：会话级功能开关
    enable_knowledge_base = Column(Boolean, default=False, nullable=False)
    enable_mcp = Column(Boolean, default=False, nullable=False)
    enable_web_search = Column(Boolean, default=False, nullable=False)

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    files = relationship(
        "UploadedFile",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    # 新增：provider 关系
    provider = relationship("Provider", back_populates="conversations")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "model": self.model,
            "is_pinned": self.is_pinned,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "provider_id": self.provider_id,
            "enable_knowledge_base": self.enable_knowledge_base,
            "enable_mcp": self.enable_mcp,
            "enable_web_search": self.enable_web_search,
        }


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
        index=True,
    )
    role = Column(String(50), nullable=False)  # "user" / "assistant" / "system"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 新增：token统计信息（仅对assistant消息有效）
    model = Column(String(255), nullable=True)  # 使用的模型
    input_tokens = Column(Integer, nullable=True)  # 输入token数
    output_tokens = Column(Integer, nullable=True)  # 输出token数
    total_tokens = Column(Integer, nullable=True)  # 总token数

    conversation = relationship("Conversation", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
        }


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="files")

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "filename": self.filename,
            "filepath": self.filepath,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 新增：模型提供商
class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    api_base = Column(String(512), nullable=False)
    api_key = Column(String(512), nullable=False)
    default_model = Column(String(255), nullable=False)
    models = Column(Text, nullable=True)  # 可选：逗号分隔模型列表
    is_default = Column(Boolean, default=False, nullable=False)

    conversations = relationship("Conversation", back_populates="provider")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "api_base": self.api_base,
            "api_key": "***HIDDEN***" if self.api_key else None,  # 隐藏敏感信息
            "default_model": self.default_model,
            "models": self.models,
            "is_default": self.is_default,
        }


# 新增：知识库（可有多个库）
class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship(
        "KnowledgeDocument",
        back_populates="kb",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 新增：知识库 chunk + 向量（先定义，避免循环引用）
class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("knowledge_documents.id"),
        nullable=False,
        index=True,
    )

    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON 格式的向量

    document = relationship("KnowledgeDocument", back_populates="chunks")


# 新增：知识库文档（与上传文件绑定）
class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=True, index=True)

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)

    # 抽取后的全文或摘要
    content = Column(Text, nullable=True)
    
    # 新增：记录使用的向量模型
    embedding_model = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    kb = relationship("KnowledgeBase", back_populates="documents")
    chunks = relationship(
        "KnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "kb_id": self.kb_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "content": self.content[:200] + "..." if self.content and len(self.content) > 200 else self.content,  # 截断长内容
            "embedding_model": self.embedding_model,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 新增：MCP服务器配置
class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    # MCP连接类型: stdio 或 http
    connection_type = Column(String(50), nullable=False)  # "stdio" | "http"
    
    # stdio类型配置
    command = Column(String(512), nullable=True)
    args = Column(Text, nullable=True)  # JSON格式的参数列表
    
    # http类型配置
    url = Column(String(1024), nullable=True)
    
    # 通用配置
    env_vars = Column(Text, nullable=True)  # JSON格式的环境变量
    is_enabled = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "connection_type": self.connection_type,
            "command": self.command,
            "args": self.args,
            "url": self.url,
            "env_vars": self.env_vars,
            "is_enabled": self.is_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 新增：系统设置表
class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
