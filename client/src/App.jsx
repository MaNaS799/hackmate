import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";
import Navbar from "./components/Navbar";
import AuthForm from "./components/AuthForm";
import SwipeDeck from "./components/SwipeDeck";
import MatchesView from "./components/MatchesView";
import ProfileCard from "./components/ProfileCard";
import MatchModal from "./components/MatchModal";
import EventsView from "./components/EventsView";
import AdminEventsView from "./components/AdminEventsView";
import { API_BASE, SOCKET_SERVER_URL } from "./config";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("hackmate_token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("hackmate_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Core Screen Tabs: 'events' | 'swipe' | 'matches' | 'profile' | 'admin'
  const [activeTab, setActiveTab] = useState("swipe");
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [matchCount, setMatchCount] = useState(0);

  // Match celebration modal state
  const [matchModalData, setMatchModalData] = useState(null);
  const [targetChatMatchId, setTargetChatMatchId] = useState(null);

  // 1. Verify User Session
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        localStorage.setItem("hackmate_user", JSON.stringify(response.data));
      } catch (err) {
        console.error("Token invalid or expired. Logging out.");
        handleLogout();
      }
    };
    verifyToken();
  }, [token]);

  // 2. Fetch Available Events
  const fetchEvents = useCallback(async () => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${API_BASE}/events`, config);
      setEvents(res.data);
      if (res.data.length > 0 && !activeEventId) {
        setActiveEventId(res.data[0]._id || res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching hackathons:", err);
    }
  }, [token, activeEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 3. Fetch Match Count for Badge
  useEffect(() => {
    const fetchMatchCount = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatchCount(res.data.length);
      } catch (e) {}
    };
    fetchMatchCount();
  }, [token, activeTab]);

  // 4. Global Socket Listener for Instant Mutual Matches
  useEffect(() => {
    if (!user || !token) return;
    const socket = io(SOCKET_SERVER_URL);
    const uid = user.id || user._id;

    socket.on("connect", () => {
      if (uid) socket.emit("joinUser", uid);
    });

    socket.on("match", (data) => {
      setMatchModalData(data);
      setMatchCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  // Handle Login / Registration Success
  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("hackmate_token", newToken);
    localStorage.setItem("hackmate_user", JSON.stringify(newUser));
    setActiveTab("swipe");
  };

  // Handle Logout
  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("hackmate_token");
    localStorage.removeItem("hackmate_user");
    setActiveTab("swipe");
    setMatchModalData(null);
  };

  // Handle Profile Update
  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("hackmate_user", JSON.stringify(updatedUser));
  };

  // When a mutual match occurs in SwipeDeck
  const handleMatchCreated = (data) => {
    setMatchModalData(data);
    setMatchCount((prev) => prev + 1);
  };

  // Direct CTA from match celebration modal to chat
  const handleStartChatFromModal = (matchId) => {
    setTargetChatMatchId(matchId);
    setActiveTab("matches");
  };

  // Select event & jump to swipe deck
  const handleSelectEventAndSwipe = (eventId) => {
    setActiveEventId(eventId);
    setActiveTab("swipe");
  };

  const activeEvent = events.find(
    (ev) => String(ev._id || ev.id) === String(activeEventId)
  ) || events[0];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Ambient background glow orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Bar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        events={events}
        activeEventId={activeEventId}
        onSelectEvent={setActiveEventId}
        onLogout={handleLogout}
        matchCount={matchCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {!user ? (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        ) : (
          <div>
            {/* SCREEN 1: EVENTS LIST & DETAIL */}
            {activeTab === "events" && (
              <EventsView
                events={events}
                token={token}
                currentUser={user}
                onSelectEventAndSwipe={handleSelectEventAndSwipe}
                onEventsUpdated={fetchEvents}
                onGoToAdmin={() => setActiveTab("admin")}
              />
            )}

            {/* SCREEN 2: SWIPE DECK */}
            {activeTab === "swipe" && (
              <SwipeDeck
                token={token}
                currentUser={user}
                activeEvent={activeEvent}
                onMatchCreated={handleMatchCreated}
                onGoToMatches={() => setActiveTab("matches")}
                onBrowseEvents={() => setActiveTab("events")}
              />
            )}

            {/* SCREEN 3: MATCHES & 1-ON-1 CHAT */}
            {activeTab === "matches" && (
              <MatchesView
                token={token}
                currentUser={user}
                initialMatchId={targetChatMatchId}
                onGoToSwipe={() => setActiveTab("swipe")}
              />
            )}

            {/* SCREEN 4: PROFILE SETUP & EDIT */}
            {activeTab === "profile" && (
              <ProfileCard
                user={user}
                token={token}
                events={events}
                onProfileUpdated={handleProfileUpdated}
              />
            )}

            {/* SCREEN 5: ADMIN EVENTS PAGE */}
            {activeTab === "admin" && user.isAdmin && (
              <AdminEventsView
                token={token}
                currentUser={user}
                events={events}
                onEventsUpdated={fetchEvents}
                onBack={() => setActiveTab("events")}
              />
            )}
          </div>
        )}
      </main>

      {/* Mutual Match Celebratory Modal */}
      <MatchModal
        isOpen={Boolean(matchModalData)}
        onClose={() => setMatchModalData(null)}
        matchData={matchModalData}
        currentUser={user}
        onStartChat={handleStartChatFromModal}
      />

      {/* Campus Exclusive Dark Footer */}
      <footer className="hidden md:block bg-slate-950/80 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-slate-400">
            HackMate • Campus Hackathon Teammate Matching Platform
          </span>
          <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
            <span>Verified Campus Matching</span>
            <span>•</span>
            <span>Real-time Private Chat</span>
            <span>•</span>
            <span>Zero-Lag Swipe Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
