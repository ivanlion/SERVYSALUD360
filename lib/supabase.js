import { createBrowserClient } from '@supabase/ssr';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL o Anon Key no están configuradas en las variables de entorno');
    console.warn('⚠️ Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
}
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.warn('⚠️ La URL de Supabase debe comenzar con https://');
}
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
//# sourceMappingURL=supabase.js.map