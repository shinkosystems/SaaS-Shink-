
import { GoogleGenAI, Type } from "@google/genai";
import { Opportunity } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- CONFIGURAÇÃO DE TEMPO SHINKŌ ---

// Feriados Nacionais Fixos (Dia-Mês)
const FIXED_HOLIDAYS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
];

// Feriados Móveis
const MOBILE_HOLIDAYS = [
  '2025-03-03', '2025-03-04', '2025-04-18', '2025-06-19',
  '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04',
  '2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27',
  '2028-02-28', '2028-02-29', '2028-04-14', '2028-06-15',
  '2029-02-12', '2029-02-13', '2029-03-30', '2029-05-31',
  '2030-03-04', '2030-03-05', '2030-04-19', '2030-06-20'
];

// Formata data localmente para YYYY-MM-DD evitando shifts de UTC
const toLocalISOString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper para normalizar data para meio-dia
const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
};

// RIGID Business Day Check
const isBusinessDay = (date: Date): boolean => {
    const d = normalizeDate(date);
    const day = d.getDay();
    
    // 0 = Domingo, 6 = Sábado. Retorna false imediatamente.
    if (day === 0 || day === 6) return false;

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    const fixed = `${mm}-${dd}`;
    const full = `${yyyy}-${mm}-${dd}`;

    if (FIXED_HOLIDAYS.includes(fixed)) return false;
    if (MOBILE_HOLIDAYS.includes(full)) return false;

    return true;
};

// Helper to clean Markdown
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

export const analyzeOpportunity = async (title: string, description: string, orgType?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key not found.";

  const industryContext = orgType ? `Setor: ${orgType}.` : "Setor: Startup de Tecnologia.";

  const prompt = `
    Atue como um consultor sênior especialista em ${industryContext}.
    Analise a seguinte oportunidade: ${title} - ${description}
    
    Seja direto, crítico e use terminologia adequada ao setor de ${orgType || 'Tecnologia'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erro ao conectar com a IA.";
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

      Gere duas listas de evidências para validar essa demanda:
      1. "clientsAsk": O que o cliente pede explicitamente (Demandas Quentes). Ex: "Preciso de um relatório X", "Quero automatizar Y".
      2. "clientsSuffer": O que o cliente sofre/sente (Dores Latentes). Ex: "Perde 3 horas fazendo Z", "Sente insegurança com processo W".

      Seja específico, curto e direto. Máximo 3 itens por lista.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    clientsAsk: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    clientsSuffer: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['clientsAsk', 'clientsSuffer']
            }
        }
      });
      
      if (response.text) {
          return JSON.parse(response.text);
      }
      return null;
    } catch (error) {
      console.error("Erro Evidence AI:", error);
      return null;
    }
};

export const extractPdfContext = async (base64Pdf: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Erro: API Key não encontrada.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                    { text: "Resuma para BPMN." }
                ]
            }
        });
        return response.text || "Erro PDF.";
    } catch (error) {
        return "Erro ao processar PDF.";
    }
};

export const generateSubtasksForTask = async (taskTitle: string, context: string, orgType?: string): Promise<{title: string, hours: number}[]> => {
    const ai = getAiClient();
    if (!ai) {
        console.error("GenerateSubtasks: AI Client not initialized.");
        return [];
    }

    const role = orgType && orgType !== 'Startup' ? `Gerente de Projetos de ${orgType}` : "Project Manager Técnico Sênior";

    const prompt = `
      Atue como um ${role}.
      Crie um checklist técnico detalhado para a tarefa: "${taskTitle}".
      Contexto do Projeto: ${context}.
      
      Para cada item, estime o tempo em horas de forma REALISTA e VARIÁVEL baseada na complexidade típica do setor de ${orgType || 'Tecnologia'}.
    `;

    try {
        const response = await ai.models.generateContent({
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
                        },
                        required: ['title', 'hours']
                    }
                }
            }
        });
        
        if (response.text) {
            return JSON.parse(response.text);
        }
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
    
    const industryContext = orgType ? `Setor: ${orgType}. Use terminologia técnica correta para este setor.` : "";
    
    let roleInstructions = "";
    if (availableRoles && availableRoles.length > 0) {
        const rolesString = availableRoles.map(r => `${r.id}: ${r.nome}`).join(", ");
        roleInstructions = `
        IMPORTANTE: Para cada tarefa (checklist item), escolha o profissional mais adequado desta lista de cargos e atribua o ID no campo 'roleId'.
        Lista de Cargos (ID: Nome): ${rolesString}.
        Se nenhum se encaixar perfeitamente, tente o mais próximo.
        `;
    }

    const prompt = `Crie um fluxo de trabalho estruturado (similar a BPMN) em JSON para "${title}" (${archetype}). 
    ${industryContext}
    Contexto adicional: ${docsContext || "Nenhum"}. 
    ${roleInstructions}
    Structure required: {lanes: [{id, label}], nodes:[{id, label, laneId, type, checklist:[{text, estimatedHours, roleId: number}]}], edges:[{from, to}]}.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(cleanJson(response.text || ""));
    } catch (error) {
        console.error("Gemini Error:", error);
        return null;
    }
};

export const optimizeSchedule = async (tasks: any[], availableDevelopers: {id: string, nome: string}[] = []): Promise<any[]> => {
    // Fila de tarefas (Priorizadas por Valor/GUT)
    const queue = tasks.map(t => ({
        id: t.taskId,
        text: t.taskText,
        originalAssigneeId: t.assigneeId, // DB ID
        estimatedHours: Math.max(0.5, Number(t.estimatedHours) || 2),
        valueScore: t.gut ? (t.gut.g * t.gut.u * t.gut.t) : 1
    }));

    // Ordena por prioridade
    queue.sort((a, b) => b.valueScore - a.valueScore);

    const updates: any[] = [];
    const devState: Record<string, { nextFreeSlot: Date, dailyLoads: Record<string, number> }> = {};

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); 
    baseDate.setHours(12, 0, 0, 0);

    const devsPool = availableDevelopers.length > 0 
        ? availableDevelopers 
        : [{ id: 'unassigned', nome: 'Sem Dev' }];

    devsPool.forEach(dev => {
        let start = new Date(baseDate);
        while (!isBusinessDay(start)) {
            start.setDate(start.getDate() + 1);
            start = normalizeDate(start);
        }
        devState[dev.id] = { 
            nextFreeSlot: start, 
            dailyLoads: {} 
        };
    });

    const simulateAllocation = (devId: string, hoursNeeded: number): { finishDate: Date, startDate: Date } => {
        const state = devState[devId];
        let cursor = new Date(state.nextFreeSlot);
        let remaining = hoursNeeded;
        const tempLoads = { ...state.dailyLoads };
        let firstAllocationDate: Date | null = null;
        let safety = 0;
        while (remaining > 0.001 && safety < 1000) {
            while (!isBusinessDay(cursor)) {
                cursor.setDate(cursor.getDate() + 1);
                cursor = normalizeDate(cursor);
            }
            const dateKey = toLocalISOString(cursor);
            const currentLoad = tempLoads[dateKey] || 0;
            const capacity = 8 - currentLoad;

            if (capacity <= 0.001) {
                cursor.setDate(cursor.getDate() + 1);
                cursor = normalizeDate(cursor);
                while (!isBusinessDay(cursor)) {
                    cursor.setDate(cursor.getDate() + 1);
                    cursor = normalizeDate(cursor);
                }
                continue;
            }
            if (!firstAllocationDate) firstAllocationDate = new Date(cursor);
            const allocation = Math.min(remaining, capacity);
            remaining -= allocation;
            tempLoads[dateKey] = currentLoad + allocation;
            if (remaining > 0.001) {
                cursor.setDate(cursor.getDate() + 1);
                cursor = normalizeDate(cursor);
                while (!isBusinessDay(cursor)) {
                    cursor.setDate(cursor.getDate() + 1);
                    cursor = normalizeDate(cursor);
                }
            }
            safety++;
        }
        if (safety >= 1000) {
            const farFuture = new Date();
            farFuture.setFullYear(2050);
            return { finishDate: farFuture, startDate: farFuture };
        }
        return { finishDate: cursor, startDate: firstAllocationDate || cursor };
    };

    for (const task of queue) {
        let bestDevId = null;
        let bestFinishDate = new Date(8640000000000000);
        let bestStartDate = new Date();

        for (const dev of devsPool) {
            const simulation = simulateAllocation(dev.id, task.estimatedHours);
            if (simulation.finishDate < bestFinishDate) {
                bestFinishDate = simulation.finishDate;
                bestStartDate = simulation.startDate;
                bestDevId = dev.id;
            } else if (simulation.finishDate.getTime() === bestFinishDate.getTime()) {
                if (dev.id === task.originalAssigneeId) {
                    bestDevId = dev.id;
                }
            }
        }

        if (bestDevId) {
            const winnerState = devState[bestDevId];
            let remaining = task.estimatedHours;
            let cursor = new Date(bestStartDate);

            while (remaining > 0.001) {
                while (!isBusinessDay(cursor)) {
                    cursor.setDate(cursor.getDate() + 1);
                    cursor = normalizeDate(cursor);
                }
                const dateKey = toLocalISOString(cursor);
                const currentLoad = winnerState.dailyLoads[dateKey] || 0;
                const capacity = 8 - currentLoad;
                
                if (capacity <= 0.001) {
                    cursor.setDate(cursor.getDate() + 1);
                    cursor = normalizeDate(cursor);
                    while (!isBusinessDay(cursor)) {
                        cursor.setDate(cursor.getDate() + 1);
                        cursor = normalizeDate(cursor);
                    }
                    continue;
                }
                const allocation = Math.min(remaining, capacity);
                winnerState.dailyLoads[dateKey] = currentLoad + allocation;
                remaining -= allocation;
                if (remaining > 0.001) {
                    cursor.setDate(cursor.getDate() + 1);
                    cursor = normalizeDate(cursor);
                    while (!isBusinessDay(cursor)) {
                        cursor.setDate(cursor.getDate() + 1);
                        cursor = normalizeDate(cursor);
                    }
                }
            }
            if (cursor > winnerState.nextFreeSlot) {
                winnerState.nextFreeSlot = cursor;
            }
            updates.push({ 
                id: task.id, 
                startDate: toLocalISOString(bestStartDate), 
                dueDate: toLocalISOString(bestFinishDate),
                assigneeId: bestDevId !== 'unassigned' ? bestDevId : null
            });
        }
    }
    return updates;
};
