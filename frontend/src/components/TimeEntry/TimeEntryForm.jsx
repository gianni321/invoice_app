import React, { useState, useCallback } from 'react';
import { Clock, Plus } from 'lucide-react';

const TimeEntryForm = ({ onSubmit, availableTags, loading }) => {
  const [form, setForm] = useState({ 
    hours: '', 
    task: '', 
    notes: '',
    date: new Date().toISOString().split('T')[0],
    tag: ''
  });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Input validation
    const hours = Number.parseFloat(form.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return alert('Hours must be a valid number between 0 and 24');
    }
    
    const task = form.task?.trim();
    if (!task) {
      return alert('Task description is required');
    }
    
    if (!form.date) {
      return alert('Date is required');
    }
    
    try {
      await onSubmit({
        date: form.date,
        hours,
        task: task,
        notes: (form.notes || '').trim(),
        tag: form.tag || null
      });
      
      // Reset form
      setForm({ 
        hours: '', 
        task: '', 
        notes: '',
        date: new Date().toISOString().split('T')[0],
        tag: ''
      });
    } catch (error) {
      console.error('Error adding entry:', error);
      alert(error.message || 'Failed to add entry');
    }
  }, [form, onSubmit]);

  return (
    <div className="bg-white p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Plus className="text-blue-600" /> New Entry
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
          <input
            type="number"
            step="0.25"
            value={form.hours}
            onChange={e => setForm({ ...form, hours: e.target.value })}
            placeholder="Hours"
            className="w-full px-3 py-2 border rounded-lg"
            required
            min="0"
            max="24"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
          <input
            type="text"
            value={form.task}
            onChange={e => setForm({ ...form, task: e.target.value })}
            placeholder="Task description"
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
          <select
            value={form.tag}
            onChange={e => setForm({ ...form, tag: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select tag</option>
            {availableTags.map(tag => (
              <option key={tag.name} value={tag.name}>
                {tag.description || tag.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes"
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <Clock size={20} />
          {loading ? 'Adding...' : 'Log Time'}
        </button>
      </form>
    </div>
  );
};

export default TimeEntryForm;