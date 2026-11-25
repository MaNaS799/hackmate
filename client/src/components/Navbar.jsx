import React from "react";
import {
  Flame,
  MessageSquare,
  UserCheck,
  LogOut,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  ChevronDown,
} from "lucide-react";

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  events = [],
  activeEventId,
  onSelectEvent,
  onLogout,
  matchCount = 0,
}) {
  return (
    <>
      {/* Top Desktop & Tablet Header */}
      <header className="bg-slate-950/85 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-xl shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
                  HackMate
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-full border border-indigo-400/25 uppercase tracking-wider">
                  Campus
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 font-medium -mt-0.5">
                Teammate Matchmaker
              </p>
            </div>
          </div>

          {/* Hackathon Event Selector (SRS §3.2) */}
          {user && events && events.length > 0 && (
            <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <select
                value={activeEventId || ""}
                onChange={(e) => onSelectEvent(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer max-w-[210px]"
              >
                {events.map((ev) => (
                  <option key={ev._id || ev.id} value={ev._id || ev.id} className="bg-slate-900 text-white">
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop Navigation Tabs */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 sm:space-x-1.5">
              {/* Tab 1: Events */}
              <button
                onClick={() => setActiveTab("events")}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "events"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Events</span>
              </button>

              {/* Tab 2: Swipe */}
              <button
                onClick={() => setActiveTab("swipe")}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "swipe"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Swipe Deck</span>
              </button>

              {/* Tab 3: Matches & Chat */}
              <button
                onClick={() => setActiveTab("matches")}
                className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "matches"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Matches</span>
                {matchCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      activeTab === "matches"
                        ? "bg-white text-indigo-700"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {matchCount}
                  </span>
                )}
              </button>

              {/* Tab 4: Profile */}
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "profile"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Profile</span>
              </button>

              {/* Tab 5: Admin (if admin) */}
              {user.isAdmin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === "admin"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-md"
                      : "text-amber-400/70 hover:text-amber-300 hover:bg-slate-900/80"
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          )}

          {/* User Chip & Logout */}
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-700/50 overflow-hidden flex-shrink-0">
                  <img
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        user.name || "Me"
                      )}`
                    }
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-200 leading-tight">
                    {user.name?.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold leading-none">
                    {user.branch?.split(" ")[0] || user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-semibold">Campus Teammate Portal</span>
          )}
        </div>

        {/* Mobile Active Event Selector Bar */}
        {user && events && events.length > 0 && (
          <div className="lg:hidden px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Active Hackathon:</span>
            <select
              value={activeEventId || ""}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs"
            >
              {events.map((ev) => (
                <option key={ev._id || ev.id} value={ev._id || ev.id} className="bg-slate-900 text-white">
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Dark Glass UX) */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-xl py-1.5 px-3 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab("events")}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
              activeTab === "events" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span>Events</span>
          </button>

          <button
            onClick={() => setActiveTab("swipe")}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
              activeTab === "swipe" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            <span>Swipe</span>
          </button>

          <button
            onClick={() => setActiveTab("matches")}
            className={`relative flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
              activeTab === "matches" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span>Matches</span>
            {matchCount > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {matchCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
              activeTab === "profile" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <UserCheck className="w-5 h-5 mb-0.5" />
            <span>Profile</span>
          </button>

          {user.isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
                activeTab === "admin" ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Shield className="w-5 h-5 mb-0.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}
        </nav>
      )}
    </>
  );
}
