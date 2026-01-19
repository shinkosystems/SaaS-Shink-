
import { GoogleGenAI, Type, GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { Opportunity, Archetype } from "../types";

// Proteção para evitar falha no constructor se a chave estiver indefinida no load
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'MISSING_KEY' });

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

/**
 * IA Document Reader: Extrai contexto estratégico de PDFs seguindo o Framework Shinkō
 */
export const extractProjectDetailsFromPdf = async (pdfBase64: string): Promise<any> => {
    const systemInstruction = `
        Você é o Shinkō Document Intelligence. 
        Sua missão é ler um documento de escopo/projeto (PDF) e extrair os fundamentos estratégicos para o Framework Shinkō.
        
        REGRAS DO FRAMEWORK:
        - Matriz RDE: Priorize entre Velocidade, Viabilidade e Receita.
        - Crivo TADS: Escalabilidade, Integração, Dor Real, Recorrência e Velocidade de MVP.
        - Arquétipos: SaaS de Entrada, SaaS Plataforma, Serviço Tecnológico ou Interno/Marketing.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
                    { text: "Analise este documento e extraia o título, descrição, arquétipo (SaaS de Entrada, SaaS Plataforma, Serviço Tecnológico ou Interno / Marketing), intensidade (1 a 4) e um resumo dos requisitos técnicos." }
                ]
            },
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        archetype: { type: Type.STRING },
                        intensity: { type: Type.NUMBER },
                        suggestedSummary: { type: Type.STRING }
                    }
                }
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("PDF Analysis Error:", e);
        return null;
    }
};

// --- FERRAMENTAS DO GURU ---

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
    }
];

export const askGuru = async (question: string, context: string): Promise<{ text: string, functionCalls?: any[] }> => {
    const systemInstruction = `
        Você é o Shinkō Guru, assistente operacional de elite (COO/CTO Virtual).
        PODERES: Você pode criar tarefas e projetos via ferramentas.
        CONTEXTO ATUAL: ${context}
        COMPORTAMENTO: Seja direto, técnico e aja como um braço direito do gestor. Responda em Português.
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

export const optimizeSchedule = async (tasks: any[], availableTeam: any[]): Promise<any[]> => {
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

export const analyzeOpportunity = async (title: string, description: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise viabilidade estratégica do ativo "${title}" com base na missão: "${description}". Dê um veredito direto de 2 frases.`,
    });
    return response.text || "Sem análise.";
  } catch (error) { return "Erro IA."; }
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise o contexto operacional e retorne um JSON com alertas e insights. Contexto: ${contextSummary}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        alertTitle: { type: Type.STRING },
                        alertLevel: { type: Type.STRING, enum: ['critical', 'warning', 'info'] },
                        insightText: { type: Type.STRING },
                        actions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    actionId: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const generateBpmn = async (
    title: string, 
    description: string, 
    archetype: string, 
    docsContext?: string, 
    customPrompt?: string, 
    roles?: any[]
): Promise<any> => {
    const systemInstruction = `
        Você é o Arquiteto de Processos Shinkō. Projete um fluxo técnico rigoroso em 5 etapas: 1. Modelagem, 2. Interface, 3. Lógica, 4. Performance, 5. Lançamento.
    `;

    let prompt = `PROJETO: ${title} | ARQUÉTIPO: ${archetype} | MISSÃO: ${description} | PDF CONTEXTO: ${docsContext || 'Nenhum'}`;
    
    if (customPrompt) prompt += ` | ORIENTAÇÃO ADICIONAL: ${customPrompt}`;
    if (roles && roles.length > 0) prompt += ` | TIME DISPONÍVEL (CARGOS): ${roles.map(r => r.nome).join(', ')}`;

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
    } catch (e) { return null; }
};
