import { useParams, Link, useNavigate } from "react-router-dom";
import { CATEGORIES } from "../constants";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, ChevronRight, Zap, Trophy, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Category } from "../types";

export default function Topics() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    const foundCategory = CATEGORIES.find((cat) => cat.id === categoryId);
    if (foundCategory) {
      setCategory(foundCategory);
    } else {
      navigate("/categories");
    }
  }, [categoryId, navigate]);

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
                  <span>5000+ MCQs</span>
                  <span className="text-blue-500">Practice Now</span>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Sectional & Full Mock Tests Card */}
      <section className="pt-12">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest border border-blue-500/30">
                <Trophy size={14} />
                <span>Premium Feature</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Sectional & Full Mock Tests
              </h2>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Take your preparation to the next level with timed full-length mock tests 
                designed by experts to simulate the actual JKSSB and SSC exam environment.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400">
                    <Clock size={20} />
                  </div>
                  <div className="text-sm font-bold">Timed Sessions</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-green-400">
                    <Zap size={20} />
                  </div>
                  <div className="text-sm font-bold">Instant Analysis</div>
                </div>
              </div>
            </div>
            
            <button className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/20 active:scale-95">
              Unlock Mock Tests
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
