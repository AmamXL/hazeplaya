import os
import time

import requests
import yt_dlp
from flask import Blueprint, render_template, request, jsonify

from youtube import youtube_search, get_quota_info

bp = Blueprint("main", __name__)

_COOKIES = os.path.join(os.path.dirname(__file__), "cookies.txt")


@bp.route("/")
def index():
    return render_template("index.html")


@bp.route("/test/<name>")
def test_page(name):
    """Serve test index files from templates/test/ folder."""
    return render_template(f"test/{name}")


@bp.route("/stream/<video_id>")
def stream(video_id):
    start = time.time()
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "cookiefile": _COOKIES}) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        elapsed = int((time.time() - start) * 1000)
        print(f"yt-dlp: {elapsed}ms")
        return jsonify({"url": info["url"]})
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        print(f"yt-dlp ERROR: {elapsed}ms")
        return jsonify({"error": str(e)}), 500


@bp.route("/quota")
def quota():
    return jsonify(get_quota_info())


@bp.route("/test-api")
def test_api():
    """Test YouTube API and return detailed status"""
    from config import YOUTUBE_API_KEYS
    results = []
    for i, key in enumerate(YOUTUBE_API_KEYS):
        try:
            resp = requests.get(
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
            data = resp.json()
            if "error" in data:
                results.append({"key": i, "status": "ERROR", "message": data["error"].get("message", "unknown")})
            else:
                results.append({"key": i, "status": "OK", "message": "Working"})
        except Exception as e:
            results.append({"key": i, "status": "EXCEPTION", "message": str(e)})
    return jsonify({"keys": results, "quota": get_quota_info()})


@bp.route("/search")
def search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])
    data = youtube_search(q)
    results = []
    for item in data.get("items", []):
        vid_id = item.get("id", {}).get("videoId")
        if not vid_id:
            continue
        snippet = item["snippet"]
        results.append({
            "id": vid_id,
            "title": snippet["title"],
            "channel": snippet["channelTitle"],
            "thumbnail": snippet["thumbnails"]["medium"]["url"],
        })
    return jsonify(results)
