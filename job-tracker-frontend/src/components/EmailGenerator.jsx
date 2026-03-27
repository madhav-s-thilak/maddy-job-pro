import React, { useState } from 'react';
import { resumeAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { X, Mail, Copy, Download, FileText } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for PDF.js - using unpkg CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const EmailGenerator = ({ job, currentUser, onClose }) => {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeContent, setResumeContent] = useState('');
  const [applicantName, setApplicantName] = useState(currentUser);
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new Error('No text found in PDF. The PDF may contain only images.');
      }

      return fullText;
    } catch (error) {
      throw error;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setExtracting(true);
      setExtractError('');

      try {
        const text = await extractTextFromPDF(file);
        setResumeContent(text);
        toast.success(`Resume "${file.name}" uploaded and extracted!`);
      } catch (error) {
        console.error('Error extracting PDF text:', error);
        const errorMsg = error.message || 'Failed to extract text from PDF';
        setExtractError(errorMsg);
        toast.error(`Extraction failed: ${errorMsg}`);
        // Fallback - still allow user to proceed with just the filename
        setResumeContent(`[PDF Resume: ${file.name}]\n\nNote: Text extraction failed. Please paste your resume content manually below.`);
      } finally {
        setExtracting(false);
      }
    } else {
      toast.error('Please upload a PDF file');
    }
  };

  const handleGenerateEmail = async () => {
    if (!resumeFile) {
      toast.error('Please upload your resume PDF');
      return;
    }

    setLoading(true);
    try {
      const response = await resumeAPI.generateEmail(
        job.job_description || job.jd_link,
        resumeContent || `[Resume: ${resumeFile.name}]`,
        applicantName
      );

      setEmailBody(response.data.email_body);
      setEmailSubject(response.data.email_subject);
      toast.success('Email generated successfully!');
    } catch (error) {
      console.error('Error generating email:', error);
      toast.error('Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDownload = () => {
    const content = `Subject: ${emailSubject}\n\n${emailBody}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.company}_HR_email.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Email downloaded!');
  };

  const openEmailClient = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail size={24} />
              Generate HR Email
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {job.company} - {job.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!emailBody ? (
            /* Input Stage */
            <div className="space-y-6">
              {/* Job Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Description:</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {job.job_description || 'No job description available. View the job link for details.'}
                  </p>
                </div>
              </div>

              {/* Applicant Name */}
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Your Name:
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Upload Your Resume (PDF):
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <FileText size={20} />
                    Choose PDF Resume
                  </label>
                  {resumeFile && (
                    <p className="mt-3 text-sm text-green-600">
                      Selected: <span className="font-medium">{resumeFile.name}</span>
                      {extracting && <span className="ml-2 text-blue-600">(Extracting text...)</span>}
                      {resumeContent && !extracting && <span className="ml-2 text-gray-500">✓ Text extracted</span>}
                    </p>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  The AI will extract relevant information from your resume to personalize the email
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateEmail}
                disabled={loading || !resumeFile || extracting || !resumeContent}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 font-semibold text-lg shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Email... (this may take 10-20 seconds)
                  </>
                ) : extracting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Extracting text from PDF...
                  </>
                ) : (
                  <>
                    <Mail size={24} />
                    Generate HR Email
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Stage */
            <div className="space-y-6">
              {/* Generated Email */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Mail size={20} className="text-blue-600" />
                    Generated Email
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(emailSubject, 'Subject')}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <Copy size={16} />
                      Copy Subject
                    </button>
                    <button
                      onClick={() => handleCopy(emailBody, 'Email body')}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                    >
                      <Copy size={16} />
                      Copy Body
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>

                {/* Email Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-white">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">Subject:</span>
                      <span className="ml-2 text-gray-900">{emailSubject}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                      {emailBody}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={openEmailClient}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Mail size={20} />
                  Open in Email Client
                </button>
                <button
                  onClick={() => {
                    setEmailBody('');
                    setEmailSubject('');
                    setResumeFile(null);
                    setResumeContent('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Generate New Email
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;
