# CLAUDE.md

## Project Overview

HAZEPLAYA — a shared song request website for streamers. Viewers connect in real-time, search and add songs to a shared queue. The streamer (admin) controls playback.

## Tech Stack

- **Backend:** Python/Flask + Flask-SocketIO (real-time sync)
- **Frontend:** Vanilla HTML/CSS/JS
- **Audio:** YouTube IFrame API + yt-dlp fallback for blocked videos
- **Search:** YouTube Data API v3 (multiple keys with quota tracking)
- **Tunnel:** ngrok for sharing the local server

## Project Structure

```
hazeplaya/
  app.py              # Flask server + Socket.IO handlers
  templates/
    index.html         # Frontend (HTML + CSS + JS — single file)
  static/              # Static assets
  cookies.txt          # yt-dlp auth cookies
  quota_state.json     # YouTube API quota tracker
  requirements.txt     # Python dependencies
  start.ps1            # PowerShell launcher (sets env vars, starts ngrok + server)
```

## Local Development

1. Set env vars: `YOUTUBE_API_KEYS` (comma-separated), `ADMIN_PASSWORD`
2. `pip install -r requirements.txt`
3. `python app.py` (runs on port 5001)
4. Or use `start.ps1` which handles env vars + ngrok

## Git Config (this repo)

- **user.name:** daodac-haze
- **user.email:** alkhodaryhazimcsgo@gmail.com

## Commit Messages

**Format:** Single line only. No body. No bullet points. No exceptions.

```
<Action verb> <what was done>
```

**Rules:**

1. ONE LINE ONLY — never add a commit body or description
2. Start with capital letter action verb: Add, Create, Update, Remove, Fix, Refactor
3. NO conventional commit prefixes (feat:, fix:, chore:, etc.)
4. NO phase numbers or plan numbers
5. NO bullet points or multi-line descriptions
6. NO `Co-Authored-By` lines
7. Keep under 72 characters
8. NEVER create git tags
