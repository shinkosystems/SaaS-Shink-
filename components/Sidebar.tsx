
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

const getMenuGroups = (userRole: string, isAdmin: boolean, currentPlan: string = 'plan_free', userEmail?: string, activeModules: string[] = []) => {
    const isMaster = userEmail === 'peboorba@gmail.com';

    // Layout Unificado Shinkō: Todos os usuários veem tudo
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
        },
        {
            title: 'Inteligência',
            items: [
                { id: 'product', label: 'Métricas Produto', icon: BarChart3 },
                { id: 'dev-metrics', label: 'Engenharia', icon: Code2 }
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
  const isMaster = props.userData.email === 'peboorba@gmail.com';
  const isAdmin = isMaster;
  const menuGroups = getMenuGroups(props.userRole, isAdmin, props.currentPlan, props.userData?.email, props.activeModules);
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
  }, []);

  return (
    <div className={`hidden md:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0 transition-all duration-300`}>
        
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-transparent backdrop-blur-sm relative z-20">
            {props.customLogoUrl ? (
                <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain max-w-[140px]" />
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-shinko-primary to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                        {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white truncate max-w-[100px]">
                        {props.orgName || 'Shinkō OS'}
                    </span>
                </div>
            )}
            
            <button 
                type="button"
                onClick={props.onOpenFeedback}
                title="Sugerir Melhoria"
                className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black shadow-glow-amber hover:scale-110 transition-all relative z-50 cursor-pointer animate-pulse group"
            >
                <Lightbulb className="w-5 h-5 stroke-[2.5px] group-hover:rotate-12 transition-transform"/>
            </button>
        </div>

        <div className="p-4 pb-2 space-y-2">
            <button onClick={props.onOpenCreate} className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                <PlusCircle className="w-4 h-4" /> Novo Projeto
            </button>
            <button onClick={props.onOpenCreateTask} className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <PlusCircle className="w-3 h-3" /> Tarefa Rápida
            </button>
        </div>

        <div className="px-4 py-2 mb-2">
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-shinko-primary transition-colors" />
                <input type="text" placeholder="Buscar..." onChange={(e) => props.onSearch(e.target.value)} className="w-full h-9 pl-9 pr-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-shinko-primary/50 outline-none transition-all shadow-sm"/>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-6 mt-2">
            {menuGroups.map((group, idx) => (
                <div key={idx} className="relative">
                    {group.title && <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-80">{group.title}</h3>}
                    <div className="space-y-1">
                        {group.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => props.onChangeView(item.id)}
                                className={`w-full h-10 flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all group relative ${props.currentView === item.id ? 'bg-white dark:bg-white/10 text-shinko-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10 font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <item.icon className={`w-4 h-4 transition-colors ${props.currentView === item.id ? 'text-shinko-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <span className="flex-1 text-left">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
                <button onClick={props.onToggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500">
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
                <span className="text-[9px] font-bold px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 uppercase">v2.5</span>
            </div>

            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-xl group" onClick={() => props.onChangeView('profile')}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-900 ring-2 ring-white dark:ring-white/10 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {props.userData?.avatar ? <img src={props.userData.avatar} className="w-full h-full object-cover" /> : <span>{props.userData?.name?.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-shinko-primary">{props.userData?.name || 'Usuário'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-slate-400 hover:text-red-500 p-1.5"><LogOut className="w-4 h-4"/></button>
            </div>
        </div>
    </div>
  );
};
