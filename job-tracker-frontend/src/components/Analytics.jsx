import React, { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  BarChart3, TrendingUp, Briefcase, CheckCircle,
  XCircle, Clock, Award
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const Analytics = ({ currentUser }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await jobsAPI.getAnalytics(currentUser);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const statusBreakdown = analytics.status_breakdown || {};
  
  const chartData = Object.entries(statusBreakdown).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const COLORS = {
    'Not Applied': '#9CA3AF',
    'Applied': '#3B82F6',
    'Interview': '#F59E0B',
    'Offer': '#10B981',
    'Rejected': '#EF4444',
    'Withdrawn': '#8B5CF6'
  };

  const statCards = [
    {
      title: 'Total Jobs',
      value: analytics.total_jobs,
      icon: Briefcase,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Applied',
      value: analytics.applied_count || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Interviews',
      value: analytics.interview_count || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Offers',
      value: analytics.offer_count || 0,
      icon: Award,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Rejected',
      value: analytics.rejected_count || 0,
      icon: XCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Companies',
      value: analytics.unique_companies,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    }
  ];

  const applicationRate = analytics.total_jobs > 0 
    ? ((analytics.applied_count || 0) / analytics.total_jobs * 100).toFixed(1)
    : 0;

  const interviewRate = (analytics.applied_count || 0) > 0
    ? ((analytics.interview_count || 0) / (analytics.applied_count || 1) * 100).toFixed(1)
    : 0;

  const offerRate = (analytics.interview_count || 0) > 0
    ? ((analytics.offer_count || 0) / (analytics.interview_count || 1) * 100).toFixed(1)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 size={24} />
              Analytics Dashboard
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              Insights for {currentUser}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className={`${stat.bgColor} rounded-lg p-4 border-2 border-transparent hover:border-gray-200 transition-all`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 ${stat.color} rounded-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </div>
                <div className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">{stat.title}</div>
              </div>
            );
          })}
        </div>

        {/* Charts and Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Status Distribution</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Conversion Rates */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Conversion Rates</h3>
            <div className="space-y-6">
              {/* Application Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Application Rate</span>
                  <span className="text-sm font-bold text-primary-600">{applicationRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${applicationRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {analytics.applied_count || 0} applied out of {analytics.total_jobs} total jobs
                </p>
              </div>

              {/* Interview Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Interview Rate</span>
                  <span className="text-sm font-bold text-yellow-600">{interviewRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${interviewRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {analytics.interview_count || 0} interviews from {analytics.applied_count || 0} applications
                </p>
              </div>

              {/* Offer Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Offer Rate</span>
                  <span className="text-sm font-bold text-green-600">{offerRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${offerRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {analytics.offer_count || 0} offers from {analytics.interview_count || 0} interviews
                </p>
              </div>

              {/* Success Insights */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Insights</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  {applicationRate < 50 && (
                    <li>• Consider applying to more jobs you've saved</li>
                  )}
                  {interviewRate > 20 && (
                    <li>• Great interview conversion rate! Keep it up!</li>
                  )}
                  {analytics.total_jobs > 50 && (
                    <li>• You're tracking a lot of jobs. Focus on quality applications.</li>
                  )}
                  {analytics.offer_count > 0 && (
                    <li>• Congratulations on your offer{analytics.offer_count > 1 ? 's' : ''}! 🎉</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
