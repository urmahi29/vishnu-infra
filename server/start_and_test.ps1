Write-Host "=== Installing dependencies ==="
Set-Location "E:\VISHNU_INFRA\server"
npm install 2>&1 | Out-Null

Write-Host "=== Starting backend server ==="
$job = Start-Job -ScriptBlock {
    Set-Location "E:\VISHNU_INFRA\server"
    node src/server.js 2>&1
}

Start-Sleep -Seconds 15

Write-Host "=== Server output so far ==="
Receive-Job -Job $job

Write-Host ""
Write-Host "=== Testing login API ==="
try {
    $body = @{ email = "admin@roadconstruction.com"; password = "Admin@123" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "LOGIN SUCCESS! Response:" 
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "LOGIN TEST FAILED:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response body: $errorBody"
    }
}

Write-Host ""
Write-Host "=== Stopping server ==="
Stop-Job -Job $job -ErrorAction SilentlyContinue
Remove-Job -Job $job -ErrorAction SilentlyContinue

Write-Host "=== Done ==="
