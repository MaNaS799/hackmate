import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ArrowRight,
  Shield,
  Layers,
  Clock,
  Radio,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

export default function EventsView({
  events = [],
  token,
  currentUser,
  onSelectEventAndSwipe,
  onEventsUpdated,
  onGoToAdmin,
}) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [joinNote, setJoinNote] = useState("");
  const [joiningEventId, setJoiningEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleJoin = async (eventId) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await axios.post(
        `${API_BASE}/events/${eventId}/join`,
        { note: joinNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJoiningEventId(null);
      setJoinNote("");
      if (onEventsUpdated) onEventsUpdated();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to join event");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (eventId) => {
    if (!token) return;
    if (!window.confirm("Leave teammate pool for this hackathon? Your profile won't appear in its deck.")) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/events/${eventId}/join`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (onEventsUpdated) onEventsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-14">
      {/* Dark Header Banner */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-extrabold tracking-wide uppercase mb-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Campus Hackathon Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Discover Active Hackathons
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Join specific events to enter their candidate pool, set your project pitch note, and swipe with students looking for teams for that event.
          </p>
        </div>

        {currentUser?.isAdmin && (
          <button
            onClick={onGoToAdmin}
            className="self-start md:self-auto px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Admin Event Manager</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((ev) => {
          const evId = ev._id || ev.id;
          const isJoined = Boolean(ev.hasJoined) || (Array.isArray(currentUser?.events) && currentUser?.events.includes(evId));
          const isClosed = ev.status === "closed";

          return (
            <div
              key={evId}
              className={`bg-slate-900/80 rounded-3xl border transition-all duration-200 shadow-xl hover:shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl ${
                isJoined ? "border-indigo-500/80 ring-2 ring-indigo-500/25 glow-indigo" : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div>
                {/* Banner Header */}
                <div className={`p-5 bg-gradient-to-r ${ev.color || "from-indigo-600 to-blue-600"} text-white relative`}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold bg-black/35 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                      {isClosed ? "Closed" : "Active Registration"}
                    </span>
                    <span className="text-[11px] font-bold bg-black/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {ev.mode === "online" ? "Virtual / Online" : "In-Person Campus"}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white tracking-tight">{ev.title}</h3>
                  <p className="text-xs text-white/90 mt-1 line-clamp-2 leading-relaxed font-medium">
                    {ev.description || ev.tagline}
                  </p>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="font-medium truncate">{ev.date}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="font-medium truncate">{ev.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="font-medium">Team Limit: {ev.teamSize || 4} Members</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-indigo-300 font-bold">
                        {ev.participantsCount || 0} Hackers Joined
                      </span>
                    </div>
                  </div>

                  {ev.theme && (
                    <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Themes / Problem Tracks
                      </span>
                      <p className="text-slate-300 font-medium">{ev.theme}</p>
                    </div>
                  )}

                  {/* Joined Badge */}
                  {isJoined && (
                    <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>You are enrolled in this hackathon!</span>
                      </div>
                      <button
                        onClick={() => handleLeave(evId)}
                        disabled={loading}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline"
                      >
                        Leave Pool
                      </button>
                    </div>
                  )}

                  {/* Pitch note form */}
                  {joiningEventId === evId && (
                    <div className="p-3.5 bg-indigo-950/50 border border-indigo-800/60 rounded-2xl space-y-2 animate-fade-in text-xs">
                      <label className="block font-bold text-indigo-200">
                        Optional Team Pitch Note (shown on your swipe card):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Building an automated hospital triage tool. Need backend dev!"
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 text-white placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setJoiningEventId(null)}
                          className="px-3 py-1.5 text-slate-400 hover:bg-slate-800 rounded-lg text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleJoin(evId)}
                          disabled={loading}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md"
                        >
                          {loading ? "Joining..." : "Confirm Join"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-950/70 border-t border-slate-800/70 flex items-center justify-between gap-2">
                {!isJoined ? (
                  <button
                    onClick={() => {
                      if (isClosed) return;
                      setJoiningEventId(evId);
                    }}
                    disabled={isClosed}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 glow-indigo"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Join Teammate Pool</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectEventAndSwipe(evId)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 glow-indigo"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Swipe Teammates for this Event</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
