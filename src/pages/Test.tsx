import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { MCQ, UserProfile, TestAttempt } from "../types";
import { getRandomQuestions } from "../lib/mockData";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Timer, Trophy, Zap, AlertCircle, LayoutDashboard, RotateCcw } from "lucide-react";
import { db, doc, updateDoc, increment, addDoc, collection, Timestamp } from "../firebase";
import ReactMarkdown from "react-markdown";

interface TestProps {
  user: UserProfile | null;
}

export default function Test({ user }: TestProps) {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [startTime] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (topicId) {
      const qs = getRandomQuestions(topicId, 10);
      setQuestions(qs);
    }
  }, [topicId]);

  useEffect(() => {
    if (!isFinished && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      finishTest();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isFinished]);

  const handleAnswer = (answer: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: answer });
  };

  const finishTest = async () => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (user) {
      const score = questions.reduce((acc, q, idx) => {
        return acc + (selectedAnswers[idx] === q.answer ? 1 : 0);
      }, 0);

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const accuracy = (score / questions.length) * 100;

      // Update User XP and Streak
      const userRef = doc(db, "users", user.uid);
      const xpGained = score * 10 + (accuracy === 100 ? 50 : 0);
      
      await updateDoc(userRef, {
        xp: increment(xpGained),
        lastActive: new Date().toISOString(),
      });

      // Save Attempt
      const attempt: TestAttempt = {
        userId: user.uid,
        testId: topicId || "unknown",
        type: "topic",
        score,
        totalQuestions: questions.length,
        accuracy,
        timeTaken,
        timestamp: Timestamp.now(),
        weakTopics: questions.filter((q, idx) => selectedAnswers[idx] !== q.answer).map(q => q.topic),
      };
      await addDoc(collection(db, "attempts"), attempt);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (questions.length === 0) return null;

  if (isFinished) {
    const score = questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.answer ? 1 : 0);
    }, 0);
    const accuracy = (score / questions.length) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto space-y-12 pb-24"
      >
        <div className="bg-white rounded-[2.5rem] p-12 text-center space-y-8 shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
          
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Trophy size={48} />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Test Completed!</h2>
            <p className="text-slate-500 font-bold text-lg uppercase tracking-widest">Your Performance Report</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <div className="text-3xl font-black text-blue-600">{score} / {questions.length}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <div className="text-3xl font-black text-green-600">{accuracy.toFixed(1)}%</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accuracy</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <div className="text-3xl font-black text-purple-600">+{score * 10} XP</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">XP Gained</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
              <LayoutDashboard size={20} />
              Go to Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
            >
              <RotateCcw size={20} />
              Retake Test
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-black text-slate-900 px-4">Detailed Review</h3>
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Question {idx + 1}</span>
                    <h4 className="text-lg font-bold text-slate-900 leading-relaxed">{q.question}</h4>
                  </div>
                  {selectedAnswers[idx] === q.answer ? (
                    <CheckCircle className="text-green-500 shrink-0" size={28} />
                  ) : (
                    <XCircle className="text-red-500 shrink-0" size={28} />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = opt === q.answer;
                    const isSelected = opt === selectedAnswers[idx];
                    return (
                      <div
                        key={optIdx}
                        className={`p-4 rounded-xl border-2 font-medium transition-all ${
                          isCorrect
                            ? "bg-green-50 border-green-200 text-green-700"
                            : isSelected
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-slate-50 border-slate-100 text-slate-500"
                        }`}
                      >
                        {opt}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-6 bg-blue-50 rounded-2xl space-y-3 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-widest">
                      <AlertCircle size={16} />
                      Explanation
                    </div>
                    <div className="text-slate-700 text-sm leading-relaxed prose prose-blue prose-sm max-w-none">
                      <ReactMarkdown>{q.explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link to={`/category/${currentQuestion.category}`} className="text-slate-400 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{topicId?.replace("-", " ")} Practice</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">{currentQuestion.difficulty}</span>
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm font-black text-slate-700">
            <Timer size={20} className={timeLeft < 60 ? "text-red-500 animate-pulse" : "text-blue-600"} />
            <span className={timeLeft < 60 ? "text-red-500" : ""}>{formatTime(timeLeft)}</span>
          </div>
          <button
            onClick={finishTest}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            Submit Test
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          className="h-full bg-blue-600"
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-12"
        >
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
              {currentQuestion.question}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                className={`group flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left ${
                  selectedAnswers[currentIndex] === option
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-white border-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-colors ${
                    selectedAnswers[currentIndex] === option
                      ? "bg-blue-500 text-white"
                      : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg font-bold">{option}</span>
                </div>
                {selectedAnswers[currentIndex] === option && (
                  <CheckCircle size={24} className="text-white" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
          Previous
        </button>
        
        {currentIndex === questions.length - 1 ? (
          <button
            onClick={finishTest}
            className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
          >
            Finish Test
            <CheckCircle size={20} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            Next Question
            <ArrowRight size={20} />
          </button>
        )}
      </div>

      {/* Question Grid Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Navigator</h3>
        <div className="flex flex-wrap gap-3">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                currentIndex === idx
                  ? "bg-blue-600 text-white shadow-md scale-110"
                  : selectedAnswers[idx]
                  ? "bg-blue-100 text-blue-600 border border-blue-200"
                  : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
