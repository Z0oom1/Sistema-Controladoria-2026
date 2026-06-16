import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configurado nas variáveis de ambiente do Vercel
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: "Supabase environment variables are not set on Vercel." 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Executa uma consulta simples para manter o banco de dados acordado
    const { data, error } = await supabase
      .from('app_data')
      .select('key')
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Supabase pinged successfully to prevent sleep.",
      timestamp: new Date().toISOString(),
      data
    });
  } catch (err) {
    return res.status(500).json({ 
      error: "Failed to ping Supabase: " + err.message 
    });
  }
}
