import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

SECRET_KEY = os.environ.get("SECRET_KEY", "hazeplaya-secret")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD env var not set - please set it in .env file")

YOUTUBE_API_KEYS = [k.strip() for k in os.environ.get("YOUTUBE_API_KEYS", "").split(",") if k.strip()]
if not YOUTUBE_API_KEYS:
    raise RuntimeError("YOUTUBE_API_KEYS env var not set - please set it in .env file")

QUOTA_FILE = os.path.join(os.path.dirname(__file__), "quota_state.json")
