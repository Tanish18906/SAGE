from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from typing import List, Optional

DB_PATH = Path(__file__).parent.parent / "campus_safety.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the SQLite alerts table per TECH_STACK.md and CONTRACT.md."""
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                zone_id TEXT,
                tracked_id INTEGER,
                snapshot_url TEXT,
                narration TEXT,
                confirmed INTEGER DEFAULT 1
            )
            """
        )
        conn.commit()


def insert_alert(
    alert_id: str,
    alert_type: str,
    zone_id: Optional[str],
    tracked_id: int,
    timestamp: str,
    snapshot_url: str,
    narration: str,
    confirmed: bool = True,
) -> dict:
    """Inserts an alert record into SQLite."""
    init_db()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO alerts (id, timestamp, alert_type, zone_id, tracked_id, snapshot_url, narration, confirmed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                alert_id,
                timestamp,
                alert_type,
                zone_id,
                tracked_id,
                snapshot_url,
                narration,
                1 if confirmed else 0,
            ),
        )
        conn.commit()

    return {
        "id": alert_id,
        "alert_type": alert_type,
        "zone_id": zone_id,
        "tracked_id": tracked_id,
        "timestamp": timestamp,
        "snapshot_url": snapshot_url,
        "narration": narration,
        "confirmed": confirmed,
    }


def get_all_alerts(limit: int = 100, alert_type: Optional[str] = None, zone_id: Optional[str] = None) -> List[dict]:
    """Retrieves past alerts ordered newest first per CONTRACT.md Section 5."""
    init_db()
    query = "SELECT id, alert_type, zone_id, tracked_id, timestamp, snapshot_url, narration, confirmed FROM alerts"
    params = []
    conditions = []

    if alert_type:
        conditions.append("alert_type = ?")
        params.append(alert_type)
    if zone_id:
        conditions.append("zone_id = ?")
        params.append(zone_id)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "alert_type": row["alert_type"],
                "zone_id": row["zone_id"],
                "tracked_id": row["tracked_id"],
                "timestamp": row["timestamp"],
                "snapshot_url": row["snapshot_url"],
                "narration": row["narration"],
                "confirmed": bool(row["confirmed"]),
            }
            for row in rows
        ]


# Initialize on import
init_db()
