import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Clock, 
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Move,
  GripVertical
} from 'lucide-react';
import { api, getAuthHeaders } from '../config';

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-600">🎯 Analytics Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-bold">Weekly Expense</h3>
          <p className="text-2xl">$2,450</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-bold">Active Members</h3>
          <p className="text-2xl">5</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-bold">Weekly Hours</h3>
          <p className="text-2xl">180h</p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg">
          <h3 className="font-bold">Avg Burn Rate</h3>
          <p className="text-2xl">75%</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">🔥 Team Burn Rates</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>John Smith</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '60%'}}></div>
              </div>
              <span className="text-sm">60%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Sarah Johnson</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: '80%'}}></div>
              </div>
              <span className="text-sm">80%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Mike Chen</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{width: '95%'}}></div>
              </div>
              <span className="text-sm">95%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">📊 Team Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium">John Smith</h4>
            <p className="text-sm text-gray-600">Efficiency: 85%</p>
            <p className="text-sm text-gray-600">Revenue: $1,200</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium">Sarah Johnson</h4>
            <p className="text-sm text-gray-600">Efficiency: 92%</p>
            <p className="text-sm text-gray-600">Revenue: $1,580</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium">Mike Chen</h4>
            <p className="text-sm text-gray-600">Efficiency: 78%</p>
            <p className="text-sm text-gray-600">Revenue: $950</p>
          </div>
        </div>
      </div>
    </div>
  );
}