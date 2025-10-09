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
  const [analytics, setAnalytics] = useState({
    weeklyExpense: 0,
    activeMembers: 0,
    weeklyHours: 0,
    avgHourlyRate: 0,
    teamBurnRates: [],
    teamPerformance: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch analytics data from backend
      const [burnRatesRes, weeklyExpenseRes, teamMetricsRes] = await Promise.all([
        fetch(`${api.analytics.burnRates()}`, { headers: getAuthHeaders() }),
        fetch(`${api.analytics.weeklyExpenses()}`, { headers: getAuthHeaders() }),
        fetch(`${api.analytics.teamMetrics()}`, { headers: getAuthHeaders() })
      ]);

      const burnRates = await burnRatesRes.json();
      const weeklyExpense = await weeklyExpenseRes.json();
      const teamMetrics = await teamMetricsRes.json();

      // Calculate total weekly expense and hours
      const totalExpense = burnRates.reduce((sum, member) => sum + member.weeklyExpense, 0);
      const totalHours = burnRates.reduce((sum, member) => sum + member.hoursWorked, 0);
      const avgHourlyRate = totalHours > 0 ? totalExpense / totalHours : 0;

      setAnalytics({
        weeklyExpense: totalExpense,
        activeMembers: burnRates.length,
        weeklyHours: totalHours,
        avgHourlyRate: avgHourlyRate,
        teamBurnRates: burnRates,
        teamPerformance: teamMetrics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Fallback to demo data if API fails
      setAnalytics({
        weeklyExpense: 2450,
        activeMembers: 3,
        weeklyHours: 120,
        avgHourlyRate: 20.42,
        teamBurnRates: [
          { name: 'John Smith', weeklyExpense: 900, budgetUsed: 60, rate: 75 },
          { name: 'Sarah Johnson', weeklyExpense: 1100, budgetUsed: 80, rate: 80 },
          { name: 'Mike Chen', weeklyExpense: 450, budgetUsed: 95, rate: 65 }
        ],
        teamPerformance: [
          { name: 'John Smith', efficiency: 85, weeklyExpense: 900, hoursWorked: 12 },
          { name: 'Sarah Johnson', efficiency: 92, weeklyExpense: 1100, hoursWorked: 14 },
          { name: 'Mike Chen', efficiency: 78, weeklyExpense: 450, hoursWorked: 7 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-green-600">🎯 Analytics Dashboard</h2>
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-600">🎯 Analytics Dashboard</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Weekly Expense</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.weeklyExpense)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Active Members</h3>
              <p className="text-2xl font-bold text-green-600">{analytics.activeMembers}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-purple-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Total Hours Billed</h3>
              <p className="text-2xl font-bold text-purple-600">{analytics.weeklyHours}h</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-orange-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Avg Hourly Rate</h3>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(analytics.avgHourlyRate)}</p>
            </div>
            <Target className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>
      
      {/* Team Developer Metrics */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">�‍💻 Developer Performance</h3>
        <div className="space-y-4">
          {analytics.teamBurnRates.map((member, index) => {
            const hoursWorked = analytics.teamPerformance[index]?.hoursWorked || 0;
            const hourlyRate = member.rate;
            const progressPercentage = Math.min((hoursWorked / 40) * 100, 100);
            
            return (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">{member.name}</span>
                  <span className="text-sm text-gray-600 font-medium">{formatCurrency(member.weeklyExpense)} burn rate</span>
                </div>
                
                {/* Hours Progress Bar (0-40 scale) */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Hours Billed This Week</span>
                    <span className="text-sm font-bold text-blue-600">{hoursWorked}h / 40h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        hoursWorked >= 35 ? 'bg-green-500' : 
                        hoursWorked >= 25 ? 'bg-yellow-500' : 
                        hoursWorked >= 15 ? 'bg-blue-500' : 'bg-red-400'
                      }`}
                      style={{width: `${progressPercentage}%`}}
                    ></div>
                  </div>
                </div>
                
                {/* Key Metrics Row */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-600">{formatCurrency(hourlyRate)}</div>
                    <div className="text-gray-600">Hourly Rate</div>
                  </div>
                  <div className="text-center bg-green-50 p-2 rounded">
                    <div className="font-medium text-green-600">{hoursWorked}h</div>
                    <div className="text-gray-600">Hours Billed</div>
                  </div>
                  <div className="text-center bg-orange-50 p-2 rounded">
                    <div className="font-medium text-orange-600">{member.budgetUsed}%</div>
                    <div className="text-gray-600">Budget Used</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Weekly Summary */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">� Weekly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {analytics.teamPerformance.map((member, index) => {
            const hourlyRate = analytics.teamBurnRates[index]?.rate || 0;
            const burnRate = analytics.teamBurnRates[index]?.weeklyExpense || 0;
            
            return (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-3">{member.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hours Billed:</span>
                    <span className="font-bold text-blue-600">{member.hoursWorked}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hourly Rate:</span>
                    <span className="font-bold text-green-600">{formatCurrency(hourlyRate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Weekly Burn:</span>
                    <span className="font-bold text-orange-600">{formatCurrency(burnRate)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Earned:</span>
                      <span className="font-bold text-purple-600">{formatCurrency(member.weeklyExpense)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}