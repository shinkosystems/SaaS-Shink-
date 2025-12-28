
import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, Settings,
    LogOut, Sun, Moon, Briefcase, TrendingUp,
    Users, DollarSign, Shield, Sparkles, Menu, X, ChevronRight,
    Code2, BarChart3, Plus, Microscope, Activity, CheckSquare, Lightbulb,
    User
} from 'lucide-react';
import { PLAN_LIMITS } from '../types';
import { fetchOrganizationDetails } from '../services/organizationService';
import { supabase } from '../services/supabaseClient';

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
  organizationId?: number | null;
}

const getMenuGroups = (userRole: string, isAdmin: boolean, activeModules: string[] = [], userEmail?: string, orgId?: number | null) => {
    const isMaster = userEmail === 'peboorba@gmail.com' || orgId === 3;
    const isClient = userRole === 'cliente';
    const hasModule = (key: string) => isMaster || activeModules.some(m => m.toLowerCase() === key.toLowerCase());

    if (!isMaster && userRole !== 'dono') {
        return [
            {
                title: 'Execução',
                items: [
                    { id: 'list', label: 'Projetos', icon: List },
                    { id: 'kanban', label: 'Operações', icon: Briefcase },
                    { id: 'calendar', label: 'Cronograma', icon: Calendar },
                ]
            },
            {
                title: 'Sistema',
                items: [
                    { id: 'profile', label: 'Meu Perfil', icon: User },
                ]
            }
        ];
    }

    const groups = [
        {
            title: 'Gestão',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
        },
        {
            title: 'Execução',
            items: [
                ...(hasModule('projects') ? [{ id: 'list', label: 'Projetos', icon: List }] : []),
                ...(hasModule('kanban') ? [{ id: 'kanban', label: 'Operações', icon: Briefcase }] : []),
                ...(hasModule('calendar') ? [{ id: 'calendar', label: 'Cronograma', icon: Calendar }] : []),
            ]
        }
    ];

    if (!isClient) {
        const businessItems = [
            ...(hasModule('crm') ? [{ id: 'crm', label: 'Vendas CRM', icon: TrendingUp }] : []),
            ...(hasModule('financial') ? [{ id: 'financial', label: 'Financeiro', icon: DollarSign }] : []),
            ...(hasModule('clients') ? [{ id: 'clients', label: 'Stakeholders', icon: Users }] : []),
        ];
        if (businessItems.length > 0) groups.push({ title: 'Negócios', items: businessItems });
        
        groups.push({ title: 'Performance', items: [{ id: 'intelligence', label: 'Inteligência', icon: BarChart3 }] });
    }

    const systemItems = [
        { id: 'profile', label: 'Meu Perfil', icon: User },
        { id: 'settings', label: 'Ajustes', icon: Settings }
    ];
    if (userEmail === 'peboorba@gmail.com') systemItems.push({ id: 'admin-manager', label: 'Controle Root', icon: Shield });
    groups.push({ title: 'Sistema', items: systemItems });

    return groups;
};

const Logo = ({ customLogoUrl, orgName }: { customLogoUrl?: string | null, orgName?: string }) => (
    <div className="flex items-center gap-3">
        {customLogoUrl ? (
            <img src={customLogoUrl} alt={orgName} className="h-7 w-auto object-contain" />
        ) : (
            <>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-glow-amber">
                    <Sparkles className="w-4 h-4"/>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-base tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-amber-500 mt-1">OS 26</span>
                </div>
            </>
        )}
    </div>
);

export const Sidebar: React.FC<Props> = (props) => {
  const isAdmin = props.userData.email === 'peboorba@gmail.com' || props.userRole === 'dono'; 
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email, props.organizationId);

  return (
    <aside className="hidden xl:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A0A0B] shrink-0">
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
            <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
            <button 
                onClick={props.onOpenFeedback}
                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
            >
                <Lightbulb className="w-4 h-4"/>
            </button>
        </div>

        <div className="px-4 py-6 space-y-2">
            <button onClick={props.onOpenCreate} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-sm">
                <Plus className="w-4 h-4"/> Novo Projeto
            </button>
            <button onClick={props.onOpenCreateTask} className="w-full py-2.5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <CheckSquare className="w-3.5 h-3.5"/> Tarefa
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar pb-10 mt-4">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="space-y-3">
                    <h3 className="px-3 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{group.title}</h3>
                    <div className="space-y-0.5">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    props.currentView === item.id 
                                    ? 'bg-slate-100 dark:bg-white/5 text-amber-500 border border-amber-500/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${props.currentView === item.id ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}/>
                                <span className="flex-1 text-left">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between px-2">
                <button 
                    onClick={props.onToggleTheme}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-all shadow-inner"
                >
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Build 2.5.1</span>
            </div>

            <div 
                onClick={() => props.onChangeView('profile')}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all group"
            >
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/5 overflow-hidden">
                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-white text-xs">{props.userData.name.charAt(0)}</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                    <div className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">{props.currentPlan?.replace('plan_', '').toUpperCase() || 'FREE'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-all">
                    <LogOut className="w-3.5 h-3.5"/>
                </button>
            </div>
        </div>
    </aside>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    const isAdmin = props.userData.email === 'peboorba@gmail.com' || props.userRole === 'dono';
    const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email, props.organizationId);

    return (
        <>
            {/* Floating Island Header - Top Left Only */}
            <div className="fixed top-6 left-6 z-[1000] xl:hidden flex items-center gap-4 bg-white/80 dark:bg-black/80 backdrop-blur-2xl p-2.5 pr-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-ios active:scale-[0.98] transition-all">
                <button 
                    onClick={() => props.setIsMobileOpen(true)} 
                    className="p-2.5 text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl active:scale-95 transition-all"
                >
                    <Menu className="w-5 h-5"/>
                </button>
                <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
            </div>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[2000] xl:hidden">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white dark:bg-[#0A0A0B] border-r border-slate-200 dark:border-white/5 flex flex-col animate-in slide-in-from-left duration-300">
                        
                        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                            <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
                            <button onClick={() => props.setIsMobileOpen(false)} className="p-2 text-slate-400">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>

                        <div className="px-4 py-6 space-y-2">
                            <button onClick={() => { props.onOpenCreate(); props.setIsMobileOpen(false); }} className="w-full py-3.5 bg-amber-500 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
                                <Plus className="w-4 h-4"/> Novo Projeto
                            </button>
                            <button onClick={() => { props.onOpenCreateTask(); props.setIsMobileOpen(false); }} className="w-full py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                <CheckSquare className="w-4 h-4"/> Tarefa
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 custom-scrollbar">
                            {menuGroups.map((group, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-3">{group.title}</h3>
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { props.onChangeView(item.id); props.setIsMobileOpen(false); }}
                                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                                                    props.currentView === item.id 
                                                    ? 'bg-slate-100 dark:bg-white/5 text-amber-500 border border-amber-500/20' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <item.icon className={`w-5 h-5 ${props.currentView === item.id ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}/>
                                                <span className="flex-1 text-left">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Theme Toggle integrated into Drawer base */}
                        <div className="px-4 py-4 border-t border-slate-100 dark:border-white/5">
                            <button 
                                onClick={props.onToggleTheme}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    {props.theme === 'dark' ? <Moon className="w-4 h-4 text-amber-500"/> : <Sun className="w-4 h-4 text-amber-500"/>}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Modo {props.theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                                </div>
                                <div className="w-10 h-5 bg-slate-200 dark:bg-white/10 rounded-full relative p-1 flex items-center">
                                    <div className={`w-3 h-3 rounded-full bg-amber-500 transition-all duration-300 ${props.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                            </button>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/5 overflow-hidden">
                                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-white text-xs">{props.userData.name.charAt(0)}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{props.currentPlan?.toUpperCase() || 'FREE'}</div>
                                </div>
                                <button onClick={props.onLogout} className="p-2 text-slate-400 hover:text-red-500">
                                    <LogOut className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
