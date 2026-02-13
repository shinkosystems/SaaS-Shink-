
import React from 'react';
import { 
    LayoutDashboard, List, Settings, PlusCircle, DollarSign, 
    Users, Layers, Menu, X, Lock, Briefcase, Sparkles, 
    BrainCircuit, Plus, LogOut, ChevronRight, User, ShieldCheck,
    Cpu, Target, Globe, CalendarDays
} from 'lucide-react';

interface Props {
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  onOpenCreateTask: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userData: { name: string, avatar: string | null, email?: string };
  currentPlan?: string;
}

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, category: 'Navegação' },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, category: 'Operação', highlight: true },
    { id: 'kanban', label: 'Trabalho', icon: Layers, category: 'Operação' },
    { id: 'list', label: 'Projetos', icon: Briefcase, category: 'Navegação' },
    { id: 'guru', label: 'Guru AI', icon: BrainCircuit, category: 'Navegação' },
    { id: 'financial', label: 'Dinheiro', icon: DollarSign, category: 'Negócios' },
    { id: 'clients', label: 'Clientes', icon: Users, category: 'Negócios' },
    { id: 'settings', label: 'Ajustes', icon: Settings, category: 'Sistema' },
    { id: 'profile', label: 'Meu Perfil', icon: User, category: 'Sistema' },
];

export const Sidebar: React.FC<Props> = (props) => {
    return (
        <div className="hidden lg:flex flex-col w-64 h-screen border-r border-slate-100 dark:border-white/5 bg-white dark:bg-[#020203] shrink-0 p-6">
            <div className="mb-12 flex items-center gap-3 group cursor-pointer" onClick={() => props.onChangeView('dashboard')}>
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold">S</div>
                <span className="font-bold text-lg tracking-tighter dark:text-white uppercase">Shinkō</span>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 ml-4 mb-4 opacity-70">Operação</p>
                {MENU_ITEMS.filter(i => i.id !== 'profile').map(item => (
                    <button
                        key={item.id}
                        onClick={() => props.onChangeView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${props.currentView === item.id ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'} ${item.id === 'agenda' && props.currentView !== 'agenda' ? 'text-amber-500' : ''}`}
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3 px-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-xl transition-all" onClick={() => props.onChangeView('profile')}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                        {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover" /> : <span className="font-bold text-[10px] text-slate-400">{props.userData.name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{props.userData.name}</p>
                        <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Sair</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    if (!props.isMobileOpen) return (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md h-16 bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 z-[1000] flex items-center justify-around px-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <button 
                onClick={() => props.onChangeView('dashboard')} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${props.currentView === 'dashboard' ? 'text-amber-500' : 'text-slate-400'}`}
            >
                <LayoutDashboard className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Início</span>
            </button>
            <button 
                onClick={() => props.onChangeView('agenda')} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${props.currentView === 'agenda' ? 'text-amber-500' : 'text-slate-400'}`}
            >
                <CalendarDays className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Agenda</span>
            </button>
            
            <button 
                onClick={props.onOpenCreateTask} 
                className="flex items-center justify-center w-12 h-12 bg-amber-500 text-black rounded-2xl shadow-lg shadow-amber-500/30 active:scale-90 transition-all -translate-y-4"
                aria-label="Nova Tarefa"
            >
                <Plus className="w-7 h-7 stroke-[3px]"/>
            </button>

            <button 
                onClick={() => props.onChangeView('list')} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${props.currentView === 'list' ? 'text-amber-500' : 'text-slate-400'}`}
            >
                <Briefcase className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Projetos</span>
            </button>
            <button 
                onClick={() => props.setIsMobileOpen(true)} 
                className="flex flex-col items-center gap-1 text-slate-400 p-2 rounded-2xl"
            >
                <Menu className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Menu</span>
            </button>
        </div>
    );

    const categories = ['Navegação', 'Operação', 'Negócios', 'Sistema'];

    return (
        <div className="lg:hidden fixed inset-0 z-[2000] bg-slate-50 dark:bg-[#020203] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500">
            
            {/* CABEÇALHO NUBANK STYLE */}
            <div className="bg-[#F59E0B] px-8 pt-12 pb-10 flex flex-col gap-6 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
                
                <div className="flex justify-between items-center relative z-10">
                    <button onClick={() => props.setIsMobileOpen(false)} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-all active:scale-90 border border-white/10">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">v2.6 OS</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-[2.2rem] bg-white/20 border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center shrink-0">
                        {props.userData.avatar ? (
                            <img src={props.userData.avatar} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-8 h-8 text-white opacity-40" />
                        )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                        <h2 className="text-2xl font-black text-white tracking-tighter leading-none truncate">
                            Olá, {props.userData.name.split(' ')[0]}
                        </h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit border border-white/5">
                            <ShieldCheck className="w-3 h-3 text-white" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                Plano {props.currentPlan?.replace('plan_', '').toUpperCase() || 'FREE'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRID DE MENU AGROUPADO - NUBANK TACTILE CARDS */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-8 pb-32 space-y-10">
                {categories.map((cat, catIdx) => (
                    <div key={cat} className="space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${catIdx * 100}ms` }}>
                        <h3 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            {cat === 'Navegação' && <Target className="w-3 h-3"/>}
                            {cat === 'Operação' && <Cpu className="w-3 h-3"/>}
                            {cat === 'Negócios' && <Globe className="w-3 h-3"/>}
                            {cat === 'Sistema' && <Settings className="w-3 h-3"/>}
                            {cat}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {MENU_ITEMS.filter(item => item.category === cat).map((item, itemIdx) => (
                                <button
                                    key={item.id}
                                    onClick={() => { props.onChangeView(item.id); props.setIsMobileOpen(false); }}
                                    className={`
                                        relative group flex flex-col justify-between p-6 rounded-[2rem] text-left transition-all duration-300 border active:scale-[0.96] h-32
                                        ${props.currentView === item.id 
                                            ? 'bg-white dark:bg-white/10 border-amber-500 shadow-[0_15px_30px_-5px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20' 
                                            : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/5 shadow-sm'
                                        }
                                    `}
                                >
                                    <div className={`p-2.5 rounded-xl w-fit ${props.currentView === item.id ? 'bg-amber-500 text-black' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className={`text-xs font-black uppercase tracking-tight block ${props.currentView === item.id ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {item.label}
                                        </span>
                                        {item.id === 'agenda' && (
                                            <span className="text-[7px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">Hoje</span>
                                        )}
                                    </div>
                                    <ChevronRight className={`absolute bottom-6 right-6 w-3 h-3 transition-all ${props.currentView === item.id ? 'text-amber-500 translate-x-0' : 'text-slate-200 dark:text-slate-800 opacity-0 group-hover:opacity-100'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* BOTÃO DE SAÍDA INTEGRADO COMO CARD DE SISTEMA */}
                <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 delay-[400ms]">
                    <button 
                        onClick={props.onLogout}
                        className="w-full p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 flex items-center justify-between group transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                                <LogOut className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <span className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight block">Sair da Sessão</span>
                                <span className="text-[9px] font-bold text-rose-400 dark:text-rose-600 uppercase tracking-widest">Desconectar Terminal</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-rose-200 dark:text-rose-900 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* RODAPÉ DE MARCA */}
            <div className="px-10 py-8 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#020203] flex justify-center items-center shrink-0">
                <div className="flex items-center gap-3 opacity-30 grayscale">
                    <div className="w-5 h-5 rounded bg-slate-900 dark:bg-white flex items-center justify-center text-[10px] font-black text-white dark:text-black">S</div>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">Shinkō Industrial</span>
                </div>
            </div>
        </div>
    );
};
