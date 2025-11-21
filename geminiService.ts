import { GoogleGenAI, Type } from "@google/genai";
import { Refill, TankConfig, AnalysisResult, DailyLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeConsumption = async (
  refills: Refill[],
  logs: DailyLog[],
  tankConfig: TankConfig
): Promise<AnalysisResult> => {
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    Actua com un expert analista energètic i meteorològic per a una llar a Sant Hipòlit de Voltregà, Osona (Espanya).
    
    DADES DEL TANC:
    - Capacitat total: ${tankConfig.capacity} litres
    - Nivell actual: ${tankConfig.currentLevel} litres
    - Llindar d'alarma configurat: ${tankConfig.alarmThresholdDays} dies

    HISTÒRIC D'APROVISIONAMENT (Compres):
    ${JSON.stringify(refills)}

    REGISTRE DIARI (Temperatura, Consum i LECTURES REALS):
    ${JSON.stringify(logs)}
    
    NOTA IMPORTANT SOBRE DADES:
    1. Si al registre diari hi ha un camp 'tankLevelReading', aquest valor és una LECTURA EXACTA del mesurador i preval sobre qualsevol estimació.
    2. El preu actual de referència del gasoil de calefacció és **0.992 €/litre**. Utilitza aquest preu com a base per als càlculs de cost futurs, tret que trobis una dada més recent i fiable via cerca.

    TASQUES CRÍTIQUES:
    1. Utilitza l'eina Google Search per obtenir la previsió meteorològica detallada dels propers 14 dies per a Sant Hipòlit de Voltregà (Osona).
    2. Analitza la relació entre la temperatura exterior i el consum.
    3. Calcula la data exacta d'esgotament del combustible basant-te en el nivell actual real i la previsió de fred.
    4. Calcula el cost estimat per omplir el tanc en tres escenaris:
       - 500 Litres
       - 1000 Litres
       - 1500 Litres
    5. Genera una recomanació estratègica de compra.

    Retorna JSON estricte segons l'esquema definit.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedRunOutDate: { type: Type.STRING, description: "Date format YYYY-MM-DD" },
            daysRemaining: { type: Type.NUMBER },
            refillCosts: {
              type: Type.OBJECT,
              properties: {
                cost500: { type: Type.NUMBER },
                cost1000: { type: Type.NUMBER },
                cost1500: { type: Type.NUMBER }
              },
              required: ["cost500", "cost1000", "cost1500"]
            },
            currentMarketPrice: { type: Type.NUMBER, description: "Price per liter in EUR" },
            weatherSummary: { type: Type.STRING, description: "Summary of 14-day forecast for Sant Hipòlit and its impact on calculation" },
            recommendation: { type: Type.STRING, description: "Specific advice including alarm status if critical" },
            consumptionTrend: { type: Type.STRING, enum: ["stable", "increasing", "decreasing"] }
          },
          required: ["predictedRunOutDate", "daysRemaining", "refillCosts", "currentMarketPrice", "weatherSummary", "recommendation", "consumptionTrend"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};