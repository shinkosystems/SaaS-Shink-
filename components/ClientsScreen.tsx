
import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, FileText, DollarSign, Calendar, Mail, Loader2, Trash2, Edit, Camera, X, LayoutGrid, Building2, User } from 'lucide-react';
import { fetchClients, createClient, updateClient, deleteClient } from '../services/clientService';
import { fetchProjectsByClient } from '../services/projectService';
import { fetchOpportunityById } from '../services/opportunityService';
import { supabase } from '../services/supabaseClient';
import { DbClient, DbProject } from '../types';

interface Props {
    userRole?: string;
    onlineUsers?: string[];
    organizationId?: number; 
    onOpenProject?: (project: any) => void;
}

export const ClientsScreen: React.FC<Props> = ({ userRole, onlineUsers = [], organizationId, onOpenProject }) => {
    const [clients, setClients] = useState<DbClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<DbClient | null>(null);
    const [formData, setFormData] = useState<Partial<DbClient>>({});
    const [password, setPassword] = useState('');
    
    // Project View
    const [showProjectsModal, setShowProjectsModal] = useState(false);
    const [clientProjects, setClientProjects] = useState<DbProject[]>([]);
    const [selectedClient, setSelectedClient] = useState<DbClient | null>(null);

    useEffect(() => {
        if (organizationId) loadClients();
    }, [organizationId]);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await fetchClients(organizationId!);
        setClients(data);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!formData.nome || !formData.email) return alert("Nome e Email obrigatórios");
        
        try {
            if (editingClient) {
                await updateClient(editingClient.id, formData);
            } else {
                await createClient({ ...formData, organizacao: organizationId }, password);
            }
            setShowModal(false);
            loadClients();
        } catch (e: any) { alert(e.message); }
    };

    const handleViewProjects = async (client: DbClient) => {
        setSelectedClient(client);
        setShowProjectsModal(true);
        const projs = await fetchProjectsByClient(client.id);
        setClientProjects(projs);
    };

    const filteredClients = clients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Base de contatos e contratos.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <button 
                        onClick={() => { setEditingClient(null); setFormData({ status: 'Ativo' }); setShowModal(true); }}
                        className="bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"
                    >
                        <Plus className="w-3 h-3"/> Novo
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-10 custom-scrollbar">
                {filteredClients.map(client => (
                    <div key={client.id} onClick={() => handleViewProjects(client)} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 overflow-hidden border border-slate-200 dark:border-white/10">
                                    {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{client.nome}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.includes(client.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                        <span className="text-[10px] text-slate-500">{client.email}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingClient(client); setFormData(client); setShowModal(true); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                                <Edit className="w-4 h-4"/>
                            </button>
                        </div>
                        
                        <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">MRR</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">R$ {client.valormensal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Contrato</span>
                                <span className="text-slate-700 dark:text-slate-300">{client.meses} meses</span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {client.contrato && (
                                <a href={client.contrato} target="_blank" onClick={e => e.stopPropagation()} className="flex-1 py-1.5 bg-slate-50 dark:bg-white/5 rounded text-center text-[10px] font-bold text-slate-500 hover:text-blue-500 transition-colors">
                                    Contrato PDF
                                </a>
                            )}
                            <div className="flex-1 py-1.5 bg-slate-50 dark:bg-white/5 rounded text-center text-[10px] font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                Ver Projetos
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Modal for Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-ios-pop border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editingClient ? 'Editar' : 'Novo'} Cliente</h3>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Nome da Empresa" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none font-bold"/>
                            <input type="email" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            {!editingClient && (
                                <input type="password" placeholder="Senha de Acesso" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="MRR (R$)" value={formData.valormensal || ''} onChange={e => setFormData({...formData, valormensal: Number(e.target.value)})} className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none">
                                    <option>Ativo</option><option>Pendente</option><option>Bloqueado</option>
                                </select>
                            </div>
                            <button onClick={handleSave} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg mt-2">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Projects Modal */}
            {showProjectsModal && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-ios-pop border border-white/10 h-[60vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Projetos de {selectedClient.nome}</h3>
                            <button onClick={() => setShowProjectsModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {clientProjects.length === 0 ? <div className="text-center py-10 text-slate-500">Sem projetos.</div> : (
                                <div className="space-y-3">
                                    {clientProjects.map(p => (
                                        <div key={p.id} onClick={async () => {
                                            if (onOpenProject) {
                                                const opp = await fetchOpportunityById(p.id.toString());
                                                if (opp) {
                                                    onOpenProject(opp);
                                                    setShowProjectsModal(false);
                                                }
                                            }
                                        }} className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-300 transition-colors cursor-pointer">
                                            <h4 className="font-bold text-slate-900 dark:text-white">{p.nome}</h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.descricao || 'Sem descrição'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
