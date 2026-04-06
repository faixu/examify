import { UserProfile, MCQ, MockTest } from "../types";
import { useEffect, useState, useRef } from "react";
import { db, collection, getDocs, addDoc, deleteDoc, query, where, writeBatch, doc, handleFirestoreError, OperationType, updateDoc, serverTimestamp } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Database, Zap, Trash2, LayoutDashboard, BookOpen, AlertCircle, CheckCircle, RefreshCw, Plus, StopCircle, ScrollText, Info, XCircle, Settings, FileText, BarChart3 } from "lucide-react";
import { CATEGORIES } from "../constants";
import { generateMCQs } from "../lib/geminiService";
import { Link, useNavigate } from "react-router-dom";

interface SuperAdminProps {
  user: UserProfile | null;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export default function SuperAdmin({ user }: SuperAdminProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"seeding" | "manage-mcqs" | "mock-tests">("seeding");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const stopSeedingRef = useRef<boolean>(false);

  // Seeding State
  const [seedCategory, setSeedCategory] = useState<string>("all");
  const [seedDifficulty, setSeedDifficulty] = useState<string>("mixed");
  const [seedCount, setSeedCount] = useState<number>(5);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [seedingStatus, setSeedingStatus] = useState<string>("");

  // MCQ Management State
  const [mcqSearch, setMcqSearch] = useState("");
  const [mcqCategory, setMcqCategory] = useState("all");
  const [mcqTopic, setMcqTopic] = useState("all");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [editingMcq, setEditingMcq] = useState<any | null>(null);
  const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);

  // Mock Test State
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === "flust786@gmail.com";

  useEffect(() => {
    if (user && !isAdmin) {
      navigate("/dashboard");
    }
    if (isAdmin) {
      fetchStats();
      fetchMockTests();
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (activeTab === "manage-mcqs") {
      fetchMcqs();
    }
  }, [activeTab, mcqCategory, mcqTopic]);

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
    try {
      const snapshot = await getDocs(collection(db, "mcqs"));
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const cat = doc.data().category;
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setStats(counts);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const fetchMcqs = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "mcqs"));
      if (mcqCategory !== "all") q = query(q, where("category", "==", mcqCategory));
      if (mcqTopic !== "all") q = query(q, where("topic", "==", mcqTopic));
      
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCQ));
      
      if (mcqSearch) {
        results = results.filter(q => 
          q.question.toLowerCase().includes(mcqSearch.toLowerCase())
        );
      }
      setMcqs(results.slice(0, 50));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  const fetchMockTests = async () => {
    try {
      const snapshot = await getDocs(collection(db, "mockTests"));
      setMockTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MockTest)));
    } catch (error) {
      console.error("Failed to fetch mock tests", error);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    stopSeedingRef.current = false;
    addLog("Starting AI Seeding...", "info");
    
    try {
      const targetCategories = seedCategory === "all" ? CATEGORIES : CATEGORIES.filter(c => c.id === seedCategory);
      let total = 0;

      for (const cat of targetCategories) {
        if (stopSeedingRef.current) break;
        for (const topic of cat.topics) {
          if (stopSeedingRef.current) break;

          if (skipExisting) {
            const q = query(collection(db, "mcqs"), where("category", "==", cat.id), where("topic", "==", topic.id));
            const snap = await getDocs(q);
            if (!snap.empty) {
              addLog(`Skipping ${topic.name} (already has content)`, "warning");
              continue;
            }
          }

          setSeedingStatus(`Generating ${topic.name}...`);
          const generated = await generateMCQs(cat.id, topic.id, seedCount, seedDifficulty);
          const batch = writeBatch(db);
          generated.forEach(g => batch.set(doc(collection(db, "mcqs")), g));
          await batch.commit();
          total += generated.length;
          addLog(`Seeded ${generated.length} questions for ${topic.name}`, "success");
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      addLog(`Seeding complete. Total: ${total}`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
      setSeedingStatus("");
    }
  };

  const handleSaveMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id, ...data } = editingMcq;
      if (id) await updateDoc(doc(db, "mcqs", id), data);
      else await addDoc(collection(db, "mcqs"), data);
      setIsMcqModalOpen(false);
      fetchMcqs();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id, ...data } = editingTest;
      if (id) await updateDoc(doc(db, "mockTests", id), data);
      else await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
      setIsTestModalOpen(false);
      fetchMockTests();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "mockTests");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Super Admin</h1>
            <p className="text-slate-500 font-medium">Full system control & content management</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchStats} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <Link to="/admin" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
              <Settings size={18} />
              Standard Admin
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 p-1 bg-slate-200/50 rounded-2xl w-fit">
          {[
            { id: "seeding", label: "AI Seeding", icon: Zap },
            { id: "manage-mcqs", label: "MCQs", icon: Database },
            { id: "mock-tests", label: "Mock Tests", icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {activeTab === "seeding" && (
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">AI Content Seeding</h2>
                    <p className="text-slate-500 text-sm">Generate questions across the entire syllabus</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Category Scope</label>
                    <select 
                      value={seedCategory} 
                      onChange={e => setSeedCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Full Syllabus (All Categories)</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Difficulty</label>
                    <select 
                      value={seedDifficulty} 
                      onChange={e => setSeedDifficulty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={skipExisting} 
                      onChange={e => setSkipExisting(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Skip topics with existing questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 uppercase">Per Topic:</span>
                    <input 
                      type="number" 
                      value={seedCount} 
                      onChange={e => setSeedCount(parseInt(e.target.value))}
                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSeed}
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin" /> : <Zap />}
                  {seedingStatus || "Start Global Seeding"}
                </button>
              </section>
            )}

            {activeTab === "manage-mcqs" && (
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900">MCQ Database</h2>
                  <button 
                    onClick={() => {
                      setEditingMcq({ question: "", options: ["", "", "", ""], answer: "", category: CATEGORIES[0].id, topic: CATEGORIES[0].topics[0].id, difficulty: "medium" });
                      setIsMcqModalOpen(true);
                    }}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Plus />
                  </button>
                </div>

                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Search questions..." 
                    value={mcqSearch}
                    onChange={e => setMcqSearch(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                  <select value={mcqCategory} onChange={e => setMcqCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none">
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  {mcqs.map(q => (
                    <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start group">
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-black uppercase text-blue-600">{q.category}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400">{q.topic}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{q.question}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingMcq(q); setIsMcqModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><RefreshCw size={16} /></button>
                        <button onClick={async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "mcqs", q.id!)); fetchMcqs(); } }} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "mock-tests" && (
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900">Mock Test Management</h2>
                  <button 
                    onClick={() => {
                      setEditingTest({ title: "", description: "", category: CATEGORIES[0].id, type: "full", duration: 60, totalMarks: 100, questions: [] });
                      setIsTestModalOpen(true);
                    }}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Plus />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockTests.map(test => (
                    <div key={test.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 group">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest">{test.type}</span>
                          <h3 className="text-lg font-black text-slate-900">{test.title}</h3>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingTest(test); setIsTestModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><RefreshCw size={16} /></button>
                          <button onClick={async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "mockTests", test.id!)); fetchMockTests(); } }} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>{test.questions.length} Questions</span>
                        <span>{test.duration} Mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <BarChart3 size={20} className="text-blue-600" />
                Database Stats
              </h3>
              <div className="space-y-4">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">{cat.name}</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black">{stats[cat.id] || 0}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-900">Total MCQs</span>
                  <span className="text-lg font-black text-blue-600">{Object.values(stats).reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-20" />
              <h3 className="text-xl font-black flex items-center gap-3 relative z-10">
                <ScrollText size={20} className="text-blue-400" />
                Live Logs
              </h3>
              <div className="h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar relative z-10">
                {logs.map(log => (
                  <div key={log.id} className={`p-3 rounded-xl text-[10px] font-medium border flex gap-2 ${
                    log.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                    log.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    log.type === "warning" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                    "bg-slate-800 border-slate-700 text-slate-400"
                  }`}>
                    <span className="opacity-50">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MCQ Modal */}
      <AnimatePresence>
        {isMcqModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900">Edit MCQ</h3>
              <form onSubmit={handleSaveMcq} className="space-y-4">
                <textarea value={editingMcq.question} onChange={e => setEditingMcq({...editingMcq, question: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Question" rows={3} />
                {editingMcq.options.map((opt: string, i: number) => (
                  <input key={i} value={opt} onChange={e => { const o = [...editingMcq.options]; o[i] = e.target.value; setEditingMcq({...editingMcq, options: o}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder={`Option ${i+1}`} />
                ))}
                <input value={editingMcq.answer} onChange={e => setEditingMcq({...editingMcq, answer: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Correct Answer" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsMcqModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6">
              <h3 className="text-2xl font-black text-slate-900">Mock Test Config</h3>
              <form onSubmit={handleSaveTest} className="space-y-4">
                <input value={editingTest.title} onChange={e => setEditingTest({...editingTest, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Test Title" />
                <textarea value={editingTest.description} onChange={e => setEditingTest({...editingTest, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Description" rows={2} />
                <div className="grid grid-cols-2 gap-4">
                  <select value={editingTest.category} onChange={e => setEditingTest({...editingTest, category: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={editingTest.type} onChange={e => setEditingTest({...editingTest, type: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="topic">Topic Test</option>
                    <option value="sectional">Sectional</option>
                    <option value="full">Full Mock</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsTestModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold">Save Test</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
