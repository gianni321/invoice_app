import React, { useState, useEffect } from 'react';
import { Settings, Tag, Building, Users, Save, Plus, Edit, Trash2, X, Check, BarChart3, ClipboardCopy, FileText, Calendar } from 'lucide-react';
import { api, getAuthHeaders } from '../config';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [tags, setTags] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6', description: '' });

  // Fetch data on component mount
  useEffect(() => {
    fetchTags();
    fetchCompanySettings();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch(api.admin.tags(), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch(api.admin.settings(), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCompanySettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${api.base}/api/admin/weekly-summary`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setWeeklyData(data);
      } else {
        setError('Failed to fetch weekly summary');
      }
    } catch (err) {
      console.error('Error fetching weekly summary:', err);
      setError('Error fetching weekly summary');
    } finally {
      setLoading(false);
    }
  };

  const saveTag = async (tagData) => {
    try {
      setLoading(true);
      setError('');
      
      const url = tagData.id ? api.admin.tagUpdate(tagData.id) : api.admin.tagCreate();
      const method = tagData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(tagData)
      });

      if (response.ok) {
        setSuccess(tagData.id ? 'Tag updated successfully!' : 'Tag created successfully!');
        await fetchTags();
        setEditingTag(null);
        setNewTag({ name: '', color: '#3B82F6', description: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save tag');
      }
    } catch (err) {
      setError('Error saving tag: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTag = async (tagId) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(api.admin.tagDelete(tagId), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Tag deleted successfully!');
        await fetchTags();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete tag');
      }
    } catch (err) {
      setError('Error deleting tag: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Convert settings object to the format expected by the API
      const settingsToSave = {};
      Object.keys(companySettings).forEach(key => {
        settingsToSave[key] = companySettings[key].value;
      });
      
      const response = await fetch(api.admin.settingsUpdate(), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings: settingsToSave })
      });

      if (response.ok) {
        setSuccess('Company settings saved successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCompanySetting = (key, value) => {
    setCompanySettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }));
  };

  const copyToSlack = () => {
    if (!weeklyData) return;
    
    let slackText = '```\nWeekly Team Summary - ' + weeklyData.period.description + '\n\n';
    
    // Add categorized entries
    if (weeklyData.categories.length > 0) {
      slackText += 'Hours | Activity | Notes | User\n';
      slackText += '------|----------|-------|-----\n';
      
      weeklyData.categories.forEach(category => {
        slackText += `\n** ${category.tag.toUpperCase()} (${category.total_hours}h) **\n`;
        category.entries.forEach(entry => {
          const hours = entry.hours.toFixed(1);
          const task = entry.task.length > 30 ? entry.task.substring(0, 27) + '...' : entry.task;
          const notes = entry.notes.length > 20 ? entry.notes.substring(0, 17) + '...' : entry.notes;
          slackText += `${hours} | ${task} | ${notes} | ${entry.user}\n`;
        });
      });
    }
    
    // Add untagged entries if any
    if (weeklyData.untagged.entry_count > 0) {
      slackText += `\n** UNTAGGED (${weeklyData.untagged.total_hours}h) **\n`;
      weeklyData.untagged.entries.slice(0, 10).forEach(entry => {
        const hours = entry.hours.toFixed(1);
        const task = entry.task.length > 30 ? entry.task.substring(0, 27) + '...' : entry.task;
        const notes = entry.notes.length > 20 ? entry.notes.substring(0, 17) + '...' : entry.notes;
        slackText += `${hours} | ${task} | ${notes} | ${entry.user}\n`;
      });
      if (weeklyData.untagged.entry_count > 10) {
        slackText += `... and ${weeklyData.untagged.entry_count - 10} more untagged entries\n`;
      }
    }
    
    slackText += `\nTOTAL: ${weeklyData.summary.grand_total_hours.toFixed(1)} hours`;
    slackText += '\n```';
    
    // Copy to clipboard
    navigator.clipboard.writeText(slackText).then(() => {
      setSuccess('Weekly summary copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'weekly', label: 'Weekly Summary', icon: FileText },
    { id: 'tags', label: 'Tag Management', icon: Tag },
    { id: 'company', label: 'Company Info', icon: Building },
    { id: 'users', label: 'User Management', icon: Users }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
          )}

          {activeTab === 'weekly' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Weekly Team Summary</h3>
                  <p className="text-gray-600">Generate Slack-formatted weekly reports for team activities</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={fetchWeeklySummary}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Calendar size={16} />
                    {loading ? 'Loading...' : 'Refresh Data'}
                  </button>
                  {weeklyData && (
                    <button
                      onClick={copyToSlack}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <ClipboardCopy size={16} />
                      Copy for Slack
                    </button>
                  )}
                </div>
              </div>

              {weeklyData ? (
                <div className="space-y-6">
                  {/* Period Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Report Period</h4>
                    <p className="text-blue-700">{weeklyData.period.description}</p>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Total Hours:</span>
                        <span className="font-bold ml-2">{weeklyData.summary.grand_total_hours.toFixed(1)}h</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Categories:</span>
                        <span className="font-bold ml-2">{weeklyData.summary.total_categories}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Untagged:</span>
                        <span className="font-bold ml-2">{weeklyData.untagged.total_hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  {weeklyData.categories.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Categorized Activities</h4>
                      {weeklyData.categories.map((category, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-lg text-gray-800">
                              {category.tag.toUpperCase()}
                            </h5>
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                              {category.total_hours.toFixed(1)}h ({category.entry_count} entries)
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Hours</th>
                                  <th className="text-left py-2">Activity</th>
                                  <th className="text-left py-2">Notes</th>
                                  <th className="text-left py-2">User</th>
                                  <th className="text-left py-2">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {category.entries.map((entry, entryIndex) => (
                                  <tr key={entryIndex} className="border-b border-gray-100">
                                    <td className="py-2 font-medium">{entry.hours.toFixed(1)}</td>
                                    <td className="py-2">{entry.task}</td>
                                    <td className="py-2 text-gray-600">{entry.notes || '—'}</td>
                                    <td className="py-2">{entry.user}</td>
                                    <td className="py-2 text-gray-500">{new Date(entry.date + 'T12:00:00').toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Untagged Entries */}
                  {weeklyData.untagged.entry_count > 0 && (
                    <div className="border rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-lg text-orange-800">
                          UNTAGGED ENTRIES
                        </h5>
                        <span className="bg-orange-100 px-3 py-1 rounded-full text-sm font-medium text-orange-800">
                          {weeklyData.untagged.total_hours.toFixed(1)}h ({weeklyData.untagged.entry_count} entries)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Hours</th>
                              <th className="text-left py-2">Activity</th>
                              <th className="text-left py-2">Notes</th>
                              <th className="text-left py-2">User</th>
                              <th className="text-left py-2">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyData.untagged.entries.map((entry, entryIndex) => (
                              <tr key={entryIndex} className="border-b border-gray-100">
                                <td className="py-2 font-medium">{entry.hours.toFixed(1)}</td>
                                <td className="py-2">{entry.task}</td>
                                <td className="py-2 text-gray-600">{entry.notes || '—'}</td>
                                <td className="py-2">{entry.user}</td>
                                <td className="py-2 text-gray-500">{new Date(entry.date + 'T12:00:00').toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {weeklyData.untagged.entry_count > weeklyData.untagged.entries.length && (
                        <p className="text-orange-700 mt-2 text-sm">
                          Showing first {weeklyData.untagged.entries.length} of {weeklyData.untagged.entry_count} untagged entries
                        </p>
                      )}
                    </div>
                  )}

                  {/* No Data Message */}
                  {weeklyData.categories.length === 0 && weeklyData.untagged.entry_count === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No time entries found for this week.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Click "Refresh Data" to load the current week's summary</p>
                  <button
                    onClick={fetchWeeklySummary}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Loading...' : 'Load Weekly Summary'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Manage Tags</h3>
                <button
                  onClick={() => setEditingTag('new')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add Tag
                </button>
              </div>

              {/* New/Edit Tag Form */}
              {editingTag && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">
                    {editingTag === 'new' ? 'Create New Tag' : 'Edit Tag'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={editingTag === 'new' ? newTag.name : editingTag.name}
                        onChange={(e) => {
                          if (editingTag === 'new') {
                            setNewTag(prev => ({ ...prev, name: e.target.value }));
                          } else {
                            setEditingTag(prev => ({ ...prev, name: e.target.value }));
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Tag name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingTag === 'new' ? newTag.color : editingTag.color}
                          onChange={(e) => {
                            if (editingTag === 'new') {
                              setNewTag(prev => ({ ...prev, color: e.target.value }));
                            } else {
                              setEditingTag(prev => ({ ...prev, color: e.target.value }));
                            }
                          }}
                          className="w-12 h-10 border rounded"
                        />
                        <input
                          type="text"
                          value={editingTag === 'new' ? newTag.color : editingTag.color}
                          onChange={(e) => {
                            if (editingTag === 'new') {
                              setNewTag(prev => ({ ...prev, color: e.target.value }));
                            } else {
                              setEditingTag(prev => ({ ...prev, color: e.target.value }));
                            }
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <input
                        type="text"
                        value={editingTag === 'new' ? newTag.description : editingTag.description}
                        onChange={(e) => {
                          if (editingTag === 'new') {
                            setNewTag(prev => ({ ...prev, description: e.target.value }));
                          } else {
                            setEditingTag(prev => ({ ...prev, description: e.target.value }));
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Tag description"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveTag(editingTag === 'new' ? newTag : editingTag)}
                      disabled={loading}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {editingTag === 'new' ? 'Create' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTag(null);
                        setNewTag({ name: '', color: '#3B82F6', description: '' });
                      }}
                      className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Tags List */}
              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <div>
                        <div className="font-medium">{tag.name}</div>
                        {tag.description && (
                          <div className="text-sm text-gray-600">{tag.description}</div>
                        )}
                      </div>
                      {!tag.is_active && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Company Information</h3>
                <button
                  onClick={saveCompanySettings}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  Save Settings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Company Details</h4>
                  
                  {['company_name', 'company_phone', 'company_email', 'company_website'].map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">
                        {companySettings[key]?.description || key.replace('company_', '').replace('_', ' ')}
                      </label>
                      <input
                        type="text"
                        value={companySettings[key]?.value || ''}
                        onChange={(e) => updateCompanySetting(key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder={companySettings[key]?.description}
                      />
                    </div>
                  ))}
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Address</h4>
                  
                  {['company_address_line1', 'company_address_line2', 'company_city', 'company_state', 'company_zip', 'company_country'].map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">
                        {companySettings[key]?.description || key.replace('company_', '').replace('_', ' ')}
                      </label>
                      <input
                        type="text"
                        value={companySettings[key]?.value || ''}
                        onChange={(e) => updateCompanySetting(key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder={companySettings[key]?.description}
                      />
                    </div>
                  ))}
                </div>

                {/* Invoice Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Invoice Settings</h4>
                  
                  {['invoice_prefix', 'default_rate', 'currency_symbol', 'timezone'].map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">
                        {companySettings[key]?.description || key.replace('_', ' ')}
                      </label>
                      <input
                        type={companySettings[key]?.type === 'number' ? 'number' : 'text'}
                        value={companySettings[key]?.value || ''}
                        onChange={(e) => updateCompanySetting(key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder={companySettings[key]?.description}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">User management features coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}