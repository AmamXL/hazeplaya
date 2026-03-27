import os
import time
import datetime
import json
import requests
import yt_dlp
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hazeplaya-secret'
socketio = SocketIO(app, cors_allowed_origins="*")


ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "7777")

YOUTUBE_API_KEYS = [k.strip() for k in os.environ.get("YOUTUBE_API_KEYS", "").split(",") if k.strip()]
if not YOUTUBE_API_KEYS:
    raise RuntimeError("YOUTUBE_API_KEYS env var not set")
_key_index = 0

# Quota tracking — 100 units per search, 10,000 units per key per day (resets midnight PT)
_QUOTA_FILE = os.path.join(os.path.dirname(__file__), 'quota_state.json')
_quota_searches = 0
_quota_date = None


def _pt_today():
    return (datetime.datetime.utcnow() - datetime.timedelta(hours=8)).date()


def _save_quota():
    try:
        with open(_QUOTA_FILE, 'w') as f:
            json.dump({'date': _quota_date.isoformat(), 'searches': _quota_searches}, f)
    except Exception:
        pass


def _load_quota():
    global _quota_searches, _quota_date
    try:
        with open(_QUOTA_FILE) as f:
            data = json.load(f)
        saved_date = datetime.date.fromisoformat(data['date'])
        if saved_date == _pt_today():
            _quota_searches = int(data['searches'])
            _quota_date = saved_date
            return
    except Exception:
        pass
    _quota_searches = 0
    _quota_date = _pt_today()


def _check_quota_reset():
    global _quota_searches, _quota_date
    today = _pt_today()
    if _quota_date != today:
        _quota_searches = 0
        _quota_date = today
        _save_quota()


_load_quota()


def youtube_search(q):
    global _key_index, _quota_searches
    _check_quota_reset()
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


# Shared state
admin_sockets = set()
_pw_attempts = {}  # {sid: [timestamps]}
_PW_MAX = 5
_PW_WINDOW = 60
shared_queue = []
current_index = -1
is_playing = False
play_offset = 0.0
play_start_time = 0.0
autoplay_enabled = False
_last_played_id = None


def current_position():
    if not is_playing or play_start_time == 0:
        return play_offset
    return play_offset + (time.time() - play_start_time)


def get_state():
    return {
        'queue': shared_queue,
        'current_index': current_index,
        'is_playing': is_playing,
        'position': current_position(),
    }


def broadcast_state():
    socketio.emit('state', get_state())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/stream/<video_id>")
def stream(video_id):
    print(f"[STREAM] Fetching fallback stream for video_id={video_id}")
    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True, 'cookiefile': os.path.join(os.path.dirname(__file__), 'cookies.txt')}) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
        print(f"[STREAM] OK — {info.get('title', video_id)}")
        return jsonify({'url': info['url']})
    except Exception as e:
        print(f"[STREAM] FAILED — video_id={video_id} error={e}")
        return jsonify({'error': str(e)}), 500


@app.route("/quota")
def quota():
    _check_quota_reset()
    return jsonify({'used': _quota_searches, 'total': len(YOUTUBE_API_KEYS) * 100})


@app.route("/search")
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


@socketio.on('connect')
def on_connect():
    emit('state', get_state())
    emit('autoplay_state', {'enabled': autoplay_enabled})


@socketio.on('disconnect')
def on_disconnect():
    admin_sockets.discard(request.sid)
    _pw_attempts.pop(request.sid, None)


@socketio.on('verify_password')
def on_verify_password(data):
    sid = request.sid
    now = time.time()
    attempts = [t for t in _pw_attempts.get(sid, []) if now - t < _PW_WINDOW]
    if len(attempts) >= _PW_MAX:
        emit('unlock_result', {'success': False, 'locked': True})
        _pw_attempts[sid] = attempts
        return
    attempts.append(now)
    _pw_attempts[sid] = attempts
    if data.get('password') == ADMIN_PASSWORD:
        admin_sockets.add(sid)
        emit('unlock_result', {'success': True})
    else:
        admin_sockets.discard(sid)
        emit('unlock_result', {'success': False, 'locked': False})


@socketio.on('add_song')
def on_add_song(song):
    global current_index, is_playing, play_offset, play_start_time
    shared_queue.append(song)
    if current_index == -1:
        current_index = 0
        is_playing = True
        play_offset = 0.0
        play_start_time = time.time()
    broadcast_state()


@socketio.on('remove_song')
def on_remove_song(data):
    global current_index, is_playing, play_offset, play_start_time, _last_played_id
    if request.sid not in admin_sockets:
        return
    index = data['index']
    if index < 0 or index >= len(shared_queue):
        return
    title = shared_queue[index].get('title', shared_queue[index].get('id', '?'))
    reason = data.get('reason', 'manual')
    is_current = index == current_index
    print(f"[REMOVE] '{title}' index={index} current={is_current} reason={reason} sid={request.sid[:8]}")
    if index == current_index:
        _last_played_id = shared_queue[index].get('id')
    shared_queue.pop(index)
    if len(shared_queue) == 0:
        current_index = -1
        is_playing = False
        play_offset = 0.0
        play_start_time = 0.0
        if autoplay_enabled and _last_played_id:
            socketio.start_background_task(_do_autoplay, _last_played_id)
    elif index < current_index:
        current_index -= 1
    elif index == current_index:
        if current_index >= len(shared_queue):
            current_index = len(shared_queue) - 1
        play_offset = 0.0
        play_start_time = time.time()
        is_playing = True
    broadcast_state()


@socketio.on('reorder_queue')
def on_reorder_queue(data):
    global current_index
    if request.sid not in admin_sockets:
        return
    from_idx, to_idx = data['from'], data['to']
    if from_idx == to_idx or not (0 <= from_idx < len(shared_queue)) or not (0 <= to_idx < len(shared_queue)):
        return
    song = shared_queue.pop(from_idx)
    shared_queue.insert(to_idx, song)
    if from_idx == current_index:
        current_index = to_idx
    elif from_idx < current_index <= to_idx:
        current_index -= 1
    elif to_idx <= current_index < from_idx:
        current_index += 1
    broadcast_state()


@socketio.on('admin_skip_next')
def on_admin_skip_next():
    if request.sid not in admin_sockets or current_index == -1:
        return
    on_remove_song({'index': current_index})


@socketio.on('admin_skip_prev')
def on_admin_skip_prev():
    global current_index, is_playing, play_offset, play_start_time
    if request.sid not in admin_sockets or current_index <= 0:
        return
    current_index -= 1
    is_playing = True
    play_offset = 0.0
    play_start_time = time.time()
    broadcast_state()


@socketio.on('play_song')
def on_play_song(data):
    global current_index, is_playing, play_offset, play_start_time
    if request.sid not in admin_sockets:
        return
    current_index = data['index']
    is_playing = True
    play_offset = 0.0
    play_start_time = time.time()
    broadcast_state()


@socketio.on('set_playing')
def on_set_playing(data):
    global is_playing, play_offset, play_start_time
    if request.sid not in admin_sockets:
        return
    playing = data['playing']
    if playing and not is_playing:
        play_start_time = time.time()
    elif not playing and is_playing:
        play_offset = current_position()
        play_start_time = 0.0
    is_playing = playing
    broadcast_state()


@socketio.on('seek')
def on_seek(data):
    global play_offset, play_start_time
    if request.sid not in admin_sockets:
        return
    play_offset = float(data['position'])
    if is_playing:
        play_start_time = time.time()
    broadcast_state()


@socketio.on('set_autoplay')
def on_set_autoplay(data):
    global autoplay_enabled
    if request.sid not in admin_sockets:
        return
    autoplay_enabled = bool(data.get('enabled'))
    socketio.emit('autoplay_state', {'enabled': autoplay_enabled})


def _do_autoplay(video_id):
    global shared_queue, current_index, is_playing, play_offset, play_start_time
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'playlistend': 7,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(
                f'https://www.youtube.com/watch?v={video_id}&list=RD{video_id}',
                download=False
            )
        entries = info.get('entries', [])
        added = 0
        for entry in entries:
            vid_id = entry.get('id')
            if not vid_id or vid_id == video_id:
                continue
            shared_queue.append({
                'id': vid_id,
                'title': entry.get('title', 'Unknown'),
                'channel': entry.get('channel') or entry.get('uploader', 'Unknown'),
                'thumbnail': f'https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg',
            })
            added += 1
            if added >= 3:
                break
        if shared_queue:
            current_index = 0
            is_playing = True
            play_offset = 0.0
            play_start_time = time.time()
            broadcast_state()
    except Exception:
        pass


if __name__ == "__main__":
    import signal, sys
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    socketio.run(app, host='127.0.0.1', port=5001, debug=False, use_reloader=False, log_output=True, allow_unsafe_werkzeug=True)
