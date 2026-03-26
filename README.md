# 🎯 Job Tracker Pro

**AI-Powered Job Application Management System**

A production-quality, full-stack application for tracking job applications with AI-powered resume optimization, built for Madhav and Veena.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## ✨ Features

### 🔥 Core Features
- **Multi-User Support**: Separate tracking for Madhav and Veena
- **Automatic Job Extraction**: Paste any job URL and AI extracts all details
- **AI Resume Optimization**: Groq-powered resume optimization tailored to each job
- **Smart Status Tracking**: Track from discovery to offer/rejection
- **Rich Notes**: Add custom notes, deadlines, referral info per job
- **Analytics Dashboard**: Visual insights into your job search progress

### 🤖 AI-Powered
- **Groq API Integration**: Lightning-fast LLM inference
- **Resume Optimization**: Tailors your resume to each job description
- **Job Data Extraction**: Automatically parses job postings from any URL
- **Smart Insights**: AI-generated recommendations based on your data

### 📊 Analytics
- Application rate tracking
- Interview conversion metrics
- Status distribution charts
- Success rate analysis
- Actionable insights

---

## 🏗️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Google Sheets**: Database (free, no setup required)
- **Groq API**: AI-powered resume optimization
- **BeautifulSoup**: Web scraping for job extraction

### Frontend
- **React**: Modern UI library
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization
- **Axios**: HTTP client

### Deployment
- **Render**: Backend hosting (free tier)
- **Vercel**: Frontend hosting (free tier)
- **Total Cost**: $0/month

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- Google Account
- Groq API Account (free)

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd job-tracker
```

### 2. Backend Setup
```bash
cd job-tracker-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd job-tracker-frontend
npm install
cp .env.example .env
# Edit .env with backend URL
npm start
```

### 📖 Full Documentation
See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions including:
- Google Sheets API setup
- Groq API configuration
- Deployment to Render & Vercel
- Troubleshooting

---

## 📸 Screenshots

### Dashboard
Clean, modern interface for managing all your job applications

### Job Cards
Detailed job information with quick actions

### Resume Optimizer
AI-powered resume optimization with side-by-side comparison

### Analytics
Visual insights into your job search progress

---

## 🎯 Use Cases

### For Job Seekers
1. **Discovery**: Find and save interesting jobs
2. **Organization**: Track all applications in one place
3. **Optimization**: AI-tailored resumes for each application
4. **Insights**: Understand your job search metrics
5. **Notes**: Keep track of referrals, deadlines, and prep notes

### For Career Coaches
- Track client applications
- Monitor success rates
- Identify improvement areas
- Data-driven coaching

---

## 🔐 Security & Privacy

- ✅ No user authentication required (private deployment)
- ✅ Data stored in your own Google Sheet
- ✅ Environment variables for all secrets
- ✅ HTTPS encryption (Vercel/Render)
- ✅ No data sharing with third parties

---

## 📊 System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Vercel)      │
│   React + UI    │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│   Backend       │
│   (Render)      │
│   FastAPI       │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┐
    │          │          │
    ▼          ▼          ▼
┌───────┐  ┌──────┐  ┌────────┐
│Google │  │Groq  │  │Web     │
│Sheets │  │API   │  │Scraping│
└───────┘  └──────┘  └────────┘
```

---

## 🛣️ Roadmap

- [x] Core job tracking
- [x] AI resume optimization
- [x] Job URL extraction
- [x] Analytics dashboard
- [x] Multi-user support
- [ ] Email notifications
- [ ] Calendar integration
- [ ] Interview prep assistant
- [ ] Salary negotiation helper
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

This is a personal project for Madhav and Veena, but feel free to fork and customize for your own use!

---

## 📝 License

MIT License - feel free to use this project for your own job tracking!

---

## 🙏 Acknowledgments

- **Groq**: For providing free, fast LLM inference
- **Google Sheets**: For free database hosting
- **Render & Vercel**: For free deployment tiers
- **Open Source Community**: For amazing tools and libraries

---

## 📧 Contact

For questions or support, please create an issue in this repository.

---

**Built with ❤️ for effective job searching**
# maddy-job-pro
