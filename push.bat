@echo off
REM Script para fazer Push no GitHub automaticamente

echo.
echo ========================================
echo Bubble Labs - Git Push Automatico
echo ========================================
echo.

echo [1/5] Configurando Git...
git config --global user.email "renato@ubbelabs.app"
git config --global user.name "Renato"

echo [2/5] Limpando repositorio antigo...
rmdir /s /q .git
timeout /t 1 /nobreak

echo [3/5] Inicializando novo repositorio...
git init
git add .
git commit -m "Initial commit"
git branch -M main

echo [4/5] Conectando ao GitHub...
git remote add origin https://github.com/renatobubble/bubble-labs-backend

echo [5/5] Enviando para GitHub...
echo.
echo Digite seu Personal Access Token quando pedir!
echo.
git push -u origin main

echo.
echo ========================================
echo SUCESSO!
echo ========================================
echo.
pause