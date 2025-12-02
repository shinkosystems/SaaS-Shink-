
import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Building2, UploadCloud, Save, Volume2, Monitor, Users, Briefcase, Plus, Trash2, Check, User } from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole } from '../services/organizationService';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onlineUsers: string[];
  userOrgId: number | null;
  orgDetails: { name: string, limit: number, logoUrl: string | null, primaryColor: string };
  onUpdateOrgDetails: (updates: { logoFile?: File, color?: string, name?: string, limit?: number }) => void;
  setView: (view: any) => void;
  userRole: string;
  userData: any;
}

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general');
  const [color, setColor] = useState(orgDetails.primaryColor || '#F59E0B');
  const [orgName, setOrgName] = useState(orgDetails.name);
  const [orgLimit, setOrgLimit] = useState(orgDetails.limit);
  const fileRef = useRef<HTMLInputElement>(null);

  // Team & Roles State
  const [roles, setRoles] = useState<{id: number, nome: string}[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(false);

  const isAdmin = userRole === 'dono';

  useEffect(() => {
      if (activeTab === 'team' && userOrgId && isAdmin) {
          loadTeamData();
      }
  }, [activeTab, userOrgId]);

  const loadTeamData = async () => {
      if (!userOrgId) return;
      setLoadingTeam(true);
      try {
          const [rolesData, membersData] = await Promise.all([
              fetchRoles(userOrgId),
              fetchOrganizationMembersWithRoles(userOrgId)
          ]);
          setRoles(rolesData);
          setMembers(membersData);
      } catch (e) {
          console.error("Erro ao carregar dados do time", e);
      } finally {
          setLoadingTeam(false);
      }
  };

  const handleSave = () => {
      onUpdateOrgDetails({
          color: color !== orgDetails.primaryColor ? color : undefined,
          name: orgName !== orgDetails.name ? orgName : undefined,
          limit: orgLimit !== orgDetails.limit ? orgLimit : undefined
      });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          onUpdateOrgDetails({ logoFile: e.target.files[0] });
      }
  };

  const handleAddRole = async () => {
      if (!newRoleName.trim() || !userOrgId) return;
      try {
          const newRole = await createRole(newRoleName, userOrgId);
          if (newRole) {
              setRoles([...roles, newRole]);
              setNewRoleName('');
          }
      } catch (e) {
          alert('Erro ao criar cargo.');
      }
  };

  const handleDeleteRole = async (id: number) => {
      if (!confirm('Tem certeza? Isso removerá o cargo da lista.')) return;
      try {
          await deleteRole(id);
          setRoles(roles.filter(r => r.id !== id));
      } catch (e) {
          alert('Erro ao excluir cargo.');
      }
  };

  const handleMemberRoleUpdate = async (userId: string, roleIdString: string) => {
      const roleId = roleIdString ? Number(roleIdString) : null;
      
      // Optimistic update
      setMembers(members.map(m => m.id === userId ? { ...m, cargo: roleId } : m));

      try {
          await updateUserRole(userId, roleId);
      } catch (e) {
          console.error(e);
          alert('Erro ao atualizar membro.');
          loadTeamData(); // Revert
      }
  };

  return (
    <div className="h-full flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Palette className="w-8 h-8 text-shinko-primary"/> Configurações
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Personalize a aparência e gerencie sua organização.</p>
            </div>

            {isAdmin && (
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'general' 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                        }`}
                    >
                        <Monitor className="w-4 h-4"/> Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'team' 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                        }`}
                    >
                        <Users className="w-4 h-4"/> Cargos & Time
                    </button>
                </div>
            )}
        </div>

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                {/* Theme & Display */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-500"/> Aparência
                    </h2>
                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-black/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                {theme === 'dark' ? <Moon className="w-5 h-5"/> : <Sun className="w-5 h-5 text-amber-500"/>}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">Modo Escuro</div>
                                <div className="text-xs text-slate-500">Alternar entre tema claro e escuro.</div>
                            </div>
                        </div>
                        <button 
                            onClick={onToggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                </div>

                {/* Organization Settings (Admin Only) */}
                {isAdmin && (
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-500"/> Identidade da Organização
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Workspace</label>
                                    <input 
                                        type="text" 
                                        value={orgName} 
                                        onChange={e => setOrgName(e.target.value)}
                                        className="w-full glass-input rounded-xl p-3 outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cor da Marca (Hex)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            className="h-11 w-12 rounded-xl cursor-pointer border-0 p-1 bg-white dark:bg-slate-800"
                                        />
                                        <input 
                                            type="text" 
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            className="flex-1 glass-input rounded-xl p-3 outline-none uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-black/20">
                                {orgDetails.logoUrl ? (
                                    <img src={orgDetails.logoUrl} alt="Logo" className="h-24 object-contain mb-4"/>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Building2 className="w-10 h-10 text-slate-400"/>
                                    </div>
                                )}
                                <button 
                                    onClick={() => fileRef.current?.click()}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition-colors flex items-center gap-2"
                                >
                                    <UploadCloud className="w-3 h-3"/> Upload Logo
                                </button>
                                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleLogoUpload}/>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex justify-end">
                            <button 
                                onClick={handleSave}
                                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:opacity-90 transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4"/> Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm opacity-60 pointer-events-none">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-slate-500"/> Sons do Sistema
                </h2>
                <p className="text-sm text-slate-500">Em breve: Personalize os sons de conclusão de tarefa e alertas de prazo.</p>
                </div>
            </div>
        )}

        {/* ROLES & TEAM TAB */}
        {activeTab === 'team' && isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-300">
                
                {/* Left Column: Manage Roles */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col h-full">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-purple-500"/> Cargos (Roles)
                    </h2>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            placeholder="Novo cargo..."
                            className="flex-1 glass-input rounded-lg p-2.5 text-sm outline-none focus:border-purple-500"
                            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                        />
                        <button 
                            onClick={handleAddRole}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {loadingTeam ? (
                            <div className="text-center p-4 text-slate-500">Carregando...</div>
                        ) : roles.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                                <p className="text-xs text-slate-500">Nenhum cargo definido.</p>
                            </div>
                        ) : (
                            roles.map(role => (
                                <div key={role.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 group hover:border-purple-500/50 transition-colors">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{role.nome}</span>
                                    <button 
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Manage Members */}
                <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col h-full">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500"/> Membros da Organização
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                                    <th className="pb-3 pl-2">Profissional</th>
                                    <th className="pb-3">Perfil</th>
                                    <th className="pb-3">Cargo Atribuído</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loadingTeam ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">Carregando time...</td></tr>
                                ) : members.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">Nenhum membro encontrado.</td></tr>
                                ) : (
                                    members.map(member => (
                                        <tr key={member.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3 pl-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                                        {member.avatar_url ? (
                                                            <img src={member.avatar_url} className="w-full h-full object-cover"/>
                                                        ) : (
                                                            <User className="w-4 h-4 text-slate-400"/>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{member.nome}</div>
                                                        <div className="text-xs text-slate-500">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                                    member.perfil === 'dono' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                }`}>
                                                    {member.perfil}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <select 
                                                    value={member.cargo || ''}
                                                    onChange={(e) => handleMemberRoleUpdate(member.id, e.target.value)}
                                                    className="w-full max-w-[200px] glass-input rounded-lg p-2 text-sm outline-none focus:border-blue-500 cursor-pointer appearance-none bg-white dark:bg-slate-950 font-medium"
                                                >
                                                    <option value="">Sem Cargo</option>
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id}>{r.nome}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        <div className="py-8 text-center">
            <span className="text-xs text-slate-400 font-medium opacity-50 uppercase tracking-widest">
                Desenvolvido por Shinkō Systems©
            </span>
        </div>
      </div>
    </div>
  );
};
