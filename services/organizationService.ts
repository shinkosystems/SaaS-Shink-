
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
