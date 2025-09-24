import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff, LogIn } from "lucide-react";

interface TokenPayload {
  sub: string;
  role: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);

        const decoded = jwtDecode<TokenPayload>(data.access_token);

        if (decoded.role === "developer") {
          navigate("/dashboard");
        } else {
          navigate("/home");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated floating blobs */}
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

      <div className="relative z-10 w-full max-w-5xl bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-lg rounded-3xl border border-gray-700/50 shadow-2xl flex overflow-hidden animate-fade-in">
        {/* Left Welcome Section */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,_white,_transparent_40%)] animate-pulse" />
          <h1 className="text-4xl font-bold mb-4 relative animate-slide-down">
            Welcome to StartupGPS
          </h1>
          <p className="text-lg text-indigo-100 relative text-center animate-fade-in">
            Navigate your startup journey with confidence and clarity.
          </p>
        </div>

        {/* Right Login Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mb-3 animate-bounce-slow">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white animate-slide-up">
              Sign in to your account
            </h2>
            <p className="text-gray-400 mt-1">Enter your details below</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 animate-fade-in"
          >
            <div className="animate-slide-up delay-100">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300"
                placeholder="Enter your email"
              />
            </div>

            <div className="animate-slide-up delay-200">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300 pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:hover:transform-none flex items-center justify-center gap-2 animate-pulse"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>

      {/* Extra Tailwind keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-slide-down {
          animation: slideDown 0.6s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
