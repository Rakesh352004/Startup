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
  status?: 'Active' | 'Inactive';
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
  percent: string;
  icon: React.ReactNode;
}

function StatsCard({ title, value, percent, icon }: StatsCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-between shadow hover:shadow-xl transition">
      <div className="flex-1">
        <div className="text-gray-400 text-sm mb-1">{title}</div>
        <div className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</div>
        <div className="text-sm text-green-400">+{percent}%</div>
      </div>
      <div className="text-4xl text-blue-500 ml-4">{icon}</div>
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

  const getRoleBadge = (user: User) => {
    let role = user.profile_data?.preferred_role || user.role;
    
    if (!role && user.profile_data?.experience) {
      const exp = user.profile_data.experience.toLowerCase();
      if (exp.includes('ceo')) role = 'CEO';
      else if (exp.includes('founder')) role = 'Founder';
      else if (exp.includes('product') && exp.includes('manager')) role = 'Product Manager';
      else if (exp.includes('developer') || exp.includes('engineer')) role = 'Developer';
      else if (exp.includes('designer')) role = 'Designer';
      else role = 'User';
    }
    
    if (!role) role = 'User';
    
    const roleColors: { [key: string]: string } = {
      'Founder': 'bg-blue-600',
      'CEO': 'bg-blue-600',
      'Product Manager': 'bg-purple-600',
      'Developer': 'bg-green-600',
      'Designer': 'bg-pink-600',
      'User': 'bg-gray-600'
    };

    return (
      <span className={`${roleColors[role] || 'bg-gray-600'} text-white rounded px-2 py-1 text-xs font-medium`}>
        {role}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Debug logging
  console.log(`User ${user.name} activity counts:`, {
    roadmaps: user.roadmaps_count,
    researches: user.researches_count,
    ideas: user.ideas_count || user.validation_history?.length || 0
  });

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
          {getRoleBadge(user)}
          <div className="text-right">
            <div className="text-sm text-white">{formatDate(user.created_at)}</div>
            <div className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
              <span className="text-xs text-gray-400">{user.status || 'Active'}</span>
            </div>
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
        <div className="px-4 pb-4 bg-gray-850 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">CONTACT</h4>
              <p className="text-white mb-1">{user.email}</p>
              <p className="text-gray-400">{user.profile_data?.location || "Location not specified"}</p>
            </div>

            <div>
              <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">ROLE & STATUS</h4>
              <div className="flex items-center space-x-2 mb-1">
                {getRoleBadge(user)}
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                  <span className="text-white text-sm">{user.status || 'Active'}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Joined: {formatDate(user.created_at)}</p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">PREFERRED ROLE</h4>
            <p className="text-white">
              {user.profile_data?.preferred_role || 
               (user.profile_data?.experience?.toLowerCase().includes('ceo') ? 'CEO' :
                user.profile_data?.experience?.toLowerCase().includes('founder') ? 'Founder' :
                user.profile_data?.experience?.toLowerCase().includes('product') ? 'Product Manager' :
                user.profile_data?.experience?.toLowerCase().includes('developer') ? 'Developer' :
                "Not specified")}
            </p>
          </div>

          <div className="mt-4">
            <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">EXPERIENCE</h4>
            <p className="text-white">{user.profile_data?.experience || "Not specified"}</p>
          </div>

          <div className="mt-4">
            <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">AVAILABILITY</h4>
            <p className="text-white">{user.profile_data?.availability || "Not specified"}</p>
          </div>

          <div className="mt-4">
            <h4 className="text-gray-400 uppercase text-xs font-semibold mb-3">ACTIVITY METRICS</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-4 h-4 text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-2xl text-white">
                    {user.ideas_count ?? user.validation_history?.length ?? 0}
                  </span>
                </div>
                <div className="text-xs text-gray-400">Ideas Validated</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm8 8a1 1 0 100-2H8a1 1 0 100 2h4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-2xl text-white">
                    {user.roadmaps_count ?? 0}
                  </span>
                </div>
                <div className="text-xs text-gray-400">Roadmaps Generated</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-4 h-4 text-purple-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-2xl text-white">
                    {user.researches_count ?? 0}
                  </span>
                </div>
                <div className="text-xs text-gray-400">Researches Conducted</div>
              </div>
            </div>
          </div>

          {user.profile_data?.skills && user.profile_data.skills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">SKILLS</h4>
              <div className="flex flex-wrap gap-2">
                {user.profile_data.skills.map((skill, idx) => (
                  <span key={idx} className="bg-gray-700 rounded px-3 py-1 text-xs text-white">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.profile_data?.interests && user.profile_data.interests.length > 0 && (
            <div className="mt-4">
              <h4 className="text-gray-400 uppercase text-xs font-semibold mb-2">INTERESTS</h4>
              <div className="flex flex-wrap gap-2">
                {user.profile_data.interests.map((interest, idx) => (
                  <span key={idx} className="bg-gray-700 rounded px-3 py-1 text-xs text-white">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
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
  const [selectedRole, setSelectedRole] = useState('All Roles');

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
        
        console.log('Fetching dashboard data...');
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
        console.log('Dashboard API Response:', result);
        
        if (result.users && result.users.length > 0) {
          console.log('Users received:', result.users.length);
          console.log('First user data:', result.users[0]);
          console.log('First user roadmap count:', result.users[0].roadmaps_count);
          console.log('First user research count:', result.users[0].researches_count);
        }
        
        setStats(result.stats || null);
        setUsers(result.users || []);
        setFilteredUsers(result.users || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Dashboard fetch error:', err);
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

    if (selectedRole !== 'All Roles') {
      filtered = filtered.filter(user => {
        const userRole = user.profile_data?.preferred_role || user.role;
        let derivedRole = userRole;
        if (!derivedRole && user.profile_data?.experience) {
          const exp = user.profile_data.experience.toLowerCase();
          if (exp.includes('ceo')) derivedRole = 'CEO';
          else if (exp.includes('founder')) derivedRole = 'Founder';
          else if (exp.includes('product') && exp.includes('manager')) derivedRole = 'Product Manager';
          else if (exp.includes('developer') || exp.includes('engineer')) derivedRole = 'Developer';
          else if (exp.includes('designer')) derivedRole = 'Designer';
          else derivedRole = 'User';
        }
        return derivedRole === selectedRole;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole]);

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/signin';
  };

  const roles = ['All Roles', 'Founder', 'CEO', 'Product Manager', 'Developer', 'Designer', 'User'];

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
              <StatsCard
                title="Total Users"
                value={stats.total_users}
                percent={stats.total_users_change}
                icon={<span>👥</span>}
              />
              <StatsCard
                title="Ideas Validated"
                value={stats.ideas_validated}
                percent={stats.ideas_validated_change}
                icon={<span>✅</span>}
              />
              <StatsCard
                title="Roadmaps Generated"
                value={stats.roadmaps_generated}
                percent={stats.roadmaps_generated_change}
                icon={<span>🗺️</span>}
              />
              <StatsCard
                title="Researches Conducted"
                value={stats.researches_conducted}
                percent={stats.researches_conducted_change}
                icon={<span>🔍</span>}
              />
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
              <div className="flex space-x-4">
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
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
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