
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

    const systemInstruction = `Você é o Engenheiro de Operações Shinkō. 
    Sua missão é otimizar o cronograma de execução técnica, fazendo o balanceamento de carga da equipe.
    
    REGRAS DE BALANCEAMENTO:
    1. Priorize tarefas com maior score GUT (Gravidade x Urgência x Tendência).
    2. Respeite a capacidade de ${globalCapacity} horas por dia por pessoa.
    3. Distribua as tarefas de forma que ninguém fique sobrecarregado enquanto outros estão ociosos.
    4. Projete as datas de início (startDate) e fim (dueDate) em formato YYYY-MM-DD.
    5. Atribua as tarefas aos membros da equipe (assigneeId) que possuam o perfil adequado.
    
    EQUIPE DISPONÍVEL: ${JSON.stringify(availableTeam.map(m => ({ id: m.id, nome: m.nome, area: m.area })))}
    `;

    const prompt = `OTIMIZAR O SEGUINTE PIPELINE DE TAREFAS: ${JSON.stringify(tasks.map(t => ({
        id: t.id,
        titulo: t.titulo,
        duracaohoras: t.duracaohoras || 2,
        gut: (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1),
        responsavel_id_atual: t.responsavel
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
                            id: { type: Type.NUMBER, description: "O ID numérico original da tarefa" },
                            startDate: { type: Type.STRING, description: "Nova data de início YYYY-MM-DD" },
                            dueDate: { type: Type.STRING, description: "Nova data de término YYYY-MM-DD" },
                            assigneeId: { type: Type.STRING, description: "UUID do responsável ideal" }
                        },
                        required: ["id", "startDate", "dueDate", "assigneeId"]
                    }
                }
            }
        }));

        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("AI Smart Schedule Error:", e);
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
            contents: `Analise portfólio e sugira ações REAIS (ex: 'Mapear Iniciativa', 'Verificar Caixa', 'Otimizar Kanban'). Contexto: ${contextSummary}. Retorne JSON {alertTitle, alertLevel, insightText, actions: [{label, actionId}]}.`,
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

    const systemInstruction = `
        Você é o Arquiteto de Processos Shinkō. 
        Sua missão é converter uma estratégia em um fluxo técnico de execução (WBS - Work Breakdown Structure).
        Crie de 4 a 6 colunas (nodes) lógicas para o arquétipo ${archetype}.
        Cada coluna deve ter uma lista de tarefas (checklist) com estimativas de horas.
    `;

    const prompt = `
        PROJETO: ${title}
        MISSÃO: ${description}
        ARQUÉTIPO: ${archetype}
        EQUIPE DISPONÍVEL (CARGOS): ${JSON.stringify(availableRoles)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
                                    label: { type: Type.STRING, description: "Nome da etapa/coluna" },
                                    checklist: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                text: { type: Type.STRING, description: "Título da tarefa" },
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
