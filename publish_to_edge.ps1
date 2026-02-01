# Microsoft Edge Extension Auto-Publisher 🚀

# Configuration
$SourceDir = $PSScriptRoot
$ZipPath = Join-Path $PSScriptRoot "linkedin_extension.zip"
$ApiEndpoint = "https://api.addons.microsoftedge.microsoft.com"
$SecretsFile = Join-Path $PSScriptRoot "edge_secrets.json"

# Load Secrets (Priority: Environment Vars -> JSON File)
if ($env:CLIENTID -and $env:APIKEY -and $env:PRODUCTID) {
    Write-Host "🔐 Using Secrets from Environment Variables (CI/CD)" -ForegroundColor Cyan
    $ClientID = $env:CLIENTID
    $ApiKey = $env:APIKEY
    $ProductID = $env:PRODUCTID
}
elseif (Test-Path $SecretsFile) {
    Write-Host "📂 Using Secrets from Local File" -ForegroundColor Cyan
    $Secrets = Get-Content $SecretsFile | ConvertFrom-Json
    $ClientID = $Secrets.ClientID
    $ApiKey = $Secrets.ApiKey
    $ProductID = $Secrets.ProductID
}
else {
    Write-Error "❌ No credentials found! Set CLIENTID/APIKEY/PRODUCTID env vars or create edge_secrets.json"
    exit 1
}

# 1. Zip the Extension
Write-Host "📦 Zipping extension..." -ForegroundColor Cyan
if (Test-Path $ZipPath) { Remove-Item $ZipPath }
# Exclude git, script itself, and github workflows from the zip
Get-ChildItem -Path $SourceDir -Exclude ".git", ".github", "publish_to_edge.ps1", "edge_secrets.json", "*.zip" | Compress-Archive -DestinationPath $ZipPath -Force

# 2. Upload Package
Write-Host "tj Uploading to Store..." -ForegroundColor Cyan
$UploadHeaders = @{
    "Authorization" = "ApiKey $ApiKey"
    "X-ClientID"    = "$ClientID"
    "Content-Type"  = "application/zip"
}

try {
    $uploadResponse = Invoke-WebRequest "$ApiEndpoint/v1/products/$ProductID/submissions/draft/package" `
        -Headers $UploadHeaders `
        -Method POST `
        -InFile $ZipPath

    if ($uploadResponse.StatusCode -eq 202) {
        $operationId = $uploadResponse.Headers["Location"]
        Write-Host "✅ Upload Accepted. Operation ID: $operationId" -ForegroundColor Green
        
        # Check Upload Status
        do {
            Start-Sleep -Seconds 2
            $statusResponse = Invoke-WebRequest "$ApiEndpoint/v1/products/$ProductID/submissions/draft/package/operations/$operationId" `
                -Headers $UploadHeaders -Method GET
            $status = ($statusResponse.Content | ConvertFrom-Json).status
            Write-Host "   Status: $status" -ForegroundColor Gray
        } while ($status -eq "InProgress")

        if ($status -eq "Succeeded") {
            Write-Host "✅ Upload Complete!" -ForegroundColor Green
        }
        else {
            Write-Error "Upload Failed: $status"
            exit
        }
    }
}
catch {
    Write-Error "Upload Request Failed: $_"
    exit 1
}

# 3. Publish Submission
Write-Host "🚀 Publishing Submission..." -ForegroundColor Cyan
$PublishBody = @{ notes = "Automated update via CI/CD script" } | ConvertTo-Json

try {
    $publishResponse = Invoke-WebRequest "$ApiEndpoint/v1/products/$ProductID/submissions" `
        -Headers $UploadHeaders `
        -Method POST `
        -Body $PublishBody `
        -ContentType "application/json"

    if ($publishResponse.StatusCode -eq 202) {
        $pubOpId = $publishResponse.Headers["Location"]
        Write-Host "✅ Publish Requested. Operation ID: $pubOpId" -ForegroundColor Green
        
        # Check Publish Status
        do {
            Start-Sleep -Seconds 5
            $pubStatusResponse = Invoke-WebRequest "$ApiEndpoint/v1/products/$ProductID/submissions/operations/$pubOpId" `
                -Headers $UploadHeaders -Method GET
            $pubStatus = ($pubStatusResponse.Content | ConvertFrom-Json).status
            Write-Host "   Status: $pubStatus" -ForegroundColor Gray
        } while ($pubStatus -eq "InProgress")

        if ($pubStatus -eq "Succeeded") {
            Write-Host "🎉 SUCCESS! Extension update published to Store." -ForegroundColor Green
        }
        else {
            Write-Error "Publish Failed: $pubStatus"
        }
    }
}
catch {
    Write-Error "Publish Request Failed: $_"
}
