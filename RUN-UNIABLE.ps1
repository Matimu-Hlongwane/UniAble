# Optional helper: starts the frontend and backend in separate PowerShell windows.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$backend'; npm install; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$frontend'; npm install; npm run dev"

Write-Host 'UniAble frontend and backend terminals have been opened.' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:5173/'
Write-Host 'Backend:  http://localhost:4000/api/health'
