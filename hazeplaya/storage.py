"""
SQLite persistence layer for hazeplaya queue state.
Provides automatic save/load of queue, current index, and playback state.
"""

import json
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_logger = logging.getLogger("werkzeug")

DB_PATH = Path(__file__).parent / "hazeplaya.db"


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize database schema."""
    try:
        with get_db_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS queue_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    current_index INTEGER DEFAULT -1,
                    is_playing INTEGER DEFAULT 0,
                    play_offset REAL DEFAULT 0.0,
                    play_start_time REAL DEFAULT 0.0,
                    autoplay_enabled INTEGER DEFAULT 1,
                    last_played_id TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS queue_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    position INTEGER NOT NULL,
                    video_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    thumbnail TEXT,
                    duration INTEGER,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_queue_items_position 
                ON queue_items(position);
                
                -- Initialize state row if not exists
                INSERT OR IGNORE INTO queue_state (id) VALUES (1);
            """)
            conn.commit()
        _logger.info(f"Database initialized at {DB_PATH}")
    except sqlite3.Error as e:
        _logger.error(f"Failed to initialize database: {e}")


def save_queue(queue, current_index, is_playing, play_offset, play_start_time, 
               autoplay_enabled, last_played_id):
    """
    Save queue state to database in a single transaction.
    
    Args:
        queue: List of song dictionaries
        current_index: Current playing index
        is_playing: Boolean playback state
        play_offset: Current playback position offset
        play_start_time: Timestamp when playback started
        autoplay_enabled: Boolean autoplay setting
        last_played_id: ID of last played song
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Save queue state
            cursor.execute("""
                UPDATE queue_state SET
                    current_index = ?,
                    is_playing = ?,
                    play_offset = ?,
                    play_start_time = ?,
                    autoplay_enabled = ?,
                    last_played_id = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            """, (
                current_index,
                1 if is_playing else 0,
                play_offset,
                play_start_time,
                1 if autoplay_enabled else 0,
                last_played_id
            ))
            
            # Clear existing queue items
            cursor.execute("DELETE FROM queue_items")
            
            # Insert queue items
            if queue:
                items = [
                    (
                        idx,
                        song.get("id", ""),
                        song.get("title", "Unknown"),
                        song.get("channel", "Unknown"),
                        song.get("thumbnail", ""),
                        song.get("duration")
                    )
                    for idx, song in enumerate(queue)
                ]
                cursor.executemany("""
                    INSERT INTO queue_items (position, video_id, title, channel, thumbnail, duration)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, items)
            
            conn.commit()
            
    except sqlite3.Error as e:
        _logger.error(f"Failed to save queue state: {e}")


def load_queue():
    """
    Load queue state from database.
    
    Returns:
        Dictionary with queue and state information, or None if no saved state.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Load state
            cursor.execute("""
                SELECT current_index, is_playing, play_offset, play_start_time,
                       autoplay_enabled, last_played_id
                FROM queue_state WHERE id = 1
            """)
            state_row = cursor.fetchone()
            
            if not state_row:
                return None
            
            # Load queue items
            cursor.execute("""
                SELECT video_id, title, channel, thumbnail, duration
                FROM queue_items
                ORDER BY position ASC
            """)
            queue = [
                {
                    "id": row["video_id"],
                    "title": row["title"],
                    "channel": row["channel"],
                    "thumbnail": row["thumbnail"] or "",
                    "duration": row["duration"]
                }
                for row in cursor.fetchall()
            ]
            
            return {
                "queue": queue,
                "current_index": state_row["current_index"],
                "is_playing": bool(state_row["is_playing"]),
                "play_offset": state_row["play_offset"],
                "play_start_time": state_row["play_start_time"],
                "autoplay_enabled": bool(state_row["autoplay_enabled"]),
                "last_played_id": state_row["last_played_id"]
            }
            
    except sqlite3.Error as e:
        _logger.error(f"Failed to load queue state: {e}")
        return None


def clear_queue():
    """Clear all queue data from database."""
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM queue_items")
            conn.execute("""
                UPDATE queue_state SET
                    current_index = -1,
                    is_playing = 0,
                    play_offset = 0.0,
                    play_start_time = 0.0,
                    last_played_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            """)
            conn.commit()
    except sqlite3.Error as e:
        _logger.error(f"Failed to clear queue: {e}")


# Auto-initialize on import
init_db()
