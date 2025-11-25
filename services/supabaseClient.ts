
import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas
const supabaseUrl = 'https://zjssfnbcboibqeoubeou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqc3NmbmJjYm9pYnFlb3ViZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODE5NDcsImV4cCI6MjA3NDU1Nzk0N30.hM0WRkgCMsWczSvCoCwVpF7q7TawwKLVAjifKWaTIkU';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConnected = () => !!supabase;
