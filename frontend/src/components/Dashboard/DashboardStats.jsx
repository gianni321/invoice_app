import React from 'react';
import { FileText, DollarSign } from 'lucide-react';

const DashboardStats = ({ 
  openEntries, 
  pendingInvoices, 
  approvedInvoices, 
  user, 
  onSubmitInvoice 
}) => {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  
  const totalHours = openEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  const totalAmount = openEntries.reduce((sum, e) => sum + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);

  return (
    <div className="space-y-4">
      {/* Current Week Stats */}
      <div className="bg-white p-4 rounded-xl">
        <h3 className="font-bold mb-2">Current Week</h3>
        <p className="text-3xl font-bold text-blue-600">
          {totalHours.toFixed(1)} hrs
        </p>
        <p className="text-lg text-green-600">
          {fmt.format(totalAmount)}
        </p>
        <button 
          onClick={onSubmitInvoice} 
          className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <FileText size={16} />
          Submit Invoice
        </button>
      </div>

      {/* Submitted Invoices */}
      <div className="bg-white p-4 rounded-xl">
        <h3 className="font-bold mb-2">Submitted ({pendingInvoices.length})</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {pendingInvoices.map(invoice => (
            <div key={invoice.id} className="border rounded p-2 bg-yellow-50">
              <div className="flex justify-between">
                <span className="text-sm">{new Date(invoice.date).toLocaleDateString()}</span>
                <span className="text-xs px-2 py-1 bg-yellow-200 rounded">{invoice.status}</span>
              </div>
              <div className="text-sm font-medium">{fmt.format(invoice.total)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Invoices */}
      <div className="bg-white p-4 rounded-xl">
        <h3 className="font-bold mb-2">Approved ({approvedInvoices.length})</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {approvedInvoices.map(invoice => (
            <div key={invoice.id} className="border rounded p-2 bg-green-50">
              <div className="flex justify-between">
                <span className="text-sm">{new Date(invoice.date).toLocaleDateString()}</span>
                <span className="text-xs px-2 py-1 bg-green-200 rounded">{invoice.status}</span>
              </div>
              <div className="text-sm font-medium">{fmt.format(invoice.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
