
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

// --- DICIONÁRIO DE FERRAMENTAS CRUD DO GURU ---

const controlTools: FunctionDeclaration[] = [
    {
        name: "manage_task",
        description: "Executa operações de CRUD em tarefas (Criar, Atualizar, Deletar).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["create", "update", "delete"], description: "Ação a ser realizada." },
                id: { type: Type.NUMBER, description: "ID da tarefa (obrigatório para update/delete)." },
                title: { type: Type.STRING, description: "Título da tarefa." },
                status: { type: Type.STRING, enum: ["todo", "doing", "review", "approval", "done"], description: "Estágio do Kanban." },
                projectId: { type: Type.NUMBER, description: "ID do projeto vinculado." },
                description: { type: Type.STRING, description: "Detalhes técnicos." },
                hours: { type: Type.NUMBER, description: "Estimativa de esforço." }
            },
            required: ["action"]
        }
    },
    {
        name: "manage_value_chain",
        description: "Cria um novo processo/atividade no Fluxo de Valor (Cadeia de Valor).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Nome do processo." },
                category: { 
                    type: Type.STRING, 
                    enum: ['Apoio-Adm', 'Apoio-Gestão', 'Primária-Modelagem', 'Primária-Interface', 'Primária-Lógica', 'Primária-Marketing'],
                    description: "Pilar do Framework Shinkō."
                },
                weight: { type: Type.NUMBER, description: "Peso para cálculo de rateio (1 a 10)." },
                projectId: { type: Type.NUMBER, description: "ID do projeto vinculado." },
                evidenceUrl: { type: Type.STRING, description: "Link opcional para evidência." }
            },
            required: ["title", "category", "projectId"]
        }
    },
    {
        name: "manage_project",
        description: "Cria ou atualiza projetos estratégicos no portfólio.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["create", "update"], description: "Ação a ser realizada." },
                id: { type: Type.NUMBER, description: "ID do projeto (apenas para update)." },
                title: { type: Type.STRING, description: "Nome do projeto." },
                description: { type: Type.STRING, description: "Contexto estratégico." },
                rde: { type: Type.STRING, enum: ["Quente", "Morno", "Frio"], description: "Status na Matriz RDE." },
                archetype: { type: Type.STRING, description: "Arquétipo (SaaS, Plataforma, etc)." }
            },
            required: ["action"]
        }
    },
    {
        name: "add_financial_record",
        description: "Registra uma nova transação financeira (Entrada/Saída).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING, description: "Descrição do lançamento." },
                amount: { type: Type.NUMBER, description: "Valor monetário." },
                type: { type: Type.STRING, enum: ["inflow", "outflow"], description: "Natureza da transação." },
                category: { type: Type.STRING, description: "Categoria (Vendas, Operacional, etc)." }
            },
            required: ["description", "amount", "type"]
        }
    },
    {
        name: "manage_crm_lead",
        description: "Cria uma nova oportunidade de venda no CRM.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título da negociação." },
                value: { type: Type.NUMBER, description: "Valor estimado do contrato." },
                company: { type: Type.STRING, description: "Nome da empresa lead." },
                contact: { type: Type.STRING, description: "Nome do contato principal." }
            },
            required: ["title", "value", "company"]
        }
    },
    {
        name: "navigate_to",
        description: "Muda a visualização do usuário para outra tela do sistema.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                view: { 
                    type: Type.STRING, 
                    enum: ["dashboard", "projects", "kanban", "calendar", "crm", "financial", "intelligence", "settings", "value-chain"],
                    description: "Destino da navegação." 
                }
            },
            required: ["view"]
        }
    }
];

export const askGuru = async (question: string, context: string): Promise<{ text: string, functionCalls?: any[] }> => {
    const ai = getAiClient();
    if (!ai) return { text: "Guru offline (Verifique sua API Key)." };

    const systemInstruction = `
        Você é o Shinkō Guru, assistente operacional de elite (COO/CTO Virtual).
        
        PODERES: Você pode criar tarefas, projetos, processos na cadeia de valor, leads de CRM e registros financeiros via ferramentas.
        COMPORTAMENTO: Seja direto, técnico e aja como um braço direito do gestor.
        CONTEXTO ATUAL: ${context}

        REGRAS DE OURO:
        1. Se o usuário pedir algo que você pode fazer (ex: 'adiciona um processo no fluxo de valor'), SEMPRE use a ferramenta correspondente.
        2. Responda em Português do Brasil de forma concisa.
        3. Use Markdown para clareza.
    `;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: question,
            config: { systemInstruction, tools: [{ functionDeclarations: controlTools }] }
        }));

        return {
            text: response.text || "Entendido. Processando sua solicitação operacional.",
            functionCalls: response.functionCalls
        };
    } catch (e: any) {
        return { text: `Erro no Guru: ${e.message}` };
    }
};

/**
 * AI Smart Schedule Engine
 */
export const optimizeSchedule = async (tasks: any[], availableTeam: any[], globalCapacity: number = 8): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai || tasks.length === 0) return [];

    const systemInstruction = `Você é o Engenheiro de Operações Shinkō. Sua missão é otimizar o cronograma de execução técnica.`;

    const prompt = `OTIMIZAR O SEGUINTE PIPELINE DE TAREFAS: ${JSON.stringify(tasks.map(t => ({
        id: t.id,
        titulo: t.titulo,
        duracaohoras: t.duracaohoras || 2
    })))}`;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
                        }
                    }
                }
            }
        }));

        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const analyzeOpportunity = async (title: string, description: string, orgType?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key ausente.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise viabilidade estratégica: ${title} - ${description}.`,
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
            contents: `Analise contexto e retorne JSON {alertTitle, alertLevel, insightText, actions: [{label, actionId}]}. Contexto: ${contextSummary}`,
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
            model: 'gemini-3-flash-preview',
            contents: `Checklist técnico para: ${taskTitle}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateBpmn = async (title: string, description: string, archetype: string, docsContext?: string, orgType?: string, availableRoles?: any[]): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;

    const systemInstruction = `
        Você é o Arquiteto de Processos Shinkō. 
        Converta a descrição do projeto em um fluxo técnico rigoroso de 5 etapas: 
        1. Modelagem, 2. Interface, 3. Lógica, 4. Performance, 5. Lançamento.
        Cada etapa deve conter de 3 a 5 tarefas específicas com estimativa de horas realistas.
        RETORNE O JSON EXATAMENTE NO FORMATO: {"nodes": [{"id": "string", "label": "string", "checklist": [{"text": "string", "estimatedHours": number, "description": "string"}]}]}
    `;

    const prompt = `PROJETO: ${title}. CONTEXTO: ${description}. ARQUÉTIPO: ${archetype}. DOCS: ${docsContext || 'Nenhum'}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    label: { type: Type.STRING },
                                    checklist: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                text: { type: Type.STRING },
                                                estimatedHours: { type: Type.NUMBER },
                                                description: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        return JSON.parse(response.text || "{}");
    } catch (e) { 
        console.error("BPMN Generation Error:", e);
        return null; 
    }
};
