import httpx
from bs4 import BeautifulSoup
from app.services.groq_service import groq_service
from typing import Dict

class JobExtractor:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    async def extract_from_url(self, url: str) -> Dict:
        """
        Extract job details from a URL using web scraping + AI
        """
        try:
            # Fetch the page
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers, follow_redirects=True)
                response.raise_for_status()
            
            html_content = response.text
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text(separator='\n', strip=True)
            
            # Use AI to extract structured data
            extracted_data = groq_service.extract_job_details(text)
            
            return {
                "company": extracted_data.get("company", ""),
                "role": extracted_data.get("role", ""),
                "location": extracted_data.get("location", ""),
                "salary": extracted_data.get("salary", ""),
                "job_description": extracted_data.get("job_description", ""),
                "extracted_successfully": True
            }
            
        except httpx.HTTPError as e:
            print(f"HTTP error extracting job from {url}: {e}")
            return {
                "company": "",
                "role": "",
                "location": "",
                "salary": "",
                "job_description": "",
                "extracted_successfully": False,
                "error": str(e)
            }
        except Exception as e:
            print(f"Error extracting job from {url}: {e}")
            return {
                "company": "",
                "role": "",
                "location": "",
                "salary": "",
                "job_description": "",
                "extracted_successfully": False,
                "error": str(e)
            }

job_extractor = JobExtractor()
