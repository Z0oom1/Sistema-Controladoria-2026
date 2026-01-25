const fetch = require('node-fetch');

(async () => {
  const base = 'http://localhost:3000';
  try {
    // 1) Test login
    let r = await fetch(base + '/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
    const login = await r.json();
    console.log('login:', login);
    const token = login.token;

    // 2) Test saving AI key (will fail if not admin)
    r = await fetch(base + '/api/config/ai-key', { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ key: 'TEST_KEY' }) });
    console.log('/api/config/ai-key status', r.status);

    // 3) Test ai-query fallback
    r = await fetch(base + '/api/ai-query', { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ query: 'Todos os açucar cristal da placa ABC-1234 de 2025-01-01 até 2025-01-31' }) });
    const ai = await r.json();
    console.log('/api/ai-query', ai);
  } catch (e) { console.error('Test error', e); }
})();