
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
  const [orgDetails, setOrgDetails] = useState<{ name: string, limit: number, logoUrl: string | null, primaryColor: string, whitelabel: boolean }>({
    name: 'ShinkōS',
    limit: 1,
    logoUrl: null,
    primaryColor: '#F59E0B',
    whitelabel: false,
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
                        *
                    )
                `)
                .eq('id', session.user.id)
                .single();

              if (profileError || !profile) {
                  throw profileError || new Error("User profile not found");
              }
              
              const orgDataFromProfile = profile.organizacoes;
              const orgData = Array.isArray(orgDataFromProfile) ? orgDataFromProfile[0] : orgDataFromProfile;
              
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
                  });
              }

              const plan = await getCurrentUserPlan(session.user.id);
              setCurrentPlan(plan);
              
              // Fetch Opportunities filtered by organization ID
              // SECURITY: If orgId is not present, fetchOpportunities will return empty array
              const allOpps = await fetchOpportunities(orgId);

              // STRICT CLIENT-SIDE FILTERING TO PREVENT LEAKAGE (Double Safety)
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
              // SECURITY: Do not show mock data to authenticated users on error to prevent confusion/leakage fear
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
             trackUserAccess(newSession.user.id);
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
              responsavel: task.assigneeId,
              duracaohoras: task.estimatedHours || 2,
              datainicio: new Date().toISOString(),
              datafim: task.dueDate, 
              deadline: task.dueDate,
              dataproposta: task.dueDate,
              gravidade: task.gut?.g || 1,
              urgencia: task.gut?.u || 1,
              tendencia: task.gut?.t || 1,
              organizacao: userOrgId, // STRICT: Use actual user Org ID
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

  const handleCreateProjectClick = () => {
      // Plan Limit Check
      const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['plan_free'];
      if (opportunities.length >= limits.maxProjects) {
          alert(`Limite de projetos atingido para o plano atual (${limits.maxProjects}). Faça upgrade para criar mais.`);
          setView('profile'); // Send to profile to upgrade
          return;
      }
      setEditingOpp(undefined);
      setIsWizardOpen(true);
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
                  <div className="absolute inset-0 bg-shinko-primary blur-[80px] opacity-30 animate-pulse rounded-full"></div>
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
                            setUserData({ name: persona.name, avatar: persona.avatar || null, email: persona.email });
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

  // --- API KEY REQUIRED SCREEN ---
  if (needsApiKey) {
      return (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
              <div className="glass-panel p-8 rounded-2xl max-w-md text-center border border-shinko-primary/30 shadow-[0_0_50px_rgba(var(--brand-primary-rgb),0.2)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-shinko-primary/5 pointer-events-none"></div>
                  <div className="relative z-10">
                      <div className="w-16 h-16 bg-shinko-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border border-shinko-primary/30">
                          <Sparkles className="w-8 h-8 text-shinko-primary"/>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-3">Conectar Inteligência Artificial</h2>
                      <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                          Para habilitar as análises preditivas e automação do ShinkōOS, selecione sua chave de API do Google Gemini.
                      </p>
                      <button 
                          onClick={handleConnectApiKey}
                          className="w-full py-3.5 bg-gradient-to-r from-shinko-primary to-shinko-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <Sparkles className="w-4 h-4"/> Selecionar API Key
                      </button>
                      <p className="mt-6 text-[10px] text-slate-500">
                          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-shinko-primary underline transition-colors">
                              Documentação de Faturamento e Chaves
                          </a>
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen overflow-hidden selection:bg-shinko-primary/30">
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

      {/* FIX: Add padding-top on mobile to avoid content being hidden behind fixed header */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden pt-16 xl:pt-0">
        <div className={`flex-1 relative h-full ${view === 'project-detail' ? '' : 'overflow-y-auto p-6 md:p-10 custom-scrollbar'}`}>
            <Suspense fallback={<LoadingFallback />}>
                {view === 'dashboard' && userRole !== 'cliente' && (
                    <Dashboard 
                        opportunities={opportunities}
                        onNavigate={(status) => handleDashboardCardClick(status)}
                        onOpenProject={handleOpenProject}
                        user={session?.user}
                        theme={theme}
                        userRole={userRole}
                        whitelabel={orgDetails.whitelabel}
                        onActivateWhitelabel={() => setView('settings')}
                        organizationId={userOrgId || undefined}
                    />
                )}
                
                {view === 'admin-manager' && userData.email === 'peboorba@gmail.com' && (
                    <AdminManagerScreen onlineUsers={onlineUsers} />
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
                                    onClick={handleCreateProjectClick}
                                    id="btn-new-project-list"
                                    className="bg-gradient-to-r from-shinko-primary to-shinko-secondary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-shinko-primary/20 transition-all active:scale-95 flex items-center gap-2 hover:brightness-110"
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
                                <div 
                                    key={opp.id} 
                                    onClick={() => handleOpenProject(opp)} 
                                    className="glass-card p-5 rounded-2xl cursor-pointer 
                                    bg-white dark:bg-slate-900 
                                    hover:bg-slate-50 dark:hover:bg-slate-800 
                                    transition-all border border-slate-200 dark:border-slate-800 
                                    shadow-sm hover:shadow-xl 
                                    group relative overflow-hidden flex flex-col gap-3 hover:z-50 duration-300"
                                >
                                    {/* Status Stripe */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${opp.status === 'Active' ? 'bg-emerald-500' : opp.status === 'Negotiation' ? 'bg-blue-500' : opp.status === 'Future' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                                    
                                    <div className="pl-3 flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate max-w-full group-hover:text-shinko-primary transition-colors mr-2">{opp.title}</h3>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm shrink-0 ${getStatusColor(opp.status)}`}>
                                                    {getStatusLabel(opp.status)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{opp.description}</p>
                                        </div>

                                        {/* Actions Block - DESKTOP ONLY */}
                                        <div className="hidden md:flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start ml-4">
                                            {userRole !== 'cliente' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingOpp(opp); setIsWizardOpen(true); }}
                                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-500 rounded-lg transition-colors shadow-sm"
                                                    title="Editar Projeto"
                                                >
                                                    <Edit className="w-4 h-4"/>
                                                </button>
                                            )}
                                            {userRole === 'dono' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm(`ATENÇÃO: Deseja excluir o projeto "${opp.title}"?\n\nIsso excluirá permanentemente:\n1. Todas as tarefas e subtarefas associadas.\n2. O projeto em si.\n\nEsta ação não pode ser desfeita.`)) {
                                                            handleDeleteOpportunity(opp.id);
                                                        }
                                                    }}
                                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors shadow-sm"
                                                    title="Excluir Projeto e Tarefas"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="pl-3 flex flex-col sm:flex-row items-start sm:items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                <Rocket className="w-3 h-3"/> {opp.archetype}
                                            </div>
                                            {opp.prioScore > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                    <Target className="w-3 h-3 text-shinko-primary"/> {opp.prioScore.toFixed(1)}
                                                </div>
                                            )}
                                            <span className="text-xs text-slate-400 hidden sm:inline">{new Date(opp.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* Actions Block - MOBILE ONLY (Always Visible) */}
                                        <div className="flex md:hidden gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
                                            {userRole !== 'cliente' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingOpp(opp); setIsWizardOpen(true); }}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-lg flex items-center gap-2"
                                                >
                                                    <Edit className="w-3 h-3"/> Editar
                                                </button>
                                            )}
                                            {userRole === 'dono' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm(`Excluir projeto?`)) handleDeleteOpportunity(opp.id);
                                                    }}
                                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold rounded-lg flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-3 h-3"/> Excluir
                                                </button>
                                            )}
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
                        currentPlan={currentPlan}
                    />
                )}

                {view === 'kanban' && <KanbanBoard onSelectOpportunity={handleOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                {view === 'calendar' && <CalendarView opportunities={opportunities} onSelectOpportunity={handleOpenProject} onTaskUpdate={() => {}} userRole={userRole} onRefresh={loadAppData} organizationId={userOrgId || undefined} />}
                {view === 'gantt' && <GanttView opportunities={opportunities} onSelectOpportunity={handleOpenProject} onTaskUpdate={() => {}} userRole={userRole} organizationId={userOrgId || undefined} />}
                
                {/* Restricted Views */}
                {view === 'financial' && userRole === 'dono' && (PLAN_LIMITS[currentPlan]?.features.financial !== false ? <FinancialScreen /> : <AccessDenied plan={currentPlan} module="Financeiro" setView={setView}/>)}
                {view === 'clients' && (PLAN_LIMITS[currentPlan]?.features.clients !== false ? <ClientsScreen userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} /> : <AccessDenied plan={currentPlan} module="Clientes" setView={setView}/>)}
                {view === 'product' && userRole === 'dono' && (PLAN_LIMITS[currentPlan]?.features.metrics !== false ? <ProductIndicators /> : <AccessDenied plan={currentPlan} module="Métricas de Produto" setView={setView}/>)}
                {view === 'dev-metrics' && userRole === 'dono' && (PLAN_LIMITS[currentPlan]?.features.metrics !== false ? <DevIndicators organizationId={userOrgId || undefined} /> : <AccessDenied plan={currentPlan} module="Métricas de Engenharia" setView={setView}/>)}
                
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

                {view === 'settings' && <SettingsScreen 
                    theme={theme} 
                    onToggleTheme={toggleTheme} 
                    onlineUsers={onlineUsers} 
                    userOrgId={userOrgId}
                    orgDetails={orgDetails}
                    onUpdateOrgDetails={handleUpdateOrgDetails}
                    userRole={userRole}
                    userData={userData}
                    setView={setView}
                />}
                {view === 'profile' && <ProfileScreen currentPlan={currentPlan} onRefresh={loadAppData} />}
                {view === 'search' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Resultados da Busca: "{searchQuery}"</h1>
                        {searchResults.length === 0 && <p className="text-slate-500">Nenhum resultado encontrado.</p>}
                        {searchResults.map(res => (
                            <div key={res.id} className="glass-card p-6 rounded-xl border border-white/10 bg-white/5 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg cursor-pointer hover:text-shinko-primary" onClick={() => handleOpenProject(res)}>{res.title}</h3>
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
            </Suspense>
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

// Access Denied Component for Plan Limits
const AccessDenied = ({ plan, module, setView }: { plan: string, module: string, setView: (v: any) => void }) => (
    <div className="flex h-full items-center justify-center flex-col gap-4 animate-in zoom-in duration-300 p-8">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center border-4 border-amber-50 dark:border-amber-900/10">
            <Lock className="w-10 h-10 text-shinko-primary"/>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upgrade Necessário</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm text-center leading-relaxed">
            O módulo <strong>{module}</strong> não está disponível no seu plano atual (<strong>{plan.replace('plan_', '').toUpperCase()}</strong>).
            Faça um upgrade para desbloquear ferramentas profissionais.
        </p>
        <button onClick={() => setView('profile')} className="mt-4 px-8 py-3 bg-gradient-to-r from-shinko-primary to-shinko-secondary text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all">
            Ver Planos Disponíveis
        </button>
    </div>
);

export default App;
