import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { getPublicOrgDetails, updateOrgDetails, uploadLogo, fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';
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
import { InsightCenter } from './components/InsightCenter';
import { FrameworkExplorer } from './components/FrameworkExplorer';
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
import { Trello, GanttChartSquare, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

// --- ROUTING CONFIGURATION ---
const ROUTES: Record<string, string> = {
    'dashboard': '/',
    'framework-system': '/framework',
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
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('visitante');
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('plan_free');
  const [view, setViewState] = useState<string>('dashboard');
  const [tasksSubView, setTasksSubView] = useState<'kanban' | 'gantt' | 'calendar'>('kanban');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState<string[]>(['projects', 'kanban', 'gantt', 'calendar']); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
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
      setEditingOpportunity(null);
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
          } else {
              setShowBlog(false);
          }

          if (path.startsWith('/project/new')) { setViewState('create-project'); return; }
          if (path.startsWith('/project/')) {
              const projectId = path.split('/')[2];
              const opp = await fetchOpportunityById(projectId);
              if (opp) {
                  if (path.includes('/edit')) { setEditingOpportunity(opp); setViewState('edit-project'); }
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

  const handleGuruAction = (actionId: string) => {
    if (actionId === 'nav_kanban') setView('kanban');
    else if (actionId === 'nav_calendar') setView('calendar');
    else if (actionId === 'create_task') setShowCreateTask(true);
  };

  const toggleTheme = () => {
      setTheme(prev => {
          const n = prev === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', n === 'dark');
          return n;
      });
  };

  if (!user && !loading) {
      if (showBlog) {
          return (
              <InsightCenter 
                  initialPostSlug={blogPostSlug} 
                  onBack={() => { setShowBlog(false); navigateTo('/'); }} 
                  onEnter={() => setShowAuth(true)} 
              />
          );
      }
      return (
          <>
            <LandingPage 
                onEnter={() => setShowAuth(true)} 
                customName={orgDetails.name} 
                onOpenBlog={() => { setShowBlog(true); navigateTo('/blog'); }}
            />
            {showAuth && <AuthScreen onClose={() => setShowAuth(false)} onGuestLogin={() => {}} customOrgName={orgDetails.name} />}
          </>
      );
  }

  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        <Sidebar 
            currentView={view} onChangeView={setView} 
            onOpenCreate={() => setViewState('create-project')} onOpenCreateTask={() => setShowCreateTask(true)}
            onToggleTheme={toggleTheme} onLogout={() => supabase.auth.signOut()} onSearch={() => {}}
            onOpenFeedback={() => setShowFeedback(true)} theme={theme} dbStatus={dbStatus}
            isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
            userData={userData || { name: '...', avatar: null, email: user?.email }} currentPlan={currentPlan}
            orgName={orgDetails.name} activeModules={activeModules}
        />
        
        <main className="flex-1 overflow-hidden relative pt-20 lg:pt-0">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-amber-500 w-8 h-8"/></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={() => setSelectedProjectState(null)}
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadUserData(user.id))}
                        onEdit={(opp) => { setEditingOpportunity(opp); setViewState('edit-project'); }} 
                        onDelete={(id) => deleteOpportunity(id).then(() => setSelectedProjectState(null))}
                        userRole={userRole} currentPlan={currentPlan} activeModules={activeModules}
                    />
                ) : view === 'framework-system' ? (
                    <FrameworkExplorer 
                        orgType={orgDetails.name} 
                        onBack={() => setView('dashboard')}
                        onSaveToProject={async (opp) => {
                            const newOpp = await createOpportunity({ ...opp, organizationId: userOrgId || undefined });
                            if (newOpp) onOpenProject(newOpp);
                            else setView('dashboard');
                        }} 
                    />
                ) : view === 'kanban' ? (
                    <div className="h-full flex flex-col p-4 md:p-8 space-y-6 overflow-hidden">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Central de <span className="text-amber-500">Tarefas</span>.</h1>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Visão técnica consolidada da organização</p>
                            </div>
                            <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
                                <button onClick={() => setTasksSubView('kanban')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tasksSubView === 'kanban' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <Trello className="w-3.5 h-3.5"/> Kanban
                                </button>
                                <button onClick={() => setTasksSubView('gantt')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tasksSubView === 'gantt' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <GanttChartSquare className="w-3.5 h-3.5"/> Gantt
                                </button>
                                <button onClick={() => setTasksSubView('calendar')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tasksSubView === 'calendar' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <CalendarIcon className="w-3.5 h-3.5"/> Agenda
                                </button>
                            </div>
                        </header>
                        <div className="flex-1 overflow-hidden">
                            {tasksSubView === 'kanban' && <KanbanBoard onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                            {tasksSubView === 'gantt' && <GanttView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={userOrgId || undefined} />}
                            {tasksSubView === 'calendar' && <CalendarView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={userOrgId || undefined} />}
                        </div>
                    </div>
                ) : (
                    <>
                        {view === 'dashboard' && <div className="h-full p-4 md:p-8 overflow-y-auto"><Dashboard opportunities={opportunities} onNavigate={() => setView('kanban')} onOpenProject={onOpenProject} user={user} theme={theme} /></div>}
                        {view === 'list' && <div className="h-full p-4 md:p-8 overflow-y-auto"><ProjectList opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} onRefresh={() => loadUserData(user.id)} /></div>}
                        {view === 'settings' && <div className="h-full overflow-y-auto"><SettingsScreen theme={theme} onToggleTheme={toggleTheme} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={() => {}} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => {}} /></div>}
                        {view === 'profile' && <div className="h-full p-4 md:p-8 overflow-y-auto"><ProfileScreen currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} /></div>}
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
