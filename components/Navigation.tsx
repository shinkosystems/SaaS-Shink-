
import React from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, 
    PlusCircle, LogOut, Sun, Moon, Briefcase, 
    TrendingUp, DollarSign, Users, Shield, Layers, Box, Menu, X, Sparkles, Lightbulb
} from 'lucide-react';

interface Props {
  currentView: string;
  onChangeView: (view: string) => void;
  onOpenCreate: () => void;
  onOpenCreateTask: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSearch: (q: string) => void;
  onOpenFeedback: () => void; 
  theme: 'dark' | 'light';
  dbStatus: 'connected' | 'disconnected' | 'error';
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userRole: string;
  userData: { name: string, avatar: string | null, email?: string };
  currentPlan?: string;
  customLogoUrl?: string | null;
  orgName?: string;
  activeModules?: string[];
}

const getMenuGroups = (userRole: string, isAdmin: boolean, activeModules: string[] = [], userEmail?: string) => {
    const isMaster = userEmail === 'peboorba@gmail.com';
    
    const groups = [
        {
            title: 'Gestão',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'value-chain', label: 'Cadeia de Valor', icon: Layers }
            ]
        },
        {
            title: 'Execução',
            items: [
                { id: 'list', label: 'Projetos', icon: List },
                { id: 'kanban', label: 'Tarefas', icon: Briefcase },
                { id: 'calendar', label: 'Cronograma', icon: Calendar },
            ]
        },
        {
            title: 'Negócios',
            items: [
                { id: 'crm', label: 'CRM / Vendas', icon: TrendingUp },
                { id: 'financial', label: 'Financeiro', icon: DollarSign },
                { id: 'clients', label: 'Stakeholders', icon: Users },
            ]
        }
    ];

    const systemItems = [
        { id: 'profile', label: 'Meu Perfil', icon: User },
        { id: 'settings', label: 'Configurações', icon: Settings }
    ];
    
    if (isMaster) {
        systemItems.push({ id: 'admin-manager', label: 'Super Admin', icon: Shield });
    }
    
    groups.push({ title: 'Sistema', items: systemItems });

    return groups;
};

export const Sidebar: React.FC<Props> = (props) => {
    const menuGroups = getMenuGroups(props.userRole, props.userRole === 'dono', props.activeModules, props.userData.email);

    return (
        <div className="hidden lg:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0">
            {/* Header com Logo e Sugestão */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-transparent backdrop-blur-sm relative z-20">
                {props.customLogoUrl ? (
                    <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain max-w-[140px]" />
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                            <Sparkles className="w-4 h-4"/>
                        </div>
                        <span className="font-black text-lg tracking-tighter text-slate-900 dark:text-white">Shinkō</span>
                    </div>
                )}
                
                <button 
                    onClick={props.onOpenFeedback}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-glow-amber transition-all animate-pulse"
                    title="Sugerir Melhoria"
                >
                    <Lightbulb className="w-4 h-4 stroke-[2.5px]"/>
                </button>
            </div>
            
            {/* Botões de Ação Rápida */}
            <div className="p-4 space-y-2 border-b border-slate-100 dark:border-white/5">
                <button 
                    onClick={props.onOpenCreate}
                    className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-98 transition-all"
                >
                    <PlusCircle className="w-4 h-4" /> Novo Projeto
                </button>
                <button 
                    onClick={props.onOpenCreateTask}
                    className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                    <Briefcase className="w-3.5 h-3.5" /> Tarefa Rápida
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {menuGroups.map((group, idx) => (
                    <div key={idx}>
                        <h3 className="px-4 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-70">{group.title}</h3>
                        <div className="space-y-1">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => props.onChangeView(item.id)}
                                    className={`w-full h-11 flex items-center gap-3 px-4 rounded-xl text-sm font-bold transition-all ${props.currentView === item.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-white dark:hover:bg-white/5'}`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20">
                <div className="flex items-center justify-between mb-4 px-2">
                    <button onClick={props.onToggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500">
                        {props.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500"/> : <Moon className="w-4 h-4"/>}
                    </button>
                    <span className="text-[9px] font-black px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-400 uppercase tracking-widest">v2.6 OS</span>
                </div>
                <button onClick={props.onLogout} className="w-full h-11 flex items-center gap-3 px-4 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </button>
            </div>
        </div>
    );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    if (!props.isMobileOpen) return (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-40 flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xs">S</div>
                <span className="font-black text-lg tracking-tighter text-slate-900 dark:text-white">Shinkō OS</span>
            </div>
            <button onClick={() => props.setIsMobileOpen(true)} className="p-2 text-slate-500">
                <Menu className="w-6 h-6" />
            </button>
        </div>
    );

    const menuGroups = getMenuGroups(props.userRole, props.userRole === 'dono', props.activeModules, props.userData.email);

    return (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-black overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5">
                <span className="font-black text-lg tracking-tighter text-slate-900 dark:text-white">Menu Principal</span>
                <button onClick={() => props.setIsMobileOpen(false)} className="p-2 text-slate-500">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <div className="p-6 space-y-10">
                <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => {props.onOpenCreate(); props.setIsMobileOpen(false);}} className="p-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 shadow-lg">
                        <PlusCircle className="w-5 h-5" /> Novo Projeto
                    </button>
                    <button onClick={() => {props.onOpenCreateTask(); props.setIsMobileOpen(false);}} className="p-4 bg-amber-500 text-black rounded-2xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center gap-2 shadow-lg">
                        <Briefcase className="w-5 h-5" /> Tarefa Rápida
                    </button>
                </div>

                {menuGroups.map((group, idx) => (
                    <div key={idx}>
                        <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{group.title}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => props.onChangeView(item.id)}
                                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all ${props.currentView === item.id ? 'bg-amber-500 border-amber-400 text-black shadow-xl shadow-amber-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500'}`}
                                >
                                    <item.icon className="w-6 h-6 mb-3" />
                                    <span className="text-[10px] font-black uppercase text-center">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
