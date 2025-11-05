import React, { useEffect, useState } from 'react';

// --- Interfaces ---
interface ValidationItem {
  prompt: string;
  validation: string;
  created_at?: string;
}

interface ProfileData {
  skills: string[];
  interests: string[];
  experience: string;
  availability: string;
  location: string;
  updated_at?: string;
  preferred_role?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  profile_data?: ProfileData;
  validation_history?: ValidationItem[];
  role?: string;
  roadmaps_count?: number;
  researches_count?: number;
  ideas_count?: number;
}

interface Stats {
  total_users: number;
  total_users_change: string;
  ideas_validated: number;
  ideas_validated_change: string;
  roadmaps_generated: number;
  roadmaps_generated_change: string;
  researches_conducted: number;
  researches_conducted_change: string;
}

interface ApiResponse {
  stats?: Stats;
  users?: User[];
}

interface StatsCardProps {
  title: string;
  value: number;
}

function StatsCard({ title, value }: StatsCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-between shadow hover:shadow-xl transition">
      <div className="flex-1">
        <div className="text-gray-400 text-sm mb-1">{title}</div>
        <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

interface UserCardProps {
  user: User;
  expanded: boolean;
  onExpand: () => void;
}

function UserCard({ user, expanded, onExpand }: UserCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800 mb-3">
      <div
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-750"
        onClick={onExpand}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {getInitials(user.name)}
          </div>
          <div>
            <h3 className="font-semibold text-white">{user.name}</h3>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm text-white">{formatDate(user.created_at)}</div>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-slate-800 border-t border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-blue-400 text-sm">Contact Information</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400 text-xs">Email:</div>
                    <div className="text-white text-sm">{user.email}</div>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white text-sm">{user.profile_data?.location || "Location not specified"}</span>
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                  </svg>
                  <h4 className="text-green-400 text-sm">Professional Details</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400 text-xs">Preferred Role:</div>
                    <div className="text-white text-sm font-medium">
                      {user.profile_data?.preferred_role || 
                       (user.profile_data?.experience?.toLowerCase().includes('ceo') ? 'CEO' :
                        user.profile_data?.experience?.toLowerCase().includes('founder') ? 'Founder' :
                        user.profile_data?.experience?.toLowerCase().includes('product') ? 'Product Manager' :
                        user.profile_data?.experience?.toLowerCase().includes('developer') ? 'Developer' :
                        user.profile_data?.experience?.toLowerCase().includes('designer') ? 'designer' :
                        "Not specified")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Experience:</div>
                    <div className="text-white text-sm">{user.profile_data?.experience || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Availability:</div>
                    <div className="text-white text-sm">{user.profile_data?.availability || "Not specified"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Activity Overview */}
              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-blue-400 text-sm">Activity Overview</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {user.ideas_count ?? user.validation_history?.length ?? 0}
                    </div>
                    <div className="text-xs text-green-300">Ideas</div>
                  </div>
                  <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {user.roadmaps_count ?? 0}
                    </div>
                    <div className="text-xs text-blue-300">Roadmaps</div>
                  </div>
                  <div className="bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {user.researches_count ?? 0}
                    </div>
                    <div className="text-xs text-purple-300">Research</div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {user.profile_data?.skills && user.profile_data.skills.length > 0 && (
                <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                  <h4 className="text-blue-400 text-sm mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.profile_data.skills.map((skill, idx) => (
                      <span key={idx} className="bg-blue-500 text-white rounded-full px-3 py-1 text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {user.profile_data?.interests && user.profile_data.interests.length > 0 && (
                <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                  <h4 className="text-pink-400 text-sm mb-3">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.profile_data.interests.map((interest, idx) => (
                      <span key={idx} className="bg-pink-500 text-white rounded-full px-3 py-1 text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DashboardPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8000/dashboard-data', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 403) {
          setError('Access denied. You need developer privileges.');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        setStats(result.stats || null);
        setUsers(result.users || []);
        setFilteredUsers(result.users || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading dashboard data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen p-8 bg-gray-900">
      <div className="bg-red-900 bg-opacity-20 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Startup GPS</h1>
            <p className="text-gray-400">Admin Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-300 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="p-8">
        {/* Summary Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats ? (
            <>
              <StatsCard title="Total Users" value={stats.total_users} />
              <StatsCard title="Ideas Validated" value={stats.ideas_validated} />
              <StatsCard title="Roadmaps Generated" value={stats.roadmaps_generated} />
              <StatsCard title="Researches Conducted" value={stats.researches_conducted} />
            </>
          ) : (
            <div className="col-span-4 text-center text-gray-400">
              Loading statistics...
            </div>
          )}
        </div>

        {/* User Management */}
        <section className="bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">User Management</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pl-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {users.length === 0 ? 'No users found in database.' : 'No users match your search criteria.'}
              </div>
            ) : (
              <div>
                <div className="mb-4 text-sm text-gray-400">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
                {filteredUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    expanded={expandedUser === user.id}
                    onExpand={() => toggleExpandUser(user.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
