
import React from 'react';
import { 
    LayoutDashboard, List, Calendar, User, Settings, Search, 
    PlusCircle, LogOut, Sun, Moon, CreditCard, ChevronRight,
    Menu, X, Briefcase, BarChart3, Code2, Users, DollarSign,
    Shield
} from 'lucide-react';

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
  userData: { name: string, avatar: string | null };
  currentPlan?: string;
  customLogoUrl?: string | null;
  orgName?: string;
}

export const Sidebar: React.FC<Props> = (props) => {
  const isClient = props.userRole === 'cliente';
  const isAdmin = props.userData.name === 'Pedro Borba'; // Hardcoded for demo/specific user logic

  const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'list', label: 'Projetos', icon: List },
      { id: 'kanban', label: 'Tarefas', icon: Briefcase },
      { id: 'calendar', label: 'Cronograma', icon: Calendar },
      ...( !isClient ? [
          { id: 'financial', label: 'Financeiro', icon: DollarSign },
          { id: 'clients', label: 'Clientes', icon: Users },
          { id: 'product', label: 'Métricas Produto', icon: BarChart3 },
          { id: 'dev-metrics', label: 'Engenharia', icon: Code2 },
      ] : []),
      { id: 'settings', label: 'Configurações', icon: Settings },
      ...( isAdmin ? [{ id: 'admin-manager', label: 'Super Admin', icon: Shield }] : [])
  ];

  return (
    <div className={`hidden xl:flex flex-col w-64 h-full border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0 transition-all duration-300`}>
        
        {/* Header Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-white/5">
            {props.customLogoUrl ? (
                <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-shinko-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                        {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white truncate">
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
                    className="w-full h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <PlusCircle className="w-4 h-4" /> Novo Projeto
                </button>
                <button 
                    onClick={props.onOpenCreateTask}
                    className="w-full h-10 bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                    <PlusCircle className="w-3 h-3" /> Tarefa Rápida
                </button>
            </div>
        )}

        {/* Search */}
        <div className="px-4 py-2">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    onChange={(e) => props.onSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-100 dark:bg-white/5 border-none text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-shinko-primary outline-none transition-all"
                />
            </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
            {menuItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => props.onChangeView(item.id)}
                    className={`w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all ${
                        props.currentView === item.id 
                        ? 'bg-white dark:bg-white/10 text-shinko-primary shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <item.icon className={`w-4 h-4 ${props.currentView === item.id ? 'text-shinko-primary' : 'text-slate-400'}`} />
                    {item.label}
                    {props.currentView === item.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50"/>}
                </button>
            ))}
        </div>

        {/* Bottom Panel */}
        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={props.onToggleTheme}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors"
                >
                    {props.theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
                </button>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-slate-500 uppercase tracking-wider">
                    v2.5 Beta
                </span>
            </div>

            <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-xl transition-colors" 
                onClick={() => props.onChangeView('profile')}
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-900 ring-1 ring-white/10 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {props.userData?.avatar ? (
                        <img src={props.userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{props.userData?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{props.userData?.name || 'Usuário'}</span>
                    <span className="text-slate-500 text-[10px] flex items-center gap-1 uppercase tracking-wide">
                        <span className={`w-1.5 h-1.5 rounded-full ${props.dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {props.userRole}
                    </span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); props.onLogout(); }} className="text-slate-400 hover:text-red-500">
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

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'list', label: 'Projetos', icon: List },
        { id: 'kanban', label: 'Tarefas', icon: Briefcase },
        { id: 'calendar', label: 'Cronograma', icon: Calendar },
        ...( !isClient ? [
            { id: 'financial', label: 'Financeiro', icon: DollarSign },
            { id: 'clients', label: 'Clientes', icon: Users },
            { id: 'product', label: 'Métricas Produto', icon: BarChart3 },
            { id: 'dev-metrics', label: 'Engenharia', icon: Code2 },
        ] : []),
        { id: 'settings', label: 'Configurações', icon: Settings },
        ...( isAdmin ? [{ id: 'admin-manager', label: 'Super Admin', icon: Shield }] : [])
    ];

    return (
        <>
            {/* Always visible Header on Mobile to prevent layout jumps */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 flex items-center px-4 xl:hidden z-50 gap-3">
                <button onClick={() => props.setIsMobileOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <Menu className="w-6 h-6"/>
                </button>
                <div className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    {props.customLogoUrl ? (
                        <img src={props.customLogoUrl} alt="Logo" className="h-8 object-contain" />
                    ) : (
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 bg-shinko-primary rounded-lg flex items-center justify-center text-white font-bold">
                                {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                             </div>
                             <span>{props.orgName || 'Shinkō'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Full Screen Overlay Menu */}
            {props.isMobileOpen && (
                <div className="fixed inset-0 z-[100] xl:hidden">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => props.setIsMobileOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-white/5">
                        
                        {/* Drawer Header - Logo Prominent */}
                        <div className="p-6 pb-2">
                            <div className="flex justify-between items-start mb-8">
                                {props.customLogoUrl ? (
                                    <img src={props.customLogoUrl} alt="Logo" className="h-12 object-contain" />
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-shinko-primary to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-amber-500/20">
                                            {props.orgName ? props.orgName.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                        <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white">
                                            {props.orgName || 'Shinkō OS'}
                                        </span>
                                    </div>
                                )}
                                <button onClick={() => props.setIsMobileOpen(false)} className="text-slate-400 hover:text-white p-1 bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
                            </div>

                            {/* Create Button */}
                            {!isClient && (
                                <div className="mb-6 space-y-3">
                                    <button onClick={() => { props.onOpenCreate(); props.setIsMobileOpen(false); }} className="w-full h-12 bg-white text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                                        <PlusCircle className="w-5 h-5" /> Novo Projeto
                                    </button>
                                    <button onClick={() => { props.onOpenCreateTask(); props.setIsMobileOpen(false); }} className="w-full h-10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                        <PlusCircle className="w-4 h-4" /> Tarefa Rápida
                                    </button>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    onChange={(e) => props.onSearch(e.target.value)}
                                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-white/5 border-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-shinko-primary transition-all"
                                />
                            </div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { props.onChangeView(item.id); props.setIsMobileOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                        props.currentView === item.id 
                                        ? 'bg-white/10 text-shinko-primary' 
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${props.currentView === item.id ? 'text-shinko-primary' : 'text-slate-500'}`}/>
                                    {item.label}
                                    {props.currentView === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50"/>}
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { props.onChangeView('profile'); props.setIsMobileOpen(false); }}>
                                <div className="w-10 h-10 rounded-full bg-slate-800 ring-1 ring-white/10 overflow-hidden">
                                    {props.userData?.avatar ? (
                                        <img src={props.userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-slate-700 to-slate-800">
                                            {props.userData?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white text-sm">{props.userData?.name}</span>
                                    <span className="text-xs text-slate-500 capitalize">{props.userRole}</span>
                                </div>
                            </div>
                            <button onClick={props.onLogout} className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl transition-colors text-sm">
                                <LogOut className="w-4 h-4"/> Sair do Sistema
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
