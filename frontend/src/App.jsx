import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Clock, Download, Lock, Home, Plus, Trash2, PencilLine, Check, X, FileText, CheckCircle, DollarSign, AlertCircle } from 'lucide-react';
import { api, getAuthHeaders, setAuthToken, clearAuthToken } from './config';

// Format currency
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function InvoiceModal({ invoice, entries, onClose, onDownload }) {
  const invEntries = entries.filter(e => invoice.entryIds.includes(e.id));
  
  const groupedByDate = {};
  invEntries.forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString();
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(e);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return new Date(groupedByDate[b][0].date) - new Date(groupedByDate[a][0].date);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Invoice Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{invoice.userName}</h3>
                <p className="text-gray-600">{new Date(invoice.date).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold text-indigo-600">{fmt.format(invoice.total)}</p>
            </div>
          </div>

          <h4 className="font-bold mb-3">Time Entries</h4>
          <div className="space-y-4">
            {sortedDates.map(dateKey => {
              const dateEntries = groupedByDate[dateKey];
              const dayTotal = dateEntries.reduce((sum, e) => sum + (e.hours * e.rate), 0);
              const dayHours = dateEntries.reduce((sum, e) => sum + e.hours, 0);
              
              return (
                <div key={dateKey} className="border rounded-lg overflow-hidden">
                  <div className="bg-indigo-50 px-4 py-2 flex justify-between items-center">
                    <span className="font-semibold text-indigo-900">{dateKey}</span>
                    <span className="text-sm text-indigo-700">{dayHours}h • {fmt.format(dayTotal)}</span>
                  </div>
                  <div className="divide-y">
                    {dateEntries.map(e => (
                      <div key={e.id} className="p-3 bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{e.hours}h • {e.task}</div>
                            {e.notes && <div className="text-sm text-gray-600 mt-1">{e.notes}</div>}
                          </div>
                          <div className="text-green-600 font-semibold ml-4">{fmt.format(e.hours * e.rate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  console.log('App component rendering');
  const [user, setUser] = useState(null);
  const [isAdmin, setAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [entries, setEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ 
    hours: '', 
    task: '', 
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [edit, setEdit] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const fetchData = async () => {
    try {
      const [entriesResponse, invoicesResponse] = await Promise.all([
        fetch(api.entries.list(), { headers: getAuthHeaders() }),
        fetch(api.invoices.list(), { headers: getAuthHeaders() })
      ]);

      if (!entriesResponse.ok || !invoicesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const entriesData = await entriesResponse.json();
      const invoicesData = await invoicesResponse.json();

      setEntries(entriesData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    }
  };

  const login = useCallback(async () => {
    try {
      const response = await fetch(`${api.auth.login()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setAuthToken(data.token);
      setUser(data.user);
      setAdmin(data.user.role === 'admin');
      setPin('');
      setErr('');
      
      // Fetch initial data after successful login
      await fetchData();
    } catch (error) {
      console.error('Login error:', error);
      setErr('Invalid PIN');
    }
  }, [pin]);

  const logout = () => {
    setUser(null);
    setAdmin(false);
    setPin('');
    setErr('');
  };

  const addEntry = async () => {
    if (!form.hours || !form.task || !form.date) return;
    try {
      const response = await fetch(api.entries.create(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hours: Number(form.hours),
          task: form.task,
          notes: form.notes,
          date: new Date(form.date).toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      const newEntry = await response.json();
      setEntries([newEntry, ...entries]);
      setForm({ 
        hours: '', 
        task: '', 
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Failed to add entry');
    }
  };

  const delEntry = async id => {
    const entry = entries.find(e => e.id === id);
    if (entry?.invoiceId) return alert('Cannot delete invoiced entry');
    if (!confirm('Delete?')) return;

    try {
      const response = await fetch(api.entries.delete(id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const saveEntry = async () => {
    if (edit.invoiceId) return alert('Cannot edit invoiced entry');
    
    try {
      const response = await fetch(api.entries.update(edit.id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hours: Number(edit.hours),
          task: edit.task,
          notes: edit.notes,
          date: edit.date
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update entry');
      }

      const updatedEntry = await response.json();
      setEntries(entries.map(e => e.id === edit.id ? updatedEntry : e));
      setEdit(null);
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    }
  };

  const submit = async () => {
    const openEntries = entries.filter(e => e.userId === user.id && !e.invoiceId);
    if (!openEntries.length) return alert('No open entries');

    try {
      const response = await fetch(api.invoices.submit(), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to submit invoice');
      }

      const invoice = await response.json();
      const updatedEntries = entries.map(e => 
        openEntries.find(oe => oe.id === e.id) 
          ? {...e, invoiceId: invoice.id} 
          : e
      );
      
      setEntries(updatedEntries);
      setInvoices([invoice, ...invoices]);
      alert('Invoice submitted successfully!');
    } catch (error) {
      console.error('Error submitting invoice:', error);
      alert('Failed to submit invoice');
    }
  };

  const approve = async id => {
    try {
      const response = await fetch(api.invoices.approve(id), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to approve invoice');
      }

      const updatedInvoice = await response.json();
      setInvoices(invoices.map(i => i.id === id ? updatedInvoice : i));
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert('Failed to approve invoice');
    }
  };

  const markPaid = async id => {
    try {
      const response = await fetch(api.invoices.markPaid(id), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid');
      }

      const updatedInvoice = await response.json();
      setInvoices(invoices.map(i => i.id === id ? updatedInvoice : i));
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid');
    }
  };

  const download = inv => {
    const invEntries = entries.filter(e => inv.entryIds.includes(e.id));
    const csv = [
      `Invoice for ${inv.userName}`,
      `Date,Hours,Task,Notes,Rate,Amount`,
      ...invEntries.map(e => `${new Date(e.date).toLocaleDateString()},${e.hours},${e.task},${e.notes},${e.rate},${e.hours * e.rate}`),
      `,,,,Total,${inv.total}`
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = inv => {
    const invEntries = entries.filter(e => inv.entryIds.includes(e.id));
    
    const groupedByDate = {};
    invEntries.forEach(e => {
      const dateKey = new Date(e.date).toLocaleDateString();
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(e);
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
      return new Date(groupedByDate[b][0].date) - new Date(groupedByDate[a][0].date);
    });

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${inv.userName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1f2937; font-size: 32px; }
            .header .subtitle { color: #6b7280; margin-top: 5px; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .info-label { color: #6b7280; font-weight: 600; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-paid { background: #e9d5ff; color: #6b21a8; }
            .total-section { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; }
            .total-amount { font-size: 36px; font-weight: bold; color: #059669; text-align: right; }
            .date-group { margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .date-header { background: #eef2ff; padding: 12px 16px; font-weight: 600; color: #4338ca; display: flex; justify-content: space-between; }
            .entry { padding: 12px 16px; border-top: 1px solid #e5e7eb; }
            .entry:first-child { border-top: none; }
            .entry-task { font-weight: 600; color: #1f2937; }
            .entry-notes { color: #6b7280; font-size: 14px; margin-top: 4px; }
            .entry-amount { color: #059669; font-weight: 600; float: right; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <div class="subtitle">Invoice for ${inv.userName}</div>
          </div>

          <div class="info-row">
            <div>
              <div class="info-label">Invoice Date</div>
              <div>${new Date(inv.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="info-label">Status</div>
              <span class="status status-${inv.status}">${inv.status}</span>
            </div>
          </div>

          <div class="total-section">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="info-label" style="font-size: 18px;">Total Amount</div>
              <div class="total-amount">${fmt.format(inv.total)}</div>
            </div>
          </div>

          <h2 style="margin-top: 30px; margin-bottom: 20px;">Time Entries</h2>
          
          ${sortedDates.map(dateKey => {
            const dateEntries = groupedByDate[dateKey];
            const dayTotal = dateEntries.reduce((sum, e) => sum + (e.hours * e.rate), 0);
            const dayHours = dateEntries.reduce((sum, e) => sum + e.hours, 0);
            
            return `
              <div class="date-group">
                <div class="date-header">
                  <span>${dateKey}</span>
                  <span>${dayHours}h • ${fmt.format(dayTotal)}</span>
                </div>
                ${dateEntries.map(e => `
                  <div class="entry">
                    <div class="entry-task">${e.hours}h • ${e.task} <span class="entry-amount">${fmt.format(e.hours * e.rate)}</span></div>
                    ${e.notes ? `<div class="entry-notes">${e.notes}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}

          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">Print / Save as PDF</button>
            <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const myEntries = useMemo(() => entries.filter(e => e.userId === user?.id), [entries, user]);
  const openEntries = useMemo(() => myEntries.filter(e => !e.invoiceId), [myEntries]);
  const myInvoices = useMemo(() => invoices.filter(i => i.userId === user?.id), [invoices, user]);
  const pendingInv = useMemo(() => myInvoices.filter(i => i.status === 'pending'), [myInvoices]);
  const approvedInv = useMemo(() => myInvoices.filter(i => i.status === 'approved' || i.status === 'paid'), [myInvoices]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-6" style={{ minHeight: '200px' }}>
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Time Tracker</h1>
            <p className="text-gray-600">Enter PIN</p>
          </div>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && login()}
            className="w-full px-4 py-3 text-center text-2xl border-2 rounded-lg mb-4"
            placeholder="••••"
            maxLength={4}
          />
          {err && <p className="text-red-600 text-sm mb-4">{err}</p>}
          <button onClick={login} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700">
            Login
          </button>
          <p className="text-xs text-gray-500 text-center mt-4">Demo: 1234, 5678, 9012 | Admin: 0000</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <button onClick={logout} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Home size={20} /> Logout
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-xl">
              <AlertCircle className="text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'pending').length}</p>
              <p className="text-sm">Pending</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <CheckCircle className="text-green-600 mb-2" />
              <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'approved').length}</p>
              <p className="text-sm">Approved</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl">
              <DollarSign className="text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{invoices.filter(i => i.status === 'paid').length}</p>
              <p className="text-sm">Paid</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-500">No invoices</p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className={`border-l-4 p-4 mb-4 rounded ${
                  inv.status === 'pending' ? 'border-yellow-500 bg-yellow-50' :
                  inv.status === 'approved' ? 'border-green-500 bg-green-50' :
                  'border-purple-500 bg-purple-50'
                }`}>
                  <div className="flex justify-between mb-2">
                    <div>
                      <h3 className="font-bold">{inv.userName}</h3>
                      <p className="text-sm text-gray-600">{new Date(inv.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{fmt.format(inv.total)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs h-fit ${
                      inv.status === 'pending' ? 'bg-yellow-200' :
                      inv.status === 'approved' ? 'bg-green-200' : 'bg-purple-200'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setViewInvoice(inv)} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">
                      View
                    </button>
                    <button onClick={() => download(inv)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                      <Download size={14} className="inline" /> CSV
                    </button>
                    <button onClick={() => downloadPDF(inv)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">
                      <FileText size={14} className="inline" /> PDF
                    </button>
                    {inv.status === 'pending' && (
                      <button onClick={() => approve(inv.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                        Approve
                      </button>
                    )}
                    {inv.status === 'approved' && (
                      <button onClick={() => markPaid(inv.id)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {viewInvoice && (
          <InvoiceModal invoice={viewInvoice} entries={entries} onClose={() => setViewInvoice(null)} onDownload={download} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
            <p className="text-gray-600">Rate: {fmt.format(user.rate)}/hr</p>
          </div>
          <button onClick={logout} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Logout</button>
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="text-blue-600" /> New Entry
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                <input
                  type="text"
                  value={form.task}
                  onChange={e => setForm({ ...form, task: e.target.value })}
                  placeholder="Task"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <button onClick={addEntry} className="w-full bg-blue-600 text-white py-2 rounded-lg">
                <Clock size={20} className="inline mr-2" /> Log Time
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl">
              <h3 className="font-bold mb-2">Current Week</h3>
              <p className="text-3xl font-bold text-blue-600">
                {openEntries.reduce((s, e) => s + e.hours, 0).toFixed(1)} hrs
              </p>
              <p className="text-lg text-green-600">
                {fmt.format(openEntries.reduce((s, e) => s + e.hours * e.rate, 0))}
              </p>
              <button onClick={submit} className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg">
                <FileText size={16} className="inline mr-2" /> Submit Invoice
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <h3 className="font-bold mb-2">Pending ({pendingInv.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingInv.map(inv => (
                  <div key={inv.id} className="border rounded p-2 bg-yellow-50">
                    <div className="flex justify-between">
                      <span className="text-sm">{new Date(inv.date).toLocaleDateString()}</span>
                      <span className="text-xs px-2 py-1 bg-yellow-200 rounded">{inv.status}</span>
                    </div>
                    <button onClick={() => setViewInvoice(inv)} className="text-blue-600 text-xs mt-1">View</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl mb-4">
          <h2 className="text-xl font-bold mb-4">Open Entries ({openEntries.length})</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(() => {
              const groupedByDate = {};
              openEntries.forEach(e => {
                const dateKey = new Date(e.date).toLocaleDateString();
                if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
                groupedByDate[dateKey].push(e);
              });

              const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                return new Date(groupedByDate[b][0].date) - new Date(groupedByDate[a][0].date);
              });

              return sortedDates.map(dateKey => {
                const dateEntries = groupedByDate[dateKey];
                const dayTotal = dateEntries.reduce((sum, e) => sum + (e.hours * e.rate), 0);
                const dayHours = dateEntries.reduce((sum, e) => sum + e.hours, 0);
                
                return (
                  <div key={dateKey} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 flex justify-between items-center">
                      <span className="font-semibold text-blue-900">{dateKey}</span>
                      <span className="text-sm text-blue-700">{dayHours}h • {fmt.format(dayTotal)}</span>
                    </div>
                    <div className="divide-y">
                      {dateEntries.map(e => (
                        edit?.id === e.id ? (
                          <div key={e.id} className="p-3 bg-blue-50">
                            <div className="space-y-2">
                              <input
                                type="number"
                                step="0.25"
                                value={edit.hours}
                                onChange={ev => setEdit({ ...edit, hours: ev.target.value })}
                                className="w-full px-2 py-1 border rounded"
                              />
                              <input
                                type="text"
                                value={edit.task}
                                onChange={ev => setEdit({ ...edit, task: ev.target.value })}
                                className="w-full px-2 py-1 border rounded"
                              />
                              <textarea
                                value={edit.notes}
                                onChange={ev => setEdit({ ...edit, notes: ev.target.value })}
                                className="w-full px-2 py-1 border rounded"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <button onClick={saveEntry} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                                  <Check size={14} className="inline" /> Save
                                </button>
                                <button onClick={() => setEdit(null)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                                  <X size={14} className="inline" /> Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={e.id} className="p-3 bg-white">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{e.hours}h • {e.task}</div>
                                {e.notes && <div className="text-sm text-gray-600 mt-1">{e.notes}</div>}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <div className="text-green-600 font-semibold">{fmt.format(e.hours * e.rate)}</div>
                                <button onClick={() => setEdit(e)} className="text-blue-600 hover:text-blue-800">
                                  <PencilLine size={16} />
                                </button>
                                <button onClick={() => delEntry(e.id)} className="text-red-600 hover:text-red-800">
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
              });
            })()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4">My Invoices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {myInvoices.length === 0 ? (
              <p className="text-gray-500 col-span-2">No invoices yet</p>
            ) : (
              myInvoices.map(inv => (
                <div key={inv.id} className={`border-l-4 p-4 rounded ${
                  inv.status === 'pending' ? 'border-yellow-500 bg-yellow-50' :
                  inv.status === 'approved' ? 'border-green-500 bg-green-50' :
                  'border-purple-500 bg-purple-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-gray-600">{new Date(inv.date).toLocaleDateString()}</p>
                      <p className="text-2xl font-bold">{fmt.format(inv.total)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      inv.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                      inv.status === 'approved' ? 'bg-green-200 text-green-800' :
                      'bg-purple-200 text-purple-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <button onClick={() => setViewInvoice(inv)} className="text-blue-600 text-sm hover:underline">
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} entries={entries} onClose={() => setViewInvoice(null)} onDownload={download} />
      )}
    </div>
  );
}