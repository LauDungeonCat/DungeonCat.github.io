@echo off
:: Comprueba si se ha escrito un mensaje de commit
if "%~1"=="" (
    echo Error: Debes proporcionar un mensaje para el commit.
    echo Uso: push.bat "Tu mensaje de commit"
    pause
    exit /b
)

echo Entrando a la aplicacion...
cd rolgranada-app

echo Compilando la aplicacion (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo Error en la compilacion. El push ha sido cancelado.
    pause
    exit /b
)

echo Saliendo a la raiz y preparando git...
cd ..
git add .

echo Realizando commit con el mensaje: "%~1"...
git commit -m "%~1"

echo Subiendo cambios a GitHub (git push)...
git push

echo ¡Todo completado con exito!
pause