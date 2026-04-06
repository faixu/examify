import { UserProfile } from "../types";
import { useEffect, useState, useRef } from "react";
import { db, collection, getDocs, addDoc, deleteDoc, query, where, writeBatch, doc, handleFirestoreError, OperationType } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Database, Zap, Trash2, LayoutDashboard, BookOpen, AlertCircle, CheckCircle, RefreshCw, Plus, StopCircle, ScrollText } from "lucide-react";
import { CATEGORIES } from "../constants";
import { generateMCQs } from "../lib/geminiService";
import { Link, useNavigate } from "react-router-dom";

interface AdminProps {
  user: UserProfile | null;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export default function Admin({ user }: AdminProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [seedingStatus, setSeedingStatus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [questionsPerTopic, setQuestionsPerTopic] = useState<number>(5);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const stopSeedingRef = useRef<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === "Flust786@gmail.com";

  useEffect(() => {
    if (!isAdmin && user) {
      navigate("/dashboard");
    }
    if (isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev].slice(0, 100));
  };

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
      addLog("Stats updated successfully", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    stopSeedingRef.current = false;
    setSeedingStatus("Initializing AI Content Engine...");
    addLog("Starting seeding process...", "info");
    
    try {
      const categoriesToSeed = selectedCategory === "all" 
        ? CATEGORIES 
        : CATEGORIES.filter(c => c.id === selectedCategory);

      let totalGenerated = 0;

      for (const cat of categoriesToSeed) {
        if (stopSeedingRef.current) break;
        
        addLog(`Processing category: ${cat.name}`, "info");
        
        for (const topic of cat.topics) {
          if (stopSeedingRef.current) break;

          if (skipExisting) {
            const existingQuery = query(
              collection(db, "mcqs"), 
              where("category", "==", cat.id),
              where("topic", "==", topic.id)
            );
            const existingSnapshot = await getDocs(existingQuery);
            if (!existingSnapshot.empty) {
              addLog(`Skipping ${topic.name} (already has ${existingSnapshot.size} questions)`, "warning");
              continue;
            }
          }

          setSeedingStatus(`Generating for ${cat.name} > ${topic.name}...`);
          addLog(`Generating ${questionsPerTopic} questions for ${topic.name}...`, "info");
          
          try {
            const mcqs = await generateMCQs(cat.id, topic.id, questionsPerTopic);
            const batch = writeBatch(db);
            
            mcqs.forEach(mcq => {
              const newDocRef = doc(collection(db, "mcqs"));
              batch.set(newDocRef, mcq);
            });
            
            await batch.commit();
            totalGenerated += mcqs.length;
            
            addLog(`Successfully seeded ${mcqs.length} questions for ${topic.name}`, "success");
            
            setStats(prev => ({
              ...prev,
              [cat.id]: (prev[cat.id] || 0) + mcqs.length
            }));
            
            // Small delay between topics to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));
            
          } catch (e: any) {
            addLog(`Error in ${topic.name}: ${e.message}`, "error");
            console.error(`Failed to generate for ${topic.name}`, e);
          }
        }
      }
      
      const finishMsg = stopSeedingRef.current 
        ? `Seeding stopped. Added ${totalGenerated} questions.` 
        : `Seeding complete! Added ${totalGenerated} questions.`;
      
      setSeedingStatus(finishMsg);
      addLog(finishMsg, stopSeedingRef.current ? "warning" : "success");
      alert(finishMsg);
    } catch (error: any) {
      addLog(`Critical failure: ${error.message}`, "error");
      alert("Failed to generate MCQs.");
    } finally {
      setLoading(false);
      stopSeedingRef.current = false;
      setTimeout(() => setSeedingStatus(""), 5000);
    }
  };

  const handleClearData = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete ALL MCQs from the database? This cannot be undone.")) return;
    
    setLoading(true);
    addLog("Clearing database...", "warning");
    try {
      const querySnapshot = await getDocs(collection(db, "mcqs"));
      const batchSize = 500;
      const chunks = [];
      
      for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
        chunks.push(querySnapshot.docs.slice(i, i + batchSize));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      setStats({});
      addLog("Database cleared successfully", "success");
      alert("Database cleared successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "mcqs");
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
            title="Refresh Stats"
          >
            <RefreshCw size={20} className={loading && !seedingStatus ? "animate-spin" : ""} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* AI Seeding Control */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border border-slate-800">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Scope</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  <option value="all">All Categories (Full Syllabus)</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Questions per Topic</label>
                <input 
                  type="number"
                  min="1"
                  max="20"
                  value={questionsPerTopic}
                  onChange={(e) => setQuestionsPerTopic(parseInt(e.target.value))}
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    disabled={loading}
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${skipExisting ? 'bg-blue-600' : 'bg-slate-700'}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${skipExisting ? 'translate-x-6' : ''}`} />
                </div>
                <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Skip topics with existing questions</span>
              </label>
            </div>

            <div className="flex flex-col gap-4">
              {!loading ? (
                <button
                  onClick={handleSeedData}
                  className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <Zap size={20} />
                  <span>Generate with Gemini AI</span>
                </button>
              ) : (
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-800 text-blue-400 px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 border border-blue-500/30">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>{seedingStatus || "Processing..."}</span>
                  </div>
                  <button
                    onClick={() => {
                      stopSeedingRef.current = true;
                      addLog("Stopping process...", "warning");
                    }}
                    className="bg-red-600 text-white px-6 py-5 rounded-2xl font-black hover:bg-red-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <StopCircle size={20} />
                    Stop
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logs & Maintenance */}
        <div className="space-y-8">
          {/* Logs Area */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 flex flex-col h-[400px]">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <ScrollText size={20} className="text-blue-600" />
              Process Logs
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <ScrollText size={32} strokeWidth={1} />
                  <p className="text-xs font-bold uppercase tracking-widest">No logs yet</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`p-3 rounded-xl text-xs font-medium border ${
                    log.type === "success" ? "bg-green-50 border-green-100 text-green-700" :
                    log.type === "error" ? "bg-red-50 border-red-100 text-red-700" :
                    log.type === "warning" ? "bg-orange-50 border-orange-100 text-orange-700" :
                    "bg-slate-50 border-slate-100 text-slate-600"
                  }`}>
                    <div className="flex justify-between items-center mb-1 opacity-50 font-bold">
                      <span>{log.timestamp.toLocaleTimeString()}</span>
                      <span className="uppercase tracking-tighter">{log.type}</span>
                    </div>
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Maintenance Zone */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <AlertCircle size={20} className="text-orange-500" />
              Maintenance
            </h3>

            <div className="space-y-4">
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
                <div className="flex items-center gap-3 text-red-600">
                  <Trash2 size={18} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Danger Zone</span>
                </div>
                <p className="text-[10px] text-red-600/70 font-bold uppercase tracking-tight">
                  Permanently delete all MCQs.
                </p>
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                >
                  Wipe MCQ Database
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <CheckCircle size={18} />
                  <span className="font-black uppercase tracking-widest text-[10px]">System Health</span>
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
