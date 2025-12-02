
import { supabase } from './supabaseClient';

const ORG_TABLE = 'organizacoes';
const LOGO_BUCKET = 'fotoperfil'; 

// Uploads a new logo and returns the public URL
export const uploadLogo = async (orgId: number, file: File) => {
    const fileExt = file.name.split('.').pop();
    // User requested "pasta fotoperfil" inside the bucket
    const fileName = `fotoperfil/org-logo-${orgId}-${Date.now()}.${fileExt}`;
    
    // The bucket is 'fotoperfil', so the path is relative to root of bucket
    const filePath = fileName;

    const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, file, { upsert: true });
    
    if (error) {
        throw new Error(`Logo upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(filePath);

    return data.publicUrl;
};

// Updates all organization details in the database
export const updateOrgDetails = async (orgId: number, { logoUrl, primaryColor, name, limit }: { logoUrl?: string; primaryColor?: string; name?: string; limit?: number }) => {
    const updates: any = {};
    
    // User requested updating column 'logo'
    if (logoUrl !== undefined) {
        updates.logo = logoUrl;
    }
    
    // User requested updating column 'cor'
    if (primaryColor !== undefined) updates.cor = primaryColor;
    
    if (name !== undefined) updates.nome = name;
    if (limit !== undefined) updates.colaboradores = limit;

    if (Object.keys(updates).length === 0) return { success: true };

    const { error } = await supabase
        .from(ORG_TABLE)
        .update(updates)
        .eq('id', orgId);

    if (error) {
        throw new Error(`Failed to update org details: ${error.message}`);
    }
    return { success: true };
};

// Fetches public organization details for White Label Login
export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .select('nome, logo, cor, whitelable') // Corrected column name to match DB schema
            .eq('id', orgId)
            .single();

        if (error || !data) return null;
        
        // Only return if whitelabel is active (security check)
        // Note: Check both possible boolean column names if schema is inconsistent
        const isWhitelabel = (data as any).whitelabel === true || (data as any).whitelable === true;
        
        if (!isWhitelabel) return null;

        return {
            name: data.nome,
            logoUrl: data.logo,
            primaryColor: data.cor
        };
    } catch (error) {
        console.error("Error fetching public org details:", error);
        return null;
    }
};

// --- ROLE MANAGEMENT (CARGOS - Table area_atuacao) ---

export const fetchRoles = async (organizationId: number) => {
    if (!organizationId) return [];

    // Filter by 'empresa' which is the organization ID in area_atuacao table
    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('empresa', organizationId)
        .order('cargo', { ascending: true }); // Order by 'cargo' (name)

    if (error) {
        console.error('Error fetching roles:', error);
        return [];
    }
    
    // Map 'cargo' column to 'nome' property for frontend consistency
    return data.map((d: any) => ({
        id: d.id,
        nome: d.cargo || `Cargo ${d.id}`
    })) || [];
};

export const createRole = async (name: string, organizationId: number) => {
    if (!organizationId) throw new Error("Organization ID required to create role");

    // Insert into 'area_atuacao' using correct columns: 'cargo' and 'empresa'
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

    // Manual Hydration for Area Name (avoiding join issues)
    const cargoIds = [...new Set(data.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();

    if (cargoIds.length > 0) {
        const { data: areas } = await supabase.from('area_atuacao').select('*').in('id', cargoIds);
        areas?.forEach((a: any) => {
            // Use 'cargo' column as primary source of name
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
