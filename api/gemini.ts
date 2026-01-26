
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const controlTools = [
  {
    name: "manage_task",
    description: "Executa operações de CRUD em tarefas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.NUMBER },
        title: { type: Type.STRING },
        status: { type: Type.STRING }
      },
      required: ["action"]
    }
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;

  try {
    switch (action) {
      case 'extract_pdf':
        const pdfResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: payload.pdfBase64 } },
              { text: "Analise este documento e extraia o título, descrição, arquétipo, intensidade e requisitos." }
            ]
          },
          config: {
            systemInstruction: "Você é o Shinkō Document Intelligence. Extraia fundamentos estratégicos.",
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
        return res.status(200).json(JSON.parse(pdfResponse.text || "{}"));

      case 'ask_guru':
        const guruResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: payload.question,
          config: {
            systemInstruction: `Você é o Shinkō Guru. Responda em Português. Contexto: ${payload.context}`,
            tools: [{ functionDeclarations: controlTools as any }]
          }
        });
        return res.status(200).json({
          text: guruResponse.text || "",
          functionCalls: guruResponse.functionCalls
        });

      case 'generate_bpmn':
        const bpmnResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `PROJETO: ${payload.title} | ARQUÉTIPO: ${payload.archetype} | MISSÃO: ${payload.description} | CONTEXTO: ${payload.docsContext || ''} | CARGOS DISPONÍVEIS: ${JSON.stringify(payload.roles || [])}`,
          config: {
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
                            description: { type: Type.STRING },
                            estimatedHours: { type: Type.NUMBER }
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
        return res.status(200).json(JSON.parse(bpmnResponse.text || "{}"));

      case 'analyze_opportunity':
        const analResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analise viabilidade do ativo "${payload.title}": "${payload.description}". 2 frases.`,
        });
        return res.status(200).json({ text: analResponse.text });

      case 'dashboard_insight':
        const insightResult = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Gere insights para o seguinte resumo operacional:\n${payload.contextSummary}`,
            config: {
                systemInstruction: "Você é o Shinkō BI Agent. Gere um insight estratégico e ações recomendadas. Níveis permitidos: critical, warning, info.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        alertTitle: { type: Type.STRING },
                        alertLevel: { type: Type.STRING },
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
        return res.status(200).json(JSON.parse(insightResult.text || "{}"));

      case 'optimize_schedule':
        const todayStr = new Date().toISOString().split('T')[0];
        const optScheduleResult = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `DATA REFERÊNCIA: ${todayStr} | TAREFAS: ${JSON.stringify(payload.tasks)} | EQUIPE: ${JSON.stringify(payload.members)}`,
            config: {
                systemInstruction: "Você é o Shinkō High-Speed Scheduler. Sua tarefa é organizar as datas das tarefas enviadas. 1) Regra de 8h úteis/dia por membro. 2) Gere datas sequenciais por prioridade de ID. 3) Seja extremamente rápido, ignore explicações. 4) Retorne apenas o array JSON. 5) Mantenha o ID original exatamente como recebido.",
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            startDate: { type: Type.STRING },
                            dueDate: { type: Type.STRING },
                            assigneeId: { type: Type.STRING }
                        },
                        required: ["id", "startDate", "dueDate", "assigneeId"]
                    }
                }
            }
        });
        return res.status(200).json(JSON.parse(optScheduleResult.text || "[]"));

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "Erro interno no Guru IA" });
  }
}
