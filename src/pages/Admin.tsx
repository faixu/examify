import { UserProfile } from "../types";
import { useEffect, useState, useRef } from "react";
import { db, collection, getDocs, addDoc, deleteDoc, query, where, writeBatch, doc, handleFirestoreError, OperationType, updateDoc } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Database, Zap, Trash2, LayoutDashboard, BookOpen, AlertCircle, CheckCircle, RefreshCw, Plus, StopCircle, ScrollText, Info, XCircle } from "lucide-react";
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("mixed");
  const [questionsPerTopic, setQuestionsPerTopic] = useState<number>(5);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const stopSeedingRef = useRef<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"seeding" | "manage">("seeding");
  const [manageSearch, setManageSearch] = useState("");
  const [manageCategory, setManageCategory] = useState("all");
  const [manageTopic, setManageTopic] = useState("all");
  const [manageQuestions, setManageQuestions] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === "flust786@gmail.com";

  useEffect(() => {
    if (!isAdmin && user) {
      navigate("/dashboard");
    }
    if (isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchManageQuestions();
    }
  }, [activeTab, manageCategory, manageTopic]);

  const fetchManageQuestions = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "mcqs"));
      
      if (manageCategory !== "all") {
        q = query(q, where("category", "==", manageCategory));
      }
      if (manageTopic !== "all") {
        q = query(q, where("topic", "==", manageTopic));
      }
      
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (manageSearch) {
        results = results.filter((q: any) => 
          q.question.toLowerCase().includes(manageSearch.toLowerCase()) ||
          q.explanation?.toLowerCase().includes(manageSearch.toLowerCase())
        );
      }
      
      setManageQuestions(results.slice(0, 50)); // Limit to 50 for performance
      addLog(`Fetched ${results.length} questions for management`, "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    
    setLoading(true);
    try {
      const { id, ...data } = editingQuestion;
      if (id) {
        // Update
        await updateDoc(doc(db, "mcqs", id), data);
        addLog(`Updated question: ${id}`, "success");
      } else {
        // Create
        await addDoc(collection(db, "mcqs"), data);
        addLog("Created new question", "success");
      }
      setIsEditing(false);
      setEditingQuestion(null);
      fetchManageQuestions();
      fetchStats();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "mcqs", id));
      addLog(`Deleted question: ${id}`, "success");
      fetchManageQuestions();
      fetchStats();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }].slice(-100));
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
            const mcqs = await generateMCQs(cat.id, topic.id, questionsPerTopic, selectedDifficulty);
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        <button 
          onClick={() => setActiveTab("seeding")}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
            activeTab === "seeding" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          AI Seeding
          {activeTab === "seeding" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab("manage")}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
            activeTab === "manage" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Manage Questions
          {activeTab === "manage" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === "seeding" ? (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Difficulty</label>
                    <select 
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    >
                      <option value="mixed">Mixed Difficulties</option>
                      <option value="easy">Easy Only</option>
                      <option value="medium">Medium Only</option>
                      <option value="hard">Hard Only</option>
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
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Search Questions</label>
                    <input 
                      type="text"
                      placeholder="Search by text..."
                      value={manageSearch}
                      onChange={(e) => setManageSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="w-full md:w-48 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Category</label>
                    <select 
                      value={manageCategory}
                      onChange={(e) => setManageCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="all">All</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingQuestion({
                        question: "",
                        options: ["", "", "", ""],
                        answer: "",
                        explanation: "",
                        difficulty: "medium",
                        category: manageCategory === "all" ? CATEGORIES[0].id : manageCategory,
                        topic: CATEGORIES.find(c => c.id === (manageCategory === "all" ? CATEGORIES[0].id : manageCategory))?.topics[0].id || ""
                      });
                      setIsEditing(true);
                    }}
                    className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {manageQuestions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <p className="font-bold uppercase tracking-widest text-xs">No questions found</p>
                    </div>
                  ) : (
                    manageQuestions.map((q) => (
                      <div key={q.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start justify-between gap-4 group">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              q.difficulty === "easy" ? "bg-green-100 text-green-700" :
                              q.difficulty === "medium" ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {q.category} / {q.topic}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-2">{q.question}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsEditing(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
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
                  <div key={log.id} className={`p-3 rounded-xl text-xs font-medium border flex gap-3 ${
                    log.type === "success" ? "bg-green-50 border-green-100 text-green-700" :
                    log.type === "error" ? "bg-red-50 border-red-100 text-red-700" :
                    log.type === "warning" ? "bg-orange-50 border-orange-100 text-orange-700" :
                    "bg-slate-50 border-slate-100 text-slate-600"
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {log.type === "success" && <CheckCircle size={14} />}
                      {log.type === "error" && <XCircle size={14} />}
                      {log.type === "warning" && <AlertCircle size={14} />}
                      {log.type === "info" && <Info size={14} />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center opacity-50 font-bold">
                        <span className="uppercase tracking-tighter">{log.type}</span>
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="leading-relaxed">{log.message}</div>
                    </div>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">
                  {editingQuestion?.id ? "Edit Question" : "Add Question"}
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Category</label>
                    <select 
                      value={editingQuestion?.category}
                      onChange={(e) => setEditingQuestion({...editingQuestion, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Topic</label>
                    <select 
                      value={editingQuestion?.topic}
                      onChange={(e) => setEditingQuestion({...editingQuestion, topic: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CATEGORIES.find(c => c.id === editingQuestion?.category)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Question Text</label>
                  <textarea 
                    value={editingQuestion?.question}
                    onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingQuestion?.options.map((opt: string, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <label className="text-xs font-bold text-slate-400">Option {idx + 1}</label>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = e.target.value;
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Correct Answer</label>
                    <select 
                      value={editingQuestion?.answer}
                      onChange={(e) => setEditingQuestion({...editingQuestion, answer: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="">Select Answer</option>
                      {editingQuestion?.options.map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt || `Option ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Difficulty</label>
                    <select 
                      value={editingQuestion?.difficulty}
                      onChange={(e) => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Explanation</label>
                  <textarea 
                    value={editingQuestion?.explanation}
                    onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Question"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
