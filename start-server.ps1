$PORT = 60000

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = $PWD.Path }
$ROOT_DIR = $SCRIPT_DIR

Write-Host "ROOT_DIR: $ROOT_DIR" -ForegroundColor Cyan
Write-Host "Checking if directory exists: $(Test-Path $ROOT_DIR)" -ForegroundColor Yellow

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -like '192.168.*' }).IPAddress

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$PORT/")

try {
    $listener.Start()
    Write-Host "Server started on port $PORT" -ForegroundColor Green
    Write-Host "Local access: http://localhost:$PORT" -ForegroundColor Cyan
    if ($localIP) {
        Write-Host "LAN access: http://$localIP`:$PORT" -ForegroundColor Cyan
    }
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.AbsolutePath

        if ($urlPath -eq "/") {
            $filePath = Join-Path $ROOT_DIR "index.html"
        } else {
            $filePath = Join-Path $ROOT_DIR ($urlPath.TrimStart("/"))
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = switch -Regex ($ext) {
                '\.html' { 'text/html' }
                '\.css' { 'text/css' }
                '\.js' { 'application/javascript' }
                '\.json' { 'application/json' }
                '\.png' { 'image/png' }
                '\.(jpg|jpeg)' { 'image/jpeg' }
                '\.gif' { 'image/gif' }
                '\.svg' { 'image/svg+xml' }
                '\.ico' { 'image/x-icon' }
                default { 'application/octet-stream' }
            }

            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.StatusCode = 200
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            $response.Close()
        } else {
            $errorHtml = "<html><body><h1>404 Not Found</h1></body></html>"
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorHtml)
            $response.ContentType = "text/html"
            $response.StatusCode = 404
            $response.ContentLength64 = $errorBytes.Length
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
            $response.Close()
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
