import { GoogleGenAI, Type } from "@google/genai";
import { MCQ } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateMCQs(category: string, topic: string, count: number = 5): Promise<MCQ[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} high-quality MCQ questions for the exam category "${category}" and topic "${topic}". 
    The questions should be relevant to JKSSB and SSC exams. 
    Include a mix of easy, medium, and hard difficulties. 
    Each question must have 4 options, a correct answer, and a detailed explanation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
          },
          required: ["question", "options", "answer", "explanation", "difficulty"]
        }
      }
    }
  });

  const mcqs = JSON.parse(response.text || "[]");
  return mcqs.map((m: any) => ({
    ...m,
    category,
    topic
  }));
}
