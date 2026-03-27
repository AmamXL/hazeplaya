import time

import yt_dlp
from flask import request

import state
from config import ADMIN_PASSWORD


def register(socketio):
    def broadcast_state():
        socketio.emit("state", state.get_state())

    @socketio.on("connect")
    def on_connect():
        socketio.emit("state", state.get_state(), to=request.sid)
        socketio.emit("autoplay_state", {"enabled": state.autoplay_enabled}, to=request.sid)

    @socketio.on("disconnect")
    def on_disconnect():
        state.admin_sockets.discard(request.sid)
        state.pw_attempts.pop(request.sid, None)

    @socketio.on("verify_password")
    def on_verify_password(data):
        sid = request.sid
        now = time.time()
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
        state.queue.append(song)
        if state.current_index == -1:
            state.current_index = 0
            state.is_playing = True
            state.play_offset = 0.0
            state.play_start_time = time.time()
        broadcast_state()

    @socketio.on("remove_song")
    def on_remove_song(data):
        if request.sid not in state.admin_sockets:
            return
        index = data["index"]
        if index < 0 or index >= len(state.queue):
            return
        title = state.queue[index].get("title", state.queue[index].get("id", "?"))
        reason = data.get("reason", "manual")
        is_current = index == state.current_index
        try:
            print(f"[REMOVE] '{title}' index={index} current={is_current} reason={reason} sid={request.sid[:8]}")
        except UnicodeEncodeError:
            print(f"[REMOVE] index={index} current={is_current} reason={reason} sid={request.sid[:8]}")
        if index == state.current_index:
            state.last_played_id = state.queue[index].get("id")
        state.queue.pop(index)
        if len(state.queue) == 0:
            state.current_index = -1
            state.is_playing = False
            state.play_offset = 0.0
            state.play_start_time = 0.0
            if state.autoplay_enabled and state.last_played_id:
                socketio.start_background_task(_do_autoplay, state.last_played_id, socketio)
        elif index < state.current_index:
            state.current_index -= 1
        elif index == state.current_index:
            if state.current_index >= len(state.queue):
                state.current_index = len(state.queue) - 1
            state.play_offset = 0.0
            state.play_start_time = time.time()
            state.is_playing = True
        broadcast_state()

    @socketio.on("reorder_queue")
    def on_reorder_queue(data):
        if request.sid not in state.admin_sockets:
            return
        from_idx, to_idx = data["from"], data["to"]
        if from_idx == to_idx or not (0 <= from_idx < len(state.queue)) or not (0 <= to_idx < len(state.queue)):
            return
        song = state.queue.pop(from_idx)
        state.queue.insert(to_idx, song)
        if from_idx == state.current_index:
            state.current_index = to_idx
        elif from_idx < state.current_index <= to_idx:
            state.current_index -= 1
        elif to_idx <= state.current_index < from_idx:
            state.current_index += 1
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
        state.current_index -= 1
        state.is_playing = True
        state.play_offset = 0.0
        state.play_start_time = time.time()
        broadcast_state()

    @socketio.on("play_song")
    def on_play_song(data):
        if request.sid not in state.admin_sockets:
            return
        state.current_index = data["index"]
        state.is_playing = True
        state.play_offset = 0.0
        state.play_start_time = time.time()
        broadcast_state()

    @socketio.on("set_playing")
    def on_set_playing(data):
        if request.sid not in state.admin_sockets:
            return
        playing = data["playing"]
        if playing and not state.is_playing:
            state.play_start_time = time.time()
        elif not playing and state.is_playing:
            state.play_offset = state.current_position()
            state.play_start_time = 0.0
        state.is_playing = playing
        broadcast_state()

    @socketio.on("seek")
    def on_seek(data):
        if request.sid not in state.admin_sockets:
            return
        state.play_offset = float(data["position"])
        if state.is_playing:
            state.play_start_time = time.time()
        broadcast_state()

    @socketio.on("set_autoplay")
    def on_set_autoplay(data):
        if request.sid not in state.admin_sockets:
            return
        state.autoplay_enabled = bool(data.get("enabled"))
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
            state.queue.append({
                "id": vid_id,
                "title": entry.get("title", "Unknown"),
                "channel": entry.get("channel") or entry.get("uploader", "Unknown"),
                "thumbnail": f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg",
            })
            added += 1
            if added >= 3:
                break
        if state.queue:
            state.current_index = 0
            state.is_playing = True
            state.play_offset = 0.0
            state.play_start_time = time.time()
            socketio.emit("state", state.get_state())
    except Exception:
        pass
