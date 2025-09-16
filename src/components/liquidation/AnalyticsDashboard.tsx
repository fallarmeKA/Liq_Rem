import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalyticsData {
  totalRequests: number;
  totalAmount: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageAmount: number;
  topCategories: { category: string; count: number; amount: number }[];
  monthlyTrends: { month: string; requests: number; amount: number }[];
  statusBreakdown: { status: string; count: number; percentage: number }[];
  topRequesters: { name: string; email: string; requests: number; amount: number }[];
}

interface AnalyticsDashboardProps {
  userRole?: 'user' | 'admin' | 'approver';
  userId?: string;
}

export default function AnalyticsDashboard({ userRole = 'user', userId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Base query
      let query = supabase
        .from('liquidation_requests')
        .select(`
          *,
          liquidation_items(*),
          user_profiles(full_name, email)
        `)
        .gte('submitted_date', startDate.toISOString())
        .lte('submitted_date', endDate.toISOString());

      // Filter by user if not admin
      if (userRole === 'user' && userId) {
        query = query.eq('user_id', userId);
      }

      // Filter by category if selected
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: requests, error } = await query;
      if (error) throw error;

      // Calculate analytics
      const totalRequests = requests?.length || 0;
      const totalAmount = requests?.reduce((sum, req) => sum + req.total_amount, 0) || 0;
      const pendingRequests = requests?.filter(req => req.status === 'pending').length || 0;
      const approvedRequests = requests?.filter(req => req.status === 'approved').length || 0;
      const rejectedRequests = requests?.filter(req => req.status === 'rejected').length || 0;
      const averageAmount = totalRequests > 0 ? totalAmount / totalRequests : 0;

      // Top categories
      const categoryMap = new Map();
      requests?.forEach(req => {
        const category = req.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { category, count: 0, amount: 0 });
        }
        const cat = categoryMap.get(category);
        cat.count++;
        cat.amount += req.total_amount;
      });
      const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Monthly trends (last 6 months)
      const monthlyMap = new Map();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push(monthName);
        monthlyMap.set(monthKey, { month: monthName, requests: 0, amount: 0 });
      }

      requests?.forEach(req => {
        const monthKey = req.submitted_date?.substring(0, 7);
        if (monthKey && monthlyMap.has(monthKey)) {
          const month = monthlyMap.get(monthKey);
          month.requests++;
          month.amount += req.total_amount;
        }
      });
      const monthlyTrends = Array.from(monthlyMap.values());

      // Status breakdown
      const statusCounts = {
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        processing: requests?.filter(req => req.status === 'processing').length || 0
      };
      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0
      }));

      // Top requesters (admin only)
      let topRequesters: any[] = [];
      if (userRole !== 'user') {
        const requesterMap = new Map();
        requests?.forEach(req => {
          const key = req.user_id;
          if (!requesterMap.has(key)) {
            requesterMap.set(key, {
              name: req.user_profiles?.full_name || 'Unknown',
              email: req.user_profiles?.email || '',
              requests: 0,
              amount: 0
            });
          }
          const requester = requesterMap.get(key);
          requester.requests++;
          requester.amount += req.total_amount;
        });
        topRequesters = Array.from(requesterMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);
      }

      setAnalytics({
        totalRequests,
        totalAmount,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        averageAmount,
        topCategories,
        monthlyTrends,
        statusBreakdown,
        topRequesters
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedCategory, userRole, userId]);

  const exportReport = () => {
    if (!analytics) return;

    const reportData = {
      'Summary': [
        { Metric: 'Total Requests', Value: analytics.totalRequests },
        { Metric: 'Total Amount', Value: analytics.totalAmount },
        { Metric: 'Average Amount', Value: analytics.averageAmount.toFixed(2) },
        { Metric: 'Pending Requests', Value: analytics.pendingRequests },
        { Metric: 'Approved Requests', Value: analytics.approvedRequests },
        { Metric: 'Rejected Requests', Value: analytics.rejectedRequests }
      ],
      'Top Categories': analytics.topCategories,
      'Monthly Trends': analytics.monthlyTrends,
      'Status Breakdown': analytics.statusBreakdown
    };

    if (userRole !== 'user') {
      reportData['Top Requesters'] = analytics.topRequesters;
    }

    const wb = XLSX.utils.book_new();
    
    Object.entries(reportData).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `liquidation_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
        <p className="text-gray-600">No liquidation requests found for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Insights and trends for liquidation requests</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalRequests}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${analytics.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${analytics.averageAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.pendingRequests}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.statusBreakdown.map((status) => (
              <div key={status.status} className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
                  {status.status}
                </div>
                <p className="text-2xl font-bold mt-2">{status.count}</p>
                <p className="text-sm text-gray-600">{status.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-gray-600">{category.count} requests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${category.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyTrends.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{month.month}</p>
                    <p className="text-sm text-gray-600">{month.requests} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${month.amount.toLocaleString()}</p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (month.amount / Math.max(...analytics.monthlyTrends.map(m => m.amount))) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Requesters (Admin only) */}
      {userRole !== 'user' && analytics.topRequesters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Requesters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Requests</th>
                    <th className="text-left p-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topRequesters.map((requester, index) => (
                    <tr key={requester.email} className="border-b">
                      <td className="p-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                      </td>
                      <td className="p-2 font-medium">{requester.name}</td>
                      <td className="p-2 text-gray-600">{requester.email}</td>
                      <td className="p-2">{requester.requests}</td>
                      <td className="p-2 font-medium">${requester.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}