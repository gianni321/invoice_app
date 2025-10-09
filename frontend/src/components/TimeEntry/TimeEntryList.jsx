import React, { useMemo } from 'react';
import { PencilLine, Trash2, Check, X } from 'lucide-react';

const TimeEntryList = ({ 
  entries, 
  onEdit, 
  onDelete, 
  onSave, 
  editingId, 
  availableTags,
  user 
}) => {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  const groupedEntries = useMemo(() => {
    const groupedByDate = {};
    entries.forEach(e => {
      const dateKey = new Date(e.date).toLocaleDateString();
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(e);
    });

    return Object.keys(groupedByDate).sort((a, b) => {
      return new Date(groupedByDate[b][0].date) - new Date(groupedByDate[a][0].date);
    }).map(dateKey => ({
      dateKey,
      entries: groupedByDate[dateKey]
    }));
  }, [entries]);

  const handleEdit = (entry) => {
    onEdit(entry);
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    // Input validation for editing
    const hours = Number.parseFloat(editingId.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return alert('Hours must be a valid number between 0 and 24');
    }
    
    const task = editingId.task?.trim();
    if (!task) {
      return alert('Task description is required');
    }
    
    if (!editingId.date) {
      return alert('Date is required');
    }
    
    try {
      await onSave(editingId);
    } catch (error) {
      console.error('Error updating entry:', error);
      alert(error.message || 'Failed to update entry');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl mb-4">
      <h2 className="text-xl font-bold mb-4">Open Entries ({entries.length})</h2>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {groupedEntries.map(({ dateKey, entries: dateEntries }) => {
          const dayTotal = dateEntries.reduce((sum, e) => sum + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);
          const dayHours = dateEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
          
          return (
            <div key={dateKey} className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 flex justify-between items-center">
                <span className="font-semibold text-blue-900">{dateKey}</span>
                <span className="text-sm text-blue-700">{dayHours}h • {fmt.format(dayTotal)}</span>
              </div>
              <div className="divide-y">
                {dateEntries.map(entry => (
                  entry.id === editingId?.id ? (
                    <div key={entry.id} className="p-3 bg-blue-50">
                      <div className="space-y-2">
                        <input
                          type="number"
                          step="0.25"
                          value={editingId.hours}
                          onChange={e => onEdit({ ...editingId, hours: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                          min="0"
                          max="24"
                        />
                        <input
                          type="text"
                          value={editingId.task}
                          onChange={e => onEdit({ ...editingId, task: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        />
                        <select
                          value={editingId.tag || ''}
                          onChange={e => onEdit({ ...editingId, tag: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        >
                          <option value="">Select tag</option>
                          {availableTags.map(tag => (
                            <option key={tag.name} value={tag.name}>
                              {tag.description || tag.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={editingId.notes}
                          onChange={e => onEdit({ ...editingId, notes: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSave} 
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <Check size={14} />
                            Save
                          </button>
                          <button 
                            onClick={() => onEdit(null)} 
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={entry.id} className="p-3 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">
                            {entry.hours}h • {entry.task}
                            {entry.tag && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {entry.tag}
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-gray-600 mt-1">{entry.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-green-600 font-semibold">
                            {fmt.format(entry.hours * entry.rate)}
                          </div>
                          <button 
                            onClick={() => handleEdit(entry)} 
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilLine size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(entry.id)} 
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeEntryList;
