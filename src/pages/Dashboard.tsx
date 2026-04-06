import { UserProfile, TestAttempt } from "../types";
import { useEffect, useState } from "react";
import { db, collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc } from "../firebase";
import { motion } from "motion/react";
import { Trophy, Zap, Target, Clock, TrendingUp, AlertCircle, ChevronRight, BookOpen, Star, Calendar, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CATEGORIES } from "../constants";

interface DashboardProps {
  user: UserProfile | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchAttempts = async () => {
        const q = query(
          collection(db, "attempts"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestAttempt));
        setAttempts(docs);
        setLoading(false);
      };
      fetchAttempts();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-24 space-y-8">
        <div className="text-6xl">🔒</div>
        <h2 className="text-3xl font-black text-slate-900">Please Sign In</h2>
        <p className="text-slate-500 max-w-md mx-auto">Sign in to track your progress, earn XP, and see your performance analytics.</p>
        <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95">
          Sign In with Google
        </button>
      </div>
    );
  }

  const averageAccuracy = attempts.length > 0 
    ? attempts.reduce((acc, curr) => acc + curr.accuracy, 0) / attempts.length 
    : 0;

  const totalTests = attempts.length;

  const isAdmin = user?.email === "Flust786@gmail.com";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-24"
    >
      {/* Profile Header */}
      <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-8">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-blue-200">
              {user.displayName?.charAt(0) || user.email?.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center text-white border-4 border-slate-50 shadow-lg">
              <Star size={20} className="fill-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{user.displayName}</h1>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
                {user.rank}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200">
                Level {Math.floor(user.xp / 1000) + 1}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center min-w-[120px]">
            <div className="text-2xl font-black text-blue-600">{user.xp}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total XP</div>
          </div>
          <div className="px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center min-w-[120px]">
            <div className="text-2xl font-black text-orange-500 flex items-center justify-center gap-2">
              <Zap size={20} className="fill-orange-500" />
              {user.streak}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Accuracy", value: `${averageAccuracy.toFixed(1)}%`, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Tests Taken", value: totalTests, icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
          { label: "Avg Time", value: "45s", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Global Rank", value: "#42", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
              <stat.icon size={20} />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <TrendingUp size={24} className="text-blue-600" />
              Recent Activity
            </h2>
            <Link to="/categories" className="text-sm font-bold text-blue-600 hover:underline">Start New Test</Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading attempts...</div>
            ) : attempts.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
                <div className="text-4xl">📝</div>
                <h3 className="text-xl font-bold text-slate-900">No attempts yet</h3>
                <p className="text-slate-500">Take your first mock test to see your performance here.</p>
                <Link to="/categories" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                  Browse Categories
                </Link>
              </div>
            ) : (
              attempts.map((attempt) => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                      attempt.accuracy >= 80 ? "bg-green-50 text-green-600" : 
                      attempt.accuracy >= 50 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                    }`}>
                      {attempt.accuracy.toFixed(0)}%
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 uppercase tracking-tight">{attempt.testId.replace("-", " ")}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-400 font-bold">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {format(attempt.timestamp.toDate(), "MMM dd, yyyy")}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {attempt.timeTaken}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-black text-slate-900">{attempt.score}/{attempt.totalQuestions}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correct</div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <AlertCircle size={24} className="text-orange-500" />
            Weak Areas
          </h2>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <p className="text-slate-500 text-sm leading-relaxed">
              Based on your recent tests, you should focus more on these topics:
            </p>
            
            <div className="space-y-4">
              {[
                { topic: "Indian History", errorRate: 65, color: "bg-red-500" },
                { topic: "Trigonometry", errorRate: 45, color: "bg-orange-500" },
                { topic: "JK Culture", errorRate: 30, color: "bg-yellow-500" },
              ].map((area, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-slate-700">{area.topic}</span>
                    <span className="text-slate-400">{area.errorRate}% Error</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${area.errorRate}%` }}
                      className={`h-full ${area.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-4 bg-slate-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all border border-blue-100">
              View Full Analysis
            </button>
          </div>

          {/* Gamification Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl text-white space-y-6 shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-xl font-black tracking-tight">Next Milestone</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-3xl font-black">250 XP</div>
                  <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">to reach Level 5</div>
                </div>
                <Trophy size={32} className="text-yellow-400" />
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-white" />
              </div>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed font-medium">
              Complete 3 more tests with 90%+ accuracy to unlock the "Scholar" badge!
            </p>
          </div>
        </div>
      </div>
      {/* Admin Quick Link */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border border-slate-800"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black">Administrator Access</h2>
              <p className="text-slate-400 max-w-xl">
                You have access to the dedicated Admin Dashboard for managing AI content seeding and system maintenance.
              </p>
            </div>
            
            <Link
              to="/admin"
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <Database size={20} />
              <span>Go to Admin Dashboard</span>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
