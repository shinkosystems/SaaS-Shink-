
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

// --- FERRAMENTAS DO GURU (FUNCTION DECLARATIONS) ---

const controlTools: FunctionDeclaration[] = [
    {
        name: "create_task",
        description: "Cria uma nova tarefa técnica no sistema.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título claro da tarefa." },
                description: { type: Type.STRING, description: "Detalhes técnicos da tarefa." },
                projectId: { type: Type.NUMBER, description: "ID numérico do projeto vinculado (se houver)." },
                hours: { type: Type.NUMBER, description: "Estimativa de horas (padrão 2)." }
            },
            required: ["title"]
        }
    },
    {
        name: "create_project",
        description: "Cria um novo projeto de inovação no portfólio.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Nome do projeto." },
                description: { type: Type.STRING, description: "Contexto estratégico e dor resolvida." },
                archetype: { type: Type.STRING, description: "Tipo: SaaS, Plataforma, Interno, etc." }
            },
            required: ["title", "description"]
        }
    },
    {
        name: "navigate_to",
        description: "Redireciona o usuário para uma tela específica do sistema.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                view: { 
                    type: Type.STRING, 
                    description: "Destino: dashboard, kanban, financial, crm, projects, settings." 
                }
            },
            required: ["view"]
        }
    },
    {
        name: "get_project_details",
        description: "Busca informações detalhadas sobre um projeto específico pelo nome ou ID.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "Nome ou parte do nome do projeto." }
            },
            required: ["query"]
        }
    }
];

// --- EXPORTED FUNCTIONS ---

export const askGuru = async (question: string, context: string): Promise<{ text: string, functionCalls?: any[] }> => {
    const ai = getAiClient();
    if (!ai) return { text: "Guru offline (API Key ausente)." };

    const systemInstruction = `
        Você é o Shinkō Guru, o assistente operacional (COO/CTO Virtual) de um framework de inovação industrial.
        
        CONTEXTO ATUAL DO SISTEMA:
        ${context}

        HABILIDADES:
        1. Executar ações: criar tarefas, projetos ou navegar entre telas.
        2. Analisar dados: responder perguntas sobre o portfólio, scores PRIO-6 e TADS.
        3. Consultoria: sugerir melhorias em descrições de projetos ou priorização.

        DIRETRIZES:
        1. Seja ultra-eficiente, técnico e direto.
        2. Se o usuário perguntar algo ("Quanto custa...", "Qual o status...", "Como faço..."), responda usando os dados do contexto.
        3. Se o usuário der uma ordem ("Crie...", "Me leve para...", "Abra..."), use as ferramentas de function calling.
        4. Sempre use Markdown para formatar listas ou tabelas nas respostas de texto.
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: question,
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: controlTools }]
            }
        }));

        return {
            text: response.text || "Entendido. Processando sua solicitação...",
            functionCalls: response.functionCalls
        };
    } catch (e) {
        console.error("Guru Error:", e);
        return { text: "Tive um problema ao processar seu comando. Pode repetir de outra forma?" };
    }
};

export const analyzeOpportunity = async (title: string, description: string, orgType?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "⚠️ Erro: API Key não encontrada.";
  const prompt = `Analise a oportunidade: ${title} - ${description}. Seja direto e técnico em relação ao setor ${orgType}.`;
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return response.text || "Análise indisponível.";
  } catch (error) { return "Erro ao conectar com a IA."; }
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise o portfólio: ${contextSummary}. Retorne JSON {alertTitle, alertLevel, insightText, actions}.`,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateSubtasksForTask = async (taskTitle: string, context: string, orgType?: string, teamMembers?: any[]): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai) return [];
    const prompt = `Crie checklist para: ${taskTitle}. Contexto: ${context}. Membros disponíveis: ${JSON.stringify(teamMembers)}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
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
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateBpmn = async (title: string, description: string, archetype: string, docsContext?: string, orgType?: string, availableRoles?: any[]): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;
    const prompt = `Gere fluxo WBS para ${title} (${archetype}). Contexto: ${description}. Retorne JSON com lanes e nodes. Use os cargos: ${JSON.stringify(availableRoles)}`;
    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

/**
 * AI Smart Schedule Engine
 * Analisa carga, GUT e responsáveis para otimizar o cronograma da organização.
 */
export const optimizeSchedule = async (tasks: any[], availableTeam: any[], globalCapacity: number = 8): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai || tasks.length === 0) return [];

    const systemInstruction = `
        Você é o Arquiteto de Operações Shinkō. Sua missão é otimizar o cronograma técnico da organização.
        
        CRITÉRIOS DE OTIMIZAÇÃO:
        1. Priorize tarefas com maior Score GUT (Gravidade x Urgência x Tendência).
        2. Balanceie a carga de trabalho entre os membros disponíveis: ${JSON.stringify(availableTeam)}.
        3. Cada membro tem capacidade de ${globalCapacity} horas por dia útil.
        4. Defina datainicio e datafim (YYYY-MM-DD) respeitando a duração de cada tarefa.
        5. Se uma tarefa já tem responsável, tente mantê-lo a menos que haja sobrecarga crítica (>150% capacidade).
        6. Projete as entregas para começarem a partir de hoje (${new Date().toISOString().split('T')[0]}).

        SAÍDA:
        Retorne um array JSON de objetos contendo apenas: { id: number, startDate: string, dueDate: string, assigneeId: string }.
    `;

    const prompt = `
        TASKS PARA OTIMIZAR:
        ${JSON.stringify(tasks.map(t => ({
            id: t.id,
            titulo: t.titulo,
            duracaohoras: t.duracaohoras || 2,
            gut_score: (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1),
            responsavel_atual: t.responsavel
        })))}
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
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

        const result = JSON.parse(response.text || "[]");
        return Array.isArray(result) ? result : [];
    } catch (e) {
        console.error("AI Scheduling Error:", e);
        return [];
    }
};
