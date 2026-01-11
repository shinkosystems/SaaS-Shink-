
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { getPublicOrgDetails, updateOrgDetails, uploadLogo, fetchActiveOrgModules, getPlanDefaultModules, SYSTEM_MODULES_DEF } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { getCurrentUserPlan, mapDbPlanIdToString } from './services/asaasService';

// Navigation Components
import { Sidebar, MobileDrawer } from './components/Navigation';

// Page Components
import { DashboardPage } from './pages/DashboardPage';
import { FrameworkPage } from './pages/FrameworkPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { CrmPage } from './pages/CrmPage';
import { FinancialPage } from './pages/FinancialPage';
import { ClientsPage } from './pages/ClientsPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { EcosystemPage } from './pages/EcosystemPage';

// Utility Components
import AuthScreen from './components/AuthScreen';
import OpportunityWizard from './components/OpportunityWizard';
import { QuickTaskModal } from './components/QuickTaskModal';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { NpsSurvey } from './components/NpsSurvey';
import { GuruFab } from './components/GuruFab';
import { FeedbackModal } from './components/FeedbackModal';
import { LandingPage } from './components/LandingPage';
import { InsightCenter } from './components/InsightCenter';
import { MetaController } from './components/MetaController';
import { Loader2, AlertCircle, Zap, ArrowRight, CreditCard } from 'lucide-react';

const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'framework-system': '/framework',
    'list': '/projects',
    'create-project': '/project/new',
    'kanban': '/tasks',
    'calendar': '/calendar',
    'gantt': '/timeline',
    'crm': '/crm',
    'financial': '/finance',
    'clients': '/clients',
    'intelligence': '/intelligence',
    'settings': '/settings',
    'profile': '/profile',
    'admin-manager': '/admin',
    'ecosystem': '/ecosystem'
};

const REVERSE_ROUTES: Record<string, string> = Object.entries(ROUTES).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('visitante');
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('plan_free');
  const [view, setViewState] = useState<string>('dashboard');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState<string[]>(['ia', 'projects', 'kanban']); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedProject, setSelectedProjectState] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [guruInitialPrompt, setGuruInitialPrompt] = useState<string | null>(null);
  const [isUserActive, setIsUserActive] = useState<boolean>(true);
  const [tasksVersion, setTasksVersion] = useState(0); 
  
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('shinko_theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showBlog, setShowBlog] = useState(false);
  const [blogPostSlug, setBlogPostSlug] = useState<string | null>(null);
  const [orgDetails, setOrgDetails] = useState({ 
      name: '', limit: 1, logoUrl: null, primaryColor: '#F59E0B', aiSector: '', aiTone: '', aiContext: '' 
  });
  const [dbStatus, setDbStatus] = useState<'connected'|'disconnected'>('connected');

  const [pageMeta, setPageMeta] = useState<{title?: string, description?: string, image?: string}>({});

  const handleRouting = async () => {
      let path = window.location.pathname;
      if (path === '/') {
          setPageMeta({ title: 'Home', description: 'Sistema Operacional para Framework Shinkō' });
      } else if (path.startsWith('/blog')) {
          const slug = path.split('/')[2];
          setShowBlog(true);
          setBlogPostSlug(slug || null);
          return;
      } else { 
          setShowBlog(false); 
          const viewKey = REVERSE_ROUTES[path];
          if (viewKey) {
              setPageMeta({ title: viewKey.charAt(0).toUpperCase() + viewKey.slice(1) });
          }
      }

      if (path === '/project/new') {
          setViewState('create-project');
          setSelectedProjectState(null);
          setEditingOpportunity(null);
          return;
      }

      if (path.startsWith('/project/')) {
          const parts = path.split('/');
          const projectId = parts[2];
          const subAction = parts[3]; 

          const opp = await fetchOpportunityById(projectId);
          if (opp) {
              setPageMeta({ title: opp.title, description: opp.description?.substring(0, 160) });
              if (subAction === 'edit') {
                  setEditingOpportunity(opp);
                  setSelectedProjectState(null);
                  setViewState('edit-project');
              } else {
                  setSelectedProjectState(opp);
                  setEditingOpportunity(null);
                  setViewState('project-view');
              }
          } else setView('dashboard');
          return;
      }

      const mappedView = REVERSE_ROUTES[path];
      if (mappedView) setViewState(mappedView);
      else setViewState('dashboard');
  };

  const navigateTo = (path: string) => {
      try { 
        window.history.pushState({}, '', path); 
        handleRouting(); 
      } catch (e) { 
        console.warn("Routing blocked:", e); 
      }
  };

  const setView = (newView: string) => {
      setViewState(newView);
      setSelectedProjectState(null); 
      setEditingOpportunity(null);
      setIsMobileOpen(false);
      navigateTo(ROUTES[newView] || '/');
  };

  const onOpenProject = (opp: Opportunity) => {
      setSelectedProjectState(opp);
      setEditingOpportunity(null);
      navigateTo(`/project/${opp.id}`);
  };

  const onEditProject = (opp: Opportunity) => {
      setEditingOpportunity(opp);
      setSelectedProjectState(null);
      navigateTo(`/project/${opp.id}/edit`);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
    }
    localStorage.setItem('shinko_theme', theme);
  }, [theme]);

  useEffect(() => {
      handleRouting();
      window.addEventListener('popstate', handleRouting);
      return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else { setUserData(null); setOpportunities([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
      setLoading(true);
      try {
          const { data } = await supabase.from('users').select('*').eq('id', userId).single();
          if (data) {
              setUserData({ name: data.nome, email: data.email, avatar: data.avatar_url });
              const currentRole = data.perfil || 'colaborador';
              setUserRole(currentRole);
              setUserOrgId(data.organizacao);
              setIsUserActive(data.ativo !== false); 
              
              if (data.organizacao) {
                  const { data: orgData } = await supabase.from('organizacoes').select('*').eq('id', data.organizacao).single();
                  
                  if (orgData) {
                    setCurrentPlan(mapDbPlanIdToString(orgData.plano || 4));
                    setOrgDetails({
                        name: orgData.nome, limit: orgData.colaboradores, logoUrl: orgData.logo, primaryColor: orgData.cor || '#F59E0B',
                        aiSector: orgData.setor || '', aiTone: orgData.tomdevoz || '', aiContext: orgData.dna || ''
                    });

                    const modules = await fetchActiveOrgModules(data.organizacao);
                    setActiveModules(modules.length > 0 ? modules : getPlanDefaultModules(orgData.plano || 4));
                  }
                  
                  const clientId = currentRole === 'cliente' ? data.id : undefined;
                  const opps = await fetchOpportunities(data.organizacao, clientId);
                  if (opps) setOpportunities(opps);
              }
              trackUserAccess(userId);
              subscribeToPresence(userId, setOnlineUsers);
          }
      } catch (e) { 
          console.error("Erro no carregamento:", e);
          setDbStatus('disconnected'); 
      } finally { 
          setLoading(false); 
      }
  };

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!user && !loading) {
      if (showBlog) return ( <InsightCenter initialPostSlug={blogPostSlug} onBack={() => { setShowBlog(false); navigateTo('/'); }} onEnter={() => setShowAuth(true)} /> );
      return (
          <>
            <MetaController title="Home" description="Shinkō OS - Gestão de Inovação de Alta Performance" />
            <LandingPage onEnter={() => setShowAuth(true)} customName={orgDetails.name} onOpenBlog={() => { setShowBlog(true); navigateTo('/blog'); }} />
            {showAuth && <AuthScreen onClose={() => setShowAuth(false)} onGuestLogin={() => {}} customOrgName={orgDetails.name} />}
          </>
      );
  }

  if (!isUserActive && user && !loading) {
      return (
          <div className="fixed inset-0 z-[5000] bg-white dark:bg-[#020203] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none"></div>
              <div className="w-24 h-24 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8 shadow-2xl animate-bounce">
                  <AlertCircle className="w-12 h-12"/>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-6">
                  Sua assinatura <br/><span className="text-red-500">expirou</span>.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md font-medium mb-12">
                  A conta <span className="text-slate-900 dark:text-white font-bold">{orgDetails.name}</span> atingiu o final do ciclo contratado. Renove agora para reativar sua engenharia de valor.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                    onClick={() => setView('profile')} 
                    className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl active:scale-95"
                >
                    <CreditCard className="w-5 h-5"/> Ver Planos de Renovação
                </button>
                <button 
                    onClick={() => supabase.auth.signOut()} 
                    className="px-10 py-5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-red-500/10 hover:text-red-500"
                >
                    Sair da Conta
                </button>
              </div>

              <div className="mt-20 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Zap className="w-3.5 h-3.5 text-amber-500"/> Seus dados estão seguros e criptografados.
                  </div>
              </div>
          </div>
      );
  }

  const commonProps = {
      currentView: view, onChangeView: setView,
      onOpenCreate: () => setView('create-project'), 
      onOpenCreateTask: () => setShowCreateTask(true),
      onToggleTheme: toggleTheme, onLogout: () => supabase.auth.signOut(),
      onSearch: () => {}, onOpenFeedback: () => setShowFeedback(true),
      theme: theme, dbStatus, isMobileOpen, setIsMobileOpen, userRole,
      userData: userData || { name: '...', avatar: null, email: user?.email },
      currentPlan, orgName: orgDetails.name, activeModules, customLogoUrl: orgDetails.logoUrl,
      organizationId: userOrgId
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-color)] text-slate-900 transition-colors duration-300">
        <MetaController {...pageMeta} />
        {view !== 'create-project' && !editingOpportunity && <Sidebar {...commonProps} />}
        {view !== 'create-project' && !editingOpportunity && <MobileDrawer {...commonProps} />}
        
        <main className={`flex-1 overflow-hidden relative pt-16 lg:pt-0`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-amber-500 w-8 h-8"/></div>}>
                {editingOpportunity ? (
                    <OpportunityWizard 
                        initialData={editingOpportunity} 
                        orgType={orgDetails.name}
                        customLogoUrl={orgDetails.logoUrl}
                        onSave={async (opp) => {
                            await updateOpportunity(opp);
                            loadUserData(user.id);
                            onOpenProject(opp);
                        }}
                        onCancel={() => onOpenProject(editingOpportunity)}
                    />
                ) : selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={() => setSelectedProjectState(null)}
                        onUpdate={(opp) => {
                            setSelectedProjectState(opp);
                            setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
                            updateOpportunity(opp).then(() => loadUserData(user.id));
                        }}
                        onEdit={(opp) => onEditProject(opp)} 
                        onDelete={(id) => deleteOpportunity(id).then(() => setSelectedProjectState(null))}
                        userRole={userRole} currentPlan={currentPlan} activeModules={activeModules}
                        customLogoUrl={orgDetails.logoUrl} orgName={orgDetails.name}
                    />
                ) : view === 'create-project' ? (
                    <OpportunityWizard 
                        orgType={orgDetails.name}
                        customLogoUrl={orgDetails.logoUrl}
                        onSave={async (opp) => {
                            const newOpp = await createOpportunity({ 
                                ...opp, 
                                organizationId: userOrgId || undefined 
                            });
                            if (newOpp) {
                                await loadUserData(user.id);
                                onOpenProject(newOpp);
                            } else {
                                alert("Falha ao salvar o projeto.");
                                setView('dashboard');
                            }
                        }}
                        onCancel={() => setView('dashboard')}
                    />
                ) : (
                    <>
                        {view === 'dashboard' && <DashboardPage 
                            opportunities={opportunities} onOpenProject={onOpenProject} 
                            onNavigate={setView} user={user} theme={theme} 
                            onGuruPrompt={(p) => setGuruInitialPrompt(p)}
                        />}
                        {view === 'framework-system' && <FrameworkPage orgName={orgDetails.name} onBack={() => setView('dashboard')} onSaveToProject={async (opp) => {
                            const newOpp = await createOpportunity({ ...opp, organizationId: userOrgId || undefined });
                            if (newOpp) {
                                await loadUserData(user.id);
                                onOpenProject(newOpp);
                            } else setView('dashboard');
                        }} />}
                        {view === 'list' && <ProjectsPage opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} onRefresh={() => loadUserData(user.id)} />}
                        
                        {view === 'kanban' && <TasksPage initialSubView="kanban" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} tasksVersion={tasksVersion} />}
                        {view === 'calendar' && <TasksPage initialSubView="calendar" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} tasksVersion={tasksVersion} />}
                        {view === 'gantt' && <TasksPage initialSubView="gantt" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} tasksVersion={tasksVersion} />}
                        
                        {view === 'crm' && <CrmPage organizationId={userOrgId || undefined} />}
                        {view === 'financial' && <FinancialPage orgType={orgDetails.name} />}
                        {view === 'clients' && <ClientsPage userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} onOpenProject={onOpenProject} />}
                        {view === 'intelligence' && <IntelligencePage organizationId={userOrgId || undefined} opportunities={opportunities} />}
                        {view === 'settings' && <SettingsPage theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={() => {}} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => loadUserData(user.id)} />}
                        {view === 'profile' && <ProfilePage currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} />}
                        {view === 'admin-manager' && (userData?.email === 'peboorba@gmail.com') && <AdminPage onlineUsers={onlineUsers} />}
                        {view === 'ecosystem' && <EcosystemPage organizationId={userOrgId} userRole={userRole} />}
                    </>
                )}
            </Suspense>
        </main>

        {showCreateTask && <QuickTaskModal opportunities={opportunities} onClose={() => setShowCreateTask(false)} onSave={async (task, pid) => {
            if (!userOrgId || !user) return;
            // MAPEAMENTO CORRETO: task.text do modal vira titulo no DB
            await createTask({
                titulo: task.text,
                descricao: task.description,
                status: task.status || 'todo',
                responsavel: task.assigneeId || user.id,
                projeto: pid ? Number(pid) : null,
                organizacao: userOrgId,
                duracaohoras: task.estimatedHours,
                datafim: task.dueDate,
                gravidade: task.gut?.g,
                urgencia: task.gut?.u,
                tendencia: task.gut?.t
            });
            setTasksVersion(v => v + 1); 
            loadUserData(user.id);
            setShowCreateTask(false);
        }} userRole={userRole} />}
        {showFeedback && user && <FeedbackModal userId={user.id} onClose={() => setShowFeedback(false)} />}
        {user && userRole !== 'cliente' && activeModules.includes('ia') && (
            <GuruFab 
                opportunities={opportunities} user={user} organizationId={userOrgId || undefined} 
                onAction={(aid) => aid === 'create_task' ? setShowCreateTask(true) : setView(aid.replace('nav_', ''))} 
                externalPrompt={guruInitialPrompt}
                onExternalPromptConsumed={() => setGuruInitialPrompt(null)}
            />
        )}
        <NpsSurvey userId={user?.id} userRole={userRole} />
    </div>
  );
};

export default App;
