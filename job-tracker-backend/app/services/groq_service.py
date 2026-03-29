import json
import logging
from groq import Groq
from app.config import settings
from typing import Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "openai/gpt-oss-120b"
    
    def optimize_resume(self, job_description: str, current_resume: str) -> Tuple[str, str]:
        """
        Optimize resume based on job description
        Returns: (optimized_resume, changes_summary)
        """
        try:
            prompt = f"""You are an expert ATS resume optimizer and technical recruiter.

TASK: Optimize the provided LaTeX resume to match the job description while maintaining truthfulness and the original structure.

JOB DESCRIPTION:
{job_description}

CURRENT RESUME (LaTeX):
{current_resume}

INSTRUCTIONS:
1. Analyze the job description for key requirements, skills, and keywords
2. Optimize the resume to highlight relevant experience and skills
3. Use ATS-friendly keywords naturally throughout
4. Ensure all content remains truthful - DO NOT fabricate experience
5. Maintain the LaTeX structure and formatting
6. Focus on impact metrics and achievements relevant to the role
7. Return ONLY the optimized LaTeX code without explanations

OUTPUT ONLY THE COMPLETE OPTIMIZED LATEX RESUME CODE."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert ATS resume optimizer. Return only clean LaTeX code without markdown formatting or explanations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=4000
            )
            
            optimized_resume = response.choices[0].message.content
            
            # Generate changes summary
            summary_prompt = f"""Compare these two resumes and provide a brief summary of key changes made:

ORIGINAL:
{current_resume[:1000]}...

OPTIMIZED:
{optimized_resume[:1000]}...

Provide a concise bullet-point summary of the main optimizations (3-5 points)."""

            summary_response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a resume analyst. Provide clear, concise summaries."},
                    {"role": "user", "content": summary_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            changes_summary = summary_response.choices[0].message.content
            
            return optimized_resume, changes_summary
            
        except Exception as e:
            logger.error(f"Error optimizing resume: {e}", exc_info=True)
            raise
    
    def extract_job_details(self, job_html: str) -> dict:
        """
        Extract job details from HTML content using AI
        """
        try:
            prompt = f"""Extract job details from this HTML content and return a JSON object.

HTML CONTENT:
{job_html[:8000]}

Extract and return ONLY a JSON object with these fields:
{{
    "company": "company name",
    "role": "job title/role",
    "location": "job location",
    "salary": "salary range if available, else empty string",
    "job_description": "full job description with key responsibilities and requirements"
}}

Return ONLY the JSON object, no markdown formatting or explanations."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a job posting parser. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            
            result = response.choices[0].message.content

            # Clean up response
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error extracting job details: {e}", exc_info=True)
            raise

    def generate_hr_email(self, job_description: str, resume_content: str, applicant_name: str) -> tuple[str, str]:
        """
        Generate a humanized email to HR with the job description and resume
        Returns: (email_body, email_subject)
        """
        try:
            prompt = f"""You are a professional job applicant writing an email to HR/recruiter at a top company.

JOB DESCRIPTION:
{job_description}

MY RESUME CONTENT:
{resume_content}

MY NAME: {applicant_name}

TASK: Write a warm, professional, well-structured email to send to HR expressing interest in this position.

EMAIL STRUCTURE (follow this exact format):

**Subject Line:**
- Keep it clear and specific (e.g., "Application for [Role] - [Your Name]")

**Email Body:**
- **Opening (1-2 sentences):** State the role you're applying for and a brief hook about why you're excited
- **Body Paragraph 1:** Highlight 1-2 most relevant experiences/companies from your resume that match this role
- **Body Paragraph 2:** Mention 1-2 key skills or achievements that directly align with the job requirements
- **Closing (1-2 sentences):** Express enthusiasm and include a clear call-to-action (e.g., requesting a conversation)

CRITICAL RULES:
1. Use ONLY real details from MY RESUME CONTENT - actual companies, projects, achievements
2. NEVER use placeholders like "XYZ Labs", "[Company]", "[University]", etc.
3. Keep it concise (150-250 words total)
4. Use proper paragraph breaks for readability - do NOT write one giant paragraph
5. Sound human and enthusiastic, not robotic
6. Do NOT use generic openers like "I am writing to express my interest"

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no explanations):
{{
    "subject": "clear subject line",
    "body": "Dear [Hiring Team/Recruiter],\\n\\n[Opening paragraph]\\n\\n[Body paragraph 1]\\n\\n[Body paragraph 2]\\n\\n[Closing]\\n\\nBest regards,\\n[Your Name]"
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional job applicant. Write warm, well-structured emails using ACTUAL details from the provided resume. NEVER use placeholders. Always use proper paragraph breaks."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1200
            )

            result = response.choices[0].message.content

            # Clean up response - handle various markdown formats
            logger.info(f"Raw email generation response: {result[:200]}...")
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            # Remove any leading/trailing whitespace and potential JSON markers
            result = result.strip()
            if result.startswith("{"):
                result = result
            elif result.startswith('"') or result.startswith("'"):
                # Sometimes the response might be a stringified JSON
                result = result.strip('"').strip("'")

            email_data = json.loads(result)

            return email_data.get("body", ""), email_data.get("subject", "")

        except json.JSONDecodeError as je:
            logger.error(f"JSON decode error in generate_hr_email: {je}")
            logger.error(f"Raw result that failed to parse: {result}")
            raise
        except Exception as e:
            logger.error(f"Error generating HR email: {e}", exc_info=True)
            raise

groq_service = GroqService()
