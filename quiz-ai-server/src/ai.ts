import 'dotenv/config';
import type { Question } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function generateQuestions(topic: string): Promise<Question[]> {
  try {
    const prompt = `Generate 10 simple and unique multiple-choice quiz questions for about "${topic}". For each question, include a question, 4 options, and the index of the correct answer (0-based). but dont make all answer come in 0 index Return an array of 10 objects in JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              answer: { type: Type.NUMBER },
            },
            propertyOrdering: ["question", "options", "answer"],
          },
        },
      },
    });

    const questions: Question[] = JSON.parse(await response.text ?? "[]");
    return questions;
  } catch (error:unknown) {
    console.error('Error generating questions:', JSON.stringify(error));
    return [];
  }
}