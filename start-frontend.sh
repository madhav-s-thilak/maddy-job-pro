#!/bin/bash

echo "🎨 Starting Job Tracker Frontend..."

cd job-tracker-frontend

if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Run ./start.sh first!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

echo "✅ Starting React development server..."
npm start
