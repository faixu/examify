import { useParams, Link, useNavigate } from "react-router-dom";
import { CATEGORIES } from "../constants";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, ChevronRight, Zap, Trophy, Clock, CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Category } from "../types";
import { db, collection, query, where, getDocs } from "../firebase";

export default function Topics() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const foundCategory = CATEGORIES.find((cat) => cat.id === categoryId);
    if (foundCategory) {
      setCategory(foundCategory);
      fetchTopicCounts(foundCategory.id);
    } else {
      navigate("/categories");
    }
  }, [categoryId, navigate]);

  const fetchTopicCounts = async (catId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "mcqs"), where("category", "==", catId));
      const snapshot = await getDocs(q);
      const counts: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const topicId = doc.data().topic;
        counts[topicId] = (counts[topicId] || 0) + 1;
      });
      
      setTopicCounts(counts);
    } catch (error) {
      console.error("Failed to fetch topic counts", error);
    } finally {
      setLoading(false);
    }
  };

  if (!category) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12 pb-16"
    >
      <div className="pt-8 space-y-6">
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Categories
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {category.name}
          </h1>
          <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
            {category.description}. Select a topic to start your practice session.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {category.topics.map((topic) => (
          <motion.div
            key={topic.id}
            variants={itemVariants}
            whileHover={{ x: 5 }}
            className="group"
          >
            <Link
              to={`/test/${topic.id}`}
              className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Zap size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {topic.name}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">
                    {topic.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>{topicCounts[topic.id] || 0} MCQs</span>
                  <span className="text-blue-500">Practice Now</span>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Premium Tests Sections */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sectional Tests Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest border border-blue-500/30">
              <Zap size={14} />
              <span>Sectional</span>
            </div>
            <h2 className="text-3xl font-black leading-tight">
              Sectional Tests
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Master specific sections like English, Math, or GK with focused tests 
              designed to improve your speed and accuracy in individual subjects.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <CheckCircle size={16} className="text-blue-500" />
                Subject Focused
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <CheckCircle size={16} className="text-blue-500" />
                Topic Mastery
              </div>
            </div>
          </div>
          
          <div className="pt-8 relative z-10">
            <button className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95">
              Unlock Mock Tests
            </button>
          </div>
        </div>

        {/* Full Mock Tests Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600 rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-full text-xs font-black uppercase tracking-widest border border-purple-500/30">
              <Trophy size={14} />
              <span>Full Mock</span>
            </div>
            <h2 className="text-3xl font-black leading-tight">
              Full Mock Tests
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Experience the real exam pressure with full-length mock tests 
              simulating the exact JKSSB and SSC environment and difficulty levels.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <Clock size={16} className="text-purple-500" />
                Timed Sessions
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <Zap size={16} className="text-purple-500" />
                Instant Analysis
              </div>
            </div>
          </div>
          
          <div className="pt-8 relative z-10">
            <button className="w-full bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/20 active:scale-95">
              Unlock Mock Tests
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
