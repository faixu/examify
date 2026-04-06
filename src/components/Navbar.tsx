import { Link, useNavigate } from "react-router-dom";
import { auth, googleProvider, signInWithPopup, signOut } from "../firebase";
import { UserProfile } from "../types";
import { Menu, X, LogIn, LogOut, User, Trophy, BookOpen, LayoutDashboard, Database, Zap } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  user: UserProfile | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [revealAdmin, setRevealAdmin] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (clickTimeout) clearTimeout(clickTimeout);
    
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    
    if (newClicks === 5) {
      setRevealAdmin(true);
      setLogoClicks(0);
    } else {
      const timeout = setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
      setClickTimeout(timeout);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      alert(`Login failed: ${error.message || "Unknown error"}. If this is an "unauthorized domain" error, please ensure the app domain is added to Firebase Console > Auth > Settings > Authorized Domains.`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navLinks = [
    { name: "Categories", path: "/categories", icon: BookOpen },
    { name: "Leaderboard", path: "/leaderboard", icon: Trophy },
    { name: "About", path: "/about", icon: User },
  ];

  if (user) {
    navLinks.push({ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard });
    const isSuperAdmin = user.email?.toLowerCase() === "flust786@gmail.com";
    if (isSuperAdmin) {
      navLinks.push({ name: "Super Admin", path: "/super-admin", icon: Zap });
    }
    if (isSuperAdmin || revealAdmin) {
      navLinks.push({ name: "Admin", path: "/admin", icon: Database });
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              onClick={handleLogoClick}
              className="flex-shrink-0 flex items-center gap-2 select-none"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">Examify</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
              >
                <link.icon size={18} />
                {link.name}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  {user.xp} XP
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-medium transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
              >
                <LogIn size={18} />
                Sign In with Google
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 text-base font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg flex items-center gap-3"
                >
                  <link.icon size={20} />
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-100">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                        <p className="text-xs text-slate-500">{user.xp} XP • {user.rank}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut size={20} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700"
                  >
                    <LogIn size={20} />
                    Sign In with Google
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
