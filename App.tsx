
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { getPublicOrgDetails, updateOrgDetails, uploadLogo } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { getCurrentUserPlan, mapDbPlanIdToString } from './services/asaasService';

// Components
import { Sidebar, MobileDrawer } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { KanbanBoard } from './components/KanbanBoard';
import { GanttView } from './components/GanttView';
import { CalendarView } from './components/CalendarView';
import { FinancialScreen } from './components/FinancialScreen';
import { ClientsScreen } from './components/ClientsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { LandingPage } from './components/LandingPage';
import { BlogScreen } from './components/BlogScreen';
import AuthScreen from './components/AuthScreen';
import OpportunityWizard from './components/OpportunityWizard';
import { QuickTaskModal } from './components/QuickTaskModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { ProductIndicators } from './components/ProductIndicators';
import { DevIndicators } from './components/DevIndicators';
import { AdminManagerScreen } from './components/AdminManagerScreen';
import { NpsSurvey } from './components/NpsSurvey';
import { GuruFab } from './components/GuruFab';
import { FeedbackModal } from './components/FeedbackModal';
import { CrmBoard } from './components/CrmBoard';
import { fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';

// --- ROUTING CONFIGURATION ---
const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'list': '/projects',
    'create-project': '/project/new',
    'kanban': '/kanban',
    'gantt': '/gantt',
    'calendar': '/calendar',
    'crm': '/crm',
    'financial': '/finance',
    'clients': '/clients',
    'product': '/metrics/product',
    'dev-metrics': '/metrics/engineering',
    'settings': '/settings',
    'profile': '/profile',
    'admin-manager': '/admin'
};

const REVERSE_ROUTES: Record<string, string> = Object.entries(ROUTES).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

const App: React.FC = () => {
  // State
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('visitante');
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('plan_free');
  
  // App State for Org Plan ID (Source of Truth)
  const [orgPlanId, setOrgPlanId] = useState<number | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // View State (Routing)
  const [view, setViewState] = useState<string>('dashboard');
  
  // New state to control which tab Settings opens on
  const [settingsStartTab, setSettingsStartTab] = useState<'general' | 'team' | 'ai' | 'modules'>('general');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Modules State
  const [activeModules, setActiveModules] = useState<string[]>(['projects', 'kanban']); 

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Public Routes
  const [showBlog, setShowBlog] = useState(false);
  const [blogPostId, setBlogPostId] = useState<string | null>(null);

  // New State for Feedback Modal
  const [showFeedback, setShowFeedback] = useState(false);

  const [selectedProject, setSelectedProjectState] = useState<Opportunity | null>(null);
  const [isSharedMode, setIsSharedMode] = useState(false); 
  const [theme, setTheme] = useState<'light'|'dark'>('dark');

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [orgDetails, setOrgDetails] = useState<{ 
      name: string, 
      limit: number, 
      logoUrl: string | null, 
      primaryColor: string,
      aiSector: string,
      aiTone: string,
      aiContext: string,
      isWhitelabelActive?: boolean
  }>({ 
      name: '', 
      limit: 1, 
      logoUrl: null, 
      primaryColor: '#F59E0B',
      aiSector: '',
      aiTone: '',
      aiContext: '',
      isWhitelabelActive: false
  });
  const [dbStatus, setDbStatus] = useState<'connected'|'disconnected'>('connected');

  // Helper to change URL without reloading
  const navigateTo = (path: string) => {
      try {
          window.history.pushState({}, '', path);
      } catch (e) {
          console.warn("Routing state update blocked by environment:", e);
      }
  };

  // 1. Handle Navigation (Change View)
  const setView = (newView: string) => {
      setViewState(newView);
      setSelectedProjectState(null); 
      setEditingOpportunity(null);
      const path = ROUTES[newView] || '/';
      navigateTo(path);
  };

  // 2. Handle Project Opening (Deep Link)
  const onOpenProject = (opp: Opportunity) => {
      setSelectedProjectState(opp);
      navigateTo(`/project/${opp.id}`);
  };

  // 3. Handle Back from Project
  const closeProject = () => {
      setSelectedProjectState(null);
      setView('dashboard');
  };

  // 4. Handle Edit Project (New Route)
  const onEditProject = (opp: Opportunity) => {
      setEditingOpportunity(opp);
      setViewState('edit-project');
      navigateTo(`/project/${opp.id}/edit`);
  };

  // 5. Initial Load & PopState (Browser Back/Forward)
  useEffect(() => {
      const handleRouting = async () => {
          let path = window.location.pathname;
          
          if (!path || path.startsWith('blob:')) {
              path = '/';
          }

          // Blog Route with Deep Link
          if (path.startsWith('/blog')) {
              const parts = path.split('/');
              const id = parts[2];
              setShowBlog(true);
              setBlogPostId(id || null);
              return;
          } else {
              setShowBlog(false);
              setBlogPostId(null);
          }

          // Create Project Route
          if (path === '/project/new') {
              setViewState('create-project');
              setEditingOpportunity(null);
              setSelectedProjectState(null);
              return;
          }

          // Project Specific Routes
          if (path.startsWith('/project/')) {
              const parts = path.split('/');
              const projectId = parts[2];
              const subAction = parts[3]; 

              if (projectId) {
                  const opp = await fetchOpportunityById(projectId);
                  if (opp) {
                      if (subAction === 'edit') {
                          setEditingOpportunity(opp);
                          setViewState('edit-project');
                          setSelectedProjectState(null);
                      } else {
                          setSelectedProjectState(opp);
                          setViewState('project-view'); 
                      }
                  } else {
                      setView('dashboard');
                  }
              }
              return;
          }

          // View Route
          const mappedView = REVERSE_ROUTES[path];
          if (mappedView) {
              setViewState(mappedView);
              setSelectedProjectState(null);
              setEditingOpportunity(null);
          } else {
              if (path !== '/' && !path.includes('type=recovery')) {
                  navigateTo('/'); 
              }
              setViewState('dashboard');
          }
      };

      handleRouting();

      const onPopState = () => {
          handleRouting();
      };
      window.addEventListener('popstate', onPopState);

      return () => window.removeEventListener('popstate', onPopState);
  }, []); 

  // Check URL for White Label or Password Recovery
  useEffect(() => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
          setShowResetPassword(true);
      }
      
      const params = new URLSearchParams(window.location.search);
      const orgIdParam = params.get('org');
      
      if (orgIdParam) {
          getPublicOrgDetails(Number(orgIdParam)).then(details => {
              if (details) {
                  setOrgDetails(prev => ({ 
                      ...prev, 
                      ...details,
                      isWhitelabelActive: true 
                  }));
              }
          });
      }
  }, []);

  // Auth & Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else {
          setUserData(null);
          setOpportunities([]);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
      setLoading(true);
      try {
          const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
          if (data) {
              setUserData({ name: data.nome, email: data.email, avatar: data.avatar_url });
              setUserRole(data.perfil || 'colaborador');
              setUserOrgId(data.organizacao);
              if (data.organizacao) {
                  await loadOrganization(data.organizacao);
                  loadOpportunities(data.organizacao);
              }
              trackUserAccess(userId);
              const unsubPresence = subscribeToPresence(userId, (ids) => setOnlineUsers(ids));
              return () => { unsubPresence(); };
          }
      } catch (e) {
          console.error("Error loading user data", e);
          setDbStatus('disconnected');
      } finally {
          setLoading(false);
      }
  };

  const loadOrganization = async (orgId: number) => {
      const { data } = await supabase.from('organizacoes').select('*').eq('id', orgId).single();
      if (data) {
          const planId = data.plano || 4;
          setOrgPlanId(planId);
          setCurrentPlan(mapDbPlanIdToString(planId));
          setOrgDetails({
              name: data.nome, limit: data.colaboradores, logoUrl: data.logo, primaryColor: data.cor || '#F59E0B',
              aiSector: data.setor || '', aiTone: data.tomdevoz || '', aiContext: data.dna || '', isWhitelabelActive: false 
          });
          const modules = await fetchActiveOrgModules(orgId);
          if (modules.length > 0) setActiveModules(modules);
          else setActiveModules(getPlanDefaultModules(planId));
      }
  };

  const loadOpportunities = async (orgId: number) => {
      const data = await fetchOpportunities(orgId);
      if (data) setOpportunities(data);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
  };

  const toggleTheme = () => {
      setTheme(prev => {
          const newTheme = prev === 'dark' ? 'light' : 'dark';
          if (newTheme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return newTheme;
      });
  };

  useEffect(() => { if (theme === 'dark') document.documentElement.classList.add('dark'); }, []);

  const handleCreateTask = async (task: BpmnTask, projectId: string | null) => {
      if (!userOrgId || !user) return;
      await createTask({
          projeto: projectId ? Number(projectId) : null,
          titulo: task.text, descricao: task.description, status: task.status,
          responsavel: task.assigneeId || user.id, gravidade: task.gut?.g, urgencia: task.gut?.u, tendencia: task.gut?.t,
          datainicio: task.startDate, datafim: task.dueDate, duracaohoras: task.estimatedHours,
          organizacao: userOrgId, sutarefa: false
      });
      alert("Tarefa criada com sucesso!");
      loadOpportunities(userOrgId);
  };

  const handleUpdateOrgDetails = async (updates: any) => {
      if (!userOrgId) return;
      try {
          let logoUrl = updates.logoFile ? await uploadLogo(userOrgId, updates.logoFile) : undefined;
          await updateOrgDetails(userOrgId, { ...updates, logoUrl });
          loadOrganization(userOrgId);
          alert('Configurações atualizadas!');
      } catch (e: any) { alert('Erro ao atualizar: ' + e.message); }
  };

  const handleRefreshModules = async () => {
      if (userOrgId) {
          const modules = await fetchActiveOrgModules(userOrgId);
          if (modules.length > 0) setActiveModules(modules);
      }
  };

  const handleGuruAction = (actionId: string) => {
      if (actionId === 'nav_kanban') setView('kanban');
      else if (actionId === 'nav_calendar') setView('calendar');
      else if (actionId === 'nav_financial') setView('financial');
      else if (actionId === 'nav_matrix') setView('dashboard');
      else if (actionId === 'create_project') setView('create-project');
      else if (actionId === 'create_task') setShowCreateTask(true);
  };

  // --- WHITELABEL LOGIC ---
  const shouldUseWhitelabel = activeModules.includes('whitelabel') || activeModules.includes('whitelable') || orgDetails.isWhitelabelActive;
  const appBrandName = shouldUseWhitelabel && orgDetails.name ? orgDetails.name : 'Shinkō OS';
  const appLogoUrl = shouldUseWhitelabel ? orgDetails.logoUrl : null;
  const appPrimaryColor = shouldUseWhitelabel ? orgDetails.primaryColor : '#F59E0B';

  useEffect(() => { document.title = appBrandName; }, [appBrandName]);
  useEffect(() => {
      const root = document.documentElement;
      const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '245, 158, 11';
      };
      if (appPrimaryColor) {
          root.style.setProperty('--brand-primary', appPrimaryColor);
          root.style.setProperty('--brand-primary-rgb', hexToRgb(appPrimaryColor));
      }
  }, [appPrimaryColor]);

  const filteredOpportunities = useMemo(() => {
      if (!searchTerm) return opportunities;
      const lower = searchTerm.toLowerCase();
      return opportunities.filter(o => 
          o.title.toLowerCase().includes(lower) || 
          o.description?.toLowerCase().includes(lower)
      );
  }, [opportunities, searchTerm]);

  // PUBLIC ACCESS ROUTES
  if (!user && !loading) {
      if (showBlog) {
          return (
              <BlogScreen 
                initialPostId={blogPostId}
                onBack={() => {
                    setShowBlog(false);
                    navigateTo('/');
                }} 
                onEnter={() => setShowAuth(true)}
              />
          );
      }

      return (
          <>
            <LandingPage 
                onEnter={() => setShowAuth(true)}
                onOpenBlog={() => {
                    setShowBlog(true);
                    navigateTo('/blog');
                }}
                customName={shouldUseWhitelabel ? orgDetails.name : undefined}
                customLogo={shouldUseWhitelabel ? orgDetails.logoUrl : undefined}
                customColor={shouldUseWhitelabel ? orgDetails.primaryColor : undefined}
            />
            {showAuth && (
                <AuthScreen 
                    onClose={() => setShowAuth(false)} 
                    onGuestLogin={(persona) => {
                        setUser({ id: 'demo', email: persona.email });
                        setUserData({ name: persona.name, avatar: null });
                        setUserRole(persona.role);
                        setShowOnboarding(true);
                    }}
                    customOrgName={appBrandName}
                    customLogoUrl={appLogoUrl}
                    customColor={appPrimaryColor}
                />
            )}
            {showResetPassword && <ResetPasswordModal onClose={() => setShowResetPassword(false)} />}
          </>
      );
  }

  // LOGGED IN USER
  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        {!isSharedMode && view !== 'create-project' && view !== 'edit-project' && (
            <Sidebar 
                currentView={view} onChangeView={setView} 
                onOpenCreate={() => setView('create-project')} onOpenCreateTask={() => setShowCreateTask(true)}
                onToggleTheme={toggleTheme} onLogout={handleLogout} onSearch={(q) => setSearchTerm(q)}
                onOpenFeedback={() => setShowFeedback(true)} theme={theme} dbStatus={dbStatus}
                isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
                userData={userData || { name: 'Carregando...', avatar: null }} currentPlan={currentPlan}
                customLogoUrl={appLogoUrl} orgName={appBrandName} activeModules={activeModules}
            />
        )}
        
        {!isSharedMode && view !== 'create-project' && view !== 'edit-project' && (
            <MobileDrawer 
                currentView={view} onChangeView={setView} onOpenCreate={() => setView('create-project')}
                onOpenCreateTask={() => setShowCreateTask(true)} onToggleTheme={toggleTheme} onLogout={handleLogout}
                onSearch={(q) => setSearchTerm(q)} onOpenFeedback={() => setShowFeedback(true)} theme={theme}
                dbStatus={dbStatus} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
                userData={userData || { name: 'Carregando...', avatar: null }} currentPlan={currentPlan}
                customLogoUrl={appLogoUrl} orgName={appBrandName} activeModules={activeModules}
            />
        )}

        <main className={`flex-1 overflow-hidden relative ${!isSharedMode ? 'pt-16 xl:pt-0' : ''}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={closeProject}
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadOpportunities(userOrgId!))}
                        onEdit={onEditProject} onDelete={(id) => deleteOpportunity(id).then(() => { closeProject(); loadOpportunities(userOrgId!); })}
                        userRole={userRole} currentPlan={currentPlan} isSharedMode={isSharedMode} activeModules={activeModules}
                    />
                ) : 
                (view === 'create-project' || view === 'edit-project') ? (
                    <OpportunityWizard 
                        initialData={editingOpportunity || undefined}
                        onSave={async (opp) => {
                            if (editingOpportunity) {
                                await updateOpportunity(opp);
                                if(userOrgId) loadOpportunities(userOrgId);
                                onOpenProject(opp);
                            } else {
                                const newOpp = await createOpportunity({ ...opp, organizationId: userOrgId });
                                if(userOrgId) loadOpportunities(userOrgId);
                                if(newOpp) onOpenProject(newOpp);
                                else setView('dashboard');
                            }
                        }}
                        onCancel={() => {
                            if (editingOpportunity) onOpenProject(editingOpportunity);
                            else setView('dashboard');
                        }}
                        orgType={orgDetails.name} activeModules={activeModules}
                    />
                ) :
                (
                    <>
                        {view === 'dashboard' && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <Dashboard 
                                    opportunities={filteredOpportunities} 
                                    onNavigate={(status) => { if (status === 'Active' || status === 'Negotiation' || status === 'Future') setView('kanban'); }}
                                    onOpenProject={onOpenProject} user={{ user_metadata: { full_name: userData?.name } }} 
                                    theme={theme} userRole={userRole} organizationId={userOrgId || undefined}
                                    appBrandName={appBrandName} whitelabel={shouldUseWhitelabel}
                                    onActivateWhitelabel={() => { setSettingsStartTab('modules'); setView('settings'); }}
                                    activeModules={activeModules}
                                />
                            </div>
                        )}
                        {view === 'list' && activeModules.includes('projects') && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <ProjectList 
                                    opportunities={filteredOpportunities} onOpenProject={onOpenProject}
                                    userRole={userRole} organizationId={userOrgId || undefined}
                                    activeModules={activeModules} onOpenCreate={() => setView('create-project')}
                                />
                            </div>
                        )}
                        {view === 'kanban' && activeModules.includes('kanban') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <KanbanBoard onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} currentPlan={currentPlan} activeModules={activeModules} projectId={undefined} />
                            </div>
                        )}
                        {view === 'gantt' && activeModules.includes('gantt') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <GanttView opportunities={filteredOpportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} userRole={userRole} organizationId={userOrgId || undefined} customPrimaryColor={appPrimaryColor} />
                            </div>
                        )}
                        {view === 'calendar' && activeModules.includes('calendar') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <CalendarView opportunities={filteredOpportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} userRole={userRole} organizationId={userOrgId || undefined} activeModules={activeModules} />
                            </div>
                        )}
                        {view === 'crm' && activeModules.includes('crm') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <CrmBoard organizationId={userOrgId || undefined} />
                            </div>
                        )}
                        {view === 'financial' && activeModules.includes('financial') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <FinancialScreen orgType={orgDetails.name} />
                            </div>
                        )}
                        {view === 'clients' && activeModules.includes('clients') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <ClientsScreen userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} onOpenProject={onOpenProject} />
                            </div>
                        )}
                        {view === 'product' && activeModules.includes('product') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <ProductIndicators />
                            </div>
                        )}
                        {view === 'dev-metrics' && activeModules.includes('engineering') && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <DevIndicators organizationId={userOrgId || undefined} />
                            </div>
                        )}
                        {view === 'settings' && (
                            <SettingsScreen 
                                theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId}
                                orgDetails={orgDetails} onUpdateOrgDetails={handleUpdateOrgDetails} setView={setView}
                                userRole={userRole} userData={userData} currentPlan={currentPlan} activeModules={activeModules}
                                onRefreshModules={handleRefreshModules} initialTab={settingsStartTab}
                            />
                        )}
                        {view === 'profile' && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <ProfileScreen currentPlan={currentPlan} onRefresh={() => user && loadUserData(user.id)} />
                            </div>
                        )}
                        {view === 'admin-manager' && userData?.email === 'peboorba@gmail.com' && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <AdminManagerScreen onlineUsers={onlineUsers}/>
                            </div>
                        )}
                    </>
                )}
            </Suspense>
        </main>

        {showCreateTask && (
            <QuickTaskModal 
                opportunities={opportunities} onClose={() => setShowCreateTask(false)}
                onSave={handleCreateTask} userRole={userRole}
            />
        )}

        {showFeedback && user && <FeedbackModal userId={user.id} onClose={() => setShowFeedback(false)} />}
        {user && userRole !== 'cliente' && !isSharedMode && activeModules.includes('ia') && <GuruFab opportunities={opportunities} user={user} organizationId={userOrgId || undefined} onAction={handleGuruAction} />}
        {showOnboarding && <OnboardingGuide run={showOnboarding} onFinish={() => setShowOnboarding(false)} />}
        {user && <NpsSurvey userId={user.id} userRole={userRole} />}
    </div>
  );
};

export default App;
