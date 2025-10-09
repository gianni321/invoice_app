import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Clock, Download, Plus, Trash2, PencilLine, Check, X, AlertCircle } from 'lucide-react';
import { api, getAuthHeaders } from '../config';
import { toast } from 'react-toastify';
import { DeadlineWarningBanner } from '../components/DeadlineStatus';
import { BatchTimeEntry } from '../components/BatchTimeEntry';

export function EntriesPage() {
  // State for entries management
  const [entries, setEntries] = useState([]);
  const [edit, setEdit] = useState(null);
  const [showBatchEntry, setShowBatchEntry] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state for new entries
  const [formData, setFormData] = useState({
    hours: '',
    task: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch entries on component mount
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(api.entries.list(), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        toast.error('Failed to fetch entries');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Error loading entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const hours = Number.parseFloat(formData.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      toast.error('Hours must be a positive number ≤ 24');
      return;
    }

    const task = formData.task?.trim();
    if (!task) {
      toast.error('Task description is required');
      return;
    }

    if (!formData.date) {
      toast.error('Date is required');
      return;
    }

    try {
      const response = await fetch(api.entries.create(), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hours,
          task,
          notes: formData.notes?.trim() || '',
          date: formData.date
        })
      });

      if (response.ok) {
        const newEntry = await response.json();
        setEntries(prev => [newEntry, ...prev]);
        setFormData({
          hours: '',
          task: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        toast.success('Time entry added successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Error adding entry');
    }
  };

  const handleEdit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!edit || edit.invoiceId) {
      toast.error('Cannot edit invoiced entry');
      return;
    }

    // Validation
    const hours = Number.parseFloat(edit.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      toast.error('Hours must be a positive number ≤ 24');
      return;
    }

    const task = edit.task?.trim();
    if (!task) {
      toast.error('Task description is required');
      return;
    }

    if (!edit.date) {
      toast.error('Date is required');
      return;
    }

    try {
      const payload = {
        hours,
        task,
        notes: (edit.notes || '').trim(),
        date: edit.date
      };

      const response = await fetch(api.entries.update(edit.id), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedEntry = await response.json();
        setEntries(entries => entries.map(e => e.id === edit.id ? updatedEntry : e));
        setEdit(null);
        toast.success('Entry updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Error updating entry');
    }
  }, [edit]);

  const handleDelete = async (entryId) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry?.invoiceId) {
      toast.error('Cannot delete invoiced entry');
      return;
    }

    if (!window.confirm('Delete this entry?')) return;

    try {
      const response = await fetch(api.entries.delete(entryId), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setEntries(entries => entries.filter(e => e.id !== entryId));
        toast.success('Entry deleted successfully');
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Error deleting entry');
    }
  };

  // Memoized calculations
  const { weekTotal, totalHours, uninvoicedHours } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTotal = entries
      .filter(e => {
        const entryDate = new Date(e.date + 'T12:00:00');
        return entryDate >= startOfWeek && entryDate <= endOfWeek;
      })
      .reduce((sum, e) => sum + (Number.parseFloat(e.hours) || 0), 0);

    const totalHours = entries.reduce((sum, e) => sum + (Number.parseFloat(e.hours) || 0), 0);
    const uninvoicedHours = entries
      .filter(e => !e.invoiceId)
      .reduce((sum, e) => sum + (Number.parseFloat(e.hours) || 0), 0);

    return { weekTotal, totalHours, uninvoicedHours };
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DeadlineWarningBanner />
      
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Time Entries</h1>
        <p className="mt-2 text-gray-600">Track your daily work hours and tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-blue-600">{weekTotal.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Uninvoiced</p>
              <p className="text-2xl font-bold text-orange-600">{uninvoicedHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Add Time Entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              required
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
            <input
              type="text"
              required
              value={formData.task}
              onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What did you work on?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional details..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowBatchEntry(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Batch
            </button>
          </div>
        </form>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Recent Entries</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className={entry.invoiceId ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {edit?.id === entry.id ? (
                      <input
                        type="date"
                        value={edit.date}
                        onChange={(e) => setEdit({...edit, date: e.target.value})}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      new Date(entry.date + 'T12:00:00').toLocaleDateString()
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {edit?.id === entry.id ? (
                      <input
                        type="number"
                        step="0.25"
                        value={edit.hours}
                        onChange={(e) => setEdit({...edit, hours: e.target.value})}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                      />
                    ) : (
                      `${Number.parseFloat(entry.hours).toFixed(2)}h`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {edit?.id === entry.id ? (
                      <input
                        type="text"
                        value={edit.task}
                        onChange={(e) => setEdit({...edit, task: e.target.value})}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      entry.task
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {edit?.id === entry.id ? (
                      <input
                        type="text"
                        value={edit.notes || ''}
                        onChange={(e) => setEdit({...edit, notes: e.target.value})}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      entry.notes || '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.invoiceId ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Invoiced
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {edit?.id === entry.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleEdit}
                          className="text-green-600 hover:text-green-900"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEdit(null)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        {!entry.invoiceId && (
                          <>
                            <button
                              onClick={() => setEdit(entry)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {entries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No entries yet. Add your first time entry above.
            </div>
          )}
        </div>
      </div>

      {/* Batch Entry Modal */}
      {showBatchEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BatchTimeEntry 
              onClose={() => setShowBatchEntry(false)}
              onSuccess={(newEntries) => {
                setEntries(prev => [...newEntries, ...prev]);
                setShowBatchEntry(false);
                toast.success(`Added ${newEntries.length} entries successfully`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}