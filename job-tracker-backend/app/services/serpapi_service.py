import traceback
from serpapi import GoogleSearch
from app.config import settings

class SerpApiService:
    def __init__(self):
        self.api_key = settings.SERPAPI_KEY

    def search_jobs(self, query: str, location: str = "Remote") -> list:
        if not self.api_key:
            raise ValueError("SERPAPI_KEY is not configured.")

        # Build query. Example: "Software Engineer New York"
        search_query = f"{query} {location}".strip()
        
        params = {
            "engine": "google_jobs",
            "q": search_query,
            "hl": "en",
            "api_key": self.api_key
        }

        try:
            search = GoogleSearch(params)
            results = search.get_dict()
            
            # The jobs exist under the "jobs_results" key
            jobs_results = results.get("jobs_results", [])
            formatted_jobs = []

            for job in jobs_results:
                # Extract basic properties, safely falling back if missing
                title = job.get("title", "")
                company_name = job.get("company_name", "")
                location_val = job.get("location", "")
                description = job.get("description", "")
                
                # Check detected extensions for salary info if available
                extensions = job.get("detected_extensions", {})
                salary = extensions.get("salary", "") if isinstance(extensions, dict) else ""
                
                # Find the direct apply link or share link
                link = job.get("share_link", "")
                # Sometimes better links are inside "apply_options"
                apply_options = job.get("apply_options", [])
                if apply_options and isinstance(apply_options, list):
                    link = apply_options[0].get("link", link)
                
                formatted_jobs.append({
                    "company": company_name,
                    "role": title,
                    "location": location_val,
                    "salary": salary,
                    "job_description": description,
                    "jd_link": link,
                    "extracted_successfully": True
                })

            return formatted_jobs
        except Exception as e:
            print(f"Error querying SerpAPI: {traceback.format_exc()}")
            raise Exception(f"Failed to fetch jobs from SerpAPI: {str(e)}")

serpapi_service = SerpApiService()
