
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { Opportunity, BpmnTask } from './types';
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchOpportunityById } from './services/opportunityService';
import { createTask } from './services/projectService';
import { getPublicOrgDetails, updateOrgDetails, uploadLogo, fetchActiveOrgModules, getPlanDefaultModules } from './services/organizationService';
import { subscribeToPresence } from './services/presenceService';
import { trackUserAccess } from './services/analyticsService';
import { getCurrentUserPlan, mapDbPlanIdToString } from './services/asaasService';

// --- FIX: Added missing Loader2 import from lucide-react ---
import { Loader2 } from 'lucide-react';

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
  const [view, setViewState] = useState<string>('dashboard');
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
  const [guruInitialPrompt, setGuruInitialPrompt] = useState<string | null>(null); // Novo estado
  
  const [theme, setTheme] = useState<'light'|'dark'>('dark');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [orgDetails, setOrgDetails] = useState({ 
      name: '', limit: 1, logoUrl: null, primaryColor: '#F59E0B',
      aiSector: '', aiTone: '', aiContext: '', isWhitelabelActive: false
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
                        aiSector: orgData.setor || '', aiTone: orgData.tomdevoz || '', aiContext: orgData.dna || '', isWhitelabelActive: false
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

  if (!user && !loading) {
      if (showBlog) return ( <BlogScreen initialPostSlug={blogPostSlug} onBack={() => { setShowBlog(false); navigateTo('/'); }} onEnter={() => setShowAuth(true)} /> );
      return (
          <>
            <LandingPage onEnter={() => setShowAuth(true)} onOpenBlog={() => { setShowBlog(true); navigateTo('/blog'); }} />
            {showAuth && <AuthScreen onClose={() => setShowAuth(false)} onGuestLogin={() => {}} />}
          </>
      );
  }

  return (
    <div className={`flex h-screen w-full bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${theme}`}>
        {view !== 'create-project' && !editingOpportunity && !selectedProject && (
            <Sidebar 
                currentView={view} onChangeView={setView} 
                onOpenCreate={() => setView('create-project')} onOpenCreateTask={() => setShowCreateTask(true)}
                onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} onLogout={() => supabase.auth.signOut()} 
                onSearch={() => {}} onOpenFeedback={() => setShowFeedback(true)} theme={theme} dbStatus={dbStatus}
                isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} userRole={userRole}
                userData={userData || { name: '...', avatar: null }} currentPlan={currentPlan}
                activeModules={activeModules}
            />
        )}
        <main className={`flex-1 overflow-hidden relative ${view !== 'create-project' && !selectedProject ? 'pt-20 lg:pt-0' : ''}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-amber-500 w-8 h-8"/></div>}>
                {selectedProject ? (
                    <ProjectWorkspace 
                        opportunity={selectedProject} onBack={() => setSelectedProjectState(null)}
                        onUpdate={(opp) => updateOpportunity(opp).then(() => loadUserData(user.id))}
                        onEdit={(opp) => { setEditingOpportunity(opp); setViewState('edit-project'); }} 
                        onDelete={(id) => deleteOpportunity(id).then(() => setSelectedProjectState(null))}
                        userRole={userRole} activeModules={activeModules}
                    />
                ) : (
                    <>
                        {view === 'dashboard' && <Dashboard 
                            opportunities={opportunities} onOpenProject={onOpenProject} 
                            onNavigate={setView} user={user} theme={theme} userData={userData} 
                            onGuruPrompt={(p) => setGuruInitialPrompt(p)}
                        />}
                        {view === 'list' && <ProjectList opportunities={opportunities} onOpenProject={onOpenProject} userRole={userRole} onRefresh={() => loadUserData(user.id)} />}
                        {view === 'kanban' && <KanbanBoard onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={userOrgId || undefined} />}
                        {view === 'calendar' && <CalendarView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={userOrgId || undefined} />}
                        {view === 'gantt' && <GanttView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={userOrgId || undefined} />}
                        {view === 'crm' && <CrmBoard organizationId={userOrgId || undefined} />}
                        {view === 'financial' && <FinancialScreen orgType={orgDetails.name} />}
                        {view === 'clients' && <ClientsScreen userRole={userRole} onlineUsers={onlineUsers} organizationId={userOrgId || undefined} onOpenProject={onOpenProject} />}
                        {view === 'product' && <ProductIndicators />}
                        {view === 'dev-metrics' && <DevIndicators organizationId={userOrgId || undefined} />}
                        {view === 'settings' && <SettingsScreen theme={theme} onToggleTheme={() => {}} onlineUsers={onlineUsers} userOrgId={userOrgId} orgDetails={orgDetails} onUpdateOrgDetails={() => {}} setView={setView} userRole={userRole} userData={userData} activeModules={activeModules} onRefreshModules={() => {}} />}
                        {view === 'profile' && <ProfileScreen currentPlan={currentPlan} onRefresh={() => loadUserData(user.id)} />}
                    </>
                )}
            </Suspense>
        </main>
        {user && activeModules.includes('ia') && (
            <GuruFab 
                opportunities={opportunities} user={user} organizationId={userOrgId || undefined} 
                onAction={(aid) => setView(aid.replace('nav_', ''))}
                externalPrompt={guruInitialPrompt}
                onExternalPromptConsumed={() => setGuruInitialPrompt(null)}
            />
        )}
    </div>
  );
};

export default App;
