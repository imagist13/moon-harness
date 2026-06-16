import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.core.config import _env_settings

# Database URL from config (default PostgreSQL)
DATABASE_URL = _env_settings.database_url

# If no database_url is set, use default PostgreSQL
if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/harness"

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class CursorAdapter:
    """Adapter to make SQLAlchemy connection behave like sqlite3 cursor."""
    
    def __init__(self, conn):
        self._conn = conn
        self._result = None
    
    def execute(self, query, params=None):
        # Handle SQLAlchemy text() objects
        if hasattr(query, 'text'):
            query = str(query)
        
        if params is None:
            params = {}
        
        # Convert ? to :pN for positional params
        if '?' in query and isinstance(params, (list, tuple)):
            new_query = []
            param_count = query.count('?')
            new_params = {}
            for i, p in enumerate(params):
                new_params[f'p{i}'] = p
            params = new_params
            
            parts = query.split('?')
            for i, part in enumerate(parts):
                new_query.append(part)
                if i < param_count:
                    new_query.append(f':p{i}')
            query = ''.join(new_query)
        
        self._result = self._conn.execute(text(query), params)
        return self
    
    def fetchone(self):
        if self._result is None:
            return None
        row = self._result.fetchone()
        if row is None:
            return None
        # Return as dict-like object for sqlite3 compatibility
        return RowAdapter(row)
    
    def fetchall(self):
        if self._result is None:
            return []
        return [RowAdapter(row) for row in self._result.fetchall()]
    
    def __iter__(self):
        if self._result is None:
            return iter([])
        return iter(self._result)


class RowAdapter:
    """Adapter to make SQLAlchemy row behave like sqlite3.Row."""
    
    def __init__(self, row):
        self._row = row
        self._mapping = dict(row._mapping) if hasattr(row, '_mapping') else dict(row)
    
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self._mapping.values())[key]
        return self._mapping.get(key)
    
    def __getattr__(self, key):
        return self._mapping.get(key)
    
    def keys(self):
        return self._mapping.keys()
    
    def values(self):
        return self._mapping.values()
    
    def items(self):
        return self._mapping.items()
    
    def __iter__(self):
        return iter(self._mapping)
    
    def __len__(self):
        return len(self._mapping)
    
    def get(self, key, default=None):
        return self._mapping.get(key, default)


class ConnectionAdapter:
    """Adapter to make SQLAlchemy connection return cursor with sqlite3-like interface."""
    
    def __init__(self, conn):
        self._conn = conn
    
    def cursor(self):
        return CursorAdapter(self._conn)
    
    def execute(self, query, params=None):
        """Direct execute for compatibility."""
        # Handle SQLAlchemy text() objects - pass them directly
        if hasattr(query, 'text'):
            self._conn.execute(query, params)
            return self
        return CursorAdapter(self._conn).execute(query, params)
    
    def commit(self):
        self._conn.commit()
    
    def close(self):
        self._conn.close()
    
    def rollback(self):
        self._conn.rollback()
    
    def begin(self):
        return self._conn.begin()


def get_connection():
    """Get a database connection (with sqlite3-like cursor interface)."""
    return ConnectionAdapter(engine.connect())


def get_db() -> Session:
    """Get SQLAlchemy session (for dependency injection)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables (PostgreSQL version)."""
    conn = get_connection()
    trans = conn.begin()

    # Enable UUID extension
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))

    # users table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # sessions table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Session',
            system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
            temperature REAL DEFAULT 0.7,
            mode TEXT NOT NULL DEFAULT 'agent' CHECK(mode IN ('agent', 'rag')),
            domain_id TEXT,
            user_id TEXT NOT NULL,
            pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # messages table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
            content TEXT NOT NULL DEFAULT '',
            tool_calls TEXT,
            tool_call_id TEXT,
            user_id TEXT NOT NULL,
            wecom_msgid TEXT,
            skill_name TEXT,
            reasoning_content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # tool_configs table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS tool_configs (
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'agent',
            description TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            parameters TEXT,
            config TEXT,
            code TEXT,
            user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (name, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # conversation_summaries table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS conversation_summaries (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            message_count_before INTEGER NOT NULL DEFAULT 0,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # wecom_config table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS wecom_config (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            bot_id TEXT,
            secret_encrypted TEXT,
            bound_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # wecom_sessions table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS wecom_sessions (
            id TEXT PRIMARY KEY,
            wecom_user_id TEXT NOT NULL,
            chat_type TEXT NOT NULL DEFAULT 'single',
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(wecom_user_id, chat_type, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # rag_domains table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS rag_domains (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # rag_documents table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS rag_documents (
            id TEXT PRIMARY KEY,
            domain_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT,
            file_type TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'parsing', 'segmenting', 'embedding', 'ready', 'failed')),
            chunk_count INTEGER DEFAULT 0,
            chunk_size INTEGER DEFAULT 500,
            chunk_overlap INTEGER DEFAULT 50,
            smart_split INTEGER DEFAULT 1,
            error_msg TEXT,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (domain_id) REFERENCES rag_domains(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # system_settings table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))

    # Create indexes
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_wecom_msgid ON messages(wecom_msgid)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_messages_skill_name ON messages(skill_name)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_summaries_session ON conversation_summaries(session_id, created_at)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_wecom_sessions_lookup ON wecom_sessions(wecom_user_id, chat_type, user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rag_docs_domain ON rag_documents(domain_id)"))

    trans.commit()
    conn.close()


# ========== Helper functions ==========

def insert_summary(session_id: str, user_id: str, content: str, message_count_before: int) -> str:
    conn = get_connection()
    summary_id = str(uuid.uuid4())
    now = datetime.utcnow()
    conn.execute(
        text("INSERT INTO conversation_summaries (id, session_id, content, message_count_before, user_id, created_at) VALUES (:id, :session_id, :content, :message_count_before, :user_id, :created_at)"),
        {"id": summary_id, "session_id": session_id, "content": content, "message_count_before": message_count_before, "user_id": user_id, "created_at": now}
    )
    conn.commit()
    conn.close()
    return summary_id


def get_latest_summary(session_id: str) -> Optional[dict]:
    conn = get_connection()
    result = conn.execute(
        text("SELECT * FROM conversation_summaries WHERE session_id = :session_id ORDER BY created_at DESC LIMIT 1"),
        {"session_id": session_id}
    )
    row = result.fetchone()
    conn.close()
    return dict(row._mapping) if row else None


def get_messages_after_summary(session_id: str, summary: Optional[dict]) -> List[dict]:
    conn = get_connection()
    if summary:
        result = conn.execute(
            text("SELECT * FROM messages WHERE session_id = :session_id AND created_at > :created_at ORDER BY created_at ASC"),
            {"session_id": session_id, "created_at": summary["created_at"]}
        )
    else:
        result = conn.execute(
            text("SELECT * FROM messages WHERE session_id = :session_id ORDER BY created_at ASC"),
            {"session_id": session_id}
        )
    rows = result.fetchall()
    conn.close()
    return [dict(row._mapping) for row in rows]


def get_wecom_config(user_id: str) -> Optional[dict]:
    conn = get_connection()
    result = conn.execute(
        text("SELECT * FROM wecom_config WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    row = result.fetchone()
    conn.close()
    return dict(row._mapping) if row else None


def set_wecom_config(user_id: str, bot_id: str, secret_encrypted: str) -> None:
    conn = get_connection()
    config_id = str(uuid.uuid4())
    now = datetime.utcnow()
    conn.execute(
        text("""
            INSERT INTO wecom_config (id, user_id, bot_id, secret_encrypted, bound_at, created_at) 
            VALUES (:id, :user_id, :bot_id, :secret_encrypted, :bound_at, :created_at)
            ON CONFLICT(user_id) DO UPDATE SET bot_id=excluded.bot_id, secret_encrypted=excluded.secret_encrypted, bound_at=excluded.bound_at
        """),
        {"id": config_id, "user_id": user_id, "bot_id": bot_id, "secret_encrypted": secret_encrypted, "bound_at": now, "created_at": now}
    )
    conn.commit()
    conn.close()


def delete_wecom_config(user_id: str) -> None:
    conn = get_connection()
    conn.execute(text("DELETE FROM wecom_config WHERE user_id = :user_id"), {"user_id": user_id})
    conn.execute(text("DELETE FROM wecom_sessions WHERE user_id = :user_id"), {"user_id": user_id})
    conn.commit()
    conn.close()


def get_wecom_session(wecom_user_id: str, chat_type: str, user_id: str) -> Optional[dict]:
    conn = get_connection()
    result = conn.execute(
        text("SELECT * FROM wecom_sessions WHERE wecom_user_id = :wecom_user_id AND chat_type = :chat_type AND user_id = :user_id"),
        {"wecom_user_id": wecom_user_id, "chat_type": chat_type, "user_id": user_id}
    )
    row = result.fetchone()
    conn.close()
    return dict(row._mapping) if row else None


def create_wecom_session(wecom_user_id: str, chat_type: str, session_id: str, user_id: str) -> str:
    conn = get_connection()
    ws_id = str(uuid.uuid4())
    now = datetime.utcnow()
    conn.execute(
        text("INSERT INTO wecom_sessions (id, wecom_user_id, chat_type, session_id, user_id, created_at, updated_at) VALUES (:id, :wecom_user_id, :chat_type, :session_id, :user_id, :created_at, :updated_at)"),
        {"id": ws_id, "wecom_user_id": wecom_user_id, "chat_type": chat_type, "session_id": session_id, "user_id": user_id, "created_at": now, "updated_at": now}
    )
    conn.commit()
    conn.close()
    return ws_id


def update_wecom_session_time(wecom_user_id: str, chat_type: str, user_id: str) -> None:
    conn = get_connection()
    now = datetime.utcnow()
    conn.execute(
        text("UPDATE wecom_sessions SET updated_at = :updated_at WHERE wecom_user_id = :wecom_user_id AND chat_type = :chat_type AND user_id = :user_id"),
        {"updated_at": now, "wecom_user_id": wecom_user_id, "chat_type": chat_type, "user_id": user_id}
    )
    conn.commit()
    conn.close()


def get_system_setting(user_id: str, key: str) -> Optional[str]:
    conn = get_connection()
    result = conn.execute(
        text("SELECT value FROM system_settings WHERE user_id = :user_id AND key = :key"),
        {"user_id": user_id, "key": key}
    )
    row = result.fetchone()
    conn.close()
    return row[0] if row else None


def set_system_setting(user_id: str, key: str, value: str) -> None:
    conn = get_connection()
    now = datetime.utcnow()
    conn.execute(
        text("""
            INSERT INTO system_settings (user_id, key, value, updated_at) VALUES (:user_id, :key, :value, :updated_at)
            ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """),
        {"user_id": user_id, "key": key, "value": value, "updated_at": now}
    )
    conn.commit()
    conn.close()


def get_all_system_settings(user_id: str) -> dict:
    conn = get_connection()
    result = conn.execute(
        text("SELECT key, value FROM system_settings WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    rows = result.fetchall()
    conn.close()
    return {row[0]: row[1] for row in rows}


def delete_system_setting(user_id: str, key: str) -> None:
    conn = get_connection()
    conn.execute(
        text("DELETE FROM system_settings WHERE user_id = :user_id AND key = :key"),
        {"user_id": user_id, "key": key}
    )
    conn.commit()
    conn.close()
