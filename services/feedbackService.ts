
import { supabase } from './supabaseClient';

export const sendFeedback = async (userId: string, message: string, imageFile?: File) => {
    try {
        let imageUrl = null;

        // Upload Image if exists
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `feedback/${userId}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('documentos')
                .upload(fileName, imageFile);

            if (uploadError) {
                console.error('Erro upload imagem feedback:', uploadError);
                // Continue without image or throw? Let's continue but log.
            } else {
                const { data } = supabase.storage
                    .from('documentos')
                    .getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }
        }

        // Insert into table
        const { error } = await supabase
            .from('sugestoes')
            .insert({
                usuario: userId,
                mensagem: message,
                imagem: imageUrl
            });

        if (error) throw error;
        return true;

    } catch (error: any) {
        console.error("Erro ao enviar sugestão:", error);
        throw new Error(error.message || "Erro ao salvar sugestão.");
    }
};
