import os

SECRET_KEY = os.environ.get("SECRET_KEY", "hazeplaya-secret")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "7777")

YOUTUBE_API_KEYS = [k.strip() for k in os.environ.get("YOUTUBE_API_KEYS", "").split(",") if k.strip()]
if not YOUTUBE_API_KEYS:
    raise RuntimeError("YOUTUBE_API_KEYS env var not set")

QUOTA_FILE = os.path.join(os.path.dirname(__file__), "quota_state.json")
