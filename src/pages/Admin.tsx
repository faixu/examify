import { UserProfile, MCQ, MockTest } from "../types";
import { useEffect, useState, useRef } from "react";
import { db, collection, getDocs, addDoc, deleteDoc, query, where, writeBatch, doc, handleFirestoreError, OperationType, updateDoc, serverTimestamp } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Database, Zap, Trash2, LayoutDashboard, BookOpen, AlertCircle, CheckCircle, RefreshCw, Plus, StopCircle, ScrollText, Info, XCircle, FileText, Settings, BarChart3 } from "lucide-react";
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

  const [activeTab, setActiveTab] = useState<"ai-generator" | "mock-tests" | "questions">("ai-generator");
  const [manageSearch, setManageSearch] = useState("");
  const [manageCategory, setManageCategory] = useState("all");
  const [manageTopic, setManageTopic] = useState("all");
  const [manageQuestions, setManageQuestions] = useState<MCQ[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Mock Test State
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testMcqSearch, setTestMcqSearch] = useState("");
  const [testMcqResults, setTestMcqResults] = useState<MCQ[]>([]);
  const [isSearchingMcqs, setIsSearchingMcqs] = useState(false);

  // AI Mock Test Gen State
  const [isAiTestModalOpen, setIsAiTestModalOpen] = useState(false);
  const [aiTestConfig, setAiTestConfig] = useState({
    title: "Full Mock Test",
    questionsPerCategory: 20,
    difficulty: "mixed",
    duration: 120,
    totalMarks: 100
  });

  const isAdmin = user?.email?.toLowerCase() === "flust786@gmail.com";

  useEffect(() => {
    if (!isAdmin && user) {
      navigate("/dashboard");
    }
    if (isAdmin) {
      fetchStats();
      fetchMockTests();
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (activeTab === "questions") {
      fetchManageQuestions();
    }
  }, [activeTab, manageCategory, manageTopic]);

  const fetchMockTests = async () => {
    try {
      const snapshot = await getDocs(collection(db, "mockTests"));
      setMockTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MockTest)));
    } catch (error) {
      console.error("Failed to fetch mock tests", error);
    }
  };

  const searchMcqsForTest = async () => {
    if (!testMcqSearch && !editingTest?.category) return;
    setIsSearchingMcqs(true);
    try {
      let q = query(collection(db, "mcqs"));
      if (editingTest?.category) {
        q = query(q, where("category", "==", editingTest.category));
      }
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCQ));
      if (testMcqSearch) {
        results = results.filter(m => m.question.toLowerCase().includes(testMcqSearch.toLowerCase()));
      }
      setTestMcqResults(results.slice(0, 20));
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearchingMcqs(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTestModalOpen) searchMcqsForTest();
    }, 500);
    return () => clearTimeout(timer);
  }, [testMcqSearch, editingTest?.category, isTestModalOpen]);

  const handleGenerateAiMockTest = async () => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }

    setLoading(true);
    stopSeedingRef.current = false;
    addLog(`Starting AI Mock Test Generation: ${aiTestConfig.title}`, "info");
    
    try {
      const allMcqIds: string[] = [];
      const categories = CATEGORIES;
      let totalGenerated = 0;

      for (const cat of categories) {
        if (stopSeedingRef.current) break;
        addLog(`Generating ${aiTestConfig.questionsPerCategory} questions for ${cat.name}...`, "info");
        
        const questionsPerTopic = Math.max(1, Math.ceil(aiTestConfig.questionsPerCategory / cat.topics.length));
        let catGenerated = 0;

        for (const topic of cat.topics) {
          if (stopSeedingRef.current || catGenerated >= aiTestConfig.questionsPerCategory) break;
          
          const countToGen = Math.min(questionsPerTopic, aiTestConfig.questionsPerCategory - catGenerated);
          setSeedingStatus(`Generating ${topic.name} (${countToGen} questions)...`);
          
          try {
            const generated = await generateMCQs(cat.id, topic.id, countToGen, aiTestConfig.difficulty);
            const batch = writeBatch(db);
            const newIds: string[] = [];
            
            generated.forEach(g => {
              const newDocRef = doc(collection(db, "mcqs"));
              batch.set(newDocRef, g);
              newIds.push(newDocRef.id);
            });
            
            await batch.commit();
            allMcqIds.push(...newIds);
            catGenerated += generated.length;
            totalGenerated += generated.length;
            
            addLog(`Seeded ${generated.length} questions for ${topic.name}`, "success");
            await new Promise(r => setTimeout(r, 800));
          } catch (error: any) {
            if (error.message.includes("quota") || error.message.includes("limit")) {
              addLog("API Quota exceeded. Please select a valid paid API key.", "error");
              if (window.aistudio) await window.aistudio.openSelectKey();
              break;
            }
            throw error;
          }
        }
      }

      if (allMcqIds.length > 0) {
        const testData: Partial<MockTest> = {
          title: aiTestConfig.title,
          description: `AI Generated Full Mock Test with ${allMcqIds.length} questions across all sections.`,
          category: "all",
          type: "full",
          duration: aiTestConfig.duration,
          totalMarks: aiTestConfig.totalMarks,
          questions: allMcqIds,
          createdAt: serverTimestamp() as any
        };
        
        await addDoc(collection(db, "mockTests"), testData);
        addLog(`Mock Test "${aiTestConfig.title}" created successfully with ${allMcqIds.length} questions!`, "success");
        fetchMockTests();
        setIsAiTestModalOpen(false);
      } else {
        addLog("No questions were generated. Mock test creation aborted.", "error");
      }
    } catch (error: any) {
      addLog(`Error during AI Mock Test Generation: ${error.message}`, "error");
    } finally {
      setLoading(false);
      setSeedingStatus("");
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
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }
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
            if (e.message.includes("quota") || e.message.includes("limit")) {
              addLog("API Quota exceeded. Please select a valid paid API key.", "error");
              if (window.aistudio) await window.aistudio.openSelectKey();
              break;
            }
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
      <div className="flex gap-4 p-1 bg-slate-200/50 rounded-2xl w-fit">
        {[
          { id: "ai-generator", label: "AI Mock Test Generator", icon: Zap },
          { id: "mock-tests", label: "Mock Test Management", icon: FileText },
          { id: "questions", label: "Question Management", icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === "ai-generator" && (
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                    <Zap size={12} />
                    <span>AI Content Engine</span>
                  </div>
                  <h2 className="text-2xl font-black">AI Mock Test Generator</h2>
                  <p className="text-slate-400 text-sm">
                    Generate a full-syllabus mock test automatically. Configure the parameters below and let Gemini AI build the content.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Test Title</label>
                    <input 
                      type="text"
                      value={aiTestConfig.title}
                      onChange={(e) => setAiTestConfig({...aiTestConfig, title: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Full Mock Test #1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</label>
                    <select 
                      value={aiTestConfig.difficulty}
                      onChange={(e) => setAiTestConfig({...aiTestConfig, difficulty: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions per Section</label>
                    <input 
                      type="number"
                      value={aiTestConfig.questionsPerCategory}
                      onChange={(e) => setAiTestConfig({...aiTestConfig, questionsPerCategory: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Mins)</label>
                    <input 
                      type="number"
                      value={aiTestConfig.duration}
                      onChange={(e) => setAiTestConfig({...aiTestConfig, duration: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Marks</label>
                    <input 
                      type="number"
                      value={aiTestConfig.totalMarks}
                      onChange={(e) => setAiTestConfig({...aiTestConfig, totalMarks: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Total Questions:</span>
                  <span className="text-lg font-black text-blue-400">{aiTestConfig.questionsPerCategory * CATEGORIES.length}</span>
                </div>

                <div className="flex flex-col gap-3">
                  {!loading ? (
                    <button
                      onClick={handleGenerateAiMockTest}
                      className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-black text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Zap size={18} />
                      <span>Generate Full Mock Test</span>
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <div className="flex-1 bg-slate-800 text-blue-400 px-6 py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 border border-blue-500/30">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="truncate">{seedingStatus || "Processing..."}</span>
                      </div>
                      <button
                        onClick={() => {
                          stopSeedingRef.current = true;
                          addLog("Stopping process...", "warning");
                        }}
                        className="bg-red-600 text-white px-5 py-4 rounded-xl font-black hover:bg-red-700 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <StopCircle size={18} />
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "mock-tests" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900">Mock Test Management</h2>
                <button 
                  onClick={() => {
                    setEditingTest({ title: "", description: "", category: CATEGORIES[0].id, type: "full", duration: 60, totalMarks: 100, questions: [] });
                    setIsTestModalOpen(true);
                  }}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mockTests.map(test => (
                  <div key={test.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-widest">{test.type}</span>
                        <h3 className="text-base font-black text-slate-900 line-clamp-1">{test.title}</h3>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingTest(test); setIsTestModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"><RefreshCw size={14} /></button>
                        <button onClick={async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "mockTests", test.id!)); fetchMockTests(); } }} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{test.questions.length} Questions</span>
                      <span>{test.duration} Mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Questions</label>
                    <input 
                      type="text"
                      placeholder="Search by text..."
                      value={manageSearch}
                      onChange={(e) => setManageSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="w-full md:w-40 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                    <select 
                      value={manageCategory}
                      onChange={(e) => setManageCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {manageQuestions.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="font-bold uppercase tracking-widest text-[10px]">No questions found</p>
                    </div>
                  ) : (
                    manageQuestions.map((q) => (
                      <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 group">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                              q.difficulty === "easy" ? "bg-green-100 text-green-700" :
                              q.difficulty === "medium" ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {q.difficulty}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {q.category} / {q.topic}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{q.question}</p>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsEditing(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteQuestion(q.id!)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
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

      {/* Mock Test Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900">{editingTest?.id ? "Edit Mock Test" : "Create Mock Test"}</h2>
                  <p className="text-slate-500 text-xs md:sm font-bold">Configure test details and select questions</p>
                </div>
                <button onClick={() => setIsTestModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><XCircle size={24} className="text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Test Title</label>
                    <input type="text" value={editingTest?.title} onChange={e => setEditingTest({...editingTest, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                    <select value={editingTest?.category} onChange={e => setEditingTest({...editingTest, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="all">All Sections (Full Mock)</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
                    <select value={editingTest?.type} onChange={e => setEditingTest({...editingTest, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="full">Full Mock</option>
                      <option value="sectional">Sectional</option>
                      <option value="topic">Topic-wise</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Duration (Mins)</label>
                    <input type="number" value={editingTest?.duration} onChange={e => setEditingTest({...editingTest, duration: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Marks</label>
                    <input type="number" value={editingTest?.totalMarks} onChange={e => setEditingTest({...editingTest, totalMarks: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Questions ({editingTest?.questions?.length || 0} selected)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search questions to add..." 
                          value={testMcqSearch}
                          onChange={e => setTestMcqSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Database className="absolute left-3 top-3 text-slate-400" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                    {isSearchingMcqs ? (
                      <div className="p-8 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Searching database...</div>
                    ) : testMcqResults.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No questions found</div>
                    ) : (
                      testMcqResults.map(mcq => {
                        const isSelected = editingTest?.questions?.includes(mcq.id);
                        return (
                          <button
                            key={mcq.id}
                            onClick={() => {
                              const current = editingTest.questions || [];
                              const next = isSelected ? current.filter((id: string) => id !== mcq.id) : [...current, mcq.id];
                              setEditingTest({...editingTest, questions: next});
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                              isSelected ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" : "bg-white border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{mcq.question}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mcq.topic}</p>
                            </div>
                            {isSelected && <CheckCircle size={18} className="text-blue-600 ml-4 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button onClick={() => setIsTestModalOpen(false)} className="flex-1 px-8 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={handleSaveTest} disabled={loading} className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Mock Test"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-black text-slate-900">
                  {editingQuestion?.id ? "Edit Question" : "Add Question"}
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="p-6 md:p-8 overflow-y-auto space-y-4 md:space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                    <select 
                      value={editingQuestion?.category}
                      onChange={(e) => setEditingQuestion({...editingQuestion, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Topic</label>
                    <select 
                      value={editingQuestion?.topic}
                      onChange={(e) => setEditingQuestion({...editingQuestion, topic: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CATEGORIES.find(c => c.id === editingQuestion?.category)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Text</label>
                  <textarea 
                    value={editingQuestion?.question}
                    onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingQuestion?.options.map((opt: string, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">Option {idx + 1}</label>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = e.target.value;
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correct Answer</label>
                    <select 
                      value={editingQuestion?.answer}
                      onChange={(e) => setEditingQuestion({...editingQuestion, answer: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="">Select Answer</option>
                      {editingQuestion?.options.map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt || `Option ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty</label>
                    <select 
                      value={editingQuestion?.difficulty}
                      onChange={(e) => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Explanation</label>
                  <textarea 
                    value={editingQuestion?.explanation}
                    onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
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
