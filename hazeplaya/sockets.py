import time

import yt_dlp
from flask import request

import state
from config import ADMIN_PASSWORD
import youtube


def register(socketio):
    # Initialize youtube module with socketio for quota broadcasts
    youtube.init_socketio(socketio)

    def broadcast_state():
        socketio.emit("state", state.get_state())

    @socketio.on("connect")
    def on_connect():
        from flask import request
        ip = request.environ.get('REMOTE_ADDR', 'unknown')
        print(f"{ip} joined")
        socketio.emit("state", state.get_state(), to=request.sid)
        socketio.emit("autoplay_state", {"enabled": state.autoplay_enabled}, to=request.sid)
        socketio.emit("quota_update", youtube.get_quota_info(), to=request.sid)

    @socketio.on("disconnect")
    def on_disconnect():
        with state.get_lock():
            state.admin_sockets.discard(request.sid)
            state.pw_attempts.pop(request.sid, None)

    @socketio.on("verify_password")
    def on_verify_password(data):
        sid = request.sid
        now = time.time()
        with state.get_lock():
            attempts = [t for t in state.pw_attempts.get(sid, []) if now - t < state.PW_WINDOW]
            if len(attempts) >= state.PW_MAX:
                socketio.emit("unlock_result", {"success": False, "locked": True}, to=sid)
                state.pw_attempts[sid] = attempts
                return
            attempts.append(now)
            state.pw_attempts[sid] = attempts
            if data.get("password") == ADMIN_PASSWORD:
                state.admin_sockets.add(sid)
                socketio.emit("unlock_result", {"success": True}, to=sid)
            else:
                state.admin_sockets.discard(sid)
                socketio.emit("unlock_result", {"success": False, "locked": False}, to=sid)

    @socketio.on("add_song")
    def on_add_song(song):
        from flask import request
        ip = request.environ.get('REMOTE_ADDR', 'unknown')
        title = song.get('title', 'Unknown')
        state.add_to_queue(song)
        print(f"{ip} added {title}")
        broadcast_state()

    @socketio.on("remove_song")
    def on_remove_song(data):
        # Allow non-admin removal for auto-remove (song ended)
        is_admin = request.sid in state.admin_sockets
        is_auto_remove = data.get("reason") in ("yt_ended", "fallback_ended", "fallback_stream_error", "fallback_fetch_error")

        if not is_admin and not is_auto_remove:
            return

        result = state.remove_from_queue(data["index"])
        if result is None:
            return

        if result["is_current"] and result["removed"]:
            state.set_last_played_id(result["removed"].get("id"))

        # State is already updated by remove_from_queue, just broadcast
        broadcast_state()

    @socketio.on("reorder_queue")
    def on_reorder_queue(data):
        if request.sid not in state.admin_sockets:
            return
        if state.reorder_queue(data["from"], data["to"]):
            broadcast_state()

    @socketio.on("admin_skip_next")
    def on_admin_skip_next():
        if request.sid not in state.admin_sockets or state.current_index == -1:
            return
        on_remove_song({"index": state.current_index})

    @socketio.on("admin_skip_prev")
    def on_admin_skip_prev():
        if request.sid not in state.admin_sockets or state.current_index <= 0:
            return
        state.set_current_index(state.current_index - 1)
        state.set_is_playing(True)
        state.set_play_offset(0.0)
        state.set_play_start_time(time.time())
        broadcast_state()

    @socketio.on("play_song")
    def on_play_song(data):
        if request.sid not in state.admin_sockets:
            return
        state.set_current_index(data["index"])
        state.set_is_playing(True)
        state.set_play_offset(0.0)
        state.set_play_start_time(time.time())
        broadcast_state()

    @socketio.on("set_playing")
    def on_set_playing(data):
        if request.sid not in state.admin_sockets:
            return
        playing = data["playing"]
        if playing and not state.is_playing:
            state.set_play_start_time(time.time())
        elif not playing and state.is_playing:
            state.set_play_offset(state.current_position())
            state.set_play_start_time(0.0)
        state.set_is_playing(playing)
        broadcast_state()

    @socketio.on("seek")
    def on_seek(data):
        if request.sid not in state.admin_sockets:
            return
        state.set_play_offset(float(data["position"]))
        if state.is_playing:
            state.set_play_start_time(time.time())
        broadcast_state()

    @socketio.on("set_autoplay")
    def on_set_autoplay(data):
        if request.sid not in state.admin_sockets:
            return
        state.set_autoplay_enabled(bool(data.get("enabled")))
        socketio.emit("autoplay_state", {"enabled": state.autoplay_enabled})


def _do_autoplay(video_id, socketio):
    try:
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "playlistend": 7,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}&list=RD{video_id}",
                download=False,
            )
        entries = info.get("entries", [])
        added = 0
        for entry in entries:
            vid_id = entry.get("id")
            if not vid_id or vid_id == video_id:
                continue
            state.add_to_queue({
                "id": vid_id,
                "title": entry.get("title", "Unknown"),
                "channel": entry.get("channel") or entry.get("uploader", "Unknown"),
                "thumbnail": f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg",
            })
            added += 1
            if added >= 3:
                break
        if added > 0:
            socketio.emit("state", state.get_state())
    except Exception as e:
        import logging
        logging.getLogger("werkzeug").error(f"Autoplay failed: {e}")
