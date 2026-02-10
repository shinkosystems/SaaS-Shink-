
import React, { useState, useEffect, useRef } from 'react';
import { 
    BrainCircuit, Send, Loader2, Zap, MessageSquare, ArrowRight, 
    Activity, AlertTriangle, Command, TrendingUp, DollarSign, 
    ListTodo, RefreshCw, Trash2, Layers, Sparkles, User, Bot, Search, X
} from 'lucide-react';
import { askGuru, generateDashboardInsight } from '../services/geminiService';
import { createTask, updateTask, deleteTask } from '../services/projectService';
import { createOpportunity } from '../services/opportunityService';
import { saveCrmOpportunity } from '../services/crmService';
import { addTransaction } from '../services/financialService';
import { createValueChainTask } from '../services/valueChainService';
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

export const GuruPage: React.FC<Props> = ({ 
    opportunities, user, organizationId, onAction, externalPrompt, onExternalPromptConsumed
}) => {
    const [guruInput, setGuruInput] = useState('');
    const [guruLoading, setGuruLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'guru', text: string, isCommand?: boolean, icon?: any}[]>([]);
    
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (externalPrompt) {
            processPrompt(externalPrompt);
            if (onExternalPromptConsumed) onExternalPromptConsumed();
        }
    }, [externalPrompt]);

    useEffect(() => {
        if (!insight && !loadingInsight && opportunities.length > 0) {
            loadInitialInsight();
        }
        scrollToBottom();
    }, [chatHistory]);

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
            } else if (name === 'manage_value_chain') {
                await createValueChainTask({
                    title: args.title, category: args.category, estimated_cost_weight: args.weight || 1, projeto_id: args.projectId,
                    evidence_url: args.evidenceUrl, organizacao_id: organizationId, status: 'To-do'
                });
                setChatHistory(prev => [...prev, { role: 'guru', text: `🌀 Processo **"${args.title}"** adicionado ao Fluxo de Valor.`, isCommand: true, icon: Layers }]);
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
            if (response.text) setChatHistory(prev => [...prev, { role: 'guru', text: response.text }]);
            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const call of response.functionCalls) await handleExecuteFunction(call);
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
        <div className="h-full flex flex-col md:flex-row bg-white dark:bg-[#020203] overflow-hidden animate-in fade-in duration-500">
            
            {/* Desktop Sidebar: Intelligence & Insights */}
            <aside className="hidden md:flex w-80 lg:w-96 border-r border-slate-100 dark:border-white/5 flex-col bg-slate-50/50 dark:bg-black/20 overflow-y-auto custom-scrollbar p-8 space-y-10">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Mente IA.</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Operação Industrial v2.6</p>
                </div>

                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500"/> Análise de Portfólio
                    </h3>
                    
                    {loadingInsight ? (
                        <div className="p-10 flex flex-col items-center gap-4 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500"/>
                            <span className="text-[10px] font-black uppercase">Calculando...</span>
                        </div>
                    ) : insight ? (
                        <div className={`p-6 rounded-[2.5rem] border ${getAlertStyle(insight.alertLevel).bg} ${getAlertStyle(insight.alertLevel).border} space-y-6`}>
                            <div className="flex items-center gap-3">
                                {React.createElement(getAlertStyle(insight.alertLevel).icon, { className: `w-5 h-5 ${getAlertStyle(insight.alertLevel).text}` })}
                                <span className={`text-[10px] font-black uppercase tracking-widest ${getAlertStyle(insight.alertLevel).text}`}>{insight.alertTitle}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed italic">"{insight.insightText}"</p>
                            <div className="space-y-2 pt-2">
                                {insight.actions.map((act, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => act.actionId.startsWith('nav_') ? onAction(act.actionId.replace('nav_', '')) : processPrompt(act.label)}
                                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 ${getAlertStyle(insight.alertLevel).btn}`}
                                    >
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem] text-center opacity-40">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sem insights ativos</p>
                        </div>
                    )}
                </div>

                <div className="space-y-6 pt-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500"/> Snapshot de Status
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                            <div className="text-xl font-black">{opportunities.length}</div>
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Ativos</div>
                        </div>
                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                            <div className="text-xl font-black text-emerald-500">Online</div>
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Guru Core</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Chat Interface */}
            <div className="flex-1 flex flex-col relative h-full">
                
                {/* Chat Header */}
                <header className="h-20 border-b border-slate-100 dark:border-white/5 px-6 lg:px-10 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-purple-600 flex items-center justify-center shadow-lg border border-white/10">
                            <BrainCircuit className="w-6 h-6 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Guru AI <span className="text-emerald-500 text-xs ml-2">• Ativo</span></h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Conselheiro de Estratégia & Engenharia</p>
                        </div>
                    </div>
                    {/* Botão de Deletar Removido conforme solicitação */}
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-6 relative bg-slate-50 dark:bg-[#08080a]">
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.01] pointer-events-none bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e71aadddafa7b6acc04237.png')] bg-repeat"></div>
                    
                    <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 pb-20">
                        {chatHistory.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center gap-6 animate-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <Bot className="w-10 h-10"/>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Inovador'}.</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Como posso acelerar sua engenharia de valor hoje? Posso criar tarefas, analisar projetos ou gerar insights financeiros.</p>
                                </div>
                            </div>
                        )}

                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
                                <div className={`max-w-[85%] lg:max-w-[70%] p-6 rounded-[2rem] text-sm leading-relaxed shadow-xl border ${
                                    msg.role === 'guru' 
                                    ? msg.isCommand 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-bold rounded-tl-none' 
                                        : 'bg-white dark:bg-[#1a1a1e] border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none' 
                                    : 'bg-slate-900 dark:bg-purple-600 text-white border-white/5 font-medium rounded-tr-none'
                                }`}>
                                    {msg.icon && React.createElement(msg.icon, { className: "w-4 h-4 inline mr-3 mb-1" })}
                                    <div 
                                        className="whitespace-pre-wrap text-base"
                                        dangerouslySetInnerHTML={{ __html: (msg.text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} 
                                    />
                                    <div className="text-[8px] font-black uppercase mt-3 opacity-30 text-right tracking-widest">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {guruLoading && (
                            <div className="flex justify-start">
                                <div className="p-5 rounded-[1.8rem] bg-white dark:bg-[#1a1a1e] text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 border border-slate-100 dark:border-white/5 rounded-tl-none shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-500"/> Guru está projetando uma resposta...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Chat Input - Ajustado para visibilidade e padding mobile */}
                <footer className="p-6 pb-24 md:pb-10 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-black shrink-0 z-20">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <div className="flex-1 relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-400">
                                <Command className="w-4 h-4"/>
                            </div>
                            <input 
                                type="text" value={guruInput}
                                onChange={(e) => setGuruInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuruSubmit()}
                                placeholder="Digite sua dúvida estratégica..."
                                className="w-full h-16 pl-16 pr-6 rounded-[2rem] bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-base font-medium text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all shadow-inner"
                                disabled={guruLoading}
                            />
                        </div>
                        <button 
                            onClick={handleGuruSubmit}
                            disabled={guruLoading || !guruInput.trim()}
                            className="w-16 h-16 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-[1.8rem] transition-all shadow-xl shadow-purple-600/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        >
                            {guruLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
