import datetime
import json

import requests

from config import YOUTUBE_API_KEYS, QUOTA_FILE

_key_index = 0
_quota_searches = 0
_quota_date = None


def _pt_today():
    return (datetime.datetime.utcnow() - datetime.timedelta(hours=8)).date()


def _save_quota():
    try:
        with open(QUOTA_FILE, "w") as f:
            json.dump({"date": _quota_date.isoformat(), "searches": _quota_searches}, f)
    except Exception:
        pass


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
    except Exception:
        pass
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
    global _key_index, _quota_searches
    check_quota_reset()
    for _ in range(len(YOUTUBE_API_KEYS)):
        resp = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "type": "video",
                "q": q,
                "key": YOUTUBE_API_KEYS[_key_index % len(YOUTUBE_API_KEYS)],
                "maxResults": 8,
                "videoCategoryId": "10",
            },
            timeout=5,
        )
        data = resp.json()
        if "error" not in data:
            _quota_searches += 1
            _save_quota()
            return data
        _key_index += 1
    return {}


_load_quota()
