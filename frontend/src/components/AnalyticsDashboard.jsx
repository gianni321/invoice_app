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
    burnRates: [],
    weeklyExpenses: [],
    teamMetrics: [],
    invoicesByWeek: {}
  });
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [draggedInvoice, setDraggedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dragRef = useRef(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedWeek]);

  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return start.toISOString().split('T')[0];
  }

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [burnResponse, expenseResponse, teamResponse, invoiceResponse] = await Promise.all([
        fetch(api.analytics.burnRates(), { headers: getAuthHeaders() }),
        fetch(api.analytics.weeklyExpenses(selectedWeek), { headers: getAuthHeaders() }),
        fetch(api.analytics.teamMetrics(), { headers: getAuthHeaders() }),
        fetch(api.analytics.invoicesByWeek(), { headers: getAuthHeaders() })
      ]);

      if (burnResponse.ok && expenseResponse.ok && teamResponse.ok && invoiceResponse.ok) {
        const [burnData, expenseData, teamData, invoiceData] = await Promise.all([
          burnResponse.json(),
          expenseResponse.json(),
          teamResponse.json(),
          invoiceResponse.json()
        ]);

        setAnalytics({
          burnRates: burnData,
          weeklyExpenses: expenseData,
          teamMetrics: teamData,
          invoicesByWeek: invoiceData
        });
      }
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, invoice) => {
    setDraggedInvoice(invoice);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedInvoice(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetWeek) => {
    e.preventDefault();
    if (!draggedInvoice) return;

    try {
      const response = await fetch(api.analytics.moveInvoice(draggedInvoice.id), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ weekStart: targetWeek })
      });

      if (response.ok) {
        fetchAnalytics(); // Refresh data
      } else {
        setError('Failed to move invoice');
      }
    } catch (err) {
      setError('Error moving invoice');
      console.error('Move invoice error:', err);
    }
  };

  const getBurnRateColor = (rate, budget) => {
    const percentage = (rate / budget) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getWeekDates = (weekStart) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString()
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const weeks = Object.keys(analytics.invoicesByWeek).sort();
  const currentWeekExpenses = analytics.weeklyExpenses.find(w => w.week === selectedWeek);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Team performance and financial metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Week:</label>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Weekly Expense */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Expense</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentWeekExpenses?.totalExpense || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Active Team Members */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.teamMetrics.length}
              </p>
            </div>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentWeekExpenses?.totalHours || 0}h
              </p>
            </div>
          </div>
        </div>

        {/* Burn Rate Alert */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Burn Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.burnRates.length > 0 
                  ? Math.round(analytics.burnRates.reduce((sum, br) => sum + br.burnRate, 0) / analytics.burnRates.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Burn Rate by Team Member */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Team Member Burn Rates
        </h3>
        <div className="space-y-4">
          {analytics.burnRates.map((member, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(member.actualSpend)} / {formatCurrency(member.budget)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className={`text-sm font-medium ${getBurnRateColor(member.actualSpend, member.budget)}`}>
                    {Math.round((member.actualSpend / member.budget) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">{member.hoursWorked}h worked</p>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (member.actualSpend / member.budget) >= 0.9 ? 'bg-red-500' :
                      (member.actualSpend / member.budget) >= 0.75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((member.actualSpend / member.budget) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drag & Drop Invoice Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Move className="w-5 h-5 mr-2 text-blue-600" />
          Invoice Management by Week
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {weeks.map(week => {
            const weekData = getWeekDates(week);
            const invoices = analytics.invoicesByWeek[week] || [];
            
            return (
              <div
                key={week}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, week)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Week of {weekData.start}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {invoices.length} invoices
                  </span>
                </div>
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, invoice)}
                      onDragEnd={handleDragEnd}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-move hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Invoice #{invoice.id}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      Drop invoices here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Performance Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Team Performance Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.teamMetrics.map((member, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{member.name}</h4>
                <span className="text-sm text-gray-600">{member.totalHours}h</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Efficiency</span>
                  <span className="font-medium">{member.efficiency}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${member.efficiency}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Revenue: {formatCurrency(member.revenue)}</span>
                  <span>Rate: {formatCurrency(member.rate)}/h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}