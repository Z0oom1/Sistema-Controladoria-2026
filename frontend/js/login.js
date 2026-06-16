// --- CONFIGURAÇÃO ---
const USERS_KEY = 'mapa_cego_users';
const LOGIN_CACHE_KEY = 'aw_login_cache';
const CACHE_DURATION = 5 * 60 * 1000;

const API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';

// --- CONTAS DE TESTE ---
const testAccounts = [
    { username: 'Fabricio', sector: 'conferente', subType: 'ALM', role: 'user', label: 'Conferente - DOCA/ALM' },
    { username: 'Clodoaldo', sector: 'conferente', subType: 'ALM', role: 'user', label: 'Conferente - DOCA/ALM' },

    { username: 'Guilherme', sector: 'conferente', subType: 'GAVA', role: 'user', label: 'Conferente - GAVA' },
    { username: 'Wayner', sector: 'conferente', subType: 'INFRA', role: 'user', label: 'Conferente - INFRAESTRUTURA' },
    { username: 'Outros', sector: 'conferente', subType: 'OUT', role: 'user', label: 'Conferente - OUTROS' },
    
    { username: 'Caio', sector: 'recebimento', subType: null, role: 'user', label: 'Recebimento - Caio' },
    { username: 'Balanca', sector: 'recebimento', subType: null, role: 'user', label: 'Recebimento - Balança' },
    { username: 'Recebimento', sector: 'recebimento', subType: null, role: 'user', label: 'Recebimento - Geral' },
    
    { username: 'Admin', sector: 'recebimento', subType: null, role: 'admin', label: 'Administrador / Geral' }
];

testAccounts.push({ username: 'EncarRec', sector: 'recebimento', subType: null, role: 'Encarregado', label: 'Encarregado - Recebimento' });
testAccounts.push({ username: 'EncarConf', sector: 'conferente', subType: null, role: 'Encarregado', label: 'Encarregado - Conferencia' });

const DEFAULT_PASSWORDS = {
    'Admin': '123',
    'EncarRec': 'enc123',
    'EncarConf': 'enc123',
    'Balanca': '123',
    'Fabricio': '123',
    'Clodoaldo': '123',
    'Caio': '123',
    'Recebimento': '123',
    'Wayner': '123',
    'Guilherme': '123',
    'Outros': '123'
};

// --- CACHE E CONTROLE DE REQUISIÇÕES ---
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
async function tryServerLogin(username, password) {
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from('app_data')
                .select('value')
                .eq('key', 'mapa_cego_users')
                .maybeSingle();

            let users = [];
            if (!error && data) {
                users = data.value || [];
            }

            const defaultUsers = [
                { username: 'Admin', password: '123', role: 'admin', sector: 'recebimento' },
                { username: 'Caio', password: '123', role: 'user', sector: 'recebimento' },
                { username: 'Balanca', password: '123', role: 'user', sector: 'recebimento' },
                { username: 'Recebimento', password: '123', role: 'user', sector: 'recebimento' },
                { username: 'Wayner', password: '123', role: 'user', sector: 'conferente', subType: 'INFRA' },
                { username: 'Fabricio', password: '123', role: 'user', sector: 'conferente', subType: 'ALM' },
                { username: 'Clodoaldo', password: '123', role: 'user', sector: 'conferente', subType: 'ALM' },
                { username: 'Guilherme', password: '123', role: 'user', sector: 'conferente', subType: 'GAVA' },
                { username: 'EncarRec', password: 'enc123', role: 'Encarregado', sector: 'recebimento' },
                { username: 'EncarConf', password: 'enc123', role: 'Encarregado', sector: 'conferente' }
            ];

            const allUsers = [...defaultUsers];
            if (Array.isArray(users)) {
                users.forEach(u => {
                    if (u && u.username && !allUsers.find(x => x.username.toLowerCase() === u.username.toLowerCase())) {
                        allUsers.push(u);
                    }
                });
            }

            const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && (u.password === password || (u.username === 'Admin' && password === 'admin')));
            if (user) {
                const loggedUser = {
                    username: user.username,
                    sector: user.sector,
                    subType: user.subType || null,
                    role: user.role,
                    label: user.label || `${user.role} - ${user.username}`,
                    token: 'jwt-token-stub-' + user.username
                };
                LoginCache.set(username, loggedUser);
                return loggedUser;
            }
        } catch (e) {
            console.error("Erro ao autenticar no Supabase:", e);
        }
        return null;
    }

    if (window.location.protocol === 'file:') {
        return null;
    }

    try {
        const fetchUrl = API_URL ? `${API_URL}/api/login` : '/api/login';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

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

function tryLocalLogin(username, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    return users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) || null;
}

async function fazerLogin() {
    const userIn = document.getElementById('loginUser').value;
    const passIn = document.getElementById('loginPass').value;

    if (!userIn || !passIn) {
        alert("Preencha usuário e senha.");
        return;
    }

    await requestController.execute(`login_${userIn}`, async () => {
        const cachedUser = LoginCache.get(userIn);
        if (cachedUser && cachedUser.password === passIn) {
            loginComUsuario(cachedUser);
            return;
        }

        const serverUser = await tryServerLogin(userIn, passIn);
        if (serverUser) {
            loginComUsuario(serverUser);
            return;
        }

        const localUser = tryLocalLogin(userIn, passIn);
        if (localUser) {
            if (localUser.firstLogin) {
                sessionStorage.setItem('must_change_pw', localUser.username);
            }
            loginComUsuario(localUser);
            return;
        }

        alert("Usuário ou senha incorretos.");
    });
}

function loginComUsuario(user) {
    if (user.token) sessionStorage.setItem('aw_token', user.token);
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
    
    // Redirecionamento limpo e compatível com o vercel.json e local
    if (window.location.protocol === 'file:') {
        window.location.href = 'home.html';
    } else {
        window.location.href = window.supabaseClient ? '/home' : '/pages/home.html'; 
    }
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
            
            const serverUser = await tryServerLogin(acc.username, senha);
            if (serverUser) {
                loginComUsuario(serverUser);
                return;
            }
            
            loginComUsuario(acc);
        });
    };

    return item;
}

function abrirSwitcher() {
    const lista = document.getElementById('listaContas');
    lista.innerHTML = '';
    
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

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    
    const defaultUsers = [
        { username: 'Admin', password: '123', role: 'admin', sector: 'recebimento' },
        { username: 'Caio', password: '123', role: 'user', sector: 'recebimento' },
        { username: 'Balanca', password: '123', role: 'user', sector: 'recebimento' },
        { username: 'Recebimento', password: '123', role: 'user', sector: 'recebimento' },
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

            if (window.supabaseClient) {
                try {
                    const { data: row, error: fetchErr } = await window.supabaseClient
                        .from('app_data')
                        .select('value')
                        .eq('key', 'aw_requests')
                        .maybeSingle();

                    let requests = [];
                    if (!fetchErr && row && row.value) {
                        requests = row.value;
                    }

                    requests.push(reqObj);

                    const { error: saveErr } = await window.supabaseClient
                        .from('app_data')
                        .upsert({ key: 'aw_requests', value: requests });

                    if (saveErr) throw saveErr;
                    console.log('Solicitação enviada ao Supabase com sucesso.');
                } catch (e) {
                    console.error('Erro ao enviar solicitação para o Supabase:', e.message);
                }
            } else if (window.location.protocol !== 'file:') {
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
