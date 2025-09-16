import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import LiquidationTable from './LiquidationTable';
import LiquidationForm from './LiquidationForm';
import AnalyticsDashboard from './AnalyticsDashboard';
import { 
  Plus, 
  BarChart3, 
  FileText, 
  Settings, 
  Bell,
  User,
  Shield,
  Crown
} from 'lucide-react';

interface LiquidationDashboardProps {
  className?: string;
}

export default function LiquidationDashboard({ className = '' }: LiquidationDashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchPendingCount();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // Create profile if it doesn't exist
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'user'
            })
            .select()
            .single();
          
          setUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const { count } = await supabase
        .from('liquidation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const handleFormSuccess = () => {
    fetchPendingCount();
    toast({
      title: "Success",
      description: "Request saved successfully"
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'approver': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'approver': return 'secondary';
      default: return 'outline';
    }
  };

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Liquidation & Reimbursement Portal
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {userProfile.full_name}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                variant={getRoleBadgeVariant(userProfile.role)} 
                className="flex items-center gap-1"
              >
                {getRoleIcon(userProfile.role)}
                {userProfile.role}
              </Badge>
              
              {pendingCount > 0 && (userProfile.role === 'admin' || userProfile.role === 'approver') && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-medium">{pendingCount} pending</span>
                </div>
              )}
              
              <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6">
            <LiquidationTable 
              userRole={userProfile.role}
              userId={user.id}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard 
              userRole={userProfile.role}
              userId={user.id}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{userProfile.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{userProfile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <Badge variant={getRoleBadgeVariant(userProfile.role)} className="mt-1">
                    {userProfile.role}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{userProfile.department || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Form Modal */}
      <LiquidationForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleFormSuccess}
        userId={user.id}
      />
    </div>
  );
}