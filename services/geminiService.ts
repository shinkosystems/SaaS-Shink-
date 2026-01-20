
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
        if (!response.ok) throw new Error('Falha na comunicação com o Guru');
        return await response.json();
    } catch (error) {
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

// Fix for BpmnBuilder.tsx on line 99: Updated signature to accept extra parameters passed by the component
export const generateBpmn = async (title: string, description: string, archetype: string, docsContext?: string, empty?: string, roles?: any[]): Promise<any> => {
    return await callApi('generate_bpmn', { title, description, archetype, docsContext, roles });
};

export const generateDashboardInsight = async (contextSummary: string): Promise<any> => {
    // Fix: Implemented real API call for dashboard insights via API handler
    return await callApi('dashboard_insight', { contextSummary });
};

// Fix for TasksPage.tsx on line 77: Updated signature to accept members and implemented API call
export const optimizeSchedule = async (tasks: any[], members?: any[]): Promise<any[]> => {
    return await callApi('optimize_schedule', { tasks, members });
};
