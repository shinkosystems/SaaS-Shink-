
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Opportunity, RDEStatus, Archetype, IntensityLevel, BpmnTask, BpmnNode, ProjectStatus } from './types';
import OpportunityWizard from './components/OpportunityWizard';
import OpportunityDetail from './components/OpportunityDetail';
import { ProjectWorkspace } from './components/ProjectWorkspace'; // Import new component
import MatrixChart from './components/MatrixChart';
import { CalendarView } from './components/CalendarView';
import { KanbanBoard } from './components/KanbanBoard';
import { GanttView } from './components/GanttView';
import { FinancialScreen } from './components/FinancialScreen';
import { ClientsScreen } from './components/ClientsScreen';
import { ProductIndicators } from './components/ProductIndicators'; 
import { DevIndicators } from './components/DevIndicators';
import AuthScreen from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { Sidebar, MobileDrawer } from './components/Navigation';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { QuickTaskModal } from './components/QuickTaskModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from './services/opportunityService';
import { createTask, createProject } from './services/projectService';
import { supabase } from './services/supabaseClient';
import { Loader2, Rocket, AlertTriangle, CheckCircle, PlayCircle, Clock, Flame, Snowflake, AlertCircle, Lock, ArrowDownRight, List as ListIcon, Search, Hash, XCircle, ShieldCheck, Sparkles, Plus, Filter, Target, Trash2 } from 'lucide-react';
import { OnboardingGuide } from './components/OnboardingGuide';
import { logEvent } from './services/analyticsService';
import { NpsSurvey } from './components/NpsSurvey';

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

// --- RICH MOCK DATA GENERATOR ---
const generateDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
};

const MOCK_DATA: Opportunity[] = [
  {
    id: '1',
    title: 'Shinkō Auto-Fiscal',
    description: 'Automação de notas fiscais para varejo usando IA e OCR avançado. Reduz o tempo de processamento em 90%.',
    rde: RDEStatus.HOT,
    viability: 5, velocity: 4, revenue: 5, prioScore: 4.65,
    archetype: Archetype.SAAS_VERTICAL, intensity: IntensityLevel.L3,
    tads: { scalability: true, integration: true, painPoint: true, recurring: true, mvpSpeed: true },
    tadsScore: 10,
    evidence: { clientsAsk: ['3 clientes citaram multas por atraso'], clientsSuffer: ['Processo manual demora 4h/dia'], wontPay: [] },
    status: 'Active',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    priorityLock: true,
    organizationId: 3,
    bpmn: {
        lanes: [{id: 'l1', label: 'Dev Team'}, {id: 'l2', label: 'QA'}],
        nodes: [
            {
                id: 'n1', label: 'Ingestão de NF-e', laneId: 'l1', type: 'task', checklist: [
                    { id: 't1', displayId: 10234, text: 'Configurar Webhook Receita', completed: true, status: 'done', estimatedHours: 4, assignee: 'Pedro', dueDate: generateDate(-1), completedAt: generateDate(-1) },
                    { id: 't2', displayId: 10235, text: 'Parser XML v2', completed: false, status: 'doing', estimatedHours: 8, assignee: 'Gustavo', dueDate: generateDate(2), startDate: generateDate(0) }
                ]
            },
            {
                id: 'n2', label: 'Validação IA', laneId: 'l1', type: 'task', checklist: [
                    { id: 't3', displayId: 10240, text: 'Treinar Modelo OCR', completed: false, status: 'todo', estimatedHours: 12, assignee: 'Pedro', dueDate: generateDate(5) }
                ]
            }
        ],
        edges: []
    }
  },
];

const App: React.FC = () => {
  // Auth & User State
  const [isAuthChecking, setIsAuthChecking] = useState(true); 
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('colaborador');
  const [userData, setUserData] = useState<{name: string, avatar: string | null}>({ name: 'Usuário', avatar: null });
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false); 

  // Data & UI State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [editingOpp, setEditingOpp] = useState<Partial<Opportunity> | undefined>(undefined);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);

  const [view, setView] = useState<'dashboard' | 'list' | 'calendar' | 'profile' | 'settings' | 'search' | 'kanban' | 'gantt' | 'financial' | 'clients' | 'product' | 'dev-metrics' | 'project-detail'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilterStatus, setListFilterStatus] = useState<ProjectStatus | 'All'>('All');
  
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- THEME EFFECT (FIX DARK MODE) ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- DATA LOADING FUNCTION ---
  const loadAppData = useCallback(async () => {
      if (!session && !isGuest) return;
      
      setIsLoading(true);
      let currentRole = 'colaborador';
      let currentName = 'Usuário';
      let currentAvatar = null;
      let currentUserId = null;
      let currentOrgId: number | null = null;

      try {
          if (session?.user) {
              currentUserId = session.user.id;
              const { data: profile } = await supabase.from('users').select('perfil, nome, organizacao').eq('id', currentUserId).maybeSingle();
              if (profile) {
                  currentRole = profile.perfil;
                  currentName = profile.nome;
                  currentOrgId = profile.organizacao;
              } else {
                  currentName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
                  currentOrgId = session.user.user_metadata?.org_id;
                  currentRole = session.user.user_metadata?.role || 'colaborador';
              }
              currentAvatar = session.user.user_metadata?.avatar_url || null;
          } 
          if (isGuest) currentOrgId = 3;

          setUserOrgId(currentOrgId);
          if (session?.user) {
              setUserRole(currentRole);
              setUserData({ name: currentName, avatar: currentAvatar });
              
              if (currentRole === 'cliente') {
                  setView('list');
              } else if (view === 'list' && currentRole !== 'cliente') {
                  setView('dashboard');
              }
          }

          if (isGuest) {
               await new Promise(r => setTimeout(r, 800));
               setOpportunities(MOCK_DATA);
               setDbStatus('disconnected');
               setIsLoading(false);
               setShowOnboarding(true);
               return;
          }

          const dataTimeout = new Promise<null>(r => setTimeout(() => r(null), 4000));
          const fetchPromise = fetchOpportunities();
          const allOpps = await Promise.race([fetchPromise, dataTimeout]);

          if (allOpps !== null) {
              let filteredOpps = allOpps;
              if (currentOrgId) {
                  filteredOpps = allOpps.filter(opp => (opp.organizationId || 3) === currentOrgId);
              }
              if (currentRole === 'cliente' && currentUserId) {
                  filteredOpps = filteredOpps.filter(opp => opp.clientId === currentUserId);
              }
              setOpportunities(filteredOpps);
              setDbStatus('connected');
          } else {
              setOpportunities(MOCK_DATA);
              setDbStatus('error'); 
          }
      } catch (error) {
          console.warn("Data Load Exception:", error);
          setOpportunities(MOCK_DATA);
          setDbStatus('error');
      } finally {
          setIsLoading(false);
      }
  }, [session, isGuest]);

  // --- AUTH & DATA LOADING EFFECTS ---
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
        const safetyTimeout = setTimeout(() => {
            if (mounted && isAuthChecking) setIsAuthChecking(false);
        }, 3000);

        try {
            const { data: { session: activeSession } } = await supabase.auth.getSession();
            if (mounted && activeSession) {
                setSession(activeSession);
                setIsLoginModalOpen(false);
            }
        } catch (e) {
            console.error("Auth Check Error", e);
        } finally {
            clearTimeout(safetyTimeout);
            if (mounted) setIsAuthChecking(false);
        }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!mounted) return;
        
        if (event === 'PASSWORD_RECOVERY') {
            setShowResetPasswordModal(true);
        }

        if (event === 'SIGNED_IN' && newSession) {
             setSession(newSession);
             setIsLoginModalOpen(false);
             setIsAuthChecking(false); 
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setIsAuthChecking(false);
        }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); 

  useEffect(() => {
    if (isAuthChecking) return;
    if (!session && !isGuest) {
        setIsLoading(false);
        return;
    }
    loadAppData();
  }, [session, isGuest, isAuthChecking, loadAppData]);

  const handleLogoff = async () => {
    setIsLoading(true);
    await logEvent('feature_use', { feature: 'logout' });
    try { await supabase.auth.signOut(); } catch (err) {}
    localStorage.clear();
    sessionStorage.clear();
    setSession(null);
    setIsGuest(false);
    setUserRole('colaborador');
    setUserData({ name: 'Usuário', avatar: null });
    setUserOrgId(null);
    setOpportunities([]); 
    setView('dashboard');
    setIsLoginModalOpen(false);
    setIsLoading(false);
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSearch = (query: string) => {
      setSearchQuery(query);
      if (query.trim().length > 0) setView('search');
      else if (view === 'search') setView(userRole === 'cliente' ? 'list' : 'dashboard');
  };

  const handleDashboardCardClick = (status: ProjectStatus | 'All') => {
      setListFilterStatus(status);
      setView('list');
  };

  const handleOpenProject = (opp: Opportunity) => {
      setSelectedOpp(opp);
      setView('project-detail');
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return opportunities.filter(opp => {
        if (opp.title.toLowerCase().includes(q)) return true;
        if (opp.description?.toLowerCase().includes(q)) return true;
        return opp.bpmn?.nodes.some(node => node.checklist.some(task => task.text.toLowerCase().includes(q)));
    }).map(opp => {
        const matchedTasks: BpmnTask[] = [];
        if (opp.bpmn) {
            opp.bpmn.nodes.forEach(node => {
                node.checklist.forEach(task => {
                     if (task.text.toLowerCase().includes(q)) matchedTasks.push(task);
                });
            });
        }
        return { ...opp, matchedTasks };
    });
  }, [opportunities, searchQuery]);

  const handleSaveQuickTask = async (task: BpmnTask, projectId: string | null) => {
      setIsLoading(true);
      try {
          const projId = projectId && projectId !== "" ? parseInt(projectId) : null;

          const payload = {
              projeto: projId, 
              titulo: task.text,
              descricao: task.description || '',
              status: task.status || 'todo',
              responsavel: task.assigneeId,
              duracaohoras: task.estimatedHours || 2,
              datainicio: new Date().toISOString(),
              datafim: task.dueDate, 
              deadline: task.dueDate,
              dataproposta: task.dueDate,
              gravidade: task.gut?.g || 1,
              urgencia: task.gut?.u || 1,
              tendencia: task.gut?.t || 1,
              organizacao: userOrgId || 3,
              sutarefa: false
          };

          await createTask(payload);
          await loadAppData(); 
          setIsQuickTaskOpen(false);
          alert("Tarefa criada com sucesso!");
          
          logEvent('feature_use', { feature: 'Quick Task Created' });

      } catch (err: any) {
          console.error("Erro ao criar tarefa rápida:", err);
          alert("Erro ao salvar tarefa: " + (err.message || "Erro desconhecido"));
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveOpportunity = async (opp: Opportunity) => {
      setIsLoading(true);
      try {
          const isEditing = opportunities.some(o => o.id === opp.id);
          
          let result: Opportunity | null = null;

          if (isEditing) {
              result = await updateOpportunity(opp);
          } else {
              result = await createOpportunity(opp);
          }

          if (result) {
              if (isEditing) {
                  setOpportunities(prev => prev.map(o => o.id === result!.id ? result! : o));
                  if (selectedOpp?.id === result.id) {
                      setSelectedOpp(result);
                  }
              } else {
                  setOpportunities(prev => [result!, ...prev]);
              }
              
              setIsWizardOpen(false);
              setEditingOpp(undefined);
              
              logEvent('feature_use', { feature: 'Save Opportunity', type: isEditing ? 'edit' : 'create' });
          } else {
              alert("Erro ao salvar o projeto. Verifique os dados e tente novamente.");
          }
      } catch (err) {
          console.error("Erro ao salvar oportunidade:", err);
          alert("Erro inesperado ao salvar.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteOpportunity = async (id: string) => {
      setIsLoading(true);
      try {
          const success = await deleteOpportunity(id);
          if (success) {
              setOpportunities(prev => prev.filter(o => o.id !== id));
              setSelectedOpp(null);
              if (view === 'project-detail') setView('list');
              logEvent('feature_use', { feature: 'Delete Project' });
          } else {
              alert("Não foi possível excluir o projeto. Tente novamente.");
          }
      } catch (err) {
          console.error(err);
          alert("Erro ao excluir projeto.");
      } finally {
          setIsLoading(false);
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-500 text-white shadow-emerald-500/30';
          case 'Negotiation': return 'bg-blue-500 text-white shadow-blue-500/30';
          case 'Future': return 'bg-amber-500 text-white shadow-amber-500/30';
          case 'Frozen': return 'bg-cyan-500 text-white shadow-cyan-500/30';
          case 'Archived': return 'bg-slate-500 text-white shadow-slate-500/30';
          default: return 'bg-slate-500 text-white';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'Active': return 'Ativo';
          case 'Negotiation': return 'Negociação';
          case 'Future': return 'Backlog';
          case 'Frozen': return 'Congelado';
          case 'Archived': return 'Arquivado';
          default: return status;
      }
  };

  if (isAuthChecking) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-black">
              <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 blur-[80px] opacity-30 animate-pulse rounded-full"></div>
                  <img src={LOGO_URL} className="w-24 h-24 relative z-10 animate-bounce" alt="Loading"/>
              </div>
          </div>
      );
  }

  if (!session && !isGuest) {
    return (
        <>
            <LandingPage onEnter={() => setIsLoginModalOpen(true)} />
            {isLoginModalOpen && (
                <AuthScreen 
                    onClose={() => setIsLoginModalOpen(false)}
                    onGuestLogin={(persona) => {
                        setIsGuest(true);
                        setIsLoginModalOpen(false);
                        if (persona) {
                            setUserData({ name: persona.name, avatar: persona.avatar || null });
                            setUserRole(persona.role);
                            if (persona.role === 'cliente') setView('list');
                            setUserOrgId(3);
                            logEvent('login', { method: 'guest' });
                        }
                    }} 
                />
            )}
            {showResetPasswordModal && (
                <ResetPasswordModal onClose={() => setShowResetPasswordModal(false)} />
            )}
        </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden selection:bg-amber-500/30">
      <OnboardingGuide run={showOnboarding} onFinish={() => setShowOnboarding(false)} />
      <NpsSurvey userId={session?.user?.id} userRole={userRole} />

      {showResetPasswordModal && (
          <ResetPasswordModal onClose={() => setShowResetPasswordModal(false)} />
      )}

      <Sidebar 
        currentView={view} 
        onChangeView={setView} 
        onOpenCreate={() => { setEditingOpp(undefined); setIsWizardOpen(true); }}
        onOpenCreateTask={() => setIsQuickTaskOpen(true)}
        onToggleTheme={toggleTheme}
        onLogout={handleLogoff}
        onSearch={handleSearch}
        theme={theme}
        dbStatus={dbStatus}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        userRole={userRole}
        userData={userData}
      />

      <MobileDrawer 
         currentView={view} 
         onChangeView={setView} 
         onOpenCreate={() => setIsWizardOpen(true)}
         onOpenCreateTask={() => setIsQuickTaskOpen(true)}
         onToggleTheme={toggleTheme}
         onLogout={handleLogoff}
         theme={theme}
         dbStatus={dbStatus}
         isMobileOpen={isMobileMenuOpen}
         setIsMobileOpen={setIsMobileMenuOpen}
         userRole={userRole}
         userData={userData}
      />

      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        <div className={`flex-1 relative h-full ${view === 'project-detail' ? '' : 'overflow-y-auto p-6 md:p-10 custom-scrollbar'}`}>
            {view === 'dashboard' && userRole !== 'cliente' && (
                <div className="text-white animate-in fade-in duration-500">
                    <h1 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Dashboard</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div onClick={() => handleDashboardCardClick('Active')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                            <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Sprint Atual</h3>
                            <div className="text-4xl font-black text-emerald-500">{opportunities.filter(o => o.status === 'Active').length}</div>
                            <span className="text-slate-400 text-xs">Projetos Ativos</span>
                        </div>
                        <div onClick={() => handleDashboardCardClick('Negotiation')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                            <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Comercial</h3>
                            <div className="text-4xl font-black text-blue-500">{opportunities.filter(o => o.status === 'Negotiation').length}</div>
                            <span className="text-slate-400 text-xs">Em Negociação</span>
                        </div>
                        <div onClick={() => handleDashboardCardClick('Future')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                            <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Pipeline</h3>
                            <div className="text-4xl font-black text-amber-500">{opportunities.filter(o => o.status === 'Future').length}</div>
                            <span className="text-slate-400 text-xs">Backlog Futuro</span>
                        </div>
                    </div>
                    <div className="mt-8 h-96">
                        <MatrixChart data={opportunities} onClick={handleOpenProject} theme={theme} />
                    </div>
                </div>
            )}
            
            {view === 'list' && (
                <div className="h-full flex flex-col animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projetos</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seu portfólio de inovação e demandas.</p>
                        </div>
                        {userRole !== 'cliente' && (
                            <button
                                onClick={() => { setEditingOpp(undefined); setIsWizardOpen(true); }}
                                id="btn-new-project-list"
                                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2 hover:brightness-110"
                            >
                                <Plus className="w-5 h-5"/> Novo Projeto
                            </button>
                        )}
                    </div>

                    {/* Filters Toolbar */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar items-center">
                        <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0"/>
                        {['All', 'Active', 'Negotiation', 'Future', 'Frozen', 'Archived'].map(status => {
                            const isActive = listFilterStatus === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setListFilterStatus(status as any)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        isActive 
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' 
                                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {status === 'All' ? 'Todos' : getStatusLabel(status)}
                                </button>
                            )
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 pb-20">
                        {opportunities
                            .filter(o => listFilterStatus === 'All' || o.status === listFilterStatus)
                            .map(opp => (
                            <div key={opp.id} onClick={() => handleOpenProject(opp)} className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/5 transition-all border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md group relative overflow-hidden">
                                {/* Status Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${opp.status === 'Active' ? 'bg-emerald-500' : opp.status === 'Negotiation' ? 'bg-blue-500' : opp.status === 'Future' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                                
                                {userRole !== 'cliente' && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(window.confirm(`ATENÇÃO: Deseja excluir o projeto "${opp.title}"?\n\nIsso excluirá permanentemente:\n1. Todas as tarefas e subtarefas associadas.\n2. O projeto em si.\n\nEsta ação não pode ser desfeita.`)) {
                                                    handleDeleteOpportunity(opp.id);
                                                }
                                            }}
                                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors shadow-sm"
                                            title="Excluir Projeto e Tarefas"
                                         >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between items-start pl-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-shinko-primary transition-colors">{opp.title}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${getStatusColor(opp.status)}`}>
                                                {getStatusLabel(opp.status)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">{opp.description}</p>
                                        
                                        <div className="flex items-center gap-4 mt-4">
                                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                                                <Rocket className="w-3 h-3"/> {opp.archetype}
                                            </div>
                                            {opp.prioScore > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                                                    <Target className="w-3 h-3 text-amber-500"/> Score: {opp.prioScore.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col items-end gap-2">
                                        <span className="text-xs text-slate-400">{new Date(opp.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {opportunities.filter(o => listFilterStatus === 'All' || o.status === listFilterStatus).length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <ListIcon className="w-12 h-12 mx-auto mb-4 text-slate-400"/>
                                <p className="text-slate-500">Nenhum projeto encontrado com este status.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'project-detail' && selectedOpp && (
                <ProjectWorkspace 
                    opportunity={selectedOpp}
                    onBack={() => { setSelectedOpp(null); setView('list'); }}
                    onEdit={(opp) => { setEditingOpp(opp); setIsWizardOpen(true); }}
                    onDelete={handleDeleteOpportunity}
                    onUpdate={(updatedOpp) => {
                        setOpportunities(prev => prev.map(o => o.id === updatedOpp.id ? updatedOpp : o));
                        setSelectedOpp(updatedOpp);
                    }}
                    userRole={userRole}
                />
            )}

            {view === 'kanban' && <KanbanBoard onSelectOpportunity={handleOpenProject} userRole={userRole} />}
            {view === 'calendar' && <CalendarView opportunities={opportunities} onSelectOpportunity={handleOpenProject} onTaskUpdate={() => {}} userRole={userRole} onRefresh={loadAppData} />}
            {view === 'gantt' && <GanttView opportunities={opportunities} onSelectOpportunity={handleOpenProject} onTaskUpdate={() => {}} userRole={userRole} />}
            
            {/* Restricted Views */}
            {view === 'financial' && userRole === 'dono' && <FinancialScreen />}
            {view === 'clients' && <ClientsScreen userRole={userRole} />}
            {view === 'product' && userRole === 'dono' && <ProductIndicators />}
            {view === 'dev-metrics' && userRole === 'dono' && <DevIndicators />}
            
            {/* Access Denied Message */}
            {(view === 'financial' || view === 'product' || view === 'dev-metrics') && userRole !== 'dono' && (
                <div className="flex h-full items-center justify-center flex-col gap-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-red-500"/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
                    <p className="text-slate-500 text-sm max-w-xs text-center">
                        Esta área é exclusiva para o perfil de Dono. Contate o administrador do workspace.
                    </p>
                </div>
            )}

            {view === 'settings' && <SettingsScreen theme={theme} onToggleTheme={toggleTheme} />}
            {view === 'profile' && <ProfileScreen />}
            {view === 'search' && (
                <div className="space-y-4 animate-in fade-in">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Resultados da Busca: "{searchQuery}"</h1>
                    {searchResults.length === 0 && <p className="text-slate-500">Nenhum resultado encontrado.</p>}
                    {searchResults.map(res => (
                        <div key={res.id} className="glass-card p-6 rounded-xl border border-white/10 bg-white/5 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg cursor-pointer hover:text-amber-500" onClick={() => handleOpenProject(res)}>{res.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{res.description}</p>
                            {res.matchedTasks && res.matchedTasks.length > 0 && (
                                <div className="space-y-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Tarefas Encontradas:</p>
                                    {res.matchedTasks.map((t: any) => (
                                        <div key={t.id} className="text-sm text-slate-300 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${t.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            {t.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      {isWizardOpen && (
        <OpportunityWizard 
          initialData={editingOpp}
          onSave={handleSaveOpportunity}
          onCancel={() => { setIsWizardOpen(false); setEditingOpp(undefined); }}
        />
      )}

      {isQuickTaskOpen && (
          <QuickTaskModal 
            opportunities={opportunities}
            onClose={() => setIsQuickTaskOpen(false)}
            onSave={handleSaveQuickTask}
            userRole={userRole}
          />
      )}

    </div>
  );
};

export default App;
