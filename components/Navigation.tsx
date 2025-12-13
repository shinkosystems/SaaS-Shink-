
import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, Search, 
    PlusCircle, LogOut, Sun, Moon, CreditCard, ChevronRight,
    Menu, X, Briefcase, BarChart3, Code2, Users, DollarSign,
    Shield, Layers, Sparkles, Lightbulb, TrendingUp
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

// Helper para definir grupos de menu com nomes mais minimalistas
const getMenuGroups = (userRole: string, isAdmin: boolean, currentPlan: string = 'plan_free', userEmail?: string, activeModules: string[] = []) => {
    const isClient = userRole === 'cliente';
    
    const groups = [
        {
            title: 'Principal',
            items: [
                { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
            ]
        },
        {
            title: 'Operacional',
            items: [] as any[]
        }
    ];

    // Helper for case insensitive module check
    const hasModule = (key: string) => activeModules.some(m => m.toLowerCase() === key.toLowerCase());

    // Modules filtering for Execution
    if (hasModule('projects')) {
        groups[1].items.push({ id: 'list', label: 'Projetos', icon: List });
    }
    if (hasModule('kanban')) {
        groups[1].items.push({ id: 'kanban', label: 'Tarefas', icon: Briefcase });
    }
    if (hasModule('calendar')) {
        groups[1].items.push({ id: 'calendar', label: 'Cronograma', icon: Calendar });
    }

    if (!isClient) {
        const businessItems = [];
        // CRM Module
        if (hasModule('crm')) {
            businessItems.push({ id: 'crm', label: 'Vendas', icon: TrendingUp });
        }
        if (hasModule('financial')) {
            businessItems.push({ id: 'financial', label: 'Financeiro', icon: DollarSign });
        }
        if (hasModule('clients')) {
            businessItems.push({ id: 'clients', label: 'Clientes', icon: Users });
        }

        if (businessItems.length > 0) {
            groups.push({
                title: 'Corporativo',
                items: businessItems
            });
        }

        const intelItems = [];
        // Metrics Modules
        if (userEmail === 'peboorba@gmail.com' && hasModule('product')) {
            intelItems.push({ id: 'product', label: 'Métricas de Produto', icon: BarChart3 });
        }
        if (hasModule('engineering')) {
            intelItems.push({ id: 'dev-metrics', label: 'Engenharia', icon: Code2 });
        }

        if (intelItems.length > 0) {
            groups.push({
                title: 'Estratégia',
                items: intelItems
            });
        }
    }

    const systemItems = [
        { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    if (isAdmin) {
        systemItems.push({ id: 'admin-manager', label: 'Administração', icon: Shield });
    }

    groups.push({
        title: 'Sistema',
        items: systemItems
    });

    return groups;
};

export const Sidebar: React.FC<Props> = (props) => {
  const isClient = props.userRole === 'cliente';
  const isAdmin = props.userData.name === 'Pedro Borba';
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.currentPlan, props.userData?.email, props.activeModules);
  const planLimits = PLAN_LIMITS[props.currentPlan || 'plan_free']; 
  const [aiUsage, setAiUsage] = useState(0);

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
      const interval = setInterval(loadAiUsage, 10000); 
      return () => clearInterval(interval);
  }, []);

  return (
    <div className={`hidden md:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-[#050505] shrink-0 transition-all duration-300 backdrop-blur-xl`}>
        
        {/* Header Logo - Mais limpo */}
        <div className="h-20 flex items-center justify-between px-6 mb-2">
            {props.customLogoUrl ? (
                <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain max-w-[120px]" />
            ) : (
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-lg">
                        {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white truncate max-w-[100px] opacity-90 group-hover:opacity-100 transition-opacity">
                        {props.orgName || 'Shinkō'}
                    </span>
                </div>
            )}
        </div>

        {/* Quick Action - Minimalista */}
        {!isClient && (
            <div className="px-6 mb-6">
                <button 
                    onClick={props.onOpenCreate}
                    className="w-full h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg font-medium text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
                >
                    <PlusCircle className="w-4 h-4" /> Novo Projeto
                </button>
            </div>
        )}

        {/* Search - Mais discreto */}
        <div className="px-6 mb-4">
            <div className="relative group">
                <Search className="absolute left-0 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-200 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    onChange={(e) => props.onSearch(e.target.value)}
                    className="w-full h-9 pl-6 pr-4 bg-transparent border-b border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-slate-400 dark:focus:border-slate-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Menu Items - Estilo Lista Limpa */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-8">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="relative">
                    {group.title && group.items.length > 0 && (
                        <h3 className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-60">
                            {group.title}
                        </h3>
                    )}
                    <div className="space-y-0.5">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full h-9 flex items-center gap-3 px-4 rounded-lg text-sm transition-all group relative ${
                                    props.currentView === item.id 
                                    ? 'text-slate-900 dark:text-white font-semibold bg-slate-200/50 dark:bg-white/5' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 transition-colors ${props.currentView === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                <span className="flex-1 text-left tracking-tight">{item.label}</span>
                                {props.currentView === item.id && (
                                    <div className="w-1 h-1 rounded-full bg-slate-900 dark:bg-white"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Bottom Panel - Minimalista */}
        <div className="p-4 mx-2 mb-2 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => props.onChangeView('profile')}
            >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden text-slate-600 dark:text-slate-300">
                    {props.userData?.avatar ? (
                        <img src={props.userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{props.userData?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{props.userData?.name || 'Usuário'}</span>
                    <span className="text-[10px] text-slate-400 truncate">{props.userRole}</span>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); props.onToggleTheme(); }}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        {props.theme === 'dark' ? <Sun className="w-3 h-3"/> : <Moon className="w-3 h-3"/>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        <LogOut className="w-3 h-3"/>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    // Mantendo a lógica do Mobile Drawer consistente com o novo estilo
    const isClient = props.userRole === 'cliente';
    const isAdmin = props.userData.name === 'Pedro Borba';
    const menuGroups = getMenuGroups(props.userRole, isAdmin, props.currentPlan, props.userData?.email, props.activeModules);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 flex items-center px-4 md:hidden z-50 gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => props.setIsMobileOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <Menu className="w-6 h-6"/>
                    </button>
                    <div className="font-bold text-lg text-slate-900 dark:text-white">
                        {props.orgName || 'Shinkō'}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {!isClient && (
                        <button onClick={props.onOpenCreateTask} className="w-8 h-8 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
                            <PlusCircle className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200 dark:border-white/5">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-900 dark:text-white">Menu</span>
                            <button onClick={() => props.setIsMobileOpen(false)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                            {menuGroups.map((group, idx) => (
                                <div key={idx}>
                                    {group.title && group.items.length > 0 && (
                                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-60">
                                            {group.title}
                                        </h3>
                                    )}
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { props.onChangeView(item.id); props.setIsMobileOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                                    props.currentView === item.id 
                                                    ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' 
                                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <item.icon className="w-5 h-5"/>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-white/5 space-y-3 bg-slate-50 dark:bg-black/20">
                            <button onClick={props.onToggleTheme} className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
                                {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                                Alternar Tema
                            </button>
                            <button onClick={props.onLogout} className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 text-sm">
                                <LogOut className="w-4 h-4"/> Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
