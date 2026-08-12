import sqlite3
import json
from pathlib import Path
from datetime import datetime
from app.config import settings

DB_PATH = settings.db_dir / "analyses.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    settings.db_dir.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            format TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            detected_language TEXT NOT NULL,
            title TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'uploaded',
            chunk_count INTEGER NOT NULL DEFAULT 0,
            extracted_text TEXT,
            error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            document_title TEXT NOT NULL,
            detected_language TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            progress INTEGER NOT NULL DEFAULT 0,
            message TEXT DEFAULT '',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            executive_summary TEXT DEFAULT '',
            risk_level TEXT DEFAULT 'medium',
            total_controls INTEGER DEFAULT 0,
            compliant_count INTEGER DEFAULT 0,
            partial_count INTEGER DEFAULT 0,
            missing_count INTEGER DEFAULT 0,
            gaps_json TEXT DEFAULT '[]',
            recommendations_json TEXT DEFAULT '[]',
            classification_json TEXT DEFAULT '{}',
            error TEXT,
            FOREIGN KEY (document_id) REFERENCES documents(id)
        );

        CREATE TABLE IF NOT EXISTS kb_documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_format TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            content TEXT NOT NULL,
            source TEXT DEFAULT '',
            language TEXT DEFAULT 'en',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def save_document(doc: dict):
    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO documents (id, filename, format, size_bytes, detected_language, title, uploaded_at, status, chunk_count, extracted_text, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc["id"], doc["filename"], doc["format"], doc["size_bytes"],
        doc["detected_language"], doc["title"], doc["uploaded_at"],
        doc.get("status", "uploaded"), doc.get("chunk_count", 0),
        doc.get("extracted_text"), doc.get("error_message"),
    ))
    conn.commit()
    conn.close()


def get_document(doc_id: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_documents() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM documents ORDER BY uploaded_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_analysis(analysis: dict):
    conn = get_conn()
    gaps_json = json.dumps(analysis.get("gaps", []))
    recs_json = json.dumps(analysis.get("recommendations", []))
    conn.execute("""
        INSERT OR REPLACE INTO analyses
        (id, document_id, document_title, detected_language, status, progress, message,
         started_at, completed_at, executive_summary, risk_level, total_controls,
         compliant_count, partial_count, missing_count, gaps_json, recommendations_json, classification_json, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        analysis["id"], analysis["document_id"], analysis["document_title"],
        analysis["detected_language"], analysis["status"], analysis["progress"],
        analysis.get("message", ""), analysis["started_at"],
        analysis.get("completed_at"), analysis.get("executive_summary", ""),
        analysis.get("risk_level", "medium"), analysis.get("total_controls", 0),
        analysis.get("compliant_count", 0), analysis.get("partial_count", 0),
        analysis.get("missing_count", 0), gaps_json, recs_json,
        json.dumps(analysis.get("document_classification") or {}),
        analysis.get("error"),
    ))
    conn.commit()
    conn.close()


def get_analysis(analysis_id: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["gaps"] = json.loads(d.pop("gaps_json", "[]"))
    d["recommendations"] = json.loads(d.pop("recommendations_json", "[]"))
    d["document_classification"] = json.loads(d.pop("classification_json", "{}"))
    return d


def list_analyses() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, document_id, document_title, detected_language, status,
               risk_level, total_controls, compliant_count, partial_count,
               missing_count, started_at, completed_at
        FROM analyses ORDER BY started_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_analysis(analysis_id: str):
    conn = get_conn()
    conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
    conn.commit()
    conn.close()


# ── KB Documents ──

def save_kb_document(doc: dict):
    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO kb_documents
        (id, title, filename, file_format, file_size, content, source, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc["id"], doc["title"], doc["filename"], doc["file_format"],
        doc["file_size"], doc["content"], doc.get("source", ""),
        doc.get("language", "en"), doc["created_at"], doc["updated_at"],
    ))
    conn.commit()
    conn.close()


def get_kb_document(doc_id: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM kb_documents WHERE id = ?", (doc_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_kb_documents() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM kb_documents ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_kb_document(doc_id: str, title: str, source: str, content: str):
    conn = get_conn()
    conn.execute("""
        UPDATE kb_documents SET title = ?, source = ?, content = ?, updated_at = ?
        WHERE id = ?
    """, (title, source, content, datetime.now().isoformat(), doc_id))
    conn.commit()
    conn.close()


def delete_kb_document(doc_id: str):
    conn = get_conn()
    conn.execute("DELETE FROM kb_documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()


def search_kb_documents(query: str) -> list[dict]:
    conn = get_conn()
    pattern = f"%{query}%"
    rows = conn.execute("""
        SELECT * FROM kb_documents
        WHERE title LIKE ? OR content LIKE ? OR source LIKE ?
        ORDER BY created_at DESC
    """, (pattern, pattern, pattern)).fetchall()
    conn.close()
    return [dict(r) for r in rows]
