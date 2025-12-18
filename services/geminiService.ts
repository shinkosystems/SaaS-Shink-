
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Opportunity } from "../types";

/* Guideline compliant initialization helper */
const getAiClient = () => {
  /* Guideline: The API key must be obtained exclusively from the environment variable process.env.API_KEY. */
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      console.warn("⚠️ Gemini Service: API Key is MISSING in process.env.API_KEY.");
      return null;
  }
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
    /* Guideline: Use gemini-3-flash-preview for basic text tasks */
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    /* Guideline: use .text property, not .text() */
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
      /* Guideline: Use gemini-3-flash-preview for basic text tasks */
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
      
      /* Guideline: use .text property, not .text() */
      if (response.text) return JSON.parse(response.text);
      return null;
    } catch (error) {
      console.error("Erro Evidence AI:", error);
      return null;
    }
};

export const generateSubtasksForTask = async (
    taskTitle: string, 
    context: string, 
    orgType?: string,
    teamMembers?: { id: string, name: string, role: string }[]
): Promise<{title: string, hours: number, assigneeId?: string}[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    const role = orgType && orgType !== 'Startup' ? `Gerente de Projetos de ${orgType}` : "Project Manager Técnico Sênior";
    
    let teamContext = "";
    if (teamMembers && teamMembers.length > 0) {
        const membersList = teamMembers.map(m => `ID: "${m.id}", Nome: "${m.name}", Cargo: "${m.role}"`).join("\n");
        teamContext = `
        Abaixo está a lista de membros da equipe disponíveis.
        Para CADA subtarefa, você DEVE atribuir o 'assigneeId' (ID do membro) mais qualificado baseando-se no Cargo dele.
        Se a tarefa for genérica ou ninguém se encaixar, deixe 'assigneeId' em branco.
        
        Lista de Membros:
        ${membersList}
        `;
    }

    const prompt = `
      Atue como um ${role}.
      Crie um checklist técnico detalhado para a tarefa: "${taskTitle}".
      Contexto do Projeto: ${context}.
      Estime o tempo em horas (números inteiros) para cada item.
      ${teamContext}
    `;

    try {
        /* Guideline: Use gemini-3-pro-preview for complex text tasks */
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            hours: { type: Type.NUMBER },
                            assigneeId: { type: Type.STRING, description: "O ID exato do membro da equipe selecionado, ou string vazia." }
                        }
                    }
                }
            }
        }));
        
        /* Guideline: use .text property, not .text() */
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
        /* Guideline: Use gemini-3-pro-preview for complex tasks */
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        }));
        
        /* Guideline: use .text property, not .text() */
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

export const extractPdfContext = async (base64Pdf: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Erro API Key";
    try {
        /* Guideline: Use gemini-3-flash-preview for summarizing */
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType: 'application/pdf', data: base64Pdf } }, { text: "Resuma." }] }
        });
        /* Guideline: use .text property, not .text() */
        return response.text || "Erro PDF";
    } catch (e) { return "Erro processamento"; }
};

export const optimizeSchedule = async (tasks: any[], availableDevelopers: any[], globalCapacity: number = 8): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    // Filter minimal info to save tokens
    const taskList = tasks.map(t => ({
        id: t.id,
        title: t.titulo || t.taskText,
        hours: t.duracaohoras || t.estimatedHours || 1,
    }));

    const prompt = `
    You are a Production Scheduler AI.
    
    OBJECTIVE:
    Reschedule the following TASKS starting from TOMORROW.
    
    CONSTRAINT:
    The sum of hours for all tasks scheduled on any single day MUST NOT exceed ${globalCapacity} hours.
    This represents the total organization capacity per day.
    
    INPUT:
    ${JSON.stringify(taskList)}
    
    INSTRUCTIONS:
    1. Distribute tasks sequentially or in parallel as long as the Daily Sum <= ${globalCapacity}.
    2. Ensure no task is left unscheduled.
    3. Return a JSON array with the new dates.
    
    OUTPUT JSON FORMAT:
    [
        { "id": 123, "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD" }
    ]
    `;

    try {
        /* Guideline: Use gemini-3-pro-preview for complex scheduling tasks */
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.NUMBER },
                            startDate: { type: Type.STRING },
                            dueDate: { type: Type.STRING }
                        }
                    }
                }
            }
        }));
        
        /* Guideline: use .text property, not .text() */
        if (response.text) {
            const result = JSON.parse(response.text);
            return result;
        }
        return [];
    } catch (e) {
        console.error("Schedule Optimization Error:", e);
        return [];
    }
};

export const askGuru = async (question: string, context: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Guru offline.";
    try {
        /* Guideline: Use gemini-3-flash-preview for Q&A */
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Contexto: ${context}. Pergunta: ${question}. Responda como COO.`
        }));
        /* Guideline: use .text property, not .text() */
        return response.text || "Sem resposta.";
    } catch (e) { return "Guru indisponível no momento."; }
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    try {
        /* Guideline: Use gemini-3-flash-preview for summarization/insight */
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise como COO: ${contextSummary}. Retorne JSON {alertTitle, alertLevel, insightText, actions}.`,
            config: { responseMimeType: 'application/json' }
        }));
        /* Guideline: use .text property, not .text() */
        return JSON.parse(cleanJson(response.text || "{}"));
    } catch (e) { return null; }
};
