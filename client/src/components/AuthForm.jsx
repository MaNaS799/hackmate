import React, { useState } from "react";
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  KeyRound,
  GraduationCap,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Fullstack",
    skills: "React, Node.js, Tailwind, MongoDB",
    bio: "Excited to join a hackathon team and build impactful projects!",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);
      const { token, user } = response.data;
      onAuthSuccess(token, user);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Authentication failed. Please verify your college email and credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickDemoLogin = async (demoEmail) => {
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: demoEmail,
        password: "password123",
      });
      const { token, user } = response.data;
      onAuthSuccess(token, user);
    } catch (err) {
      setError(err.response?.data?.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-4 px-2 pb-14">
      {/* Instant Demo Personas Banner (Sleek Dark Cyberpunk) */}
      <div className="mb-6 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          <span>Quick Demo Logins (Password: password123)</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Tap any student persona below to test instant swipe matching & real-time chat:
        </p>

        <div className="grid grid-cols-2 gap-2 text-left">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin("alice@thapar.edu")}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 rounded-xl transition transform active:scale-95"
          >
            <span className="block text-xs font-bold text-white">Alice Sharma</span>
            <span className="block text-[10px] text-pink-400 font-medium">Frontend Lead • CSE</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin("bob@thapar.edu")}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl transition transform active:scale-95"
          >
            <span className="block text-xs font-bold text-white">Bob Patel</span>
            <span className="block text-[10px] text-emerald-400 font-medium">Backend Lead • IT</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin("charlie@thapar.edu")}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 rounded-xl transition transform active:scale-95"
          >
            <span className="block text-xs font-bold text-white">Charlie Verma</span>
            <span className="block text-[10px] text-purple-400 font-medium">AI/ML Lead • COE</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin("admin@thapar.edu")}
            className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition transform active:scale-95"
          >
            <span className="block text-xs font-bold text-amber-300">Admin Account</span>
            <span className="block text-[10px] text-amber-400/80 font-medium">Manage Hackathons</span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-3 glow-indigo">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isLogin ? "Welcome to HackMate" : "Create Campus Account"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {isLogin
              ? "Sign in with your verified Thapar student email (@thapar.edu)"
              : "Register with your verified Thapar email (@thapar.edu)"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Manas Mishra"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Branch *
                  </label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="Computer Science (CSE)" className="bg-slate-900 text-white">CSE</option>
                    <option value="Information Technology (IT)" className="bg-slate-900 text-white">IT</option>
                    <option value="Computer Engineering" className="bg-slate-900 text-white">COE</option>
                    <option value="AI & Data Science" className="bg-slate-900 text-white">AI & DS</option>
                    <option value="Electronics (ECE)" className="bg-slate-900 text-white">ECE</option>
                    <option value="Electrical" className="bg-slate-900 text-white">EE</option>
                    <option value="Mechanical" className="bg-slate-900 text-white">Mechanical</option>
                    <option value="Biotechnology" className="bg-slate-900 text-white">Biotech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Year *
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="1st Year" className="bg-slate-900 text-white">1st Year</option>
                    <option value="2nd Year" className="bg-slate-900 text-white">2nd Year</option>
                    <option value="3rd Year" className="bg-slate-900 text-white">3rd Year</option>
                    <option value="4th Year" className="bg-slate-900 text-white">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Primary Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="Frontend" className="bg-slate-900 text-white">Frontend Developer</option>
                  <option value="Backend" className="bg-slate-900 text-white">Backend Developer</option>
                  <option value="Fullstack" className="bg-slate-900 text-white">Fullstack Engineer</option>
                  <option value="AI/ML" className="bg-slate-900 text-white">AI / ML Specialist</option>
                  <option value="UI/UX" className="bg-slate-900 text-white">UI / UX Designer</option>
                  <option value="Mobile" className="bg-slate-900 text-white">Mobile App Dev</option>
                  <option value="DevOps" className="bg-slate-900 text-white">DevOps & Cloud</option>
                  <option value="Cybersecurity" className="bg-slate-900 text-white">Cybersecurity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Skills & Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. React, Node.js, Python, Figma, Docker"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Thapar College Email *
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">@thapar.edu only</span>
            </div>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="rollno@thapar.edu or name@thapar.edu"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 mt-2 glow-indigo"
          >
            {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>
              {loading
                ? "Verifying..."
                : isLogin
                ? "Sign In to HackMate"
                : "Create Campus Account"}
            </span>
          </button>
        </form>

        <div className="mt-5 text-center pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition"
          >
            {isLogin
              ? "New student? Create your college profile"
              : "Already registered? Sign in with your college credentials"}
          </button>
        </div>
      </div>
    </div>
  );
}
