import React from 'react';
import { AdminPanel } from '../components/AdminPanel';

export function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">
          Manage users, settings, and system configuration
        </p>
      </div>
      
      <AdminPanel />
    </div>
  );
}