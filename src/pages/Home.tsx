import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle, Trophy, Zap, Users, BookOpen, Star, LogIn } from "lucide-react";
import { auth, googleProvider, signInWithPopup } from "../firebase";

interface HomeProps {
  user: UserProfile | null;
}

export default function Home({ user }: HomeProps) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
      className="space-y-24 pb-16"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600 via-transparent to-transparent" />
        </div>
        
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
            <Star size={16} className="fill-blue-600" />
            <span>Trusted by 10,000+ Aspirants</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
            Master Your Exams with <span className="text-blue-600 relative">Examify<span className="absolute bottom-2 left-0 w-full h-3 bg-blue-100 -z-10" /></span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The most comprehensive free MCQ platform for JKSSB and SSC. 
            Practice topic-wise, attempt full mocks, and track your progress in real-time.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/categories"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95 group"
            >
              Start Free Mock Test
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            {!user && (
              <Link
                to="/about"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
              >
                Learn More
              </Link>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-8 pt-12 text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              <span>No Login Required for Basic Tests</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              <span>Latest Exam Patterns</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-white p-12 rounded-3xl shadow-sm border border-slate-100">
        {[
          { label: "Total MCQs", value: "50,000+", icon: BookOpen, color: "text-blue-600" },
          { label: "Active Students", value: "10,000+", icon: Users, color: "text-green-600" },
          { label: "Tests Attempted", value: "250,000+", icon: Zap, color: "text-yellow-600" },
          { label: "Success Rate", value: "85%", icon: Trophy, color: "text-purple-600" },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} className="text-center space-y-2">
            <div className={`w-12 h-12 ${stat.color} bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <stat.icon size={24} />
            </div>
            <div className="text-3xl font-black text-slate-900">{stat.value}</div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Features Grid */}
      <section className="space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900">Why Choose Examify?</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Everything you need to crack your dream government job in one place.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Topic-wise Practice",
              desc: "Deep dive into specific topics with thousands of curated MCQs for better conceptual clarity.",
              icon: "📚",
            },
            {
              title: "Full Mock Tests",
              desc: "Simulate real exam environments with timed full-length tests and instant results.",
              icon: "⏱️",
            },
            {
              title: "Performance Analytics",
              desc: "Identify your weak areas and track your growth with detailed accuracy and score reports.",
              icon: "📊",
            },
            {
              title: "Gamified Learning",
              desc: "Earn XP, collect badges, and climb the leaderboard to stay motivated throughout your journey.",
              icon: "🎮",
            },
            {
              title: "Daily Challenges",
              desc: "Keep your streak alive with daily 10-question challenges across all categories.",
              icon: "🔥",
            },
            {
              title: "Mobile First",
              desc: "Practice on the go with our fully responsive and fast-loading mobile interface.",
              icon: "📱",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 rounded-[2.5rem] p-12 md:p-24 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">Ready to Ace Your Exams?</h2>
        <p className="text-blue-100 text-lg max-w-2xl mx-auto">Join thousands of students who are already improving their scores with Examify.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/categories"
            className="w-full sm:w-auto bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95"
          >
            Get Started Now
          </Link>
          {!user && (
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto bg-blue-700 text-white border border-blue-500 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              Sign Up with Google
            </button>
          )}
        </div>
      </section>
    </motion.div>
  );
}
