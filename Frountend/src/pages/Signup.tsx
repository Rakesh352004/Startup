import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword;
  const passwordOk = password.length >= 6; // adjust minimum length as needed
  const canSubmit = name.trim() !== "" && email.trim() !== "" && passwordOk && passwordsMatch && !busy;

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
      const res = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: include confirm_password here
        body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
      });

      if (res.status === 201 || res.ok) {
        // registration success — go to signin
        alert("Registration successful — please login");
        navigate("/signin", { replace: true });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white px-4">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-[#1e293b] p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">Create account</h2>

        {/* Name */}
        <label className="text-sm text-gray-400">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 rounded mb-3 bg-[#0f172a] border border-gray-700"
        />

        {/* Email */}
        <label className="text-sm text-gray-400">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          className="w-full px-3 py-2 rounded mb-3 bg-[#0f172a] border border-gray-700"
        />

        {/* Password */}
        <label className="text-sm text-gray-400">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          className="w-full px-3 py-2 rounded mb-3 bg-[#0f172a] border border-gray-700"
        />

        {/* Confirm Password */}
        <label className="text-sm text-gray-400">Confirm Password</label>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          type="password"
          className="w-full px-3 py-2 rounded mb-2 bg-[#0f172a] border border-gray-700"
        />

        {/* Inline validation messages */}
        {!passwordOk && (
          <p className="text-red-400 text-sm mb-2">Password must be at least 6 characters.</p>
        )}
        {!passwordsMatch && confirmPassword.length > 0 && (
          <p className="text-red-400 text-sm mb-2">Passwords do not match.</p>
        )}

        {/* Server / general error */}
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <button
          disabled={!canSubmit}
          className={`w-full py-2 rounded ${
            canSubmit ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {busy ? "Signing up..." : "Sign up"}
        </button>

        <p className="mt-4 text-gray-400 text-sm text-center">
          Already have an account?{" "}
          <Link to="/signin" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
