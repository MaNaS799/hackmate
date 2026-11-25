import React from "react";
import { Sparkles, MessageSquare, ArrowRight, Handshake } from "lucide-react";

export default function MatchModal({ isOpen, onClose, matchData, currentUser, onStartChat }) {
  if (!isOpen || !matchData) return null;

  const { matchedUser, match } = matchData;
  const userAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser?.name || "You")}`;
  const matchedAvatar = matchedUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(matchedUser?.name || "Teammate")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl transform transition-all scale-100 relative overflow-hidden backdrop-blur-xl">
        {/* Glow decoration */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-extrabold tracking-wide uppercase mb-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mutual Teammate Match!</span>
        </div>

        <h2 className="text-3xl font-black text-white tracking-tight">
          Teammate Connected! 🤝
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
          You and <strong className="text-indigo-400 font-bold">{matchedUser?.name}</strong> both agreed to collaborate for this hackathon!
        </p>

        {/* Avatars connection visual */}
        <div className="flex items-center justify-center gap-3 my-6">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-indigo-400/80 p-1 shadow-lg flex items-center justify-center overflow-hidden glow-indigo">
              <img src={userAvatar} alt={currentUser?.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-200 mt-1.5 truncate max-w-[80px]">
              You
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold">{currentUser?.role}</span>
          </div>

          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse glow-emerald">
            <Handshake className="w-6 h-6 text-white" />
          </div>

          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-emerald-400/80 p-1 shadow-lg flex items-center justify-center overflow-hidden glow-emerald">
              <img src={matchedAvatar} alt={matchedUser?.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-200 mt-1.5 truncate max-w-[80px]">
              {matchedUser?.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">{matchedUser?.role}</span>
          </div>
        </div>

        {/* Details snippet */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-6 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Branch & Year:</span>
            <span className="font-bold text-slate-200">{matchedUser?.branch} • {matchedUser?.year}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Key Skills:</span>
            <span className="font-bold text-indigo-400 truncate max-w-[190px]">
              {(matchedUser?.skills || matchedUser?.techStack || []).slice(0, 3).join(", ")}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              onStartChat(match?._id || match?.id);
              onClose();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-indigo-600 to-violet-600 hover:from-emerald-400 hover:to-violet-500 text-white font-black rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 text-sm glow-emerald"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat With {matchedUser?.name?.split(" ")[0]} Now</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Keep Swiping More Candidates
          </button>
        </div>
      </div>
    </div>
  );
}
