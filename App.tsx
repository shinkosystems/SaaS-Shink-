
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { getPublicOrgDetails, updateOrgDetails, uploadLogo, fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { getCurrentUserPlan, mapDbPlanIdToString } from './services/asaasService';

// Icons/Components
const Loader2 = ({className}: {className?: string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
);

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
import { AssetsScreen } from './components/AssetsScreen';

// --- ROUTING CONFIGURATION ---
const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'list': '/projects',
    'create-project': '/project/new',
    'kanban': '/kanban',
    'assets': '/assets',
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
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('visitante');
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('plan_free');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setViewState] = useState<string>('dashboard');
  const [settingsStartTab, setSettingsStartTab] = useState<'general' | 'team' | 'ai' | 'modules'>('general');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState<string[]>(['projects', 'kanban']); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [blogPostSlug, setBlogPostSlug] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedProject, setSelectedProjectState] = useState<Opportunity | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>('dark');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [orgDetails, setOrgDetails] = useState<{ 
      name: string, limit: number, logoUrl: string | null, primaryColor: string, aiSector: string, aiTone: string, aiContext: string, isWhitelabelActive?: boolean
  }>({ name: '', limit: 1, logoUrl: null, primaryColor: '#F59E0B', aiSector: '', aiTone: '', aiContext: '', isWhitelabelActive: false });
  const [dbStatus, setDbStatus] = useState<'connected'|'disconnected'>('connected');

  const navigateTo = (path: string) => {
      try { window.history.pushState({}, '', path); } catch (e) { console.warn("Routing blocked:", e); }
  };

  const setView = (newView: string) => {
      setViewState(newView);
      setSelectedProjectState(null); 
      setEditingOpportunity(null);
      navigateTo(ROUTES[newView] || '/');
  };

  const onOpenProject = (opp: Opportunity) => {
      setSelectedProjectState(opp);
      navigateTo(`/project/${opp.id}`);
  };

  const onEditProject = (opp: Opportunity) => {
      setEditingOpportunity(opp);
      setSelectedProjectState(null); 
      setViewState('edit-project');
      navigateTo(`/project/${opp.id}/edit`);
  };

  useEffect(() => {
      const handleRouting = async () => {
          let path = window.location.pathname;
          if (path.startsWith('/blog')) {
              setShowBlog(true);
              setBlogPostSlug(path.split('/')[2] || null);
              return;
          }
          if (path === '/project/new') { setViewState('create-project'); return; }
          if (path.startsWith('/project/')) {
              const projectId = path.split('/')[2];
              const opp = await fetchOpportunityById(projectId);
              if (opp) {
                  if (path.includes('/edit')) { 
                    setEditingOpportunity(opp); 
                    setSelectedProjectState(null);
                    setViewState('edit-project'); 
                  }
                  else { setSelectedProjectState(opp); setViewState('project-view'); }
              } else setView('dashboard');
              return;
          }
          const mappedView = REVERSE_ROUTES[path];
          if (mappedView) setViewState(mappedView);
          else setView('dashboard');
      };
      handleRouting();
      window.addEventListener('popstate', handleRouting);
      return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
              setUserRole(data.perfil || 'colaborador');
              setUserOrgId(data.organizacao);
              if (data.organizacao) {
                  await loadOrganization(data.organizacao);
                  const opps = await fetchOpportunities(data.organizacao);
                  if (opps) setOpportunities(opps);
              }
              trackUserAccess(userId);
              subscribeToPresence(userId, setOnlineUsers);
          }
      } catch (e) { setDbStatus('disconnected'); } finally { setLoading(false); }
  };

  const loadOrganization = async (orgId: number) => {
      const { data } = await supabase.from('organizacoes').select('*').eq('id', orgId).single();
      if (data) {
          setCurrentPlan(mapDbPlanIdToString(data.plano || 4));
          setOrgDetails({
              name: data.nome, limit: data.colaboradores, logoUrl: data.logo, primaryColor: data.cor || '#F59E0B',
              aiSector: data.setor || '', aiTone: data.tomdevoz || '', aiContext: data.dna || '', isWhitelabelActive: false 
          });
          const modules = await fetchActiveOrgModules(orgId);
          if (modules.length > 0) setActiveModules(modules);
          else setActiveModules(getPlanDefaultModules(data.plano || 4));
      }
  };

  const handleUpdateOrgDetails = async (updates: any) => {
    if (!userOrgId) return;
    try {
        let logoUrl = updates.logoFile ? await uploadLogo(userOrgId, updates.logoFile) : undefined;
        await updateOrgDetails(userOrgId, { ...updates, logoUrl });
        await loadOrganization(userOrgId);
        alert('Configurações atualizadas!');
    } catch (e: any) {
        alert('Erro ao atualizar: ' + e.message);
    }
  };

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
    const opps = await fetchOpportunities(userOrgId);
    if (opps) setOpportunities(opps);
  };

  const handleUpdateOpportunity = async (opp: Opportunity) => {
      const updated = await updateOpportunity(opp);
      if (updated) {
          setSelectedProjectState(updated);
          const opps = await fetchOpportunities(userOrgId!);
          if (opps) setOpportunities(opps);
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

  const toggleTheme = () => {
      setTheme(prev => {
          const n = prev === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', n === 'dark');
          return n;
      });
  };

  const filteredOpportunities = useMemo(() => {
      if (!searchTerm) return opportunities;
      const lower = searchTerm.toLowerCase();
      return opportunities.filter(o => o.title.toLowerCase().includes(lower) || o.description?.toLowerCase().includes(lower));
  }, [opportunities, searchTerm]);

  const isWizardMode = view === 'create-project' || view === 'edit-project';

  if (!user && !loading) {
      if (showBlog) return <BlogScreen initialPostSlug={blogPostSlug} onBack={() => { setShowBlog(false); setView('dashboard'); }} onEnter={() => setShowAuth(true)} />;
      return (
          <>
            <LandingPage onEnter={() => setShowAuth(true)} onOpenBlog={() => { setShowBlog(true); navigateTo('/blog'); }} customName={activeModules.includes('whitelabel') ? orgDetails.name : undefined} />
            {showAuth && <AuthScreen onClose={() => setShowAuth(false)} onGuestLogin={() => setShowOnboarding(true)} customOrgName={orgDetails.name} />}
          </>
      );
  }

  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        {!isWizardMode && (
          <Sidebar 
              currentView={view} onChangeView={setView} 
              onOpenCreate={() => setViewState('create-project')} onOpenCreateTask={() => setShowCreateTask(true)}
              onToggleTheme={toggleTheme} onLogout={() => supabase.auth.signOut()} onSearch={setSearchTerm}
              onOpenFeedback={() => setShowFeedback(true)} theme={theme} dbStatus={dbStatus}
              isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
              userData={userData || { name: '...', avatar: null, email: user?.email }} currentPlan={currentPlan}
              orgName={orgDetails.name} activeModules={activeModules}
          />
        )}
        
        {!isWizardMode && (
          <MobileDrawer 
              currentView={view} onChangeView={setView} 
              onOpenCreate={() => setViewState('create-project')} onOpenCreateTask={() => setShowCreateTask(true)}
              onToggleTheme={toggleTheme} onLogout={() => supabase.auth.signOut()} onSearch={setSearchTerm}
              onOpenFeedback={() => setShowFeedback(true)} theme={theme} dbStatus={dbStatus}
              isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
              userData={userData || { name: '...', avatar: null, email: user?.email }} currentPlan={currentPlan}
              orgName={orgDetails.name} activeModules={activeModules}
          />
        )}

        <main className={`flex-1 overflow-hidden relative ${!isWizardMode ? 'pt-20 lg:pt-0' : ''}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 text-amber-500"/></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={() => { setSelectedProjectState(null); setView('dashboard'); }}
                        onUpdate={handleUpdateOpportunity}
                        onEdit={onEditProject} 
                        onDelete={(id) => deleteOpportunity(id).then(() => { setSelectedProjectState(null); setView('dashboard'); })}
                        userRole={userRole} currentPlan={currentPlan} activeModules={activeModules}
                    />
                ) : isWizardMode ? (
                    <OpportunityWizard 
                        initialData={editingOpportunity || undefined}
                        onSave={async (opp) => {
                            if (editingOpportunity) { await updateOpportunity(opp); onOpenProject(opp); }
                            else { const n = await createOpportunity({ ...opp, organizationId: userOrgId }); if(n) onOpenProject(n); }
                        }}
                        onCancel={() => setView('dashboard')} orgType={orgDetails.name}
                    />
                ) : (
                    <>
                        {view === 'dashboard' && <div className="h-full p-4 md:p-8 overflow-y-auto"><Dashboard opportunities={filteredOpportunities} onNavigate={() => setView('kanban')} onOpenProject={onOpenProject} user={user} theme={theme} activeModules={activeModules} /></div>}
                        {view === 'list' && activeModules.includes('projects') && <div className="h-full p-4 md:p-8 overflow-y-auto"><ProjectList opportunities={filteredOpportunities} onOpenProject={onOpenProject} userRole={userRole} activeModules={activeModules} onRefresh={() => loadUserData(user.id)} /></div>}
                        {view === 'kanban' && activeModules.includes('kanban') && <div className="h-full p-4 md:p-8 overflow-hidden"><KanbanBoard onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} currentPlan={currentPlan} activeModules={activeModules} /></div>}
                        {view === 'gantt' && activeModules.includes('gantt') && <div className="h-full p-4 md:p-8 overflow-hidden"><GanttView opportunities={filteredOpportunities} onSelectOpportunity={onOpenProject} organizationId={userOrgId || undefined} onTaskUpdate={() => {}} /></div>}
                        {view === 'calendar' && activeModules.includes('calendar') && <div className="h-full p-4 md:p-8 overflow-hidden"><CalendarView opportunities={filteredOpportunities} onSelectOpportunity={onOpenProject} organizationId={userOrgId || undefined} activeModules={activeModules} onTaskUpdate={() => {}} /></div>}
                        {view === 'crm' && activeModules.includes('crm') && <div className="h-full p-4 md:p-8 overflow-hidden"><CrmBoard organizationId={userOrgId || undefined} /></div>}
                        {view === 'financial' && activeModules.includes('financial') && <div className="h-full p-4 md:p-8 overflow-hidden"><FinancialScreen orgType={orgDetails.name} /></div>}
                        {view === 'clients' && activeModules.includes('clients') && <div className="h-full p-4 md:p-8 overflow-hidden"><ClientsScreen organizationId={userOrgId || undefined} onOpenProject={onOpenProject} /></div>}
                        {view === 'product' && activeModules.includes('product') && <div className="h-full p-4 md:p-8 overflow-hidden"><ProductIndicators /></div>}
                        {view === 'dev-metrics' && activeModules.includes('engineering') && <div className="h-full p-4 md:p-8 overflow-hidden"><DevIndicators organizationId={userOrgId || undefined} /></div>}
                        {view === 'assets' && userData?.email === 'peboorba@gmail.com' && <div className="h-full overflow-y-auto"><AssetsScreen organizationId={userOrgId || undefined} /></div>}
                        {view === 'settings' && <div className="h-full overflow-y-auto"><SettingsScreen theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={handleUpdateOrgDetails} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => loadOrganization(userOrgId!)} initialTab={settingsStartTab} /></div>}
                        {view === 'profile' && <div className="h-full p-4 md:p-8 overflow-y-auto"><ProfileScreen currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} /></div>}
                        {view === 'admin-manager' && userData?.email === 'peboorba@gmail.com' && <div className="h-full p-4 md:p-8 overflow-y-auto"><AdminManagerScreen onlineUsers={onlineUsers}/></div>}
                    </>
                )}
            </Suspense>
        </main>
        {showCreateTask && <QuickTaskModal opportunities={opportunities} onClose={() => setShowCreateTask(false)} onSave={handleCreateTask} userRole={userRole} />}
        {showFeedback && user && <FeedbackModal userId={user.id} onClose={() => setShowFeedback(false)} />}
        {user && userRole !== 'cliente' && activeModules.includes('ia') && <GuruFab opportunities={opportunities} user={user} organizationId={userOrgId || undefined} onAction={handleGuruAction} />}
        <NpsSurvey userId={user?.id} userRole={userRole} />
    </div>
  );
};

export default App;
