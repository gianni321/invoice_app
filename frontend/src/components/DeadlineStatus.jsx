import React from 'react';
import { useDeadlineStatus } from '../hooks/useDeadline';

export function DeadlineWarningBanner({ userId }) {
  const { loading, error, getMyStatus } = useDeadlineStatus({
    refreshInterval: 300000 // Check every 5 minutes
  });

  if (loading || error || !userId) return null;

  const status = getMyStatus(userId);
  if (!status || status.submitted || status.status === 'ok') return null;

  return (
    <div className={`p-4 mb-4 rounded-lg ${
      status.status === 'late' 
        ? 'bg-red-100 text-red-900 border border-red-200'
        : 'bg-yellow-100 text-yellow-900 border border-yellow-200'
    }`}>
      <p className="text-sm font-medium">{status.message}</p>
    </div>
  );
}

export function DeadlineStatusTable() {
  const { loading, error, data } = useDeadlineStatus({
    refreshInterval: 60000 // Refresh every minute for admin view
  });

  if (loading) {
    return <div className="p-4">Loading deadline status...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!data?.statuses) {
    return <div className="p-4">No status data available</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deadline
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Period
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.statuses.map(status => (
            <tr key={status.userId} className={
              status.status === 'late' ? 'bg-red-50' :
              status.status === 'approaching' ? 'bg-yellow-50' :
              ''
            }>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {status.userName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  status.status === 'late' ? 'bg-red-100 text-red-800' :
                  status.status === 'approaching' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {status.submitted ? 'Submitted' : status.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(status.deadline_local).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  timeZoneName: 'short'
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(status.period_start).toLocaleDateString()} - {new Date(status.period_end).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}