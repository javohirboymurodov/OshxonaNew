#!/bin/bash

# Oshxonabot - Complete Setup Script
# Bu script barcha dependency'larni o'rnatadi va loyihani ishga tushiradi

echo "🚀 Oshxonabot Setup Script"
echo "=========================="

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js version: $node_version"
else
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check npm version
npm_version=$(npm -v 2>/dev/null)
echo "✅ npm version: $npm_version"

echo ""
echo "📦 Installing dependencies..."

# Install main project dependencies
echo "🔧 Installing main project dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Main project dependencies installed"
else
    echo "❌ Failed to install main project dependencies"
    exit 1
fi

# Install admin panel dependencies
echo "🔧 Installing admin panel dependencies..."
cd oshxona-admin
npm install
if [ $? -eq 0 ]; then
    echo "✅ Admin panel dependencies installed"
else
    echo "❌ Failed to install admin panel dependencies"
    exit 1
fi

# Back to root
cd ..

# Install user frontend dependencies
echo "🔧 Installing user frontend dependencies..."
cd user-frontend
npm install
if [ $? -eq 0 ]; then
    echo "✅ User frontend dependencies installed"
else
    echo "❌ Failed to install user frontend dependencies"
    exit 1
fi

# Back to root
cd ..

echo ""
echo "⚙️  Environment Setup..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your credentials."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
echo "📚 Next Steps:"
echo "1. Update .env file with your credentials"
echo "2. Start MongoDB service"
echo "3. Run development servers:"
echo ""
echo "   npm run dev:full    # All servers"
echo "   npm run dev         # Bot server only"
echo "   npm run api         # API server only"
echo "   npm run admin:dev   # Admin panel only"
echo "   npm run user:dev    # User frontend only"
echo ""
echo "🌐 Access URLs:"
echo "   Bot Server:     http://localhost:5000"
echo "   API Server:     http://localhost:5001"
echo "   Admin Panel:    http://localhost:3000"
echo "   User Frontend:  http://localhost:3001"
echo ""
echo "📖 Documentation: README.md"
echo "🐛 Issues: Create issue on GitHub"
echo ""
echo "Happy coding! 🚀"
