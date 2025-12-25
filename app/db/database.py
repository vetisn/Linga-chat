# app/db/database.py
import os
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# SQLite 需要 check_same_thread=False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def migrate_database():
    """数据库迁移 - 添加新列（自动执行）"""
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    
    if not os.path.exists(db_path):
        return  # 数据库不存在，跳过迁移
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查并添加 models_config 列
        cursor.execute("PRAGMA table_info(providers)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'models_config' not in columns:
            cursor.execute("ALTER TABLE providers ADD COLUMN models_config TEXT")
            conn.commit()
        
        conn.close()
    except Exception:
        pass  # 静默处理迁移错误


# 模块加载时自动执行迁移
migrate_database()
