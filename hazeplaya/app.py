from flask import Flask
from flask_socketio import SocketIO

from config import SECRET_KEY
from routes import bp
from sockets import register

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
socketio = SocketIO(app, cors_allowed_origins="*")

app.register_blueprint(bp)
register(socketio)

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
        log_output=True,
        allow_unsafe_werkzeug=True,
    )
