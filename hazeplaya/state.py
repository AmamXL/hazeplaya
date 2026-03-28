import threading
import time

import storage

# Thread-safe lock for all state mutations
_state_lock = threading.RLock()

queue = []
current_index = -1
is_playing = False
play_offset = 0.0
play_start_time = 0.0
autoplay_enabled = False
last_played_id = None

admin_sockets = set()
pw_attempts = {}
PW_MAX = 5
PW_WINDOW = 60


def load_persistent_state():
    """Load state from database on startup."""
    global queue, current_index, is_playing, play_offset, play_start_time
    global autoplay_enabled, last_played_id
    
    saved = storage.load_queue()
    if saved:
        queue = saved["queue"]
        current_index = saved["current_index"]
        is_playing = saved["is_playing"]
        play_offset = saved["play_offset"]
        play_start_time = saved["play_start_time"]
        autoplay_enabled = saved["autoplay_enabled"]
        last_played_id = saved["last_played_id"]
        return True
    return False


def _persist_state():
    """Internal: Save current state to database."""
    storage.save_queue(
        queue, current_index, is_playing, play_offset, play_start_time,
        autoplay_enabled, last_played_id
    )


def get_lock():
    """Return the state lock for external synchronization when needed."""
    return _state_lock


def current_position():
    with _state_lock:
        if not is_playing or play_start_time == 0:
            return play_offset
        return play_offset + (time.time() - play_start_time)


def get_state():
    with _state_lock:
        return {
            "queue": list(queue),  # Return copy to prevent external mutation
            "current_index": current_index,
            "is_playing": is_playing,
            "position": current_position(),
        }


def set_current_index(value):
    global current_index
    with _state_lock:
        current_index = value
        _persist_state()


def set_is_playing(value):
    global is_playing
    with _state_lock:
        is_playing = value
        _persist_state()


def set_play_offset(value):
    global play_offset
    with _state_lock:
        play_offset = value
        _persist_state()


def set_play_start_time(value):
    global play_start_time
    with _state_lock:
        play_start_time = value
        _persist_state()


def set_autoplay_enabled(value):
    global autoplay_enabled
    with _state_lock:
        autoplay_enabled = value
        _persist_state()


def set_last_played_id(value):
    global last_played_id
    with _state_lock:
        last_played_id = value
        _persist_state()


def add_to_queue(song):
    """Thread-safe queue append. Returns new length."""
    global current_index, is_playing, play_offset, play_start_time
    with _state_lock:
        queue.append(song)
        if current_index == -1:
            current_index = 0
            is_playing = True
            play_offset = 0.0
            play_start_time = time.time()
        _persist_state()
        return len(queue)


def remove_from_queue(index):
    """Thread-safe queue removal. Returns info about the change."""
    global current_index, is_playing, play_offset, play_start_time
    with _state_lock:
        if index < 0 or index >= len(queue):
            return None

        is_current = index == current_index
        removed_song = queue[index]

        queue.pop(index)

        if len(queue) == 0:
            current_index = -1
            is_playing = False
            play_offset = 0.0
            play_start_time = 0.0
        elif index < current_index:
            current_index -= 1
        elif index == current_index:
            if current_index >= len(queue):
                current_index = len(queue) - 1
            play_offset = 0.0
            play_start_time = time.time()
            is_playing = True

        _persist_state()
        return {
            "is_current": is_current,
            "removed": removed_song,
            "queue_empty": len(queue) == 0,
        }


def reorder_queue(from_idx, to_idx):
    """Thread-safe queue reordering. Returns True if successful."""
    global current_index
    with _state_lock:
        if from_idx == to_idx:
            return False
        if not (0 <= from_idx < len(queue)) or not (0 <= to_idx < len(queue)):
            return False

        song = queue.pop(from_idx)
        queue.insert(to_idx, song)

        if from_idx == current_index:
            current_index = to_idx
        elif from_idx < current_index <= to_idx:
            current_index -= 1
        elif to_idx <= current_index < from_idx:
            current_index += 1

        _persist_state()
        return True


def get_queue_copy():
    """Return a thread-safe copy of the queue."""
    with _state_lock:
        return list(queue)
