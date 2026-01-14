
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { updateOrgDetails, fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { mapDbPlanIdToString } from './services/asaasService';

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
import { ValueChainDashboard } from './pages/ValueChainDashboard';
import { AssetsPage } from './pages/AssetsPage';
import { TicketPortalPage } from './pages/TicketPortalPage';

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
import { Loader2 } from 'lucide-react';

const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'value-chain': '/value-chain',
    'ecosystem': '/ecosystem',
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
    'assets': '/assets',
    'settings': '/settings',
    'profile': '/profile',
    'admin-manager': '/admin'
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

  const handleRouting = async () => {
      let path = window.location.pathname;

      // Rota Pública de Tickets
      if (path.startsWith('/ticket/')) {
          setViewState('ticket-portal');
          return;
      }

      if (path.startsWith('/blog')) {
          const slug = path.split('/')[2];
          setShowBlog(true);
          setBlogPostSlug(slug || null);
          return;
      } else { setShowBlog(false); }

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
      } finally { 
          setLoading(false); 
      }
  };

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Renderização da Rota de Ticket (Pública)
  if (view === 'ticket-portal') {
      return <TicketPortalPage />;
  }

  if (!user && !loading) {
      if (showBlog) return ( <InsightCenter initialPostSlug={blogPostSlug} onBack={() => { setShowBlog(false); navigateTo('/'); }} onEnter={() => setShowAuth(true)} /> );
      return (
          <>
            <LandingPage onEnter={() => setShowAuth(true)} customName={orgDetails.name} onOpenBlog={() => { setShowBlog(true); navigateTo('/blog'); }} />
            {showAuth && <AuthScreen onClose={() => setShowAuth(false)} onGuestLogin={() => {}} customOrgName={orgDetails.name} />}
          </>
      );
  }

  const commonProps = {
      currentView: view, onChangeView: setView,
      onOpenCreate: () => setView('create-project'), 
      onOpenCreateTask: () => setShowCreateTask(true),
      onToggleTheme: toggleTheme, onLogout: () => supabase.auth.signOut(),
      onSearch: () => {}, onOpenFeedback: () => setShowFeedback(true),
      theme: theme, dbStatus: 'connected' as const, isMobileOpen, setIsMobileOpen, userRole,
      userData: userData || { name: '...', avatar: null, email: user?.email },
      currentPlan, orgName: orgDetails.name, activeModules, customLogoUrl: orgDetails.logoUrl,
      organizationId: userOrgId || undefined
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-color)] text-slate-900 transition-colors duration-300">
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
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadUserData(user.id))}
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
                        
                        {view === 'kanban' && <TasksPage initialSubView="kanban" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                        {view === 'calendar' && <TasksPage initialSubView="calendar" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                        {view === 'gantt' && <TasksPage initialSubView="gantt" opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                        
                        {view === 'crm' && <CrmPage organizationId={userOrgId || undefined} />}
                        {view === 'financial' && <FinancialPage orgType={orgDetails.name} />}
                        {view === 'clients' && <ClientsPage userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} onOpenProject={onOpenProject} />}
                        {view === 'value-chain' && <ValueChainDashboard organizationId={userOrgId || undefined} />}
                        {view === 'ecosystem' && <EcosystemPage organizationId={userOrgId || undefined} userRole={userRole} />}
                        {view === 'intelligence' && <IntelligencePage organizationId={userOrgId || undefined} opportunities={opportunities} />}
                        {view === 'assets' && <AssetsPage organizationId={userOrgId || undefined} />}
                        {view === 'settings' && <SettingsPage theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={() => {}} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => loadUserData(user.id)} />}
                        {view === 'profile' && <ProfilePage currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} />}
                        {view === 'admin-manager' && (userData?.email === 'peboorba@gmail.com') && <AdminPage onlineUsers={onlineUsers} />}
                    </>
                )}
            </Suspense>
        </main>

        {showCreateTask && <QuickTaskModal opportunities={opportunities} onClose={() => setShowCreateTask(false)} onSave={async (task, pid) => {
            if (!userOrgId || !user) return;
            const { id, ...taskWithoutId } = task as any;
            await createTask({...taskWithoutId, projeto: pid ? Number(pid) : null, responsavel: task.assigneeId || user.id, organizacao: userOrgId});
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
