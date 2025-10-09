import React from 'react';
import { Plus, Clock } from 'lucide-react';
import { useForm } from '../../hooks/useForm';
import { ValidationSchemas } from '../../utils/validation';
import { LoadingSpinner } from '../Loading';

/**
 * @typedef {Object} TimeEntryFormProps
 * @property {Function} onSubmit - Function called when form is submitted
 * @property {boolean} [loading] - Loading state
 * @property {Object} [initialData] - Initial form data
 * @property {Function} [onCancel] - Function called when form is cancelled
 * @property {boolean} [isEditing] - Whether form is in edit mode
 */

/**
 * Form component for creating and editing time entries
 * @param {TimeEntryFormProps} props
 * @returns {JSX.Element}
 */
export const TimeEntryForm = React.memo(function TimeEntryForm({
  onSubmit,
  loading = false,
  initialData = {},
  onCancel,
  isEditing = false
}) {
  const { formData, updateField, resetForm, handleInputChange } = useForm({
    hours: '',
    task: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    tag: '',
    ...initialData
  });

  const [errors, setErrors] = React.useState({});

  const validateForm = React.useCallback(() => {
    const result = ValidationSchemas.timeEntry.validate(formData);
    setErrors(result.errorFields);
    return result.isValid;
  }, [formData]);

  const handleSubmit = React.useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      if (!isEditing) {
        resetForm();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }, [formData, validateForm, onSubmit, isEditing, resetForm]);

  const handleCancel = React.useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      resetForm();
    }
    setErrors({});
  }, [onCancel, resetForm]);

  const isFormValid = React.useMemo(() => {
    return formData.hours && formData.task && formData.date;
  }, [formData.hours, formData.task, formData.date]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Clock size={20} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Time Entry' : 'Add Time Entry'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hours Input */}
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
              Hours Worked *
            </label>
            <input
              type="number"
              id="hours"
              name="hours"
              step="0.1"
              min="0"
              max="24"
              value={formData.hours}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.hours ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 8.5"
              disabled={loading}
            />
            {errors.hours && (
              <p className="text-red-600 text-sm mt-1">{errors.hours}</p>
            )}
          </div>

          {/* Date Input */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.date && (
              <p className="text-red-600 text-sm mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
            Task Description *
          </label>
          <input
            type="text"
            id="task"
            name="task"
            value={formData.task}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.task ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="What did you work on?"
            disabled={loading}
          />
          {errors.task && (
            <p className="text-red-600 text-sm mt-1">{errors.task}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Additional details about your work..."
            disabled={loading}
          />
        </div>

        {/* Tag */}
        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-2">
            Tag (Optional)
          </label>
          <input
            type="text"
            id="tag"
            name="tag"
            value={formData.tag}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., development, meeting, research"
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Plus size={16} />
            )}
            {isEditing ? 'Update Entry' : 'Add Entry'}
          </button>

          {(isEditing || onCancel) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Form Helper */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Use decimal hours (e.g., 1.5 for 1 hour 30 minutes). 
          Maximum 24 hours per entry.
        </p>
      </div>
    </div>
  );
});

export default TimeEntryForm;