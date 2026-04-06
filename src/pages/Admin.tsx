import { UserProfile } from "../types";
import { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, deleteDoc, query, where } from "../firebase";
import { motion } from "motion/react";
import { Database, Zap, Trash2, LayoutDashboard, BookOpen, AlertCircle, CheckCircle, RefreshCw, Plus } from "lucide-react";
import { CATEGORIES } from "../constants";
import { generateMCQs } from "../lib/geminiService";
import { Link, useNavigate } from "react-router-dom";

interface AdminProps {
  user: UserProfile | null;
}

export default function Admin({ user }: AdminProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [seedingStatus, setSeedingStatus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const isAdmin = user?.email === "Flust786@gmail.com";

  useEffect(() => {
    if (!isAdmin && user) {
      navigate("/dashboard");
    }
    if (isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin, navigate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const mcqsSnapshot = await getDocs(collection(db, "mcqs"));
      const counts: Record<string, number> = {};
      
      mcqsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const catId = data.category;
        counts[catId] = (counts[catId] || 0) + 1;
      });
      
      setStats(counts);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setSeedingStatus("Starting AI generation...");
    
    try {
      const categoriesToSeed = selectedCategory === "all" 
        ? CATEGORIES 
        : CATEGORIES.filter(c => c.id === selectedCategory);

      for (const cat of categoriesToSeed) {
        setSeedingStatus(`Generating for ${cat.name}...`);
        for (const topic of cat.topics) {
          setSeedingStatus(`Generating for ${cat.name} > ${topic.name}...`);
          try {
            const mcqs = await generateMCQs(cat.id, topic.id, 5);
            for (const mcq of mcqs) {
              await addDoc(collection(db, "mcqs"), mcq);
            }
          } catch (e) {
            console.error(`Failed to generate for ${topic.name}`, e);
          }
        }
      }
      setSeedingStatus("Seeding complete!");
      fetchStats();
      alert("Database seeded successfully!");
    } catch (error) {
      console.error("Seed failed", error);
      alert("Failed to generate MCQs.");
    } finally {
      setLoading(false);
      setTimeout(() => setSeedingStatus(""), 3000);
    }
  };

  const handleClearData = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete ALL MCQs from the database? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "mcqs"));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setStats({});
      alert("Database cleared successfully!");
    } catch (error) {
      console.error("Clear failed", error);
      alert("Failed to clear database.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-24"
    >
      <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
            <Database size={12} />
            System Administrator
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500">Manage exam content, AI seeding, and system health.</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={fetchStats}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <Link 
            to="/dashboard"
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            <LayoutDashboard size={20} />
            User Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900">{stats[cat.id] || 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{cat.name}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* AI Seeding Control */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest border border-blue-500/30">
                <Zap size={14} />
                <span>AI Content Engine</span>
              </div>
              <h2 className="text-3xl font-black">Seed Mock Tests</h2>
              <p className="text-slate-400">
                Use Gemini 3 Flash to generate high-quality MCQs. Select a category or seed the entire syllabus at once.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Scope</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Categories (Full Syllabus)</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSeedData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{seedingStatus || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      <span>Generate with Gemini AI</span>
                    </>
                  )}
                </button>

                {seedingStatus && (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-bold animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    {seedingStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Maintenance */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <AlertCircle size={24} className="text-orange-500" />
              Maintenance
            </h3>

            <div className="space-y-6">
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
                <div className="flex items-center gap-3 text-red-600">
                  <Trash2 size={20} />
                  <span className="font-black uppercase tracking-widest text-xs">Danger Zone</span>
                </div>
                <p className="text-sm text-red-600/70 font-medium">
                  Clearing the database will permanently delete all MCQs. This action is irreversible.
                </p>
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Wipe MCQ Database
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <CheckCircle size={20} />
                  <span className="font-black uppercase tracking-widest text-xs">System Health</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total MCQs</div>
                    <div className="text-xl font-black text-slate-900">
                      {Object.values(stats).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categories</div>
                    <div className="text-xl font-black text-slate-900">{CATEGORIES.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
