import os

import yt_dlp
from flask import Blueprint, render_template, request, jsonify

from youtube import youtube_search, get_quota_info

bp = Blueprint("main", __name__)

_COOKIES = os.path.join(os.path.dirname(__file__), "cookies.txt")


@bp.route("/")
def index():
    return render_template("index.html")


@bp.route("/stream/<video_id>")
def stream(video_id):
    print(f"[STREAM] Fetching fallback stream for video_id={video_id}")
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "cookiefile": _COOKIES}) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        print(f"[STREAM] OK — {info.get('title', video_id)}")
        return jsonify({"url": info["url"]})
    except Exception as e:
        print(f"[STREAM] FAILED — video_id={video_id} error={e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/quota")
def quota():
    return jsonify(get_quota_info())


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
