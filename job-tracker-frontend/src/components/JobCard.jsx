import React, { useState } from 'react';
import { applicationsAPI, jobsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  Building2, MapPin, DollarSign, Calendar, 
  Trash2, Edit, CheckCircle, ExternalLink, StickyNote,
  Sparkles
} from 'lucide-react';
import ResumeOptimizer from './ResumeOptimizer';
import NotesEditor from './NotesEditor';

const STATUS_COLORS = {
  'Not Applied': 'bg-gray-100 text-gray-800 border-gray-300',
  'Applied': 'bg-blue-100 text-blue-800 border-blue-300',
  'Interview': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Offer': 'bg-green-100 text-green-800 border-green-300',
  'Rejected': 'bg-red-100 text-red-800 border-red-300',
  'Withdrawn': 'bg-purple-100 text-purple-800 border-purple-300'
};

const JobCard = ({ job, onUpdate, onDelete }) => {
  const [showResumeOptimizer, setShowResumeOptimizer] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleMarkAsApplied = async () => {
    if (window.confirm('Mark this job as applied?')) {
      setIsApplying(true);
      try {
        await applicationsAPI.markAsApplied(job.row_id);
        toast.success('Marked as applied!');
        onUpdate();
      } catch (error) {
        console.error('Error marking as applied:', error);
        toast.error('Failed to mark as applied');
      } finally {
        setIsApplying(false);
      }
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await jobsAPI.update(job.row_id, { status: newStatus });
      toast.success('Status updated!');
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                {job.role}
              </h3>
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 size={16} />
                <span className="font-medium">{job.company}</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium border cursor-pointer ${
                STATUS_COLORS[job.status] || STATUS_COLORS['Not Applied']
              }`}
            >
              <option value="Not Applied">Not Applied</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* Job Details */}
          <div className="space-y-2 text-sm">
            {job.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={16} />
                <span>{job.location}</span>
              </div>
            )}
            
            {job.salary && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign size={16} />
                <span>{job.salary}</span>
              </div>
            )}

            {job.date_applied && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={16} />
                <span>Applied: {job.date_applied}</span>
              </div>
            )}
          </div>
        </div>

        {/* Job Description Preview */}
        {job.job_description && (
          <div className="px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-700 line-clamp-3">
              {job.job_description}
            </p>
          </div>
        )}

        {/* Notes Preview */}
        {job.notes && (
          <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-100">
            <div className="flex items-start gap-2">
              <StickyNote size={16} className="text-yellow-600 mt-0.5" />
              <p className="text-sm text-gray-700 line-clamp-2">{job.notes}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {job.status === 'Not Applied' && (
              <button
                onClick={handleMarkAsApplied}
                disabled={isApplying}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <CheckCircle size={16} />
                {isApplying ? 'Applying...' : 'Mark Applied'}
              </button>
            )}

            <button
              onClick={() => setShowResumeOptimizer(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Sparkles size={16} />
              Optimize Resume
            </button>

            <button
              onClick={() => setShowNotesEditor(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              <StickyNote size={16} />
              {job.notes ? 'Edit Notes' : 'Add Notes'}
            </button>

            {job.jd_link && (
              <a
                href={job.jd_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                <ExternalLink size={16} />
                View JD
              </a>
            )}
          </div>

          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Modals */}
      {showResumeOptimizer && (
        <ResumeOptimizer
          job={job}
          onClose={() => setShowResumeOptimizer(false)}
        />
      )}

      {showNotesEditor && (
        <NotesEditor
          job={job}
          onSave={() => {
            setShowNotesEditor(false);
            onUpdate();
          }}
          onClose={() => setShowNotesEditor(false)}
        />
      )}
    </>
  );
};

export default JobCard;
