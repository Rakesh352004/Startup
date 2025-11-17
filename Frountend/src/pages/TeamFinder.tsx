import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase, Users, Star, Mail, AlertCircle, Bell, MessageCircle, ArrowLeft, UserMinus, UserCheck, AlertTriangle } from 'lucide-react';
import apiService from '../services/api';

interface TeamRequirements {
  required_skills: string[];
  current_role: string;
  experience: string;
  availability: string;
  location: string;
  interests: string[];
}

interface MatchedProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  interests: string[];
  current_role: string;
  experience: string;
  availability: string;
  location: string;
  match_score: number;
  matched_skills: string[];
  matched_interests: string[];
  connection_status: 'not_connected' | 'request_sent' | 'request_received' | 'connected';
}

interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  status: string;
  message: string;
  created_at: string;
  user_profile?: any;
}

interface TeamFinderProps {
  onStartChat?: (memberId: string, memberName: string, conversationId?: string) => void;
  onNavigateToProfile?: () => void;
}

const TeamFinder = ({ onStartChat, onNavigateToProfile }: TeamFinderProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashboard' | 'search' | 'results' | 'requests'>('dashboard');
  const [requirements, setRequirements] = useState<TeamRequirements>({
    required_skills: [],
    current_role: '',
    experience: '',
    availability: '',
    location: '',
    interests: []
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedProfiles, setMatchedProfiles] = useState<MatchedProfile[]>([]);
  const [connectedProfiles, setConnectedProfiles] = useState<MatchedProfile[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [profileComplete, setProfileComplete] = useState<boolean>(true);
  const [checkingProfile, setCheckingProfile] = useState<boolean>(true);
  const [profileCheckMessage, setProfileCheckMessage] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadConnectionRequests(),
        loadConnectedUsers(),
        checkProfileCompletion()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const checkProfileCompletion = async () => {
    setCheckingProfile(true);
    setProfileCheckMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setProfileComplete(false);
        setProfileCheckMessage('Please log in to access team finder features.');
        setCheckingProfile(false);
        return;
      }

      const response = await fetch('https://startup-gps-backend-6rcx.onrender.com/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        
        const missingFields: string[] = [];
        
        if (!profile.name?.trim()) missingFields.push('Name');
        if (!profile.email?.trim()) missingFields.push('Email');
        if (!profile.role?.trim()) missingFields.push('Current Role');
        if (!profile.skills || profile.skills.length === 0) missingFields.push('Skills');
        if (!profile.interests || profile.interests.length === 0) missingFields.push('Interests');
        if (!profile.experience?.trim()) missingFields.push('Experience Level');
        if (!profile.availability?.trim()) missingFields.push('Availability');
        if (!profile.location?.trim()) missingFields.push('Location');
        
        const isComplete = missingFields.length === 0;
        setProfileComplete(isComplete);
        
        if (!isComplete) {
          setProfileCheckMessage(
            `Please complete the following fields in your profile: ${missingFields.join(', ')}`
          );
        }
      } else {
        setProfileComplete(false);
        setProfileCheckMessage('Unable to load profile. Please complete your profile first.');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      setProfileComplete(false);
      setProfileCheckMessage('Error checking profile completion. Please try again.');
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleCompleteProfile = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      navigate('/profile');
    }
  };

  const handleFindTeamMembers = () => {
    if (!profileComplete) {
      setError(profileCheckMessage || 'Please complete your profile before searching for team members.');
      return;
    }
    setCurrentView('search');
    setError(null);
  };

  const loadConnectionRequests = async () => {
    try {
      const response = await apiService.getReceivedConnectionRequests();
      if (response.data) {
        setConnectionRequests(response.data.requests || []);
        setPendingRequestCount(response.data.requests?.length || 0);
      }
    } catch (error) {
      console.error('Error loading connection requests:', error);
    }
  };

  const loadConnectedUsers = async () => {
    try {
      const response = await apiService.getConnections();
      if (response.data) {
        setConnectedProfiles(response.data.connections || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileComplete) {
      setError(profileCheckMessage || 'Please complete your profile before searching for team members.');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await apiService.searchTeamMembers(requirements);
      if (response.data) {
        setMatchedProfiles(response.data.profiles || []);
      }
      setCurrentView('results');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Search failed. Please try again.');
      setMatchedProfiles([]);
      setCurrentView('results');
    } finally {
      setIsSearching(false);
    }
  };

  const sendConnectionRequest = async (targetUserId: string) => {
    setProcessingRequests(prev => new Set(prev).add(targetUserId));
    setError(null);
    
    console.log('🔄 Sending connection request to:', targetUserId);
    
    try {
      const response = await apiService.sendConnectionRequest(targetUserId, '');
      console.log('✅ Connection request response:', response);
      
      if (response.status === 200 && response.data) {
        const newStatus = response.data.status === 'accepted' ? 'connected' : 'request_sent';
        
        console.log('📝 Updating profile status to:', newStatus);
        
        setMatchedProfiles(prev => 
          prev.map(profile => 
            profile.id === targetUserId 
              ? { ...profile, connection_status: newStatus }
              : profile
          )
        );
        
        if (newStatus === 'connected') {
          console.log('🤝 Auto-accepted! Reloading connections...');
          await loadConnectedUsers();
        } else {
          console.log('📤 Request sent successfully');
        }
        
        setError(null);
      } else if (response.status === 400) {
        const errorMsg = response.error || '';
        console.log('⚠️ Request already exists:', errorMsg);
        
        if (errorMsg.includes('already sent') || errorMsg.includes('already exist')) {
          setMatchedProfiles(prev => 
            prev.map(profile => 
              profile.id === targetUserId 
                ? { ...profile, connection_status: 'request_sent' }
                : profile
            )
          );
          setError('Connection request already sent to this user');
        } else if (errorMsg.includes('already connected')) {
          setMatchedProfiles(prev => 
            prev.map(profile => 
              profile.id === targetUserId 
                ? { ...profile, connection_status: 'connected' }
                : profile
            )
          );
          await loadConnectedUsers();
          setError('You are already connected with this user');
        } else {
          setError(errorMsg);
        }
        
        setTimeout(() => setError(null), 4000);
      } else {
        throw new Error(response.error || 'Request failed');
      }
    } catch (error: any) {
      console.error('❌ Connection request error:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Failed to send connection request';
      
      console.log('📝 Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage
      });
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const respondToConnectionRequest = async (requestId: string, action: 'accept' | 'reject') => {
  setProcessingRequests(prev => new Set(prev).add(requestId));
  setError(null);
  
  console.log(`🔄 ${action === 'accept' ? 'Accepting' : 'Rejecting'} request ID:`, requestId);
  console.log('📋 Current requests:', connectionRequests);

  try {
    // Use the apiService method directly
    const response = await apiService.respondToConnectionRequest(requestId, action);
    
    console.log('✅ Response:', response);
    
    if (response.status === 200 && response.data) {
      // Remove request from list
      setConnectionRequests(prev => {
        const updated = prev.filter(req => req.id !== requestId);
        console.log('📝 Updated requests list:', updated);
        return updated;
      });
      setPendingRequestCount(prev => Math.max(0, prev - 1));
      
      if (action === 'accept') {
        console.log('🤝 Accepted! Reloading connections...');
        // Wait a bit then reload connections
        setTimeout(() => {
          loadConnectedUsers();
        }, 500);
      }
      
      setError(null);
    } else {
      throw new Error(response.error || `Failed to ${action} connection request`);
    }
  } catch (error: any) {
    console.error(`❌ Failed to ${action} request:`, error);
    const errorMessage = error.response?.data?.detail || 
                        error.message || 
                        `Failed to ${action} connection request. Please try again.`;
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  } finally {
    setProcessingRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  }
};

  const startChat = async (memberId: string, memberName: string) => {
    try {
      const response = await apiService.createConversation(memberId);
      if (response.data && onStartChat) {
        onStartChat(memberId, memberName, response.data.id);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to start chat.');
    }
  };

  const disconnectUser = async (targetUserId: string, targetUserName: string) => {
    if (!window.confirm(`Are you sure you want to disconnect from ${targetUserName}?`)) {
      return;
    }

    setProcessingRequests(prev => new Set(prev).add(targetUserId));
    
    try {
      const response = await apiService.removeConnection(targetUserId);
      
      if (response.data) {
        setConnectedProfiles(prev => prev.filter(profile => profile.id !== targetUserId));
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to disconnect user.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !requirements.required_skills.includes(skillInput.trim())) {
      setRequirements(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setRequirements(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addInterest = () => {
    if (interestInput.trim() && !requirements.interests.includes(interestInput.trim())) {
      setRequirements(prev => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()]
      }));
      setInterestInput('');
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setRequirements(prev => ({
      ...prev,
      interests: prev.interests.filter(interest => interest !== interestToRemove)
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequirements(prev => ({ ...prev, [name]: value }));
  };

  const renderConnectionButton = (profile: MatchedProfile) => {
    const isProcessing = processingRequests.has(profile.id);
    
    switch (profile.connection_status) {
      case 'connected':
        return (
          <button
            onClick={() => startChat(profile.id, profile.name)}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </button>
        );
      case 'request_sent':
        return (
          <button
            disabled
            className="w-full bg-gray-600 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
          >
            Request Sent
          </button>
        );
      case 'request_received':
        return (
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-sm"
            onClick={() => setCurrentView('requests')}
          >
            Respond to Request
          </button>
        );
      default:
        return (
          <button
            onClick={() => sendConnectionRequest(profile.id)}
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Connect
              </>
            )}
          </button>
        );
    }
  };

  // Connection Requests View
  if (currentView === 'requests') {
    return (
      <div className="bg-[#0f172a] text-white min-h-screen px-4 py-8 font-['Inter']">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-indigo-400 flex items-center">
              <Bell className="w-8 h-8 mr-3" />
              Connection Requests
            </h2>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-300">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {connectionRequests.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No pending requests</h3>
              <p className="text-gray-500">You'll see connection requests from other users here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectionRequests.map((request) => (
                <div key={request.id} className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{request.sender_name}</h3>
                      <p className="text-gray-400 mb-2 text-sm">{request.sender_email}</p>
                      <p className="text-xs text-gray-500 mb-4">Request ID: {request.id}</p>
                      
                      {request.user_profile && (
                        <div className="space-y-2 mb-4">
                          <div className="text-sm text-gray-300">
                            <strong>Role:</strong> {request.user_profile.role || 'Not specified'}
                          </div>
                          <div className="text-sm text-gray-300">
                            <strong>Experience:</strong> {request.user_profile.experience || 'Not specified'}
                          </div>
                          {request.user_profile.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {request.user_profile.skills.slice(0, 5).map((skill: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-indigo-600/20 text-indigo-300 rounded-md text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => respondToConnectionRequest(request.id, 'accept')}
                        disabled={processingRequests.has(request.id)}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition text-sm flex items-center"
                      >
                        {processingRequests.has(request.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => respondToConnectionRequest(request.id, 'reject')}
                        disabled={processingRequests.has(request.id)}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition text-sm flex items-center"
                      >
                        {processingRequests.has(request.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Rejecting...
                          </>
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard') {
    return (
      <div className="bg-[#0f172a] text-white min-h-screen px-4 py-8 font-['Inter']">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-5xl font-bold mb-4 text-white flex items-center justify-center">
              <Users className="w-10 h-10 mr-3 text-blue-500" />
              Team Finder
            </h2>
            <p className="text-gray-300">Find and connect with team members</p>
          </div>

          {!profileComplete && (
            <div className="mb-6 bg-yellow-900/20 border-2 border-yellow-500/50 rounded-xl p-6">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Complete Your Profile</h3>
                  <p className="text-yellow-200 mb-2">
                    {profileCheckMessage || 'Your profile is incomplete. Please fill in all required fields to unlock team matching features.'}
                  </p>
                  <button 
                    onClick={handleCompleteProfile}
                    className="inline-flex items-center bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition font-semibold mt-2"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Complete Profile Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-300">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={handleFindTeamMembers}
              disabled={!profileComplete || checkingProfile}
              className={`px-6 py-3 rounded-xl font-semibold transition text-lg flex items-center ${
                profileComplete 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              <Search className="w-5 h-5 mr-2" />
              {checkingProfile ? 'Checking Profile...' : 'Find Team Members'}
            </button>
            
            <button
              onClick={() => setCurrentView('requests')}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold transition text-lg flex items-center relative"
            >
              <Bell className="w-5 h-5 mr-2" />
              Requests
              {pendingRequestCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {pendingRequestCount}
                </span>
              )}
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Connected Members ({connectedProfiles.length})
            </h3>
            
            {connectedProfiles.length === 0 ? (
              <div className="bg-[#1e293b] p-6 rounded-lg border border-gray-700 text-center">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No connections yet</p>
                <p className="text-gray-500 text-sm mt-1">Find team members to connect with</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedProfiles.map((profile) => (
                  <div key={profile.id} className="bg-green-900/20 p-4 rounded-xl border-2 border-green-500/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-green-300">{profile.name}</h4>
                        <p className="text-gray-400 text-sm">{profile.role}</p>
                      </div>
                      <span className="bg-green-600 px-2 py-1 rounded-full text-xs font-semibold">
                        Connected
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-300 mb-3">
                      <strong>Experience:</strong> {profile.experience} • {profile.availability}
                    </div>
                    
                    {profile.location && (
                      <div className="text-sm text-gray-300 mb-3 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {profile.location}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {profile.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-green-600/30 text-green-200 rounded-md text-xs">
                          {skill}
                        </span>
                      ))}
                      {profile.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-600/30 text-gray-400 rounded-md text-xs">
                          +{profile.skills.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startChat(profile.id, profile.name)}
                          className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-xs flex items-center justify-center"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </button>
                        <button
                          onClick={() => window.open(`mailto:${profile.email}`)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-xs flex items-center justify-center"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </button>
                      </div>
                      
                      <button
                        onClick={() => disconnectUser(profile.id, profile.name)}
                        disabled={processingRequests.has(profile.id)}
                        className="w-full bg-red-600/80 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed px-3 py-2 rounded text-xs flex items-center justify-center transition"
                      >
                        {processingRequests.has(profile.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <UserMinus className="w-3 h-3 mr-1" />
                            Disconnect
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Search Form View
  if (currentView === 'search') {
    return (
      <div className="bg-[#0f172a] text-white min-h-screen px-4 py-8 font-['Inter']">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-indigo-400 flex items-center">
              <Search className="w-8 h-8 mr-3" />
              Find Team Members
            </h2>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Required Skills *</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Python, UI/UX, Marketing"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                >
                  Add
                </button>
              </div>
              {requirements.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {requirements.required_skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-600 rounded-full text-sm flex items-center">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-indigo-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Interests</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. EdTech, HealthTech, AI"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
                >
                  Add
                </button>
              </div>
              {requirements.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {requirements.interests.map((interest, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-600 rounded-full text-sm flex items-center">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-2 text-purple-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Preferred Role</label>
                <input
                  type="text"
                  name="current_role"
                  value={requirements.current_role}
                  onChange={handleInputChange}
                  placeholder="e.g. Developer, Designer"
                  className="w-full px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Experience Level</label>
                <select
                  name="experience"
                  value={requirements.experience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Any Experience</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Availability</label>
                <select
                  name="availability"
                  value={requirements.availability}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Any Availability</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Full Time">Full Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={requirements.location}
                  onChange={handleInputChange}
                  placeholder="e.g. San Francisco, Remote"
                  className="w-full px-4 py-2 rounded-lg bg-[#1e293b] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={isSearching || requirements.required_skills.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold transition flex items-center"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Results View
  return (
    <div className="bg-[#0f172a] text-white min-h-screen px-4 py-8 font-['Inter']">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-indigo-400 flex items-center">
              <Users className="w-8 h-8 mr-3" />
              Search Results
            </h2>
            <p className="text-gray-300">Found {matchedProfiles.length} potential team members</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('search')}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
            >
              New Search
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {matchedProfiles.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No matches found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search criteria</p>
            <button
              onClick={() => setCurrentView('search')}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg transition"
            >
              New Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchedProfiles.map((profile) => (
              <div key={profile.id} className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
                    <p className="text-gray-400 text-sm">{profile.role}</p>
                  </div>
                  <div className="bg-indigo-600 px-3 py-1 rounded-full flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    <span className="text-sm font-semibold">{profile.match_score}%</span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-300">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{profile.experience} • {profile.availability}</span>
                  </div>
                  
                  {profile.location && (
                    <div className="flex items-center text-sm text-gray-300">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>

                {profile.matched_skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-green-400 mb-2">Matched Skills ({profile.matched_skills.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.matched_skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-green-600/20 text-green-300 rounded-md text-xs border border-green-500/30">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 4).map((skill, index) => (
                      <span 
                        key={index} 
                        className={`px-2 py-1 rounded-md text-xs ${
                          profile.matched_skills.includes(skill) 
                            ? 'bg-green-600/20 text-green-300 border border-green-500/30' 
                            : 'bg-indigo-600/20 text-indigo-300'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length > 4 && (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded-md text-xs">
                        +{profile.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => window.open(`mailto:${profile.email}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </button>
                  
                  {renderConnectionButton(profile)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamFinder;
