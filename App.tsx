import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Opportunity, RDEStatus, Archetype, IntensityLevel, BpmnTask, BpmnNode, ProjectStatus, PLAN_LIMITS } from './types';
import OpportunityWizard from './components/OpportunityWizard';
import OpportunityDetail from './components/OpportunityDetail';
import { ProjectWorkspace } from './components/ProjectWorkspace'; 
import AuthScreen from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { Sidebar, MobileDrawer } from './components/Navigation';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { QuickTaskModal } from './components/QuickTaskModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { Dashboard } from './components/Dashboard';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from './services/opportunityService';
import { createTask, createProject } from './services/projectService';
import { supabase } from './services/supabaseClient';
import { Loader2, Rocket, AlertTriangle, CheckCircle, PlayCircle, Clock, Flame, Snowflake, AlertCircle, Lock, ArrowDownRight, List as ListIcon, Search, Hash, XCircle, ShieldCheck, Sparkles, Plus, Filter, Target, Trash2, Edit } from 'lucide-react';
import { OnboardingGuide } from './components/OnboardingGuide';
import { logEvent, trackUserAccess } from './services/analyticsService';
import { NpsSurvey } from './components/NpsSurvey';
import { getCurrentUserPlan } from './services/asaasService';
import { subscribeToPresence } from './services/presenceService';
import { updateOrgDetails, uploadLogo } from './services/organizationService';

// --- LAZY LOAD COMPONENTS (Code Splitting) ---
const MatrixChart = React.lazy(() => import('./components/MatrixChart'));
const CalendarView = React.lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const KanbanBoard = React.lazy(() => import('./components/KanbanBoard').then(module => ({ default: module.KanbanBoard })));
const GanttView = React.lazy(() => import('./components/GanttView').then(module => ({ default: module.GanttView })));
const FinancialScreen = React.lazy(() => import('./components/FinancialScreen').then(module => ({ default: module.FinancialScreen })));
const ClientsScreen = React.lazy(() => import('./components/ClientsScreen').then(module => ({ default: module.ClientsScreen })));
const ProductIndicators = React.lazy(() => import('./components/ProductIndicators').then(module => ({ default: module.ProductIndicators })));
const DevIndicators = React.lazy(() => import('./components/DevIndicators').then(module => ({ default: module.DevIndicators })));
const AdminManagerScreen = React.lazy(() => import('./components/AdminManagerScreen').then(module => ({ default: module.AdminManagerScreen })));

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

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-shinko-primary" />
    </div>
);

const App: React.FC = () => {
  // Auth & User State
  const [isAuthChecking, setIsAuthChecking] = useState(true); 
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('colaborador');
  const [userData, setUserData] = useState<{name: string, avatar: string | null, email?: string}>({ name: 'Usuário', avatar: null });
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('plan_free');
  const [isGuest, setIsGuest] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false); 
  
  // Realtime Presence State
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Whitelabel & Org State
  const [orgDetails, setOrgDetails] = useState<{ name: string, limit: number, logoUrl: string | null, primaryColor: string, whitelabel: boolean, orgType?: string }>({
    name: 'ShinkōS',
    limit: 1,
    logoUrl: null,
    primaryColor: '#F59E0B',
    whitelabel: false,
    orgType: 'Startup' // Default
  });

  // Data & UI State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [editingOpp, setEditingOpp] = useState<Partial<Opportunity> | undefined>(undefined);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);

  const [view, setView] = useState<'dashboard' | 'list' | 'calendar' | 'profile' | 'settings' | 'search' | 'kanban' | 'gantt' | 'financial' | 'clients' | 'product' | 'dev-metrics' | 'project-detail' | 'admin-manager'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilterStatus, setListFilterStatus] = useState<ProjectStatus | 'All'>('All');
  
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // API Key State
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // --- THEME & BRANDING EFFECTS ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Helper to convert hex to r,g,b string
  const hexToRgb = (hex: string) => {
      if (!hex || hex.length < 4) return '245, 158, 11'; // Fallback
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '245, 158, 11';
  };

  // Helper to darken color for secondary shade
  const shadeColor = (color: string, percent: number) => {
      let R = parseInt(color.substring(1,3),16);
      let G = parseInt(color.substring(3,5),16);
      let B = parseInt(color.substring(5,7),16);

      R = parseInt(String(R * (100 + percent) / 100));
      G = parseInt(String(G * (100 + percent) / 100));
      B = parseInt(String(B * (100 + percent) / 100));

      R = (R<255)?R:255;  
      G = (G<255)?G:255;  
      B = (B<255)?B:255;  

      const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
      const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
      const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

      return "#"+RR+GG+BB;
  };

  // Effect to apply theme color
  useEffect(() => {
      document.documentElement.style.setProperty('--brand-primary', orgDetails.primaryColor);
      document.documentElement.style.setProperty('--brand-secondary', shadeColor(orgDetails.primaryColor, -15)); // 15% darker
      document.documentElement.style.setProperty('--brand-primary-rgb', hexToRgb(orgDetails.primaryColor));
  }, [orgDetails.primaryColor]);

  // --- CHECK API KEY ---
  useEffect(() => {
      const checkApiKey = async () => {
          if (typeof window !== 'undefined' && (window as any).aistudio) {
              try {
                  const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                  if (!hasKey) setNeedsApiKey(true);
              } catch (e) {
                  console.error("Failed to check API key status", e);
              }
          }
      };
      checkApiKey();
  }, [session, isGuest]);

  const handleConnectApiKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              // Assume success as per instructions
              setNeedsApiKey(false);
              loadAppData(); 
          } catch (e) {
              console.error("API Key selection failed", e);
          }
      }
  };

  // --- DATA LOADING FUNCTION ---
  const loadAppData = useCallback(async () => {
      if (!session && !isGuest) return;
      
      setIsLoading(true);

      try {
          if (isGuest) {
               await new Promise(r => setTimeout(r, 800));
               setOpportunities(MOCK_DATA);
               setDbStatus('disconnected');
               setIsLoading(false);
               setShowOnboarding(true);
               return;
          }

          if (session?.user) {
              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select(`
                    *,
                    organizacoes (
                        *,
                        tipo_organizacao (
                            nome
                        )
                    )
                `)
                .eq('id', session.user.id)
                .single();

              if (profileError || !profile) {
                  console.warn("Profile fetch failed, attempting to proceed in degraded mode or trigger repair.");
                  throw profileError || new Error("User profile not found");
              }
              
              const orgDataFromProfile = profile.organizacoes;
              const orgData = Array.isArray(orgDataFromProfile) ? orgDataFromProfile[0] : orgDataFromProfile;
              
              // Safe extraction of Org Type Name
              let orgTypeName = 'Startup';
              if (orgData) {
                  if (orgData.tipo_organizacao) {
                      // Check if it's an object with name
                      if (typeof orgData.tipo_organizacao === 'object' && !Array.isArray(orgData.tipo_organizacao)) {
                          orgTypeName = orgData.tipo_organizacao.nome || 'Startup';
                      } 
                      // Check if it's an array (sometimes happens with Supabase joins)
                      else if (Array.isArray(orgData.tipo_organizacao) && orgData.tipo_organizacao.length > 0) {
                          orgTypeName = orgData.tipo_organizacao[0].nome || 'Startup';
                      }
                  }
              }
              
              setUserRole(profile.perfil || 'colaborador');
              setUserData({ name: profile.nome || 'Usuário', avatar: session.user.user_metadata?.avatar_url || null, email: profile.email });
              const orgId = profile.organizacao || null;
              setUserOrgId(orgId);

              if (orgData) {
                  setOrgDetails({
                      name: orgData.nome || 'ShinkōS',
                      limit: orgData.colaboradores || 1,
                      logoUrl: orgData.logo || null,
                      primaryColor: orgData.cor || '#F59E0B',
                      whitelabel: (orgData.whitelabel === true || orgData.whitelable === true),
                      orgType: orgTypeName
                  });
              }

              const plan = await getCurrentUserPlan(session.user.id);
              setCurrentPlan(plan);
              
              const allOpps = await fetchOpportunities(orgId);

              let filteredOpps = allOpps || [];
              if (orgId) {
                  filteredOpps = filteredOpps.filter(opp => Number(opp.organizationId) === Number(orgId));
              } else {
                  filteredOpps = [];
              }

              if (profile.perfil === 'cliente') {
                  filteredOpps = filteredOpps.filter(opp => opp.clientId === session.user.id);
                  if (view === 'dashboard') setView('list');
              }
              setOpportunities(filteredOpps);
              setDbStatus('connected');
          }
      } catch (error) {
          console.warn("Data Load Exception:", error);
          if (isGuest) {
              setOpportunities(MOCK_DATA);
          } else {
              setOpportunities([]);
          }
          setDbStatus('error');
      } finally {
          setIsLoading(false);
      }
  }, [session, isGuest, view]);

  // --- PRESENCE EFFECT ---
  useEffect(() => {
      if (session?.user?.id && !isGuest) {
          const unsubscribe = subscribeToPresence(session.user.id, (userIds) => {
              setOnlineUsers(userIds);
          });
          return () => {
              unsubscribe();
          };
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
                trackUserAccess(activeSession.user.id);
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
             try { trackUserAccess(newSession.user.id); } catch(e) {}
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
  
  const handleUpdateOrgDetails = async (updates: { logoFile?: File; color?: string; name?: string; limit?: number }) => {
      if (!userOrgId) return;
      try {
          let logoUrl;
          if (updates.logoFile) {
              logoUrl = await uploadLogo(userOrgId, updates.logoFile);
          }

          await updateOrgDetails(userOrgId, {
              logoUrl: logoUrl,
              primaryColor: updates.color,
              name: updates.name,
              limit: updates.limit
          });
          
          alert('Personalização salva!');
          await loadAppData(); 
      } catch (error) {
          console.error("Error updating org details:", error);
          alert('Erro ao salvar personalização.');
      }
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
          if (!userOrgId) {
              throw new Error("Erro de Segurança: Organização não identificada.");
          }

          const projId = projectId && projectId !== "" ? parseInt(projectId) : null;

          const payload = {
              projeto: projId, 
              titulo: task.text,
              descricao: task.description || '',
              status: task.status || 'todo',
              responsavel: task.assigneeId!, // Ensure ID is passed
              gravidade: task.gut?.g || 1,
              urgencia: task.gut?.u || 1,
              tendencia: task.gut?.t || 1,
              dataproposta: task.dueDate || new Date().toISOString(), // Use Due Date as proposal date for sorting
              datainicio: new Date().toISOString(), // Created At / Start Date
              datafim: task.dueDate,
              duracaohoras: task.estimatedHours || 2,
              sutarefa: false,
              organizacao: userOrgId // Strict organization filtering
          };

          await createTask(payload);
          
          alert("Tarefa criada com sucesso!");
          await loadAppData(); 

      } catch (e: any) {
          console.error(e);
          alert("Erro ao criar tarefa: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  if (isAuthChecking) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                      <div className="absolute inset-0 bg-shinko-primary blur-xl opacity-50 rounded-full animate-pulse"></div>
                      <img src={LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl relative z-10 shadow-2xl"/>
                  </div>
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500"/>
              </div>
          </div>
      );
  }

  if (!session && !isGuest) {
      return <LandingPage onEnter={() => setIsLoginModalOpen(true)} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      
      {/* Auth Modals */}
      {isLoginModalOpen && (
          <AuthScreen 
            onGuestLogin={(persona) => {
                if (persona) {
                    setUserData({ name: persona.name, email: persona.email, avatar: persona.avatar || null });
                    setUserRole(persona.role);
                    setIsGuest(true);
                    setIsLoginModalOpen(false);
                } else {
                    // Random Guest
                    setIsGuest(true);
                    setIsLoginModalOpen(false);
                }
            }} 
            onClose={() => setIsLoginModalOpen(false)} 
          />
      )}

      {showResetPasswordModal && (
          <ResetPasswordModal onClose={() => setShowResetPasswordModal(false)} />
      )}

      {/* Main Layout */}
      {(session || isGuest) && (
        <>
          <Sidebar 
            currentView={view} 
            onChangeView={setView} 
            onOpenCreate={() => setIsWizardOpen(true)} 
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
            currentPlan={currentPlan}
            customLogoUrl={orgDetails.logoUrl}
            orgName={orgDetails.name}
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
             customLogoUrl={orgDetails.logoUrl}
             orgName={orgDetails.name}
          />

          <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white/50 dark:bg-[#050505] pt-16 xl:pt-0">
            {/* Background Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>

            {/* View Content */}
            <div className="flex-1 relative overflow-hidden">
                {needsApiKey && (
                    <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white px-4 py-2 text-center text-xs font-bold z-50 flex items-center justify-center gap-4 shadow-lg animate-in slide-in-from-top">
                        <span>⚠️ Para usar recursos de IA, conecte sua chave API do Google.</span>
                        <button onClick={handleConnectApiKey} className="bg-white text-purple-600 px-3 py-1 rounded shadow hover:bg-slate-100 transition-colors">Conectar Agora</button>
                    </div>
                )}

                <div className="h-full overflow-hidden p-0">
                    {view === 'dashboard' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <Dashboard 
                                opportunities={opportunities} 
                                onNavigate={handleDashboardCardClick}
                                onOpenProject={handleOpenProject}
                                user={session?.user || { id: 'guest' }}
                                theme={theme}
                                userRole={userRole}
                                whitelabel={orgDetails.whitelabel}
                                onActivateWhitelabel={() => setView('profile')}
                                organizationId={userOrgId || undefined}
                            />
                        </div>
                    )}

                    {view === 'list' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ListIcon className="w-6 h-6 text-amber-500"/> Projetos
                                </h2>
                                {userRole !== 'cliente' && (
                                    <button 
                                        onClick={() => setIsWizardOpen(true)}
                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                                    >
                                        <Rocket className="w-4 h-4"/> Novo Projeto
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                                {['All', 'Active', 'Negotiation', 'Future', 'Frozen', 'Archived'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setListFilterStatus(status as any)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                                            listFilterStatus === status 
                                            ? 'bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white' 
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {status === 'All' ? 'Todos' : status}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {opportunities
                                    .filter(o => listFilterStatus === 'All' || o.status === listFilterStatus)
                                    .map(opp => (
                                    <div 
                                        key={opp.id} 
                                        onClick={() => handleOpenProject(opp)}
                                        className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 dark:hover:border-amber-500/50 cursor-pointer group transition-all relative overflow-hidden bg-white/60 dark:bg-slate-900/60"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                                                    opp.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                    opp.status === 'Negotiation' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {opp.title.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{opp.title}</h3>
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{opp.archetype?.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                    opp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                    opp.status === 'Negotiation' ? 'bg-blue-500/10 text-blue-500' : 
                                                    'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                    {opp.status}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 h-10">
                                            {opp.description || 'Sem descrição.'}
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                                <Target className="w-3 h-3"/> Score: {opp.prioScore?.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(opp.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'project-detail' && selectedOpp && (
                        <div className="h-full">
                            <ProjectWorkspace 
                                opportunity={selectedOpp} 
                                onBack={() => { setSelectedOpp(null); setView('list'); }}
                                onUpdate={async (updated) => {
                                    await updateOpportunity(updated);
                                    await loadAppData(); 
                                    setSelectedOpp(updated);
                                }}
                                onEdit={(opp) => { setEditingOpp(opp); setIsWizardOpen(true); }}
                                onDelete={async (id) => {
                                    if (await deleteOpportunity(id)) {
                                        setSelectedOpp(null);
                                        setView('list');
                                        loadAppData();
                                    }
                                }}
                                userRole={userRole}
                                currentPlan={currentPlan}
                            />
                        </div>
                    )}

                    {view === 'kanban' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <KanbanBoard 
                                onSelectOpportunity={handleOpenProject} 
                                userRole={userRole}
                                organizationId={userOrgId || undefined} 
                            />
                        </div>
                    )}

                    {view === 'gantt' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <GanttView 
                                opportunities={opportunities}
                                onSelectOpportunity={handleOpenProject} 
                                onTaskUpdate={() => {}}
                                userRole={userRole}
                                organizationId={userOrgId || undefined}
                            />
                        </div>
                    )}

                    {view === 'calendar' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <CalendarView 
                                opportunities={opportunities} 
                                onSelectOpportunity={handleOpenProject}
                                onTaskUpdate={() => {}}
                                userRole={userRole}
                                organizationId={userOrgId || undefined}
                            />
                        </div>
                    )}

                    {view === 'search' && (
                        <div className="h-full p-8 overflow-y-auto custom-scrollbar">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Resultados para "{searchQuery}"</h2>
                            {searchResults.length === 0 && (
                                <p className="text-slate-500">Nenhum resultado encontrado.</p>
                            )}
                            <div className="space-y-6">
                                {searchResults.map(opp => (
                                    <div key={opp.id} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                                        <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => handleOpenProject(opp)}>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-shinko-primary transition-colors">{opp.title}</h3>
                                            <span className="text-xs font-bold bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{opp.status}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{opp.description}</p>
                                        
                                        {/* Task Matches */}
                                        {(opp as any).matchedTasks && (opp as any).matchedTasks.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tarefas Encontradas:</h4>
                                                <div className="space-y-2">
                                                    {(opp as any).matchedTasks.map((t: BpmnTask) => (
                                                        <div key={t.id} className="text-sm p-2 bg-slate-100 dark:bg-white/5 rounded border border-transparent hover:border-shinko-primary/30 transition-colors flex justify-between">
                                                            <span className="truncate">{t.text}</span>
                                                            <span className="text-xs text-slate-400">{t.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'profile' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <ProfileScreen currentPlan={currentPlan} onRefresh={loadAppData} />
                        </div>
                    )}

                    {view === 'settings' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <SettingsScreen 
                                theme={theme} 
                                onToggleTheme={toggleTheme} 
                                onlineUsers={onlineUsers} 
                                userOrgId={userOrgId}
                                orgDetails={orgDetails}
                                onUpdateOrgDetails={handleUpdateOrgDetails}
                                setView={setView}
                                userRole={userRole}
                                userData={userData}
                            />
                        </div>
                    )}

                    {view === 'financial' && (
                        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                            <FinancialScreen orgType={orgDetails.orgType} />
                        </div>
                    )}

                    {view === 'clients' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <ClientsScreen 
                                userRole={userRole} 
                                onlineUsers={onlineUsers} 
                                organizationId={userOrgId || undefined} 
                            />
                        </div>
                    )}

                    {view === 'product' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <ProductIndicators />
                        </div>
                    )}

                    {view === 'dev-metrics' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <DevIndicators organizationId={userOrgId || undefined} />
                        </div>
                    )}

                    {view === 'admin-manager' && userData.email === 'peboorba@gmail.com' && (
                        <div className="h-full p-4 md:p-8 overflow-hidden">
                            <AdminManagerScreen onlineUsers={onlineUsers}/>
                        </div>
                    )}
                </div>
            </div>
          </main>
        </>
      )}

      {/* Global Modals */}
      {isWizardOpen && (
        <OpportunityWizard 
          initialData={editingOpp}
          onSave={async (newOpp) => {
            if (editingOpp) {
                await updateOpportunity(newOpp);
            } else {
                await createOpportunity(newOpp);
            }
            setIsWizardOpen(false);
            setEditingOpp(undefined);
            loadAppData();
          }}
          onCancel={() => { setIsWizardOpen(false); setEditingOpp(undefined); }}
          orgType={orgDetails.orgType}
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

      <OnboardingGuide run={showOnboarding} onFinish={() => setShowOnboarding(false)} />
      <NpsSurvey userId={session?.user?.id} userRole={userRole} />
    </div>
  );
};

export default App;
