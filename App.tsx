import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { mapDbPlanIdToString } from './services/asaasService';

// Layout Components
import { Sidebar, MobileDrawer } from './components/Navigation';
import { QuickTaskModal } from './components/QuickTaskModal';
import { FeedbackModal } from './components/FeedbackModal';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { GuruFab } from './components/GuruFab';
import { NpsSurvey } from './components/NpsSurvey';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import AuthScreen from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { InsightCenter } from './components/InsightCenter';

// Pages
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

import { Loader2 } from 'lucide-react';

const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'framework-system': '/framework',
    'list': '/projects',
    'kanban': '/tasks',
    'crm': '/crm',
    'financial': '/finance',
    'clients': '/clients',
    'intelligence': '/intelligence',
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
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedProject, setSelectedProjectState] = useState<Opportunity | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>('dark');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showBlog, setShowBlog] = useState(false);
  const [blogPostSlug, setBlogPostSlug] = useState<string | null>(null);
  const [orgDetails, setOrgDetails] = useState({ 
      name: '', limit: 1, logoUrl: null, primaryColor: '#F59E0B', aiSector: '', aiTone: '', aiContext: '' 
  });
  const [dbStatus, setDbStatus] = useState<'connected'|'disconnected'>('connected');

  const navigateTo = (path: string) => {
      try { window.history.pushState({}, '', path); } catch (e) { console.warn("Routing blocked:", e); }
  };

  const setView = (newView: string) => {
      setViewState(newView);
      setSelectedProjectState(null); 
      setIsMobileOpen(false);
      navigateTo(ROUTES[newView] || '/');
  };

  const onOpenProject = (opp: Opportunity) => {
      setSelectedProjectState(opp);
      navigateTo(`/project/${opp.id}`);
  };

  useEffect(() => {
      const handleRouting = async () => {
          let path = window.location.pathname;
          if (path.startsWith('/blog')) {
              const slug = path.split('/')[2];
              setShowBlog(true);
              setBlogPostSlug(slug || null);
              return;
          } else { setShowBlog(false); }

          if (path.startsWith('/project/')) {
              const projectId = path.split('/')[2];
              const opp = await fetchOpportunityById(projectId);
              if (opp) setSelectedProjectState(opp);
              else setView('dashboard');
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
                  const opps = await fetchOpportunities(data.organizacao);
                  if (opps) setOpportunities(opps);
              }
              trackUserAccess(userId);
              subscribeToPresence(userId, setOnlineUsers);
          }
      } catch (e) { setDbStatus('disconnected'); } finally { setLoading(false); }
  };

  const handleCreateTask = async (task: BpmnTask, projectId: string | null) => {
    if (!userOrgId || !user) return;
    await createTask({
        projeto: projectId ? Number(projectId) : null,
        titulo: task.text,
        descricao: task.description,
        status: task.status,
        responsavel: task.assigneeId || user.id,
        datainicio: task.startDate,
        datafim: task.dueDate,
        duracaohoras: task.estimatedHours,
        organizacao: userOrgId,
        sutarefa: false
    });
    alert("Tarefa criada!");
    loadUserData(user.id);
  };

  const toggleTheme = () => {
      setTheme(prev => {
          const n = prev === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', n === 'dark');
          return n;
      });
  };

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
      onOpenCreate: () => setView('framework-system'), 
      onOpenCreateTask: () => setShowCreateTask(true),
      onToggleTheme: toggleTheme, onLogout: () => supabase.auth.signOut(),
      onSearch: () => {}, onOpenFeedback: () => setShowFeedback(true),
      theme, dbStatus, isMobileOpen, setIsMobileOpen, userRole,
      userData: userData || { name: '...', avatar: null, email: user?.email },
      currentPlan, orgName: orgDetails.name, activeModules
  };

  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-[#020203] text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        <Sidebar {...commonProps} />
        <MobileDrawer {...commonProps} />
        
        <main className="flex-1 overflow-hidden relative pt-20 lg:pt-0">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-amber-500 w-8 h-8"/></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={() => setSelectedProjectState(null)}
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadUserData(user.id))}
                        onEdit={(opp) => onOpenProject(opp)} 
                        onDelete={(id) => deleteOpportunity(id).then(() => setSelectedProjectState(null))}
                        userRole={userRole} currentPlan={currentPlan} activeModules={activeModules}
                    />
                ) : (
                    <>
                        {view === 'dashboard' && <DashboardPage opportunities={opportunities} onOpenProject={onOpenProject} onNavigate={setView} user={user} theme={theme} />}
                        {view === 'framework-system' && <FrameworkPage orgName={orgDetails.name} onBack={() => setView('dashboard')} onSaveToProject={async (opp) => {
                            const newOpp = await createOpportunity({ ...opp, organizationId: userOrgId || undefined });
                            if (newOpp) onOpenProject(newOpp);
                            else setView('dashboard');
                        }} />}
                        {view === 'list' && <ProjectsPage opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} onRefresh={() => loadUserData(user.id)} />}
                        {view === 'kanban' && <TasksPage opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                        {view === 'crm' && <CrmPage organizationId={userOrgId || undefined} />}
                        {view === 'financial' && <FinancialPage orgType={orgDetails.name} />}
                        {view === 'clients' && <ClientsPage userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} onOpenProject={onOpenProject} />}
                        {view === 'intelligence' && <IntelligencePage organizationId={userOrgId || undefined} opportunities={opportunities} />}
                        {view === 'settings' && <SettingsPage theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={() => {}} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => {}} />}
                        {view === 'profile' && <ProfilePage currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} />}
                        {view === 'admin-manager' && <AdminPage onlineUsers={onlineUsers} />}
                    </>
                )}
            </Suspense>
        </main>

        {showCreateTask && <QuickTaskModal opportunities={opportunities} onClose={() => setShowCreateTask(false)} onSave={handleCreateTask} userRole={userRole} />}
        {showFeedback && user && <FeedbackModal userId={user.id} onClose={() => setShowFeedback(false)} />}
        {user && userRole !== 'cliente' && activeModules.includes('ia') && <GuruFab opportunities={opportunities} user={user} organizationId={userOrgId || undefined} onAction={(aid) => aid === 'create_task' ? setShowCreateTask(true) : setView(aid.replace('nav_', ''))} />}
        <NpsSurvey userId={user?.id} userRole={userRole} />
    </div>
  );
};

export default App;
