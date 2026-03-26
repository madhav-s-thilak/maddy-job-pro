#!/bin/bash

echo "🚀 Job Tracker Pro - Quick Start Script"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Python and Node.js are installed"
echo ""

# Backend setup
echo "🔧 Setting up backend..."
cd job-tracker-backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your credentials before starting the backend!"
fi

cd ..

# Frontend setup
echo ""
echo "🎨 Setting up frontend..."
cd job-tracker-frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install > /dev/null 2>&1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend .env file with your credentials"
echo "2. Edit frontend .env file with backend URL"
echo ""
echo "To start the application:"
echo "Backend:  cd job-tracker-backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "Frontend: cd job-tracker-frontend && npm start"
echo ""
echo "Or use the helper scripts:"
echo "./start-backend.sh"
echo "./start-frontend.sh"
echo ""
echo "Happy job tracking! 🎯"
