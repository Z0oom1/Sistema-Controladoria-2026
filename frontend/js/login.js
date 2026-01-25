// Constantes
const USERS_KEY = 'mapa_cego_users';

// Tenta pegar a configuração global (vinda do config.js no HTML)
// Se não existir (login direto), define um fallback seguro.
const API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';

// --- CONFIGURAÇÃO DAS CONTAS DE TESTE ---
const testAccounts = [
    // CONFERENTES - ALMOXARIFADO
    { username: 'Fabricio', sector: 'conferente', subType: 'ALM', role: 'user', label: 'Conferente - DOCA/ALM' },
    { username: 'Clodoaldo', sector: 'conferente', subType: 'ALM', role: 'user', label: 'Conferente - DOCA/ALM' },

    // CONFERENTES - OUTROS SETORES
    { username: 'Guilherme', sector: 'conferente', subType: 'GAVA', role: 'user', label: 'Conferente - GAVA' },
    { username: 'Wayner', sector: 'conferente', subType: 'INFRA', role: 'user', label: 'Conferente - INFRAESTRUTURA' },
    { username: 'Outros', sector: 'conferente', subType: 'OUT', role: 'user', label: 'Conferente - OUTROS' },
    
    // RECEBIMENTO
    { username: 'Caio', sector: 'recebimento', subType: null, role: 'user', label: 'Recebimento - Caio' },
    { username: 'Balanca', sector: 'recebimento', subType: null, role: 'user', label: 'Recebimento - Balança' },
    
    // ADMIN
    { username: 'Admin', sector: 'recebimento', subType: null, role: 'admin', label: 'Administrador / Geral' }
];

// Encarregados (contas rápidas)
testAccounts.push({ username: 'EncarRec', sector: 'recebimento', subType: null, role: 'Encarregado', label: 'Encarregado - Recebimento' });
testAccounts.push({ username: 'EncarConf', sector: 'conferente', subType: null, role: 'Encarregado', label: 'Encarregado - Conferencia' });

// --- FUNÇÕES DE LOGIN ---

async function fazerLogin() {
    const userIn = document.getElementById('loginUser').value;
    const passIn = document.getElementById('loginPass').value;
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

    console.log("Tentando logar em:", API_URL || 'Local/Proxy');

    // Tenta autenticar no servidor quando disponível
    if (window.location.protocol !== 'file:') {
        try {
            // Usa a URL configurada no config.js ou cai no Proxy do Vite (/api)
            const fetchUrl = API_URL ? `${API_URL}/api/login` : '/api/login';
            
            const resp = await fetch(fetchUrl, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userIn, password: passIn })
            });

            if (resp.ok) {
                const body = await resp.json();
                const serverUser = body.user || { username: userIn };
                serverUser.token = body.token;
                loginComUsuario(serverUser);
                return;
            } else {
                console.warn('Login falhou no servidor:', resp.status);
            }
        } catch (e) {
            console.warn('Falha ao conectar ao servidor, tentando login local.', e);
        }
    }

    // Login local (fallback)
    const user = users.find(u => u.username.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

    if (user) {
        if (user.firstLogin) {
            sessionStorage.setItem('must_change_pw', user.username);
        }
        loginComUsuario(user);
    } else {
        alert("Usuário ou senha incorretos.");
    }
}

// Login: armazenamento de sessão e redirecionamento
function loginComUsuario(user) {
    if (user.token) sessionStorage.setItem('aw_token', user.token);
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
    
    // REDIRECIONAMENTO CORRIGIDO PARA VITE
    // Como o login está em /pages/login.html, o home está na mesma pasta.
    window.location.href = 'home.html'; 
}

// --- INTERFACE (SWITCHER E REGISTRO) ---

function abrirSwitcher() {
    const lista = document.getElementById('listaContas');
    lista.innerHTML = '';
    
    // Senhas padrão
    const defaultPass = {
        'Admin': '123',
        'EncarRec': 'enc123',
        'EncarConf': 'enc123',
        'Balanca': '123',
        'Fabricio': '123',
        'Clodoaldo': '123',
        'Caio': '123',
        'Wayner': '123',
        'Guilherme': '123',
        'Outros': '123'
    };

    testAccounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = 'account-item'; 
        item.style.padding = "10px";
        item.style.borderBottom = "1px solid #eee";
        item.style.cursor = "pointer";
        item.style.display = "flex";
        item.style.alignItems = "center";
        
        let bgAvatar = '#ddd';
        let colorAvatar = '#555';
        
        if(acc.role === 'Encarregado') { bgAvatar = '#8a57e0ff'; colorAvatar = '#fff'; }
        else if(acc.role === 'admin') { bgAvatar = '#474747ff'; colorAvatar = '#fff'; }
        else if(acc.sector === 'conferente') { bgAvatar = '#ffebee'; colorAvatar = '#D32F2F'; }
        else if(acc.sector === 'recebimento') { bgAvatar = '#e3f2fd'; colorAvatar = '#1976D2'; }

        item.innerHTML = `
            <div class="acc-avatar" style="background:${bgAvatar}; color:${colorAvatar}; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:10px;">${acc.username[0]}</div>
            <div>
                <div style="font-weight:bold; font-size:0.95rem;">${acc.username}</div>
                <div style="font-size:0.75rem; color:#666;">${acc.label || acc.role}</div>
            </div>
        `;

        item.onclick = async () => {
            // Tenta login no servidor
            if (window.location.protocol !== 'file:') {
                try {
                    const senha = defaultPass[acc.username] || '123';
                    const fetchUrl = API_URL ? `${API_URL}/api/login` : '/api/login';
                    
                    const resp = await fetch(fetchUrl, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: acc.username, password: senha })
                    });

                    if (resp.ok) {
                        const body = await resp.json();
                        loginComUsuario(body.user); 
                        return;
                    }
                } catch(e) { 
                    console.log("Servidor offline ou erro de login, usando local."); 
                }
            }
            // Fallback local
            loginComUsuario(acc);
        };

        lista.appendChild(item);
    });

    document.getElementById('modalSwitcher').style.display = 'flex';
}
function abrirRegistro() { document.getElementById('modalRegistro').style.display = 'flex'; }
function fecharRegistro() { document.getElementById('modalRegistro').style.display = 'none'; }


// --- INICIALIZAÇÃO E EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    
    // Usuários padrão iniciais
    const defaultUsers = [
        { username: 'Admin', password: '123', role: 'admin', sector: 'admin' },
        { username: 'Balanca', password: '123', role: 'user', sector: 'recebimento' },
        { username: 'Wayner', password: '123', role: 'user', sector: 'conferente', subType: 'INFRA' },
        { username: 'Fabricio', password: '123', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Clodoaldo', password: '123', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Guilherme', password: '123', role: 'user', sector: 'conferente', subType: 'GAVA' },
        { username: 'EncarRec', password: 'enc123', role: 'Encarregado', sector: 'recebimento' },
        { username: 'EncarConf', password: 'enc123', role: 'Encarregado', sector: 'conferente' }
    ];

    defaultUsers.forEach(newUser => {
         if (!users.find(u => u.username === newUser.username)) {
             users.push(newUser);
         }
    });

    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Listener: formulário de registro
    const formRegistro = document.getElementById('formRegistro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('regNome').value;
            const display = document.getElementById('regDisplay') ? document.getElementById('regDisplay').value : fullName;
            const username = document.getElementById('regUser').value;
            const password = document.getElementById('regPass').value;
            const type = document.getElementById('regType').value;
            const sector = document.getElementById('regSetor').value;

            const reqObj = { id: Date.now().toString(), fullName, displayName: display, username, password, roleRequested: type, sectorRequested: sector, status: 'pending', createdAt: new Date().toISOString() };

            const ls = JSON.parse(localStorage.getItem('account_requests') || '[]');
            ls.push(reqObj);
            localStorage.setItem('account_requests', JSON.stringify(ls));

            if (window.location.protocol !== 'file:') {
                try {
                    const fetchUrl = API_URL ? `${API_URL}/api/account-requests` : '/api/account-requests';
                    await fetch(fetchUrl, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ fullName, displayName: display, username, password, roleRequested: type, sectorRequested: sector }) 
                    });
                } catch (e) { console.warn('Não foi possível enviar solicitação ao servidor, salva localmente.'); }
            }

            alert('Solicitação enviada ao encarregado do setor.');
            fecharRegistro();
        });
    }
});