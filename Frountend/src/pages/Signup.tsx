import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { apiService } from "../services/api"; // Add this import

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword;
  const passwordOk = password.length >= 6;
  const canSubmit =
    name.trim() !== "" &&
    email.trim() !== "" &&
    passwordOk &&
    passwordsMatch &&
    !busy;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordOk) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      // Use apiService instead of direct fetch
      const response = await apiService.register({
        name,
        email,
        password,
        confirm_password: confirmPassword
      });

      if (response.data) {
        alert("Registration successful — please login");
        navigate("/signin", { replace: true });
      } else {
        setError(response.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating Blobs */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 opacity-20 blur-3xl animate-[float_12s_ease-in-out_infinite]"
          style={{
            top: `${20 + i * 25}%`,
            left: `${15 + i * 30}%`,
            animationDelay: `${i * 3}s`,
          }}
        />
      ))}

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-lg rounded-3xl border border-gray-700/50 shadow-2xl p-10 flex flex-col justify-center animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mb-3 animate-bounce-slow">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white animate-slide-up">
            Create your account
          </h2>
          <p className="text-gray-400 mt-1">Enter your details below</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
          <div className="animate-slide-up delay-100">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
              required
            />
          </div>

          <div className="animate-slide-up delay-150">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
              required
            />
          </div>

          <div className="animate-slide-up delay-200">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="animate-slide-up delay-250">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Inline Errors */}
          {!passwordOk && (
            <p className="text-red-400 text-sm">Password must be at least 6 characters.</p>
          )}
          {!passwordsMatch && confirmPassword.length > 0 && (
            <p className="text-red-400 text-sm">Passwords do not match.</p>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
              canSubmit
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transform hover:-translate-y-1 hover:scale-105"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {busy ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing up...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/signin" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {/* Tailwind Keyframes */}
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        .animate-slide-up { animation: slideUp 0.6s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};

export default Signup;