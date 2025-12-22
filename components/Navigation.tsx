
import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, Search, 
    PlusCircle, LogOut, Sun, Moon, Briefcase, TrendingUp,
    Users, DollarSign, Shield, Sparkles, Lightbulb, Menu, X, ChevronRight,
    Code2, BarChart3, Plus, Activity
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
                ...(userEmail === 'peboorba@gmail.com' ? [{ id: 'assets', label: 'Performance', icon: Activity }] : []),
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
        
        const intelItems = [
            ...(hasModule('product') ? [{ id: 'product', label: 'Métricas Produto', icon: BarChart3 }] : []),
            ...(hasModule('engineering') ? [{ id: 'dev-metrics', label: 'Engenharia', icon: Code2 }] : []),
        ];
        if (intelItems.length > 0) groups.push({ title: 'Inteligência', items: intelItems });
    }

    const systemItems = [{ id: 'settings', label: 'Ajustes', icon: Settings }];
    if (isAdmin || userEmail === 'peboorba@gmail.com') systemItems.push({ id: 'admin-manager', label: 'Super Admin', icon: Shield });
    groups.push({ title: 'Sistema', items: systemItems });

    return groups;
};

const Logo = ({ customLogoUrl, orgName }: { customLogoUrl?: string | null, orgName?: string }) => (
    customLogoUrl ? (
        <img src={customLogoUrl} alt={orgName} className="h-8 lg:h-10 w-auto object-contain" />
    ) : (
        <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-[0.7rem] lg:rounded-[0.9rem] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-glow-amber">
                <Sparkles className="w-4 h-4 lg:w-5 lg:h-5"/>
            </div>
            <div className="flex flex-col">
                <span className="font-black text-base lg:text-lg tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-amber-500 mt-1">OS 26</span>
            </div>
        </div>
    )
);

export const Sidebar: React.FC<Props> = (props) => {
  const isClient = props.userRole === 'cliente';
  const isAdmin = props.userData.email === 'peboorba@gmail.com';
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email);
  const [aiUsage, setAiUsage] = useState(0);
  const planLimits = PLAN_LIMITS[props.currentPlan || 'plan_free'];

  useEffect(() => {
    const loadAiUsage = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            if (data?.organizacao) {
                const org = await fetchOrganizationDetails(data.organizacao);
                if (org) setAiUsage(org.pedidoia || 0);
            }
        }
    }
    loadAiUsage();
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-72 h-full border-r border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#050507]/40 backdrop-blur-3xl shrink-0 transition-all">
        <div className="h-24 flex items-center px-8 gap-4 border-b border-slate-200 dark:border-white/5 shrink-0 justify-between">
            <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
            <button onClick={props.onOpenFeedback} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all">
                <Lightbulb className="w-5 h-5"/>
            </button>
        </div>

        {!isClient && (
            <div className="px-6 py-6 space-y-3">
                <button onClick={props.onOpenCreate} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.3rem] font-black text-[11px] uppercase tracking-widest shinko-button hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl">
                    <PlusCircle className="w-4 h-4"/> Novo Projeto
                </button>
                <button onClick={props.onOpenCreateTask} className="w-full py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-amber-500/30 rounded-[1.3rem] font-black text-[10px] uppercase tracking-widest shinko-button transition-all flex items-center justify-center gap-2 group">
                    <Plus className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform"/> Nova Tarefa
                </button>
            </div>
        )}

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

        {/* AI Counter */}
        {!isClient && (
            <div className="px-6 pb-4">
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5"/> IA Status
                    </div>
                    <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-black">
                        {planLimits?.aiLimit >= 9000 ? '∞' : `${Math.max(0, (planLimits?.aiLimit || 0) - aiUsage)}`}
                    </span>
                </div>
            </div>
        )}

        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-black/20">
            <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={props.onToggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent text-slate-500 hover:text-amber-500 transition-colors shadow-sm dark:shadow-none">
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">v2.5 Release</span>
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
                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-500/60 uppercase tracking-widest">{props.currentPlan?.replace('plan_', '').toUpperCase() || 'FREE'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                    <LogOut className="w-4 h-4"/>
                </button>
            </div>
        </div>
    </aside>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    const isClient = props.userRole === 'cliente';
    const isAdmin = props.userData.email === 'peboorba@gmail.com';
    const menuGroups = getMenuGroups(props.userRole, isAdmin, props.activeModules, props.userData.email);

    const handleNavigate = (viewId: string) => {
        props.onChangeView(viewId);
        props.setIsMobileOpen(false);
    };

    return (
        <>
            <div className="fixed top-0 left-0 right-0 min-h-[4.5rem] lg:hidden z-[100] glass-panel border-b border-slate-200 dark:border-white/5 flex items-center px-4 justify-between" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => props.setIsMobileOpen(true)} 
                        className="p-2.5 text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-xl active:scale-95 transition-all"
                    >
                        <Menu className="w-5 h-5"/>
                    </button>
                    <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
                </div>
                <button 
                    onClick={props.onOpenCreateTask} 
                    className="w-10 h-10 bg-amber-500 text-black rounded-xl flex items-center justify-center shadow-glow-amber active:scale-90 transition-transform"
                >
                    <Plus className="w-5 h-5 stroke-[3px]"/>
                </button>
            </div>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[200] lg:hidden animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[80%] max-w-[320px] bg-white dark:bg-[#020203] border-r border-slate-200 dark:border-white/10 flex flex-col animate-in slide-in-from-left duration-500 shadow-2xl overflow-hidden">
                        
                        <div className="h-24 flex items-center justify-between px-6 border-b border-slate-100 dark:border-white/5 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                            <Logo customLogoUrl={props.customLogoUrl} orgName={props.orgName} />
                            <button 
                                onClick={() => props.setIsMobileOpen(false)} 
                                className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl active:scale-95 transition-all"
                            >
                                <X className="w-5 h-5 text-slate-900 dark:text-white"/>
                            </button>
                        </div>

                        {!isClient && (
                            <div className="px-6 py-4 space-y-2">
                                <button 
                                    onClick={() => { props.onOpenCreate(); props.setIsMobileOpen(false); }} 
                                    className="w-full py-3.5 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-amber flex items-center justify-center gap-2"
                                >
                                    <PlusCircle className="w-4 h-4"/> Novo Projeto
                                </button>
                                <button 
                                    onClick={() => { props.onOpenCreateTask(); props.setIsMobileOpen(false); }} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-3.5 h-3.5 text-amber-500"/> Nova Tarefa
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8 custom-scrollbar">
                            {menuGroups.map((group, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-2">{group.title}</h3>
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleNavigate(item.id)}
                                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                                                    props.currentView === item.id 
                                                    ? 'bg-amber-500 text-black shadow-glow-amber' 
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <item.icon className="w-4 h-4"/>
                                                <span className="flex-1 text-left">{item.label}</span>
                                                {props.currentView === item.id && <ChevronRight className="w-3 h-3"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/40" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={props.onToggleTheme} className="p-2.5 bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 transition-all">
                                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                                </button>
                                <button 
                                    onClick={() => { props.onOpenFeedback(); props.setIsMobileOpen(false); }}
                                    className="p-2.5 bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 text-amber-500 transition-all"
                                >
                                    <Lightbulb className="w-4 h-4"/>
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-amber-500/30">
                                    {props.userData.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-white text-xs">{props.userData.name.charAt(0)}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">{props.userData.name}</div>
                                    <div className="text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{props.currentPlan?.replace('plan_', '').toUpperCase() || 'FREE'}</div>
                                </div>
                                <button onClick={props.onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                                    <LogOut className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
