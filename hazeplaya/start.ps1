$env:YOUTUBE_API_KEYS="AIzaSyCmHy4oP7-Hcd3f3LmFTj9WflktVWnOs8s,AIzaSyAbId6jtYhSUGRsGVCGuPLVCAAeYaqxEBg,AIzaSyD2rDyejJQdOqaVLGt9aK-72vOFSMsb-S4,AIzaSyBMy-fVnxLBN6MU9qVaUDf4mcTNHukYVD8,AIzaSyBybVZcQfHq9nODZldxoUApLl89rdTmN7o,AIzaSyDGa11MQz6Z9VjUKJTqUW9_XzOx4CFGSV0"
$env:ADMIN_PASSWORD="1749"
Start-Process powershell -ArgumentList "ngrok http 5001"
Start-Sleep 3
$url = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url
Write-Host "Share this link: $url" -ForegroundColor Green
python app.py
