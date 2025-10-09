import React from 'react';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">
          View team performance, billing rates, and project metrics
        </p>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
}