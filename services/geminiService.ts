
import { GoogleGenAI, Type, GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { Opportunity } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        let msg = error?.message || "";
        const isTransient = msg.includes('500') || msg.includes('503') || msg.includes('fetch failed');
        if (retries > 0 && isTransient) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

// --- FERRAMENTAS DO GURU ---

const controlTools: FunctionDeclaration[] = [
    {
        name: "create_task",
        description: "Cria uma nova tarefa técnica no sistema.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título claro da tarefa." },
                description: { type: Type.STRING, description: "Detalhes técnicos da tarefa." },
                projectId: { type: Type.NUMBER, description: "ID numérico do projeto vinculado." },
                hours: { type: Type.NUMBER, description: "Estimativa de horas." }
            },
            required: ["title"]
        }
    },
    {
        name: "navigate_to",
        description: "Redireciona o usuário para uma tela específica.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                view: { type: Type.STRING, description: "dashboard, kanban, projects, settings." }
            },
            required: ["view"]
        }
    }
];

export const askGuru = async (question: string, context: string): Promise<{ text: string, functionCalls?: any[] }> => {
    const ai = getAiClient();
    if (!ai) return { text: "Guru offline (Verifique sua API Key)." };

    const systemInstruction = `Você é o Shinkō Guru, assistente de inovação. Use o contexto: ${context}. Responda em Português do Brasil de forma técnica e direta.`;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: question,
            config: { systemInstruction, tools: [{ functionDeclarations: controlTools }] }
        }));

        return {
            text: response.text || "Comando processado.",
            functionCalls: response.functionCalls
        };
    } catch (e: any) {
        return { text: `Erro no Guru: ${e.message}` };
    }
};

/**
 * AI Smart Schedule Engine
 * Reordena tarefas com base em GUT, capacidade e balanceamento de time.
 */
export const optimizeSchedule = async (tasks: any[], availableTeam: any[], globalCapacity: number = 8): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai || tasks.length === 0) return [];

    const systemInstruction = `
        Você é o Arquiteto de Operações Shinkō. Otimize o cronograma técnico.
        1. Priorize tarefas com maior Score GUT (Gravidade x Urgência x Tendência).
        2. Balanceie carga entre: ${JSON.stringify(availableTeam)}.
        3. Capacidade: ${globalCapacity} horas/dia por membro.
        4. Data Início: hoje (${new Date().toISOString().split('T')[0]}).
        Retorne JSON: { id: number, startDate: string, dueDate: string, assigneeId: string }[]
    `;

    const prompt = `OTIMIZAR: ${JSON.stringify(tasks.map(t => ({
        id: t.id,
        titulo: t.titulo,
        duracaohoras: t.duracaohoras || 2,
        gut: (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1),
        current_assignee: t.responsavel
    })))}`;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.NUMBER },
                            startDate: { type: Type.STRING },
                            dueDate: { type: Type.STRING },
                            assigneeId: { type: Type.STRING }
                        },
                        required: ["id", "startDate", "dueDate", "assigneeId"]
                    }
                }
            }
        }));

        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Scheduling Error:", e);
        return [];
    }
};

export const analyzeOpportunity = async (title: string, description: string, orgType?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key ausente.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise: ${title} - ${description}. Setor: ${orgType}.`,
    });
    return response.text || "Sem análise.";
  } catch (error) { return "Erro IA."; }
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise portfólio: ${contextSummary}. Retorne JSON {alertTitle, alertLevel, insightText, actions}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateSubtasksForTask = async (taskTitle: string, context: string, orgType?: string, teamMembers?: any[]): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai) return [];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Checklist para: ${taskTitle}. Membros: ${JSON.stringify(teamMembers)}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            hours: { type: Type.NUMBER },
                            assigneeId: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateBpmn = async (title: string, description: string, archetype: string, docsContext?: string, orgType?: string, availableRoles?: any[]): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `WBS para ${title}. Use: ${JSON.stringify(availableRoles)}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};
