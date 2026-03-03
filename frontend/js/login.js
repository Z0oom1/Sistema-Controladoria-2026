// Constantes
const USERS_KEY = 'mapa_cego_users';
const LOGIN_CACHE_KEY = 'aw_login_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

// Senhas padrão (centralizado para evitar duplicação)
const DEFAULT_PASSWORDS = {
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

// --- CACHE E CONTROLE DE REQUISIÇÕES ---

/**
 * Gerencia cache de login para evitar requisições repetidas
 */
class LoginCache {
    static set(username, data) {
        const cache = {
            data: data,
            timestamp: Date.now()
        };
        sessionStorage.setItem(`${LOGIN_CACHE_KEY}_${username}`, JSON.stringify(cache));
    }

    static get(username) {
        const cached = sessionStorage.getItem(`${LOGIN_CACHE_KEY}_${username}`);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
            sessionStorage.removeItem(`${LOGIN_CACHE_KEY}_${username}`);
            return null;
        }
        return data;
    }

    static clear(username) {
        sessionStorage.removeItem(`${LOGIN_CACHE_KEY}_${username}`);
    }
}

/**
 * Controla requisições simultâneas para evitar múltiplas chamadas
 */
class RequestController {
    constructor() {
        this.pendingRequests = new Map();
    }

    async execute(key, fn) {
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        const promise = fn().finally(() => {
            this.pendingRequests.delete(key);
        });

        this.pendingRequests.set(key, promise);
        return promise;
    }
}

const requestController = new RequestController();

// --- FUNÇÕES DE LOGIN ---

/**
 * Tenta autenticar no servidor com timeout e retry
 */
async function tryServerLogin(username, password) {
    if (window.location.protocol === 'file:') {
        return null;
    }

    try {
        const fetchUrl = API_URL ? `${API_URL}/api/login` : '/api/login';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const resp = await fetch(fetchUrl, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
            const body = await resp.json();
            const serverUser = body.user || { username };
            serverUser.token = body.token;
            LoginCache.set(username, serverUser);
            return serverUser;
        }
    } catch (e) {
        console.warn('Falha ao conectar ao servidor:', e.message);
    }

    return null;
}

/**
 * Tenta login local com dados do localStorage
 */
function tryLocalLogin(username, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    return users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) || null;
}

/**
 * Função principal de login - otimizada
 */
async function fazerLogin() {
    const userIn = document.getElementById('loginUser').value;
    const passIn = document.getElementById('loginPass').value;

    if (!userIn || !passIn) {
        alert("Preencha usuário e senha.");
        return;
    }

    // Usar RequestController para evitar múltiplas requisições
    await requestController.execute(`login_${userIn}`, async () => {
        // 1. Verificar cache primeiro
        const cachedUser = LoginCache.get(userIn);
        if (cachedUser && cachedUser.password === passIn) {
            loginComUsuario(cachedUser);
            return;
        }

        // 2. Tentar servidor (com timeout)
        const serverUser = await tryServerLogin(userIn, passIn);
        if (serverUser) {
            loginComUsuario(serverUser);
            return;
        }

        // 3. Fallback local
        const localUser = tryLocalLogin(userIn, passIn);
        if (localUser) {
            if (localUser.firstLogin) {
                sessionStorage.setItem('must_change_pw', localUser.username);
            }
            loginComUsuario(localUser);
            return;
        }

        // Falha
        alert("Usuário ou senha incorretos.");
    });
}

/**
 * Login: armazenamento de sessão e redirecionamento
 */
function loginComUsuario(user) {
    if (user.token) sessionStorage.setItem('aw_token', user.token);
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
    
    // Redirecionamento para home
    window.location.href = 'home.html'; 
}

// --- INTERFACE (SWITCHER E REGISTRO) ---

/**
 * Renderiza um item de conta no switcher
 */
function createAccountItem(acc) {
    const item = document.createElement('div');
    item.className = 'account-item'; 
    item.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        display: flex;
        align-items: center;
    `;
    
    // Cores por role (otimizado)
    const roleColors = {
        'Encarregado': { bg: '#8a57e0ff', color: '#fff' },
        'admin': { bg: '#474747ff', color: '#fff' },
        'conferente': { bg: '#ffebee', color: '#D32F2F' },
        'recebimento': { bg: '#e3f2fd', color: '#1976D2' }
    };

    const colors = roleColors[acc.role] || 
                   (acc.sector === 'conferente' ? roleColors['conferente'] : roleColors['recebimento']);

    item.innerHTML = `
        <div style="background:${colors.bg}; color:${colors.color}; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:10px;">${acc.username[0]}</div>
        <div>
            <div style="font-weight:bold; font-size:0.95rem;">${acc.username}</div>
            <div style="font-size:0.75rem; color:#666;">${acc.label || acc.role}</div>
        </div>
    `;

    item.onclick = async () => {
        await requestController.execute(`quick_login_${acc.username}`, async () => {
            const senha = DEFAULT_PASSWORDS[acc.username] || '123';
            
            // Tentar servidor primeiro
            if (window.location.protocol !== 'file:') {
                try {
                    const fetchUrl = API_URL ? `${API_URL}/api/login` : '/api/login';
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const resp = await fetch(fetchUrl, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: acc.username, password: senha }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (resp.ok) {
                        const body = await resp.json();
                        loginComUsuario(body.user); 
                        return;
                    }
                } catch(e) { 
                    console.log("Servidor offline, usando local."); 
                }
            }
            
            // Fallback local
            loginComUsuario(acc);
        });
    };

    return item;
}

/**
 * Abre o switcher de contas
 */
function abrirSwitcher() {
    const lista = document.getElementById('listaContas');
    lista.innerHTML = '';
    
    // Renderizar contas de forma eficiente
    testAccounts.forEach(acc => {
        lista.appendChild(createAccountItem(acc));
    });

    document.getElementById('modalSwitcher').style.display = 'flex';
}

function abrirRegistro() { 
    document.getElementById('modalRegistro').style.display = 'flex'; 
}

function fecharRegistro() { 
    document.getElementById('modalRegistro').style.display = 'none'; 
}

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

            const reqObj = { 
                id: Date.now().toString(), 
                fullName, 
                displayName: display, 
                username, 
                password, 
                roleRequested: type, 
                sectorRequested: sector, 
                status: 'pending', 
                createdAt: new Date().toISOString() 
            };

            const ls = JSON.parse(localStorage.getItem('account_requests') || '[]');
            ls.push(reqObj);
            localStorage.setItem('account_requests', JSON.stringify(ls));

            if (window.location.protocol !== 'file:') {
                try {
                    const fetchUrl = API_URL ? `${API_URL}/api/account-requests` : '/api/account-requests';
                    await fetch(fetchUrl, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ fullName, displayName: display, username, password, roleRequested: type, sectorRequested: sector }),
                        signal: AbortSignal.timeout(5000)
                    });
                } catch (e) { 
                    console.warn('Não foi possível enviar solicitação ao servidor, salva localmente.'); 
                }
            }

            alert('Solicitação enviada ao encarregado do setor.');
            fecharRegistro();
        });
    }
});
