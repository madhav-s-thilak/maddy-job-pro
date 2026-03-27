import React, { useState } from 'react';
import { resumeAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { X, Sparkles, Copy, Download } from 'lucide-react';

const ResumeOptimizer = ({ job, onClose }) => {
  const [currentResume, setCurrentResume] = useState('');
  const [optimizedResume, setOptimizedResume] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOptimize = async () => {
    if (!currentResume.trim()) {
      toast.error('Please paste your current resume');
      return;
    }

    setLoading(true);
    try {
      const response = await resumeAPI.optimize(
        job.job_description || job.jd_link,
        currentResume
      );
      
      setOptimizedResume(response.data.optimized_resume);
      setChangesSummary(response.data.changes_summary);
      toast.success('Resume optimized successfully!');
    } catch (error) {
      console.error('Error optimizing resume:', error);
      toast.error('Failed to optimize resume');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDownload = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-primary-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles size={24} />
              Resume Optimizer
            </h2>
            <p className="text-sm text-purple-100 mt-1">
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
          {!optimizedResume ? (
            /* Input Stage */
            <div className="space-y-6">
              {/* Job Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Description:</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {job.job_description || 'No job description available. View the job link.'}
                  </p>
                </div>
              </div>

              {/* Current Resume Input */}
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Paste Your Current Resume (LaTeX format):
                </label>
                <textarea
                  value={currentResume}
                  onChange={(e) => setCurrentResume(e.target.value)}
                  placeholder="Paste your LaTeX resume code here..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Tip: Include your complete LaTeX resume code for best results
                </p>
              </div>

              {/* Optimize Button */}
              <button
                onClick={handleOptimize}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-primary-600 text-white rounded-lg hover:from-purple-700 hover:to-primary-700 transition-all disabled:opacity-50 font-semibold text-lg shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Optimizing... (this may take 10-20 seconds)
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Generate Optimized Resume
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Stage */
            <div className="space-y-6">
              {/* Changes Summary */}
              {changesSummary && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    Key Optimizations:
                  </h3>
                  <div className="text-sm text-green-800 whitespace-pre-wrap">
                    {changesSummary}
                  </div>
                </div>
              )}

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Resume */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Original Resume</h3>
                    <button
                      onClick={() => handleCopy(currentResume, 'Original resume')}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                  <div className="h-96 p-4 bg-gray-50 border border-gray-300 rounded-lg overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {currentResume}
                    </pre>
                  </div>
                </div>

                {/* Optimized Resume */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles size={20} className="text-purple-600" />
                      Optimized Resume
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(optimizedResume, 'Optimized resume')}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                      <button
                        onClick={() => handleDownload(optimizedResume, `${job.company}_${job.role}_resume_optimized.tex`)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="h-96 p-4 bg-purple-50 border border-purple-300 rounded-lg overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {optimizedResume}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setOptimizedResume('');
                    setChangesSummary('');
                    setCurrentResume('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Start Over
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

export default ResumeOptimizer;
