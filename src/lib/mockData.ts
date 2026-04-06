import { MCQ } from "../types";

export const MOCK_MCQS: Record<string, MCQ[]> = {
  "history": [
    {
      id: "h1",
      category: "gk",
      topic: "history",
      question: "Who was the founder of the Maurya Empire?",
      options: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Harsha"],
      answer: "Chandragupta Maurya",
      explanation: "Chandragupta Maurya founded the Maurya Empire in 322 BCE with the help of Chanakya.",
      difficulty: "easy"
    },
    {
      id: "h2",
      category: "gk",
      topic: "history",
      question: "The Battle of Plassey was fought in which year?",
      options: ["1757", "1764", "1857", "1748"],
      answer: "1757",
      explanation: "The Battle of Plassey took place on 23 June 1757 between the British East India Company and the Nawab of Bengal.",
      difficulty: "medium"
    },
    {
      id: "h3",
      category: "gk",
      topic: "history",
      question: "Who was the first Governor-General of Bengal?",
      options: ["Warren Hastings", "Lord Clive", "Lord Cornwallis", "Lord Wellesley"],
      answer: "Warren Hastings",
      explanation: "Warren Hastings became the first Governor-General of Bengal in 1773.",
      difficulty: "medium"
    }
  ],
  "jk-history": [
    {
      id: "jk1",
      category: "jk-gk",
      topic: "jk-history",
      question: "Who was the first Dogra ruler of Jammu and Kashmir?",
      options: ["Gulab Singh", "Ranbir Singh", "Pratap Singh", "Hari Singh"],
      answer: "Gulab Singh",
      explanation: "Maharaja Gulab Singh was the founder of the Dogra dynasty and the first Maharaja of the princely state of Jammu and Kashmir.",
      difficulty: "easy"
    },
    {
      id: "jk2",
      category: "jk-gk",
      topic: "jk-history",
      question: "The Treaty of Amritsar was signed in which year?",
      options: ["1846", "1850", "1839", "1849"],
      answer: "1846",
      explanation: "The Treaty of Amritsar was signed on March 16, 1846, between the British and Gulab Singh.",
      difficulty: "medium"
    }
  ],
  "basics": [
    {
      id: "c1",
      category: "computer",
      topic: "basics",
      question: "Who is known as the father of computers?",
      options: ["Charles Babbage", "Alan Turing", "John von Neumann", "Bill Gates"],
      answer: "Charles Babbage",
      explanation: "Charles Babbage is credited with inventing the first mechanical computer, the Difference Engine.",
      difficulty: "easy"
    },
    {
      id: "c2",
      category: "computer",
      topic: "basics",
      question: "What is the full form of CPU?",
      options: ["Central Processing Unit", "Computer Processing Unit", "Central Power Unit", "Central Program Unit"],
      answer: "Central Processing Unit",
      explanation: "CPU stands for Central Processing Unit, often called the brain of the computer.",
      difficulty: "easy"
    }
  ]
};

// Helper to get random questions if topic not found
export const getRandomQuestions = (topicId: string, count: number = 10): MCQ[] => {
  const questions = MOCK_MCQS[topicId] || [];
  if (questions.length > 0) return questions;
  
  // Fallback: Generate generic questions based on topic name
  return Array.from({ length: count }).map((_, i) => ({
    id: `gen-${topicId}-${i}`,
    category: "general",
    topic: topicId,
    question: `Sample question ${i + 1} for ${topicId}?`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    answer: "Option A",
    explanation: `This is a sample explanation for question ${i + 1}.`,
    difficulty: i % 3 === 0 ? "hard" : i % 2 === 0 ? "medium" : "easy"
  }));
};
