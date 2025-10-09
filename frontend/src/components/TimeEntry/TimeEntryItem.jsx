import React from 'react';
import { Clock, PencilLine, Trash2, Check, X } from 'lucide-react';

/**
 * @typedef {Object} TimeEntry
 * @property {number} id - Entry ID
 * @property {number} hours - Hours worked
 * @property {string} task - Task description
 * @property {string} notes - Additional notes
 * @property {string} date - Entry date
 * @property {string} tag - Entry tag
 * @property {number|null} invoiceId - Associated invoice ID
 */

/**
 * @typedef {Object} TimeEntryItemProps
 * @property {TimeEntry} entry - Time entry data
 * @property {boolean} [isEditing] - Whether entry is being edited
 * @property {Object} [editData] - Edit form data
 * @property {Function} onEdit - Function to start editing
 * @property {Function} onSave - Function to save changes
 * @property {Function} onCancel - Function to cancel editing
 * @property {Function} onDelete - Function to delete entry
 * @property {Function} onEditChange - Function to handle edit changes
 * @property {boolean} [loading] - Loading state
 */

/**
 * Individual time entry item component
 * @param {TimeEntryItemProps} props
 * @returns {JSX.Element}
 */
export const TimeEntryItem = React.memo(function TimeEntryItem({
  entry,
  isEditing = false,
  editData = {},
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditChange,
  loading = false
}) {
  const safeDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const isInvoiced = Boolean(entry.invoiceId);
  const canEdit = !isInvoiced && !loading;

  const handleEditClick = React.useCallback(() => {
    if (canEdit) {
      onEdit(entry);
    }
  }, [canEdit, onEdit, entry]);

  const handleSaveClick = React.useCallback(() => {
    onSave(entry.id, editData);
  }, [onSave, entry.id, editData]);

  const handleDeleteClick = React.useCallback(() => {
    if (canEdit && window.confirm('Are you sure you want to delete this entry?')) {
      onDelete(entry.id);
    }
  }, [canEdit, onDelete, entry.id]);

  const handleInputChange = React.useCallback((field, value) => {
    onEditChange(field, value);
  }, [onEditChange]);

  if (isEditing) {
    return (
      <tr className="bg-blue-50 border border-blue-200">
        <td className="px-4 py-3">
          <input
            type="number"
            step="0.1"
            min="0"
            max="24"
            value={editData.hours || ''}
            onChange={(e) => handleInputChange('hours', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Hours"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.task || ''}
            onChange={(e) => handleInputChange('task', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Task description"
          />
        </td>
        <td className="px-4 py-3">
          <textarea
            value={editData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm resize-none"
            rows="2"
            placeholder="Notes (optional)"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="date"
            value={editData.date || ''}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.tag || ''}
            onChange={(e) => handleInputChange('tag', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Tag (optional)"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button
              onClick={handleSaveClick}
              disabled={loading}
              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
              title="Save changes"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              title="Cancel editing"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-gray-50 ${isInvoiced ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="font-medium">{entry.hours?.toFixed(1) || '0.0'}h</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={entry.task}>
          {entry.task || '—'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600 truncate max-w-xs" title={entry.notes}>
          {entry.notes || '—'}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {safeDate(entry.date)}
      </td>
      <td className="px-4 py-3">
        {entry.tag ? (
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {entry.tag}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {isInvoiced ? (
            <span className="text-xs text-green-600 font-medium">
              Invoiced #{entry.invoiceId}
            </span>
          ) : (
            <>
              <button
                onClick={handleEditClick}
                disabled={!canEdit || loading}
                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit entry"
              >
                <PencilLine size={16} />
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={!canEdit || loading}
                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete entry"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

export default TimeEntryItem;