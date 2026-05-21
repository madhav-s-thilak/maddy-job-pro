import React, { useState } from 'react';
import { jobsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Search, X, Link, Loader, Briefcase, MapPin, DollarSign, PlusCircle } from 'lucide-react';

const JobSearch = ({ currentUser, onJobAdded, onClose }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [jobUrl, setJobUrl] = useState('');
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const handleExtractJob = async (e) => {
    e.preventDefault();
    if (!jobUrl.trim()) return toast.error('Enter a job URL');
    setLoadingExtract(true); setExtractedData(null);
    try {
      const res = await jobsAPI.extractFromUrl(jobUrl, currentUser);
      setExtractedData(res.data);
      toast.success('Job extracted and saved!');
      setJobUrl(''); onJobAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to extract job');
    } finally { setLoadingExtract(false); }
  };

  const handleSearchJobs = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return toast.error('Enter a keyword');
    setLoadingSearch(true); setSearchResults([]);
    try {
      const res = await jobsAPI.search(searchQuery, searchLocation || 'Remote');
      setSearchResults(res.data);
      if (!res.data.length) toast.error('No jobs found');
      else toast.success(`Found ${res.data.length} jobs`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Search failed');
    } finally { setLoadingSearch(false); }
  };

  const handleSaveJob = async (job) => {
    try {
      await jobsAPI.create({ ...job, user: currentUser, status: 'Not Applied' });
      toast.success('Job saved!'); onJobAdded();
    } catch { toast.error('Failed to save job'); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col max-h-[80vh]"
         style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Search size={16} className="text-primary-600" /> Find New Jobs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Search live listings or extract from a URL</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        {[
          { id: 'search',  label: 'Search Jobs' },
          { id: 'extract', label: 'Extract from URL' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5 overflow-y-auto flex-1">

        {/* Tab: Search */}
        {activeTab === 'search' && (
          <div className="space-y-5">
            <form onSubmit={handleSearchJobs} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Software Engineer, ML, Data…"
                className="input flex-1"
              />
              <input
                type="text" value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                placeholder="Remote / City"
                className="input sm:w-40"
              />
              <button type="submit" disabled={loadingSearch} className="btn-primary shrink-0">
                {loadingSearch ? <Loader size={15} className="animate-spin" /> : <Search size={15} />}
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">
                  {searchResults.length} results from Google Jobs
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {searchResults.map((job, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 card-hover">
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{job.role}</h3>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <Briefcase size={11} /> {job.company || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <MapPin size={11} /> {job.location || 'Unknown'}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-1 text-green-700 text-xs mt-0.5 font-medium">
                          <DollarSign size={11} /> {job.salary}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {job.job_description}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        {job.jd_link && (
                          <a href={job.jd_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                            <Link size={11} /> View original
                          </a>
                        )}
                        <button
                          onClick={() => handleSaveJob(job)}
                          className="btn-secondary text-xs py-1 px-3 ml-auto"
                        >
                          <PlusCircle size={13} /> Track
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Extract URL */}
        {activeTab === 'extract' && (
          <div className="space-y-4">
            <form onSubmit={handleExtractJob} className="space-y-3">
              <div className="relative">
                <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="url" value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://example.com/jobs/engineer"
                  className="input pl-9"
                />
              </div>
              <button type="submit" disabled={loadingExtract} className="btn-primary w-full">
                {loadingExtract
                  ? <><Loader size={15} className="animate-spin" /> Extracting…</>
                  : <><Search size={15} /> Extract + Save Job</>
                }
              </button>
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-1.5">
              <p className="font-medium text-slate-700">How it works</p>
              <p>1. Paste a job URL (LinkedIn, Greenhouse, Lever, Indeed, etc.)</p>
              <p>2. AI extracts company, role, location, salary and JD</p>
              <p>3. Job is saved instantly to your tracker</p>
            </div>

            {extractedData && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                <p className="font-semibold text-green-800 mb-2">✓ Job Added Successfully</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-slate-500">Company:</span> <span className="text-slate-900">{extractedData.company}</span></p>
                  <p><span className="text-slate-500">Role:</span> <span className="text-slate-900">{extractedData.role}</span></p>
                  <p><span className="text-slate-500">Location:</span> <span className="text-slate-900">{extractedData.location}</span></p>
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
