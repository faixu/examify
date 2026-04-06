import { Link } from "react-router-dom";
import { CATEGORIES } from "../constants";
import { motion } from "motion/react";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export default function Categories() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12 pb-16"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Exam Categories</h1>
          <p className="text-slate-600 text-lg">Choose a category to start practicing topic-wise MCQs.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCategories.map((category) => (
          <motion.div
            key={category.id}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="group relative"
          >
            <Link
              to={`/category/${category.id}`}
              className="block p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all space-y-6 h-full"
            >
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <BookOpen size={28} />
                </div>
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors font-bold text-sm uppercase tracking-widest">
                  Explore <ChevronRight size={16} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h2>
                <p className="text-slate-500 leading-relaxed text-sm font-medium">
                  {category.description}
                </p>
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                {category.topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic.id}
                    className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100"
                  >
                    {topic.name}
                  </span>
                ))}
                {category.topics.length > 3 && (
                  <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-xs font-bold border border-slate-100">
                    +{category.topics.length - 3} more
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-24 space-y-4">
          <div className="text-6xl">🔍</div>
          <h3 className="text-2xl font-bold text-slate-900">No categories found</h3>
          <p className="text-slate-500">Try searching for something else or browse all categories.</p>
          <button
            onClick={() => setSearchTerm("")}
            className="text-blue-600 font-bold hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </motion.div>
  );
}
