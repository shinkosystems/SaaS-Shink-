
import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, Search, 
    PlusCircle, LogOut, Sun, Moon, Briefcase, TrendingUp,
    Users, DollarSign, Shield, Sparkles, Lightbulb, Menu, X, ChevronRight
} from 'lucide-react';

interface Props {
  currentView: string;
  onChangeView: (view: any) => void;
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
    const isClient = userRole === 'cliente';
    const hasModule = (key: string) => activeModules.some(m => m.toLowerCase() === key.toLowerCase());

    const groups = [
        {
            title: 'Gestão',
            items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
        },
        {
            title: 'Execução',
            items: [
                ...(hasModule('projects') ? [{ id: 'list', label: 'Projetos', icon: List }] : []),
                ...(hasModule('kanban') ? [{ id: 'kanban', label: 'Tarefas', icon: Briefcase }] : []),
                ...(hasModule('calendar') ? [{ id: 'calendar', label: 'Cronograma', icon: Calendar }] : []),
            ]
        }
    ];

    if (!isClient) {
        const businessItems = [
            ...(hasModule('crm') ? [{ id: 'crm', label: 'Vendas CRM', icon: TrendingUp }] : []),
            ...(hasModule('financial') ? [{ id: 'financial', label: 'Financeiro', icon: DollarSign }] : []),
            ...(hasModule('clients') ? [{ id: 'clients', label: 'Clientes', icon: Users }] : []),
        ];
        if (businessItems.length > 0) groups.push({ title: 'Negócios', items: businessItems });
    }

    const systemItems = [{ id: 'settings', label: 'Ajustes', icon: Settings }];
    if (isAdmin || userEmail === 'peboorba@gmail.com') systemItems.push({ id: 'admin-manager', label: 'Super Admin', icon: Shield });
    groups.push({ title: 'Sistema', items: systemItems });

    return groups;
};

export const Sidebar: React.FC<Props> = (props) => {
  const isClient = props.userRole === 'cliente';
  const isAdmin = props.userData.email === 'peboorba@gmail.com';
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email);

  return (
    <aside className="hidden md:flex flex-col w-72 h-full border-r border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#050507]/40 backdrop-blur-3xl shrink-0 transition-all">
        {/* LOGO RESTAURADO */}
        <div className="h-24 flex items-center px-8 gap-4 border-b border-slate-200 dark:border-white/5 shrink-0">
            {props.customLogoUrl ? (
                <img src={props.customLogoUrl} alt={props.orgName} className="h-10 w-auto object-contain" />
            ) : (
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[1.1rem] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-[0_5px_15px_rgba(245,158,11,0.3)] dark:shadow-glow-amber transition-transform hover:rotate-3">
                        <Sparkles className="w-6 h-6"/>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-500/80 mt-1">OS Engine 26</span>
                    </div>
                </div>
            )}
        </div>

        {/* Action Area */}
        {!isClient && (
            <div className="px-6 py-6">
                <button onClick={props.onOpenCreate} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.3rem] font-black text-[11px] uppercase tracking-widest shinko-button hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl">
                    <PlusCircle className="w-4 h-4"/> Novo Projeto
                </button>
            </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-10 custom-scrollbar">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="space-y-3">
                    <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{group.title}</h3>
                    <div className="space-y-1">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-[1.2rem] text-[13px] font-bold transition-all duration-300 group ${
                                    props.currentView === item.id 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <item.icon className={`w-[18px] h-[18px] ${props.currentView === item.id ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}/>
                                <span className="flex-1 text-left">{item.label}</span>
                                {props.currentView === item.id && <ChevronRight className="w-3 h-3 opacity-50"/>}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Footer User Area */}
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-black/20">
            <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={props.onToggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent text-slate-500 hover:text-amber-500 transition-colors shadow-sm dark:shadow-none">
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
            </div>
            <div 
                onClick={() => props.onChangeView('profile')}
                className="flex items-center gap-4 p-3 rounded-[1.5rem] hover:bg-white dark:hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 group"
            >
                <div className="w-11 h-11 rounded-[1rem] overflow-hidden border-2 border-slate-200 dark:border-white/10 shadow-sm transition-transform group-hover:scale-105">
                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 dark:text-white">{props.userData.name.charAt(0)}</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-500/60 uppercase tracking-widest">{props.currentPlan?.replace('plan_', '') || 'Free'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="p-2.5 text-slate-400 hover:text-red-500 transition-all">
                    <LogOut className="w-4 h-4"/>
                </button>
            </div>
        </div>
    </aside>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    return (
        <div className="fixed top-0 left-0 right-0 h-20 glass-panel border-b border-slate-200 dark:border-white/5 flex items-center px-6 md:hidden z-[100] justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => props.setIsMobileOpen(true)} className="p-2 text-slate-900 dark:text-white bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-2xl"><Menu className="w-6 h-6"/></button>
                <div className="flex flex-col">
                    <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Mobile OS</span>
                </div>
            </div>
            <button onClick={props.onOpenCreateTask} className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"><PlusCircle className="w-6 h-6"/></button>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[85%] bg-white dark:bg-[#020203] border-r border-slate-200 dark:border-white/10 p-8 flex flex-col animate-in slide-in-from-left duration-500">
                        <div className="flex justify-between items-center mb-12">
                            <span className="font-black text-3xl tracking-tighter text-slate-900 dark:text-white">Shinkō.</span>
                            <button onClick={() => props.setIsMobileOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-2xl"><X className="w-6 h-6 text-slate-900 dark:text-white"/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
