
import React from 'react';
import { LayoutDashboard, List, Settings, PlusCircle, DollarSign, Users, Layers, Menu, X, Lock, Briefcase, Sparkles, BrainCircuit, Plus } from 'lucide-react';

interface Props {
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  onOpenCreateTask: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userData: { name: string, avatar: string | null, email?: string };
}

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, disabled: false },
    { id: 'list', label: 'Ativos', icon: Briefcase, disabled: false },
    { id: 'guru', label: 'Guru AI', icon: BrainCircuit, disabled: false },
    { id: 'kanban', label: 'Trabalho', icon: Layers, disabled: false },
    { id: 'financial', label: 'Dinheiro', icon: DollarSign, disabled: false },
    { id: 'clients', label: 'Stakeholders', icon: Users, disabled: false },
    { id: 'settings', label: 'Ajustes', icon: Settings, disabled: false },
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
                {MENU_ITEMS.map(item => (
                    <button
                        key={item.id}
                        disabled={item.disabled}
                        onClick={() => !item.disabled && props.onChangeView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${item.disabled ? 'opacity-30 cursor-not-allowed' : props.currentView === item.id ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'} ${item.id === 'guru' && props.currentView !== 'guru' ? 'text-purple-500' : ''}`}
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
                onClick={() => props.onChangeView('list')} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${props.currentView === 'list' ? 'text-amber-500' : 'text-slate-400'}`}
            >
                <Briefcase className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Ativos</span>
            </button>
            
            {/* Botão Central de Nova Tarefa */}
            <button 
                onClick={props.onOpenCreateTask} 
                className="flex items-center justify-center w-12 h-12 bg-amber-500 text-black rounded-2xl shadow-lg shadow-amber-500/30 active:scale-90 transition-all -translate-y-4"
                aria-label="Nova Tarefa"
            >
                <Plus className="w-7 h-7 stroke-[3px]"/>
            </button>

            <button 
                onClick={() => props.onChangeView('guru')} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${props.currentView === 'guru' ? 'text-purple-500' : 'text-slate-400'}`}
            >
                <BrainCircuit className="w-5 h-5"/>
                <span className="text-[8px] font-bold uppercase tracking-tight">Guru</span>
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

    return (
        <div className="lg:hidden fixed inset-0 z-[2000] bg-white/95 dark:bg-[#020203]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col h-full p-8">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold">S</div>
                        <span className="text-xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase">Menu Shinkō</span>
                    </div>
                    <button onClick={() => props.setIsMobileOpen(false)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-full">
                        <X className="w-6 h-6 text-slate-900 dark:text-white"/>
                    </button>
                </div>
                <div className="space-y-2 overflow-y-auto no-scrollbar pb-10">
                    {MENU_ITEMS.map(item => (
                        <button 
                            key={item.id} disabled={item.disabled}
                            onClick={() => { if(!item.disabled) { props.onChangeView(item.id); props.setIsMobileOpen(false); } }}
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all ${item.disabled ? 'opacity-20 cursor-not-allowed' : props.currentView === item.id ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}
                        >
                            <item.icon className="w-5 h-5"/>
                            <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={props.onLogout} className="mt-auto w-full py-5 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold uppercase tracking-widest text-xs rounded-xl shrink-0">Sair da Sessão</button>
            </div>
        </div>
    );
};
