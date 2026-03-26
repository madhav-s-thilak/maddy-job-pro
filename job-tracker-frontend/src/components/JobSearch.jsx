import React, { useState } from 'react';
import { jobsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Search, X, Link, Loader, Briefcase, MapPin, DollarSign, PlusCircle } from 'lucide-react';

const JobSearch = ({ currentUser, onJobAdded, onClose }) => {
  const [activeTab, setActiveTab] = useState('search');
  
  // URL Extraction State
  const [jobUrl, setJobUrl] = useState('');
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  // Auto-Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // URL Extraction Handler
  const handleExtractJob = async (e) => {
    e.preventDefault();
    if (!jobUrl.trim()) {
      toast.error('Please enter a job URL');
      return;
    }
    setLoadingExtract(true);
    setExtractedData(null);
    try {
      const response = await jobsAPI.extractFromUrl(jobUrl, currentUser);
      setExtractedData(response.data);
      toast.success('Job details extracted successfully!');
      setJobUrl('');
      onJobAdded();
    } catch (error) {
      console.error('Error extracting job:', error);
      toast.error(error.response?.data?.detail || 'Failed to extract job details');
    } finally {
      setLoadingExtract(false);
    }
  };

  // Search Jobs Handler
  const handleSearchJobs = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a job title or keyword');
      return;
    }
    setLoadingSearch(true);
    setSearchResults([]);
    try {
      const response = await jobsAPI.search(searchQuery, searchLocation || 'Remote');
      setSearchResults(response.data);
      if (response.data.length === 0) {
        toast.error('No jobs found for this query');
      } else {
        toast.success(`Found ${response.data.length} jobs!`);
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      toast.error(error.response?.data?.detail || 'Failed to search jobs');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Save specific job from search results
  const handleSaveJob = async (job) => {
    try {
      await jobsAPI.create({
        ...job,
        user: currentUser,
        status: 'Not Applied',
      });
      toast.success('Job saved to tracker!');
      onJobAdded();
    } catch (error) {
       console.error('Error saving job:', error);
       toast.error('Failed to save job');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Search size={24} />
            Find New Jobs
          </h2>
          <p className="text-sm text-primary-100 mt-1">
            Search live jobs or extract details from a URL
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X size={24} className="text-white" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'search' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Google Jobs
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'extract' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('extract')}
        >
          🔗 Extract from URL
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="p-6 overflow-y-auto">
        
        {/* Tab 1: Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <form onSubmit={handleSearchJobs} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords / Title</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  disabled={loadingSearch}
                />
              </div>
              <div className="flex-1 md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="e.g. Remote, or New York"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  disabled={loadingSearch}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loadingSearch}
                  className="w-full md:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 h-[42px]"
                >
                  {loadingSearch ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
                  Search
                </button>
              </div>
            </form>

            {/* Results */}
            {searchResults.length > 0 && (
               <div className="space-y-4">
                 <p className="text-sm font-medium text-gray-600">Showing top results from Google Jobs:</p>
                 <div className="grid gap-4 md:grid-cols-2">
                   {searchResults.map((job, idx) => (
                     <div key={idx} className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition">
                       <div>
                         <h3 className="font-bold text-gray-900 line-clamp-1" title={job.role}>{job.role}</h3>
                         <div className="flex items-center gap-1 text-gray-600 mt-1 text-sm font-medium">
                           <Briefcase size={14}/> <span>{job.company || 'Unknown Company'}</span>
                         </div>
                         <div className="flex items-center gap-1 text-gray-500 mt-1 text-xs">
                           <MapPin size={14}/> <span>{job.location || 'Unknown Location'}</span>
                         </div>
                         {job.salary && (
                           <div className="flex items-center gap-1 text-green-700 mt-1 text-xs font-medium">
                             <DollarSign size={14}/> <span>{job.salary}</span>
                           </div>
                         )}
                         <p className="mt-2 text-xs text-gray-500 line-clamp-3">
                           {job.job_description || "No description available."}
                         </p>
                       </div>
                       
                       <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                         <a href={job.jd_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline inline-flex flex-center gap-1">
                           <Link size={12}/> View Original
                         </a>
                         <button
                           onClick={() => handleSaveJob(job)}
                           className="flex items-center gap-1 text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-100 transition"
                         >
                           <PlusCircle size={16}/> Track
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>
        )}

        {/* Tab 2: Extract URL */}
        {activeTab === 'extract' && (
          <div className="space-y-4 animate-fade-in">
            <form onSubmit={handleExtractJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Posting URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://example.com/jobs/software-engineer"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    disabled={loadingExtract}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Supports: LinkedIn, Indeed, Glassdoor, company career pages, and more
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loadingExtract}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loadingExtract ? (
                    <><Loader size={20} className="animate-spin" /> Extracting...</>
                  ) : (
                    <><Search size={20} /> Extract Details</>
                  )}
                </button>
                <p className="text-sm text-gray-600">
                  For user: <span className="font-semibold text-purple-600">{currentUser}</span>
                </p>
              </div>
            </form>

            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">How it works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
                <li>Copy the URL of a job posting</li>
                <li>Paste it into the field</li>
                <li>AI will automatically extract and save the job instantly to your tracker</li>
              </ol>
            </div>

            {extractedData && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  Job Added Successfully!
                </h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium text-gray-700">Company:</span> <span className="text-gray-900">{extractedData.company}</span></div>
                  <div><span className="font-medium text-gray-700">Role:</span> <span className="text-gray-900">{extractedData.role}</span></div>
                  <div><span className="font-medium text-gray-700">Location:</span> <span className="text-gray-900">{extractedData.location}</span></div>
                  {extractedData.salary && (
                    <div><span className="font-medium text-gray-700">Salary:</span> <span className="text-gray-900">{extractedData.salary}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default JobSearch;
