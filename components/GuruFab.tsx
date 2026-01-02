
import React, { useState, useEffect, useRef } from 'react';
import { 
    BrainCircuit, Send, Loader2, X, Zap, MessageSquare, ArrowRight, 
    Activity, AlertTriangle, CheckCircle2, Command, Database, 
    TrendingUp, DollarSign, ListTodo, RefreshCw, Trash2 
} from 'lucide-react';
import { askGuru, generateDashboardInsight } from '../services/geminiService';
import { createTask, updateTask, deleteTask } from '../services/projectService';
import { createOpportunity } from '../services/opportunityService';
import { saveCrmOpportunity } from '../services/crmService';
import { addTransaction } from '../services/financialService';
import { Opportunity, RDEStatus, IntensityLevel } from '../types';

interface Props {
    opportunities: Opportunity[];
    user: any;
    organizationId?: number;
    onAction: (actionId: string) => void;
    externalPrompt?: string | null;
    onExternalPromptConsumed?: () => void;
}

interface InsightData {
    alertTitle: string;
    alertLevel: 'critical' | 'warning' | 'info';
    insightText: string;
    actions: { label: string, actionId: string }[];
}

export const GuruFab: React.FC<Props> = ({ opportunities, user, organizationId, onAction, externalPrompt, onExternalPromptConsumed }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [guruInput, setGuruInput] = useState('');
    const [guruLoading, setGuruLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'guru', text: string, isCommand?: boolean, icon?: any}[]>([]);
    const [hasUnread, setHasUnread] = useState(true);
    
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (externalPrompt) {
            setIsOpen(true);
            setHasUnread(false);
            processPrompt(externalPrompt);
            if (onExternalPromptConsumed) onExternalPromptConsumed();
        }
    }, [externalPrompt]);

    useEffect(() => {
        if (isOpen && !insight && !loadingInsight && opportunities.length > 0) {
            loadInitialInsight();
        }
        scrollToBottom();
    }, [isOpen, chatHistory]);

    const scrollToBottom = () => {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const loadInitialInsight = async () => {
        setLoadingInsight(true);
        try {
            const summary = (opportunities || []).map(o => 
                `- ${o.title}: Status=${o.status}, Score=${o.prioScore.toFixed(1)}`
            ).join('\n');

            const data = await generateDashboardInsight(summary);
            if (data) setInsight(data);
        } catch (e) {
            console.warn("Failed to load insights");
        } finally {
            setLoadingInsight(false);
        }
    };

    const handleExecuteFunction = async (call: any) => {
        const { name, args } = call;
        
        try {
            if (name === 'manage_task') {
                if (args.action === 'create') {
                    await createTask({ titulo: args.title, descricao: args.description, projeto: args.projectId, duracaohoras: args.hours, responsavel: user.id, organizacao: organizationId });
                    setChatHistory(prev => [...prev, { role: 'guru', text: `✅ Tarefa **"${args.title}"** criada com sucesso no Kanban.`, isCommand: true, icon: ListTodo }]);
                } else if (args.action === 'update') {
                    await updateTask(args.id, { titulo: args.title, status: args.status, descricao: args.description });
                    setChatHistory(prev => [...prev, { role: 'guru', text: `🔄 Tarefa **#${args.id}** sincronizada.`, isCommand: true, icon: RefreshCw }]);
                } else if (args.action === 'delete') {
                    await deleteTask(args.id);
                    setChatHistory(prev => [...prev, { role: 'guru', text: `🗑️ Tarefa removida do sistema.`, isCommand: true, icon: Trash2 }]);
                }
            } else if (name === 'manage_project') {
                if (args.action === 'create') {
                    await createOpportunity({ title: args.title, description: args.description, organizationId, status: 'Active', rde: args.rde || RDEStatus.WARM, archetype: args.archetype, intensity: IntensityLevel.L1, velocity: 3, viability: 3, revenue: 3, prioScore: 50, createdAt: new Date().toISOString(), id: crypto.randomUUID() } as any);
                    setChatHistory(prev => [...prev, { role: 'guru', text: `🚀 Novo projeto **"${args.title}"** inicializado no portfólio.`, isCommand: true, icon: Zap }]);
                }
            } else if (name === 'add_financial_record') {
                await addTransaction({ amount: args.amount, description: args.description, type: args.type, category: args.category || 'Geral', date: new Date().toISOString(), organizationId: organizationId! });
                setChatHistory(prev => [...prev, { role: 'guru', text: `💰 Registro financeiro de **R$ ${args.amount}** processado.`, isCommand: true, icon: DollarSign }]);
            } else if (name === 'manage_crm_lead') {
                await saveCrmOpportunity({ organizationId, title: args.title, value: args.value, probability: 20, stage: 'qualification', expectedCloseDate: new Date().toISOString(), owner: user.id, contact: { name: args.contact || '', role: '', email: '', phone: '' }, company: { name: args.company }, activities: [], createdAt: new Date().toISOString(), lastInteraction: new Date().toISOString(), id: 'temp' } as any);
                setChatHistory(prev => [...prev, { role: 'guru', text: `📈 Lead de **${args.company}** mapeado no CRM.`, isCommand: true, icon: TrendingUp }]);
            } else if (name === 'navigate_to') {
                onAction(args.view);
                setChatHistory(prev => [...prev, { role: 'guru', text: `Redirecionando para a visão de **${args.view.toUpperCase()}**...`, isCommand: true, icon: ArrowRight }]);
            }
        } catch (e: any) {
            setChatHistory(prev => [...prev, { role: 'guru', text: `❌ Erro na execução: ${e.message}`, isCommand: true }]);
        }
    };

    const processPrompt = async (prompt: string) => {
        if (!prompt.trim()) return;
        
        setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
        setGuruLoading(true);

        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário';
            const context = `OrgID: ${organizationId}. User: ${userName}. Projetos: ${(opportunities || []).length}.`;
            const response = await askGuru(prompt, context);
            
            if (response.text) {
                setChatHistory(prev => [...prev, { role: 'guru', text: response.text }]);
            }

            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const call of response.functionCalls) {
                    await handleExecuteFunction(call);
                }
            }
        } catch (e: any) {
            setChatHistory(prev => [...prev, { role: 'guru', text: `Desculpe, tive um problema ao processar isso: ${e.message}` }]);
        } finally {
            setGuruLoading(false);
            scrollToBottom();
        }
    };

    const handleGuruSubmit = () => {
        if (guruLoading || !guruInput.trim()) return;
        const q = guruInput;
        setGuruInput('');
        processPrompt(q);
    };

    const getAlertStyle = (level: string) => {
        switch(level) {
            case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', icon: Zap, btn: 'bg-red-600 hover:bg-red-700' };
            case 'warning': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', icon: AlertTriangle, btn: 'bg-amber-600 hover:bg-amber-700' };
            default: return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', icon: Activity, btn: 'bg-blue-600 hover:bg-blue-700' };
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end pointer-events-none">
            {isOpen && (
                <div className="pointer-events-auto mb-4 w-[450px] max-w-[90vw] h-[650px] max-h-[85vh] rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/98 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 backdrop-blur-2xl">
                    
                    {/* Header Adaptativo */}
                    <div className="p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-white/10">
                                <BrainCircuit className="w-6 h-6 text-white"/>
                            </div>
                            <div>
                                <h2 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Shinkō Guru AI</h2>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema Ativo
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2.5 rounded-full transition-all">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {loadingInsight ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500"/>
                                <span className="text-[10px] font-black uppercase text-slate-400">Analisando Operação...</span>
                            </div>
                        ) : insight && chatHistory.length === 0 && (
                            <div className={`rounded-[2rem] p-8 border ${getAlertStyle(insight.alertLevel).bg} ${getAlertStyle(insight.alertLevel).border} animate-in zoom-in`}>
                                <h3 className={`${getAlertStyle(insight.alertLevel).text} font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2`}>
                                    {React.createElement(getAlertStyle(insight.alertLevel).icon, { className: "w-4 h-4" })}
                                    {insight.alertTitle}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed mb-8">"{insight.insightText}"</p>
                                <div className="space-y-2">
                                    {insight.actions.map((action, i) => (
                                        <button 
                                            key={i} onClick={() => {
                                                if (action.actionId.startsWith('nav_')) onAction(action.actionId.replace('nav_', ''));
                                                else processPrompt(action.label);
                                            }}
                                            className={`w-full py-3.5 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${getAlertStyle(insight.alertLevel).btn}`}
                                        >
                                            {action.label} <ArrowRight className="w-4 h-4"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'guru' ? 'bg-purple-600 border-white/10' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-white/5'}`}>
                                        {msg.role === 'guru' ? <BrainCircuit className="w-5 h-5 text-white"/> : <span className="text-[10px] font-black text-slate-600 dark:text-white">EU</span>}
                                    </div>
                                    <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-xl border ${
                                        msg.role === 'guru' 
                                        ? msg.isCommand ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200' 
                                        : 'bg-slate-900 dark:bg-white text-white dark:text-black font-medium'
                                    }`}>
                                        {msg.icon && React.createElement(msg.icon, { className: "w-4 h-4 inline mr-2 mb-1" })}
                                        <div dangerouslySetInnerHTML={{ __html: (msg.text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            ))}
                            {guruLoading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
                                        <BrainCircuit className="w-5 h-5 text-white"/>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-slate-200 dark:border-white/5">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-500"/> Sincronizando Mente
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-white/10 shrink-0">
                        <div className="relative group">
                            <input 
                                type="text" value={guruInput}
                                onChange={(e) => setGuruInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuruSubmit()}
                                placeholder="Comande sua operação via IA..."
                                className="w-full h-16 pl-6 pr-16 rounded-[1.5rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 transition-all shadow-inner"
                                disabled={guruLoading}
                                autoFocus
                            />
                            <button 
                                onClick={handleGuruSubmit}
                                disabled={guruLoading || !guruInput.trim()}
                                className="absolute right-3 top-3 p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-lg active:scale-90 disabled:opacity-30"
                            >
                                {guruLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    setHasUnread(false);
                }}
                className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group relative border ${
                    isOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10 rotate-90' : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white border-white/10 shadow-purple-500/40'
                }`}
            >
                {isOpen ? <X className="w-8 h-8"/> : <BrainCircuit className="w-9 h-9"/>}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-slate-50 dark:border-[#020202] rounded-full animate-bounce"></span>
                )}
            </button>
        </div>
    );
};
