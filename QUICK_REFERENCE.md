# ⚡ Quick Reference Guide

One-page reference for common tasks and commands.

---

## 🚀 Starting the Application

### Local Development

```bash
# Backend (Terminal 1)
cd job-tracker-backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload

# Frontend (Terminal 2)
cd job-tracker-frontend
npm start
```

**Or use helper scripts:**
```bash
./start-backend.sh
./start-frontend.sh
```

### URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🔑 Environment Variables

### Backend (.env)
```bash
GROQ_API_KEY=gsk_...
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
SPREADSHEET_ID=1abc...
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8000
# Production: https://your-backend.onrender.com
```

---

## 📦 Installation Commands

### Backend
```bash
cd job-tracker-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd job-tracker-frontend
npm install
```

---

## 🔧 Useful Commands

### Backend

```bash
# Activate virtual environment
source venv/bin/activate

# Install new package
pip install package-name
pip freeze > requirements.txt

# Run tests (if you add them)
pytest

# Check Python version
python --version

# Deactivate virtual environment
deactivate
```

### Frontend

```bash
# Install new package
npm install package-name

# Build for production
npm run build

# Run tests
npm test

# Check for outdated packages
npm outdated

# Update packages
npm update
```

---

## 🌐 API Endpoints

### Jobs
```bash
GET    /jobs/                    # Get all jobs
POST   /jobs/                    # Create job
PUT    /jobs/{row_id}           # Update job
DELETE /jobs/{row_id}           # Delete job
POST   /jobs/extract            # Extract from URL
GET    /jobs/analytics          # Get analytics
```

### Applications
```bash
POST   /applications/mark-applied    # Mark as applied
PUT    /applications/notes           # Update notes
```

### Resume
```bash
POST   /resume/optimize         # Optimize resume
```

### Health
```bash
GET    /                        # API info
GET    /health                  # Health check
```

---

## 🐛 Debugging

### View Logs

**Backend (Render):**
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab

**Frontend (Vercel):**
1. Go to Vercel dashboard
2. Click your project
3. Click "Deployments" → Select deployment → "View Logs"

**Local:**
```bash
# Backend logs appear in terminal
# Frontend logs appear in browser console (F12)
```

### Common Issues

```bash
# Backend: Module not found
pip install -r requirements.txt

# Frontend: Module not found
npm install

# Backend: Port already in use
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Frontend: Port already in use
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Clear npm cache
npm cache clean --force

# Reset git changes
git reset --hard HEAD
```

---

## 📝 Git Commands

```bash
# Initialize repo
git init
git add .
git commit -m "Initial commit"

# Connect to GitHub
git remote add origin <your-repo-url>
git push -u origin main

# Update deployment
git add .
git commit -m "Update message"
git push

# Check status
git status

# View changes
git diff

# Create branch
git checkout -b feature-name

# Switch branch
git checkout main

# Pull latest changes
git pull
```

---

## 🔍 Testing Endpoints

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Get jobs
curl http://localhost:8000/jobs/

# Create job
curl -X POST http://localhost:8000/jobs/ \
  -H "Content-Type: application/json" \
  -d '{"user":"Madhav","company":"Google","role":"SWE","status":"Not Applied"}'
```

### Using Browser
- GET endpoints: Just paste URL in browser
- POST endpoints: Use Postman or API docs at /docs

---

## 📊 Google Sheets

### Structure
```
Row ID | User | Company | Role | Description | Link | Location | Salary | Status | Date Applied | Resume Version | Notes | Created | Updated
```

### Access
- URL: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID
- Share with service account email (Editor permissions)

### Manual Edits
- You can edit directly in Google Sheets
- Changes sync to app on next refresh
- Be careful not to change column headers!

---

## 🚀 Deployment Commands

### Render (Backend)

```bash
# Render deploys automatically on git push
# Force redeploy:
# 1. Go to Render dashboard
# 2. Click "Manual Deploy" → "Deploy latest commit"
```

### Vercel (Frontend)

```bash
# Vercel deploys automatically on git push
# Or use Vercel CLI:
npm install -g vercel
vercel login
vercel

# Force redeploy:
vercel --prod
```

---

## 🔐 Security Checklist

```bash
# Never commit these files:
.env
*.json (credentials)
venv/
node_modules/

# Check .gitignore includes:
cat .gitignore

# Remove file from git history if committed:
git rm --cached filename
git commit -m "Remove sensitive file"
git push
```

---

## 📈 Performance Tips

### Backend
- Use async functions for I/O operations
- Cache frequently accessed data
- Add indexes to database (if migrating from Sheets)
- Monitor Render logs for slow queries

### Frontend
- Lazy load components
- Implement pagination for large job lists
- Use React.memo for expensive components
- Optimize images before upload

---

## 🎯 Keyboard Shortcuts

### VS Code (Development)
```
Cmd/Ctrl + P        # Quick file open
Cmd/Ctrl + Shift + F # Search in files
Cmd/Ctrl + `        # Toggle terminal
Cmd/Ctrl + B        # Toggle sidebar
Cmd/Ctrl + /        # Toggle comment
```

### Browser (Testing)
```
F12                 # Open DevTools
Cmd/Ctrl + R        # Refresh page
Cmd/Ctrl + Shift + R # Hard refresh
Cmd/Ctrl + Shift + C # Inspect element
```

---

## 📞 Quick Links

- **Backend (Local)**: http://localhost:8000
- **Frontend (Local)**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Google Cloud**: https://console.cloud.google.com
- **Groq Console**: https://console.groq.com
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 🆘 Emergency Fixes

### "Everything is broken!"
```bash
# Start fresh
cd job-tracker-backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../job-tracker-frontend
rm -rf node_modules package-lock.json
npm install
```

### "Backend won't start!"
```bash
# Check Python version
python --version  # Should be 3.11+

# Check if port is free
lsof -i:8000

# Check environment variables
cat job-tracker-backend/.env
```

### "Frontend won't start!"
```bash
# Check Node version
node --version  # Should be 16+

# Check if port is free
lsof -i:3000

# Clear cache
npm cache clean --force
```

---

## 💡 Pro Tips

1. **Keep logs open** while developing
2. **Use API docs** (/docs) for testing endpoints
3. **Check Google Sheets** to verify data updates
4. **Save .env files** securely (password manager)
5. **Git commit often** with descriptive messages
6. **Test locally** before deploying
7. **Monitor free tier limits** on dashboards
8. **Use browser DevTools** for frontend debugging
9. **Read error messages** carefully - they're usually helpful!
10. **Keep this reference handy** for quick lookups

---

**Print this page and keep it at your desk! 📋**
