import { supabase } from './supabaseClient';
import { PLAN_LIMITS } from '../types';

const ORG_TABLE = 'organizacoes';
const LOGO_BUCKET = 'fotoperfil'; 

// System Modules Definition (Keys used for logic)
// Estes devem corresponder exatamente aos IDs usados no Frontend (SettingsScreen)
const SYSTEM_MODULES_DEF = [
    'projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia', 'whitelabel'
];

// Helper to determine plan string from ID
const getPlanKeyFromId = (id: number): string => {
    switch (id) {
        case 4: return 'plan_free';
        case 1: return 'plan_usuario';
        case 2: return 'plan_studio';
        case 3: return 'plan_scale';
        case 9: return 'plan_scale'; // Mapeamento para Governança (ID 9)
        case 5: return 'plan_agency';
        case 10: return 'plan_enterprise';
        default: return 'plan_free';
    }
};

// Uploads a new logo and returns the public URL
export const uploadLogo = async (orgId: number, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/org-logo-${orgId}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(filePath, file, { upsert: true });
        
        if (error) throw error;

        const { data } = supabase.storage
            .from(LOGO_BUCKET)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error: any) {
        throw new Error(`Erro no upload do logo: ${error.message || JSON.stringify(error)}`);
    }
};

// Fetch full organization details (Including AI fields)
export const fetchOrganizationDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .select('*')
            .eq('id', orgId)
            .single();

        if (error) {
            console.error(`Error fetching organization details for ID ${orgId}:`, error);
            return null;
        }
        return data;
    } catch (err) {
        console.error("Exceção ao buscar organização:", err);
        return null;
    }
};

// Updates all organization details in the database
// REMOVED 'modulos' from this update to prevent "invalid input syntax for type bigint"
export const updateOrgDetails = async (
    orgId: number, 
    { logoUrl, primaryColor, name, limit, aiSector, aiTone, aiContext }: 
    { logoUrl?: string; primaryColor?: string; name?: string; limit?: number; aiSector?: string; aiTone?: string; aiContext?: string }
) => {
    console.log("updateOrgDetails - Atualizando Org ID:", orgId);
    
    const updates: any = {};
    
    if (logoUrl !== undefined) updates.logo = logoUrl;
    if (primaryColor !== undefined) updates.cor = primaryColor;
    if (name !== undefined) updates.nome = name;
    if (limit !== undefined) updates.colaboradores = limit;

    // AI Fields Mapping to DB Schema
    if (aiSector !== undefined) updates.setor = aiSector; 
    if (aiTone !== undefined) updates.tomdevoz = aiTone;
    if (aiContext !== undefined) updates.dna = aiContext;

    console.log("Payload enviado ao Supabase:", updates);

    if (Object.keys(updates).length === 0) return { success: true };

    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .update(updates)
            .eq('id', orgId)
            .select();

        if (error) {
            const errorDetails = error.message || JSON.stringify(error);
            console.error("Erro detalhado no update do Supabase:", errorDetails);
            throw new Error(errorDetails);
        }
        
        return { success: true, data };
    } catch (err: any) {
        const msg = err.message || JSON.stringify(err);
        throw new Error(`Falha ao salvar no banco: ${msg}`);
    }
};

// --- MODULE MANAGEMENT (RELATIONAL) ---

// Seeding: Ensures the 'modulos' table has the basic system modules
export const seedSystemModules = async () => {
    try {
        const { data: existing } = await supabase.from('modulos').select('nome');
        const existingNames = new Set(existing?.map(m => m.nome) || []);

        const toInsert = SYSTEM_MODULES_DEF
            .filter(key => !existingNames.has(key))
            .map(key => ({ nome: key }));

        if (toInsert.length > 0) {
            console.log("Seeding modules:", toInsert);
            await supabase.from('modulos').insert(toInsert);
        }
    } catch (e) {
        console.error("Error seeding modules:", e);
    }
};

export const fetchActiveOrgModules = async (orgId: number): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('organizacao_modulo')
            .select('modulo (nome)') // Relational join
            .eq('organizacao', orgId);

        if (error) {
            console.error("Error fetching active modules:", error);
            // Return empty on error to avoid false positives. 
            // If DB access fails, better to show nothing enabled than everything.
            return []; 
        }

        // Map data structure: [{ modulo: { nome: 'projects' } }, ...] -> ['projects', ...]
        const modules = data.map((item: any) => item.modulo?.nome).filter(Boolean);
        
        // STRICT BEHAVIOR: If no rows exist, return empty array.
        // This ensures that switches are OFF if nothing is explicitly enabled in the DB.
        
        return modules;
    } catch (e) {
        console.error("Exception active modules:", e);
        return [];
    }
};

export const updateOrgModules = async (orgId: number, moduleKeys: string[]) => {
    try {
        console.log(`Updating modules for Org ${orgId}. New active set:`, moduleKeys);

        // 1. Ensure modules exist in DB (Seed)
        await seedSystemModules();

        // 2. Fetch Module IDs from 'modulos' table
        const { data: allModules } = await supabase.from('modulos').select('id, nome');
        if (!allModules) throw new Error("System modules not found.");

        const moduleMap = new Map(allModules.map(m => [m.nome, m.id]));

        // 3. Map selected keys to IDs
        const idsToInsert = moduleKeys.map(k => moduleMap.get(k)).filter(Boolean);

        // 4. Clean existing relations for this Org
        // Isso garante: "se estiver true e vira false, remove a linha"
        // Removemos tudo e inserimos apenas o que está ativo agora.
        const { error: deleteError } = await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        if (deleteError) throw deleteError;

        // 5. Insert new relations
        // Isso garante: "switch = true, deve inserir linha"
        if (idsToInsert.length > 0) {
            const payload = idsToInsert.map(modId => ({
                organizacao: orgId,
                modulo: modId
            }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(payload);
            if (insertError) throw insertError;
        }
        
        return { success: true };
    } catch (err: any) {
        console.error("Error updating org modules:", err);
        throw new Error(err.message);
    }
};

// Fetches public organization details for White Label Login
export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from('organizacoes')
            .select('nome, logo, cor, plano') 
            .eq('id', orgId)
            .single();

        if (error || !data) return null;
        
        const isWhitelabelAllowed = data.plano === 10 || data.plano === 5 || (data as any).whitelable === true;

        if (isWhitelabelAllowed) {
            return {
                name: data.nome,
                logoUrl: data.logo,
                primaryColor: data.cor,
                plano: data.plano
            };
        }
        
        return null;

    } catch (error) {
        // console.error("Error fetching public org details:", error);
        return null;
    }
};

// --- ROLE MANAGEMENT (CARGOS - Table area_atuacao) ---

export const fetchRoles = async (organizationId: number) => {
    if (!organizationId) return [];

    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('empresa', organizationId)
        .order('cargo', { ascending: true });

    if (error) {
        console.error('Error fetching roles:', error);
        return [];
    }
    
    return data.map((d: any) => ({
        id: d.id,
        nome: d.cargo || `Cargo ${d.id}`
    })) || [];
};

export const createRole = async (name: string, organizationId: number) => {
    if (!organizationId) throw new Error("Organization ID required to create role");

    const { data, error } = await supabase
        .from('area_atuacao')
        .insert({ 
            cargo: name, 
            empresa: organizationId 
        })
        .select()
        .single();
    
    if (error) throw error;
    
    return {
        id: data.id,
        nome: data.cargo
    };
};

export const deleteRole = async (id: number) => {
    const { error } = await supabase.from('area_atuacao').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- MEMBER MANAGEMENT ---

export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, avatar_url, cargo, perfil')
        .eq('organizacao', orgId)
        .order('nome');
    
    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    const cargoIds = [...new Set(data.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();

    if (cargoIds.length > 0) {
        const { data: areas } = await supabase.from('area_atuacao').select('*').in('id', cargoIds);
        areas?.forEach((a: any) => {
            const name = a.cargo || a.nome || `Cargo ${a.id}`;
            areaMap.set(a.id, name);
        });
    }
    
    return data.map((u: any) => ({
        ...u,
        roleName: areaMap.get(u.cargo) || (u.cargo ? 'Cargo Excluído' : 'Sem Cargo')
    }));
};

export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase
        .from('users')
        .update({ cargo: roleId })
        .eq('id', userId);
    
    if (error) throw error;
    return true;
};

// --- AI LIMIT MANAGEMENT ---

export const checkAndIncrementAiUsage = async (orgId: number): Promise<{ success: boolean; usage: number; limit: number }> => {
    try {
        // 1. Get current usage and plan
        const { data: orgData, error } = await supabase
            .from(ORG_TABLE)
            .select('pedidoia, plano')
            .eq('id', orgId)
            .single();

        if (error || !orgData) throw new Error("Erro ao verificar limite de IA.");

        const currentUsage = orgData.pedidoia || 0;
        const planKey = getPlanKeyFromId(orgData.plano || 4); // Default to Free if null
        const limit = PLAN_LIMITS[planKey]?.aiLimit || 0;

        // If limit is 0 (Free Plan), block immediately
        if (limit === 0) {
            return { success: false, usage: currentUsage, limit: 0 };
        }

        // If limit is practically infinite (9999), we skip check but still track
        if (limit < 9000 && currentUsage >= limit) {
            return { success: false, usage: currentUsage, limit };
        }

        // 2. Increment usage
        const { error: updateError } = await supabase
            .from(ORG_TABLE)
            .update({ pedidoia: currentUsage + 1 })
            .eq('id', orgId);

        if (updateError) throw new Error("Erro ao registrar uso de IA.");

        return { success: true, usage: currentUsage + 1, limit };
    } catch (e: any) {
        console.error("Erro AI Usage:", e);
        // Fail closed to prevent abuse if DB is down, but typically could fail open
        return { success: false, usage: 0, limit: 0 };
    }
};