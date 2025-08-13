import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  profile_data?: ProfileData;
  validation_history?: ValidationItem[];
}

interface ApiResponse {
  users?: User[];
}

const DashboardPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8000/dashboard-data', {
          headers: {
            'Authorization': `Bearer ${token}`
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
        const processedUsers = (result.users || []).map(user => ({
          ...user,
          created_at: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
          profile_data: user.profile_data ? {
            ...user.profile_data,
            updated_at: user.profile_data.updated_at ? new Date(user.profile_data.updated_at).toISOString() : undefined
          } : undefined,
          validation_history: user.validation_history?.map(validation => ({
            ...validation,
            created_at: validation.created_at ? new Date(validation.created_at).toISOString() : undefined
          }))
        }));
        
        setUsers(processedUsers);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex justify-center items-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-black">
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
  }

  return (
    <div className="min-h-screen p-8 bg-black text-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-white">Developer Dashboard</h1>

      <section className="mb-8 p-6 bg-gray-900 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">All Users (excluding developers)</h2>
        
        {users.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">There are currently no non-developer users in the system.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="border border-gray-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-gray-800">
                <div className="p-4 cursor-pointer" onClick={() => toggleExpandUser(user.id)}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-white">{user.name}</h3>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <svg 
                      className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedUser === user.id ? 'rotate-180' : ''}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {expandedUser === user.id && (
                  <div className="border-t border-gray-700 p-4 bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2 text-gray-300">Profile Data</h4>
                        {user.profile_data ? (
                          <div className="space-y-2 text-gray-400">
                            <p><span className="font-medium text-gray-300">Skills:</span> {user.profile_data.skills.join(', ') || 'None'}</p>
                            <p><span className="font-medium text-gray-300">Interests:</span> {user.profile_data.interests.join(', ') || 'None'}</p>
                            <p><span className="font-medium text-gray-300">Experience:</span> {user.profile_data.experience || 'Not specified'}</p>
                            <p><span className="font-medium text-gray-300">Availability:</span> {user.profile_data.availability || 'Not specified'}</p>
                            <p><span className="font-medium text-gray-300">Location:</span> {user.profile_data.location || 'Not specified'}</p>
                            {user.profile_data.updated_at && (
                              <p className="text-sm text-gray-500">Last updated: {new Date(user.profile_data.updated_at).toLocaleString()}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">No profile data available</p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 text-gray-300">Recent Validations</h4>
                        {user.validation_history && user.validation_history.length > 0 ? (
                          <div className="space-y-3">
                            {user.validation_history.map((validation: ValidationItem, index: number) => (
                              <div key={index} className="border-l-4 border-blue-900 pl-3 py-1">
                                <p className="font-medium text-gray-300">{validation.prompt}</p>
                                <p className="text-sm text-gray-400">{validation.validation}</p>
                                {validation.created_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(validation.created_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No validation history</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Joined: {new Date(user.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;