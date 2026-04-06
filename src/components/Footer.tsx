import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1 space-y-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Examify</span>
          </Link>
          <p className="text-slate-400 text-sm leading-relaxed">
            The ultimate MCQ mock test platform for JKSSB and SSC aspirants. 
            Practice, track, and succeed with our comprehensive question bank.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-blue-500 transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="hover:text-blue-400 transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-pink-500 transition-colors">
              <Instagram size={20} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-white font-bold text-lg mb-6">Quick Links</h3>
          <ul className="space-y-4 text-sm">
            <li><Link to="/categories" className="hover:text-blue-400 transition-colors">Categories</Link></li>
            <li><Link to="/leaderboard" className="hover:text-blue-400 transition-colors">Leaderboard</Link></li>
            <li><Link to="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
            <li><Link to="/dashboard" className="hover:text-blue-400 transition-colors">User Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-lg mb-6">Exam Categories</h3>
          <ul className="space-y-4 text-sm">
            <li><Link to="/category/gk" className="hover:text-blue-400 transition-colors">General Knowledge</Link></li>
            <li><Link to="/category/math" className="hover:text-blue-400 transition-colors">Mathematics</Link></li>
            <li><Link to="/category/reasoning" className="hover:text-blue-400 transition-colors">Reasoning</Link></li>
            <li><Link to="/category/jk-gk" className="hover:text-blue-400 transition-colors">JK Specific GK</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-lg mb-6">Contact Us</h3>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-blue-500" />
              <span>support@examify.in</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-blue-500" />
              <span>+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-blue-500" />
              <span>Srinagar, Jammu & Kashmir</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Examify. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300">Terms of Service</a>
          <a href="#" className="hover:text-slate-300">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
}
