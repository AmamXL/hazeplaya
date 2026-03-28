# Make sure .env file exists with your API keys and password
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Create a .env file with YOUTUBE_API_KEYS and ADMIN_PASSWORD" -ForegroundColor Yellow
    Write-Host "See .env.example for template" -ForegroundColor Yellow
    exit 1
}

# Start ngrok in a separate window
Start-Process powershell -ArgumentList "ngrok http 5001"
Start-Sleep 3

# Get the ngrok URL
$url = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url
Write-Host "Share this link: $url" -ForegroundColor Green

# Install dependencies if needed
pip install -r requirements.txt --quiet

# Start the server
python app.py
