import logging

from flask import Flask
from flask_socketio import SocketIO

from config import SECRET_KEY
from routes import bp
from sockets import register
import state
import youtube

# Suppress Flask's default HTTP request logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
socketio = SocketIO(app, cors_allowed_origins="*")

app.register_blueprint(bp)
register(socketio)

# Load persistent state from database on startup
if state.load_persistent_state():
    log.info("Loaded persistent queue state from database")

# Test all YouTube API keys on startup
youtube.test_all_keys()

if __name__ == "__main__":
    import signal
    import sys

    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    socketio.run(
        app,
        host="127.0.0.1",
        port=5001,
        debug=False,
        use_reloader=False,
        log_output=False,
        allow_unsafe_werkzeug=True,
    )
