import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useToast } from './Toast/ToastProvider';
import { LoadingSpinner } from './Loading';
import { formatDate } from '../utils/date';

/**
 * @typedef {Object} AnalyticsData
 * @property {number} weeklyExpense - Total weekly expense
 * @property {number} activeMembers - Number of active team members
 * @property {number} weeklyHours - Total weekly hours
 * @property {number} avgHourlyRate - Average hourly rate
 * @property {Array} teamBurnRates - Team burn rate data
 * @property {Array} teamPerformance - Team performance metrics
 */

/**
 * Analytics dashboard component for displaying team metrics and insights
 * Optimized with React.memo and performance improvements
 * @returns {JSX.Element}
 */
export const AnalyticsDashboard = React.memo(function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({
    weeklyExpense: 0,
    activeMembers: 0,
    weeklyHours: 0,
    avgHourlyRate: 0,
    teamBurnRates: [],
    teamPerformance: []
  });
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  /**
   * Fetch analytics data from API
   * Memoized to prevent unnecessary re-renders
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch analytics data from backend
      const [burnRatesRes, weeklyExpenseRes, teamMetricsRes] = await Promise.all([
        fetch(`${api.analytics.burnRates()}`, { headers: getAuthHeaders() }),
        fetch(`${api.analytics.weeklyExpenses()}`, { headers: getAuthHeaders() }),
        fetch(`${api.analytics.teamMetrics()}`, { headers: getAuthHeaders() })
      ]);

      if (!burnRatesRes.ok || !weeklyExpenseRes.ok || !teamMetricsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const burnRates = await burnRatesRes.json();
      const weeklyExpense = await weeklyExpenseRes.json();
      const teamMetrics = await teamMetricsRes.json();

      // Calculate total weekly expense and hours
      const totalExpense = burnRates.reduce((sum, member) => sum + member.actualSpend, 0);
      const totalHours = burnRates.reduce((sum, member) => sum + member.totalHours, 0);
      const avgHourlyRate = totalHours > 0 ? totalExpense / totalHours : 0;

      // Merge team data by name to avoid index misalignment
      const mergedTeamData = burnRates.map(burnRate => {
        const performance = teamMetrics.find(tm => tm.name === burnRate.name) || {};
        return {
          ...burnRate,
          hoursWorked: performance.totalHours || burnRate.totalHours || 0,
          efficiency: performance.efficiency || 0
        };
      });

      setAnalytics({
        weeklyExpense: totalExpense,
        activeMembers: burnRates.length,
        weeklyHours: totalHours,
        avgHourlyRate: avgHourlyRate,
        teamBurnRates: mergedTeamData,
        teamPerformance: teamMetrics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
      // Fallback to demo data if API fails
      setAnalytics({
        weeklyExpense: 2450,
        activeMembers: 3,
        weeklyHours: 33,
        avgHourlyRate: 74.24, // Realistic rate: 2450 / 33 hours
        teamBurnRates: [
          { name: 'John Smith', actualSpend: 900, totalHours: 12, budgetUsed: 60, rate: 75, hoursWorked: 12 },
          { name: 'Sarah Johnson', actualSpend: 1120, totalHours: 14, budgetUsed: 80, rate: 80, hoursWorked: 14 },
          { name: 'Mike Chen', actualSpend: 430, totalHours: 7, budgetUsed: 95, rate: 65, hoursWorked: 7 }
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
  }, []);

  /**
   * Currency formatting function
   * Memoized for performance
   */
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }, []);

  /**
   * Percentage formatting function
   * Memoized for performance
   */
  const formatPercentage = useCallback((value) => {
    return `${Math.round(value)}%`;
  }, []);

  /**
   * Computed analytics summary
   */
  const analyticsSummary = useMemo(() => {
    const { weeklyExpense, activeMembers, weeklyHours, avgHourlyRate } = analytics;
    
    return {
      totalRevenue: formatCurrency(weeklyExpense),
      averageRate: formatCurrency(avgHourlyRate),
      totalHours: `${weeklyHours.toFixed(1)}h`,
      teamSize: `${activeMembers} member${activeMembers !== 1 ? 's' : ''}`
    };
  }, [analytics, formatCurrency]);

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
            const hoursWorked = member.hoursWorked || 0;
            const hourlyRate = member.rate;
            const progressPercentage = Math.min((hoursWorked / 40) * 100, 100);
            const budgetSpent = member.budgetUsed || 0;
            
            return (
              <div key={member.name || index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">{member.name}</span>
                  <span className="text-sm text-gray-600 font-medium">{formatCurrency(member.actualSpend || member.weeklyExpense)} total spend</span>
                </div>
                
                {/* Hours Progress Bar (0-40 scale) */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Hours Billed This Week</span>
                    <span className="text-sm font-bold text-blue-600">{hoursWorked}h of 40h ({Math.round(progressPercentage)}%)</span>
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
                    <div className="font-medium text-orange-600">{budgetSpent}%</div>
                    <div className="text-gray-600">Budget Spent</div>
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
});