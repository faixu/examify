import { useEffect, useState } from "react";
import { db, collection, query, orderBy, limit, getDocs } from "../firebase";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { Trophy, Medal, Star, Zap, TrendingUp, Search, ChevronRight } from "lucide-react";

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all-time">("all-time");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setTopUsers(users);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [timeframe]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <Trophy className="text-yellow-500" size={48} />
            Leaderboard
          </h1>
          <p className="text-slate-600 text-lg">Top performers across all categories. Climb the ranks!</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm">
          {["weekly", "monthly", "all-time"].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                timeframe === t
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12">
        {/* Second Place */}
        {topUsers[1] && (
          <motion.div variants={itemVariants} className="order-2 md:order-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-6 relative h-[320px] flex flex-col justify-center">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-600 border-4 border-slate-50 shadow-lg">
              <Medal size={24} />
            </div>
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-3xl font-black text-slate-400">
              {topUsers[1].displayName?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">{topUsers[1].displayName}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{topUsers[1].rank}</p>
            </div>
            <div className="text-2xl font-black text-blue-600">{topUsers[1].xp} XP</div>
          </motion.div>
        )}

        {/* First Place */}
        {topUsers[0] && (
          <motion.div variants={itemVariants} className="order-1 md:order-2 bg-gradient-to-br from-blue-600 to-blue-800 p-10 rounded-[3rem] text-white text-center space-y-8 relative h-[400px] flex flex-col justify-center shadow-2xl shadow-blue-200">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center text-white border-4 border-white shadow-xl">
              <Trophy size={32} className="fill-white" />
            </div>
            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto text-4xl font-black text-white backdrop-blur-md border border-white/30">
              {topUsers[0].displayName?.charAt(0)}
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tight">{topUsers[0].displayName}</h3>
              <p className="text-sm font-bold text-blue-200 uppercase tracking-widest">{topUsers[0].rank}</p>
            </div>
            <div className="text-4xl font-black text-yellow-400">{topUsers[0].xp} XP</div>
          </motion.div>
        )}

        {/* Third Place */}
        {topUsers[2] && (
          <motion.div variants={itemVariants} className="order-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-6 relative h-[280px] flex flex-col justify-center">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 border-4 border-slate-50 shadow-lg">
              <Medal size={24} />
            </div>
            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black text-orange-400">
              {topUsers[2].displayName?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">{topUsers[2].displayName}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{topUsers[2].rank}</p>
            </div>
            <div className="text-2xl font-black text-blue-600">{topUsers[2].xp} XP</div>
          </motion.div>
        )}
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <TrendingUp size={24} className="text-blue-600" />
            Top 10 Rankings
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Find user..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-4">Rank</th>
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">XP Points</th>
                <th className="px-8 py-4">Streak</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading rankings...</td>
                </tr>
              ) : topUsers.slice(3).map((user, idx) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-lg font-black text-slate-400 group-hover:text-blue-600 transition-colors">#{idx + 4}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black">
                        {user.displayName?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{user.displayName}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.rank}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-blue-600 font-black">
                      <Star size={14} className="fill-blue-600" />
                      {user.xp}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-orange-500 font-black">
                      <Zap size={14} className="fill-orange-500" />
                      {user.streak}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
