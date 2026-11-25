import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Handshake,
  X,
  Sparkles,
  GraduationCap,
  Briefcase,
  Code2,
  RefreshCw,
  MessageSquare,
  Award,
  Layers,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  Github,
  Linkedin,
  Lightbulb,
  MessageCircle,
  Zap,
  RotateCcw,
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../config";

export default function SwipeDeck({
  token,
  currentUser,
  activeEvent,
  onMatchCreated,
  onGoToMatches,
  onBrowseEvents,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");
  const [skillFilter, setSkillFilter] = useState("");
  const [isRewinding, setIsRewinding] = useState(false);
  const [rewindToast, setRewindToast] = useState(null);

  // Flight animation state for the card that is currently flying away
  const [exitingCard, setExitingCard] = useState(null); // { candidate, direction }

  // Drag physics state
  const [dragOffset, setDragOffset] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);

  // Fetch Deck from `/api/events/:id/deck` (SRS §3.3)
  const fetchDeck = useCallback(async () => {
    if (!token || !activeEvent) return;
    const evId = activeEvent._id || activeEvent.id;
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (roleFilter && roleFilter !== "All") params.role = roleFilter;
      if (skillFilter && skillFilter.trim()) params.skill = skillFilter.trim();

      const response = await axios.get(`${API_BASE}/events/${evId}/deck`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = response.data.candidates || response.data || [];
      setCandidates(list);
    } catch (err) {
      console.error("Error loading candidate deck:", err);
    } finally {
      setLoading(false);
    }
  }, [token, activeEvent, roleFilter, skillFilter]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  // INSTANT & SILKY SMOOTH OPTIMISTIC SWIPE
  // Immediately triggers animation and advances card with 0 network latency!
  const triggerSwipe = useCallback(
    (direction) => {
      if (candidates.length === 0) return;

      const currentCandidate = candidates[0];
      const evId = activeEvent?._id || activeEvent?.id;

      // 1. Immediately pop card into exiting flight animation
      setExitingCard({ candidate: currentCandidate, direction });
      setDragOffset(0);
      setDragOffsetY(0);
      setIsDragging(false);

      // 2. Immediately promote next card in the stack
      setCandidates((prev) => prev.slice(1));

      // 3. Clear exiting card after flight animation finishes (160ms)
      setTimeout(() => {
        setExitingCard(null);
      }, 180);

      // 4. Background network request (zero UI lag)
      if (evId && currentCandidate) {
        axios
          .post(
            `${API_BASE}/events/${evId}/swipe`,
            {
              targetId: currentCandidate._id || currentCandidate.id,
              direction: direction === "right" ? "right" : "left",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          .then((res) => {
            if (res.data?.isMatch) {
              onMatchCreated({
                match: res.data.match,
                matchedUser: res.data.matchedUser || currentCandidate,
              });
            }
          })
          .catch((err) => {
            console.error("Background swipe sync error:", err);
          });
      }
    },
    [candidates, activeEvent, token, onMatchCreated]
  );

  // Rewind / Undo Last Swipe
  const handleRewindSwipe = useCallback(async () => {
    if (!token || !activeEvent || isRewinding) return;
    const evId = activeEvent._id || activeEvent.id;
    setIsRewinding(true);
    try {
      const res = await axios.post(
        `${API_BASE}/events/${evId}/rewind`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.rewoundCandidate) {
        const restored = res.data.rewoundCandidate;
        setCandidates((prev) => [
          restored,
          ...prev.filter((c) => String(c._id || c.id) !== String(restored._id || restored.id)),
        ]);
        setRewindToast({
          type: "success",
          text: `Rewound swipe on ${restored.name}! ↩️`,
        });
        setTimeout(() => setRewindToast(null), 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "No recent swipes to undo.";
      setRewindToast({ type: "error", text: msg });
      setTimeout(() => setRewindToast(null), 3000);
    } finally {
      setIsRewinding(false);
    }
  }, [token, activeEvent, isRewinding]);

  // Keyboard navigation (Instant Left/Right/Rewind)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;

      if (e.key === "ArrowLeft") {
        if (candidates.length === 0) return;
        e.preventDefault();
        triggerSwipe("left");
      }
      if (e.key === "ArrowRight") {
        if (candidates.length === 0) return;
        e.preventDefault();
        triggerSwipe("right");
      }
      if (e.key === "z" || e.key === "Z" || e.key === "Backspace") {
        e.preventDefault();
        handleRewindSwipe();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [candidates, triggerSwipe, handleRewindSwipe]);

  // Drag Gesture Physics
  const handlePointerDown = (e) => {
    if (candidates.length === 0) return;
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const diffX = clientX - dragStartXRef.current;
    const diffY = clientY - dragStartYRef.current;
    setDragOffset(diffX);
    setDragOffsetY(diffY * 0.2); // Subtle vertical resistance
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 85;
    if (dragOffset > threshold) {
      triggerSwipe("right");
    } else if (dragOffset < -threshold) {
      triggerSwipe("left");
    } else {
      // Snap back instantly
      setDragOffset(0);
      setDragOffsetY(0);
    }
  };

  // Demo helper: Reset swipes
  const handleResetSwipes = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/swipes/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDeck();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Skill-Fit Algorithm
  const computeSkillFit = (me, target) => {
    if (!me || !target) return null;
    const myRoles = (me.roles || [me.role] || []).map((r) => r.toLowerCase());
    const targetRoles = (target.roles || [target.role] || []).map((r) => r.toLowerCase());

    const mySkills = new Set((me.techStack || me.skills || []).map((s) => s.toLowerCase()));
    const targetSkills = target.techStack || target.skills || [];
    const newSkills = targetSkills.filter((s) => !mySkills.has(s.toLowerCase()));

    if (myRoles.includes("frontend") && (targetRoles.includes("backend") || targetRoles.includes("devops"))) {
      return {
        title: "High Role Fit 🎯",
        desc: `Covers Backend & Server logic (${newSkills.slice(0, 2).join(", ") || "APIs"}) to pair with your Frontend!`,
      };
    }
    if (myRoles.includes("backend") && (targetRoles.includes("frontend") || targetRoles.includes("ui/ux"))) {
      return {
        title: "High Role Fit 🎨",
        desc: `Covers Frontend & UI Design (${newSkills.slice(0, 2).join(", ") || "React, Figma"}) to pair with your APIs!`,
      };
    }
    if (targetRoles.includes("ai/ml") && !myRoles.includes("ai/ml")) {
      return {
        title: "AI Specialist Fit 🤖",
        desc: `Brings Machine Learning expertise (${newSkills.slice(0, 2).join(", ") || "PyTorch"}) to your team!`,
      };
    }
    if (newSkills.length > 0) {
      return {
        title: "Complementary Skills 💡",
        desc: `Adds ${newSkills.slice(0, 3).join(", ")} that you don't already have!`,
      };
    }
    return {
      title: "Strong Teammate Match ✨",
      desc: `Experienced in ${target.role} with verified campus credentials.`,
    };
  };

  const topCandidate = candidates[0];
  const nextCandidate = candidates[1];
  const skillFitHint = computeSkillFit(currentUser, topCandidate);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-14">
      {/* Active Event Dark Banner */}
      {activeEvent && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800/80 p-4 rounded-3xl shadow-xl flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white tracking-wide truncate">
                  {activeEvent.title}
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                  {activeEvent.badge || "Live"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {activeEvent.date} • {activeEvent.location}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-[11px] font-bold text-indigo-300 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-indigo-800/50">
              {candidates.length} in Deck
            </span>
          </div>
        </div>
      )}

      {/* Role & Skill Quick Filter Bar (Dark Glass) */}
      <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Role Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-initial">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-300 focus:outline-none cursor-pointer text-xs"
          >
            <option value="All" className="bg-slate-900 text-white">All Roles</option>
            <option value="Frontend" className="bg-slate-900 text-white">Frontend</option>
            <option value="Backend" className="bg-slate-900 text-white">Backend</option>
            <option value="Fullstack" className="bg-slate-900 text-white">Fullstack</option>
            <option value="AI/ML" className="bg-slate-900 text-white">AI / ML</option>
            <option value="UI/UX" className="bg-slate-900 text-white">UI / UX</option>
            <option value="Mobile" className="bg-slate-900 text-white">Mobile</option>
            <option value="DevOps" className="bg-slate-900 text-white">DevOps</option>
            <option value="Cybersecurity" className="bg-slate-900 text-white">Cybersecurity</option>
          </select>
        </div>

        {/* Skill Search */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search skill (e.g. React, Python)..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="bg-transparent w-full focus:outline-none font-medium text-slate-200 text-xs placeholder:text-slate-500"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchDeck}
          title="Refresh deck"
          className="p-2 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-white rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* Main Stack Viewport */}
      {loading ? (
        <div className="h-[520px] bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center space-y-3 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-slate-400">
            Loading candidate deck for {activeEvent?.title}...
          </p>
        </div>
      ) : topCandidate ? (
        <div className="relative select-none" style={{ minHeight: "530px" }}>
          {/* UNDERNEATH CARD (Next in Stack - Instant Transition Preview) */}
          {nextCandidate && (
            <div
              className="absolute inset-0 bg-slate-900/80 border border-slate-800/60 rounded-3xl shadow-xl overflow-hidden pointer-events-none transform scale-[0.96] translate-y-3 opacity-60 transition-all duration-200 ease-out"
              aria-hidden="true"
            >
              <div className="h-28 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 p-4" />
              <div className="px-6 pb-6 pt-0 relative">
                <div className="flex items-end justify-between -mt-14 mb-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border-4 border-slate-800 shadow-md overflow-hidden">
                    <img
                      src={
                        nextCandidate.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          nextCandidate.name
                        )}`
                      }
                      alt={nextCandidate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-400 rounded-full">
                    {nextCandidate.role}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-400">{nextCandidate.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{nextCandidate.branch} • {nextCandidate.year}</p>
              </div>
            </div>
          )}

          {/* FLYING EXITING CARD (When swipe triggered, flies away in 180ms) */}
          {exitingCard && (
            <div
              style={{
                transform:
                  exitingCard.direction === "right"
                    ? "translate3d(140%, 15px, 0) rotate(22deg)"
                    : "translate3d(-140%, 15px, 0) rotate(-22deg)",
                opacity: 0,
                transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease-out",
                pointerEvents: "none",
              }}
              className="absolute inset-0 z-20 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4" />
              <div className="px-6 pb-6 pt-0">
                <div className="flex items-end justify-between -mt-14 mb-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border-4 border-slate-800 overflow-hidden">
                    <img
                      src={
                        exitingCard.candidate.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          exitingCard.candidate.name
                        )}`
                      }
                      alt={exitingCard.candidate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white">{exitingCard.candidate.name}</h2>
              </div>
            </div>
          )}

          {/* TOP ACTIVE DRAGGABLE CARD */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: isDragging
                ? `translate3d(${dragOffset}px, ${dragOffsetY}px, 0) rotate(${dragOffset * 0.075}deg)`
                : "translate3d(0, 0, 0) rotate(0deg)",
              transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
              touchAction: "pan-y",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            className="relative z-10 bg-slate-900/95 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Top Sleek Color Banner */}
            <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 relative">
              <div className="flex justify-between items-center text-white text-xs">
                {/* Intelligent Skill-Fit Badge */}
                <div className="flex items-center gap-2">
                  <span className="font-black bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/40 text-emerald-300 shadow-md">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>{topCandidate.fitScore || 90}% Fit</span>
                  </span>
                  <span className="hidden sm:inline text-[10px] font-bold bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full text-indigo-200 border border-indigo-400/20">
                    {topCandidate.fitBadge || "Complementary"}
                  </span>
                </div>

                <span className="text-[11px] font-bold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  Candidate 1 of {candidates.length}
                </span>
              </div>
            </div>

            {/* Profile Information */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex items-end justify-between -mt-14 mb-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-950 border-4 border-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={
                      topCandidate.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        topCandidate.name
                      )}`
                    }
                    alt={topCandidate.name}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs font-extrabold px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30">
                    {topCandidate.role || "Fullstack"}
                  </span>
                  {topCandidate.cgpa && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-400/30">
                      CGPA: {topCandidate.cgpa}
                    </span>
                  )}
                </div>
              </div>

              {/* Name & Academic Credentials */}
              <div className="space-y-1 mb-3">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <span>{topCandidate.name}</span>
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
                  <span className="inline-flex items-center gap-1 text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                    {topCandidate.branch || "Computer Science"}
                  </span>
                  <span className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    {topCandidate.year || "3rd Year"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Verified Campus Student
                  </span>
                </div>
              </div>

              {/* Intelligent Skill-Fit Breakdown */}
              {topCandidate.fitReasons && topCandidate.fitReasons.length > 0 ? (
                <div className="mb-3.5 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
                  <div className="flex items-center justify-between font-bold text-indigo-300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px]">Skill-Fit AI Analysis</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">
                      {topCandidate.fitScore}% Complementary
                    </span>
                  </div>
                  <div className="space-y-1">
                    {topCandidate.fitReasons.map((reason, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : skillFitHint && (
                <div className="mb-3.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-0.5">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{skillFitHint.title}</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
                    {skillFitHint.desc}
                  </p>
                </div>
              )}

              {/* Per-Event Participation Pitch Note */}
              {topCandidate.participationNote && (
                <div className="mb-3.5 p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-0.5">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Hackathon Goal & Pitch</span>
                  </div>
                  <p className="text-[11px] text-indigo-200/90 italic leading-relaxed">
                    "{topCandidate.participationNote}"
                  </p>
                </div>
              )}

              {/* Bio Pitch */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 mb-3.5">
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{topCandidate.bio || "Ready to collaborate and build high-impact hackathon projects!"}"
                </p>
              </div>

              {/* Tech Stack Tags */}
              <div className="mb-3.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  Tech Stack & Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(topCandidate.skills || topCandidate.techStack || ["React", "Node.js"]).map(
                    (skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-800/90 border border-slate-700/70 text-slate-200 font-medium text-xs rounded-xl hover:border-indigo-500/50 transition"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* GitHub / LinkedIn Links */}
              {topCandidate.links &&
                (topCandidate.links.github || topCandidate.links.linkedin) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                    {topCandidate.links.github && (
                      <a
                        href={topCandidate.links.github}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 px-2.5 py-1 rounded-lg font-medium border border-slate-700 transition"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub</span>
                      </a>
                    )}
                    {topCandidate.links.linkedin && (
                      <a
                        href={topCandidate.links.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg font-medium border border-cyan-800/60 transition"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>
                )}
            </div>

            {/* Visual Drag Stamps */}
            {dragOffset > 25 && (
              <div
                style={{ opacity: Math.min(1, (dragOffset - 25) / 55) }}
                className="absolute top-6 left-6 border-4 border-emerald-500 text-emerald-400 bg-emerald-950/90 font-black text-2xl uppercase tracking-widest px-4 py-1.5 rounded-2xl rotate-[-12deg] pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                TEAM UP 🤝
              </div>
            )}
            {dragOffset < -25 && (
              <div
                style={{ opacity: Math.min(1, (-dragOffset - 25) / 55) }}
                className="absolute top-6 right-6 border-4 border-rose-500 text-rose-400 bg-rose-950/90 font-black text-2xl uppercase tracking-widest px-4 py-1.5 rounded-2xl rotate-[12deg] pointer-events-none shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                PASS ❌
              </div>
            )}
          </div>

          {/* Rewind Feedback Notification */}
          {rewindToast && (
            <div
              className={`text-center py-1.5 px-3 rounded-xl text-xs font-bold transition-all animate-bounce ${
                rewindToast.type === "error"
                  ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                  : "bg-amber-950/80 text-amber-300 border border-amber-800"
              }`}
            >
              {rewindToast.text}
            </div>
          )}

          {/* Swipe Buttons (Zero-Lag Quick Taps) */}
          <div className="flex items-center justify-center gap-6 mt-4">
            {/* Rewind (Undo Last Swipe) */}
            <button
              onClick={handleRewindSwipe}
              disabled={isRewinding}
              title="Undo / Rewind Last Swipe (Keyboard: Z or Backspace)"
              className="w-13 h-13 p-3.5 rounded-full bg-slate-900 border-2 border-amber-500/40 text-amber-400 hover:bg-amber-950/60 hover:border-amber-400 shadow-lg flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 group glow-amber disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw
                className={`w-5 h-5 transition group-hover:-rotate-45 ${isRewinding ? "animate-spin" : ""}`}
              />
            </button>

            {/* Pass (Left Swipe) */}
            <button
              onClick={() => triggerSwipe("left")}
              title="Pass (Swipe Left / Keyboard: ←)"
              className="w-16 h-16 rounded-full bg-slate-900 border-2 border-rose-500/40 text-rose-400 hover:bg-rose-950/60 hover:border-rose-400 shadow-lg flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 group glow-rose"
            >
              <X className="w-7 h-7 transition group-hover:scale-110" />
            </button>

            {/* Team Up (Right Swipe) */}
            <button
              onClick={() => triggerSwipe("right")}
              title="Team Up (Swipe Right / Keyboard: →)"
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-xl flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 group glow-emerald"
            >
              <Handshake className="w-8 h-8 transition group-hover:scale-110" />
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Z</kbd> Undo •{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">←</kbd> Pass •{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">→</kbd> Team Up
          </p>
        </div>
      ) : (
        /* Empty Deck State */
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800/80 p-8 sm:p-10 text-center shadow-xl space-y-4 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 mx-auto flex items-center justify-center text-indigo-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white">
            You're All Caught Up for {activeEvent?.title}! 🎉
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            You have reviewed all available candidate profiles for this hackathon matching your current filters.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRewindSwipe}
              disabled={isRewinding}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 glow-amber"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRewinding ? "animate-spin" : ""}`} />
              <span>Undo Last Swipe</span>
            </button>

            <button
              onClick={onGoToMatches}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 glow-indigo"
            >
              <MessageSquare className="w-4 h-4" />
              <span>View Confirmed Matches</span>
            </button>

            {onBrowseEvents && (
              <button
                onClick={onBrowseEvents}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <span>Switch Hackathon</span>
              </button>
            )}

            <button
              onClick={handleResetSwipes}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Swipes (Demo)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
