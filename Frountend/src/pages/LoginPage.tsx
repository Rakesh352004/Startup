import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  role: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
        
        // Redirect based on role
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
    <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1e293b] rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-indigo-400 text-center">Welcome Back</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#0f172a] border border-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg"
          >
            {busy ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-4 text-gray-400 text-sm text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;