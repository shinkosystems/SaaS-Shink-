
import { supabase } from './supabaseClient';
import { PLAN_LIMITS } from '../types';

const ORG_TABLE = 'organizacoes';
const LOGO_BUCKET = 'fotoperfil'; 

// System Modules Definition
export const SYSTEM_MODULES_DEF = [
    'projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia', 'whitelabel', 'assets'
];

export const getPlanDefaultModules = (planId: number): string[] => {
    switch (planId) {
        case 4: // Free
            return ['kanban', 'crm', 'ia'];
        case 1: // Solo
            return ['projects', 'kanban', 'gantt', 'crm', 'ia'];
        case 2: // Studio
            return ['projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'ia'];
        case 3: // Scale
        case 9:
            return ['projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia', 'assets'];
        case 10: // Enterprise
            return SYSTEM_MODULES_DEF;
        default:
            return ['kanban', 'ia'];
    }
};

/**
 * Busca o ID da organização vinculada ao e-mail de um dono.
 */
export const findOrgIdByOwnerEmail = async (email: string): Promise<number | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('organizacao, perfil')
            .eq('email', email)
            .eq('perfil', 'dono')
            .single();
        
        if (error || !data) return null;
        return data.organizacao;
    } catch (e) {
        return null;
    }
};

export const createOrganization = async (userId: string, name: string, sector: string, dna?: string, userEmail?: string, userName?: string) => {
    try {
        const { data: org, error: orgError } = await supabase
            .from(ORG_TABLE)
            .insert({ 
                nome: name, 
                setor: sector, 
                dna: dna || '',
                plano: 4, // Default Free
                colaboradores: 1,
                pedidoia: 0,
                cor: '#F59E0B'
            })
            .select()
            .single();
        
        if (orgError) throw orgError;

        const { error: userError } = await supabase
            .from('users')
            .upsert({ 
                id: userId,
                nome: userName || 'Proprietário',
                email: userEmail || '',
                organizacao: org.id, 
                perfil: 'dono',
                status: 'Ativo',
                ativo: true // Solicitação: Novo usuário ativo por padrão
            });
        
        if (userError) throw userError;

        await supabase
            .from('clientes')
            .insert({
                nome: name,
                email: userEmail || '',
                status: 'Ativo',
                organizacao: org.id,
                valormensal: 0,
                meses: 12,
                data_inicio: new Date().toISOString().split('T')[0]
            });

        return org;
    } catch (err: any) {
        throw new Error(`Falha ao criar organização: ${err.message}`);
    }
};

export const uploadLogo = async (orgId: number, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/org-logo-${orgId}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(fileName, file, { upsert: true });
        
        if (error) throw error;
        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        return data.publicUrl;
    } catch (error: any) {
        throw new Error(`Erro no upload do logo: ${error.message}`);
    }
};

export const uploadAvatar = async (userId: string, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/avatar-${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        return publicUrl;
    } catch (error: any) {
        throw new Error(`Erro no upload da foto: ${error.message}`);
    }
};

export const fetchOrganizationDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .select('*')
            .eq('id', orgId)
            .single();
        if (error && error.code !== 'PGRST116') console.error(`Error fetching organization details:`, error);
        return data;
    } catch (err) { return null; }
};

export const updateOrgDetails = async (orgId: number, updates: any) => {
    const payload: any = {};
    if (updates.logoUrl !== undefined) payload.logo = updates.logoUrl;
    if (updates.primaryColor !== undefined) payload.cor = updates.primaryColor;
    if (updates.name !== undefined) payload.nome = updates.name;
    if (updates.limit !== undefined) payload.colaboradores = updates.limit;
    if (updates.aiSector !== undefined) payload.setor = updates.aiSector; 
    if (updates.aiTone !== undefined) payload.tomdevoz = updates.aiTone;
    if (updates.aiContext !== undefined) payload.dna = updates.aiContext;

    if (Object.keys(payload).length === 0) return { success: true };

    try {
        const { data, error } = await supabase.from(ORG_TABLE).update(payload).eq('id', orgId).select();
        if (error) throw new Error(error.message);
        return { success: true, data };
    } catch (err: any) { throw new Error(err.message); }
};

export const seedSystemModules = async () => {
    try {
        const { data: existing } = await supabase.from('modulos').select('nome');
        const existingNames = new Set(existing?.map(m => m.nome.toLowerCase()) || []);
        const toInsert = SYSTEM_MODULES_DEF.filter(key => !existingNames.has(key.toLowerCase())).map(key => ({ nome: key }));
        if (toInsert.length > 0) await supabase.from('modulos').insert(toInsert);
    } catch (e) {
        console.warn("Seeding modules failed - ignore if not admin.");
    }
};

export const fetchSystemModuleMap = async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from('modulos').select('id, nome');
    if (error || !data) return {};
    const map: Record<string, number> = {};
    data.forEach(m => { 
        if (m.nome) map[m.nome.toLowerCase()] = m.id; 
    });
    return map;
};

export const fetchActiveOrgModules = async (orgId: number): Promise<string[]> => {
    try {
        const { data, error } = await supabase.from('organizacao_modulo').select('modulo (nome)').eq('organizacao', orgId);
        if (error) return []; 
        const modules = data.map((item: any) => item.modulo?.nome).filter(Boolean);
        
        if (modules.length === 0) {
             const { data: org } = await supabase.from(ORG_TABLE).select('plano').eq('id', orgId).single();
             if (org?.plano) return getPlanDefaultModules(org.plano);
        }

        return modules;
    } catch (e) { return []; }
};

export const updateOrgModules = async (orgId: number, moduleKeys: string[]) => {
    try {
        const moduleMap = await fetchSystemModuleMap();
        
        if (Object.keys(moduleMap).length === 0) {
            throw new Error("Não foi possível carregar a lista de módulos do sistema.");
        }

        const idsToInsert = moduleKeys
            .map(k => moduleMap[k.toLowerCase()])
            .filter(id => id !== undefined && id !== null) as number[];
        
        return updateOrgModulesByIds(orgId, idsToInsert);
    } catch (err: any) { 
        console.error("Erro em updateOrgModules:", err.message);
        throw new Error(err.message); 
    }
};

export const updateOrgModulesByIds = async (orgId: number, moduleIds: number[]) => {
    try {
        const { error: deleteError } = await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        if (deleteError) throw deleteError;

        if (moduleIds.length > 0) {
            const payload = moduleIds.map(modId => ({ 
                organizacao: orgId, 
                modulo: modId 
            }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(payload);
            if (insertError) throw insertError;
        }
        return { success: true };
    } catch (err: any) { 
        console.error("Erro em updateOrgModulesByIds:", err.message);
        throw new Error(err.message); 
    }
};

export const fetchRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('empresa', orgId);
    if (error) return [];
    return data.map((d: any) => ({
        id: d.id,
        nome: d.cargo || `Cargo ${d.id}`
    }));
};

export const createRole = async (nome: string, orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .insert({ cargo: nome, empresa: orgId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteRole = async (id: number) => {
    const { error } = await supabase
        .from('area_atuacao')
        .delete()
        .eq('id', id);
    return !error;
};

export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('users')
        .select(`id, nome, email, avatar_url, perfil, cargo`)
        .eq('organizacao', orgId);
    
    if (error) return [];
    return data;
};

export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase
        .from('users')
        .update({ cargo: roleId })
        .eq('id', userId);
    return !error;
};

export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from('organizacoes')
            .select('nome, logo, cor, plano')
            .eq('id', orgId)
            .single();
        if (error) return null;
        return data;
    } catch (e) {
        return null;
    }
};
