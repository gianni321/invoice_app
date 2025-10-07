# PowerShell script to test the API
# Test login
$loginUrl = "http://localhost:3000/api/auth/login"
$loginBody = '{"pin": "1234"}'
$loginHeaders = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing login..."
try {
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -Body $loginBody -Headers $loginHeaders
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Host "Login successful. Status: $($loginResponse.StatusCode)"
    Write-Host "Token: $($loginData.token)"
    
    # Test invoice submission
    $submitUrl = "http://localhost:3000/api/invoices/submit"
    $submitHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($loginData.token)"
    }
    
    Write-Host "`nTesting invoice submission..."
    $submitResponse = Invoke-WebRequest -Uri $submitUrl -Method POST -Body '{}' -Headers $submitHeaders
    $submitData = $submitResponse.Content | ConvertFrom-Json
    Write-Host "Submission successful. Status: $($submitResponse.StatusCode)"
    Write-Host "Response: $($submitResponse.Content)"
    
} catch {
    Write-Host "Error occurred:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Response: $($_.Exception.Response)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Error Body: $responseBody"
}