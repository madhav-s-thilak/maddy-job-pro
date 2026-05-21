from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routes import jobs, applications, resume
from app.routes import intelligence, ats, gaps, compiler, portfolio, extension

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Job Tracking and Resume Optimization System"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check — registered first so it resolves before any heavier middleware.
# Responds to both GET and HEAD (FastAPI auto-handles HEAD for GET routes).
# Safe for UptimeRobot and Render's health-check pings.
@app.get("/health", tags=["health"])
@app.head("/health", tags=["health"])
async def health():
    return JSONResponse(content={"status": "ok"})

@app.get("/", tags=["health"])
async def root():
    return JSONResponse(content={
        "message": "Maddy Job Pro API",
        "version": settings.VERSION,
        "status": "ok",
        "docs": "/docs"
    })

# Domain routers
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(resume.router)
app.include_router(intelligence.router)
app.include_router(ats.router)
app.include_router(gaps.router)
app.include_router(compiler.router)
app.include_router(portfolio.router)
app.include_router(extension.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
