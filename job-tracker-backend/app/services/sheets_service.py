import gspread
from oauth2client.service_account import ServiceAccountCredentials
from typing import List, Dict, Optional
import json
from datetime import datetime
from app.config import settings
from app.models.schemas import Job, JobCreate, JobUpdate, StatusEnum

class SheetsService:
    def __init__(self):
        self.client = None
        self.spreadsheet = None
        self.worksheet = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Google Sheets"""
        try:
            # Parse credentials from environment
            creds_dict = json.loads(settings.GOOGLE_SHEETS_CREDENTIALS)
            
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
            self.client = gspread.authorize(creds)
            self.spreadsheet = self.client.open_by_key(settings.SPREADSHEET_ID)
            
            # Get or create main worksheet
            try:
                self.worksheet = self.spreadsheet.worksheet("Jobs")
            except gspread.WorksheetNotFound:
                self.worksheet = self.spreadsheet.add_worksheet(title="Jobs", rows="1000", cols="20")
                self._initialize_headers()
                
        except Exception as e:
            print(f"Error connecting to Google Sheets: {e}")
            raise
    
    def _initialize_headers(self):
        """Initialize spreadsheet headers"""
        headers = [
            "Row ID",
            "User",
            "Company",
            "Role",
            "Job Description",
            "JD Link",
            "Location",
            "Salary",
            "Status",
            "Date Applied",
            "Resume Version",
            "Notes",
            "Created At",
            "Updated At"
        ]
        self.worksheet.update('A1:N1', [headers])
    
    def _row_to_job(self, row: List, row_id: int) -> Job:
        """Convert sheet row to Job object"""
        return Job(
            row_id=row_id,
            user=row[1] if len(row) > 1 else "Madhav",
            company=row[2] if len(row) > 2 else "",
            role=row[3] if len(row) > 3 else "",
            job_description=row[4] if len(row) > 4 else "",
            jd_link=row[5] if len(row) > 5 else "",
            location=row[6] if len(row) > 6 else "",
            salary=row[7] if len(row) > 7 else "",
            status=row[8] if len(row) > 8 else StatusEnum.NOT_APPLIED,
            date_applied=row[9] if len(row) > 9 else "",
            resume_version=row[10] if len(row) > 10 else "",
            notes=row[11] if len(row) > 11 else ""
        )
    
    def get_all_jobs(self, user: Optional[str] = None) -> List[Job]:
        """Get all jobs, optionally filtered by user"""
        try:
            all_records = self.worksheet.get_all_values()
            if len(all_records) <= 1:  # Only headers
                return []
            
            jobs = []
            for idx, row in enumerate(all_records[1:], start=2):  # Skip header
                # Skip empty rows or rows perfectly blank (caused by tables/cleared rows)
                if not row or not any(str(cell).strip() for cell in row):
                    continue
                
                # Filter by user if specified
                if user and len(row) > 1 and row[1]:
                    if user.lower() != row[1].lower():
                        continue
                
                job = self._row_to_job(row, idx)
                jobs.append(job)
            
            return jobs
        except Exception as e:
            print(f"Error getting jobs: {e}")
            return []
    
    def create_job(self, job: JobCreate) -> Job:
        """Create a new job entry"""
        try:
            all_rows = self.worksheet.get_all_values()
            
            target_row = 2  # Default starting row
            found_empty = False
            
            # Search for the first completely empty row to reuse it or insert there
            for i, row in enumerate(all_rows):
                if i == 0:
                    continue  # Skip header
                if not row or not any(str(cell).strip() for cell in row):
                    target_row = i + 1
                    found_empty = True
                    break
            
            if not found_empty:
                target_row = len(all_rows) + 1
            
            timestamp = datetime.now().isoformat()
            
            row_data = [
                target_row - 1,  # Row ID
                job.user.value,
                job.company,
                job.role,
                job.job_description,
                job.jd_link,
                job.location,
                job.salary,
                job.status.value,
                job.date_applied or "",
                job.resume_version or "",
                job.notes or "",
                timestamp,  # Created at
                timestamp   # Updated at
            ]
            
            # Using update instead of append_row respects existing Tables in Google Sheets
            # and prevents jumping to the end of predefined table bounds
            cell_range = f'A{target_row}:N{target_row}'
            self.worksheet.update(cell_range, [row_data])
            
            return Job(
                row_id=target_row,
                user=job.user,
                company=job.company,
                role=job.role,
                job_description=job.job_description,
                jd_link=job.jd_link,
                location=job.location,
                salary=job.salary,
                status=job.status,
                date_applied=job.date_applied,
                resume_version=job.resume_version,
                notes=job.notes
            )
        except Exception as e:
            print(f"Error creating job: {e}")
            raise
    
    def update_job(self, row_id: int, job_update: JobUpdate) -> Optional[Job]:
        """Update an existing job"""
        try:
            # Get current row data
            current_row = self.worksheet.row_values(row_id)
            
            if not current_row:
                return None
            
            # Update only provided fields
            update_data = {}
            if job_update.user is not None:
                update_data['B'] = job_update.user.value
            if job_update.company is not None:
                update_data['C'] = job_update.company
            if job_update.role is not None:
                update_data['D'] = job_update.role
            if job_update.job_description is not None:
                update_data['E'] = job_update.job_description
            if job_update.jd_link is not None:
                update_data['F'] = job_update.jd_link
            if job_update.location is not None:
                update_data['G'] = job_update.location
            if job_update.salary is not None:
                update_data['H'] = job_update.salary
            if job_update.status is not None:
                update_data['I'] = job_update.status.value
            if job_update.date_applied is not None:
                update_data['J'] = job_update.date_applied
            if job_update.resume_version is not None:
                update_data['K'] = job_update.resume_version
            if job_update.notes is not None:
                update_data['L'] = job_update.notes
            
            # Update timestamp
            update_data['N'] = datetime.now().isoformat()
            
            # Apply updates
            for col, value in update_data.items():
                self.worksheet.update(f'{col}{row_id}', value)
            
            # Return updated job
            updated_row = self.worksheet.row_values(row_id)
            return self._row_to_job(updated_row, row_id)
            
        except Exception as e:
            print(f"Error updating job: {e}")
            raise
    
    def delete_job(self, row_id: int) -> bool:
        """Delete a job entry"""
        try:
            self.worksheet.delete_rows(row_id)
            return True
        except Exception as e:
            print(f"Error deleting job via delete_rows: {e}")
            # Fallback for Google Sheets Tables which don't allow row deletion
            try:
                # Clear the cells instead (N columns starting from A)
                empty_row = [""] * 14
                self.worksheet.update(f'A{row_id}:N{row_id}', [empty_row])
                return True
            except Exception as e2:
                print(f"Error clearing job row: {e2}")
                return False
    
    def update_notes(self, row_id: int, notes: str) -> bool:
        """Update only the notes field"""
        try:
            self.worksheet.update(f'L{row_id}', notes)
            self.worksheet.update(f'N{row_id}', datetime.now().isoformat())
            return True
        except Exception as e:
            print(f"Error updating notes: {e}")
            return False
    
    def mark_as_applied(self, row_id: int, resume_version: str = "") -> Optional[Job]:
        """Mark a job as applied"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d")
            
            self.worksheet.update(f'I{row_id}', StatusEnum.APPLIED.value)
            self.worksheet.update(f'J{row_id}', timestamp)
            if resume_version:
                self.worksheet.update(f'K{row_id}', resume_version)
            self.worksheet.update(f'N{row_id}', datetime.now().isoformat())
            
            updated_row = self.worksheet.row_values(row_id)
            return self._row_to_job(updated_row, row_id)
            
        except Exception as e:
            print(f"Error marking as applied: {e}")
            raise
    
    def get_analytics(self, user: Optional[str] = None) -> Dict:
        """Get analytics data"""
        try:
            jobs = self.get_all_jobs(user)
            
            total_jobs = len(jobs)
            status_counts = {}
            companies = set()
            
            for job in jobs:
                status_counts[job.status] = status_counts.get(job.status, 0) + 1
                if job.company:
                    companies.add(job.company)
            
            return {
                "total_jobs": total_jobs,
                "status_breakdown": status_counts,
                "unique_companies": len(companies),
                "applied_count": status_counts.get(StatusEnum.APPLIED, 0),
                "interview_count": status_counts.get(StatusEnum.INTERVIEW, 0),
                "offer_count": status_counts.get(StatusEnum.OFFER, 0),
                "rejected_count": status_counts.get(StatusEnum.REJECTED, 0)
            }
        except Exception as e:
            print(f"Error getting analytics: {e}")
            return {}

# Singleton instance
sheets_service = SheetsService()
