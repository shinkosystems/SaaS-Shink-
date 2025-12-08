
import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Send, Loader2, X, Zap, MessageSquare, ArrowRight, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { askGuru, generateDashboardInsight } from '../services/geminiService';
import { Opportunity } from '../types';

interface Props {
    opportunities: Opportunity[];
    user: any;
    organizationId?: number;
    onAction: (actionId: string) => void;
}

interface InsightData {
    alertTitle: string;
    alertLevel: 'critical' | 'warning' | 'info';
    insightText: string;
    actions: { label: string, actionId: string }[];
}

export const GuruFab: React.FC<Props> = ({ opportunities, user, organizationId, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [guruInput, setGuruInput] = useState('');
    const [guruLoading, setGuruLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'guru', text: string}[]>([]);
    const [hasUnread, setHasUnread] = useState(true);
    
    // Insight State
    const [insight, setInsight] = useState<InsightData | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    // Stats for Context
    const totalOpps = opportunities.length;
    const activeOpps = opportunities.filter(o => o.status === 'Active').length;

    // Load Insight when opened
    useEffect(() => {
        if (isOpen && !insight && !loadingInsight && opportunities.length > 0) {
            loadInitialInsight();
        }
    }, [isOpen]);

    const loadInitialInsight = async () => {
        setLoadingInsight(true);
        // Summarize context for the "Proactive" analysis
        const summary = opportunities.map(o => 
            `- ${o.title}: Status=${o.status}, Score=${o.prioScore.toFixed(1)}, Viabilidade=${o.viability}`
        ).join('\n');

        const data = await generateDashboardInsight(summary);
        if (data) {
            setInsight(data);
        } else {
            // Fallback if AI fails
            setInsight({
                alertTitle: "Análise de Portfólio",
                alertLevel: "info",
                insightText: "O Shinkō AI está monitorando seus projetos. Nenhuma anomalia crítica detectada no momento.",
                actions: [{ label: "Ver Matriz RDE", actionId: "nav_matrix" }]
            });
        }
        setLoadingInsight(false);
    };

    const handleGuruSubmit = async () => {
        if (!guruInput.trim()) return;
        
        const question = guruInput;
        setChatHistory(prev => [...prev, { role: 'user', text: question }]);
        setGuruInput('');
        setGuruLoading(true);

        const context = `
            Usuário: ${user.user_metadata?.full_name || 'Usuário'}
            Projetos Ativos: ${activeOpps}
            Total Projetos: ${totalOpps}
            Organização ID: ${organizationId}
            Lista de Projetos: ${opportunities.map(o => `${o.title} (Status: ${o.status}, Score: ${o.prioScore})`).join(', ')}
        `;

        const response = await askGuru(question, context);
        
        setChatHistory(prev => [...prev, { role: 'guru', text: response }]);
        setGuruLoading(false);
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
            
            {/* Main Chat Panel */}
            {isOpen && (
                <div className="pointer-events-auto mb-4 w-[380px] max-w-[90vw] h-[600px] max-h-[75vh] glass-panel rounded-3xl border border-purple-500/30 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 backdrop-blur-xl">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-slate-900 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <BrainCircuit className="w-5 h-5 text-white"/>
                            </div>
                            <div>
                                <h2 className="font-bold text-white text-base leading-none">Shinkō Insight™</h2>
                                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-black/20">
                        
                        {/* PROACTIVE DYNAMIC ALERT */}
                        {(loadingInsight || insight) && chatHistory.length === 0 && (
                            <div className={`rounded-2xl p-4 relative overflow-hidden animate-in zoom-in duration-500 border ${loadingInsight ? 'bg-slate-800 border-white/5' : getAlertStyle(insight!.alertLevel).bg + ' ' + getAlertStyle(insight!.alertLevel).border}`}>
                                {loadingInsight ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mb-2"/>
                                        <span className="text-xs">Analisando dados da organização...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${insight!.alertLevel === 'critical' ? 'bg-red-500' : insight!.alertLevel === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                        <h3 className={`${getAlertStyle(insight!.alertLevel).text} font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2`}>
                                            {React.createElement(getAlertStyle(insight!.alertLevel).icon, { className: "w-3 h-3" })}
                                            {insight!.alertTitle}
                                        </h3>
                                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 mb-3">
                                            <p className="text-xs text-slate-300 italic leading-relaxed">
                                                "{insight!.insightText}"
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {insight!.actions.map((action, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => handleActionClick(action.actionId)}
                                                    className={`w-full py-2.5 text-white font-bold rounded-lg text-xs transition-colors shadow-lg flex items-center justify-center gap-2 ${getAlertStyle(insight!.alertLevel).btn}`}
                                                >
                                                    {action.label} <ArrowRight className="w-3 h-3"/>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Chat History */}
                        <div className="space-y-4">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${msg.role === 'guru' ? 'bg-purple-600' : 'bg-slate-700'}`}>
                                        {msg.role === 'guru' ? <BrainCircuit className="w-4 h-4 text-white"/> : <span className="text-[10px] font-bold text-white">EU</span>}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'guru' 
                                        ? 'bg-slate-800 border border-white/10 text-slate-200 rounded-tl-none' 
                                        : 'bg-blue-600 text-white rounded-tr-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {guruLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                                        <BrainCircuit className="w-4 h-4 text-white"/>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 rounded-tl-none text-xs italic flex items-center gap-2 border border-white/5">
                                        <Loader2 className="w-3 h-3 animate-spin"/> Pensando...
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900 border-t border-white/10">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={guruInput}
                                onChange={(e) => setGuruInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuruSubmit()}
                                placeholder="Pergunte ao Guru..."
                                className="w-full h-12 pl-4 pr-12 rounded-xl bg-slate-800 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                autoFocus
                            />
                            <button 
                                onClick={handleGuruSubmit}
                                disabled={guruLoading || !guruInput.trim()}
                                className="absolute right-2 top-2 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Trigger Button */}
            <button 
                onClick={toggleOpen}
                className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all hover:scale-110 active:scale-95 group relative ${
                    isOpen ? 'bg-slate-800 text-slate-400 rotate-90' : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                }`}
            >
                {isOpen ? <X className="w-6 h-6"/> : <BrainCircuit className="w-7 h-7"/>}
                
                {/* Notification Badge */}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-slate-900 rounded-full animate-bounce"></span>
                )}

                {/* Tooltip on Hover */}
                {!isOpen && (
                    <div className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 shadow-xl pointer-events-none">
                        Falar com Guru AI
                    </div>
                )}
            </button>
        </div>
    );
};
