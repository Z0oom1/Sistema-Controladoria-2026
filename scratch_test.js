const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://abmjqotikqfailjvylhu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWpxb3Rpa3FmYWlsanZ5bGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDQyMTMsImV4cCI6MjA5NzE4MDIxM30.g7cXuTRhgs9wu-sHJiJGnUGL8zxEbNxHt37oTCngwOI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Iniciando teste de conexão e gravação...");
  try {
    // 1. Teste de Select
    const { data: selectData, error: selectError } = await supabase.from('app_data').select('*');
    if (selectError) {
      console.error("❌ Erro ao consultar a tabela app_data:", selectError.message);
    } else {
      console.log("✅ Conexão bem-sucedida! Registros encontrados:", selectData.length);
    }

    // 2. Teste de Upsert (Escrita)
    console.log("Tentando realizar um UPSERT de teste...");
    const { data: upsertData, error: upsertError } = await supabase
      .from('app_data')
      .upsert({ key: 'teste_conexao', value: { ok: true, timestamp: Date.now() } })
      .select();

    if (upsertError) {
      console.error("❌ Erro ao salvar (UPSERT) na tabela app_data:", upsertError.message);
    } else {
      console.log("✅ Gravação (UPSERT) bem-sucedida! Dados salvos:", upsertData);
    }
  } catch (err) {
    console.error("❌ Exceção capturada:", err.message);
  }
}

runTest();

