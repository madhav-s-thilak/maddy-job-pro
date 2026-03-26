import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS: str = os.getenv("GOOGLE_SHEETS_CREDENTIALS", "")
    SPREADSHEET_ID: str = os.getenv("SPREADSHEET_ID", "")
    SERPAPI_KEY: str = os.getenv("SERPAPI_KEY", "")
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://*.netlify.app"
    ]
    
    # App Settings
    APP_NAME: str = "Job Tracker Pro"
    VERSION: str = "1.0.0"

settings = Settings()
