import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, auth, db, doc, getDoc, setDoc } from "./firebase";
import { UserProfile } from "./types";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Topics from "./pages/Topics";
import Test from "./pages/Test";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Leaderboard from "./pages/Leaderboard";
import About from "./pages/About";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            xp: 0,
            streak: 0,
            lastActive: new Date().toISOString(),
            badges: ["Beginner"],
            rank: "Novice",
          };
          // Write to private users collection
          await setDoc(doc(db, "users", firebaseUser.uid), newUser);
          
          // Write to public profiles collection (no email)
          const { email, ...publicProfile } = newUser;
          await setDoc(doc(db, "profiles", firebaseUser.uid), publicProfile);
          
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        <Navbar user={user} />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:categoryId" element={<Topics />} />
              <Route path="/test/:topicId" element={<Test user={user} />} />
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              <Route path="/admin" element={<Admin user={user} />} />
              <Route path="/super-admin" element={<SuperAdmin user={user} />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
