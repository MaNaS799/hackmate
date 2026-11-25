import React, { useState } from "react";
import {
  Shield,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Radio,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

export default function AdminEventsView({ token, currentUser, events = [], onEventsUpdated, onBack }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    mode: "offline",
    location: "Campus Lab",
    teamSize: 4,
    status: "upcoming",
    theme: "",
    color: "from-indigo-600 to-blue-600",
    badge: "Hackathon",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      mode: "offline",
      location: "Campus Lab",
      teamSize: 4,
      status: "upcoming",
      theme: "",
      color: "from-indigo-600 to-blue-600",
      badge: "Hackathon",
    });
    setEditingEventId(null);
    setShowCreateForm(false);
  };

  const handleEditClick = (ev) => {
    setEditingEventId(ev._id || ev.id);
    setFormData({
      title: ev.title || "",
      description: ev.description || ev.tagline || "",
      date: ev.date || "",
      mode: ev.mode || "offline",
      location: ev.location || "Campus Lab",
      teamSize: ev.teamSize || 4,
      status: ev.status || "upcoming",
      theme: ev.theme || "",
      color: ev.color || "from-indigo-600 to-blue-600",
      badge: ev.badge || "Hackathon",
    });
    setShowCreateForm(true);
  };

  const handleToggleStatus = async (ev) => {
    const evId = ev._id || ev.id;
    const newStatus = ev.status === "closed" ? "upcoming" : "closed";
    setLoading(true);
    try {
      await axios.put(
        `${API_BASE}/events/${evId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: "success", message: `Event status updated to ${newStatus}` });
      if (onEventsUpdated) onEventsUpdated();
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Error updating event" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      if (editingEventId) {
        await axios.put(`${API_BASE}/events/${editingEventId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus({ type: "success", message: "Hackathon updated successfully!" });
      } else {
        await axios.post(`${API_BASE}/events`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus({ type: "success", message: "New hackathon created successfully!" });
      }
      resetForm();
      if (onEventsUpdated) onEventsUpdated();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Operation failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-14">
      {/* Top Bar */}
      <div className="bg-slate-900/90 border border-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                Admin Hackathon Control Panel
              </h2>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                Admin Access
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, modify dates, adjust team limits, or close campus hackathons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => {
              if (showCreateForm) resetForm();
              else setShowCreateForm(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition glow-indigo"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showCreateForm ? "Cancel Form" : "Create New Event"}</span>
          </button>
        </div>
      </div>

      {status.message && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-2 text-xs font-semibold border ${
            status.type === "success"
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
              : "bg-rose-950/60 text-rose-300 border-rose-800/80"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Form (Create / Edit) */}
      {showCreateForm && (
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <h3 className="text-lg font-black text-white mb-4">
            {editingEventId ? "Edit Hackathon Details" : "Create New Campus Hackathon"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Hackathon Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart India Hackathon 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Date & Duration *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nov 20 - 22, 2026 (36 hrs)"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mode *</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="offline" className="bg-slate-900 text-white">In-Person Campus Lab</option>
                  <option value="online" className="bg-slate-900 text-white">Online / Virtual</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Campus Location / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium & Innovation Lab"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Team Size Limit</label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Registration Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="upcoming" className="bg-slate-900 text-white">Upcoming (Open for Matching)</option>
                  <option value="closed" className="bg-slate-900 text-white">Closed (Finished)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Description & Tagline</label>
              <textarea
                rows={2}
                placeholder="Brief summary of the hackathon theme and target problems..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Themes / Tracks (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. AI, Healthcare, Web3, Smart Cities, IoT"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg glow-indigo transition"
              >
                {loading ? "Saving..." : editingEventId ? "Save Changes" : "Create Hackathon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Table / List */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">
            Registered Campus Events ({events.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Click Edit to alter event parameters</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {events.map((ev) => {
            const evId = ev._id || ev.id;
            const isClosed = ev.status === "closed";
            return (
              <div key={evId} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{ev.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isClosed ? "bg-slate-800 text-slate-400" : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      }`}
                    >
                      {isClosed ? "Closed" : "Upcoming"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {ev.date} • {ev.location} • Max Team: {ev.teamSize || 4} • Participants: {ev.participantsCount || 0}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleToggleStatus(ev)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isClosed
                        ? "bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/70 border border-emerald-800/60"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {isClosed ? "Reopen Event" : "Close Event"}
                  </button>

                  <button
                    onClick={() => handleEditClick(ev)}
                    className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-indigo-400/30 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
