# HAZEPLAYA

A real-time song request website for streamers. Viewers search and add songs to a shared queue, while the streamer controls playback.

## Features

- Real-time sync between all connected users via WebSockets
- YouTube search with multiple API key rotation and quota tracking
- Admin controls (play/pause, skip, reorder, remove) protected by password
- YouTube IFrame playback with yt-dlp fallback for blocked videos
- Premade playlists for quick queue loading
- Autoplay mode (fetches similar songs when queue empties)
- Drag-and-drop queue reordering (admin only)
- Responsive design (desktop, tablet, mobile)

## Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO
- **Frontend:** Vanilla HTML/CSS/JS
- **Audio:** YouTube IFrame API + yt-dlp fallback
- **Search:** YouTube Data API v3

## Setup

1. Install dependencies:
   ```
   pip install -r hazeplaya/requirements.txt
   ```

2. Set environment variables:
   ```
   YOUTUBE_API_KEYS=key1,key2,key3
   ADMIN_PASSWORD=your_password
   ```

3. Run the server:
   ```
   cd hazeplaya
   python app.py
   ```

4. Open `http://127.0.0.1:5001` in your browser.

Or use `start.ps1` which sets env vars, launches ngrok, and starts the server.

## Project Structure

```
hazeplaya/
  app.py           # Flask app factory
  config.py        # Environment vars and constants
  state.py         # Shared playback state
  youtube.py       # YouTube API search + quota tracking
  routes.py        # HTTP endpoints
  sockets.py       # WebSocket event handlers
  static/
    css/styles.css  # Styles + responsive breakpoints
    js/
      app.js        # Main init + state sync
      player.js     # YouTube player + fallback
      queue.js      # Queue rendering + drag/drop
      search.js     # Search UI
      playlists.js  # Premade playlist data
      admin.js      # Admin unlock + controls
      utils.js      # Helpers
  templates/
    index.html      # HTML structure
```
