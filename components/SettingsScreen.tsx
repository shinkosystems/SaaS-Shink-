
import React, { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Smartphone, Mail, Shield, Monitor, Volume2, Users, UserPlus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ElasticSwitch } from './ElasticSwitch';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onlineUsers?: string[];
}

export const SettingsScreen: React.FC<Props> = ({ theme, onToggleTheme, onlineUsers = [] }) => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyDigest: false,
    taskUpdates: true
  });

  const [userProfile, setUserProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
      fetchProfile();
  }, []);

  const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
          setUserProfile(data);

          if (data && (data.perfil === 'dono' || data.perfil === 'admin')) {
              setLoadingTeam(true);
              // Fetch only internal team, exclude 'cliente' role which is handled in ClientsScreen
              const { data: usersData } = await supabase
                  .from('users')
                  .select('*')
                  .eq('organizacao', data.organizacao)
                  .neq('perfil', 'cliente') 
                  .order('nome');
              
              if (usersData) setTeamMembers(usersData);
              setLoadingTeam(false);
          }
      }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
      if (userProfile?.perfil !== 'dono') return;

      const { error } = await supabase
          .from('users')
          .update({ status: newStatus })
          .eq('id', userId);

      if (error) {
          alert('Erro ao atualizar status: ' + error.message);
      } else {
          setTeamMembers(prev => prev.map(m => m.id === userId ? { ...m, status: newStatus } : m));
      }
  };

  const toggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto pb-10">
      
      {/* Header */}
      <div className="mb-8 p-6 pb-0">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajustes & Preferências</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configurações gerais do sistema e notificações.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl px-6">
        
        {/* Aparência */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-shinko-primary"/> Aparência
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400"/> : <Sun className="w-5 h-5 text-orange-500"/>}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Modo {theme === 'dark' ? 'Escuro' : 'Claro'}</div>
                  <div className="text-xs text-slate-500">Alternar tema da interface</div>
                </div>
              </div>
              
              <ElasticSwitch checked={theme === 'dark'} onChange={onToggleTheme} />
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-shinko-primary"/> Notificações
          </h2>

          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5"/>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Alertas por E-mail</div>
                  <div className="text-xs text-slate-500">Receber atualizações importantes de projetos.</div>
                </div>
              </div>
              <ElasticSwitch checked={notifications.email} onChange={() => toggle('email')} />
            </div>

            <hr className="border-slate-100 dark:border-slate-800"/>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Smartphone className="w-5 h-5 text-slate-400 mt-0.5"/>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Push Mobile</div>
                  <div className="text-xs text-slate-500">Notificações no aplicativo celular.</div>
                </div>
              </div>
              <ElasticSwitch checked={notifications.push} onChange={() => toggle('push')} />
            </div>

             <hr className="border-slate-100 dark:border-slate-800"/>

             <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-slate-400 mt-0.5"/>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Resumo Semanal (Digest)</div>
                  <div className="text-xs text-slate-500">Um e-mail toda segunda com o resumo.</div>
                </div>
              </div>
              <ElasticSwitch checked={notifications.weeklyDigest} onChange={() => toggle('weeklyDigest')} />
            </div>

          </div>
        </div>

        {/* TEAM SECTION (Internal Only) */}
        {(userProfile?.perfil === 'dono' || userProfile?.perfil === 'admin') && (
             <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500"/> Equipe Interna
                    </h2>
                    {userProfile?.perfil === 'dono' && (
                        <button className="text-sm font-medium text-shinko-primary hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 opacity-50 cursor-not-allowed">
                            <UserPlus className="w-4 h-4"/> Convidar Membro
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr>
                                <th className="p-3 font-medium text-slate-500">Nome</th>
                                <th className="p-3 font-medium text-slate-500">Email</th>
                                <th className="p-3 font-medium text-slate-500">Perfil</th>
                                <th className="p-3 font-medium text-slate-500 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {teamMembers.map(user => {
                                const isOnline = onlineUsers.includes(user.id);
                                return (
                                <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                    <td className="p-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-slate-300 dark:bg-slate-700'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                                        {user.nome}
                                    </td>
                                    <td className="p-3 text-slate-500">{user.email}</td>
                                    <td className="p-3">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded capitalize bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            {user.perfil}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {userProfile?.perfil === 'dono' ? (
                                            <div className="relative inline-block">
                                                <select 
                                                    value={user.status || 'Ativo'}
                                                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                                    className={`appearance-none pl-2 pr-6 py-1 rounded text-xs font-bold uppercase cursor-pointer transition-colors outline-none border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-right w-full ${
                                                        (user.status === 'Ativo' || !user.status) ? 'text-emerald-500' : 
                                                        user.status === 'Pendente' ? 'text-amber-500' : 
                                                        'text-red-500'
                                                    }`}
                                                >
                                                    <option value="Ativo" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Ativo</option>
                                                    <option value="Pendente" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Pendente</option>
                                                    <option value="Bloqueado" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Bloqueado</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <span className={`text-xs font-bold ${
                                                (user.status === 'Ativo' || !user.status) ? 'text-emerald-500' : 
                                                user.status === 'Pendente' ? 'text-amber-500' : 
                                                'text-red-500'
                                            }`}>
                                                {user.status || 'Ativo'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                            {teamMembers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                                        {loadingTeam ? 'Carregando...' : 'Nenhum colaborador interno encontrado.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* Sons e Alertas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm opacity-60 pointer-events-none">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-slate-500"/> Sons do Sistema
          </h2>
          <p className="text-sm text-slate-500">Em breve: Personalize os sons de conclusão de tarefa e alertas de prazo.</p>
        </div>
      </div>
    </div>
  );
};
