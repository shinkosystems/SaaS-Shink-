import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, Settings,
    LogOut, Sun, Moon, Briefcase, TrendingUp,
    Users, DollarSign, Shield, Sparkles, Menu, X, ChevronRight,
    Code2, BarChart3, Plus, Microscope, Activity, CheckSquare, Lightbulb,
    User, Box, GanttChart
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
    const isMaster = userEmail === 'peboorba@gmail.com';
    const hasModule = (key: string) => activeModules.some(m => m.toLowerCase() === key.toLowerCase());

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
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'ecosystem', label: 'Ecossistema', icon: Box }
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

    const businessItems = [
        ...(hasModule('crm') ? [{ id: 'crm', label: 'Vendas CRM', icon: TrendingUp }] : []),
        ...(hasModule('financial') ? [{ id: 'financial', label: 'Financeiro', icon: DollarSign }] : []),
        ...(hasModule('clients') ? [{ id: 'clients', label: 'Stakeholders', icon: Users }] : []),
    ];
    if (businessItems.length > 0) groups.push({ title: 'Negócios', items: businessItems });
    
    groups.push({ title: 'Performance', items: [{ id: 'intelligence', label: 'Inteligência', icon: BarChart3 }] });

    const systemItems = [
        { id: 'profile', label: 'Meu Perfil', icon: User },
        { id: 'settings', label: 'Ajustes', icon: Settings }
    ];
    if (isMaster) systemItems.push({ id: 'admin-manager', label: 'Controle Root', icon: Shield });
    groups.push({ title: 'Sistema', items: systemItems });

    return groups;
};

const Logo = ({ customLogoUrl, orgName, size = 'small' }: { customLogoUrl?: string | null, orgName?: string, size?: 'small' | 'large' }) => {
    const isLarge = size === 'large';
    return (
        <div className={`flex ${isLarge ? 'flex-col' : 'items-center'} gap-3 items-center justify-center`}>
            {customLogoUrl ? (
                <img src={customLogoUrl} alt={orgName} className={`${isLarge ? 'w-16 h-16' : 'h-6 w-auto'} object-contain rounded-2xl`} />
            ) : (
                <>
                    <div className={`${isLarge ? 'w-16 h-16 rounded-[1.2rem]' : 'w-7 h-7 rounded-lg'} bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-glow-amber transition-all`}>
                        <Sparkles className={isLarge ? 'w-8 h-8' : 'w-4 h-4'}/>
                    </div>
                    <div className={`flex flex-col items-center ${isLarge ? 'mt-2' : ''}`}>
                        <span className={`${isLarge ? 'text-base font-black' : 'font-bold text-sm'} tracking-tighter text-slate-900 dark:text-white leading-none`}>{orgName || 'Shinkō OS'}</span>
                        <span className={`${isLarge ? 'text-[7px]' : 'text-[6px]'} font-black uppercase tracking-widest text-amber-500 mt-1`}>OS 26</span>
                    </div>
                </>
            )}
        </div>
    );
};

export const Sidebar: React.FC<Props> = (props) => {
  const isMaster = props.userData.email === 'peboorba@gmail.com';
  const isAdmin = isMaster || props.userRole === 'dono'; 
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email, props.organizationId);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A0A0B] shrink-0 overflow-hidden">
        <div className="h-14 flex items-center justify-end px-6 shrink-0 pt-2">
            <button onClick={props.onOpenFeedback} className="p-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl shadow-glow-amber hover:scale-110 active:scale-95 transition-all relative z-50 group">
                <Lightbulb className="w-5 h-5 stroke-[2.5px] group-hover:rotate-12 transition-transform"/>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-[#0A0A0B] rounded-full"></span>
            </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
            <div className="flex justify-center">
                <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} size="large" />
            </div>
            <div className="space-y-1.5">
                <button onClick={props.onOpenCreate} className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4"/> Novo Projeto
                </button>
                <button onClick={props.onOpenCreateTask} className="w-full py-2 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5"/> Tarefa
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar pb-6 mt-2">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                    <h3 className="px-3 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{group.title}</h3>
                    <div className="space-y-0.5">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
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

        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2">
                <button onClick={props.onToggleTheme} className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-all shadow-inner">
                    {props.theme === 'dark' ? <Sun className="w-3.5 h-3.5"/> : <Moon className="w-3.5 h-3.5"/>}
                </button>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Build 2.5.6</span>
            </div>
            <div onClick={() => props.onChangeView('profile')} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all group">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/5 overflow-hidden">
                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-white text-xs">{props.userData.name.charAt(0)}</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                    <div className="text-[7px] font-black text-amber-500 uppercase tracking-widest">{props.currentPlan?.replace('plan_', '').toUpperCase() || 'FREE'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-slate-400 hover:text-red-500 transition-all"><LogOut className="w-3 h-3"/></button>
            </div>
        </div>
  </aside>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    const isMaster = props.userData.email === 'peboorba@gmail.com';
    const isAdmin = isMaster || props.userRole === 'dono';
    const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email, props.organizationId);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-[1000] lg:hidden h-16 bg-white dark:bg-black/95 backdrop-blur-3xl flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/10 shadow-sm">
                <button onClick={() => props.setIsMobileOpen(true)} className="p-2 text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 rounded-xl active:scale-95 transition-all">
                    <Menu className="w-5 h-5"/>
                </button>
                <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-white/10" onClick={() => props.onChangeView('profile')}>
                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-white text-xs">{props.userData.name.charAt(0)}</div>}
                </div>
            </div>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[2000] lg:hidden">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white dark:bg-[#0A0A0B] border-r border-slate-200 dark:border-white/5 flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                            <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
                            <button onClick={() => props.setIsMobileOpen(false)} className="p-2 text-slate-400"><X className="w-6 h-6"/></button>
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
                        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/5 overflow-hidden">
                                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-white text-xs">{props.userData.name.charAt(0)}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{props.currentPlan?.toUpperCase() || 'FREE'}</div>
                                </div>
                                <button onClick={props.onLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};