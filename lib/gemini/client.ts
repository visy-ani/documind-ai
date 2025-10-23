import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined')
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const getGeminiModel = (modelName: string = 'gemini-2.0-flash-exp') => {
  return genAI.getGenerativeModel({ model: modelName })
}

