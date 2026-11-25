import React, { useState } from "react";
import {
  UserCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
  Sparkles,
  Github,
  Linkedin,
  Award,
  Layers,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

const AVAILABLE_ROLES = [
  "Frontend",
  "Backend",
  "Fullstack",
  "AI/ML",
  "UI/UX",
  "Mobile",
  "DevOps",
  "Cybersecurity",
];

export default function ProfileCard({ user, token, onProfileUpdated, events = [] }) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    branch: user.branch || "Computer Science (CSE)",
    year: user.year || "3rd Year",
    role: user.role || "Fullstack",
    roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "Fullstack"],
    skills: Array.isArray(user.skills)
      ? user.skills.join(", ")
      : Array.isArray(user.techStack)
      ? user.techStack.join(", ")
      : user.skills || "",
    bio: user.bio || "",
    github: user.links?.github || "",
    linkedin: user.links?.linkedin || "",
    cgpa: user.cgpa || "",
    events: Array.isArray(user.events) ? user.events : [],
    isAvailable: user.isAvailable ?? user.lookingForTeam ?? true,
  });

  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleRoleToggle = (role) => {
    let currentRoles = [...formData.roles];
    if (currentRoles.includes(role)) {
      if (currentRoles.length > 1) {
        currentRoles = currentRoles.filter((r) => r !== role);
      }
    } else {
      currentRoles.push(role);
    }
    setFormData({
      ...formData,
      roles: currentRoles,
      role: currentRoles[0] || "Fullstack",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        branch: formData.branch,
        year: formData.year,
        role: formData.role,
        roles: formData.roles,
        skills: formData.skills,
        techStack: formData.skills,
        bio: formData.bio,
        links: {
          github: formData.github,
          linkedin: formData.linkedin,
        },
        cgpa: formData.cgpa ? Number(formData.cgpa) : null,
        isAvailable: formData.isAvailable,
        lookingForTeam: formData.isAvailable,
      };

      const res = await axios.put(`${API_BASE}/profile`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus({ type: "success", message: "Student profile updated successfully!" });
      onProfileUpdated(res.data.user);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-14">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800/80">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">{user.name}</h2>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-2 py-0.5 rounded-full font-bold">
                Verified Campus Student
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        {status.message && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center space-x-2 text-xs font-semibold border ${
              status.type === "success"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                : "bg-rose-950/60 text-rose-300 border-rose-800/80"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Academic Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Academic Branch
              </label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="Computer Science (CSE)" className="bg-slate-900 text-white">Computer Science & Eng (CSE)</option>
                <option value="Information Technology (IT)" className="bg-slate-900 text-white">Information Technology (IT)</option>
                <option value="Computer Engineering" className="bg-slate-900 text-white">Computer Engineering</option>
                <option value="AI & Data Science" className="bg-slate-900 text-white">AI & Data Science</option>
                <option value="Electronics & Communication (ECE)" className="bg-slate-900 text-white">Electronics & Comm (ECE)</option>
                <option value="Electrical Engineering" className="bg-slate-900 text-white">Electrical Engineering</option>
                <option value="Mechanical Engineering" className="bg-slate-900 text-white">Mechanical Engineering</option>
                <option value="Biotechnology" className="bg-slate-900 text-white">Biotechnology</option>
              </select>
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Year
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="1st Year" className="bg-slate-900 text-white">1st Year (Freshman)</option>
                <option value="2nd Year" className="bg-slate-900 text-white">2nd Year (Sophomore)</option>
                <option value="3rd Year" className="bg-slate-900 text-white">3rd Year (Junior)</option>
                <option value="4th Year" className="bg-slate-900 text-white">4th Year (Senior)</option>
              </select>
            </div>

            {/* Academic CGPA */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Academic CGPA (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                name="cgpa"
                placeholder="e.g. 9.15"
                value={formData.cgpa}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Technical Roles (Multi-select) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Your Role(s) (Multi-Select)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ROLES.map((r) => {
                const isSelected = formData.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleToggle(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md glow-indigo"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tech Stack & Key Skills (Comma separated)
            </label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g. React, Node.js, Python, Tailwind, Docker, Figma, MongoDB"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Bio Pitch */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Bio & Teammate Pitch
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell other students what you love building and what teammates you're looking for..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* GitHub & LinkedIn Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Github className="w-3.5 h-3.5 text-slate-400" />
                <span>GitHub URL (Optional)</span>
              </label>
              <input
                type="url"
                name="github"
                value={formData.github}
                onChange={handleChange}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Linkedin className="w-3.5 h-3.5 text-cyan-400" />
                <span>LinkedIn URL (Optional)</span>
              </label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-white">
                Actively Seeking Teammates
              </span>
              <span className="text-[11px] text-slate-400">
                When enabled, your profile appears in hackathon candidate decks
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 glow-indigo"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Saving Changes..." : "Save Student Profile"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
