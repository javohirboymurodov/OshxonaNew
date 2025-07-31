@echo off
REM Oshxonabot - Windows Setup Script
REM Bu script Windows muhitida loyihani setup qiladi

echo 🚀 Oshxonabot Setup Script (Windows)
echo ==================================

REM Check Node.js
echo 📋 Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node -v
)

REM Check npm
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
) else (
    echo ✅ npm is available
    npm -v
)

echo.
echo 📦 Installing dependencies...

REM Main project
echo 🔧 Installing main project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install main project dependencies
    pause
    exit /b 1
) else (
    echo ✅ Main project dependencies installed
)

REM Admin panel
echo 🔧 Installing admin panel dependencies...
cd oshxona-admin
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install admin panel dependencies
    cd ..
    pause
    exit /b 1
) else (
    echo ✅ Admin panel dependencies installed
)
cd ..

REM User frontend
echo 🔧 Installing user frontend dependencies...
cd user-frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install user frontend dependencies
    cd ..
    pause
    exit /b 1
) else (
    echo ✅ User frontend dependencies installed
)
cd ..

echo.
echo ⚙️ Environment Setup...

REM Check .env file
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy ".env.example" ".env" >nul
    echo ✅ .env file created. Please update it with your credentials.
) else (
    echo ✅ .env file already exists
)

echo.
echo 🎉 Setup Complete!
echo =================
echo.
echo 📚 Next Steps:
echo 1. Update .env file with your credentials
echo 2. Start MongoDB service
echo 3. Run development servers:
echo.
echo    npm run dev:full    # All servers
echo    npm run dev         # Bot server only
echo    npm run api         # API server only
echo    npm run admin:dev   # Admin panel only
echo    npm run user:dev    # User frontend only
echo.
echo 🌐 Access URLs:
echo    Bot Server:     http://localhost:5000
echo    API Server:     http://localhost:5001
echo    Admin Panel:    http://localhost:3000
echo    User Frontend:  http://localhost:3001
echo.
echo 📖 Documentation: README.md
echo 🐛 Issues: Create issue on GitHub
echo.
echo Happy coding! 🚀

pause
