

import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, FileText, DollarSign, Calendar, MapPin, Building2, Mail, Phone, UploadCloud, Loader2, Trash2, Edit, Camera, X, Lock, LayoutGrid, Target, Clock, AlertTriangle } from 'lucide-react';
import { fetchClients, createClient, updateClient, deleteClient } from '../services/clientService';
import { fetchProjectsByClient } from '../services/projectService';
import { fetchOpportunityById } from '../services/opportunityService';
import { supabase } from '../services/supabaseClient';
import { DbClient, DbProject } from '../types';
import { logEvent } from '../services/analyticsService';

interface Props {
    userRole?: string;
    onlineUsers?: string[];
    organizationId?: number; // Added organizationId requirement
    onOpenProject?: (project: any) => void;
}

export const ClientsScreen: React.FC<Props> = ({ userRole, onlineUsers = [], organizationId, onOpenProject }) => {
    const [clients, setClients] = useState<DbClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<DbClient | null>(null);
    
    // Project View Modal State
    const [showProjectsModal, setShowProjectsModal] = useState(false);
    const [selectedClientForProjects, setSelectedClientForProjects] = useState<DbClient | null>(null);
    const [clientProjects, setClientProjects] = useState<DbProject[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<DbClient>>({});
    
    // Auth State for New Clients
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (organizationId) {
            loadClients();
        }
    }, [organizationId]);

    const loadClients = async () => {
        if (!organizationId) return;
        setIsLoading(true);
        const data = await fetchClients(organizationId);
        setClients(data);
        setIsLoading(false);
    };

    const handleEdit = (client: DbClient) => {
        setEditingClient(client);
        setFormData(client);
        // Reset passwords on edit mode (usually handled separately or not edited here)
        setPassword('');
        setConfirmPassword('');
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingClient(null);
        setPassword('');
        setConfirmPassword('');
        setFormData({
            status: 'Ativo',
            tipo_pessoa: 'Jurídica',
            numcolaboradores: 1,
            valormensal: 0,
            meses: 12,
            data_inicio: new Date().toISOString().split('T')[0],
            contrato: '',
            logo_url: '',
            organizacao: organizationId // Pre-fill Org ID
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        const success = await deleteClient(id);
        if (success) {
            setClients(prev => prev.filter(c => c.id !== id));
        } else {
            alert('Erro ao excluir cliente.');
        }
    };

    const handleSave = async () => {
        if (!formData.nome || !formData.email) {
            alert("Nome e E-mail são obrigatórios.");
            return;
        }

        // New Client Validation
        if (!editingClient) {
            if (!password) {
                alert("Para novos clientes, a senha é obrigatória para criar o usuário.");
                return;
            }
            if (password.length < 6) {
                alert("A senha deve ter no mínimo 6 caracteres.");
                return;
            }
            if (password !== confirmPassword) {
                alert("As senhas não coincidem.");
                return;
            }
        }

        setIsSaving(true);

        try {
            if (editingClient && editingClient.id) {
                const updated = await updateClient(editingClient.id, formData);
                if (updated) {
                    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
                }
            } else {
                // Ensure organization is set
                const payload = { ...formData, organizacao: organizationId };
                
                // Create Client passing password for Auth User creation
                const created = await createClient(payload, password);
                if (created) {
                    setClients(prev => [...prev, created]);
                }
            }
            logEvent('feature_use', { feature: 'Save Client', type: editingClient ? 'edit' : 'create' });
            setShowModal(false);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar: ' + (err.message || "Erro desconhecido"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'contract') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);

        try {
            const bucket = type === 'logo' ? 'fotoperfil' : 'documentos';
            const ext = file.name.split('.').pop();
            const name = `${type}-${Date.now()}.${ext}`;
            
            const { error } = await supabase.storage.from(bucket).upload(name, file);
            if (error) throw error;
            
            const { data } = supabase.storage.from(bucket).getPublicUrl(name);
            
            if (type === 'logo') setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
            else setFormData(prev => ({ ...prev, contrato: data.publicUrl }));

        } catch (err: any) {
            alert('Erro no upload: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleViewProjects = async (client: DbClient) => {
        setSelectedClientForProjects(client);
        setShowProjectsModal(true);
        setIsLoadingProjects(true);
        try {
            const projects = await fetchProjectsByClient(client.id);
            setClientProjects(projects);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const filteredClients = clients.filter(c => 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 p-6 pb-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-amber-500"/> Gestão de Clientes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Base de contatos, contratos e dados cadastrais.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4"/> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => {
                        const isOnline = onlineUsers.includes(client.id);
                        return (
                        <div 
                            key={client.id} 
                            onClick={() => handleViewProjects(client)}
                            className="glass-card p-6 rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 transition-all group relative overflow-hidden cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 relative">
                                        {client.logo_url ? (
                                            <img src={client.logo_url} alt={client.nome} className="w-full h-full object-cover"/>
                                        ) : (
                                            <Building2 className="w-6 h-6 text-slate-400"/>
                                        )}
                                        {/* Online Badge */}
                                        <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 hidden'}`} title="Online"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{client.nome}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                                                client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                                                client.status === 'Pendente' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                                'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                                {client.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(client); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                                    <Edit className="w-4 h-4"/>
                                </button>
                            </div>

                            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><Mail className="w-3 h-3"/> Email</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{client.email}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><DollarSign className="w-3 h-3"/> MRR</span>
                                    <span className="text-slate-900 dark:text-white font-bold">
                                        {client.valormensal ? `R$ ${client.valormensal.toLocaleString()}` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3"/> Início</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {client.data_inicio ? new Date(client.data_inicio).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                {client.contrato && (
                                    <a onClick={e => e.stopPropagation()} href={client.contrato} target="_blank" className="flex-1 py-2 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
                                        <FileText className="w-3 h-3"/> Contrato
                                    </a>
                                )}
                                <div className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/20 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                    <LayoutGrid className="w-3 h-3"/> Projetos
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* Projects View Modal */}
            {showProjectsModal && selectedClientForProjects && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-ios-pop flex flex-col max-h-[80vh]">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                    {selectedClientForProjects.logo_url ? (
                                        <img src={selectedClientForProjects.logo_url} alt="Logo" className="w-full h-full object-cover"/>
                                    ) : (
                                        <Building2 className="w-5 h-5 text-slate-400"/>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Projetos de {selectedClientForProjects.nome}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Portfólio ativo e histórico</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProjectsModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-black/20">
                            {isLoadingProjects ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
                                </div>
                            ) : clientProjects.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                    <p>Nenhum projeto associado a este cliente.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {clientProjects.map(proj => (
                                        <div 
                                            key={proj.id} 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (onOpenProject) {
                                                    try {
                                                        const opp = await fetchOpportunityById(proj.id.toString());
                                                        if (opp) {
                                                            onOpenProject(opp);
                                                            setShowProjectsModal(false);
                                                        }
                                                    } catch (err) {
                                                        console.error("Failed to open project", err);
                                                    }
                                                }
                                            }}
                                            className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between group hover:border-amber-500/30 transition-all cursor-pointer"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                                        proj.projoport ? 'bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    }`}>
                                                        {proj.projoport ? 'Oportunidade' : 'Ativo'}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                                                        <Target className="w-3 h-3"/> Score: {proj.prioseis.toFixed(1)}
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-amber-500 transition-colors" title={proj.nome}>{proj.nome}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{proj.descricao || 'Sem descrição.'}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3"/> {new Date(proj.created_at).toLocaleDateString()}
                                                </div>
                                                <span className="text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-ios-pop">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-white/5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {editingClient ? <Edit className="w-5 h-5 text-amber-500"/> : <Plus className="w-5 h-5 text-emerald-500"/>}
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Identity */}
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center relative group cursor-pointer overflow-hidden" onClick={() => logoInputRef.current?.click()}>
                                            {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-slate-400"/>}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">Alterar Logo</div>
                                        </div>
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')}/>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                            <select 
                                                value={formData.status}
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            >
                                                <option value="Ativo" className="dark:bg-slate-900">Ativo</option>
                                                <option value="Pendente" className="dark:bg-slate-900">Pendente</option>
                                                <option value="Bloqueado" className="dark:bg-slate-900">Churn / Cancelado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Razão Social / Nome</label>
                                            <input 
                                                type="text" 
                                                value={formData.nome || ''}
                                                onChange={e => setFormData({...formData, nome: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Tipo Pessoa</label>
                                            <select 
                                                value={formData.tipo_pessoa} 
                                                onChange={e => setFormData({...formData, tipo_pessoa: e.target.value as any})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            >
                                                <option value="Jurídica" className="dark:bg-slate-900">Jurídica (CNPJ)</option>
                                                <option value="Física" className="dark:bg-slate-900">Física (CPF)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">CPF / CNPJ</label>
                                            <input 
                                                type="text" 
                                                value={formData.cnpj || ''}
                                                onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Center Column: Contact & Address */}
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-2">Contato & Localização</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">E-mail Principal</label>
                                            <input 
                                                type="email" 
                                                value={formData.email || ''}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            />
                                        </div>
                                        
                                        {/* Password Fields (Only when creating) */}
                                        {!editingClient && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                                                        <Lock className="w-3 h-3"/> Senha de Acesso
                                                    </label>
                                                    <input 
                                                        type="password" 
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                                                        <Lock className="w-3 h-3"/> Confirmar Senha
                                                    </label>
                                                    <input 
                                                        type="password" 
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                                        placeholder="Repita a senha"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                            <input 
                                                type="tel" 
                                                value={formData.telefone || ''}
                                                onChange={e => setFormData({...formData, telefone: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
                                            <textarea 
                                                value={formData.endereco || ''}
                                                onChange={e => setFormData({...formData, endereco: e.target.value})}
                                                className="w-full glass-input rounded-lg p-2.5 text-sm outline-none resize-none h-24"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Contract */}
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20 pb-2">Dados Contratuais</h4>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Valor Mensal (MRR)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">R$</span>
                                                <input 
                                                    type="number" 
                                                    value={formData.valormensal || 0}
                                                    onChange={e => setFormData({...formData, valormensal: parseFloat(e.target.value)})}
                                                    className="w-full pl-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nº Colaboradores</label>
                                            <input 
                                                type="number" 
                                                value={formData.numcolaboradores || 1}
                                                onChange={e => setFormData({...formData, numcolaboradores: parseInt(e.target.value)})}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
                                                <input 
                                                    type="date" 
                                                    value={formData.data_inicio || ''}
                                                    onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Meses</label>
                                                <input 
                                                    type="number" 
                                                    value={formData.meses || 12}
                                                    onChange={e => setFormData({...formData, meses: parseInt(e.target.value)})}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Arquivo do Contrato</label>
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors text-xs text-slate-500"
                                            >
                                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
                                                {formData.contrato ? 'Arquivo Anexado (Clique p/ trocar)' : 'Upload PDF'}
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'contract')}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 flex justify-between items-center">
                            {editingClient && userRole === 'dono' && (
                                <button onClick={() => handleDelete(editingClient.id)} className="text-red-500 hover:text-red-600 text-sm font-bold flex items-center gap-2">
                                    <Trash2 className="w-4 h-4"/> Excluir Cliente
                                </button>
                            )}
                            <div className={`flex gap-3 ${editingClient && userRole === 'dono' ? 'ml-auto' : 'w-full justify-end'}`}>
                                <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                                    {editingClient ? 'Salvar Cliente' : 'Inserir Cliente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
