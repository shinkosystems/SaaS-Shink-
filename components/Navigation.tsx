
import React, { useEffect, useState } from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, Search, 
    PlusCircle, LogOut, Sun, Moon, CreditCard, ChevronRight,
    Menu, X, Briefcase, BarChart3, Code2, Users, DollarSign,
    Shield, Layers, Sparkles
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
  theme: 'dark' | 'light';
  dbStatus: 'connected' | 'disconnected' | 'error';
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userRole: string;
  userData: { name: string, avatar: string | null, email?: string };
  currentPlan?: string;
  customLogoUrl?: string | null;
  orgName?: string;
}

// Helper para definir grupos de menu
const getMenuGroups = (userRole: string, isAdmin: boolean, currentPlan: string = 'plan_free', userEmail?: string) => {
    const isClient = userRole === 'cliente';
    const planFeatures = PLAN_LIMITS[currentPlan]?.features || PLAN_LIMITS['plan_free'].features;

    const groups = [
        {
            title: 'Gestão',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            ]
        },
        {
            title: 'Execução',
            items: [
                { id: 'list', label: 'Projetos', icon: List },
                { id: 'kanban', label: 'Tarefas', icon: Briefcase },
            ]
        }
    ];

    if (planFeatures.gantt) {
        // Renamed from Cronograma to Agenda per user request
        groups[1].items.push({ id: 'calendar', label: 'Agenda', icon: Calendar });
    }

    if (!isClient) {
        const businessItems = [];
        if (planFeatures.financial) {
            businessItems.push({ id: 'financial', label: 'Financeiro', icon: DollarSign });
        }
        if (planFeatures.clients) {
            businessItems.push({ id: 'clients', label: 'Clientes', icon: Users });
        }

        if (businessItems.length > 0) {
            groups.push({
                title: 'Negócios',
                items: businessItems
            });
        }

        const intelItems = [];
        if (planFeatures.metrics) {
            // RESTRIÇÃO: Apenas peboorba@gmail.com vê Métricas Produto
            if (userEmail === 'peboorba@gmail.com') {
                intelItems.push({ id: 'product', label: 'Métricas Produto', icon: BarChart3 });
            }
            intelItems.push({ id: 'dev-metrics', label: 'Engenharia', icon: Code2 });
        }

        if (intelItems.length > 0) {
            groups.push({
                title: 'Inteligência',
                items: intelItems
            });
        }
    }

    const systemItems = [
        { id: 'settings', label: 'Configurações', icon: Settings },
    ];

    if (isAdmin) {
        systemItems.push({ id: 'admin-manager', label: 'Super Admin', icon: Shield });
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
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.currentPlan, props.userData?.email);
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
      const interval = setInterval(loadAiUsage, 10000); // Poll every 10s for updates
      return () => clearInterval(interval);
  }, []);

  return (
    <div className={`hidden md:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0 transition-all duration-300`}>
        
        {/* Header Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-transparent backdrop-blur-sm">
            {props.customLogoUrl ? (
                <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-shinko-primary to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                        {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white truncate">
                        {props.orgName || 'Shinkō OS'}
                    </span>
                </div>
            )}
        </div>

        {/* Quick Action */}
        {!isClient && (
            <div className="p-4 pb-2 space-y-2">
                <button 
                    onClick={props.onOpenCreate}
                    className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <PlusCircle className="w-4 h-4" /> Novo Projeto
                </button>
                <button 
                    onClick={props.onOpenCreateTask}
                    className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                    <PlusCircle className="w-3 h-3" /> Tarefa Rápida
                </button>
            </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 mb-2">
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-shinko-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    onChange={(e) => props.onSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-shinko-primary/50 focus:border-shinko-primary outline-none transition-all shadow-sm"
                />
            </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-6">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="relative">
                    {idx > 0 && <div className="mx-2 mb-4 h-px bg-slate-200/50 dark:bg-white/5"></div>}
                    
                    {group.title && (
                        <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-80">
                            {group.title}
                        </h3>
                    )}
                    <div className="space-y-1">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full h-10 flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all group relative ${
                                    props.currentView === item.id 
                                    ? 'bg-white dark:bg-white/10 text-shinko-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10 font-bold' 
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 transition-colors ${props.currentView === item.id ? 'text-shinko-primary' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {props.currentView === item.id && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-shinko-primary shadow-glow"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* AI Counter (Visible for Free/Basic Plans) */}
        {!isClient && (
            <div className="px-4 pb-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                        <Sparkles className="w-3 h-3"/>
                        IA Créditos
                    </div>
                    <span className="text-xs font-mono text-purple-700 dark:text-purple-300">
                        {planLimits?.aiLimit >= 999999 ? '∞' : `${Math.max(0, (planLimits?.aiLimit || 0) - aiUsage)}/${planLimits?.aiLimit === 9999 ? '∞' : planLimits?.aiLimit}`}
                    </span>
                </div>
            </div>
        )}

        {/* Bottom Panel */}
        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={props.onToggleTheme}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors"
                >
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
                <span className="text-[9px] font-bold px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 uppercase tracking-wider border border-slate-200 dark:border-white/5">
                    v2.5 BETA
                </span>
            </div>

            <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-xl transition-colors group" 
                onClick={() => props.onChangeView('profile')}
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-900 ring-2 ring-white dark:ring-white/10 flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                    {props.userData?.avatar ? (
                        <img src={props.userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{props.userData?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-shinko-primary transition-colors">{props.userData?.name || 'Usuário'}</span>
                    <span className="text-slate-500 text-[10px] flex items-center gap-1 uppercase tracking-wide">
                        <span className={`w-1.5 h-1.5 rounded-full ${props.dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {props.userRole}
                    </span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    <LogOut className="w-4 h-4"/>
                </button>
            </div>
        </div>
    </div>
  );
};

export const MobileDrawer: React.FC<Props> = (props) => {
    const isClient = props.userRole === 'cliente';
    const isAdmin = props.userData.name === 'Pedro Borba';
    const menuGroups = getMenuGroups(props.userRole, isAdmin, props.currentPlan, props.userData?.email);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 flex items-center px-4 md:hidden z-50 gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => props.setIsMobileOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <Menu className="w-6 h-6"/>
                    </button>
                    <div className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {props.customLogoUrl ? (
                            <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-shinko-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <span className="tracking-tight">{props.orgName || 'Shinkō'}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Mobile Quick Add */}
                {!isClient && (
                    <button onClick={props.onOpenCreateTask} className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-600 dark:text-white">
                        <PlusCircle className="w-5 h-5"/>
                    </button>
                )}
            </div>

            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200 dark:border-white/10">
                        
                        <div className="p-6 pb-2 border-b border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Menu</span>
                                <button onClick={() => props.setIsMobileOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 bg-slate-100 dark:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
                            </div>

                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    onChange={(e) => props.onSearch(e.target.value)}
                                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-white/5 border-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-shinko-primary/50 transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-6 pt-4">
                            {menuGroups.map((group, idx) => (
                                <div key={idx}>
                                    {group.title && (
                                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                            {group.title}
                                        </h3>
                                    )}
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { props.onChangeView(item.id); props.setIsMobileOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                                    props.currentView === item.id 
                                                    ? 'bg-shinko-primary/10 text-shinko-primary border border-shinko-primary/20' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <item.icon className={`w-5 h-5 ${props.currentView === item.id ? 'text-shinko-primary' : 'text-slate-400'}`}/>
                                                {item.label}
                                                {props.currentView === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-3">
                            <button 
                                onClick={props.onToggleTheme}
                                className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                                {props.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                            </button>
                            
                            <button onClick={props.onLogout} className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-sm">
                                <LogOut className="w-4 h-4"/> Sair do Sistema
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};