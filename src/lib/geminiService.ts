import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MCQ } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateMCQs(category: string, topic: string, count: number = 5, difficulty: string = "mixed"): Promise<MCQ[]> {
  try {
    const difficultyInstruction = difficulty === "mixed" 
      ? "Include a mix of easy, medium, and hard difficulties." 
      : `All questions must be of "${difficulty}" difficulty.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} high-quality MCQ questions for the exam category "${category}" and topic "${topic}". 
      The questions should be relevant to JKSSB and SSC exams. 
      ${difficultyInstruction}
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

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini AI");
    
    const mcqs = JSON.parse(text);
    return mcqs.map((m: any, index: number) => ({
      ...m,
      id: `${category}-${topic}-${Date.now()}-${index}`,
      category,
      topic
    }));
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate MCQs with AI");
  }
}
