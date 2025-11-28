# Load environment variables from .env.tests
Write-Host "Loading environment variables from .env.tests..." -ForegroundColor Cyan
Get-Content .\.env.tests | ForEach-Object {
  if ($_ -match '^\s*$' -or $_ -match '^\s*#') { return }
  $name, $value = $_.Split('=', 2)
  Set-Item -Path "Env:$name" -Value $value
  Write-Host "  Set $name" -ForegroundColor Gray
}

Write-Host "`nEnvironment variables loaded.`n" -ForegroundColor Green

# Display what we're about to run
Write-Host "Available test commands:" -ForegroundColor Yellow
Write-Host "  1. npm run perf:k6:products  - k6 load test for products API" -ForegroundColor White
Write-Host "  2. npm run perf:k6:orders    - k6 load test for orders API" -ForegroundColor White
Write-Host "  3. npm run test:api          - Playwright API tests" -ForegroundColor White
Write-Host "  4. All k6 tests              - Run both k6 tests" -ForegroundColor White
Write-Host "  5. All tests                 - Run k6 + API tests" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
  "1" {
    Write-Host "`nRunning k6 products load test...`n" -ForegroundColor Cyan
    npm run perf:k6:products
  }
  "2" {
    Write-Host "`nRunning k6 orders load test...`n" -ForegroundColor Cyan
    npm run perf:k6:orders
  }
  "3" {
    Write-Host "`nRunning Playwright API tests...`n" -ForegroundColor Cyan
    npm run test:api
  }
  "4" {
    Write-Host "`nRunning all k6 tests...`n" -ForegroundColor Cyan
    npm run perf:k6:products
    if ($LASTEXITCODE -eq 0) {
      npm run perf:k6:orders
    }
  }
  "5" {
    Write-Host "`nRunning all tests...`n" -ForegroundColor Cyan
    npm run perf:k6:products
    if ($LASTEXITCODE -eq 0) {
      npm run perf:k6:orders
    }
    if ($LASTEXITCODE -eq 0) {
      npm run test:api
    }
  }
  default {
    Write-Host "Invalid choice. Please run again." -ForegroundColor Red
  }
}

Write-Host "`nTest run completed. Exit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })
