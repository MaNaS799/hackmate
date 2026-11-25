import React, { useState, useEffect } from "react";
import { Search, Filter, Sparkles, User, MessageSquare, CheckCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

export default function HackerList({ currentUserId, onStartChatWithHacker }) {
  const [hackers, setHackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const fetchHackers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (skillFilter) params.skill = skillFilter;
      if (roleFilter !== "All") params.role = roleFilter;

      const response = await axios.get(`${API_BASE}/users`, { params });
      setHackers(response.data);
    } catch (err) {
      console.error("Error fetching hackers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHackers();
  }, [roleFilter]); // Refetch when role changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHackers();
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Discover Teammates</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {hackers.length} Found
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter hackers by their technical role or specific skillset
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Fullstack">Fullstack</option>
              <option value="AI/ML">AI/ML</option>
              <option value="UI/UX">UI/UX</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>

          {/* Skill Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative">
              <input
                type="text"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Search skill (e.g. React, Python)..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-r-xl hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </form>

          {/* Refresh Button */}
          <button
            onClick={fetchHackers}
            title="Refresh list"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hacker Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-xs text-slate-500 mt-2 font-medium">Loading hackers from MongoDB...</p>
        </div>
      ) : hackers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No hackers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try resetting your skill search or role filter to see all registered developers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hackers.map((hacker) => {
            const isSelf = hacker._id === currentUserId;
            return (
              <div
                key={hacker._id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isSelf ? "border-indigo-300 bg-indigo-50/20" : "border-slate-200"
                }`}
              >
                <div>
                  {/* Top Badge & Name */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900">
                          {hacker.name}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <span className="inline-block text-xs font-semibold text-indigo-600 mt-0.5">
                        {hacker.role}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        hacker.lookingForTeam
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hacker.lookingForTeam ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {hacker.lookingForTeam ? "Looking for Team" : "In a Team"}
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {hacker.bio || "Ready to hack and build cool software!"}
                  </p>

                  {/* Skills Tags */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hacker.skills && hacker.skills.length > 0 ? (
                        hacker.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-md font-medium transition"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills listed yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Joined {new Date(hacker.createdAt).toLocaleDateString()}
                  </span>

                  {!isSelf && (
                    <button
                      onClick={() => onStartChatWithHacker(hacker)}
                      className="flex items-center space-x-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
