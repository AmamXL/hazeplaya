import time


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


def current_position():
    if not is_playing or play_start_time == 0:
        return play_offset
    return play_offset + (time.time() - play_start_time)


def get_state():
    return {
        "queue": queue,
        "current_index": current_index,
        "is_playing": is_playing,
        "position": current_position(),
    }
