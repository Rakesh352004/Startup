import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Users, Star, Phone, Mail, AlertCircle } from 'lucide-react';
import axios from 'axios';

// Interface matching ProfilePage structure
interface TeamRequirements {
  required_skills: string[];
  preferred_role: string;
  experience: string;
  availability: string;
  location: string;
  interests: string[];
  additional_requirements: string;
}

// Interface for matched profiles (matching ProfilePage ProfileData)
interface MatchedProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  skills: string[];
  interests: string[];
  preferred_role: string;
  experience: string;
  availability: string;
  location: string;
  match_score: number;
  matched_skills: string[];
  matched_interests: string[];
  connection_status?: string;
}

const TeamFinder = () => {
  const [requirements, setRequirements] = useState<TeamRequirements>({
    required_skills: [],
    preferred_role: '',
    experience: '',
    availability: '',
    location: '',
    interests: [],
    additional_requirements: ''
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedProfiles, setMatchedProfiles] = useState<MatchedProfile[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set());
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load user's existing connections on component mount
  const loadExistingConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:8000/api/connections', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const connections = response.data.connections || [];
        const connectedUserIds = connections.map((conn: any) => conn.id);
        setConnectedUsers(connectedUserIds);
      }
    } catch (error) {
      console.error('Error loading existing connections:', error);
    }
  };

  // Load connections when component mounts
  useEffect(() => {
    loadExistingConnections();
  }, []);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, type: 'skill' | 'interest') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'interest') addInterest();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequirements(prev => ({ ...prev, [name]: value }));
  };

  // Function to calculate match score based on requirements
  const calculateMatchScore = (profile: any, requirements: TeamRequirements): number => {
    let score = 0;
    let totalCriteria = 0;

    // Skills matching (40% weight)
    if (requirements.required_skills.length > 0) {
      const matchedSkills = profile.skills.filter((skill: string) => 
        requirements.required_skills.some(reqSkill => 
          skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      score += (matchedSkills.length / requirements.required_skills.length) * 40;
      totalCriteria += 40;
    }

    // Interests matching (25% weight)
    if (requirements.interests.length > 0) {
      const matchedInterests = profile.interests.filter((interest: string) => 
        requirements.interests.some(reqInterest => 
          interest.toLowerCase().includes(reqInterest.toLowerCase()) ||
          reqInterest.toLowerCase().includes(interest.toLowerCase())
        )
      );
      score += (matchedInterests.length / requirements.interests.length) * 25;
      totalCriteria += 25;
    }

    // Experience matching (15% weight)
    if (requirements.experience && profile.experience === requirements.experience) {
      score += 15;
    }
    totalCriteria += 15;

    // Availability matching (10% weight)
    if (requirements.availability && profile.availability === requirements.availability) {
      score += 10;
    }
    totalCriteria += 10;

    // Preferred role matching (10% weight)
    if (requirements.preferred_role && 
        profile.preferred_role.toLowerCase().includes(requirements.preferred_role.toLowerCase())) {
      score += 10;
    }
    totalCriteria += 10;

    return Math.min(Math.round((score / totalCriteria) * 100), 100);
  };

  const resetSearch = () => {
    setShowResults(false);
    setMatchedProfiles([]);
    setError(null);
  };

  // Connection handlers
  const handleConnect = async (targetUserId: string) => {
    setConnectingUsers(prev => new Set(prev).add(targetUserId));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.post(
        'http://localhost:8000/api/connections',
        { target_user_id: targetUserId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Update the profile's connection status
        setMatchedProfiles(prev => 
          prev.map(profile => 
            profile.id === targetUserId 
              ? { ...profile, connection_status: 'connected' }
              : profile
          )
        );
        
        // Update connected users list
        setConnectedUsers(prev => [...prev, targetUserId]);
      }
    } catch (error) {
      console.error('Error connecting to user:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (targetUserId: string) => {
    setConnectingUsers(prev => new Set(prev).add(targetUserId));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.delete(
        `http://localhost:8000/api/connections/${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Update the profile's connection status
        setMatchedProfiles(prev => 
          prev.map(profile => 
            profile.id === targetUserId 
              ? { ...profile, connection_status: 'disconnected' }
              : profile
          )
        );
        
        // Update connected users list
        setConnectedUsers(prev => prev.filter(id => id !== targetUserId));
      }
    } catch (error) {
      console.error('Error disconnecting from user:', error);
      setError('Failed to disconnect. Please try again.');
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to search for team members.');
        setIsSearching(false);
        return;
      }

      // Load existing connections first to ensure we have the latest state
      await loadExistingConnections();

      // Get all profiles from backend
      const response = await axios.get('http://localhost:8000/api/profiles/all', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const allProfiles = response.data.profiles || [];
      
      // Check if database has any profiles
      if (allProfiles.length === 0) {
        setMatchedProfiles([]);
        setShowResults(true);
        console.log("No profiles found in database");
        return;
      }
      
      // Process profiles and calculate match scores
      const matchedProfiles = allProfiles
        .map((profile: any) => {
          const matchScore = calculateMatchScore(profile, requirements);
          const matchedSkills = profile.skills?.filter((skill: string) => 
            requirements.required_skills.some(reqSkill => 
              skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
              reqSkill.toLowerCase().includes(skill.toLowerCase())
            )
          ) || [];
          
          const matchedInterests = profile.interests?.filter((interest: string) => 
            requirements.interests.some(reqInterest => 
              interest.toLowerCase().includes(reqInterest.toLowerCase()) ||
              reqInterest.toLowerCase().includes(interest.toLowerCase())
            )
          ) || [];

          // Set connection status based on existing connections
          const connectionStatus = connectedUsers.includes(profile.id) ? 'connected' : 'disconnected';

          return {
            ...profile,
            skills: profile.skills || [],
            interests: profile.interests || [],
            match_score: matchScore,
            matched_skills: matchedSkills,
            matched_interests: matchedInterests,
            connection_status: connectionStatus
          };
        })
        .filter((profile: MatchedProfile) => profile.match_score >= 30) // Only show profiles with 30%+ match
        .sort((a: MatchedProfile, b: MatchedProfile) => b.match_score - a.match_score) // Sort by match score
        .slice(0, 10); // Limit to top 10 matches

      setMatchedProfiles(matchedProfiles);
      setShowResults(true);
      
      console.log(`Found ${matchedProfiles.length} matching profiles`);
      
    } catch (error) {
      console.error('Error finding team members:', error);
      
      // Enhanced error handling with specific messages
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (error.response?.status === 404) {
          setError('Team finder service is currently unavailable. Please try again later.');
        } else if (error.response?.status === 500) {
          setError('Server error occurred. Please try again later.');
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          setError('Unable to connect to server. Please check your internet connection and make sure the backend is running.');
        } else {
          setError(`Search failed: ${error.response?.data?.detail || 'Unknown error occurred'}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      // Show empty results instead of leaving user hanging
      setMatchedProfiles([]);
      setShowResults(true);
      
    } finally {
      setIsSearching(false);
    }
  };

  // Results View
  if (showResults) {
    return (
      <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center px-4 font-['Inter']">
        <div className="bg-[#1e293b] w-full max-w-6xl p-8 rounded-xl shadow-lg mt-10 mb-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-indigo-400 flex items-center justify-center">
              <Users className="w-8 h-8 mr-3" />
              Team Match Results
            </h2>
            <p className="text-gray-300">
              Found {matchedProfiles.length} potential team members matching your requirements
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Connected Users Section */}
          {matchedProfiles.some(profile => profile.connection_status === 'connected') && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Your Connected Team Members ({matchedProfiles.filter(p => p.connection_status === 'connected').length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {matchedProfiles
                  .filter(profile => profile.connection_status === 'connected')
                  .map((profile) => (
                    <div key={`connected-${profile.id}`} className="bg-green-900/20 p-4 rounded-xl border-2 border-green-500/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-green-300">{profile.name}</h4>
                          <p className="text-gray-400 text-sm">{profile.role}</p>
                        </div>
                        <span className="bg-green-600 px-2 py-1 rounded-full text-xs font-semibold">
                          Connected
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        <strong>Role:</strong> {profile.preferred_role || 'Not specified'}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-green-600/30 text-green-200 rounded-md text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(`mailto:${profile.email}`)}
                          className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs flex items-center justify-center"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </button>
                        <button 
                          onClick={() => handleDisconnect(profile.id)}
                          disabled={connectingUsers.has(profile.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-3 py-1 rounded text-xs"
                        >
                          {connectingUsers.has(profile.id) ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {matchedProfiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No matches found</h3>
              <div className="max-w-md mx-auto">
                <p className="text-gray-500 mb-6">
                  {error ? 
                    'There was an issue with your search. Please try again or check if the backend service is running.' : 
                    'Try adjusting your search criteria, reducing the number of required skills, or broadening your requirements.'
                  }
                </p>
                <div className="space-y-2 text-sm text-gray-400 mb-6">
                  <p>💡 Tips for better results:</p>
                  <ul className="text-left list-disc list-inside space-y-1">
                    <li>Use fewer, more general skill terms</li>
                    <li>Try different experience levels</li>
                    <li>Make interests optional rather than required</li>
                    <li>Check if other users have created profiles</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={resetSearch}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg transition"
              >
                New Search
              </button>
            </div>
          ) : (
            <>
              {/* Available Profiles Section */}
              {matchedProfiles.filter(profile => profile.connection_status !== 'connected').length > 0 && (
                <>
                  <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
                    <Search className="w-5 h-5 mr-2" />
                    Available Team Members ({matchedProfiles.filter(p => p.connection_status !== 'connected').length})
                  </h3>
                  
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {matchedProfiles
                      .filter(profile => profile.connection_status !== 'connected')
                      .map((profile) => (
                        <div key={profile.id} className="bg-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-indigo-500 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
                              <p className="text-gray-400 text-sm">{profile.role || 'Role not specified'}</p>
                            </div>
                            <div className="bg-indigo-600 px-3 py-1 rounded-full flex items-center">
                              <Star className="w-3 h-3 mr-1" />
                              <span className="text-sm font-semibold">{profile.match_score}%</span>
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="bg-[#1e293b] p-3 rounded-lg mb-4 border border-gray-600">
                            <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              Contact Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center">
                                <Mail className="w-3 h-3 mr-2 text-gray-400" />
                                <a 
                                  href={`mailto:${profile.email}`} 
                                  className="text-blue-400 hover:text-blue-300 break-all text-xs"
                                >
                                  {profile.email}
                                </a>
                              </div>
                              {profile.phone && (
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 mr-2 text-gray-400" />
                                  <a 
                                    href={`tel:${profile.phone}`} 
                                    className="text-green-400 hover:text-green-300 text-xs"
                                  >
                                    {profile.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-sm text-gray-300">
                              <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{profile.experience || 'Not specified'} • {profile.availability || 'Not specified'}</span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-300">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="truncate">{profile.location || 'Location not specified'}</span>
                            </div>

                            <div className="text-sm">
                              <span className="text-gray-400">Preferred Role: </span>
                              <span className="text-white">{profile.preferred_role || 'Not specified'}</span>
                            </div>
                          </div>

                          {/* Matched Skills */}
                          {profile.matched_skills.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-green-400 mb-2 flex items-center">
                                ✅ Matched Skills ({profile.matched_skills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {profile.matched_skills.map((skill, index) => (
                                  <span 
                                    key={index} 
                                    className="px-2 py-1 bg-green-600/20 text-green-300 rounded-md text-xs border border-green-500/30"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Skills */}
                          {profile.skills.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-400 mb-2">All Skills:</p>
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
                          )}

                          {/* Matched Interests */}
                          {profile.matched_interests.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-purple-400 mb-2 flex items-center">
                                ✅ Matched Interests ({profile.matched_interests.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {profile.matched_interests.map((interest, index) => (
                                  <span 
                                    key={index} 
                                    className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-md text-xs border border-purple-500/30"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Interests */}
                          {profile.interests.length > 0 && (
                            <div className="mb-6">
                              <p className="text-xs text-gray-400 mb-2">Interests:</p>
                              <div className="flex flex-wrap gap-1">
                                {profile.interests.slice(0, 3).map((interest, index) => (
                                  <span 
                                    key={index} 
                                    className={`px-2 py-1 rounded-md text-xs ${
                                      profile.matched_interests.includes(interest) 
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                                        : 'bg-purple-600/10 text-purple-400'
                                    }`}
                                  >
                                    {interest}
                                  </span>
                                ))}
                                {profile.interests.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded-md text-xs">
                                    +{profile.interests.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="space-y-2">
                            <button 
                              onClick={() => window.open(`mailto:${profile.email}?subject=Team Collaboration Opportunity&body=Hi ${profile.name},%0A%0AI found your profile through our startup team finder and would like to discuss a potential collaboration opportunity.%0A%0ABest regards`)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </button>
                            {profile.phone && (
                              <button 
                                onClick={() => window.open(`tel:${profile.phone}`)}
                                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                Call Now
                              </button>
                            )}
                            
                            {/* Connect/Disconnect Button */}
                            {profile.connection_status === 'connected' ? (
                              <button 
                                onClick={() => handleDisconnect(profile.id)}
                                disabled={connectingUsers.has(profile.id)}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
                              >
                                {connectingUsers.has(profile.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                    Disconnecting...
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-4 h-4 mr-2" />
                                    Disconnect
                                  </>
                                )}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleConnect(profile.id)}
                                disabled={connectingUsers.has(profile.id)}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition text-sm flex items-center justify-center"
                              >
                                {connectingUsers.has(profile.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-4 h-4 mr-2" />
                                    Connect
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={resetSearch}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition"
                >
                  New Search
                </button>
                <button className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg transition">
                  Save Search
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Search Form View
  return (
    <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center px-4 font-['Inter']">
      <div className="bg-[#1e293b] w-full max-w-4xl p-8 rounded-xl shadow-lg mt-10 mb-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 text-indigo-400 flex items-center justify-center">
            🚀 Build Your Dream Team
          </h2>
          <p className="text-gray-400">Define your requirements and find the perfect team members</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Required Skills - matching ProfilePage skills field */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Primary Technical / Business Skills Required *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. Python, UI/UX, Marketing, Finance"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'skill')}
                className="flex-1 px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addSkill}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {requirements.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {requirements.required_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-600 rounded-full text-sm flex items-center"
                  >
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
            <p className="text-xs text-gray-400 mt-1">Add at least one required skill</p>
          </div>

          {/* Area(s) of Interest - matching ProfilePage interests field */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Area(s) of Interest</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. EdTech, HealthTech, AI, SaaS"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'interest')}
                className="flex-1 px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addInterest}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {requirements.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {requirements.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-600 rounded-full text-sm flex items-center"
                  >
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
            <p className="text-xs text-gray-400 mt-1">Optional: Add relevant interests for better matching</p>
          </div>

          {/* Two column layout for role and experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preferred Role in Startup - exact match from ProfilePage */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Preferred Role in Startup</label>
              <input
                type="text"
                name="preferred_role"
                value={requirements.preferred_role}
                onChange={handleChange}
                placeholder="e.g. Developer, Product Manager, etc."
                className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Experience Level - exact match from ProfilePage */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Experience Level</label>
              <select
                name="experience"
                value={requirements.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Any Experience Level</option>
                <option>Junior</option>
                <option>Mid</option>
                <option>Senior</option>
              </select>
            </div>
          </div>

          {/* Two column layout for availability and location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Availability - exact match from ProfilePage */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Availability</label>
              <select
                name="availability"
                value={requirements.availability}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Any Availability</option>
                <option>Part Time</option>
                <option>Full Time</option>
              </select>
            </div>

            {/* Location / Timezone - exact match from ProfilePage */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Location / Timezone</label>
              <input
                type="text"
                name="location"
                value={requirements.location}
                onChange={handleChange}
                placeholder="e.g. Bangalore, IST / UTC+5:30"
                className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Additional Requirements */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Additional Requirements</label>
            <textarea
              name="additional_requirements"
              value={requirements.additional_requirements}
              onChange={handleChange}
              placeholder="Any specific requirements, preferences, or additional information..."
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Optional: Describe any specific requirements or preferences</p>
          </div>

          {/* Privacy Notice - matching ProfilePage */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400">
              <span className="text-indigo-400 font-semibold">Privacy Note:</span> Your search will only match 
              with users who have opted to be discoverable. Contact information is shared only after successful matches.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={isSearching || requirements.required_skills.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold transition flex items-center"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching for matches...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Team Members
                </>
              )}
            </button>
          </div>

          {/* Search Tips */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-700 mt-6">
            <h4 className="text-sm font-semibold text-indigo-400 mb-2">💡 Search Tips:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Add multiple skills to find diverse team members</li>
              <li>• Include both technical and business skills for balanced teams</li>
              <li>• Consider different experience levels for mentorship opportunities</li>
              <li>• Location matching helps with timezone coordination</li>
              <li>• If no results, try broader skill terms or fewer requirements</li>
            </ul>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TeamFinder;