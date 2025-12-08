
import { GoogleGenAI, Type } from "@google/genai";
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

  // Debugging log (Safe: shows only presence)
  if (!key) {
      console.warn("⚠️ Gemini Service: API Key is MISSING. Check 'VITE_API_KEY' in your environment variables.");
  } else {
      // console.log("✅ Gemini Service: API Key detected.");
  }

  return key;
};

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- CONFIGURAÇÃO DE TEMPO SHINKŌ ---

// Feriados Nacionais Fixos (Mês-Dia para match com formato MM-DD)
const FIXED_HOLIDAYS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
];

// Feriados Móveis (YYYY-MM-DD)
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

// Helper para normalizar data para meio-dia (evita problemas de fuso horário na virada do dia)
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
    
    // Formato MM-DD para comparar com FIXED_HOLIDAYS
    const fixed = `${mm}-${dd}`;
    const full = `${yyyy}-${mm}-${dd}`;

    if (FIXED_HOLIDAYS.includes(fixed)) return false;
    if (MOBILE_HOLIDAYS.includes(full)) return false;

    return true;
};

// --- DATE NAVIGATION HELPERS ---

const getNextBusinessDay = (date: Date): Date => {
    let next = new Date(date);
    // Always move at least 1 day forward initially
    next.setDate(next.getDate() + 1);
    next = normalizeDate(next);
    
    let safety = 0;
    // Keep moving until we find a business day
    while (!isBusinessDay(next) && safety < 365) {
        next.setDate(next.getDate() + 1);
        next = normalizeDate(next);
        safety++;
    }
    return next;
};

const ensureBusinessDay = (date: Date): Date => {
    let current = normalizeDate(date);
    let safety = 0;
    // If current is not business, find next immediately
    while (!isBusinessDay(current) && safety < 365) {
        current.setDate(current.getDate() + 1);
        current = normalizeDate(current);
        safety++;
    }
    return current;
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
  if (!ai) return "⚠️ Erro de Configuração: API Key não encontrada. No Vercel, a variável DEVE se chamar 'VITE_API_KEY'.";

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
    return "Erro ao conectar com a IA. Verifique se a chave API é válida.";
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
    const today = new Date().toISOString().split('T')[0];
    
    let roleInstructions = "";
    if (availableRoles && availableRoles.length > 0) {
        const rolesString = availableRoles.map(r => `ID ${r.id}: ${r.nome}`).join(", ");
        roleInstructions = `
        IMPORTANTE - ATRIBUIÇÃO DE CARGOS:
        Para cada tarefa (checklist item), você DEVE atribuir o ID numérico do cargo mais adequado no campo 'roleId'.
        A lista de cargos permitidos é: [${rolesString}].
        Exemplo: se a tarefa for 'Desenvolver API' e a lista tiver 'ID 5: Desenvolvedor', use 'roleId: 5'.
        Se nenhum se encaixar perfeitamente, use o ID mais próximo logicamente. Não invente IDs.
        `;
    }

    const prompt = `
    Atue como um Gerente de Projetos Sênior e Especialista em Processos (BPMN). 
    Crie um fluxo de trabalho estruturado em JSON para o projeto: "${title}" (${archetype}). 
    ${industryContext}
    Contexto adicional (docs): ${docsContext || "Nenhum"}.
    
    Regras de Ouro:
    1. A data de início do projeto é HOJE (${today}). Todas as datas devem ser a partir de hoje.
    2. Defina 'startDate' e 'dueDate' realistas para cada tarefa, encadeando-as logicamente (dependências).
    3. Para cada tarefa, calcule e atribua notas de Matriz GUT (Gravidade, Urgência, Tendência) de 1 a 5.
    4. Se uma tarefa for complexa, quebre em 'subtasks' (array de objetos com text e estimatedHours).
    5. 'estimatedHours' deve ser um número inteiro realista.
    ${roleInstructions}

    Structure required (JSON only): {
        lanes: [{id, label}], 
        nodes: [{
            id, label, laneId, type, 
            checklist: [{
                text, 
                description,
                estimatedHours, 
                roleId: number,  // Must correspond to the provided IDs
                startDate: "YYYY-MM-DD", 
                dueDate: "YYYY-MM-DD",
                gut: { g: number, u: number, t: number },
                subtasks: [{ text, estimatedHours }]
            }]
        }], 
        edges: [{from, to}]
    }.`;
    
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
    // 1. Prepare Queue sorted by Priority (GUT)
    const queue = tasks.map(t => ({
        id: t.taskId,
        text: t.taskText,
        originalAssigneeId: t.assigneeId,
        estimatedHours: Math.max(0.5, Number(t.estimatedHours) || 2),
        valueScore: t.gut ? (t.gut.g * t.gut.u * t.gut.t) : 1
    }));

    queue.sort((a, b) => b.valueScore - a.valueScore);

    const updates: any[] = [];
    
    // State Tracking
    const devState: Record<string, { nextFreeSlot: Date, dailyLoads: Record<string, number> }> = {};

    // Initial Date: Start from Tomorrow (or next business day) to be safe
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); 
    baseDate.setHours(12, 0, 0, 0);

    const devsPool = availableDevelopers.length > 0 
        ? availableDevelopers 
        : [{ id: 'unassigned', nome: 'Sem Dev' }];

    // Initialize Developer Availability
    devsPool.forEach(dev => {
        // Ensure starting point is a valid business day
        devState[dev.id] = { 
            nextFreeSlot: ensureBusinessDay(baseDate), 
            dailyLoads: {} 
        };
    });

    const simulateAllocation = (devId: string, hoursNeeded: number): { finishDate: Date, startDate: Date } => {
        const state = devState[devId];
        
        // Start from next free slot, ensuring it is a business day
        let cursor = ensureBusinessDay(state.nextFreeSlot);
        
        let remaining = hoursNeeded;
        const tempLoads = { ...state.dailyLoads };
        let firstAllocationDate: Date | null = null;
        let safety = 0;

        while (remaining > 0.001 && safety < 1000) {
            // STRICT BUSINESS DAY CHECK: If somehow we ended up on a weekend, skip immediately
            if (!isBusinessDay(cursor)) {
                cursor = getNextBusinessDay(cursor);
                continue;
            }

            const dateKey = toLocalISOString(cursor);
            const currentLoad = tempLoads[dateKey] || 0;
            const capacity = 8 - currentLoad; // STRICT 8 HOUR LIMIT

            // If day is full (<= 0 capacity), skip to next BUSINESS day
            if (capacity <= 0.001) {
                cursor = getNextBusinessDay(cursor);
                continue;
            }

            if (!firstAllocationDate) firstAllocationDate = new Date(cursor);
            
            const allocation = Math.min(remaining, capacity);
            remaining -= allocation;
            tempLoads[dateKey] = currentLoad + allocation;

            // If still remaining, we need to move to the next BUSINESS day
            if (remaining > 0.001) {
                cursor = getNextBusinessDay(cursor);
            }
            safety++;
        }

        if (safety >= 1000) {
            // Fallback for safety break
            const farFuture = new Date();
            farFuture.setFullYear(2030);
            return { finishDate: farFuture, startDate: farFuture };
        }
        return { finishDate: cursor, startDate: firstAllocationDate || cursor };
    };

    for (const task of queue) {
        let bestDevId = null;
        let bestFinishDate = new Date(8640000000000000);
        let bestStartDate = new Date();

        // Find Best Developer (Earliest Finish)
        for (const dev of devsPool) {
            const simulation = simulateAllocation(dev.id, task.estimatedHours);
            if (simulation.finishDate < bestFinishDate) {
                bestFinishDate = simulation.finishDate;
                bestStartDate = simulation.startDate;
                bestDevId = dev.id;
            } else if (simulation.finishDate.getTime() === bestFinishDate.getTime()) {
                // Tie-breaker: Prefer original owner if dates are equal
                if (dev.id === task.originalAssigneeId) {
                    bestDevId = dev.id;
                }
            }
        }

        // Commit Allocation
        if (bestDevId) {
            const winnerState = devState[bestDevId];
            let remaining = task.estimatedHours;
            
            // Start where simulation determined, ensuring it's business day (redundant safe check)
            let cursor = ensureBusinessDay(bestStartDate);

            // Re-run allocation logic to update real state (Deterministic)
            while (remaining > 0.001) {
                // Ensure we are on business day
                if (!isBusinessDay(cursor)) {
                    cursor = getNextBusinessDay(cursor);
                    continue;
                }

                const dateKey = toLocalISOString(cursor);
                const currentLoad = winnerState.dailyLoads[dateKey] || 0;
                const capacity = 8 - currentLoad; // 8 HOUR LIMIT
                
                if (capacity <= 0.001) {
                    cursor = getNextBusinessDay(cursor);
                    continue;
                }

                const allocation = Math.min(remaining, capacity);
                winnerState.dailyLoads[dateKey] = currentLoad + allocation;
                remaining -= allocation;

                if (remaining > 0.001) {
                    cursor = getNextBusinessDay(cursor);
                }
            }

            // Update nextFreeSlot for this developer
            if (cursor > winnerState.nextFreeSlot) {
                winnerState.nextFreeSlot = cursor;
            }
            
            // IMPORTANT: If the current slot ended up full (>= 8h), force next free slot to be the NEXT BUSINESS DAY
            const finalDateKey = toLocalISOString(winnerState.nextFreeSlot);
            if ((winnerState.dailyLoads[finalDateKey] || 0) >= 8) {
                winnerState.nextFreeSlot = getNextBusinessDay(winnerState.nextFreeSlot);
            }

            updates.push({ 
                id: task.id, 
                startDate: toLocalISOString(bestStartDate), 
                dueDate: toLocalISOString(bestFinishDate),
                assigneeId: bestDevId !== 'unassigned' ? bestDevId : null
            });
        }
    }

    // --- FINAL SAFETY CHECK (POS-PROCESSING) ---
    // Varredura final para garantir que NENHUMA data de atualização seja fim de semana/feriado
    // Se por algum motivo o algoritmo falhou ou o timezone causou drift, isso corrige.
    return updates.map(u => {
        // Usa T12:00:00 para forçar meio-dia local e evitar problemas de timezone
        let safeStart = new Date(u.startDate + 'T12:00:00');
        let safeEnd = new Date(u.dueDate + 'T12:00:00');

        let safety = 0;
        while (!isBusinessDay(safeStart) && safety < 50) {
             safeStart.setDate(safeStart.getDate() + 1);
             safeStart = normalizeDate(safeStart);
             safety++;
        }
        
        // Ensure End is at least Start
        if (safeEnd < safeStart) safeEnd = new Date(safeStart);

        safety = 0;
        while (!isBusinessDay(safeEnd) && safety < 50) {
             safeEnd.setDate(safeEnd.getDate() + 1);
             safeEnd = normalizeDate(safeEnd);
             safety++;
        }

        return {
            ...u,
            startDate: toLocalISOString(safeStart),
            dueDate: toLocalISOString(safeEnd)
        };
    });
};

// --- GURU AI (CHAT) ---
export const askGuru = async (question: string, context: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Sistema de IA indisponível. Verifique se a variável VITE_API_KEY está configurada no Vercel.";

    const prompt = `
    Você é o "Shinkō Guru", uma IA executiva de alta performance especializada em gestão eficiente.
    
    Contexto do Usuário/Organização:
    ${context}

    Pergunta do Usuário: "${question}"

    DIRETRIZES DE RESPOSTA:
    1. SEJA EXTREMAMENTE CONCISO. Use no máximo 3-4 frases curtas.
    2. SEJA ASSERTIVO E DIRETO. Diga o que fazer, evite "depende".
    3. Use bullets se necessário.
    4. Foque em ROI, eliminação de desperdício e ação imediata.
    5. Fale como um COO experiente, sem enrolação.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Sem resposta.";
    } catch (error) {
        console.error("Guru Error:", error);
        return "Guru offline (Erro de conexão).";
    }
};

// --- DASHBOARD INSIGHT AI ---
export const generateDashboardInsight = async (contextSummary: string): Promise<{
    alertTitle: string;
    alertLevel: 'critical' | 'warning' | 'info';
    insightText: string;
    actions: { label: string, actionId: string }[]
} | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    const prompt = `
    Atue como um Diretor de Operações (COO) de elite. Analise este portfólio e identifique O gargalo ou A oportunidade:
    
    ${contextSummary}

    Seja EXTREMAMENTE conciso, assertivo e direto. Sem "lero-lero".
    Foque apenas no maior risco ou na maior oportunidade financeira.

    Retorne APENAS um JSON (sem markdown) com esta estrutura estrita:
    {
      "alertTitle": "Título curto (Max 4 palavras, Impactante)",
      "alertLevel": "critical" | "warning" | "info" (critical = vermelho, warning = amarelo, info = azul),
      "insightText": "Texto de impacto (MAX 25 palavras). Vá direto ao ponto. Ex: 'O projeto X está drenando margem devido ao Lead Time alto.'",
      "actions": [
         { "label": "Ação Curta (Verbo + Objeto)", "actionId": "VALID_ID" }
      ]
    }
    
    ACTION IDS VÁLIDOS (Use somente estes):
    - "nav_kanban": Para revisar fluxo, gargalos ou tarefas.
    - "nav_calendar": Para prazos, cronograma ou datas.
    - "nav_financial": Para custos, orçamento ou receita.
    - "nav_matrix": Para priorização estratégica (RDE) ou visão geral.
    - "create_project": Para novas iniciativas.
    
    Gere exatamente 2 ações estratégicas.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        return JSON.parse(cleanJson(response.text || "{}"));
    } catch (error) {
        console.error("Dashboard Insight Error:", error);
        return null;
    }
};
