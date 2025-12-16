
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Opportunity } from "../types";

const getApiKey = (): string | undefined => {
  let key: string | undefined = undefined;

  // 1. Check Vite Import Meta (Preferred for Vercel/Vite)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
        // @ts-ignore
        else if (import.meta.env.API_KEY) key = import.meta.env.API_KEY;
    }
  } catch(e) {}

  // 2. Check Standard Process Env (Fallback)
  if (!key && typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_API_KEY) key = process.env.VITE_API_KEY;
    else if (process.env.API_KEY) key = process.env.API_KEY;
    else if (process.env.NEXT_PUBLIC_API_KEY) key = process.env.NEXT_PUBLIC_API_KEY;
    else if (process.env.REACT_APP_API_KEY) key = process.env.REACT_APP_API_KEY;
  }

  if (!key) {
      console.warn("⚠️ Gemini Service: API Key is MISSING.");
  }

  return key;
};

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- RETRY LOGIC FOR RPC ERRORS ---
async function retryOperation<T>(operation: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        // Enhanced Error Message Extraction for nested Google objects
        let msg = "";
        if (typeof error === "string") msg = error;
        else if (error?.message) msg = error.message;
        else if (error?.error?.message) msg = error.error.message; // Handling nested error object from Google SDK
        else {
             try { msg = JSON.stringify(error); } catch(e) { msg = "Unknown error"; }
        }
        
        // Check for specific Google GenAI transient errors (500, 503, RPC failures, XHR errors)
        const isTransient = 
            msg.includes('500') || 
            msg.includes('503') || 
            msg.includes('xhr error') || 
            msg.includes('fetch failed') ||
            msg.includes('error code: 6') || // Specific RPC error code
            msg.includes('Load failed') ||
            msg.includes('NetworkError') ||
            msg.includes('Failed to fetch');

        if (retries > 0 && isTransient) {
            console.warn(`Gemini API Error (Retry ${retries} left): ${msg.substring(0, 100)}... Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Exponential backoff with jitter
            const nextDelay = delay * 2 + Math.random() * 500;
            return retryOperation(operation, retries - 1, nextDelay);
        }
        
        console.error("Gemini API Fatal Error:", error);
        throw error;
    }
}

// --- HELPERS ---

const cleanJson = (text: string) => {
  if (!text) return "";
  let cleaned = text.replace(/```json\n?|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return cleaned;

  const start = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  const end = cleaned.lastIndexOf(start === firstBrace ? '}' : ']');
  
  if (end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
};

// --- EXPORTED FUNCTIONS ---

export const analyzeOpportunity = async (title: string, description: string, orgType?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "⚠️ Erro de Configuração: API Key não encontrada.";

  const industryContext = orgType ? `Setor: ${orgType}.` : "Setor: Startup de Tecnologia.";
  const prompt = `
    Atue como um consultor sênior especialista em ${industryContext}.
    Analise a seguinte oportunidade: ${title} - ${description}
    Seja direto, crítico e use terminologia adequada ao setor de ${orgType || 'Tecnologia'}.
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));
    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erro ao conectar com a IA. Tente novamente.";
  }
};

export const suggestEvidence = async (title: string, description: string, orgType?: string): Promise<{clientsAsk: string[], clientsSuffer: string[]} | null> => {
    const ai = getAiClient();
    if (!ai) return null;
    
    const industryContext = orgType ? `Contexto: Empresa do setor de ${orgType}.` : "";
    const prompt = `
      Atue como um Especialista de Produto/Negócios.
      Baseado no projeto "${title}" e na descrição: "${description}".
      ${industryContext}
      Gere duas listas de evidências para validar essa demanda: clientsAsk (o que pedem) e clientsSuffer (o que sofrem).
      Máximo 3 itens por lista.
    `;

    try {
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    clientsAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
                    clientsSuffer: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
      }));
      
      if (response.text) return JSON.parse(response.text);
      return null;
    } catch (error) {
      console.error("Erro Evidence AI:", error);
      return null;
    }
};

export const generateSubtasksForTask = async (taskTitle: string, context: string, orgType?: string): Promise<{title: string, hours: number}[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    const role = orgType && orgType !== 'Startup' ? `Gerente de Projetos de ${orgType}` : "Project Manager Técnico Sênior";
    const prompt = `
      Atue como um ${role}.
      Crie um checklist técnico detalhado para a tarefa: "${taskTitle}".
      Contexto do Projeto: ${context}.
      Estime o tempo em horas (números inteiros) para cada item.
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            hours: { type: Type.NUMBER }
                        }
                    }
                }
            }
        }));
        
        if (response.text) return JSON.parse(response.text);
        return [];
    } catch (error) {
        console.error("Erro IA Subtasks:", error);
        return [];
    }
};

export const generateBpmn = async (
    title: string, 
    description: string, 
    archetype: string, 
    docsContext?: string, 
    orgType?: string,
    availableRoles?: {id: number, nome: string}[]
): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    
    const industryContext = orgType ? `Setor: ${orgType}. Use terminologia técnica correta.` : "";
    const today = new Date().toISOString().split('T')[0];
    
    let roleInstructions = "";
    if (availableRoles && availableRoles.length > 0) {
        const rolesString = availableRoles.map(r => `ID ${r.id}: ${r.nome}`).join(", ");
        roleInstructions = `
        Use 'roleId' numérico para atribuir responsáveis.
        Cargos disponíveis: [${rolesString}].
        `;
    }

    const prompt = `
    Atue como um Gerente de Projetos Sênior. 
    Crie um fluxo de trabalho estruturado (WBS) para: "${title}" (${archetype}). 
    ${industryContext}
    
    Regras:
    1. Início: HOJE (${today}).
    2. Gere nós (fases) e tarefas (checklist) lógicas.
    3. 'estimatedHours' deve ser inteiro.
    ${roleInstructions}

    Retorne JSON estrito com esta estrutura:
    {
        lanes: [{id, label}], 
        nodes: [{
            id, label, laneId, type, 
            checklist: [{
                text, description, estimatedHours, roleId, 
                startDate, dueDate, gut: {g,u,t}
            }]
        }]
    }`;
    
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        }));
        
        const text = cleanJson(response.text || "");
        if (!text) {
            console.warn("Resposta vazia da IA detectada.");
            throw new Error("IA retornou texto vazio");
        }
        
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, text);
            throw new Error("Falha ao processar resposta da IA");
        }
    } catch (error: any) {
        console.error("Gemini BPMN Critical Error:", error);
        return null;
    }
};

// --- RE-EXPORTING UNTOUCHED HELPERS FOR COMPATIBILITY ---
export const extractPdfContext = async (base64Pdf: string): Promise<string> => {
    // Basic implementation without retry for now as it's heavy
    const ai = getAiClient();
    if (!ai) return "Erro API Key";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: 'application/pdf', data: base64Pdf } }, { text: "Resuma." }] }
        });
        return response.text || "Erro PDF";
    } catch (e) { return "Erro processamento"; }
};

export const optimizeSchedule = async (tasks: any[], availableDevelopers: any[]): Promise<any[]> => {
    // Placeholder to maintain export interface. Logic moved to retry block if needed.
    return []; 
};

export const askGuru = async (question: string, context: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Guru offline.";
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Contexto: ${context}. Pergunta: ${question}. Responda como COO.`
        }));
        return response.text || "Sem resposta.";
    } catch (e) { return "Guru indisponível no momento."; }
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analise como COO: ${contextSummary}. Retorne JSON {alertTitle, alertLevel, insightText, actions}.`,
            config: { responseMimeType: 'application/json' }
        }));
        return JSON.parse(cleanJson(response.text || "{}"));
    } catch (e) { return null; }
};
