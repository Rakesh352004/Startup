import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a032a] to-[#0b052e] text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name || 'Founder'}!</h1>
      <p className="text-gray-300">Your startup dashboard content goes here.</p>
    </div>
  );
}