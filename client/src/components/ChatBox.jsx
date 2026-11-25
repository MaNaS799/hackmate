import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Zap, User, Clock } from "lucide-react";
import io from "socket.io-client";
import axios from "axios";
import { API_BASE, SOCKET_SERVER_URL } from "../config";

export default function ChatBox({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // 1. Fetch past chat history from MongoDB via REST API
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_BASE}/messages`);
        setMessages(response.data);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };
    fetchHistory();

    // 2. Establish Socket.io connection
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("Connected to Socket.io server (ID:", socket.id, ")");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      console.log("Disconnected from Socket.io server");
    });

    // 3. Listen for incoming real-time messages from any hacker
    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(scrollToBottom, 50);
    });

    // Cleanup when component unmounts
    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;

    // Emit 'sendMessage' event to the Node.js server via Socket.io
    socketRef.current.emit("sendMessage", {
      senderId: currentUser.id || currentUser._id,
      text: text.trim(),
    });

    setText("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Educational Concept Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-xl">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>Real-Time Hackathon Chat Room</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  socketConnected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    socketConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                {socketConnected ? "Socket.io Connected" : "Connecting..."}
              </span>
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Messages are broadcast instantly over WebSockets via <strong>Socket.io</strong> and stored in <strong>MongoDB</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No messages yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Say hello to other hackers and pitch your team ideas!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const senderId = msg.sender?._id || msg.sender;
              const isSelf = senderId === (currentUser.id || currentUser._id);
              const senderName = msg.sender?.name || (isSelf ? currentUser.name : "Hacker");
              const senderRole = msg.sender?.role || (isSelf ? currentUser.role : "Member");

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {isSelf ? "You" : senderName}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-medium px-1.5 py-0.2 bg-indigo-50 rounded">
                      {senderRole}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                      isSelf
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 rounded-b-2xl flex items-center gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message to all hackers..."
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || !socketConnected}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-medium text-sm flex items-center space-x-1.5 transition shadow-sm hover:shadow"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
