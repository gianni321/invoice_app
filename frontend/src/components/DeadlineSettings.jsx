import React, { useState } from 'react';
import { useDeadlineSettings } from '../hooks/useDeadline';

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function DeadlineSettings() {
  const { loading, error, settings, updateSettings } = useDeadlineSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    weekday: 2,
    hour: 23,
    minute: 59,
    zone: 'America/Denver',
    warnWindowHours: 24
  });

  // Start editing with current settings
  const handleEdit = () => {
    setFormData({
      weekday: settings.weekday,
      hour: settings.hour,
      minute: settings.minute,
      zone: settings.zone,
      warnWindowHours: settings.warnWindowHours
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Convert string inputs to numbers where needed
    const dataToSave = {
      ...formData,
      weekday: Number(formData.weekday),
      hour: Number(formData.hour),
      minute: Number(formData.minute),
      warnWindowHours: Number(formData.warnWindowHours)
    };

    const success = await updateSettings(dataToSave);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-4">Loading deadline settings...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!settings) {
    return <div className="p-4">No settings available</div>;
  }

  if (!isEditing) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Invoice Deadline Settings</h2>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Settings
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <dt className="font-semibold">Due Day:</dt>
          <dd>{WEEKDAYS.find(w => w.value === settings.weekday)?.label}</dd>

          <dt className="font-semibold">Due Time:</dt>
          <dd>
            {String(settings.hour).padStart(2, '0')}:
            {String(settings.minute).padStart(2, '0')}
          </dd>

          <dt className="font-semibold">Timezone:</dt>
          <dd>{settings.zone}</dd>

          <dt className="font-semibold">Warning Window:</dt>
          <dd>{settings.warnWindowHours} hours before deadline</dd>
        </dl>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Edit Deadline Settings</h2>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Day
          </label>
          <select
            value={formData.weekday}
            onChange={e => setFormData({...formData, weekday: Number(e.target.value)})}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {WEEKDAYS.map(day => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hour (24h)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={formData.hour}
              onChange={e => setFormData({...formData, hour: Number(e.target.value)})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minute
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={formData.minute}
              onChange={e => setFormData({...formData, minute: Number(e.target.value)})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <input
            type="text"
            value={formData.zone}
            onChange={e => setFormData({...formData, zone: e.target.value})}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="America/Denver"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warning Window (hours)
          </label>
          <input
            type="number"
            min="1"
            value={formData.warnWindowHours}
            onChange={e => setFormData({...formData, warnWindowHours: Number(e.target.value)})}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}