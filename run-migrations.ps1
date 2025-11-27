# Run all Supabase migrations in order
$PROJECT_REF = "acxhhfwvxtkvxkvmfiep"
$DB_PASSWORD = "puremycelium11"
$MIGRATIONS_DIR = "supabase\migrations"

Write-Host "Running Supabase migrations..." -ForegroundColor Green

# Get all migration files in order
$migrationFiles = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

foreach ($file in $migrationFiles) {
    Write-Host ""
    Write-Host "Applying migration: $($file.Name)" -ForegroundColor Cyan
    
    # Use npx supabase to execute the migration
    try {
        npx supabase db execute --db-url "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" --file $file.FullName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully applied: $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "Failed to apply: $($file.Name)" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error applying $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Migration process completed!" -ForegroundColor Green
