import datetime
import json
import logging
import time

import requests

from config import YOUTUBE_API_KEYS, QUOTA_FILE

_logger = logging.getLogger("werkzeug")
_socketio = None
_key_index = 0
_quota_searches = 0
_quota_date = None


def init_socketio(socketio):
    """Initialize socketio reference for quota broadcasts."""
    global _socketio
    _socketio = socketio


def _pt_today():
    """Get current date in Pacific Time timezone."""
    try:
        import zoneinfo
        pt_tz = zoneinfo.ZoneInfo("America/Los_Angeles")
        return datetime.datetime.now(pt_tz).date()
    except ImportError:
        # Fallback for Python < 3.9 (zoneinfo not available)
        import pytz
        pt_tz = pytz.timezone("America/Los_Angeles")
        return datetime.datetime.now(pt_tz).date()


def _broadcast_quota():
    """Broadcast quota update to all connected clients."""
    if _socketio:
        _socketio.emit("quota_update", {
            "used": _quota_searches,
            "total": len(YOUTUBE_API_KEYS) * 100
        })


def _save_quota():
    try:
        with open(QUOTA_FILE, "w") as f:
            json.dump({"date": _quota_date.isoformat(), "searches": _quota_searches}, f)
        _broadcast_quota()
    except OSError as e:
        _logger.error(f"Failed to save quota state: {e}")
    except json.JSONEncodeError as e:
        _logger.error(f"Failed to serialize quota data: {e}")


def _load_quota():
    global _quota_searches, _quota_date
    try:
        with open(QUOTA_FILE) as f:
            data = json.load(f)
        saved_date = datetime.date.fromisoformat(data["date"])
        if saved_date == _pt_today():
            _quota_searches = int(data["searches"])
            _quota_date = saved_date
            return
    except FileNotFoundError:
        # First run, no quota file yet
        pass
    except json.JSONDecodeError as e:
        _logger.warning(f"Quota file corrupted, resetting: {e}")
    except (KeyError, ValueError) as e:
        _logger.warning(f"Invalid quota file format, resetting: {e}")
    except OSError as e:
        _logger.error(f"Failed to read quota file: {e}")
    
    _quota_searches = 0
    _quota_date = _pt_today()


def check_quota_reset():
    global _quota_searches, _quota_date
    today = _pt_today()
    if _quota_date != today:
        _quota_searches = 0
        _quota_date = today
        _save_quota()


def get_quota_info():
    check_quota_reset()
    return {"used": _quota_searches, "total": len(YOUTUBE_API_KEYS) * 100}


def youtube_search(q):
    """Search YouTube API with automatic key rotation on quota exhaustion."""
    global _key_index, _quota_searches
    check_quota_reset()

    if not q or not isinstance(q, str):
        _logger.warning(f"Invalid search query: {q!r}")
        return {}

    start = time.time()
    for attempt in range(len(YOUTUBE_API_KEYS)):
        key_index = (_key_index + attempt) % len(YOUTUBE_API_KEYS)

        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "type": "video",
                    "q": q,
                    "key": YOUTUBE_API_KEYS[key_index],
                    "maxResults": 8,
                    "videoCategoryId": "10",
                },
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()

            if "error" in data:
                error_info = data["error"]
                error_reason = error_info.get("errors", [{}])[0].get("reason", "unknown")

                # Rotate key on quota exceeded
                if error_reason == "quotaExceeded":
                    _logger.warning(f"API key {key_index} quota exceeded, rotating...")
                    continue

                _logger.error(f"YouTube API error: {error_info.get('message', 'Unknown')}")
                return {}

            _quota_searches += 1
            _key_index = key_index
            _save_quota()
            elapsed = int((time.time() - start) * 1000)
            print(f"YouTube API: {elapsed}ms")
            return data

        except requests.exceptions.Timeout:
            _logger.error(f"YouTube API timeout for query: {q}")
        except requests.exceptions.RequestException as e:
            _logger.error(f"YouTube API request failed: {e}")
        except json.JSONDecodeError as e:
            _logger.error(f"Failed to parse YouTube API response: {e}")

    return {}


def test_all_keys():
    """Test all YouTube API keys on startup and log results."""
    import requests as req
    print(f"Testing {len(YOUTUBE_API_KEYS)} YouTube API keys...")
    for i, key in enumerate(YOUTUBE_API_KEYS):
        try:
            start = time.time()
            resp = req.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "type": "video",
                    "q": "test",
                    "key": key,
                    "maxResults": 1,
                },
                timeout=5,
            )
            elapsed = int((time.time() - start) * 1000)
            data = resp.json()
            if "error" in data:
                reason = data["error"].get("errors", [{}])[0].get("reason", "unknown")
                print(f"  Key {i+1}: FAIL ({reason}) [{elapsed}ms]")
            else:
                print(f"  Key {i+1}: OK [{elapsed}ms]")
        except Exception as e:
            print(f"  Key {i+1}: ERROR ({type(e).__name__})")


_load_quota()
