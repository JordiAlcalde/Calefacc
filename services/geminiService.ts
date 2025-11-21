
import { GoogleGenAI } from "@google/genai";
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

    Retorna un JSON vàlid (sense blocs markdown) amb aquesta estructura exacta:
    {
      "predictedRunOutDate": "YYYY-MM-DD",
      "daysRemaining": 0,
      "refillCosts": { "cost500": 0, "cost1000": 0, "cost1500": 0 },
      "currentMarketPrice": 0,
      "weatherSummary": "resum...",
      "recommendation": "consell...",
      "consumptionTrend": "stable" | "increasing" | "decreasing"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;

    const result = JSON.parse(jsonStr) as AnalysisResult;

    // Extract Google Search grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      result.sources = chunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web)
        .map((web: any) => ({ uri: web.uri, title: web.title }));
    }

    return result;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
