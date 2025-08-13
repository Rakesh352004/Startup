import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Defines the shape of the user's profile data.
interface ProfileData {
  name: string;
  email: string;
  role: string;
  skills: string[];
  interests: string[];
  preferred_role: string;
  experience: string;
  availability: number;
  location: string;
}

const Profile = () => {
  // Sets the initial state of the form data using the ProfileData interface.
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    role: '',
    skills: [],
    interests: [],
    preferred_role: '',
    experience: '',
    availability: 0,
    location: ''
  });

  // State to control edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Fetches the user's profile data from the API when the component loads.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Using generic type on the axios.get function for proper TypeScript inference.
        const response = await axios.get<ProfileData>('http://localhost:8000/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          // The data from the API is used to update the form state.
          setFormData({
            name: response.data.name || '',
            email: response.data.email || '',
            role: response.data.role || '',
            skills: response.data.skills || [],
            interests: response.data.interests || [],
            preferred_role: response.data.preferred_role || '',
            experience: response.data.experience || '',
            availability: response.data.availability || 0,
            location: response.data.location || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []); // The empty dependency array ensures this effect runs only once.

  // Handles changes to the form inputs.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'skills' || name === 'interests') {
      const arrayValue = value.split(',').map(item => item.trim());
      setFormData(prev => ({ ...prev, [name]: arrayValue }));
    } else if (name === 'availability') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handles saving the profile (replaces handleSubmit)
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

  // Renders the profile form.
  return (
    <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center px-4 font-['Inter']">
      <div className="bg-[#1e293b] w-full max-w-4xl p-8 rounded-xl shadow-lg mt-10 mb-10">
        <h2 className="text-3xl font-bold mb-6 text-indigo-400 text-center">👤 Complete Your Profile</h2>



        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          className="space-y-5"
        >
          {/* Full Name */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              required 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Current Role/Title */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current Role / Title</label>
            <input 
              type="text" 
              name="role" 
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Final year student, Software Engineer" 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Primary Technical / Business Skills</label>
            <input 
              type="text" 
              name="skills" 
              value={formData.skills.join(', ')}
              onChange={handleChange}
              placeholder="e.g. Python, UI/UX, Marketing, Finance" 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Use comma-separated values</p>
          </div>

          {/* Areas of Interest */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Area(s) of Interest</label>
            <input 
              type="text" 
              name="interests" 
              value={formData.interests.join(', ')}
              onChange={handleChange}
              placeholder="e.g. EdTech, HealthTech, AI, SaaS" 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Use comma-separated values</p>
          </div>

          {/* Preferred Role in Startup */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Preferred Role in Startup</label>
            <select 
              name="preferred_role" 
              value={formData.preferred_role}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option>Developer</option>
              <option>Product Manager</option>
              <option>UI/UX Designer</option>
              <option>Marketing</option>
              <option>Sales</option>
              <option>Finance</option>
            </select>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Experience Level</label>
            <select 
              name="experience" 
              value={formData.experience}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option>Junior</option>
              <option>Mid</option>
              <option>Senior</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Availability (hours/week)</label>
            <input 
              type="number" 
              name="availability" 
              value={formData.availability}
              onChange={handleChange}
              placeholder="e.g. 10, 20, 40" 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Location / Timezone */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Location / Timezone</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Bangalore, IST / UTC+5:30" 
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Edit and Save Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            
            <button 
              type="submit" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;