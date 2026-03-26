import React, { useState } from 'react';
import { applicationsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { X, Save, StickyNote } from 'lucide-react';

const NotesEditor = ({ job, onSave, onClose }) => {
  const [notes, setNotes] = useState(job.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await applicationsAPI.updateNotes(job.row_id, notes);
      toast.success('Notes saved successfully!');
      onSave();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <StickyNote size={24} />
              Edit Notes
            </h2>
            <p className="text-sm text-yellow-100 mt-1">
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
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this job... 
• Referral information
• Application deadlines
• Interview preparation notes
• Follow-up reminders
• Compensation discussions
• Company research notes"
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-600">
              {notes.length} characters
            </p>
          </div>

          {/* Suggested Templates */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Quick Templates:</h4>
            <div className="space-y-2">
              <button
                onClick={() => setNotes(notes + '\n\n📧 Referral: ')}
                className="block w-full text-left px-3 py-2 text-sm bg-white hover:bg-yellow-100 rounded border border-yellow-200 transition-colors"
              >
                + Add Referral Section
              </button>
              <button
                onClick={() => setNotes(notes + '\n\n📅 Deadline: ')}
                className="block w-full text-left px-3 py-2 text-sm bg-white hover:bg-yellow-100 rounded border border-yellow-200 transition-colors"
              >
                + Add Deadline
              </button>
              <button
                onClick={() => setNotes(notes + '\n\n💡 Key Points to Mention:\n- \n- \n- ')}
                className="block w-full text-left px-3 py-2 text-sm bg-white hover:bg-yellow-100 rounded border border-yellow-200 transition-colors"
              >
                + Add Key Points
              </button>
              <button
                onClick={() => setNotes(notes + '\n\n📞 Interview Schedule:\nDate: \nTime: \nInterviewer: \nFormat: ')}
                className="block w-full text-left px-3 py-2 text-sm bg-white hover:bg-yellow-100 rounded border border-yellow-200 transition-colors"
              >
                + Add Interview Details
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;
