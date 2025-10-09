import React from 'react';
import { Plus } from 'lucide-react';
import TimeEntryForm from '../TimeEntry/TimeEntryForm';
import TimeEntryList from '../TimeEntry/TimeEntryList';
import DashboardStats from '../Dashboard/DashboardStats';

const UserDashboard = ({ 
  user,
  openEntries,
  pendingInvoices,
  approvedInvoices,
  availableTags,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSubmitInvoice,
  onEditEntry,
  editingEntry,
  loading
}) => {
  return (
    <div className="space-y-6">
      {/* Time Entry Form */}
      <TimeEntryForm 
        onSubmit={onAddEntry}
        availableTags={availableTags}
        loading={loading}
      />
      
      {/* Dashboard Stats */}
      <DashboardStats
        openEntries={openEntries}
        pendingInvoices={pendingInvoices}
        approvedInvoices={approvedInvoices}
        user={user}
        onSubmitInvoice={onSubmitInvoice}
      />

      {/* Time Entries List */}
      <TimeEntryList
        entries={openEntries}
        onEdit={onEditEntry}
        onDelete={onDeleteEntry}
        onSave={onUpdateEntry}
        editingId={editingEntry}
        availableTags={availableTags}
        user={user}
      />
    </div>
  );
};

export default UserDashboard;
