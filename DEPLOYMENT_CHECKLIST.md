# 🚀 Deployment Checklist

Use this checklist to ensure smooth deployment of Job Tracker Pro.

## ✅ Pre-Deployment

### Google Cloud Setup
- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Enable Google Drive API
- [ ] Create Service Account
- [ ] Download JSON credentials
- [ ] Save credentials securely

### Google Sheets Setup
- [ ] Create new Google Sheet
- [ ] Copy Spreadsheet ID from URL
- [ ] Share sheet with service account email (Editor permissions)
- [ ] Verify service account has access

### API Keys
- [ ] Sign up for Groq account
- [ ] Generate Groq API key
- [ ] Save API key securely
- [ ] Test API key works

### GitHub Setup
- [ ] Create GitHub repository
- [ ] Add .gitignore file
- [ ] Do NOT commit .env files
- [ ] Push code to GitHub

---

## 🔧 Backend Deployment (Render)

### Render Account Setup
- [ ] Create Render account
- [ ] Verify email address
- [ ] Connect GitHub account

### Create Web Service
- [ ] Click "New" → "Web Service"
- [ ] Select your repository
- [ ] Choose: `job-tracker-backend` directory
- [ ] Configure build settings:
  - [ ] Name: `job-tracker-backend`
  - [ ] Environment: Python 3
  - [ ] Region: Choose closest to you
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables
Add these in Render dashboard under "Environment":

- [ ] `GROQ_API_KEY` = your_groq_api_key
- [ ] `GOOGLE_SHEETS_CREDENTIALS` = entire JSON content as single line
- [ ] `SPREADSHEET_ID` = your_spreadsheet_id

**Important**: When pasting JSON credentials:
1. Open JSON file
2. Copy ENTIRE contents
3. Remove all line breaks (make it single line)
4. Paste into Render environment variable

### Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (2-5 minutes)
- [ ] Check logs for errors
- [ ] Test health endpoint: `https://your-app.onrender.com/health`
- [ ] Copy backend URL for frontend

---

## 🎨 Frontend Deployment (Vercel)

### Vercel Account Setup
- [ ] Create Vercel account
- [ ] Connect GitHub account
- [ ] Verify email

### Import Project
- [ ] Click "Add New" → "Project"
- [ ] Import your GitHub repository
- [ ] Select repository

### Configure Project
- [ ] Framework Preset: Create React App
- [ ] Root Directory: `job-tracker-frontend`
- [ ] Build Command: (leave default)
- [ ] Output Directory: (leave default)

### Environment Variables
Add in Vercel project settings:

- [ ] `REACT_APP_API_URL` = your Render backend URL
  - Example: `https://job-tracker-backend.onrender.com`
  - NO trailing slash!

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for deployment (1-2 minutes)
- [ ] Visit your app URL
- [ ] Test all features

---

## 🧪 Post-Deployment Testing

### Backend Tests
- [ ] Visit: `https://your-backend.onrender.com/`
  - Should see: `{"message": "Job Tracker Pro API", ...}`
- [ ] Visit: `https://your-backend.onrender.com/health`
  - Should see: `{"status": "healthy"}`
- [ ] Visit: `https://your-backend.onrender.com/docs`
  - Should see API documentation

### Frontend Tests
- [ ] App loads without errors
- [ ] Can switch between Madhav/Veena
- [ ] "Look for New Jobs" button works
- [ ] Can paste job URL and extract details
- [ ] Jobs display in cards
- [ ] Can add notes to jobs
- [ ] Can mark jobs as applied
- [ ] Resume optimizer opens
- [ ] Analytics dashboard displays
- [ ] Filters work correctly

### Integration Tests
- [ ] Add a job via URL extraction
- [ ] Verify job appears in Google Sheet
- [ ] Update job status
- [ ] Verify update in Google Sheet
- [ ] Add notes to job
- [ ] Verify notes saved in Google Sheet
- [ ] Test resume optimizer with sample resume

---

## 🔍 Troubleshooting

### If Backend Fails to Deploy

**Check Logs**:
1. Go to Render dashboard
2. Click on your service
3. Click "Logs" tab
4. Look for error messages

**Common Issues**:
- ❌ JSON credentials format → Make sure single line, no extra quotes
- ❌ Missing environment variables → Check all 3 are set
- ❌ Import errors → Check requirements.txt includes all packages
- ❌ Port binding → Use `$PORT` variable in start command

### If Frontend Fails to Connect

**Check**:
- [ ] `REACT_APP_API_URL` is correct
- [ ] Backend URL has no trailing slash
- [ ] Backend is actually running (check Render)
- [ ] No CORS errors in browser console (F12)

**Fix CORS Issues**:
1. Backend should allow all origins (already configured)
2. Check browser console for specific error
3. Verify API URL is exactly correct

### If Google Sheets Not Working

**Check**:
- [ ] Service account has Editor access to sheet
- [ ] Spreadsheet ID is correct
- [ ] JSON credentials are valid
- [ ] APIs are enabled in Google Cloud

**Test**:
1. Try making request to `/jobs/` endpoint
2. Check backend logs for specific error
3. Verify service account email in Google Cloud

---

## 📊 Success Metrics

After deployment, you should see:

✅ **Backend**:
- Render shows "Live" status
- Health endpoint returns 200
- No errors in logs

✅ **Frontend**:
- Vercel shows "Ready" status
- App loads in browser
- No console errors

✅ **Integration**:
- Jobs save to Google Sheets
- Updates sync correctly
- Resume optimizer works

---

## 🎉 You're Done!

Congratulations! Your Job Tracker Pro is now live and ready to use.

### Next Steps:
1. Bookmark your app URL
2. Add it to your phone home screen
3. Start tracking jobs!
4. Share with friends (optional)

### Share Your Experience:
- ⭐ Star the repository
- 📝 Provide feedback
- 🐛 Report any bugs

---

## 🆘 Need Help?

1. Review error messages carefully
2. Check this checklist again
3. Consult SETUP_GUIDE.md
4. Check GitHub issues
5. Create new issue with details

**Happy Job Hunting! 🚀**
