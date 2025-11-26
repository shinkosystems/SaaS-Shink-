
import React from 'react';
import { 
  LayoutGrid, 
  List, 
  Calendar as CalendarIcon, 
  Plus, 
  LogOut, 
  Menu, 
  Settings,
  Search,
  Command,
  Trello,
  CheckSquare,
  GanttChartSquare,
  DollarSign,
  Users,
  Activity,
  Code2
} from 'lucide-react';

interface Props {
  currentView: 'dashboard' | 'list' | 'calendar' | 'profile' | 'settings' | 'search' | 'kanban' | 'gantt' | 'financial' | 'clients' | 'product' | 'dev-metrics';
  onChangeView: (view: 'dashboard' | 'list' | 'calendar' | 'profile' | 'settings' | 'search' | 'kanban' | 'gantt' | 'financial' | 'clients' | 'product' | 'dev-metrics') => void;
  onOpenCreate: () => void;
  onOpenCreateTask: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSearch?: (query: string) => void;
  theme: 'dark' | 'light';
  dbStatus: 'connected' | 'disconnected' | 'error';
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  userRole: string;
  userData?: { name: string, avatar: string | null };
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

// Glass Nav Item
const NavItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  badge,
  color,
  id
}: { 
  icon: any, 
  label: string, 
  isActive: boolean, 
  onClick: () => void,
  badge?: number,
  color: string,
  id?: string
}) => (
  <button
    id={id}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all duration-300 rounded-xl group mb-1 relative overflow-hidden border ${
      isActive 
        ? 'bg-white/20 dark:bg-white/10 border-white/20 dark:border-white/10 text-slate-900 dark:text-white shadow-sm' 
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/10 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
    }`}
  >
    {/* Active Glow Background */}
    {isActive && <div className={`absolute inset-0 opacity-10 dark:opacity-20 ${color} blur-xl`}></div>}

    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg relative z-10 transition-colors ${isActive ? `${color} text-white` : 'bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 text-slate-500 dark:text-slate-300'}`}>
        <Icon className="w-4 h-4" />
    </div>
    
    <span className={`flex-1 text-left relative z-10 ${isActive ? 'font-bold tracking-wide' : ''}`}>{label}</span>
    
    {badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold relative z-10 ${
            isActive 
            ? 'bg-white/50 dark:bg-white/20 text-slate-900 dark:text-white backdrop-blur-sm' 
            : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400'
        }`}>
            {badge}
        </span>
    )}
  </button>
);

const SidebarContent = ({ props }: { props: Props }) => (
  <div className="flex flex-col h-full">
    
    <div className="h-6"></div>

    {/* Glass Search Bar */}
    <div className="px-4 py-4">
        <div className="relative group">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-amber-500 dark:group-focus-within:text-white transition-colors" />
            <input 
                type="text" 
                onChange={(e) => props.onSearch && props.onSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-11 glass-input rounded-xl pl-10 pr-3 text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
            />
            <div className="absolute right-3 top-3.5 flex items-center opacity-30">
                <Command className="w-3 h-3 text-slate-400 dark:text-white" />
            </div>
        </div>
    </div>

    <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
      
      {/* Workspace Header */}
      <button 
        onClick={() => { props.onChangeView('profile'); props.setIsMobileOpen(false); }}
        className="w-full mb-8 flex items-center gap-4 px-3 py-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
      >
          <div className="relative">
             <div className="absolute inset-0 bg-amber-500 blur-md opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
             <img src={LOGO_URL} alt="Shinko" className="w-10 h-10 rounded-xl shadow-lg object-cover relative z-10" />
          </div>
          <div className="flex flex-col items-start">
              <span className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1 tracking-tight font-sans">Shink<span className="text-shinko-primary">ŌS</span></span>
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Workspace</span>
          </div>
      </button>

      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 px-4 mb-2 mt-4 uppercase tracking-widest">Menu Principal</div>
      
      {props.userRole !== 'cliente' && (
        <NavItem 
            icon={LayoutGrid} 
            label="Visão Geral" 
            color="bg-blue-600"
            isActive={props.currentView === 'dashboard'} 
            onClick={() => { props.onChangeView('dashboard'); props.setIsMobileOpen(false); }} 
        />
      )}
      <NavItem 
        icon={List} 
        label="Projetos" 
        color="bg-amber-600"
        isActive={props.currentView === 'list'} 
        onClick={() => { props.onChangeView('list'); props.setIsMobileOpen(false); }} 
      />
      <NavItem 
        id="nav-kanban-btn"
        icon={Trello} 
        label="Kanban" 
        color="bg-purple-600"
        isActive={props.currentView === 'kanban'} 
        onClick={() => { props.onChangeView('kanban'); props.setIsMobileOpen(false); }} 
      />
      <NavItem 
        icon={GanttChartSquare} 
        label="Gantt" 
        color="bg-teal-600"
        isActive={props.currentView === 'gantt'} 
        onClick={() => { props.onChangeView('gantt'); props.setIsMobileOpen(false); }} 
      />
      <NavItem 
        icon={CalendarIcon} 
        label="Cronograma" 
        color="bg-red-600"
        isActive={props.currentView === 'calendar'} 
        onClick={() => { props.onChangeView('calendar'); props.setIsMobileOpen(false); }} 
        badge={3}
      />

      {props.userRole !== 'cliente' && (
        <>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 px-4 mb-2 mt-6 uppercase tracking-widest">Gestão</div>
            
            <NavItem 
                icon={Users} 
                label="Clientes" 
                color="bg-indigo-600"
                isActive={props.currentView === 'clients'} 
                onClick={() => { props.onChangeView('clients'); props.setIsMobileOpen(false); }} 
            />

            {props.userRole === 'dono' && (
                <>
                    <NavItem 
                        icon={DollarSign} 
                        label="Financeiro" 
                        color="bg-emerald-600"
                        isActive={props.currentView === 'financial'} 
                        onClick={() => { props.onChangeView('financial'); props.setIsMobileOpen(false); }} 
                    />
                    <NavItem 
                        icon={Activity} 
                        label="Produto" 
                        color="bg-pink-600"
                        isActive={props.currentView === 'product'} 
                        onClick={() => { props.onChangeView('product'); props.setIsMobileOpen(false); }} 
                    />
                    <NavItem 
                        icon={Code2} 
                        label="Engenharia" 
                        color="bg-cyan-600"
                        isActive={props.currentView === 'dev-metrics'} 
                        onClick={() => { props.onChangeView('dev-metrics'); props.setIsMobileOpen(false); }} 
                    />
                </>
            )}
        </>
      )}

      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 px-4 mb-2 mt-6 uppercase tracking-widest">Sistema</div>
      
       <NavItem 
        icon={Settings} 
        label="Ajustes" 
        color="bg-slate-600"
        isActive={props.currentView === 'settings'} 
        onClick={() => { props.onChangeView('settings'); props.setIsMobileOpen(false); }} 
      />

      {props.userRole !== 'cliente' && (
        <div className="mt-auto pt-6 pb-6 space-y-3">
            <button 
                onClick={() => { props.onOpenCreateTask(); props.setIsMobileOpen(false); }}
                className="w-full h-12 flex items-center justify-center gap-2 glass-button text-slate-600 dark:text-slate-300 p-2 rounded-xl text-sm font-bold transition-all active:scale-95 hover:bg-white/10 dark:hover:bg-white/5"
            >
                <CheckSquare className="w-4 h-4" />
                <span>Nova Tarefa</span>
            </button>
        </div>
      )}
    </div>

    {/* Profile Footer Glass */}
    <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-xl mx-3 mb-3 rounded-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 cursor-pointer w-full" onClick={() => props.onChangeView('profile')}>
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-900 ring-1 ring-black/5 dark:ring-white/20 flex items-center justify-center text-slate-700 dark:text-white text-xs font-bold shadow-lg overflow-hidden">
                 {props.userData?.avatar ? (
                     <img src={props.userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                     <span>{props.userData?.name?.charAt(0).toUpperCase() || 'U'}</span>
                 )}
             </div>
             <div className="flex flex-col min-w-0 flex-1">
                 <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-glow">{props.userData?.name || 'Usuário'}</span>
                 <span className="text-slate-500 text-[10px] flex items-center gap-1 uppercase tracking-wide">
                     <span className={`w-1.5 h-1.5 rounded-full ${props.dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-amber-500'}`}></span>
                     {props.userRole}
                 </span>
             </div>
        </div>
        <button 
            onClick={props.onLogout}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
            <LogOut className="w-4 h-4" />
        </button>
    </div>
  </div>
);

export const Sidebar = (props: Props) => {
  return (
    <aside className="hidden lg:block w-[270px] h-full flex-shrink-0 z-30 relative">
      {/* Ultra Glassmorphism Sidebar Background */}
      <div className="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[50px] saturate-150 border-r border-white/20 dark:border-white/5 shadow-[5px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[5px_0_30px_rgba(0,0,0,0.5)]"></div>
      <div className="relative h-full z-10 flex flex-col">
        <SidebarContent props={props} />
      </div>
    </aside>
  );
};

export const MobileDrawer = (props: Props) => {
  const userInitial = props.userData?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <>
       <header className="lg:hidden h-16 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => props.setIsMobileOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Shink<span className="text-amber-500">ŌS</span></span>
          </div>
          
          <button 
            onClick={() => props.onChangeView('profile')}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 ring-1 ring-black/5 dark:ring-white/20 overflow-hidden flex items-center justify-center"
          >
              {props.userData?.avatar ? (
                  <img src={props.userData.avatar} alt="User" className="w-full h-full object-cover"/>
              ) : (
                  <span className="text-slate-700 dark:text-white font-bold text-sm">{userInitial}</span>
              )}
          </button>
       </header>

       {props.isMobileOpen && (
         <div className="fixed inset-0 z-50 flex lg:hidden">
           <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
             onClick={() => props.setIsMobileOpen(false)}
           ></div>
           
           <div className="relative w-[280px] h-full bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl animate-ios-slide-right flex flex-col">
              <SidebarContent props={props} />
           </div>
         </div>
       )}
    </>
  );
};
