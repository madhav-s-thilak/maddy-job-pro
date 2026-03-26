import React, { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';
import JobCard from './JobCard';
import JobSearch from './JobSearch';
import Analytics from './Analytics';
import FilterBar from './FilterBar';
import { toast } from 'react-hot-toast';
import { BarChart3, Plus, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('Madhav');
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showJobSearch, setShowJobSearch] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [currentUser, filters]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await jobsAPI.getAll(
        currentUser,
        filters.status || null,
        filters.search || null
      );
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobUpdate = () => {
    fetchJobs();
  };

  const handleJobDelete = async (rowId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.delete(rowId);
        toast.success('Job deleted successfully');
        fetchJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Job Tracker <span className="text-primary-600">Pro</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-Powered Job Application Management
              </p>
            </div>
            
            {/* User Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentUser('Madhav')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    currentUser === 'Madhav'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Madhav
                </button>
                <button
                  onClick={() => setCurrentUser('Veena')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    currentUser === 'Veena'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Veena
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowJobSearch(!showJobSearch)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
            >
              <Plus size={20} />
              Look for New Jobs
            </button>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              <BarChart3 size={20} />
              Analytics
            </button>

            <button
              onClick={fetchJobs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Search Modal */}
        {showJobSearch && (
          <div className="mb-6 animate-slide-up">
            <JobSearch 
              currentUser={currentUser} 
              onJobAdded={handleJobUpdate}
              onClose={() => setShowJobSearch(false)}
            />
          </div>
        )}

        {/* Analytics */}
        {showAnalytics && (
          <div className="mb-6 animate-slide-up">
            <Analytics currentUser={currentUser} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <FilterBar filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Job Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{jobs.length}</span> jobs
            {filters.status && ` in status: ${filters.status}`}
            {filters.search && ` matching: "${filters.search}"`}
          </p>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <BarChart3 size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {filters.status || filters.search
                ? 'Try adjusting your filters'
                : 'Click "Look for New Jobs" to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard
                key={job.row_id}
                job={job}
                onUpdate={handleJobUpdate}
                onDelete={() => handleJobDelete(job.row_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
