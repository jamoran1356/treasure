# Script de instalación de herramientas Solana
# Ejecutar como: .\install-solana-tools.ps1

Write-Host "=== Instalación de Herramientas Solana ===" -ForegroundColor Cyan

# 1. Verificar/Instalar Rust
Write-Host "`n[1/4] Verificando Rust..." -ForegroundColor Yellow
$rustPath = "$env:USERPROFILE\.cargo\bin"
$env:Path = "$env:Path;$rustPath"

if (!(Test-Path "$rustPath\rustc.exe")) {
    Write-Host "Instalando Rust..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
    Start-Process -Wait -FilePath "$env:TEMP\rustup-init.exe" -ArgumentList "-y"
    $env:Path = "$env:Path;$rustPath"
}

& "$rustPath\rustc.exe" --version
Write-Host "✓ Rust instalado" -ForegroundColor Green

# 2. Instalar Solana CLI usando cargo
Write-Host "`n[2/4] Instalando Solana CLI..." -ForegroundColor Yellow
Write-Host "Esto puede tardar 10-15 minutos en compilar..." -ForegroundColor Gray

& "$rustPath\cargo.exe" install solana-cli --version 1.18.26

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Solana CLI instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Error instalando Solana CLI" -ForegroundColor Red
}

# 3. Instalar Anchor Version Manager
Write-Host "`n[3/4] Instalando Anchor Version Manager..." -ForegroundColor Yellow
& "$rustPath\cargo.exe" install --git https://github.com/coral-xyz/anchor avm --locked --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ AVM instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Error instalando AVM" -ForegroundColor Red
}

# 4. Instalar Anchor CLI 0.30.1
Write-Host "`n[4/4] Instalando Anchor CLI 0.30.1..." -ForegroundColor Yellow
& "$rustPath\avm.exe" install 0.30.1
& "$rustPath\avm.exe" use 0.30.1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Anchor CLI instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Error instalando Anchor CLI" -ForegroundColor Red
}

# Verificar instalaciones
Write-Host "`n=== Verificación de Instalaciones ===" -ForegroundColor Cyan
Write-Host "Rust:" -ForegroundColor Yellow
& "$rustPath\rustc.exe" --version
& "$rustPath\cargo.exe" --version

Write-Host "`nSolana:" -ForegroundColor Yellow
& "$rustPath\solana.exe" --version

Write-Host "`nAnchor:" -ForegroundColor Yellow
& "$rustPath\anchor.exe" --version

Write-Host "`n✓ Instalación completada!" -ForegroundColor Green
Write-Host "`nNOTA: Cierra y vuelve a abrir el terminal para que los cambios al PATH tengan efecto." -ForegroundColor Yellow
Write-Host "Luego puedes ejecutar: solana-keygen new" -ForegroundColor Gray
