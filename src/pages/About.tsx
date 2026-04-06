import { motion } from "motion/react";
import { CheckCircle, Users, Trophy, BookOpen, Star, Mail, MapPin, Phone } from "lucide-react";

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
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
      className="space-y-24 pb-24"
    >
      {/* Hero Section */}
      <section className="pt-12 md:pt-24 text-center space-y-8 max-w-4xl mx-auto">
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
          <Star size={16} className="fill-blue-600" />
          <span>Empowering Aspirants Since 2024</span>
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tight">
          Our Mission is to Make Quality Education <span className="text-blue-600">Free for Everyone</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Examify was born out of a simple idea: every student, regardless of their financial background, 
          should have access to high-quality mock tests and practice materials for competitive exams.
        </motion.p>
      </section>

      {/* Values Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            title: "100% Free Access",
            desc: "We believe that knowledge should not be behind a paywall. Our platform is and will always be free for students.",
            icon: "🎁",
          },
          {
            title: "Quality Content",
            desc: "Our questions are curated by experts and updated regularly to match the latest JKSSB and SSC exam patterns.",
            icon: "💎",
          },
          {
            title: "Data Driven",
            desc: "We use advanced analytics to help you identify your weak areas and improve your scores systematically.",
            icon: "📈",
          },
        ].map((value, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 text-center"
          >
            <div className="text-5xl">{value.icon}</div>
            <h3 className="text-2xl font-black text-slate-900">{value.title}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">{value.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Team/Founder Section */}
      <section className="bg-slate-900 rounded-[3rem] p-12 md:p-24 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600 via-transparent to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-black leading-tight">Built by Aspirants, for Aspirants</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              We understand the struggle of finding quality practice material. 
              Our team consists of former aspirants and educators who have 
              cracked these exams themselves.
            </p>
            <div className="space-y-4">
              {[
                "Expert Curated Question Bank",
                "Real-time Performance Tracking",
                "Community-driven Leaderboards",
                "Regular Content Updates",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-blue-500" />
                  <span className="font-bold text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl font-black">E</div>
              <div>
                <h3 className="text-2xl font-black">Examify Team</h3>
                <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Srinagar, J&K</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-slate-300">
                <Mail size={20} className="text-blue-500" />
                <span>contact@examify.in</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <Phone size={20} className="text-blue-500" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <MapPin size={20} className="text-blue-500" />
                <span>Srinagar, Jammu & Kashmir</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { label: "Questions", value: "50K+", icon: BookOpen },
          { label: "Users", value: "10K+", icon: Users },
          { label: "Tests", value: "250K+", icon: Trophy },
          { label: "Success", value: "85%", icon: Star },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} className="space-y-2">
            <div className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
          </motion.div>
        ))}
      </section>
    </motion.div>
  );
}
