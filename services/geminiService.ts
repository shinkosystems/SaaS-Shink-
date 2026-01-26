
/**
 * Shinkō Gemini Service (Client Shim)
 * Agora atua como um proxy para as API Routes seguras na Vercel.
 */

const callApi = async (action: string, payload: any) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Erro de rede: ${response.status}`);
        }
        
        return await response.json();
    } catch (error: any) {
        console.error(`Error in action ${action}:`, error);
        throw error;
    }
};

export const extractProjectDetailsFromPdf = async (pdfBase64: string): Promise<any> => {
    return await callApi('extract_pdf', { pdfBase64 });
};

export const askGuru = async (question: string, context: string): Promise<{ text: string, functionCalls?: any[] }> => {
    return await callApi('ask_guru', { question, context });
};

export const analyzeOpportunity = async (title: string, description: string): Promise<string> => {
    const res = await callApi('analyze_opportunity', { title, description });
    return res.text || "Sem análise disponível.";
};

export const generateBpmn = async (title: string, description: string, archetype: string, docsContext?: string, empty?: string, roles?: any[]): Promise<any> => {
    return await callApi('generate_bpmn', { title, description, archetype, docsContext, roles });
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    return await callApi('dashboard_insight', { contextSummary });
};

export const optimizeSchedule = async (tasks: any[], members?: any[]): Promise<any[]> => {
    return await callApi('optimize_schedule', { tasks, members });
};
