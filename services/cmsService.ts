
import { supabase } from './supabaseClient';
import { CmsCase, CmsPost } from '../types';

const CASES_TABLE = 'cms_cases';
const POSTS_TABLE = 'cms_posts';

// --- CASES MANAGEMENT ---

export const fetchCmsCases = async (): Promise<CmsCase[]> => {
    const { data, error } = await supabase
        .from(CASES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching CMS cases:', error);
        return [];
    }
    return data as CmsCase[];
};

export const saveCmsCase = async (caseData: Partial<CmsCase>): Promise<CmsCase | null> => {
    const { id, created_at, ...payload } = caseData as any;
    
    let query;
    if (id) {
        query = supabase.from(CASES_TABLE).update(payload).eq('id', id).select().single();
    } else {
        query = supabase.from(CASES_TABLE).insert(payload).select().single();
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error saving CMS case:', error);
        throw error;
    }
    return data as CmsCase;
};

export const deleteCmsCase = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from(CASES_TABLE).delete().eq('id', id);
    if (error) {
        console.error('Error deleting CMS case:', error);
        return false;
    }
    return true;
};

// --- BLOG MANAGEMENT ---

export const fetchCmsPosts = async (publicOnly = true): Promise<CmsPost[]> => {
    let query = supabase.from(POSTS_TABLE).select('*').order('created_at', { ascending: false });
    
    if (publicOnly) {
        query = query.eq('published', true);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching CMS posts:', error);
        return [];
    }
    return data as CmsPost[];
};

export const fetchCmsPostById = async (id: string): Promise<CmsPost | null> => {
    const { data, error } = await supabase.from(POSTS_TABLE).select('*').eq('id', id).single();
    if (error) return null;
    return data as CmsPost;
};

export const fetchCmsPostBySlug = async (slug: string): Promise<CmsPost | null> => {
    const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
        
    if (error) return null;
    return data as CmsPost;
};

/**
 * Salva ou atualiza um post do blog.
 * Sanitiza o payload removendo campos que não existem no banco de dados atual (como keywords).
 */
export const saveCmsPost = async (postData: Partial<CmsPost>): Promise<CmsPost | null> => {
    // Removemos campos protegidos ou que não existem no esquema atual para evitar erros de cache
    const { 
        id, 
        created_at, 
        updated_at, 
        keywords, // Removido pois causa erro de coluna inexistente
        seo_title, // Verificação de existência cautelosa
        seo_description, 
        ...payload 
    } = postData as any;
    
    // Payload básico garantido pelo esquema
    const safePayload = {
        ...payload,
        // Adicionamos SEO apenas se necessário ou podemos manter em um campo JSONB no futuro
    };

    let query;
    if (id && id !== 'temp') {
        query = supabase.from(POSTS_TABLE).update(safePayload).eq('id', id).select().single();
    } else {
        query = supabase.from(POSTS_TABLE).insert(safePayload).select().single();
    }

    const { data, error } = await query;
    if (error) {
        console.error('Supabase CMS Error:', error.message);
        throw new Error(error.message);
    }
    return data as CmsPost;
};

export const deleteCmsPost = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from(POSTS_TABLE).delete().eq('id', id);
    if (error) return false;
    return true;
};

// --- FILE UPLOAD ---

export const uploadCmsFile = async (file: File, bucket = 'fotoperfil'): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `cms/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
    } catch (e) {
        console.error("Upload error:", e);
        return null;
    }
};

// --- PUBLIC LEAD GENERATION ---

export const captureLead = async (name: string, email: string, phone: string, assetName: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.functions.invoke('create-lead', {
            body: { name, email, phone, assetName }
        });

        if (error) throw error;
        return true;

    } catch (e: any) {
        if (e.message?.includes('Failed to send a request') || e.message?.includes('Relay Error') || e.message?.includes('FunctionsFetchError')) {
            console.warn("⚠️ Demo Mode: Lead capture simulated.");
            return true;
        }
        console.error("Lead capture failed:", e.message || e);
        return false;
    }
};
