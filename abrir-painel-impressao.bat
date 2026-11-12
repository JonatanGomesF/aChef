@echo off
setlocal

:: ============================================================
:: SABOR DA PRAIA DELIVERY — Painel de Impressao Automatica
:: Abre diretamente a tela de pedidos (/admin/pedidos) no Chrome
:: com impressao silenciosa ativada (--kiosk-printing)
:: ============================================================

set "APP_URL=https://sabordapraia.vercel.app/admin/pedidos"

:: 1. Procurar executavel do Google Chrome
set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME_EXE%" (
  set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if not exist "%CHROME_EXE%" (
  set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

:: 2. Se Chrome nao for encontrado, tenta abrir no navegador padrao
if not exist "%CHROME_EXE%" (
  echo Google Chrome nao encontrado nos diretorios padroes.
  echo Abrindo Painel de Pedidos do Sabor da Praia no navegador padrao...
  start "" "%APP_URL%"
  exit /b 0
)

:: 3. Iniciar Chrome com perfil dedicado e impressao automatica ativada
echo Iniciando Painel de Impressao - Sabor da Praia Delivery...
echo URL: %APP_URL%
start "" "%CHROME_EXE%" --kiosk-printing --user-data-dir="%LOCALAPPDATA%\sabordapraia-kiosk-printing" "%APP_URL%"

