
import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Send, Loader2, X, Zap, MessageSquare, ArrowRight, Activity, AlertTriangle, CheckCircle2, Command } from 'lucide-react';
import { askGuru, generateDashboardInsight } from '../services/geminiService';
import { createTask } from '../services/projectService';
import { createOpportunity } from '../services/opportunityService';
import { Opportunity, RDEStatus, IntensityLevel } from '../types';

interface Props {
    opportunities: Opportunity[];
    user: any;
    organizationId?: number;
    onAction: (actionId: string) => void;
    externalPrompt?: string | null; // Prop para receber comandos de fora
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
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'guru', text: string, isCommand?: boolean}[]>([]);
    const [hasUnread, setHasUnread] = useState(true);
    
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Efeito para capturar prompts vindos do Dashboard
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
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadInitialInsight = async () => {
        setLoadingInsight(true);
        const summary = opportunities.map(o => 
            `- ${o.title}: Status=${o.status}, Score=${o.prioScore.toFixed(1)}, ID=${o.dbProjectId}`
        ).join('\n');

        const data = await generateDashboardInsight(summary);
        setInsight(data || {
            alertTitle: "Análise Shinkō",
            alertLevel: "info",
            insightText: "Estou monitorando seu portfólio. Como posso acelerar sua operação hoje?",
            actions: [{ label: "Ver Dashboard", actionId: "nav_matrix" }]
        });
        setLoadingInsight(false);
    };

    const handleExecuteFunction = async (call: any) => {
        const { name, args } = call;
        
        try {
            if (name === 'create_task') {
                await createTask({
                    titulo: args.title,
                    descricao: args.description || 'Tarefa gerada via Guru AI',
                    projeto: args.projectId || null,
                    duracaohoras: args.hours || 2,
                    responsavel: user.id,
                    organizacao: organizationId,
                    status: 'todo'
                });
                setChatHistory(prev => [...prev, { role: 'guru', text: `✅ Tarefa **"${args.title}"** criada com sucesso no sistema.`, isCommand: true }]);
            } else if (name === 'create_project') {
                await createOpportunity({
                    title: args.title,
                    description: args.description,
                    archetype: args.archetype || 'SaaS de Entrada',
                    organizationId: organizationId,
                    status: 'Active',
                    rde: RDEStatus.WARM,
                    intensity: IntensityLevel.L1,
                    velocity: 3, viability: 3, revenue: 3,
                    prioScore: 50, tadsScore: 0,
                    evidence: { clientsAsk: [], clientsSuffer: [], wontPay: [] },
                    createdAt: new Date().toISOString(),
                    tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false },
                    id: crypto.randomUUID()
                } as Opportunity);
                setChatHistory(prev => [...prev, { role: 'guru', text: `🚀 Projeto **"${args.title}"** inicializado no portfólio.`, isCommand: true }]);
            } else if (name === 'navigate_to') {
                onAction(`nav_${args.view}`);
                setChatHistory(prev => [...prev, { role: 'guru', text: `Direcionando você para a tela de **${args.view}**...`, isCommand: true }]);
            }
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'guru', text: `❌ Falha ao executar comando: **${name}**. Verifique as permissões.`, isCommand: true }]);
        }
    };

    const processPrompt = async (prompt: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
        setGuruLoading(true);

        const context = `
            Organização ID: ${organizationId}
            Usuário Logado: ${user.user_metadata?.full_name || 'Membro'} (ID: ${user.id})
            PROJETOS ATIVOS: ${opportunities.map(o => `"${o.title}" (ID: ${o.dbProjectId}, Score: ${o.prioScore.toFixed(1)})`).join(', ')}
        `;

        const response = await askGuru(prompt, context);
        
        if (response.text) {
            setChatHistory(prev => [...prev, { role: 'guru', text: response.text }]);
        }

        if (response.functionCalls) {
            for (const call of response.functionCalls) {
                await handleExecuteFunction(call);
            }
        }

        setGuruLoading(false);
    };

    const handleGuruSubmit = () => {
        if (!guruInput.trim()) return;
        const q = guruInput;
        setGuruInput('');
        processPrompt(q);
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setHasUnread(false);
    };

    const handleActionClick = (actionId: string) => {
        setIsOpen(false);
        onAction(actionId);
    };

    const getAlertStyle = (level: string) => {
        switch(level) {
            case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: Zap, btn: 'bg-red-600 hover:bg-red-500' };
            case 'warning': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: AlertTriangle, btn: 'bg-amber-600 hover:bg-amber-500' };
            default: return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Activity, btn: 'bg-blue-600 hover:bg-blue-500' };
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end pointer-events-none">
            {isOpen && (
                <div className="pointer-events-auto mb-4 w-[450px] max-w-[90vw] h-[650px] max-h-[80vh] glass-panel rounded-[2.5rem] border border-purple-500/30 bg-slate-900/98 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 backdrop-blur-2xl">
                    
                    <div className="p-5 border-b border-white/10 bg-gradient-to-r from-purple-900/40 to-slate-900 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-white/10">
                                <BrainCircuit className="w-6 h-6 text-white"/>
                            </div>
                            <div>
                                <h2 className="font-black text-white text-lg tracking-tight">Shinkō Guru AI</h2>
                                <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span> Sistema Ativo
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2.5 hover:bg-white/10 rounded-full transition-all">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-black/40">
                        {loadingInsight ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500"/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Escaneando Infraestrutura...</span>
                            </div>
                        ) : insight && chatHistory.length === 0 && (
                            <div className={`rounded-3xl p-6 relative overflow-hidden animate-in zoom-in duration-500 border ${getAlertStyle(insight.alertLevel).bg} ${getAlertStyle(insight.alertLevel).border}`}>
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${insight.alertLevel === 'critical' ? 'bg-red-500' : insight.alertLevel === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                <h3 className={`${getAlertStyle(insight.alertLevel).text} font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2`}>
                                    {React.createElement(getAlertStyle(insight.alertLevel).icon, { className: "w-4 h-4" })}
                                    {insight.alertTitle}
                                </h3>
                                <p className="text-sm text-slate-300 italic leading-relaxed mb-6">
                                    "{insight.insightText}"
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {insight.actions.map((action, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleActionClick(action.actionId)}
                                            className={`w-full py-3 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${getAlertStyle(insight.alertLevel).btn}`}
                                        >
                                            {action.label} <ArrowRight className="w-4 h-4"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-sm ${msg.role === 'guru' ? 'bg-purple-600' : 'bg-slate-700'}`}>
                                        {msg.role === 'guru' ? <BrainCircuit className="w-5 h-5 text-white"/> : <span className="text-[10px] font-black text-white">EU</span>}
                                    </div>
                                    <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-xl border ${
                                        msg.role === 'guru' 
                                        ? msg.isCommand ? 'bg-black/60 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-slate-800 border-white/5 text-slate-200 rounded-tl-none prose-invert prose-sm' 
                                        : 'bg-white text-black font-medium rounded-tr-none'
                                    }`}>
                                        {msg.isCommand && <Command className="w-3.5 h-3.5 inline mr-2 mb-0.5" />}
                                        <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            ))}
                            {guruLoading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                                        <BrainCircuit className="w-5 h-5 text-white"/>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-800 text-slate-400 rounded-tl-none text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/5 shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-500"/> Sincronizando Mente
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900 border-t border-white/10 shrink-0">
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={guruInput}
                                onChange={(e) => setGuruInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuruSubmit()}
                                placeholder="Peça ações ou tire dúvidas técnicas..."
                                className="w-full h-14 pl-5 pr-14 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all group-hover:border-white/20 shadow-inner"
                                autoFocus
                            />
                            <button 
                                onClick={handleGuruSubmit}
                                disabled={guruLoading || !guruInput.trim()}
                                className="absolute right-2.5 top-2.5 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-[1rem] transition-all shadow-lg active:scale-90 disabled:opacity-30"
                            >
                                <Send className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={toggleOpen}
                className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(147,51,234,0.6)] transition-all hover:scale-110 active:scale-95 group relative border border-white/10 ${
                    isOpen ? 'bg-slate-800 text-slate-400 rotate-90' : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white shadow-glow-purple'
                }`}
            >
                {isOpen ? <X className="w-8 h-8"/> : <BrainCircuit className="w-9 h-9"/>}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-[#020202] rounded-full animate-bounce"></span>
                )}
            </button>
        </div>
    );
};
