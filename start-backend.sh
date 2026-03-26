#!/bin/bash

echo "🚀 Starting Job Tracker Backend..."

cd job-tracker-backend

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./start.sh first!"
    exit 1
fi

source venv/bin/activate

if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

echo "✅ Starting FastAPI server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
