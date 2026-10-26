@echo off
setlocal enabledelayedexpansion
title Mababanaba Waters - Local Development Server
echo ===================================================
echo   Mababanaba Waters System - Local Dev Server
echo ===================================================
echo.

:: 1. Detect PHP executable (prefers XAMPP PHP with PDO MySQL enabled)
set PHP_BIN=php
if exist "C:\xampp\php\php.exe" (
    set PHP_BIN=C:\xampp\php\php.exe
)

:: 2. Detect MySQL client & daemon
set MYSQL_BIN=mysql
if exist "C:\xampp\mysql\bin\mysql.exe" (
    set MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
)

:: 3. Check MySQL / MariaDB service
echo [*] Checking database service on 127.0.0.1:3306...
netstat -ano | findstr 3306 >nul
if errorlevel 1 (
    echo [!] MySQL is not running on port 3306.
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        echo [*] Starting local XAMPP MySQL daemon...
        start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 >nul
    ) else (
        echo [!] Please start MySQL in XAMPP Control Panel.
    )
) else (
    echo [+] Database service is active on port 3306.
)

:: 4. Database Check & Automatic Import Integration
set FORCE_IMPORT=0
if "%1"=="--import" set FORCE_IMPORT=1
if "%1"=="-i" set FORCE_IMPORT=1
if "%1"=="--reset" set FORCE_IMPORT=1

set DB_EXISTS=0
"%MYSQL_BIN%" -u root -e "USE xgbcwzyu_mababanaba_water_db; SHOW TABLES;" >nul 2>&1
if not errorlevel 1 (
    set DB_EXISTS=1
)

if %FORCE_IMPORT%==1 (
    echo [*] Force import requested. Importing database\backup_local_data.sql...
    if exist "database\backup_local_data.sql" (
        "%MYSQL_BIN%" -u root < database\backup_local_data.sql
        if not errorlevel 1 (
            echo [+] Database re-imported successfully! Fresh demo state restored.
        ) else (
            echo [!] Failed to import database. Please verify MySQL service.
        )
    ) else (
        echo [!] Dump file database\backup_local_data.sql not found.
    )
) else if %DB_EXISTS%==0 (
    echo [!] Database 'xgbcwzyu_mababanaba_water_db' not detected.
    echo [*] Automatically importing initial database snapshot (database\backup_local_data.sql)...
    if exist "database\backup_local_data.sql" (
        "%MYSQL_BIN%" -u root < database\backup_local_data.sql
        if not errorlevel 1 (
            echo [+] Database imported and initialized successfully!
        ) else (
            echo [!] Failed to import database automatically.
        )
    ) else (
        echo [!] Dump file database\backup_local_data.sql not found.
    )
) else (
    echo [+] Database 'xgbcwzyu_mababanaba_water_db' is ready.
    echo     (Hint: To reset to clean demo data anytime, run: start-local.bat --import)
)

echo.

:: 5. Launch browser
echo [*] Opening http://localhost:8000 in your browser...
start "" "http://localhost:8000"

:: 6. Start PHP built-in server with local router
echo [*] Starting server on http://localhost:8000 using %PHP_BIN% ...
echo [*] Press Ctrl+C in this terminal window to stop the server.
echo.
"%PHP_BIN%" -S localhost:8000 local_router.php
