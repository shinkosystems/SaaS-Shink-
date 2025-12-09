


import React, { useState, useEffect, Suspense } from 'react';
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

  // Trial State
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);

  const [view, setView] = useState<string>('dashboard');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // New State for Feedback Modal
  const [showFeedback, setShowFeedback] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Opportunity | null>(null);
  const [isSharedMode, setIsSharedMode] = useState(false); // Controls focused view
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

  // Check URL for White Label or Password Reset
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
                      // If loaded via URL param, assume whitelabel context initially
                      isWhitelabelActive: true 
                  }));
              }
          });
      }
  }, []);

  // Sync Plan from Org State (Redundant safety check)
  useEffect(() => {
      if (orgPlanId !== null) {
          const planString = mapDbPlanIdToString(orgPlanId);
          setCurrentPlan(planString);
      }
  }, [orgPlanId]);

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

  // DEEP LINKING HANDLER (Run when user is authenticated)
  useEffect(() => {
      const handleDeepLink = async () => {
          if (!user) return;
          const params = new URLSearchParams(window.location.search);
          const projectId = params.get('project');
          
          if (projectId) {
              console.log("Deep Link detectado para o projeto:", projectId);
              // Activate Shared Mode (Hides Navigation)
              setIsSharedMode(true);
              
              const opp = await fetchOpportunityById(projectId);
              if (opp) {
                  setSelectedProject(opp);
              } else {
                  console.warn("Projeto não encontrado ou usuário sem permissão.");
                  setIsSharedMode(false); // Revert if failed
              }
          }
      };
      handleDeepLink();
  }, [user]);

  // Determine Plan & Org
  const loadUserData = async (userId: string) => {
      setLoading(true);
      try {
          const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
          
          if (data) {
              setUserData({
                  name: data.nome,
                  email: data.email,
                  avatar: data.avatar_url,
              });
              setUserRole(data.perfil || 'colaborador');
              setUserOrgId(data.organizacao);
              
              if (data.organizacao) {
                  // Await ensures Plan ID is set BEFORE rendering main views
                  await loadOrganization(data.organizacao);
                  loadOpportunities(data.organizacao);
              }

              // Analytics & Presence
              trackUserAccess(userId);
              const unsubPresence = subscribeToPresence(userId, (ids) => setOnlineUsers(ids));
              
              // Only call fallback if orgPlanId was somehow not set by loadOrganization
              if (orgPlanId === null) {
                  const plan = await getCurrentUserPlan(userId);
                  setCurrentPlan(plan);
              }

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
          // UPDATE APP STATE FOR PLAN ID
          let planId = data.plano || 4; // Default to Free (4) if null
          
          // TRIAL LOGIC Check (IDs 6 and 8)
          if (planId === 6 || planId === 8) {
              const createdAt = new Date(data.created_at);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - createdAt.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const remaining = 15 - diffDays;

              if (remaining < 0) {
                  // Trial Expired - Force Free Plan
                  planId = 4;
                  alert("Seu período de avaliação (Trial) de 15 dias expirou. Sua conta foi migrada para o plano Free. Faça um upgrade para continuar usando os recursos Enterprise.");
                  setTrialDaysRemaining(null);
              } else {
                  // Active Trial
                  setTrialDaysRemaining(remaining);
                  // Plan ID stays 6 or 8, which maps to plan_trial (Enterprise features)
              }
          } else {
              setTrialDaysRemaining(null);
          }

          setOrgPlanId(planId);
          
          // FORCE UPDATE CURRENT PLAN IMMEDIATELY (Source of Truth is Org Table)
          const planString = mapDbPlanIdToString(planId);
          setCurrentPlan(planString);

          setOrgDetails({
              name: data.nome,
              limit: data.colaboradores,
              logoUrl: data.logo,
              primaryColor: data.cor || '#F59E0B',
              aiSector: data.setor || '',
              aiTone: data.tomdevoz || '',
              aiContext: data.dna || '',
              // Enterprise Plan ID is 10, but Trial (6 or 8) also unlocks whitelabel if active
              isWhitelabelActive: planId === 10 || planId === 6 || planId === 8
          });
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

  // Initialize Theme
  useEffect(() => {
      if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);

  const handleCreateTask = async (task: BpmnTask, projectId: string | null) => {
      if (!userOrgId || !user) return;
      
      await createTask({
          projeto: projectId ? Number(projectId) : null,
          titulo: task.text,
          descricao: task.description,
          status: task.status,
          responsavel: task.assigneeId || user.id,
          gravidade: task.gut?.g,
          urgencia: task.gut?.u,
          tendencia: task.gut?.t,
          datainicio: task.startDate,
          datafim: task.dueDate,
          duracaohoras: task.estimatedHours,
          organizacao: userOrgId,
          sutarefa: false
      });
      
      alert("Tarefa criada com sucesso!");
      loadOpportunities(userOrgId);
  };

  const handleUpdateOrgDetails = async (updates: { logoFile?: File, color?: string, name?: string, limit?: number, aiSector?: string, aiTone?: string, aiContext?: string }) => {
      if (!userOrgId) return;
      try {
          let logoUrl = undefined;
          if (updates.logoFile) {
              logoUrl = await uploadLogo(userOrgId, updates.logoFile);
          }
          
          await updateOrgDetails(userOrgId, {
              logoUrl,
              primaryColor: updates.color,
              name: updates.name,
              limit: updates.limit,
              aiSector: updates.aiSector,
              aiTone: updates.aiTone,
              aiContext: updates.aiContext
          });
          
          // Refresh local state
          loadOrganization(userOrgId);
          alert('Configurações atualizadas!');
      } catch (e: any) {
          alert('Erro ao atualizar: ' + e.message);
      }
  };

  const handleGuruAction = (actionId: string) => {
      if (actionId === 'nav_kanban') setView('kanban');
      else if (actionId === 'nav_calendar') setView('calendar');
      else if (actionId === 'nav_financial') setView('financial');
      else if (actionId === 'nav_matrix') setView('dashboard');
      else if (actionId === 'create_project') setShowCreate(true);
      else if (actionId === 'create_task') setShowCreateTask(true);
      else {
          console.warn("Action ID not handled:", actionId);
      }
  };

  // --- WHITELABEL LOGIC ---
  // If plan is Enterprise OR isWhitelabelActive (via link), override branding
  const isEnterprise = currentPlan === 'plan_enterprise';
  const shouldUseWhitelabel = isEnterprise || orgDetails.isWhitelabelActive;
  
  const appBrandName = shouldUseWhitelabel && orgDetails.name ? orgDetails.name : 'Shinkō OS';
  const appLogoUrl = shouldUseWhitelabel ? orgDetails.logoUrl : null;
  const appPrimaryColor = shouldUseWhitelabel ? orgDetails.primaryColor : '#F59E0B';

  // Update Page Title
  useEffect(() => {
      document.title = appBrandName;
  }, [appBrandName]);

  // Inject Custom Brand Color into CSS Variables globally
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

  if (!user && !loading) {
      return (
          <>
            <LandingPage 
                onEnter={() => setShowAuth(true)} 
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

  // App Layout
  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        
        {/* Trial Banner */}
        {trialDaysRemaining !== null && (
            <div className="fixed top-0 left-0 right-0 z-[100] h-8 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                <span>🔥 Modo Trial Enterprise Ativo: {trialDaysRemaining} dias restantes para testar tudo sem limites!</span>
            </div>
        )}

        {/* HIDE SIDEBAR IN SHARED MODE */}
        {!isSharedMode && (
            <div className={trialDaysRemaining !== null ? 'mt-8' : ''}>
                <Sidebar 
                    currentView={view} 
                    onChangeView={setView} 
                    onOpenCreate={() => setShowCreate(true)}
                    onOpenCreateTask={() => setShowCreateTask(true)}
                    onToggleTheme={toggleTheme}
                    onLogout={handleLogout}
                    onSearch={(q) => console.log(q)}
                    // PASS FEEDBACK HANDLER
                    onOpenFeedback={() => setShowFeedback(true)}
                    theme={theme}
                    dbStatus={dbStatus}
                    isMobileOpen={isMobileOpen}
                    setIsMobileOpen={setIsMobileOpen}
                    userRole={userRole}
                    userData={userData || { name: 'Carregando...', avatar: null }}
                    currentPlan={currentPlan}
                    // WHITELABEL PROPS
                    customLogoUrl={appLogoUrl}
                    orgName={appBrandName}
                />
            </div>
        )}
        
        {/* HIDE MOBILE DRAWER IN SHARED MODE */}
        {!isSharedMode && (
            <MobileDrawer 
                currentView={view} 
                onChangeView={setView} 
                onOpenCreate={() => setShowCreate(true)}
                onOpenCreateTask={() => setShowCreateTask(true)}
                onToggleTheme={toggleTheme}
                onLogout={handleLogout}
                onSearch={(q) => console.log(q)}
                // PASS FEEDBACK HANDLER
                onOpenFeedback={() => setShowFeedback(true)}
                theme={theme}
                dbStatus={dbStatus}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                userRole={userRole}
                userData={userData || { name: 'Carregando...', avatar: null }}
                currentPlan={currentPlan}
                // WHITELABEL PROPS
                customLogoUrl={appLogoUrl}
                orgName={appBrandName}
            />
        )}

        {/* Adjust Main Padding if Shared Mode (Remove mobile header spacing) */}
        <main className={`flex-1 overflow-hidden relative ${!isSharedMode ? 'pt-16 xl:pt-0' : ''} ${trialDaysRemaining !== null ? 'mt-8' : ''}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} 
                        onBack={() => {
                            // If in shared mode, clicking back should exit shared mode and clear URL
                            if (isSharedMode) {
                                window.history.replaceState(null, '', '/');
                                setIsSharedMode(false);
                            }
                            setSelectedProject(null);
                        }}
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadOpportunities(userOrgId!))}
                        onEdit={(opp) => { setShowCreate(true); /* Logic to populate wizard could be added here */ }}
                        onDelete={(id) => deleteOpportunity(id).then(() => { setSelectedProject(null); loadOpportunities(userOrgId!); })}
                        userRole={userRole}
                        currentPlan={currentPlan}
                        isSharedMode={isSharedMode}
                    />
                ) : (
                    <>
                        {view === 'dashboard' && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <Dashboard 
                                    opportunities={opportunities} 
                                    onNavigate={(status) => {
                                        if (status === 'Active' || status === 'Negotiation' || status === 'Future') {
                                            // Ideally filter the list, for now just stay on dashboard or move to kanban/list
                                            setView('kanban'); 
                                        }
                                    }}
                                    onOpenProject={setSelectedProject}
                                    user={{ user_metadata: { full_name: userData?.name } }} 
                                    theme={theme}
                                    userRole={userRole}
                                    organizationId={userOrgId || undefined}
                                    // WHITELABEL PROPS
                                    appBrandName={appBrandName}
                                    whitelabel={isEnterprise}
                                    onActivateWhitelabel={() => setView('settings')}
                                />
                            </div>
                        )}
                        {view === 'list' && (
                            <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <ProjectList 
                                    opportunities={opportunities} 
                                    onOpenProject={setSelectedProject}
                                    userRole={userRole}
                                    organizationId={userOrgId || undefined}
                                />
                            </div>
                        )}
                        {view === 'kanban' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <KanbanBoard 
                                    onSelectOpportunity={setSelectedProject} 
                                    userRole={userRole}
                                    organizationId={userOrgId || undefined}
                                    currentPlan={currentPlan}
                                />
                            </div>
                        )}
                        {view === 'gantt' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <GanttView 
                                    opportunities={opportunities} 
                                    onSelectOpportunity={setSelectedProject} 
                                    onTaskUpdate={() => {}} 
                                    userRole={userRole}
                                    organizationId={userOrgId || undefined}
                                    customPrimaryColor={appPrimaryColor}
                                />
                            </div>
                        )}
                        {view === 'calendar' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <CalendarView 
                                    opportunities={opportunities} 
                                    onSelectOpportunity={setSelectedProject} 
                                    onTaskUpdate={() => {}} 
                                    userRole={userRole}
                                    organizationId={userOrgId || undefined}
                                />
                            </div>
                        )}
                        {view === 'financial' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <FinancialScreen orgType={orgDetails.name} />
                            </div>
                        )}
                        {view === 'clients' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
                                <ClientsScreen userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined}/>
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
                        {view === 'settings' && (
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
                                currentPlan={currentPlan}
                            />
                        )}
                        {view === 'profile' && (
                            <div className="h-full p-4 md:p-8 overflow-hidden">
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

        {showCreate && (
            <OpportunityWizard 
                onSave={async (opp) => {
                    await createOpportunity({ ...opp, organizationId: userOrgId });
                    if(userOrgId) loadOpportunities(userOrgId);
                    setShowCreate(false);
                }}
                onCancel={() => setShowCreate(false)}
                orgType={orgDetails.name}
            />
        )}

        {showCreateTask && (
            <QuickTaskModal 
                opportunities={opportunities} 
                onClose={() => setShowCreateTask(false)}
                onSave={handleCreateTask}
                userRole={userRole}
            />
        )}

        {/* FEEDBACK MODAL (NEW) */}
        {showFeedback && user && (
            <FeedbackModal 
                userId={user.id} 
                onClose={() => setShowFeedback(false)} 
            />
        )}

        {/* Global AI Assistant Button - Only Show if not in Shared Mode */}
        {user && userRole !== 'cliente' && !isSharedMode && (
            <GuruFab 
                opportunities={opportunities} 
                user={user} 
                organizationId={userOrgId || undefined} 
                onAction={handleGuruAction}
            />
        )}

        {showOnboarding && <OnboardingGuide run={showOnboarding} onFinish={() => setShowOnboarding(false)} />}
        
        {user && <NpsSurvey userId={user.id} userRole={userRole} />}
    </div>
  );
};

export default App;