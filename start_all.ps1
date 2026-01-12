# Start Brain (Python)
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "& { .\.venv\Scripts\Activate.ps1; python apps/brain/main.py }" -WorkingDirectory "C:\Hotel"

# Start Manager (NestJS)
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "& { cd apps/manager; npm start }" -WorkingDirectory "C:\Hotel"

# Start Kiosk (Next.js)
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "& { cd apps/kiosk; npm run dev }" -WorkingDirectory "C:\Hotel"

Write-Host "All services starting in separate windows..."
