const fetch = require('node-fetch');

(async () => {
  const base = 'http://localhost:2006';
  try {
    // 1) Teste de Login
    let r = await fetch(base + '/api/login', { 
      method: 'POST', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({ username: 'Admin', password: '123' }) 
    });
    const login = await r.json();
    console.log('login:', login);
    const token = login.token;

    // 2) Teste de Sincronização
    r = await fetch(base + '/api/sync', { 
      method: 'GET', 
      headers: { 'Authorization': 'Bearer ' + token } 
    });
    console.log('status do sync:', r.status);
  } catch (e) { 
    console.error('Erro nos testes:', e); 
  }
})();