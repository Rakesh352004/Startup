import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Briefcase, Code, Heart, Clock, MapPin, Award } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  skills: string[];
  interests: string[];
  experience: string;
  availability: string;
  location: string;
}

const Profile = () => {
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    role: '',
    skills: [],
    interests: [],
    experience: '',
    availability: '',
    location: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get<ProfileData>('http://localhost:8000/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setFormData({
            name: response.data.name || '',
            email: response.data.email || '',
            role: response.data.role || '',
            skills: response.data.skills || [],
            interests: response.data.interests || [],
            experience: response.data.experience || '',
            availability: response.data.availability || '',
            location: response.data.location || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'skills' || name === 'interests') {
      const arrayValue = value.split(',').map(item => item.trim());
      setFormData(prev => ({ ...prev, [name]: arrayValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found');
        return;
      }

      await axios.post('http://localhost:8000/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('Profile saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white min-h-screen flex items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/50">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Your Profile
          </h1>
          <p className="text-gray-400 text-sm">Manage your professional information</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-8 space-y-6">
            
            {/* Personal Information Section */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2 pb-2 border-b border-slate-700">
                <User className="w-5 h-5" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    Full Name
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name}
                    onChange={handleChange}
                    required 
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required 
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  Current Role / Title
                </label>
                <input 
                  type="text" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                  placeholder="e.g. Software Engineer, Product Designer"
                />
              </div>
            </div>

            {/* Skills & Interests Section */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2 pb-2 border-b border-slate-700">
                <Code className="w-5 h-5" />
                Skills & Interests
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Technical & Business Skills
                </label>
                <input 
                  type="text" 
                  name="skills" 
                  value={formData.skills.join(', ')}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                  placeholder="Python, React, UI/UX, Marketing, Data Analysis"
                />
                <p className="text-xs text-gray-500">Separate skills with commas</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-indigo-400" />
                  Areas of Interest
                </label>
                <input 
                  type="text" 
                  name="interests" 
                  value={formData.interests.join(', ')}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                  placeholder="AI, HealthTech, EdTech, Fintech, SaaS"
                />
                <p className="text-xs text-gray-500">Separate interests with commas</p>
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2 pb-2 border-b border-slate-700">
                <Award className="w-5 h-5" />
                Professional Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Experience Level
                  </label>
                  <select 
                    name="experience" 
                    value={formData.experience}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white"
                  >
                    <option value="">Select Level</option>
                    <option>Junior</option>
                    <option>Mid</option>
                    <option>Senior</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Availability
                  </label>
                  <select 
                    name="availability" 
                    value={formData.availability}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white"
                  >
                    <option value="">Select Type</option>
                    <option>Part Time</option>
                    <option>Full Time</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    Location
                  </label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder-gray-500"
                    placeholder="e.g. Bangalore, IST"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit" 
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105"
                  >
                    Save Profile
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;