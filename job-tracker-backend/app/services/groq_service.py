from groq import Groq
from app.config import settings
from typing import Tuple

class GroqService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"
    
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
            print(f"Error optimizing resume: {e}")
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
            
            import json
            result = response.choices[0].message.content
            
            # Clean up response
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()
            
            return json.loads(result)
            
        except Exception as e:
            print(f"Error extracting job details: {e}")
            raise

    def generate_hr_email(self, job_description: str, resume_content: str, applicant_name: str) -> tuple[str, str]:
        """
        Generate a humanized email to HR with the job description and resume
        Returns: (email_body, email_subject)
        """
        try:
            prompt = f"""You are a professional job applicant writing an email to HR/recruiter.

JOB DESCRIPTION:
{job_description}

MY RESUME CONTENT:
{resume_content}

MY NAME: {applicant_name}

TASK: Write a warm, humanized, professional email to send to HR expressing interest in this position.

CRITICAL INSTRUCTIONS:
1. Extract ACTUAL details from MY RESUME CONTENT above - use my real companies, projects, skills, and achievements
2. DO NOT use placeholders like "XYZ Labs", "XYZ company", "[University]", or generic terms
3. Reference specific projects, companies, or achievements from my resume that match the job requirements
4. Keep it concise (150-250 words)
5. Be professional but personable - not robotic
6. Highlight 2-3 key relevant experiences/skills from MY resume that match the job
7. Show genuine enthusiasm for the role and company
8. End with a clear call-to-action
9. Do NOT use generic phrases like "I am writing to express my interest"
10. Make it sound like a real human wrote it
11. Style: Ruthlessly concise and skimmable. Opening: BLUF (Bottom-Line Up Front).Body: Exactly 2-3 bullet points highlighting quantifiable resume metrics.Closing: Confident and decisive.

OUTPUT FORMAT:
Return a JSON object with:
{{
    "subject": "email subject line",
    "body": "full email body with greeting and sign-off"
}}

Return ONLY the JSON, no markdown or explanations."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional job applicant. Write warm, humanized emails using ACTUAL details from the provided resume. NEVER use placeholders."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )

            import json
            result = response.choices[0].message.content

            # Clean up response
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            email_data = json.loads(result)

            return email_data.get("body", ""), email_data.get("subject", "")

        except Exception as e:
            print(f"Error generating HR email: {e}")
            raise

groq_service = GroqService()
