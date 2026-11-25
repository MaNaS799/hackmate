import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Zap,
  GraduationCap,
  Sparkles,
  Search,
  User,
  Handshake,
  Clock,
  Award,
  Calendar,
  Filter,
} from "lucide-react";
import io from "socket.io-client";
import axios from "axios";
import { API_BASE, SOCKET_SERVER_URL } from "../config";

export default function MatchesView({ token, currentUser, initialMatchId, onGoToSwipe }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("All");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch All Matches for Logged-In User
  const fetchMatches = async () => {
    if (!token) return;
    try {
      setLoadingMatches(true);
      const res = await axios.get(`${API_BASE}/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(res.data);

      if (res.data.length > 0) {
        if (!selectedMatchId || !res.data.some((m) => (m._id || m.id) === selectedMatchId)) {
          setSelectedMatchId(res.data[0]._id || res.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [token]);

  useEffect(() => {
    if (initialMatchId) {
      setSelectedMatchId(initialMatchId);
    }
  }, [initialMatchId]);

  // 2. Setup Socket.io for Real-Time 1-on-1 Chat & Typing Indicators
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      const uid = currentUser?.id || currentUser?._id;
      if (uid) {
        socket.emit("joinUser", uid);
      }
      if (selectedMatchId) {
        socket.emit("join", { matchId: selectedMatchId, userId: uid });
        socket.emit("joinMatch", selectedMatchId);
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for incoming 1-on-1 private messages
    socket.on("receivePrivateMessage", (msg) => {
      if (String(msg.match) === String(selectedMatchId)) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
        setIsOtherTyping(false);
      }
      setMatches((prev) =>
        prev
          .map((m) =>
            String(m._id || m.id) === String(msg.match)
              ? { ...m, lastMessage: msg.text, lastMessageAt: msg.createdAt || new Date() }
              : m
          )
          .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt))
      );
    });

    // Listen for typing indicator
    socket.on("typing", (data) => {
      const currentUserId = currentUser?.id || currentUser?._id;
      if (String(data.senderId) !== String(currentUserId)) {
        setIsOtherTyping(Boolean(data.isTyping));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedMatchId, currentUser]);

  // 3. Load Messages when Selected Match Changes
  useEffect(() => {
    if (!selectedMatchId || !token) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      setIsOtherTyping(false);
      try {
        const res = await axios.get(`${API_BASE}/matches/${selectedMatchId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
        setTimeout(scrollToBottom, 100);

        if (socketRef.current && socketRef.current.connected) {
          const uid = currentUser?.id || currentUser?._id;
          socketRef.current.emit("join", { matchId: selectedMatchId, userId: uid });
          socketRef.current.emit("joinMatch", selectedMatchId);
        }
      } catch (err) {
        console.error("Error fetching match messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedMatchId, token]);

  // 4. Handle Text Typing & Send
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Emit typing event over socket
    if (socketRef.current && socketRef.current.connected && selectedMatchId) {
      const uid = currentUser?.id || currentUser?._id;
      socketRef.current.emit("typing", {
        matchId: selectedMatchId,
        senderId: uid,
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("typing", {
            matchId: selectedMatchId,
            senderId: uid,
            isTyping: false,
          });
        }
      }, 1500);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedMatchId) return;

    const messageText = inputText.trim();
    setInputText("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socketRef.current) {
      socketRef.current.emit("typing", {
        matchId: selectedMatchId,
        senderId: currentUser?.id || currentUser?._id,
        isTyping: false,
      });
    }

    const currentUserId = currentUser.id || currentUser._id;

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("sendPrivateMessage", {
        matchId: selectedMatchId,
        senderId: currentUserId,
        text: messageText,
      });
    } else {
      try {
        const res = await axios.post(
          `${API_BASE}/matches/${selectedMatchId}/messages`,
          { text: messageText },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages((prev) => [...prev, res.data]);
        setTimeout(scrollToBottom, 50);
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  };

  const currentMatch = matches.find((m) => (m._id || m.id) === selectedMatchId);
  const otherUser = currentMatch?.otherUser;

  // Extract distinct events from matches
  const distinctEvents = Array.from(
    new Set(matches.map((m) => m.eventDetails?.title).filter(Boolean))
  );

  const filteredMatches = matches.filter((m) => {
    if (eventFilter !== "All" && m.eventDetails?.title !== eventFilter) return false;
    if (!searchTerm) return true;
    const name = m.otherUser?.name || "";
    const role = m.otherUser?.role || "";
    const branch = m.otherUser?.branch || "";
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || role.toLowerCase().includes(term) || branch.toLowerCase().includes(term);
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden h-[640px] flex flex-col md:flex-row pb-2 backdrop-blur-xl">
      {/* LEFT COLUMN: Matches List (Dark Glass) */}
      <div className="w-full md:w-80 border-r border-slate-800/80 flex flex-col bg-slate-950/60">
        {/* Matches Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/70 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Handshake className="w-5 h-5 text-indigo-400" />
              <span>Confirmed Matches</span>
            </h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
              {matches.length}
            </span>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, role, branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Event Filter Pills */}
          {distinctEvents.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
              <button
                onClick={() => setEventFilter("All")}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  eventFilter === "All"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                All ({matches.length})
              </button>
              {distinctEvents.map((title) => (
                <button
                  key={title}
                  onClick={() => setEventFilter(title)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                    eventFilter === title
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {title.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Matches Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {loadingMatches ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-300">No matches yet</p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                Swipe right on candidates in the Swipe deck. Once they swipe right back, your 1-on-1 private chat unlocks!
              </p>
              <button
                onClick={onGoToSwipe}
                className="mt-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition glow-indigo"
              >
                Go to Swipe Deck
              </button>
            </div>
          ) : (
            filteredMatches.map((m) => {
              const mId = m._id || m.id;
              const isSelected = mId === selectedMatchId;
              const u = m.otherUser;
              return (
                <button
                  key={mId}
                  onClick={() => setSelectedMatchId(mId)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                    isSelected
                      ? "bg-indigo-950/50 border-l-4 border-indigo-500"
                      : "hover:bg-slate-900/60"
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                    <img
                      src={
                        u?.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          u?.name || "User"
                        )}`
                      }
                      alt={u?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">
                        {u?.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[80px]">
                        {m.eventDetails?.title?.split(" ")[0] || "Hackathon"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-900/60">
                        {u?.role}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {u?.branch?.split(" ")[0]}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {m.lastMessage || "Say hello to your teammate! 👋"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: 1-on-1 Private Chat Room */}
      <div className="flex-1 flex flex-col bg-slate-900/70">
        {currentMatch && otherUser ? (
          <>
            {/* Chat Room Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                  <img
                    src={
                      otherUser.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        otherUser.name
                      )}`
                    }
                    alt={otherUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{otherUser.name}</h3>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-400/30 flex-shrink-0">
                      {otherUser.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{otherUser.branch} • {otherUser.year}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-indigo-400 font-semibold truncate">
                      {currentMatch.eventDetails?.title || "Mutual Match"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Private 1-on-1 Room</span>
              </div>
            </div>

            {/* Teammate Skills Bar */}
            <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-500 font-bold whitespace-nowrap">Tech Stack:</span>
              {(otherUser.skills || otherUser.techStack || []).map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800/90 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap shadow-xs"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#07090e]/60">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                  Loading conversation history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-300">No messages sent yet</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    You and {otherUser.name.split(" ")[0]} both matched for{" "}
                    <strong>{currentMatch.eventDetails?.title || "the hackathon"}</strong>. Say hello to kick off team planning!
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const currentUserId = currentUser.id || currentUser._id;
                  const isMe = String(msg.sender) === String(currentUserId);
                  return (
                    <div
                      key={msg._id || index}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-sm sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-lg break-words ${
                          isMe
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs"
                            : "bg-slate-800 border border-slate-700/70 text-slate-100 rounded-bl-xs"
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isOtherTyping && (
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 italic px-2 py-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span>{otherUser.name?.split(" ")[0]} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center gap-2">
              <input
                type="text"
                placeholder={`Message ${otherUser.name?.split(" ")[0]}...`}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <Handshake className="w-12 h-12 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-300">Select a teammate to start chatting</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Choose a match from the left list or head over to the Swipe Deck to find new hackers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
