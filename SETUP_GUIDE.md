# 🚀 Job Tracker Pro - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Google Sheets Setup](#google-sheets-setup)
3. [Groq API Setup](#groq-api-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Deployment](#deployment)
7. [Usage Guide](#usage-guide)

---

## Prerequisites

Before you begin, ensure you have:
- Google Account
- Groq API Account (free)
- Git installed
- Python 3.11+ installed
- Node.js 16+ and npm installed
- GitHub account (for deployment)

---

## Google Sheets Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it: "Job Tracker Pro"

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click **Enable**
4. Also enable "Google Drive API"

### Step 3: Create Service Account Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in details:
   - Name: `job-tracker-service`
   - Description: "Service account for Job Tracker Pro"
4. Click **Create and Continue**
5. Skip granting roles (click **Continue**)
6. Click **Done**

### Step 4: Generate JSON Key

1. Find your newly created service account in the credentials list
2. Click on it to open details
3. Go to the **Keys** tab
4. Click **Add Key** > **Create New Key**
5. Select **JSON** format
6. Click **Create**
7. A JSON file will download - **KEEP THIS SAFE!**

### Step 5: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: "Job Tracker Database"
4. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
5. **Important**: Share the spreadsheet with the service account email:
   - Click **Share** button
   - Paste the service account email from the JSON file
   - Email looks like: `job-tracker-service@your-project.iam.gserviceaccount.com`
   - Give **Editor** permissions

The backend will automatically create the "Jobs" worksheet with proper headers on first run.

---

## Groq API Setup

### Step 1: Create Groq Account

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Verify your email

### Step 2: Generate API Key

1. Go to **API Keys** section
2. Click **Create API Key**
3. Name it: "Job Tracker Pro"
4. Copy the API key - **SAVE IT SECURELY!**

**Note**: Groq offers free tier with generous limits - perfect for this project!

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd job-tracker-backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file:
   ```bash
   # Groq API Key
   GROQ_API_KEY=your_groq_api_key_here

   # Google Sheets - paste entire JSON content as single line
   GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'

   # Spreadsheet ID from URL
   SPREADSHEET_ID=your_spreadsheet_id_here
   ```

**Important**: The `GOOGLE_SHEETS_CREDENTIALS` should be the **entire contents** of your downloaded JSON file as a **single line string**.

### Step 5: Test Backend Locally

```bash
# Run the server
uvicorn app.main:app --reload

# Server will start at http://localhost:8000
# Visit http://localhost:8000/docs for API documentation
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd job-tracker-frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:
   ```bash
   # For local development
   REACT_APP_API_URL=http://localhost:8000
   ```

### Step 4: Run Frontend Locally

```bash
npm start

# App will open at http://localhost:3000
```

---

## Deployment

### Backend Deployment (Render)

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New** > **Web Service**
   - Connect your GitHub repository
   - Configure:
     - Name: `job-tracker-backend`
     - Environment: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
3. **Add Environment Variables in Render**
   - Go to **Environment** tab
   - Add:
     - `GROQ_API_KEY`
     - `GOOGLE_SHEETS_CREDENTIALS` (entire JSON as single line)
     - `SPREADSHEET_ID`

4. **Deploy!**
   - Click **Create Web Service**
   - Wait for deployment (2-3 minutes)
   - Copy your backend URL: `https://your-app.onrender.com`

**Note**: Free tier may spin down after inactivity. First request after inactivity takes ~30 seconds.

### Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **Add New** > **Project**
   - Import your GitHub repository
   - Configure:
     - Framework Preset: `Create React App`
     - Root Directory: `job-tracker-frontend`
   
2. **Add Environment Variable**
   - In Vercel project settings, go to **Environment Variables**
   - Add:
     - Key: `REACT_APP_API_URL`
     - Value: `https://your-backend.onrender.com` (your Render URL)
   
3. **Deploy!**
   - Click **Deploy**
   - Your app will be live at: `https://your-app.vercel.app`

---

## Usage Guide

### For Users (Madhav & Veena)

1. **Switch User**
   - Use the toggle at the top to switch between Madhav and Veena

2. **Add Jobs**
   - Click **"Look for New Jobs"**
   - Paste job URL (LinkedIn, Indeed, etc.)
   - Click **"Extract Job Details"**
   - System will automatically parse and save the job

3. **Manage Jobs**
   - View all jobs in card layout
   - Filter by status or search
   - Click status dropdown to update
   - Add notes to each job
   - Mark as applied when you apply

4. **Optimize Resume**
   - Click **"Optimize Resume"** on any job card
   - Paste your current resume (LaTeX format)
   - AI will generate optimized version
   - Compare side-by-side
   - Copy or download optimized version

5. **View Analytics**
   - Click **"Analytics"** to see:
     - Total jobs tracked
     - Application rate
     - Interview conversion rate
     - Status distribution
     - Insights and recommendations

### Features

✅ **Multi-user support** (Madhav & Veena)
✅ **Automatic job extraction** from URLs
✅ **AI-powered resume optimization**
✅ **Custom notes** for each job
✅ **Status tracking** (Not Applied → Applied → Interview → Offer/Rejected)
✅ **Analytics dashboard** with insights
✅ **Search and filter** capabilities
✅ **Mobile-responsive** design

---

## Troubleshooting

### Backend Issues

**Problem**: `gspread.exceptions.APIError: 403 Forbidden`
- **Solution**: Make sure you shared the Google Sheet with the service account email

**Problem**: `Invalid credentials`
- **Solution**: Check that `GOOGLE_SHEETS_CREDENTIALS` is properly formatted as a single-line JSON string

**Problem**: `Groq API error`
- **Solution**: Verify your `GROQ_API_KEY` is correct and has not expired

### Frontend Issues

**Problem**: Cannot connect to backend
- **Solution**: Check that `REACT_APP_API_URL` in `.env` matches your backend URL

**Problem**: CORS errors
- **Solution**: Backend CORS is configured to allow all origins. If issues persist, check browser console

---

## Google Sheet Structure

The system automatically creates this structure:

| Column | Description |
|--------|-------------|
| Row ID | Auto-generated ID |
| User | Madhav or Veena |
| Company | Company name |
| Role | Job title |
| Job Description | Full JD text |
| JD Link | URL to job posting |
| Location | Job location |
| Salary | Salary range |
| Status | Not Applied/Applied/Interview/Offer/Rejected/Withdrawn |
| Date Applied | Date when marked as applied |
| Resume Version | Version of resume used |
| Notes | Custom notes (editable) |
| Created At | Timestamp |
| Updated At | Timestamp |

---

## Cost Breakdown

- **Google Sheets**: Free
- **Groq API**: Free tier (includes 14,400 requests/day with Llama 3.1 70B)
- **Render (Backend)**: Free tier (512 MB RAM, spins down after inactivity)
- **Vercel (Frontend)**: Free tier (100 GB bandwidth/month)

**Total Cost**: $0/month 🎉

---

## Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Check browser console (F12) for frontend errors
4. Check Render logs for backend errors

---

## Next Steps

1. ✅ Complete all setup steps above
2. ✅ Test locally before deploying
3. ✅ Deploy backend to Render
4. ✅ Deploy frontend to Vercel
5. ✅ Start tracking jobs!

**Enjoy your AI-powered job tracking system! 🚀**
