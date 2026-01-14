
import React, { useState, useEffect } from 'react';
import { createTicket, fetchOrganizationPublicInfo } from '../services/ticketService';
import { Loader2, Send, CheckCircle2, AlertTriangle, ArrowLeft, MessageSquare, Zap, ShieldAlert } from 'lucide-react';

export const TicketPortalPage: React.FC = () => {
    const [orgId, setOrgId] = useState<number | null>(null);
    const [orgInfo, setOrgInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        titulo: '',
        email: '',
        descricao: '',
        urgencia: 3
    });

    useEffect(() => {
        const path = window.location.pathname;
        const id = path.split('/').pop();
        if (id && !isNaN(Number(id))) {
            const numericId = Number(id);
            setOrgId(numericId);
            fetchOrganizationPublicInfo(numericId).then(info => {
                if (info) setOrgInfo(info);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId) return;
        setSending(true);
        setError(null);
        
        const res = await createTicket(orgId, form);
        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error);
        }
        setSending(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020203]"><Loader2 className="w-10 h-10 animate-spin text-amber-500"/></div>;

    if (!orgId || !orgInfo) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020203] p-10 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-6"/>
            <h1 className="text-3xl font-black text-white tracking-tighter">Link Inválido</h1>
            <p className="text-slate-500 mt-2">Não conseguimos localizar esta organização para abertura de chamados.</p>
        </div>
    );

    if (success) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020203] p-10 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-emerald-500/20 shadow-glow-emerald">
                <CheckCircle2 className="w-12 h-12 text-emerald-500"/>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Chamado Recebido!</h1>
            <p className="text-slate-400 mt-4 max-w-md mx-auto">Seu ticket foi sincronizado diretamente com nossa engenharia. Um consultor analisará o card em nosso pipeline em breve.</p>
            <button onClick={() => window.location.reload()} className="mt-12 px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all">Abrir Outro Chamado</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020203] text-white selection:bg-amber-500 selection:text-black font-sans relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            </div>

            <nav className="h-20 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-3xl px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    {orgInfo.logo ? (
                        <img src={orgInfo.logo} className="h-8 w-auto object-contain" alt={orgInfo.nome}/>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black">S</div>
                    )}
                    <div className="h-6 w-px bg-white/10"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal de Tickets / <span className="text-white">{orgInfo.nome}</span></span>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Engenharia Shinkō Online</span>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16 md:py-24 relative z-10">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-4">A Voz do <br/><span className="text-amber-500">Cliente</span>.</h1>
                    <p className="text-slate-400 text-lg font-medium">Relate um problema ou sugira uma evolução. Seu ticket virará um card real em nosso workflow industrial.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Seu E-mail Corporativo</label>
                            <input 
                                required type="email" value={form.email}
                                onChange={e => setForm({...form, email: e.target.value})}
                                placeholder="exemplo@suaempresa.com"
                                className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500 transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Chamado</label>
                            <input 
                                required value={form.titulo}
                                onChange={e => setForm({...form, titulo: e.target.value})}
                                placeholder="Resumo do problema..."
                                className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nível de Urgência</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[1,2,3,4,5].map(val => (
                                <button 
                                    key={val} type="button"
                                    onClick={() => setForm({...form, urgencia: val})}
                                    className={`py-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${form.urgencia === val ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber scale-[1.05]' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                                >
                                    {val === 1 ? 'Mínima' : val === 5 ? 'Crítica' : val}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-2 ml-1">A urgência define o posicionamento automático no nosso algoritmo de priorização.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Relatório Detalhado</label>
                        <textarea 
                            required value={form.descricao}
                            onChange={e => setForm({...form, descricao: e.target.value})}
                            placeholder="Descreva o cenário, passos para reproduzir ou detalhes da sua sugestão..."
                            className="w-full h-48 p-6 rounded-[2rem] bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500 transition-all font-medium resize-none leading-relaxed shadow-inner"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
                            <AlertTriangle className="w-5 h-5"/> {error}
                        </div>
                    )}

                    <div className="pt-6">
                        <button 
                            disabled={sending}
                            className="w-full md:w-auto px-16 py-6 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                            Sincronizar Ticket
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};
