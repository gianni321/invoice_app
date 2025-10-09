import React, { useState, useEffect } from 'react';
import { Calendar, Copy, X, Users, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { api, getAuthHeaders } from '../config';

export function WeeklyReportModal({ onClose }) {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWeeklyReport();
  }, []);

  const fetchWeeklyReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(api.admin.weeklySummary(), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch weekly report');
      }

      const data = await response.json();
      setWeeklyData(data);
    } catch (err) {
      console.error('Error fetching weekly report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSlackReport = () => {
    if (!weeklyData) return '';

    const { period, categories, untagged, summary } = weeklyData;
    
    let report = `📊 Weekly Development Report (${period.description})\\n\\n`;
    report += `⏱️ Total Hours: ${summary.grand_total_hours}h\\n`;
    report += `� Tagged Categories: ${summary.total_categories}\\n\\n`;
    
    if (categories && categories.length > 0) {
      report += `📋 By Category:\\n`;
      categories.forEach(cat => {
        report += `  • ${cat.tag}: ${cat.total_hours}h (${cat.entry_count} entries)\\n`;
      });
      report += `\\n`;
    }
    
    if (untagged && untagged.entry_count > 0) {
      report += `⚠️ Untagged Entries: ${untagged.entry_count} entries (${untagged.total_hours}h)\\n`;
      untagged.entries.forEach(entry => {
        report += `  • ${entry.user}: ${entry.hours}h - ${entry.task}\\n`;
      });
    }
    
    return report;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatSlackReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading weekly report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Weekly Report</h2>
              <p className="text-gray-600">
                {weeklyData?.period?.description}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-700">Total Hours</h3>
                  <p className="text-3xl font-bold text-blue-600">{weeklyData?.summary?.grand_total_hours || 0}h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-700">Tagged Categories</h3>
                  <p className="text-3xl font-bold text-green-600">{weeklyData?.summary?.total_categories || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-700">Untagged Entries</h3>
                  <p className="text-3xl font-bold text-purple-600">{weeklyData?.untagged?.entry_count || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Categories Breakdown */}
          {weeklyData?.categories && weeklyData.categories.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">📋 Categories Breakdown</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {weeklyData.categories.map((category, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{category.tag}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{category.total_hours}h</td>
                        <td className="px-6 py-4 whitespace-nowrap">{category.entry_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Untagged Entries */}
          {weeklyData?.untagged && weeklyData.untagged.entry_count > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                ⚠️ Untagged Entries ({weeklyData.untagged.entry_count})
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="mb-3 text-sm text-gray-700">
                  Total untagged hours: <span className="font-medium">{weeklyData.untagged.total_hours}h</span>
                </div>
                <div className="space-y-2">
                  {weeklyData.untagged.entries.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                      <div>
                        <span className="font-medium">{entry.user}</span>
                        <span className="mx-2">•</span>
                        <span className="text-gray-600">{entry.task}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{entry.hours}h</div>
                        <div className="text-sm text-gray-500">{entry.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Copy to Slack */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">Share Report</h3>
                <p className="text-sm text-gray-600">Copy formatted report for Slack or other messaging</p>
              </div>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'Copied!' : 'Copy for Slack'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}