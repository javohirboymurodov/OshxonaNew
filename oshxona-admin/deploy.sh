#!/bin/bash

echo "🚀 Oshxona Project Deployment Script"
echo "====================================="

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Git working directory is not clean. Please commit or stash changes first."
    exit 1
fi

# Build admin panel
echo "📦 Building Admin Panel..."
cd oshxona-admin
npm run build
cd ..

# Build user webapp
echo "📱 Building User WebApp..."
cd apps/user-webapp
npm run build
cd ../..

# Check if builds were successful
if [ ! -d "oshxona-admin/dist" ] || [ ! -d "apps/user-webapp/dist" ]; then
    echo "❌ Build failed. Please check for errors."
    exit 1
fi

echo "✅ Builds completed successfully!"

# Deploy to Render (Backend)
echo "🌐 Deploying Backend to Render..."
echo "   - Backend code is in 'oshxona-backend/' directory"
echo "   - Push to main branch to trigger Render deployment"
echo "   - Make sure environment variables are set in Render dashboard"

# Deploy to Vercel (Frontend)
echo "🎨 Deploying Frontend to Vercel..."
echo "   - Run: vercel --prod"
echo "   - Or push to main branch if connected to GitHub"

echo ""
echo "📋 Deployment Checklist:"
echo "1. ✅ Backend code moved to oshxona-backend/"
echo "2. ✅ Admin panel built"
echo "3. ✅ User webapp built"
echo "4. 🔄 Push to GitHub (triggers Render)"
echo "5. 🔄 Deploy to Vercel"
echo "6. 🔄 Update environment variables"
echo "7. 🔄 Test webhook and bot functionality"

echo ""
echo "🎯 Next steps:"
echo "- Push code to GitHub"
echo "- Deploy frontend to Vercel"
echo "- Update bot webhook URL"
echo "- Test all functionality"

echo ""
echo "📁 Directory Structure:"
echo "- oshxona-backend/     → Render.com (Backend + Bot)"
echo "- oshxona-admin/       → Vercel (Admin Panel)"
echo "- apps/user-webapp/    → Vercel (User WebApp)"
