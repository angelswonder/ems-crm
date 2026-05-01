import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { LogOut, Settings, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface EnergyData {
  timestamp: string;
  consumption: number;
  production: number;
}

export const IndividualDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);

  // Mock data for demonstration
  const mockEnergyData: EnergyData[] = [
    { timestamp: '00:00', consumption: 45, production: 30 },
    { timestamp: '04:00', consumption: 38, production: 20 },
    { timestamp: '08:00', consumption: 52, production: 60 },
    { timestamp: '12:00', consumption: 65, production: 85 },
    { timestamp: '16:00', consumption: 71, production: 75 },
    { timestamp: '20:00', consumption: 58, production: 40 },
    { timestamp: '24:00', consumption: 42, production: 25 },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/auth/individual-login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Profile fetch failed, using user metadata:', error);
          // Fallback to user metadata if profile fetch fails
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || 'User',
            email: user.email || '',
            role: user.user_metadata?.user_type === 'individual' ? 'manager' : 'owner',
          });
        } else {
          setProfile({
            id: data.id,
            full_name: data.full_name || user.user_metadata?.full_name || 'User',
            email: user.email || '',
            role: data.role || 'manager',
          });
        }

        setEnergyData(mockEnergyData);
      } catch (error: any) {
        toast.error('Failed to load profile');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Individual Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome back, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/individual/settings')}
              className="border-slate-600 hover:bg-slate-700/50 gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-300 hover:text-white gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Today's Consumption</p>
                <p className="text-3xl font-bold">1.24 kWh</p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-green-400 text-xs mt-4">↓ 12% from yesterday</p>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Production Today</p>
                <p className="text-3xl font-bold">2.18 kWh</p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <p className="text-green-400 text-xs mt-4">↑ 8% from yesterday</p>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Net Balance</p>
                <p className="text-3xl font-bold">+0.94 kWh</p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-green-400 text-xs mt-4">Surplus this period</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Energy consumption chart */}
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <h3 className="text-lg font-semibold mb-6">Energy Consumption vs Production</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="consumption" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="production" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Hourly breakdown */}
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <h3 className="text-lg font-semibold mb-6">Hourly Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="consumption" fill="#3B82F6" />
                <Bar dataKey="production" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Info section */}
        <Card className="bg-blue-900/20 border-blue-700/30 p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-2">Testing Mode Active</h4>
              <p className="text-blue-200/80 text-sm">
                You are using mock data for demonstration. In production mode, this dashboard will display real energy monitoring data from your systems. 
                Once you integrate with actual devices, real-time analytics will be available.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default IndividualDashboard;
