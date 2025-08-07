import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  const togglePassword = (id: string) => {
    const field = document.getElementById(id) as HTMLInputElement;
    if (field) {
      field.type = field.type === 'password' ? 'text' : 'password';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    // Replace this with your API call or context logic
    console.log('Form submitted:', formData);

    // Redirect to login page after signup
    navigate('/signin');
  };

  return (
    <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-[#1e293b] p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-indigo-400 text-center">Create Your Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="relative">
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span onClick={() => togglePassword('password')} className="absolute right-3 top-9 text-gray-400 cursor-pointer">👁</span>
          </div>

          <div className="relative">
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <input
              type="password"
              id="confirm_password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span onClick={() => togglePassword('confirm_password')} className="absolute right-3 top-9 text-gray-400 cursor-pointer">👁</span>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
          >
          <Link to="/signin" className="text-indigo-400 hover:underline ml-1">Log in</Link>
          </button>
        </form>

        <p className="mt-4 text-gray-400 text-sm text-center">
          Already have an account?
          <Link to="/signin" className="text-indigo-400 hover:underline ml-1">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
