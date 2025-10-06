import React, { useState } from 'react';
import { api, getAuthHeaders } from '../config';
import { X, FileText, Upload, Eye, Check } from 'lucide-react';

export function BatchTimeEntry({ onClose, onSuccess }) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const handlePreview = async () => {
    try {
      setError(null);
      const response = await fetch(api.entries.batchPreview(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mode: 'deterministic',
          input: { kind: 'text', data: input }
        })
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const result = await response.json();
      setPreview(result);
    } catch (err) {
      setError('Failed to preview entries');
      console.error('Preview error:', err);
    }
  };

  const handleImport = async () => {
    if (!preview?.rows?.length) return;
    
    try {
      setImporting(true);
      setError(null);

      const validRows = preview.rows
        .filter(r => r.valid)
        .map(r => r.parsed);

      if (!validRows.length) {
        setError('No valid entries to import');
        return;
      }

      const response = await fetch(api.entries.batchImport(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          rows: validRows
        })
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError('Failed to import entries');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setInput(text);
    } catch (err) {
      setError('Failed to read file');
      console.error('File read error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Batch Add Time Entries</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block font-medium mb-2">Enter Time Entries</label>
            <div className="space-y-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Format examples:&#10;2h, Bug fix, Fixed issue #123&#10;2025-10-06, 1.5, Task name, Optional notes&#10;3h | Meeting | Sprint planning"
                rows={8}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <FileText size={16} />
                  <span>Upload CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Eye size={16} />
                  Preview
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded">
                  Valid: {preview.summary.valid}
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded">
                  Invalid: {preview.summary.invalid}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.rows.map(row => (
                      <tr key={row.line} className={row.valid ? '' : 'bg-red-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.line}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.parsed?.date || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.parsed?.hours || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.parsed?.task || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.parsed?.notes || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {row.valid ? (
                            <span className="text-green-600">
                              <Check size={16} className="inline" />
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.summary.valid > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {importing ? 'Importing...' : `Import ${preview.summary.valid} Entries`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}