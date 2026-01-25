// ===================================================================================
//          WILSON CORE 2.4.3 - Update - FUNCIONALIDADES & LOGICAS PRINCIPAIS         
// ===================================================================================

// =========================================================
// MÓDULO DE VALIDAÇÃO E SEGURANÇA DE DADOS
// =========================================================

function getBrazilTime() {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString();
}

const Validators = {
    cleanName: (txt) => {
        if (!txt) return '';
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(txt)) {
            alert("ERRO: Nomes não podem conter números ou caracteres especiais.");
            return null;
        }
        return txt.toUpperCase().trim();
    },

    cleanNumber: (txt) => {
        if (!txt) return '';
        return txt.replace(/\D/g, ''); // Remove tudo que não é dígito
    },

    validatePlate: (txt) => {
        if (!txt) return null;
        const raw = txt.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const regexPlaca = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

        if (!regexPlaca.test(raw)) {
            alert("ERRO: Formato de placa inválido. Use ABC1234 ou ABC1D23.");
            return null;
        }
        return raw.substring(0, 3) + '-' + raw.substring(3); // Formata visualmente
    }
};



let globalAudioCtx = null;
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission();
}
const getBaseUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = "2006"; // Porta ajustada conforme server.js
    if (protocol === 'file:') {
        return `http://localhost:${port}`;
    } else {
        return `${protocol}//${hostname}:${port}`;
    }
};

const API_URL = getBaseUrl();
console.log("Conectando ao servidor em:", API_URL);

let socket;
try {
    if (typeof io !== 'undefined') {
        socket = io(API_URL);

        socket.on('connect', () => {
            console.log("Socket conectado!", socket.id);
        });

        socket.on('atualizar_sistema', (data) => {
            console.log("Recebida atualização do servidor:", data);
            loadDataFromServer();
        });
    } else {
        console.error("ERRO: Socket.io não foi carregado no HTML.");
    }
} catch (e) {
    console.warn("Erro ao iniciar Socket:", e);
}

document.addEventListener('click', function unlockAudio() {
    if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            globalAudioCtx = new AudioContext();
            const osc = globalAudioCtx.createOscillator(); const gain = globalAudioCtx.createGain();
            gain.gain.value = 0; osc.connect(gain); gain.connect(globalAudioCtx.destination);
            osc.start(0); osc.stop(0.1);
        }
    }
    document.removeEventListener('click', unlockAudio);
});

function playBeep() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        let ctx = globalAudioCtx;
        if (!ctx || ctx.state === 'closed') { ctx = new AudioContext(); globalAudioCtx = ctx; } else if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 550;
        const now = ctx.currentTime; gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.1); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now); osc.stop(now + 0.8);
    } catch (e) { console.warn("Audio blocked:", e); }
}

function sendSystemNotification(title, body, targetView, targetId) {
    playBeep();
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") createVisualNotification(title, body, targetView, targetId);
}

function createVisualNotification(title, body, targetView, targetId) {
    try {
        const notif = new Notification(title, { body: body, icon: '/img/logo-sf.png' });
        notif.onclick = function () { window.focus(); if (targetView) navTo(targetView); if (targetId && targetView === 'mapas') loadMap(targetId); this.close(); };
    } catch (e) { console.error("Notif error", e); }
}

let suppliersData = [];     // { id, nome }
let carriersData = [];      // { id, nome, apelido, cnpj, supplierIds: [] }
let driversData = [];       // { id, nome, doc, carrierIds: [] }
let platesData = [];        // { id, numero, driverId }
let productsData = [];

let patioData = [];
let mapData = [];
let mpData = [];
let carregamentoData = [];
let requests = [];
let usersData = [];

let entryState = {
    selectedSupplierId: null,
    selectedCarrierId: null,
    selectedDriverId: null,
    selectedPlateId: null
};

let tmpItems = [];
let currentMapId = null;
let contextMapId = null;
let contextMPId = null;
let contextCarrId = null;
let contextTruckId = null;
let contextCadId = null;
let deleteOptionSelected = 'queue';
let editTmpItems = [];
let isEditingMode = false;
let filteredReportData = [];
let currentReportType = '';
let selectedReportItems = new Set();
let notifiedEvents = new Set();
const defaultProducts = ["CX PAP 125A", "AÇ CRISTAL", "AÇ LIQUIDO", "AÇ REFINADO", "SAL REFINADO"];

function initRoleBasedUI() {
    if (localStorage.getItem('aw_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        const tg = document.getElementById('darkModeToggle');
        if (tg) tg.checked = true;
    }
    if (localStorage.getItem('aw_fast_mode') === 'true') {
        document.body.classList.add('fast-mode');
        const ftg = document.getElementById('fastModeToggle');
        if (ftg) ftg.checked = true;
    }

    if (typeof isConferente !== 'undefined' && isConferente) {
        const fab = document.getElementById('fabAddTruck'); if (fab) fab.style.display = 'none';
        const mc = document.getElementById('menuCarregamento'); if (mc) mc.style.display = 'none';
    } else {
        const fab = document.getElementById('fabAddTruck'); if (fab) fab.style.display = 'flex';
        const mc = document.getElementById('menuCarregamento'); if (mc) mc.style.display = 'flex';
    }

    const mmp = document.getElementById('menuMateriaPrima');
    if (typeof isRecebimento !== 'undefined') {
        if (mmp) mmp.style.display = isRecebimento ? 'flex' : 'none';
    }

    const menuDash = document.getElementById('menuDashboard');
    const isEnc = typeof isEncarregado !== 'undefined' ? isEncarregado : false;
    const isAdm = typeof isAdmin !== 'undefined' ? isAdmin : false;
    const canViewDash = isEnc || isAdm;

    if (menuDash) {
        menuDash.style.display = canViewDash ? 'flex' : 'none';
    }

    // Controle de acesso ao menu de cadastros - Almoxarifado não tem acesso
    const menuCadastros = document.getElementById('menuCadastros');
    const isAlmoxarifado = typeof userSubType !== 'undefined' && userSubType === 'ALM';
    if (menuCadastros) {
        menuCadastros.style.display = isAlmoxarifado ? 'none' : 'flex';
    }

    if (typeof isConferente !== 'undefined' && isConferente && typeof userSubType !== 'undefined' && userSubType) {
        const cA = document.getElementById('col-ALM');
        const cG = document.getElementById('col-GAVA');
        const cO = document.getElementById('col-OUT');

        if (cA) cA.style.display = 'none';
        if (cG) cG.style.display = 'none';
        if (cO) cO.style.display = 'none';

        if (userSubType === 'ALM') {
            if (cA) cA.style.display = 'flex';
            if (cG) cG.style.display = 'flex';
        } else if (userSubType === 'GAVA') {
            if (cG) cG.style.display = 'flex';
        } else {
            if (cO) cO.style.display = 'flex';
            const sn = { 'INFRA': 'INFRAESTRUTURA', 'MANUT': 'MANUTENÇÃO', 'LAB': 'LABORATÓRIO', 'PESAGEM': 'PESAGEM', 'SST': 'SST', 'CD': 'CD', 'COMPRAS': 'COMPRAS' };
            const tit = cO.querySelector('.col-header');
            if (tit && sn[userSubType]) tit.innerHTML = sn[userSubType] + ' <span id="count-OUT">0</span>';
        }
    }

    ['patioDateFilter', 'mapDate', 'mpDateFilter', 'carrDateFilter', 'mapListDateFilter', 'repDateStart', 'repDateEnd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = getBrazilTime().split('T')[0];
    });

    setInterval(() => { const el = document.getElementById('serverTime'); if (el) el.textContent = new Date().toLocaleTimeString(); }, 1000);
}

// =========================================================
// LÓGICA DE CARREGAMENTO ROBUSTA (OFFLINE FIRST)
// =========================================================
async function loadDataFromServer() {
    try {
        const response = await fetch(`${API_URL}/api/sync?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Offline");
        const data = await response.json();

        patioData = data.aw_caminhoes_v2 || [];
        mapData = data.mapas_cegos_v3 || [];
        mpData = data.aw_materia_prima || [];
        carregamentoData = data.aw_carregamento || [];
        requests = data.aw_requests || [];
        usersData = data.mapa_cego_users || [];

        suppliersData = data.aw_suppliers || [];
        carriersData = data.aw_carriers || [];
        driversData = data.aw_drivers || [];
        platesData = data.aw_plates || [];
        productsData = data.aw_products || [];

        saveToLocalOnly();
    } catch (error) {
        console.warn("Modo Offline / Erro Sync:", error);
        restoreFromLocal();
    }
    refreshCurrentView();
}

function restoreFromLocal() {
    patioData = JSON.parse(localStorage.getItem('aw_caminhoes_v2') || '[]');
    mapData = JSON.parse(localStorage.getItem('mapas_cegos_v3') || '[]');
    mpData = JSON.parse(localStorage.getItem('aw_materia_prima') || '[]');
    carregamentoData = JSON.parse(localStorage.getItem('aw_carregamento') || '[]');
    requests = JSON.parse(localStorage.getItem('aw_requests') || '[]');
    usersData = JSON.parse(localStorage.getItem('mapa_cego_users') || '[]');

    suppliersData = JSON.parse(localStorage.getItem('aw_suppliers') || '[]');
    carriersData = JSON.parse(localStorage.getItem('aw_carriers') || '[]');
    driversData = JSON.parse(localStorage.getItem('aw_drivers') || '[]');
    platesData = JSON.parse(localStorage.getItem('aw_plates') || '[]');
    productsData = JSON.parse(localStorage.getItem('aw_products') || '[]');
}

function refreshCurrentView() {
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection) {
        const currentView = activeSection.id.replace('view-', '');
        // Bloqueia renderização de cadastros para usuários do almoxarifado
        if (currentView === 'cadastros' && typeof userSubType !== 'undefined' && userSubType === 'ALM') {
            navTo('patio', null);
            return;
        }
        if (currentView === 'patio') renderPatio();
        else if (currentView === 'mapas') { renderMapList(); updateMapState(); }
        else if (currentView === 'materia-prima') renderMateriaPrima();
        else if (currentView === 'carregamento') renderCarregamento();
        else if (currentView === 'cadastros') renderCadastros();
        else if (currentView === 'notificacoes') renderRequests();
        else if (currentView === 'dashboard') { renderDashboard(); }
    }
    updateBadge();
    updateAccountRequestBadge();


}

loadDataFromServer();

setTimeout(() => {
    try {
        const pending = sessionStorage.getItem('must_change_pw');
        if (pending) {
            const logged = JSON.parse(sessionStorage.getItem('loggedInUser') || 'null');
            if (logged && logged.username === pending) {
                document.getElementById('modalFirstAccess') && (document.getElementById('modalFirstAccess').style.display = 'flex');
            }
        }
    } catch (e) { }
}, 800);

function closeFirstAccessModal() { const m = document.getElementById('modalFirstAccess'); if (m) m.style.display = 'none'; }

async function confirmFirstAccessChange() {
    const p1 = (document.getElementById('firstNewPass') || {}).value;
    const p2 = (document.getElementById('firstNewPass2') || {}).value;
    if (!p1 || !p2) return alert('Preencha as senhas.');
    if (p1 !== p2) return alert('As senhas não coincidem.');
    const username = sessionStorage.getItem('must_change_pw');
    if (!username) return alert('Usuário não identificado.');

    const idx = usersData.findIndex(u => u.username === username);
    if (idx > -1) {
        usersData[idx].password = p1; usersData[idx].firstLogin = false;
        saveAll(); // Salva a alteração
    }
    sessionStorage.removeItem('must_change_pw');
    closeFirstAccessModal();
    alert('Senha atualizada.');
    location.reload();
}

function toggleMobileMenu() { const sb = document.querySelector('.main-sidebar'); if (sb) sb.classList.toggle('show-mobile'); }
function toggleMapListMobile() { const mm = document.getElementById('mobileMapList'); if (mm) mm.classList.toggle('open'); }

// =========================================================
// MÓDULO DE ENTRADA INTELIGENTE (FUNIL / FILTER CHAIN)
// =========================================================

function populateDatalist(listId, dataArr, displayField = 'nome') {
    const dl = document.getElementById(listId);
    if (!dl) return;
    dl.innerHTML = '';
    dataArr.forEach(item => {
        const val = item[displayField] || item.nome;
        const opt = document.createElement('option');
        opt.value = val;
        dl.appendChild(opt);
    });
}
function toggleCarrierInput() {
    const chk = document.getElementById('chkUseCarrier');
    const input = document.getElementById('inTransp');

    if (chk.checked) {
        input.disabled = false;
        input.style.backgroundColor = 'var(--bg-input)';
        input.style.cursor = 'text';
        input.focus();
    } else {
        input.disabled = true;
        input.style.backgroundColor = '#f1f5f9';
        input.style.cursor = 'not-allowed';
        input.value = '';
        entryState.selectedCarrierId = null;
        input.classList.remove('input-warning');
        filterChain('transportadora');
    }
    
    evaluateRequestNecessity();
}

function filterChain(step) {
    const inForn = document.getElementById('inForn');
    const inTransp = document.getElementById('inTransp');
    const inMot = document.getElementById('inMot');
    const inPlaca = document.getElementById('inPlaca');
    const useCarrier = document.getElementById('chkUseCarrier').checked;

    const findId = (arr, val) => {
        if (!val) return null;
        const vUpper = val.toUpperCase().trim();
        return arr.find(x =>
            (x.nome && x.nome.toUpperCase() === vUpper) ||
            (x.apelido && x.apelido.toUpperCase() === vUpper) ||
            (x.numero && x.numero === vUpper)
        )?.id || null;
    };

    if (step === 'fornecedor') {
        entryState.selectedSupplierId = findId(suppliersData, inForn.value);
        checkFieldStatus('inForn', entryState.selectedSupplierId);

        if (useCarrier) {
            let validCarriers = carriersData;
            if (entryState.selectedSupplierId) {
                validCarriers = carriersData.filter(c => c.supplierIds && c.supplierIds.includes(entryState.selectedSupplierId));
            }
            populateDatalist('dlTransp', validCarriers, 'apelido');
        }
    }

    if (step === 'transportadora' || step === 'fornecedor') {
        if (useCarrier) {
            entryState.selectedCarrierId = findId(carriersData, inTransp.value);
            checkFieldStatus('inTransp', entryState.selectedCarrierId);

            if (entryState.selectedCarrierId) {
                const validDrivers = driversData.filter(d => d.carrierIds && d.carrierIds.includes(entryState.selectedCarrierId));
                populateDatalist('dlMot', validDrivers);
            } else {
                populateDatalist('dlMot', driversData);
            }
        } else {
            entryState.selectedCarrierId = null;
            populateDatalist('dlMot', driversData);
        }
    }

    if (step === 'motorista' || step === 'transportadora') {
        entryState.selectedDriverId = findId(driversData, inMot.value);
        checkFieldStatus('inMot', entryState.selectedDriverId);

        let validPlates = platesData;
        if (entryState.selectedDriverId) {
            validPlates = platesData.filter(p => p.driverId === entryState.selectedDriverId);
        }
        populateDatalist('dlPlaca', validPlates, 'numero');
    }

    if (step === 'placa' || step === 'motorista') {
        let raw = inPlaca.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (raw.length >= 7) {
            raw = raw.substring(0, 7);
            inPlaca.value = raw.substring(0, 3) + '-' + raw.substring(3);
        }

        entryState.selectedPlateId = platesData.find(p =>
            p.numero.replace('-', '') === raw
        )?.id || null;

        checkFieldStatus('inPlaca', entryState.selectedPlateId);

    }

    evaluateRequestNecessity();
}

function checkFieldStatus(inputId, idFound) {
    const el = document.getElementById(inputId);
    if (!el) return;
    if (el.value.trim() !== '' && !idFound) el.classList.add('input-warning');
    else el.classList.remove('input-warning');
}

function navTo(view, el) {
    // Bloqueia acesso ao cadastro para usuários do almoxarifado
    if (view === 'cadastros' && typeof userSubType !== 'undefined' && userSubType === 'ALM') {
        alert('Acesso negado: Usuários do almoxarifado não têm permissão para acessar cadastros.');
        return;
    }

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const t = document.getElementById('view-' + view);
    if (t) t.classList.add('active');

    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if (el) el.classList.add('active');
    else {
        const link = document.querySelector(`.menu-item[onclick*="'${view}'"]`);
        if (link) link.classList.add('active');
    }

    const mainSide = document.querySelector('.main-sidebar'); if (mainSide) mainSide.classList.remove('show-mobile');

    const titles = {
        patio: 'Controle de Pátio',
        mapas: 'Mapas Cegos',
        relatorios: 'Relatórios',
        notificacoes: 'Notificações',
        cadastros: 'Cadastros Gerais',
        produtos: 'Catálogo de Produtos', // ADICIONADO
        'materia-prima': 'Matéria Prima',
        'carregamento': 'Carregamento',
        'configuracoes': 'Configurações',
        'perfil': 'Área do Usuário',
        'dashboard': 'Dashboard'
    };

    if (view === 'produtos') renderProductsView();

    const currentTitle = titles[view] || 'Home Page';
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = currentTitle;

    const appTitle = document.querySelector('.app-title');
    if (appTitle) {
        appTitle.innerText = `CONTROLADORIA AW - ${currentTitle.toUpperCase()}`;
    }

    if (view === 'patio') renderPatio();
    if (view === 'mapas') { renderMapList(); updateMapState(); }
    if (view === 'materia-prima') renderMateriaPrima();
    if (view === 'carregamento') renderCarregamento();
    if (view === 'cadastros') renderCadastros(); // Novo
    if (view === 'notificacoes') renderRequests();
    if (view === 'perfil') renderProfileArea();
    if (view === 'dashboard') { renderDashboard(); }
    if (view === 'configuracoes') updatePermissionStatus();

    localStorage.setItem('aw_last_view', view);
}

function logout() { sessionStorage.removeItem('loggedInUser'); window.location.href = 'login.html'; }

function renderProfileArea() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    container.innerHTML = '';

    if (isAdmin) {
        container.innerHTML = `
            <div class="settings-card">
                <h4><i class="fas fa-users-cog"></i> Gerenciamento de Usuários (Administrador)</h4>
                <div style="margin-bottom:20px; background:var(--bg-input); padding:15px; border-radius:6px; border:1px solid var(--border-color);">
                    <h5>Adicionar Novo Usuário</h5>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap:10px; align-items:end;">
                        <div><label style="font-size:0.8rem">Usuário</label><input type="text" id="newUsername" placeholder="Ex: Joao"></div>
                        <div><label style="font-size:0.8rem">Senha</label><input type="text" id="newPassword" placeholder="***"></div>
                        <div><label style="font-size:0.8rem">Função</label>
                            <select id="newRole">
                                <option value="user">Usuário</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div><label style="font-size:0.8rem">Setor/Subtipo</label>
                            <select id="newSector">
                                <option value="recebimento">Recebimento</option>
                                <option value="conferente">Conferente (Geral)</option>
                                <option value="ALM">Conferente ALM</option>
                                <option value="GAVA">Conferente GAVA</option>
                                <option value="INFRA">Conferente INFRA</option>
                                <option value="MANUT">Conferente MANUT</option>
                            </select>
                        </div>
                        <button class="btn btn-save" onclick="addNewUser()">Adicionar</button>
                    </div>
                </div>
                <table class="modern-table">
                    <thead><tr><th>Usuário</th><th>Função</th><th>Setor/Subtipo</th><th>Ações</th></tr></thead>
                    <tbody id="adminUserList"></tbody>
                </table>
            </div>
        `;
        renderUserList();
    } else {
        const countToday = patioData.filter(x => (x.chegada || '').startsWith(today)).length;
        if (isEncarregado) {
            container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <h4><i class="fas fa-id-card"></i> Meu Perfil</h4>
                    <p><b>Usuário:</b> ${loggedUser.username}</p>
                    <p><b>Função:</b> ${loggedUser.role}</p>
                    <p><b>Setor:</b> ${loggedUser.sector} ${loggedUser.subType ? '(' + loggedUser.subType + ')' : ''}</p>
                </div>
                <div class="settings-card">
                    <h4><i class="fas fa-chart-bar"></i> Estatísticas Hoje</h4>
                    <p>Caminhões no Pátio: <b>${patioData.filter(x => x.status !== 'SAIU').length}</b></p>
                    <p>Entradas Totais: <b>${countToday}</b></p>
                </div>
            </div>

            <div style="margin-top:18px;">
                <div class="settings-card">
                    <h4><i class="fas fa-user-cog"></i> Controle de Contas (Encarregado)</h4>
                    <div style="margin-bottom:10px; background:var(--bg-input); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
                        <h5 style="margin-top:0;">Criar Conta para Funcionário (Setor: ${loggedUser.sector})</h5>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; align-items:end;">
                            <input id="new_fullname" placeholder="Nome Completo">
                            <input id="new_display" placeholder="Nome de Assinatura">
                            <input id="new_username" placeholder="Login">
                            <input id="new_password" placeholder="Senha">
                            <button class="btn btn-save" onclick="createAccountByEncarregado()">Criar</button>
                        </div>
                    </div>

                    <h5>Pendências de Solicitação</h5>
                    <div id="encReqList" style="max-height:220px; overflow:auto; border:1px solid var(--border-color); padding:8px; border-radius:6px; background:var(--bg-card);"></div>
                </div>
            </div>
            `;
            loadAccountRequests();
        } else {
            container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <h4><i class="fas fa-id-card"></i> Meu Perfil</h4>
                    <p><b>Usuário:</b> ${loggedUser.username}</p>
                    <p><b>Setor:</b> ${loggedUser.sector}</p>
                </div>
                <div class="settings-card">
                    <h4><i class="fas fa-chart-bar"></i> Estatísticas Hoje</h4>
                    <p>Caminhões no Pátio: <b>${patioData.filter(x => x.status !== 'SAIU').length}</b></p>
                    <p>Entradas Totais: <b>${countToday}</b></p>
                </div>
            </div>
            `;
        }
    }
}

function renderProductsView() {
    const tbody = document.getElementById('prodViewBody');
    const term = document.getElementById('prodViewSearch').value.toUpperCase();
    tbody.innerHTML = '';

    const sorted = productsData.sort((a, b) => a.nome.localeCompare(b.nome));

    sorted.forEach(p => {
        if (term && !p.nome.includes(term) && !(p.codigo || '').includes(term)) return;

        let loadCount = 0;
        let suppliersSet = new Set();

        patioData.forEach(truck => {
            if (truck.cargas && truck.cargas.length > 0) {
                const hasProduct = truck.cargas[0].produtos.some(prod => prod.nome === p.nome);
                if (hasProduct) {
                    loadCount++;
                    let supName = truck.empresa;
                    if (truck.supplierId) {
                        const s = suppliersData.find(x => x.id === truck.supplierId);
                        if (s) supName = s.nome;
                    }
                    suppliersSet.add(supName);
                }
            }
        });

        const suppliersArr = Array.from(suppliersSet);
        let supDisplay = suppliersArr.slice(0, 2).join(', ');
        if (suppliersArr.length > 2) supDisplay += ` e mais ${suppliersArr.length - 2}...`;
        if (suppliersArr.length === 0) supDisplay = '<span style="color:#ccc">-</span>';

        const codeDisplay = p.codigo ? `<span class="badge-code" style="font-size:1rem;">${p.codigo}</span>` : '<span style="color:#ccc; font-style:italic;">Sem Cód.</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${codeDisplay}</td>
            <td><b>${p.nome}</b></td>
            <td>${loadCount} cargas</td>
            <td style="font-size:0.85rem; color:#666;">${supDisplay}</td>
            <td>
                <button class="btn btn-edit btn-small" onclick="openCadModal('produto', '${p.id}')"><i class="fas fa-edit"></i> Editar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (tbody.innerHTML === '') {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999">Nenhum produto encontrado.</td></tr>';
    }
}

function showProductCodePopup(prodName) {
    if (!prodName) return;

    const nameUpper = prodName.toUpperCase().trim();
    const product = productsData.find(p => p.nome === nameUpper);

    const modal = document.getElementById('modalProdCode');
    const lblName = document.getElementById('popProdName');
    const lblCode = document.getElementById('popProdCode');

    lblName.innerText = nameUpper;

    if (product && product.codigo) {
        lblCode.innerText = product.codigo;
        lblCode.style.color = "var(--primary)";
        lblCode.style.fontStyle = "normal";
    } else {
        lblCode.innerText = "NÃO CADASTRADO";
        lblCode.style.color = "#ccc";
        lblCode.style.fontSize = "1.5rem";
    }

    modal.style.display = 'flex';
}
function renderUserList() {
    const tbody = document.getElementById('adminUserList');
    tbody.innerHTML = '';
    usersData.forEach(u => {
        const isMe = u.username === loggedUser.username;
        const btn = isMe ? '<span style="color:#999; font-size:0.8rem;">(Você)</span>' : `<button class="btn btn-edit btn-small" onclick="removeUser('${u.username}')" style="color:red; border-color:red;">Remover</button>`;
        let secDisplay = u.sector; if (u.subType) secDisplay += ` (${u.subType})`;
        tbody.innerHTML += `<tr><td><b>${u.username}</b></td><td>${u.role}</td><td>${secDisplay}</td><td>${btn}</td></tr>`;
    });
}

function loadAccountRequests() {
    const local = JSON.parse(localStorage.getItem('account_requests') || '[]');
    renderAccountRequests(local);
    if (window.location.protocol !== 'file:') {
        fetch(`${API_URL}/api/account-requests`).then(r => r.ok ? r.json() : null).then(body => {
            if (body && body.requests) renderAccountRequests(body.requests);
        }).catch(() => { });
    }
}

function renderAccountRequests(arr) {
    const listEl = document.getElementById('encReqList');
    if (!listEl) return;
    if (!arr || arr.length === 0) { listEl.innerHTML = '<div style="color:var(--text-muted)">Nenhuma solicitação pendente.</div>'; return; }

    const mine = arr.filter(r => (r.sectorRequested || r.sector || '').toLowerCase() === (loggedUser.sector || '').toLowerCase() && r.status === 'pending');
    if (mine.length === 0) { listEl.innerHTML = '<div style="color:var(--text-muted)">Nenhuma solicitação pendente para seu setor.</div>'; return; }
    listEl.innerHTML = mine.map(r => `
        <div style="padding:8px; border-bottom:1px solid rgba(0,0,0,0.04); display:flex; justify-content:space-between; align-items:center;">
            <div><b>${r.fullName}</b> <div style="font-size:0.85rem; color:var(--text-muted)">${r.username}</div></div>
            <div style="display:flex; gap:6px;"><button class="btn btn-save btn-small" onclick="approveRequest('${r.id}')">Aprovar</button><button class="btn btn-edit btn-small" onclick="rejectRequest('${r.id}')">Rejeitar</button></div>
        </div>
    `).join('');
}

function updateAccountRequestBadge() {
    const ls = JSON.parse(localStorage.getItem('account_requests') || '[]');
    const count = (ls.filter(r => r.status === 'pending' && (r.sectorRequested || r.sector || '').toLowerCase() === (loggedUser.sector || '').toLowerCase())).length;
    const b = document.getElementById('badgeNotif');
    if (b) { if (count > 0) { b.innerText = count; b.style.display = 'inline-block'; } else b.style.display = 'none'; }
}

async function approveRequest(id) {
    const arr = JSON.parse(localStorage.getItem('account_requests') || '[]');
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return alert('Solicitação não encontrada.');
    const reqObj = arr[idx];

    if (!usersData.find(u => u.username === reqObj.username)) {
        usersData.push({ username: reqObj.username, password: reqObj.password || 'changeme', role: reqObj.roleRequested || 'Funcionario', sector: reqObj.sectorRequested, firstLogin: false });
        saveAll();
    }

    arr[idx].status = 'approved';
    localStorage.setItem('account_requests', JSON.stringify(arr));

    alert('Solicitação aprovada e conta criada.');
    loadAccountRequests();
}

function rejectRequest(id) {
    const arr = JSON.parse(localStorage.getItem('account_requests') || '[]');
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return alert('Solicitação não encontrada.');
    arr[idx].status = 'rejected';
    localStorage.setItem('account_requests', JSON.stringify(arr));
    alert('Solicitação rejeitada.');
    loadAccountRequests();
}

async function createAccountByEncarregado() {
    const fullName = (document.getElementById('new_fullname') || {}).value || '';
    const display = (document.getElementById('new_display') || {}).value || fullName;
    const username = (document.getElementById('new_username') || {}).value;
    const password = (document.getElementById('new_password') || {}).value;
    const role = 'Funcionario';
    const sector = loggedUser.sector || 'recebimento';

    if (!username || !password) return alert('Preencha usuário e senha.');
    if (usersData.find(u => u.username === username)) return alert('Usuário já existe.');

    usersData.push({ username, password, role, sector, name: fullName, displayName: display, firstLogin: true });
    saveAll();

    alert('Usuário criado com sucesso.');
    document.getElementById('new_fullname').value = ''; document.getElementById('new_display').value = ''; document.getElementById('new_username').value = ''; document.getElementById('new_password').value = '';
    loadAccountRequests();
}

function renderDashboard() {
    let dashView = document.getElementById('view-dashboard');
    if (!dashView) {
        const sibling = document.querySelector('.view-section');
        if (sibling && sibling.parentNode) {
            dashView = document.createElement('div');
            dashView.id = 'view-dashboard';
            dashView.className = 'view-section active';
            sibling.parentNode.appendChild(dashView);
        }
    }

    if (!document.getElementById('slot-0')) {
        dashView.innerHTML = `
            <div class="dashboard-controls">
                <h2>Dashboard Inteligente</h2>
                <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:end; margin-bottom:15px;">
                    <div><label>De:</label><input type="date" id="dashFrom" class="form-control"></div>
                    <div><label>Até:</label><input type="date" id="dashTo" class="form-control"></div>
                    <div><label>Produto:</label><input type="text" id="dashProduct" placeholder="Ex: AÇUCAR" class="form-control"></div>
                    <div><label>Placa:</label><input type="text" id="dashPlate" placeholder="ABC-1234" class="form-control"></div>
                    <div><label>Setor:</label>
                        <select id="dashSector" class="form-control">
                            <option value="">Todos</option>
                            <option value="ALM">Almoxarifado</option>
                            <option value="GAVA">Gava</option>
                            <option value="RECEBIMENTO">Recebimento</option>
                        </select>
                    </div>
                    <button class="btn btn-save" onclick="saveDashboardLayout()"><i class="fas fa-save"></i> Salvar Layout</button>
                    <button class="btn btn-edit" onclick="clearDashboard()"><i class="fas fa-trash"></i> Limpar</button>
                </div>
                <div style="margin-bottom:10px; padding:10px; background:#f5f5f5; border-radius:5px;">
                    <label><b>Presets:</b></label> 
                    <input type="text" id="presetName" placeholder="Nome do filtro..." style="padding:5px; width:150px;">
                    <button class="btn btn-small" onclick="savePreset()">Salvar Preset</button>
                    <div id="presetList" style="margin-top:5px;"></div>
                </div>
            </div>
            
            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                <div class="dash-slot" id="slot-0"><div class="empty-state"><button class="btn btn-primary" onclick="addToSlot(0)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-1"><div class="empty-state"><button class="btn btn-primary" onclick="addToSlot(1)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-2"><div class="empty-state"><button class="btn btn-primary" onclick="addToSlot(2)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-3"><div class="empty-state"><button class="btn btn-primary" onclick="addToSlot(3)">+ Adicionar Gráfico</button></div></div>
            </div>
        `;
    }
    const from = document.getElementById('dashFrom');
    const to = document.getElementById('dashTo');
    if (from && !from.value) from.value = getBrazilTime().split('T')[0];
    if (to && !to.value) to.value = getBrazilTime().split('T')[0];

    initDashboard();
    loadPresets();
}

async function savePreset() {
    const name = (document.getElementById('presetName') || {}).value;
    if (!name) return alert('Digite um nome para o preset.');
    const filters = {
        from: document.getElementById('dashFrom').value,
        to: document.getElementById('dashTo').value,
        product: document.getElementById('dashProduct').value,
        plate: document.getElementById('dashPlate').value,
        sector: document.getElementById('dashSector').value
    };

    const uname = (loggedUser && loggedUser.username) ? loggedUser.username : 'local';
    const key = `presets_${uname}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ id: Date.now().toString(), name, filters });
    localStorage.setItem(key, JSON.stringify(arr));

    alert('Preset salvo.');
    loadPresets();
}

function loadPresets() {
    const list = document.getElementById('presetList');
    if (!list) return;
    const uname = (loggedUser && loggedUser.username) ? loggedUser.username : 'local';
    const key = `presets_${uname}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');

    if (arr.length === 0) { list.innerHTML = '<span style="color:#888">Nenhum preset salvo.</span>'; return; }

    list.innerHTML = arr.map(p => `
        <span style="display:inline-block; background:#fff; border:1px solid #ddd; padding:2px 8px; border-radius:12px; margin-right:5px; font-size:0.85rem;">
            ${p.name} 
            <i class="fas fa-play-circle" style="cursor:pointer; color:green; margin-left:5px;" onclick='applyPreset(${JSON.stringify(p.filters)})' title="Aplicar"></i>
            <i class="fas fa-times-circle" style="cursor:pointer; color:red; margin-left:5px;" onclick="deletePreset('${p.id}')" title="Excluir"></i>
        </span>
    `).join('');
}

function deletePreset(id) {
    const uname = (loggedUser && loggedUser.username) ? loggedUser.username : 'local';
    const key = `presets_${uname}`;
    let arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr = arr.filter(p => p.id !== id);
    localStorage.setItem(key, JSON.stringify(arr));
    loadPresets();
}

function applyPreset(f) {
    if (f.from) document.getElementById('dashFrom').value = f.from;
    if (f.to) document.getElementById('dashTo').value = f.to;
    document.getElementById('dashProduct').value = f.product || '';
    document.getElementById('dashPlate').value = f.plate || '';
    document.getElementById('dashSector').value = f.sector || '';
}

function updatePermissionStatus() { loadPresets(); }

function addNewUser() {
    const u = document.getElementById('newUsername').value;
    const p = document.getElementById('newPassword').value;
    const r = document.getElementById('newRole').value;
    const sRaw = document.getElementById('newSector').value;

    if (!u || !p) return alert("Preencha usuário e senha.");
    if (usersData.find(x => x.username.toLowerCase() === u.toLowerCase())) return alert("Usuário já existe.");

    let sector = 'recebimento';
    let subType = null;
    if (sRaw === 'recebimento') { sector = 'recebimento'; }
    else if (sRaw === 'conferente') { sector = 'conferente'; subType = null; }
    else { sector = 'conferente'; subType = sRaw; }

    usersData.push({ username: u, password: p, role: r, sector: sector, subType: subType });
    saveAll();
    renderUserList();
    document.getElementById('newUsername').value = ''; document.getElementById('newPassword').value = ''; alert("Usuário criado.");
}

function removeUser(username) {
    if (confirm(`Remover usuário "${username}"?`)) {
        usersData = usersData.filter(x => x.username !== username);
        saveAll();
        renderUserList();
    }
}

function modalTruckOpen() {
    entryState = { selectedSupplierId: null, selectedCarrierId: null, selectedDriverId: null, selectedPlateId: null };
    tmpItems = [];
    document.getElementById('tmpList').innerHTML = '';

    ['inForn', 'inTransp', 'inMot', 'inPlaca', 'tmpProd', 'tmpNF'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.classList.remove('input-warning'); }
    });

    document.getElementById('addDestino').value = 'DOCA';
    document.getElementById('chkBalan').checked = false;
    document.getElementById('chkLaudo').checked = false;

    const chkCarrier = document.getElementById('chkUseCarrier');
    chkCarrier.checked = false;
    toggleCarrierInput();

    document.getElementById('entryWarningBox').style.display = 'none';
    document.getElementById('btnSaveTruck').style.display = 'inline-block';
    document.getElementById('btnReqTruck').style.display = 'none';

    populateDatalist('dlForn', suppliersData);
    populateDatalist('dlTransp', []);
    populateDatalist('dlMot', driversData);
    populateDatalist('dlPlaca', []);
    populateDatalist('prodListSuggestions', productsData);

    document.getElementById('modalTruck').style.display = 'flex';
}

function openProdSelect() {
    const l = document.getElementById('prodList'); l.innerHTML = '';
    defaultProducts.forEach(p => { l.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="selectProd('${p}')">${p}</div>`; });
    document.getElementById('modalProductSelect').style.display = 'flex';
    const s = document.getElementById('prodSearch'); s.value = ''; s.focus();
}

function filterProducts() {
    const t = document.getElementById('prodSearch').value.toUpperCase(); const l = document.getElementById('prodList'); l.innerHTML = '';
    defaultProducts.filter(p => p.includes(t)).forEach(p => { l.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="selectProd('${p}')">${p}</div>`; });
}

function selectProd(name) {
    if (isEditingMode) document.getElementById('editTmpProd').value = name; else document.getElementById('tmpProd').value = name;
    document.getElementById('modalProductSelect').style.display = 'none'; isEditingMode = false;
}

function addTmpItem() {
    const nf = document.getElementById('tmpNF').value;
    const prodVal = document.getElementById('tmpProd').value.toUpperCase();

    if (prodVal) {
        const exists = productsData.find(p => p.nome === prodVal);
        const isNew = !exists;

        tmpItems.push({ nf: nf || 'S/N', prod: prodVal, isNew: isNew });

        const newBadge = isNew ? '<span style="background:#f59e0b; color:white; font-size:0.7rem; padding:1px 4px; border-radius:4px; margin-left:5px;">NOVO</span>' : '';

        document.getElementById('tmpList').innerHTML += `<li><b>${nf || 'S/N'}</b>: ${prodVal} ${newBadge}</li>`;

        document.getElementById('tmpProd').value = '';
        document.getElementById('tmpNF').value = '';
        document.getElementById('tmpProd').classList.remove('input-warning');
        document.getElementById('tmpProd').focus();

        evaluateRequestNecessity(); // Verifica se precisa mudar o botão
    }
}


function saveTruckAndMap() {
    const placaVal = document.getElementById('inPlaca').value;
    if (!placaVal) return alert("A Placa é obrigatória.");
    if (tmpItems.length === 0 && document.getElementById('tmpProd').value) addTmpItem();
    if (tmpItems.length === 0) return alert("Adicione pelo menos um produto.");

    const dest = document.getElementById('addDestino').value;
    const useCarrier = document.getElementById('chkUseCarrier').checked;
    const transpVal = useCarrier ? document.getElementById('inTransp').value.toUpperCase() : '';

    const laudo = document.getElementById('chkLaudo').checked;
    const balan = document.getElementById('chkBalan').checked;

    const secMap = { 'DOCA': { n: 'DOCA (ALM)', c: 'ALM' }, 'GAVA': { n: 'GAVA', c: 'GAVA' }, 'MANUTENCAO': { n: 'MANUTENÇÃO', c: 'OUT' }, 'INFRA': { n: 'INFRAESTRUTURA', c: 'OUT' }, 'PESAGEM': { n: 'SALA DE PESAGEM', c: 'OUT' }, 'LAB': { n: 'LABORATÓRIO', c: 'OUT' }, 'SST': { n: 'SST', c: 'OUT' }, 'CD': { n: 'CD', c: 'OUT' }, 'OUT': { n: 'OUTROS', c: 'OUT' }, 'COMPRAS': { n: 'COMPRAS', c: 'OUT' } };
    const sec = secMap[dest] || { n: 'OUTROS', c: 'OUT' };
    const id = Date.now().toString();
    const todayStr = getBrazilTime().split('T')[0];
    const dailyCount = patioData.filter(t => (t.chegada || '').startsWith(todayStr)).length;
    const seq = dailyCount + 1;

    let fornName = '';
    if (entryState.selectedSupplierId) {
        const s = suppliersData.find(x => x.id === entryState.selectedSupplierId);
        fornName = s ? s.nome : '';
    } else {
        fornName = document.getElementById('inForn').value.toUpperCase();
    }

    const displayCompany = transpVal || fornName;

    patioData.push({
        id,
        empresa: displayCompany,
        supplierId: entryState.selectedSupplierId,
        carrierId: useCarrier ? entryState.selectedCarrierId : null,
        driverId: entryState.selectedDriverId,
        plateId: entryState.selectedPlateId,
        placa: placaVal,
        local: sec.c,
        localSpec: sec.n,
        status: 'FILA',
        sequencia: seq,
        recebimentoNotified: false,
        saidaNotified: false,
        comLaudo: laudo, // Salva o boolean
        releasedBy: null,
        chegada: getBrazilTime(),
        saida: null,
        isProvisory: false,
        cargas: [{ numero: '1', produtos: tmpItems.map(i => ({ nome: i.prod, qtd: '-', nf: i.nf })) }]
    });

    const mapRows = tmpItems.map((item, idx) => ({ id: id + '_' + idx, desc: item.prod, qty: '', qty_nf: '', nf: item.nf, forn: fornName, owners: {} }));
    for (let i = mapRows.length; i < 8; i++) mapRows.push({ id: id + '_x_' + i, desc: '', qty: '', qty_nf: '', nf: '', forn: '', owners: {} });

    mapData.push({ id, date: todayStr, rows: mapRows, placa: placaVal, setor: sec.n, launched: false, signatures: {}, forceUnlock: false, divergence: null });

    if (balan) {
        mpData.push({ id, date: todayStr, produto: tmpItems[0].prod, empresa: fornName, placa: placaVal, local: sec.n, chegada: getBrazilTime(), entrada: null, tara: 0, bruto: 0, liq: 0, pesoNF: 0, difKg: 0, difPerc: 0, nf: tmpItems[0].nf, notes: '' });
    }

    saveAll();
    document.getElementById('modalTruck').style.display = 'none';
    renderPatio();
    tmpItems = [];
    alert(`Veículo #${seq} registrado!`);
}

function submitComplexRequest() {
    const inForn = document.getElementById('inForn').value.toUpperCase();
    const useCarrier = document.getElementById('chkUseCarrier').checked;
    const inTransp = useCarrier ? document.getElementById('inTransp').value.toUpperCase() : '';
    const inMot = document.getElementById('inMot').value.toUpperCase();
    const inPlaca = document.getElementById('inPlaca').value.toUpperCase();

    if (document.getElementById('tmpProd').value) addTmpItem();
    if (tmpItems.length === 0) return alert("Adicione produto.");

    const reqId = 'REQ_' + Date.now();
    const id = Date.now().toString();
    const todayStr = getBrazilTime().split('T')[0];
    const newProducts = [...new Set(tmpItems.filter(i => i.isNew).map(i => i.prod))];

    requests.push({
        id: reqId,
        type: 'complex_entry',
        status: 'PENDENTE',
        user: (typeof loggedUser !== 'undefined' ? loggedUser.username : 'Portaria'),
        timestamp: getBrazilTime(),
        data: {
            supplier: { name: inForn, id: entryState.selectedSupplierId },
            carrier: { name: inTransp, id: entryState.selectedCarrierId },
            driver: { name: inMot, id: entryState.selectedDriverId },
            plate: { number: inPlaca, id: entryState.selectedPlateId },
            newProducts: newProducts
        }
    });

    sendSystemNotification("Nova Requisição", "Entrada pendente.", "cadastros");

    const visualForn = inForn || "Fornecedor Pendente";
    const visualEmpresa = inTransp || visualForn;

    const dest = document.getElementById('addDestino').value;
    const secMap = { 'DOCA': { n: 'DOCA (ALM)', c: 'ALM' }, 'GAVA': { n: 'GAVA', c: 'GAVA' }, 'MANUTENCAO': { n: 'MANUTENÇÃO', c: 'OUT' } }; // ...resto
    const sec = secMap[dest] || { n: 'OUTROS', c: 'OUT' };
    const seq = patioData.filter(t => (t.chegada || '').startsWith(todayStr)).length + 1;

    patioData.push({
        id: id,
        empresa: visualEmpresa,
        supplierId: entryState.selectedSupplierId,
        carrierId: useCarrier ? entryState.selectedCarrierId : null,
        driverId: entryState.selectedDriverId,
        plateId: entryState.selectedPlateId,
        placa: inPlaca,
        local: sec.c,
        localSpec: sec.n,
        status: 'FILA',
        sequencia: seq,
        chegada: getBrazilTime(),
        isProvisory: true,
        linkedRequestId: reqId,
        cargas: [{ numero: '1', produtos: tmpItems.map(i => ({ nome: i.prod, qtd: '-', nf: i.nf })) }]
    });

    const mapRows = tmpItems.map((item, idx) => ({ id: id + '_' + idx, desc: item.prod, qty: '', nf: item.nf, forn: visualForn, owners: {} }));
    for (let i = mapRows.length; i < 8; i++) mapRows.push({ id: id + '_x_' + i, desc: '', qty: '', nf: '', forn: '', owners: {} });
    mapData.push({ id, date: todayStr, rows: mapRows, placa: inPlaca, setor: sec.n, launched: false, signatures: {}, forceUnlock: false, divergence: null });

    if (document.getElementById('chkBalan').checked) {
        mpData.push({ id, date: todayStr, produto: tmpItems[0].prod, empresa: visualForn, placa: inPlaca, local: sec.n, chegada: getBrazilTime(), tara: 0, bruto: 0, liq: 0, pesoNF: 0, difKg: 0, difPerc: 0, nf: tmpItems[0].nf, notes: 'Cadastro Pendente' });
    }

    saveAll();
    document.getElementById('modalTruck').style.display = 'none';
    renderPatio();
    tmpItems = [];
    alert("Entrada liberada PROVISORIAMENTE.");
}
function openUnifiedApprovalModal(reqId) {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    document.getElementById('appReqId').value = reqId;
    const container = document.getElementById('approvalContainer');
    container.innerHTML = '';
    const d = req.data;

    if (!d.supplier.id && d.supplier.name) {
        container.innerHTML += `
            <div class="approval-section">
                <div class="badge-new-tag">Novo Fornecedor</div>
                <h4><i class="fas fa-building"></i> Dados do Fornecedor</h4>
                <div class="form-full">
                    <label class="form-label">Razão Social</label>
                    <input id="appSupName" class="form-input-styled highlight-req" value="${d.supplier.name}">
                </div>
                <div class="form-grid" style="margin-top:10px;">
                    <div><label class="form-label">Nome Fantasia</label><input id="appSupNick" class="form-input-styled"></div>
                    <div><label class="form-label">CNPJ</label><input id="appSupDoc" class="form-input-styled"></div>
                </div>
            </div>`;
    }

    if (!d.carrier.id && d.carrier.name) {
        container.innerHTML += `
            <div class="approval-section">
                <div class="badge-new-tag">Nova Transportadora</div>
                <h4><i class="fas fa-truck"></i> Dados da Transportadora</h4>
                <div class="form-full">
                    <label class="form-label">Razão Social</label>
                    <input id="appCarrName" class="form-input-styled highlight-req" value="${d.carrier.name}">
                </div>
                <div class="form-grid" style="margin-top:10px;">
                    <div><label class="form-label">Nome Fantasia</label><input id="appCarrNick" class="form-input-styled"></div>
                    <div><label class="form-label">CNPJ</label><input id="appCarrDoc" class="form-input-styled"></div>
                </div>
            </div>`;
    }

    if (!d.driver.id && d.driver.name) {
        container.innerHTML += `
            <div class="approval-section">
                <div class="badge-new-tag">Novo Motorista</div>
                <h4><i class="fas fa-user"></i> Dados do Motorista</h4>
                <div class="form-grid">
                    <div><label class="form-label">Nome Completo</label><input id="appDrivName" class="form-input-styled highlight-req" value="${d.driver.name}"></div>
                    <div><label class="form-label">CPF/CNH</label><input id="appDrivDoc" class="form-input-styled"></div>
                </div>
            </div>`;
    }

    if (!d.plate.id && d.plate.number) {
        container.innerHTML += `
            <div class="approval-section">
                <div class="badge-new-tag">Nova Placa</div>
                <h4><i class="fas fa-id-card"></i> Dados do Veículo</h4>
                <div class="form-full">
                    <label class="form-label">Número da Placa</label>
                    <input id="appPlateNum" class="form-input-styled highlight-req" value="${d.plate.number}">
                </div>
            </div>`;
    }

    if (d.newProducts && d.newProducts.length > 0) {
        let prodHtml = '';
        d.newProducts.forEach((prod, idx) => {
            prodHtml += `
                <div class="approval-prod-item">
                    <div>
                        <label class="form-label">Nome do Produto</label>
                        <input id="appProdName_${idx}" class="form-input-styled highlight-req" value="${prod}">
                    </div>
                    <div>
                        <label class="form-label">Código (Opcional)</label>
                        <input id="appProdCode_${idx}" class="form-input-styled">
                    </div>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="approval-section">
                <div class="badge-new-tag">${d.newProducts.length} Produtos Novos</div>
                <h4><i class="fas fa-box"></i> Cadastro de Produtos</h4>
                ${prodHtml}
            </div>`;
    }

    if (container.innerHTML === '') {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Nenhum dado novo para cadastrar. Apenas vínculos serão criados.</p>';
    }

    document.getElementById('modalUnifiedApproval').style.display = 'flex';
}
function confirmUnifiedApproval() {
    const reqId = document.getElementById('appReqId').value;
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const d = req.data;

    let supId = d.supplier.id;
    if (!supId && d.supplier.name) {
        const name = document.getElementById('appSupName').value.toUpperCase();
        const nick = document.getElementById('appSupNick').value.toUpperCase();
        const doc = document.getElementById('appSupDoc').value;
        supId = Date.now().toString();
        suppliersData.push({ id: supId, nome: name, apelido: nick, cnpj: doc });
    }

    let carId = d.carrier.id;
    if (!carId && d.carrier.name) {
        const name = document.getElementById('appCarrName').value.toUpperCase();
        const nick = document.getElementById('appCarrNick').value.toUpperCase();
        const doc = document.getElementById('appCarrDoc').value;
        carId = (Date.now() + 1).toString();
        carriersData.push({ id: carId, nome: name, apelido: nick, cnpj: doc, supplierIds: [supId] });
    } else if (carId && supId) {
        const c = carriersData.find(x => x.id === carId);
        if (c && !c.supplierIds.includes(supId)) c.supplierIds.push(supId);
    }

    let drivId = d.driver.id;
    if (!drivId && d.driver.name) {
        const name = document.getElementById('appDrivName').value.toUpperCase();
        const doc = document.getElementById('appDrivDoc').value;
        drivId = (Date.now() + 2).toString();
        driversData.push({ id: drivId, nome: name, doc: doc, carrierIds: [carId] });
    } else if (drivId && carId) {
        const dr = driversData.find(x => x.id === drivId);
        if (dr && !dr.carrierIds.includes(carId)) dr.carrierIds.push(carId);
    }

    let plateId = d.plate.id;
    if (!plateId && d.plate.number) {
        const num = document.getElementById('appPlateNum').value.toUpperCase();
        plateId = (Date.now() + 3).toString();
        platesData.push({ id: plateId, numero: num, driverId: drivId });
    }

    if (d.newProducts && d.newProducts.length > 0) {
        d.newProducts.forEach((_, idx) => {
            const name = document.getElementById(`appProdName_${idx}`).value.toUpperCase();
            const code = document.getElementById(`appProdCode_${idx}`).value;
            if (!productsData.find(p => p.nome === name)) {
                productsData.push({ id: Date.now() + idx + 10, nome: name, codigo: code });
            }
        });
    }

    const truck = patioData.find(t => t.linkedRequestId === reqId);
    if (truck) {
        truck.isProvisory = false;
        truck.supplierId = supId;
        truck.carrierId = carId;
        truck.driverId = drivId;
        truck.plateId = plateId;
        if (!d.carrier.id) truck.empresa = document.getElementById('appCarrNick').value || document.getElementById('appCarrName').value;
        if (!d.plate.id) truck.placa = document.getElementById('appPlateNum').value;
    }

    req.status = 'APROVADO';
    saveAll();
    renderCadastros();
    document.getElementById('modalUnifiedApproval').style.display = 'none';
    alert("Tudo aprovado e cadastrado com sucesso!");
}

function rejectUnifiedRequest() {
    const reqId = document.getElementById('appReqId').value;
    if (!confirm("Tem certeza que deseja rejeitar? O caminhão continuará como provisório/pendente.")) return;

    const req = requests.find(r => r.id === reqId);
    if (req) req.status = 'REJEITADO';

    saveAll();
    renderCadastros();
    document.getElementById('modalUnifiedApproval').style.display = 'none';
}


function openCadSelectModal() {
    document.getElementById('modalCadSelect').style.display = 'flex';
}
function checkProductInput() {
    const el = document.getElementById('tmpProd');
    const val = el.value.toUpperCase();

    if (document.getElementById('prodListSuggestions').options.length === 0) {
        const dl = document.getElementById('prodListSuggestions');
        dl.innerHTML = '';
        productsData.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nome;
            dl.appendChild(opt);
        });
    }

    const exists = productsData.find(p => p.nome === val);
    if (val.length > 0 && !exists) {
        el.classList.add('input-warning');
    } else {
        el.classList.remove('input-warning');
    }

    evaluateRequestNecessity();
}
// --- LÓGICA DE CADASTROS (CRUD) ---
function evaluateRequestNecessity() {
    const inForn = document.getElementById('inForn');
    const inTransp = document.getElementById('inTransp');
    const inMot = document.getElementById('inMot');
    const inPlaca = document.getElementById('inPlaca');
    const useCarrier = document.getElementById('chkUseCarrier').checked;

    const isNewForn = inForn.value && !entryState.selectedSupplierId;

    // Só considera transportadora nova se a caixa estiver marcada
    const isNewTransp = useCarrier && inTransp.value && !entryState.selectedCarrierId;

    const isNewMot = inMot.value && !entryState.selectedDriverId;
    const isNewPlaca = inPlaca.value && !entryState.selectedPlateId;
    const hasNewProd = tmpItems.some(i => i.isNew);

    const btnSave = document.getElementById('btnSaveTruck');
    const btnReq = document.getElementById('btnReqTruck');
    const warnBox = document.getElementById('entryWarningBox');

    if (isNewForn || isNewTransp || isNewMot || isNewPlaca || hasNewProd) {
        if (warnBox) warnBox.style.display = 'block';
        if (btnSave) btnSave.style.display = 'none';
        if (btnReq) btnReq.style.display = 'inline-block';
    } else {
        if (warnBox) warnBox.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
        if (btnReq) btnReq.style.display = 'none';
    }
}
function openCadModal(type, editId = null) {
    document.getElementById('modalCadSelect').style.display = 'none';
    const modal = document.getElementById('modalCadForm');
    modal.style.display = 'flex';

    document.getElementById('cadFormType').value = type;
    document.getElementById('cadFormId').value = editId || '';

    const titleEl = document.getElementById('cadFormTitle');
    const fields = document.getElementById('cadFormFields');
    fields.innerHTML = '';

    const titles = {
        fornecedor: 'Fornecedor',
        transportadora: 'Transportadora',
        motorista: 'Motorista',
        placa: 'Veículo/Placa',
        produto: 'Produto'
    };
    const actionText = editId ? 'Editar' : 'Novo';
    titleEl.innerHTML = `<i class="fas fa-pen-square" style="color:var(--primary)"></i> ${actionText} ${titles[type] || 'Cadastro'}`;

    if (type === 'fornecedor') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-building"></i> Razão Social</label>
                <input id="cadName" class="form-input-styled" placeholder="Nome Oficial">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-tag"></i> Nome Fantasia / Apelido</label>
                <input id="cadNick" class="form-input-styled" placeholder="Nome curto">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-id-card"></i> CNPJ</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="00.000.000/0000-00" oninput="this.value = Validators.cleanNumber(this.value)">
            </div>
        `;
    }
    else if (type === 'transportadora') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-truck"></i> Razão Social</label>
                <input id="cadName" class="form-input-styled" placeholder="Transportadora LTDA">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-tag"></i> Nome Fantasia</label>
                <input id="cadNick" class="form-input-styled" placeholder="Apelido">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-id-card"></i> CNPJ</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="00.000.000/0000-00" oninput="this.value = Validators.cleanNumber(this.value)">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-link"></i> Fornecedores Vinculados (Segure Ctrl)</label>
                <select id="cadLinks" multiple class="form-input-styled" style="height:100px;"></select>
            </div>
        `;
        // Preenche APÓS inserir o HTML
        setTimeout(() => populateSelect('cadLinks', suppliersData, 'nome'), 50);
    }
    else if (type === 'motorista') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-user"></i> Nome Completo</label>
                <input id="cadName" class="form-input-styled" placeholder="Ex: JOAO DA SILVA">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-id-card"></i> CPF / CNH</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="Apenas números" oninput="this.value = Validators.cleanNumber(this.value)">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-truck-loading"></i> Transportadora Principal</label>
                <select id="cadLinks" class="form-input-styled">
                    <option value="">-- Selecione --</option>
                </select>
            </div>
        `;
        setTimeout(() => populateSelect('cadLinks', carriersData, 'apelido'), 50);
    }
    else if (type === 'placa') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-car"></i> Placa do Veículo</label>
                <input id="cadName" class="form-input-styled input-fit-content" maxlength="8" placeholder="ABC-1234"
                oninput="let t=this.value.toUpperCase().replace(/[^A-Z0-9]/g,''); if(t.length>3 && !t.includes('-')) t=t.substring(0,3)+'-'+t.substring(3); this.value=t;">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-user-tie"></i> Motorista Responsável</label>
                <select id="cadLinks" class="form-input-styled">
                    <option value="">-- Selecione --</option>
                </select>
            </div>
        `;
        setTimeout(() => populateSelect('cadLinks', driversData, 'nome'), 50);
    }
    else if (type === 'produto') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-box"></i> Nome do Produto</label>
                <input id="cadName" class="form-input-styled" placeholder="Ex: AÇUCAR CRISTAL">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-barcode"></i> Código / SKU (Opcional)</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="Ex: 102030">
            </div>
        `;
    }

    if (editId) {
        setTimeout(() => { // Timeout para garantir que o HTML renderizou e os selects populou
            let item = null;
            if (type === 'fornecedor') item = suppliersData.find(x => x.id === editId);
            else if (type === 'transportadora') item = carriersData.find(x => x.id === editId);
            else if (type === 'motorista') item = driversData.find(x => x.id === editId);
            else if (type === 'placa') item = platesData.find(x => x.id === editId);
            else if (type === 'produto') item = productsData.find(x => x.id === editId);

            if (item) {
                if (document.getElementById('cadName')) document.getElementById('cadName').value = item.nome || item.numero || '';
                if (document.getElementById('cadNick')) document.getElementById('cadNick').value = item.apelido || '';
                if (document.getElementById('cadDoc')) document.getElementById('cadDoc').value = item.cnpj || item.doc || item.codigo || '';

                const linkSelect = document.getElementById('cadLinks');
                if (linkSelect) {
                    if (type === 'transportadora' && item.supplierIds) {
                        Array.from(linkSelect.options).forEach(opt => {
                            if (item.supplierIds.includes(opt.value)) opt.selected = true;
                        });
                    } else if (type === 'motorista' && item.carrierIds) {
                        linkSelect.value = item.carrierIds[0] || '';
                    } else if (type === 'placa') {
                        linkSelect.value = item.driverId || '';
                    }
                }
            }
        }, 100);
    }
}

function populateSelect(elId, data, displayField) {
    const sel = document.getElementById(elId);
    if (!sel) return;

    // Mantém a opção padrão se existir
    const defaultOpt = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (defaultOpt) sel.appendChild(defaultOpt);

    if (!data || data.length === 0) {
        const opt = document.createElement('option');
        opt.innerText = "Nenhum cadastro disponível";
        sel.appendChild(opt);
        return;
    }

    data.forEach(item => {
        const val = item[displayField] || item.nome;
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = val;
        sel.appendChild(opt);
    });
}

function saveOfficialCadastro() {
    const type = document.getElementById('cadFormType').value;
    const idField = document.getElementById('cadFormId').value;
    const nameInput = document.getElementById('cadName').value;

    if (!nameInput || nameInput.trim() === '') return alert("Campo obrigatório vazio!");

    const name = nameInput.toUpperCase().trim();
    const id = idField || Date.now().toString();
    const isEdit = !!idField;

    const updateList = (list, newItem) => {
        if (isEdit) {
            const idx = list.findIndex(x => x.id === id);
            if (idx > -1) list[idx] = { ...list[idx], ...newItem };
        } else {
            list.push({ id, ...newItem });
        }
    };

    if (type === 'fornecedor') {
        updateList(suppliersData, {
            nome: name,
            apelido: document.getElementById('cadNick').value.toUpperCase().trim(), // Novo campo
            cnpj: document.getElementById('cadDoc').value // Novo campo
        });
    }
    else if (type === 'transportadora') {
        const links = Array.from(document.getElementById('cadLinks').selectedOptions).map(o => o.value);
        updateList(carriersData, {
            nome: name,
            apelido: document.getElementById('cadNick').value.toUpperCase().trim(),
            cnpj: document.getElementById('cadDoc').value,
            supplierIds: links
        });
    }
    else if (type === 'motorista') {
        const link = document.getElementById('cadLinks').value;
        updateList(driversData, {
            nome: name,
            doc: document.getElementById('cadDoc').value,
            carrierIds: [link]
        });
    }
    else if (type === 'placa') {
        const formattedPlate = Validators.validatePlate(name);
        if (!formattedPlate) return;
        const link = document.getElementById('cadLinks').value;
        updateList(platesData, {
            numero: formattedPlate,
            driverId: link
        });
    }
    else if (type === 'produto') {
        updateList(productsData, {
            nome: name,
            codigo: document.getElementById('cadDoc').value
        });
    }

    saveAll();
    document.getElementById('modalCadForm').style.display = 'none';
    renderCadastros();
}

function renderCadastros() {
    const type = document.getElementById('cadFilterType').value;
    const term = document.getElementById('cadSearch').value.toUpperCase();
    const thead = document.getElementById('cadTableHead');
    const tbody = document.getElementById('cadTableBody');
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (type === 'requests') {
        thead.innerHTML = `<tr><th>Data</th><th>Detalhes da Requisição</th><th style="text-align:right">Ação</th></tr>`;
        renderRequestsTable(term);
        return;
    }

    let list = [];
    let cols = '';

    // Define cabeçalhos baseados no tipo
    if (type === 'fornecedor') {
        cols = `<tr><th>Fornecedor</th><th style="text-align:right">Ações</th></tr>`;
        list = suppliersData;
    }
    else if (type === 'transportadora') {
        cols = `<tr><th>Transportadora (Apelido / Razão Social)</th><th>CNPJ</th><th>Vínculos</th><th style="text-align:right">Ações</th></tr>`;
        list = carriersData;
    }
    else if (type === 'motorista') {
        cols = `<tr><th>Nome</th><th>Documento</th><th>Transportadora</th><th style="text-align:right">Ações</th></tr>`;
        list = driversData;
    }
    else if (type === 'placa') {
        cols = `<tr><th>Placa</th><th>Motorista Responsável</th><th style="text-align:right">Ações</th></tr>`;
        list = platesData;
    }
    else if (type === 'produto') {
        cols = `<tr><th>Produto</th><th>Código</th><th style="text-align:right">Ações</th></tr>`;
        list = productsData;
    }
    thead.innerHTML = cols;

    // Filtragem e Renderização
    const filtered = list.filter(i => (i.nome || i.numero || '').toUpperCase().includes(term));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999; padding:20px;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        let html = '';
        const actions = `
            <button class="action-btn edit" onclick="openCadModal('${type}', '${item.id}')" title="Editar">
                <i class="fas fa-pen"></i>
            </button>
            <button class="action-btn delete" onclick="deleteCadastro('${type}', '${item.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        `;

        if (type === 'fornecedor') {
            html = `<td><b>${item.nome}</b></td><td>${actions}</td>`;
        }
        else if (type === 'transportadora') {
            const incomplete = !item.cnpj ? '<span class="tag-incomplete" title="Falta CNPJ">!</span>' : '';
            const count = item.supplierIds ? item.supplierIds.length : 0;
            html = `
                <td>
                    <div style="font-weight:600; color:#1e293b;">${item.apelido || item.nome} ${incomplete}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${item.nome}</div>
                </td>
                <td class="font-mono text-sm">${item.cnpj || '-'}</td>
                <td><span class="badge-link">${count} Fornecedores</span></td>
                <td>${actions}</td>`;
        }
        else if (type === 'motorista') {
            // Busca nome da transportadora vinculada para exibir
            let transpName = '-';
            if (item.carrierIds && item.carrierIds.length > 0) {
                const c = carriersData.find(x => x.id === item.carrierIds[0]);
                if (c) transpName = c.apelido || c.nome;
            }
            html = `<td><b>${item.nome}</b></td><td>${item.doc || '-'}</td><td>${transpName}</td><td>${actions}</td>`;
        }
        else if (type === 'placa') {
            const driver = driversData.find(d => d.id === item.driverId);
            html = `<td><span class="badge-code" style="font-size:1rem; font-weight:bold;">${item.numero}</span></td><td>${driver ? driver.nome : '<span style="color:#ccc">Sem motorista</span>'}</td><td>${actions}</td>`;
        }
        else if (type === 'produto') {
            html = `<td><b>${item.nome}</b></td><td><span class="badge-code">${item.codigo || 'S/C'}</span></td><td>${actions}</td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}


function renderRequestsTable(term) {
    const tbody = document.getElementById('cadTableBody');
    // Filtra requisições de entrada complexa pendentes
    requests.filter(r => r.status === 'PENDENTE' && r.type === 'complex_entry').forEach(r => {
        const d = r.data;
        let novos = [];
        if (!d.supplier.id) novos.push(`Fornecedor`);
        if (!d.carrier.id) novos.push(`Transp`);
        if (!d.driver.id) novos.push(`Mot`);
        if (!d.plate.id) novos.push(`Placa`);
        if (d.newProducts && d.newProducts.length > 0) novos.push(`${d.newProducts.length} Prod(s)`);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(r.timestamp).toLocaleString()}</td>
            <td>
                <b>Cadastros Pendentes:</b> <span style="color:#d97706">${novos.join(', ')}</span>
                <br><small>Solicitado por: ${r.user}</small>
            </td>
            <td style="text-align:right">
                <button class="btn btn-save btn-small" onclick="openUnifiedApprovalModal('${r.id}')">
                    <i class="fas fa-search"></i> Analisar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function approveComplexRequest(reqId) {
    const req = requests.find(x => x.id === reqId);
    if (!req) return;
    const d = req.data;

    let supId = d.supplier.id;
    if (!supId) { supId = Date.now().toString(); suppliersData.push({ id: supId, nome: d.supplier.name }); }

    let carId = d.carrier.id;
    if (!carId) { carId = (Date.now() + 1).toString(); carriersData.push({ id: carId, nome: d.carrier.name, apelido: d.carrier.name, supplierIds: [supId] }); }
    else { const c = carriersData.find(x => x.id === carId); if (c && !c.supplierIds.includes(supId)) c.supplierIds.push(supId); }

    let drivId = d.driver.id;
    if (!drivId) { drivId = (Date.now() + 2).toString(); driversData.push({ id: drivId, nome: d.driver.name, carrierIds: [carId] }); }

    let plateId = d.plate.id;
    if (!plateId) { plateId = (Date.now() + 3).toString(); platesData.push({ id: plateId, numero: d.plate.number, driverId: drivId }); }

    const truck = patioData.find(t => t.linkedRequestId === reqId);
    if (truck) {
        truck.isProvisory = false;
        truck.supplierId = supId; truck.carrierId = carId; truck.driverId = drivId; truck.plateId = plateId;
    }

    req.status = 'APROVADO';
    saveAll(); renderCadastros(); alert("Dados cadastrados e vinculados com sucesso!");
}


// Menu de Contexto (Direito)
function openCtxMenuCad(x, y, id, type) {
    contextCadId = id;
    const menu = document.getElementById('ctxMenuCad');
    menu.innerHTML = `
        <div class="ctx-item" onclick="openCadModal('${type}', '${id}')"><i class="fas fa-edit"></i> Editar</div>
        <div class="ctx-item" style="color:red" onclick="deleteCadastro('${type}')"><i class="fas fa-trash"></i> Excluir</div>
    `;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

function deleteCadastro(type, id) {
    if (!confirm("Tem certeza que deseja excluir este registro?\nIsso pode afetar históricos antigos.")) return;

    if (type === 'fornecedor') suppliersData = suppliersData.filter(x => x.id !== id);
    else if (type === 'transportadora') carriersData = carriersData.filter(x => x.id !== id);
    else if (type === 'motorista') driversData = driversData.filter(x => x.id !== id);
    else if (type === 'placa') platesData = platesData.filter(x => x.id !== id);
    else if (type === 'produto') productsData = productsData.filter(x => x.id !== id);

    saveAll();
    renderCadastros();
}

// =========================================================
// MÓDULO DE CADASTROS E REQUISIÇÕES (Fora da saveTruckAndMap)
// =========================================================




// Confirma a criação da requisição manual

function renderRegistrationRequests() {
    const list = document.getElementById('requestsList');
    list.innerHTML = '';

    // Filtra requisições de cadastro pendentes
    const pending = requests.filter(r => r.status === 'PENDENTE' && r.type.startsWith('cadastro_'));

    document.getElementById('badgeReq').innerText = pending.length;
    document.getElementById('badgeReq').style.display = pending.length > 0 ? 'inline-block' : 'none';

    if (pending.length === 0) {
        list.innerHTML = '<p class="text-muted">Nenhuma requisição de cadastro pendente.</p>';
        return;
    }

    pending.forEach(r => {
        const item = document.createElement('div');
        item.className = 'settings-card'; // Reutilizando estilo de card
        item.style.borderLeft = '4px solid orange';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0">Requisição: Nova ${r.type.split('_')[1].toUpperCase()}</h4>
                    <p style="margin:5px 0">Nome Provisório: <b>${r.data.nome}</b></p>
                    <small>Solicitado por: ${r.user} em ${new Date(r.timestamp).toLocaleString()}</small>
                </div>
                <button class="btn btn-save" onclick="openApprovalModal('${r.id}')">ANALISAR & CADASTRAR</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Quando o ADM clica em ANALISAR
function openApprovalModal(reqId) {
    const req = requests.find(r => r.id === reqId);
    // Abre um modal preenchido com o dado provisório, mas pedindo o resto
    const type = req.type.split('_')[1]; // 'empresa', 'motorista', etc
    openCadModal(type);

    // Preenche com o dado provisório
    document.getElementById('cadName').value = req.data.nome;

    // Altera o comportamento do botão "Salvar" para "Aprovar Requisição"
    const btn = document.querySelector('#modalCadForm .btn-save');
    btn.onclick = function () { approveRequest(reqId, { nome: document.getElementById('cadName').value.toUpperCase(), cnpj: document.getElementById('cadDoc').value }); };
    btn.innerText = "Aprovar e Atualizar Sistema";
}



function renderPatio() {
    const filterEl = document.getElementById('patioDateFilter');
    const fd = filterEl ? filterEl.value : getBrazilTime().split('T')[0];

    // LIMPEZA CRÍTICA PARA NÃO DUPLICAR
    ['ALM', 'GAVA', 'OUT', 'SAIU'].forEach(c => {
        const list = document.getElementById('list-' + c);
        if (list) list.innerHTML = ''; // Limpa a coluna
        const count = document.getElementById('count-' + c);
        if (count && c !== 'SAIU') count.textContent = '0';
    });

// Atualiza Badge (Considerando apenas o dia selecionado)
const badge = document.getElementById('totalTrucksBadge');
if (badge) {
    const dailyActiveCount = patioData.filter(x => x.status !== 'SAIU' && (x.chegada || '').startsWith(fd)).length;
    badge.innerText = dailyActiveCount;
}
    // Filtra e Ordena
    const list = patioData.filter(c => {
        if (c.status === 'SAIU') return (c.saida || '').startsWith(fd);
        return (c.chegada || '').split('T')[0] === fd;
    }).sort((a, b) => new Date(a.chegada) - new Date(b.chegada));

    list.forEach(c => {
        const isSaiu = c.status === 'SAIU';
        const colId = isSaiu ? 'SAIU' : (c.local || 'OUT');
        const container = document.getElementById('list-' + colId);
        if (!container) return;

        if (!isSaiu) {
            const cnt = document.getElementById('count-' + colId);
            if (cnt) cnt.textContent = parseInt(cnt.textContent) + 1;
        }

        const card = document.createElement('div');
        card.className = 'truck-card';
        if (c.isProvisory) card.style.borderLeft = "4px solid #f59e0b";

        card.oncontextmenu = (e) => { e.preventDefault(); openTruckContextMenu(e.pageX, e.pageY, c.id); };

        let displayName = c.empresa;
        if (c.supplierId) {
            const s = suppliersData.find(x => x.id === c.supplierId);
            if (s) displayName = s.nome;
        }

        // Exibe Laudo
        const laudoHtml = !isSaiu ? `<div style="font-size:0.7rem; font-weight:bold; margin-top:5px; color:${c.comLaudo ? '#16a34a' : '#dc2626'}">${c.comLaudo ? '<i class="fas fa-check-circle"></i> COM LAUDO' : '<i class="fas fa-times-circle"></i> SEM LAUDO'}</div>` : '';

        // Botões de Ação
        let btn = '';
        if (!isSaiu) {
            if (c.status === 'FILA') btn = `<button onclick="changeStatus('${c.id}','LIBERADO')" class="btn btn-save" style="width:100%; margin-top:5px;">CHAMAR</button>`;
            else if (c.status === 'LIBERADO') btn = `<button onclick="changeStatus('${c.id}','ENTROU')" class="btn btn-launch" style="width:100%; margin-top:5px;">ENTRADA</button>`;
            else if (c.status === 'ENTROU') btn = `<button onclick="changeStatus('${c.id}','SAIU')" class="btn btn-edit" style="width:100%; margin-top:5px;">SAÍDA</button>`;
        }

        card.innerHTML = `
            <div class="card-basic">
                <div>
                    <div class="card-company">${displayName} <span style="font-weight:normal; font-size:0.8em; color:#666;">#${c.sequencia || ''}</span> ${c.isProvisory ? '<span style="font-size:0.6rem; background:orange; color:white; padding:2px">REQ</span>' : ''}</div>
                    <small>${c.placa} • ${c.chegada.slice(11, 16)}</small>
                    <div class="sector-tag">${c.localSpec}</div>
                    ${laudoHtml}
                </div>
            </div>
            <div class="status-badge st-${c.status === 'FILA' ? 'wait' : (c.status === 'LIBERADO' ? 'called' : (c.status === 'ENTROU' ? 'ok' : 'out'))}">${c.status}</div>
            <div class="card-expanded-content" style="display:none">
                ${(c.cargas && c.cargas[0] && c.cargas[0].produtos ? c.cargas[0].produtos.map(p => `<div>${p.nome}</div>`).join('') : '')}
                ${btn}
            </div>
        `;

        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                const exp = card.querySelector('.card-expanded-content');
                exp.style.display = exp.style.display === 'none' ? 'block' : 'none';
            }
        };
        container.appendChild(card);
    });
}

function changeStatus(id, st) {
    const i = patioData.findIndex(c => c.id === id); if (i > -1) {
        patioData[i].status = st;
        if (st === 'LIBERADO') { patioData[i].releasedBy = loggedUser.username; patioData[i].recebimentoNotified = false; }
        if (st === 'ENTROU') { const m = mpData.find(x => x.id === id); if (m) m.entrada = getBrazilTime(); }
        if (st === 'SAIU') { const now = getBrazilTime(); patioData[i].saida = now; const m = mpData.find(x => x.id === id); if (m) m.saida = now; }
        saveAll(); renderPatio();
    }
}

function openTruckContextMenu(x, y, id) {
    contextTruckId = id;
    const m = document.getElementById('ctxMenuTruck');

    // HTML do menu
    m.innerHTML = `
        <div class="ctx-item" onclick="openEditTruck('${id}')"><i class="fas fa-edit"></i> Editar Veículo</div>
        <div class="ctx-item" onclick="confirmDeleteTruck('${id}')" style="color:red"><i class="fas fa-trash"></i> Excluir...</div>
    `;

    // Posicionamento
    // Ajuste para não sair da tela
    let posX = x;
    let posY = y;
    if (x + 200 > window.innerWidth) posX = window.innerWidth - 220;

    m.style.left = posX + 'px';
    m.style.top = posY + 'px';
    m.style.display = 'block';
}

function confirmDeleteTruck(id) {
    contextTruckId = id;
    deleteOptionSelected = 'queue';
    document.querySelectorAll('.del-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('optQueue').classList.add('selected');
    document.getElementById('modalDeleteConfirm').style.display = 'flex';
    closeContextMenu();
}

function selectDeleteOption(opt) {
    deleteOptionSelected = opt;
    document.querySelectorAll('.del-option').forEach(el => el.classList.remove('selected'));
    if (opt === 'queue') document.getElementById('optQueue').classList.add('selected');
    else document.getElementById('optGeneral').classList.add('selected');
}

function executeDeleteTruck() {
    const id = contextTruckId;
    if (!id) return;

    if (deleteOptionSelected === 'queue') {
        // Opção 1: Remove apenas do Pátio (fila)
        patioData = patioData.filter(x => x.id !== id);
    }
    else if (deleteOptionSelected === 'general') {
        // Opção 2: Remove de TUDO (Pátio, Mapa, Pesagem)
        patioData = patioData.filter(x => x.id !== id);
        mapData = mapData.filter(x => x.id !== id);
        mpData = mpData.filter(x => x.id !== id);

        // Remove também requisições associadas para limpar lixo
        requests = requests.filter(r => {
            // Se a requisição tem dados que apontam para IDs deletados ou se o caminhão tinha link com ela
            // Lógica simplificada: mantemos requisições para histórico, a menos que seja crucial apagar
            return true;
        });
    }

    saveAll();
    renderPatio();
    // Atualiza outras views caso estejam abertas no fundo
    if (document.getElementById('view-mapas').classList.contains('active')) renderMapList();
    if (document.getElementById('view-materia-prima').classList.contains('active')) renderMateriaPrima();

    document.getElementById('modalDeleteConfirm').style.display = 'none';
    alert("Registro excluído com sucesso.");
}

function renderMateriaPrima() {
    const tb = document.getElementById('mpBody');
    tb.innerHTML = '';
    const d = document.getElementById('mpDateFilter').value;

    mpData.filter(m => m.date === d).forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'interactive-row';
        // Evento de clique direito atualizado
        tr.oncontextmenu = function (e) {
            e.preventDefault();
            contextMPId = m.id;
            openMPContextMenu(e.pageX, e.pageY);
        };

        const manualBadge = m.isManual ? '<span class="badge-manual" title="Inserido Manualmente">MANUAL</span>' : '';
        const diffFormatted = Number(m.difKg).toFixed(2);

        // --- LÓGICA DE MÚLTIPLAS NFs ---
        let nfDisplay = m.nf || 'S/N';
        let multiBtn = '';

        // Busca os dados originais no Pátio para ver se tem mais produtos
        const truck = patioData.find(t => t.id === m.id);

        if (truck && truck.cargas && truck.cargas.length > 0) {
            const produtos = truck.cargas[0].produtos;

            // Filtra NFs únicas (ignora vazios ou repetidos)
            const uniqueNFs = new Set(produtos.map(p => p.nf).filter(n => n && n.trim() !== '' && n !== 'S/N'));

            // Se tiver mais de 1 NF diferente, mostra o botão
            if (uniqueNFs.size > 1) {
                nfDisplay = `${m.nf} <small style="color:#666">(+${uniqueNFs.size - 1})</small>`;
                multiBtn = `<button class="btn-more-nf" onclick="showTruckNFs('${m.id}')" title="Ver todas as NFs/Produtos">+</button>`;
            }
        }

        tr.innerHTML = `
        <td>${new Date(m.date).toLocaleDateString()}</td>
        <td><b>${m.produto}</b> ${manualBadge}<br><small>${m.empresa}</small></td>
        <td>${m.placa}</td>
        <td>${m.local}</td>
        <td>${m.chegada ? m.chegada.slice(11, 16) : '-'}</td>
        <td>${m.entrada ? m.entrada.slice(11, 16) : '-'}</td>
        <td><input type="number" class="cell" style="width:100px" value="${m.tara}" onchange="updateWeights('${m.id}','tara',this.value)"></td>
        <td><input type="number" class="cell" style="width:100px" value="${m.bruto}" onchange="updateWeights('${m.id}','bruto',this.value)"></td>
        <td style="font-weight:bold">${m.liq}</td>
        <td><input type="number" class="cell" style="width:100px" value="${m.pesoNF}" onchange="updateWeights('${m.id}','pesoNF',this.value)"></td>
        <td style="color:${m.difKg < 0 ? 'red' : 'green'}">${diffFormatted}</td>
        <td>${m.difPerc}%</td>
        <td>${m.saida ? m.saida.slice(11, 16) : '-'}</td>
        <td style="display:flex; align-items:center; justify-content:space-between;">
            <div>
                ${nfDisplay} 
                ${m.notes ? '<i class="fas fa-sticky-note" style="color:#f59e0b; margin-left:5px;" title="' + m.notes + '"></i>' : ''}
            </div>
            ${multiBtn}
        </td>`;
        tb.appendChild(tr);
    });
}

function updateWeights(id, f, v) {
    const i = mpData.findIndex(m => m.id === id); if (i > -1) {
        mpData[i][f] = parseFloat(v) || 0; mpData[i].liq = mpData[i].bruto - mpData[i].tara;
        mpData[i].difKg = mpData[i].liq - mpData[i].pesoNF; mpData[i].difPerc = mpData[i].pesoNF ? ((mpData[i].difKg / mpData[i].pesoNF) * 100).toFixed(2) : 0;
        saveAll(); renderMateriaPrima();
    }
}

function openMPContextMenu(x, y) {
    const m = document.getElementById('ctxMenuMP');
    const hasMap = mapData.some(map => map.id === contextMPId); // Verifica se existe mapa

    let mapOption = '';
    if (hasMap) {
        mapOption = `<div class="ctx-item" onclick="goToMapFromContext('${contextMPId}')"><i class="fas fa-map"></i> Abrir Mapa Cego</div><hr style="margin:5px 0; border-color:var(--border-color);">`;
    }

    m.innerHTML = `
        <div class="ctx-item" onclick="openEditMPModal()"><i class="fas fa-edit"></i> Editar Dados</div>
        <div class="ctx-item" onclick="openNoteMPModal()"><i class="fas fa-sticky-note"></i> Observação</div>
        ${mapOption}
        <div class="ctx-item" onclick="openManualMPModal()"><i class="fas fa-plus-circle"></i> Adicionar Manualmente</div>
        <div class="ctx-item" onclick="deleteMateriaPrima()" style="color:red;"><i class="fas fa-trash"></i> Excluir Linha</div>
    `;

    // Ajuste de posição para não sair da tela
    let posX = x;
    let posY = y;
    if (x + 220 > window.innerWidth) posX = window.innerWidth - 230;

    m.style.left = posX + 'px';
    m.style.top = posY + 'px';
    m.style.display = 'block';
}
function showTruckNFs(id) {
    const truck = patioData.find(t => t.id === id);
    if (!truck) return;

    const list = document.getElementById('multiNFList');
    list.innerHTML = '';

    // Pega todos os produtos da carga
    const produtos = truck.cargas[0].produtos;

    produtos.forEach(p => {
        list.innerHTML += `
            <li>
                <span>${p.nome}</span>
                <strong>NF: ${p.nf || 'S/N'}</strong>
            </li>`;
    });

    document.getElementById('modalMultiNF').style.display = 'flex';
}

function goToMapFromContext(id) {
    closeContextMenu();
    // 1. Muda para a aba de mapas
    navTo('mapas');

    // 2. Carrega o mapa específico
    // Pequeno delay para garantir que a view renderizou
    setTimeout(() => {
        loadMap(id);
    }, 100);
}

function deleteMateriaPrima() {
    if (confirm("Deseja excluir este registro de pesagem?")) {
        mpData = mpData.filter(x => x.id !== contextMPId);
        saveAll(); renderMateriaPrima();
    }
    closeContextMenu();
}

function openManualMPModal() {
    document.getElementById('manMPPlaca').value = '';
    document.getElementById('manMPProd').value = '';
    document.getElementById('manMPEmp').value = '';
    document.getElementById('manMPNF').value = '';
    document.getElementById('manMPTara').value = '0';
    document.getElementById('modalManualMP').style.display = 'flex';
    closeContextMenu();
}

function saveManualMP() {
    const pl = document.getElementById('manMPPlaca').value.toUpperCase();
    const pr = document.getElementById('manMPProd').value;
    if (!pl || !pr) return alert("Placa e Produto são obrigatórios.");
    const id = 'MAN_' + Date.now();
    const d = document.getElementById('mpDateFilter').value || getBrazilTime().split('T')[0];
    mpData.push({
        id: id, date: d, produto: pr, empresa: document.getElementById('manMPEmp').value,
        placa: pl, local: 'MANUAL', chegada: getBrazilTime(), entrada: getBrazilTime(),
        tara: parseFloat(document.getElementById('manMPTara').value) || 0, bruto: 0, liq: 0, pesoNF: 0, difKg: 0, difPerc: 0,
        nf: document.getElementById('manMPNF').value, notes: '', isManual: true
    });
    saveAll(); renderMateriaPrima(); document.getElementById('modalManualMP').style.display = 'none';
}

function openEditMPModal() { const m = mpData.find(x => x.id === contextMPId); document.getElementById('editMPId').value = m.id; document.getElementById('editMPEmpresa').value = m.empresa; document.getElementById('editMPPlaca').value = m.placa; document.getElementById('editMPProduto').value = m.produto; document.getElementById('modalEditMP').style.display = 'flex'; closeContextMenu(); }
function saveEditMP() { const id = document.getElementById('editMPId').value; const i = mpData.findIndex(x => x.id === id); if (i > -1) { mpData[i].empresa = document.getElementById('editMPEmpresa').value; mpData[i].placa = document.getElementById('editMPPlaca').value; mpData[i].produto = document.getElementById('editMPProduto').value; saveAll(); renderMateriaPrima(); } document.getElementById('modalEditMP').style.display = 'none'; }
function openNoteMPModal() { const m = mpData.find(x => x.id === contextMPId); document.getElementById('noteMPId').value = m.id; document.getElementById('noteMPText').value = m.notes || ''; document.getElementById('modalNoteMP').style.display = 'flex'; closeContextMenu(); }
function saveNoteMP() { const id = document.getElementById('noteMPId').value; const i = mpData.findIndex(x => x.id === id); if (i > -1) { mpData[i].notes = document.getElementById('noteMPText').value; saveAll(); renderMateriaPrima(); } document.getElementById('modalNoteMP').style.display = 'none'; }

function updateMapState() {
    const sheet = document.getElementById('mapSheet');
    const empty = document.getElementById('mapEmptyState');
    if (!sheet || !empty) return;
    if (currentMapId && mapData.find(m => m.id === currentMapId)) {
        sheet.style.display = 'block'; empty.style.display = 'none';
    } else {
        currentMapId = null; sheet.style.display = 'none'; empty.style.display = 'flex';
        document.querySelectorAll('.mc-item').forEach(el => el.classList.remove('selected'));
    }
}

function renderMapList() {
    const fd = document.getElementById('mapListDateFilter').value;
    const l = document.getElementById('mapList');
    l.innerHTML = '';

    // Filtros de data e permissão
    const filteredMaps = mapData.filter(m => {
        if (m.date !== fd) return false;
        // (Lógica de permissão mantida...)
        return true;
    }).slice().reverse();

    if (filteredMaps.length === 0) {
        l.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum mapa para esta data.</div>';
        return;
    }

    filteredMaps.forEach(m => {
        // Tenta pegar o fornecedor da primeira linha do mapa
        // Se não tiver, usa "Diversos"
        let fornDisplay = 'Diversos';
        if (m.rows && m.rows.length > 0 && m.rows[0].forn) {
            fornDisplay = m.rows[0].forn;
        }

        const el = document.createElement('div');
        el.className = `mc-item ${currentMapId === m.id ? 'selected' : ''}`;
        if (m.divergence) el.style.borderLeft = "4px solid red";

        el.innerHTML = `
            <div><b>${fornDisplay}</b></div>
            <small>${m.placa} • ${m.setor}</small>
            <div>${m.launched ? '<span style="color:green">Lançado</span>' : 'Rascunho'} ${m.divergence ? '<b style="color:red">(DIV)</b>' : ''}</div>
        `;

        el.onclick = () => { loadMap(m.id); };
        l.appendChild(el);
    });
}

function loadMap(id) {
    currentMapId = id; const m = mapData.find(x => x.id === id); if (!m) return;
    document.getElementById('mapDate').value = m.date; document.getElementById('mapPlaca').value = m.placa; document.getElementById('mapSetor').value = m.setor;
    const b = document.getElementById('divBanner');
    if (m.divergence) { b.style.display = 'block'; document.getElementById('divBannerText').innerHTML = `De: ${m.divergence.reporter}<br>"${m.divergence.reason}"`; document.getElementById('divResolveBtn').innerHTML = isRecebimento ? `<button class="btn btn-save" onclick="resolveDivergence('${m.id}')">Resolver</button>` : ''; }
    else b.style.display = 'none';
    const st = document.getElementById('mapStatus');
    if (m.launched && !m.forceUnlock) { st.textContent = 'LANÇADO (Bloqueado)'; st.style.color = 'green'; document.getElementById('btnLaunch').style.display = 'none'; document.getElementById('btnRequestEdit').style.display = isConferente ? 'inline-block' : 'none'; }
    else { st.textContent = m.forceUnlock ? 'EM EDIÇÃO (Desbloqueado)' : 'Rascunho'; st.style.color = m.forceUnlock ? 'orange' : '#666'; document.getElementById('btnLaunch').style.display = 'inline-block'; document.getElementById('btnRequestEdit').style.display = 'none'; }
    document.getElementById('sigReceb').textContent = m.signatures.receb || ''; document.getElementById('sigConf').textContent = m.signatures.conf || '';
    renderRows(m); renderMapList(); updateMapState();
}

function deleteMap(id) {
    if (confirm('Excluir Mapa?')) {
        mapData = mapData.filter(x => x.id !== id);
        if (currentMapId === id) currentMapId = null;
        saveAll(); renderMapList(); updateMapState(); closeContextMenu();
    }
}

function openContextMenu(x, y, m) {
    const menu = document.getElementById('ctxMenu');
    let html = `<div class="ctx-item" style="color:red" onclick="openDivergenceModal('${m.id}')">Divergência</div>`;
    if (isConferente) html += `<div class="ctx-item" onclick="triggerRequest('edit','${m.id}')">Solicitar Edição</div>`;
    else html += `<div class="ctx-item" onclick="forceUnlockMap('${m.id}')">Forçar Edição</div><div class="ctx-item" style="color:red" onclick="deleteMap('${m.id}')">Excluir</div>`;
    menu.innerHTML = html; menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.style.display = 'block';
}

function renderRows(m) {
    const tb = document.getElementById('mapBody'); tb.innerHTML = '';
    const locked = m.launched && !m.forceUnlock;

    m.rows.forEach(r => {
        const tr = document.createElement('tr');

        const createCell = (f, role) => {
            let ro = locked;
            if (!locked) {
                if (role === 'conf' && !isConferente) ro = true;
                if (role === 'receb' && !isRecebimento) ro = true;
            }
            let val = r[f];
            if (isConferente && f === 'qty_nf') { val = '---'; ro = true; }

            // --- MODIFICAÇÃO AQUI: CLIQUE NO NOME DO PRODUTO ---
            if (f === 'desc') {
                return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="updateRow('${r.id}','${f}',this.value)" style="width:100%; cursor:pointer; color:var(--primary); font-weight:600;" onclick="showProductCodePopup(this.value)" title="Clique para ver o código"></td>`;
            }
            // ----------------------------------------------------

            return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="updateRow('${r.id}','${f}',this.value)" style="width:100%"></td>`;
        };

        tr.innerHTML = `${createCell('desc', 'receb')} ${createCell('qty_nf', 'receb')} ${createCell('qty', 'conf')} ${createCell('nf', 'receb')} ${createCell('forn', 'receb')}`;
        tb.appendChild(tr);
    });
}

function updateRow(rid, f, v) { const m = mapData.find(x => x.id === currentMapId); const r = m.rows.find(x => x.id === rid); if (r) { r[f] = v; saveAll(); } }
function saveCurrentMap() { const m = mapData.find(x => x.id === currentMapId); if (m) { m.date = document.getElementById('mapDate').value; m.placa = document.getElementById('mapPlaca').value; m.setor = document.getElementById('mapSetor').value; saveAll(); alert('Salvo.'); renderMapList(); } }
function launchMap() { const m = mapData.find(x => x.id === currentMapId); if (!m.signatures.receb || !m.signatures.conf) { alert('Assinaturas obrigatórias.'); return; } if (confirm('Lançar?')) { m.launched = true; m.forceUnlock = false; saveAll(); loadMap(currentMapId); } }
function signMap(role) { const m = mapData.find(x => x.id === currentMapId); if (!m) return; if (role === 'receb' && !isRecebimento) return alert('Só Recebimento'); if (role === 'conf' && !isConferente) return alert('Só Conferente'); m.signatures[role] = loggedUser.username + ' ' + new Date().toLocaleTimeString().slice(0, 5); saveAll(); loadMap(currentMapId); }
function createNewMap() { const id = Date.now().toString(); const rows = []; for (let i = 0; i < 8; i++) rows.push({ id: id + '_' + i, desc: '', qty: '', nf: '', forn: '', owners: {} }); mapData.push({ id, date: today, rows, placa: '', setor: '', launched: false, signatures: {}, divergence: null }); saveAll(); renderMapList(); loadMap(id); }
function forceUnlockMap(id) { const m = mapData.find(x => x.id === id); if (m) { m.forceUnlock = true; saveAll(); loadMap(id); closeContextMenu(); } }

function openDivergenceModal(id) { contextMapId = id; document.getElementById('divUserList').innerHTML = ['Caio', 'Balanca', 'Fabricio', 'Admin'].map(u => `<label style="display:block"><input type="checkbox" value="${u}"> ${u}</label>`).join(''); document.getElementById('divReason').value = ''; document.getElementById('modalDivergence').style.display = 'flex'; closeContextMenu(); }
function submitDivergence() { const m = mapData.find(x => x.id === contextMapId); if (m) { m.divergence = { active: true, reason: document.getElementById('divReason').value, reporter: loggedUser.username }; const t = Array.from(document.querySelectorAll('#divUserList input:checked')).map(x => x.value); t.forEach(u => requests.push({ id: Date.now() + Math.random(), type: 'divergence', user: loggedUser.username, target: u, mapId: contextMapId, msg: m.divergence.reason, status: 'pending' })); saveAll(); document.getElementById('modalDivergence').style.display = 'none'; loadMap(contextMapId); } }
function resolveDivergence(id) { if (confirm('Resolver?')) { const m = mapData.find(x => x.id === id); if (m) { m.divergence = null; saveAll(); loadMap(id); } } }
function triggerRequest(type, mid) { const t = mid || currentMapId; const u = prompt('Para quem?'); const r = prompt('Motivo'); if (u && r) { requests.push({ id: Date.now(), mapId: t, user: loggedUser.username, target: u, type, msg: r, status: 'pending' }); saveAll(); closeContextMenu(); alert('Solicitado'); } }
function renderRequests() {
    const l = document.getElementById('reqList');
    l.innerHTML = '';
    const h = document.getElementById('historyList');
    h.innerHTML = '';

    // Filtra todas as requisições pendentes
    requests.filter(r => r.status === 'PENDENTE').forEach(r => {
        let actionBtn = '';

        // Se for Entrada de Caminhão (Dados Complexos), abre o Modal de Análise
        if (r.type === 'complex_entry') {
            actionBtn = `<button class="btn btn-save btn-small" onclick="openUnifiedApprovalModal('${r.id}')">Analisar</button>`;
        }
        // Se for divergência ou edição simples, usa o Aceitar direto
        else if (r.type !== 'divergence') { // Divergência geralmente só visualiza
            actionBtn = `<button class="btn btn-save btn-small" onclick="resolveRequest('${r.id}','approved')">Aceitar</button>`;
        }

        // Se for divergência, mostra botão de ver
        if (r.type === 'divergence') {
            actionBtn = `<button class="btn btn-edit btn-small" onclick="navTo('mapas'); loadMap('${r.mapId}')">Ver Mapa</button>`;
        }

        l.innerHTML += `
            <div style="margin-bottom:8px; padding:12px; border:1px solid #eee; border-radius:6px; background:#fff; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="text-transform:uppercase; font-size:0.8rem; color:var(--primary);">${r.type.replace('_', ' ')}</strong>
                    <div style="font-size:0.9rem;">${r.msg || 'Verificação de dados pendentes'}</div>
                    <small style="color:#888;">${new Date(r.timestamp).toLocaleTimeString()}</small>
                </div> 
                ${actionBtn}
            </div>`;
    });

    // Histórico
    requests.slice(0, 10).forEach(r => {
        h.innerHTML += `<div style="font-size:0.8rem; border-bottom:1px solid #eee; padding:5px;">
            <b>${r.type}</b> - <span style="color:${r.status === 'APROVADO' ? 'green' : 'gray'}">${r.status}</span>
        </div>`;
    });

    updateBadge();
}
function resolveRequest(id, st) { const i = requests.findIndex(r => r.id === id); if (i > -1) { requests[i].status = st; if (st === 'approved' && requests[i].type === 'edit') { const m = mapData.find(x => x.id === requests[i].mapId); if (m) m.forceUnlock = true; } saveAll(); renderRequests(); } }
function updateBadge() { const c = requests.filter(r => r.status === 'pending' && r.target === loggedUser.username).length; const b = document.getElementById('badgeNotif'); if (c > 0) { b.innerText = c; b.style.display = 'inline-block'; } else b.style.display = 'none'; }
function checkForNotifications() {
    const modal = document.getElementById('modalNotification');
    if (modal && modal.style.display === 'flex') return;

    const todayStr = getBrazilTime().split('T')[0];

    // 1. Notificação de CHEGADA NA FILA (Exclusivo para Conferentes)
    if (typeof isConferente !== 'undefined' && isConferente) {
        const queue = patioData.filter(c => 
            c.status === 'FILA' && 
            (c.chegada || '').startsWith(todayStr)
        );

        for (const truck of queue) {
            // Cria uma chave única para chegada (diferente da liberação)
            const arrivalKey = truck.id + '_arrival';
            
            // Se já notificou a chegada deste caminhão, pula
            if (notifiedEvents.has(arrivalKey)) continue;

            let shouldNotify = false;
            
            // Lógica de Responsabilidade por Setor
            // Se sou da Doca (ALM), recebo notificações da Doca
            if (truck.local === 'ALM' && userSubType === 'ALM') shouldNotify = true;
            // Se sou do Gava, recebo do Gava
            else if (truck.local === 'GAVA' && userSubType === 'GAVA') shouldNotify = true;
            // Se sou de Outros (Infra, Manut, etc), recebo de Outros
            else if (truck.local === 'OUT' && !['ALM', 'GAVA'].includes(userSubType)) shouldNotify = true;
            // Se não tenho subtipo definido (Conferente Geral), recebo tudo
            else if (!userSubType) shouldNotify = true;

            if (shouldNotify) {
                sendSystemNotification(
                    "Novo Veículo na Fila",
                    `Setor: ${truck.localSpec}\n${truck.empresa}\nPlaca: ${truck.placa}`,
                    'patio',
                    truck.id,
                    { icon: '../Imgs/logo-sf.png' }
                );
                // Marca como notificado para não repetir
                notifiedEvents.add(arrivalKey);
            }
        }
    }

    // 2. Notificação de LIBERAÇÃO (Para Recebimento/Portaria)
    const call = patioData.find(c => 
        c.status === 'LIBERADO' && 
        !c.recebimentoNotified && 
        (c.chegada || '').startsWith(todayStr)
    );

    if (call && isRecebimento) {
        if (!notifiedEvents.has(call.id)) {
            // Formata a mensagem: Quem liberou + Fornecedor + Placa
            const releaser = call.releasedBy || 'Operador';
            const msg = `${releaser} liberou ${call.empresa} para descarga\nPlaca: ${call.placa}`;

            showNotificationPopup('release', call);
            
            sendSystemNotification(
                "Veículo Liberado!",
                msg,
                'patio',
                call.id,
                { icon: '../Imgs/logo-sf.png' }
            );
            
            notifiedEvents.add(call.id);
            return; 
        }
    }

    // 3. Notificação de DIVERGÊNCIA
    const div = requests.find(r => r.type === 'divergence' && r.target === loggedUser.username && r.status === 'pending');

    if (div) {
        if (!notifiedEvents.has(div.id)) {
            showNotificationPopup('divergence', div);
            
            sendSystemNotification(
                "⚠️ DIVERGÊNCIA",
                `Motivo: ${div.msg}`,
                'mapas',
                div.mapId,
                { icon: '../Imgs/logo-sf.png' }
            );
            
            notifiedEvents.add(div.id);
        }
    }

    updateBadge();
}

    const div = requests.find(r => r.type === 'divergence' && r.target === loggedUser.username && r.status === 'pending');

    if (div) {

        if (!notifiedEvents.has(div.id)) {
            showNotificationPopup('divergence', div);
            sendSystemNotification(
                "⚠️ DIVERGÊNCIA",
                `Motivo: ${div.msg}`,
                'mapas',
                div.mapId,
                { icon: '../Imgs/logo-sf.png' }
            );
            notifiedEvents.add(div.id); // Marca como notificado
        }
    }

    updateBadge();

setInterval(checkForNotifications, 4000);
function showNotificationPopup(type, data) {
    const p = document.getElementById('notifPopupContent');
    const modal = document.getElementById('modalNotification');
    if (!modal || !p) return;
    modal.style.display = 'flex';
    if (type === 'release') {
        p.innerHTML = `<h2 style="color:green">Liberado!</h2><p>${data.empresa} - ${data.placa}</p><button class="btn btn-save" onclick="confirmNotification('release','${data.id}')">OK</button>`;
    } else {
        p.innerHTML = `<h2 style="color:red">Divergência</h2><p>${data.msg}</p><button class="btn btn-edit" onclick="confirmNotification('divergence','${data.id}')">Ver</button>`;
    }
}
function confirmNotification(type, id) {
    if (type === 'release') {
        const i = patioData.findIndex(c => c.id === id);
        if (i > -1) patioData[i].recebimentoNotified = true;
    } else {
        const i = requests.findIndex(r => r.id == id);
        if (i > -1) {
            requests[i].status = 'seen';
            navTo('mapas');
            if (requests[i].mapId) loadMap(requests[i].mapId);
        }
    }
    const modalNotif = document.getElementById('modalNotification');
    if (modalNotif) modalNotif.style.display = 'none';
    saveAll();
}

function renderCarregamento() {
    const tb = document.getElementById('carrBody'); tb.innerHTML = '';
    const d = document.getElementById('carrDateFilter').value;
    carregamentoData.filter(c => c.status !== 'SAIU' || c.date === d).forEach(c => {
        const tr = document.createElement('tr');
        tr.oncontextmenu = function (e) { e.preventDefault(); contextCarrId = c.id; openCarrContextMenu(e.pageX, e.pageY); };
        let btn = c.status === 'AGUARDANDO' ? `<button class="btn btn-save btn-small" onclick="changeStatusCarregamento('${c.id}','CARREGANDO')">LIBERAR</button>` : (c.status === 'CARREGANDO' ? `<button class="btn btn-edit btn-small" onclick="changeStatusCarregamento('${c.id}','SAIU')">FINALIZAR</button>` : '-');
        tr.innerHTML = `<td>${c.status}</td><td>${c.motorista}</td><td>${c.cavalo}</td><td>${(c.carretas || []).join(',')}</td><td><input class="cell" style="width:50px" value="${c.tara || 0}" onchange="updateCarrWeight('${c.id}','tara',this.value)"></td><td><input class="cell" style="width:50px" value="${c.bruto || 0}" onchange="updateCarrWeight('${c.id}','bruto',this.value)"></td><td>${c.liq || 0}</td><td>${(c.checkin || '').slice(11, 16) || '-'}</td><td>${(c.start || '').slice(11, 16) || '-'}</td><td>${(c.checkout || '').slice(11, 16) || '-'}</td><td>${btn}</td>`;
        tb.appendChild(tr);
    });
}
function updateCarrWeight(id, f, v) { const i = carregamentoData.findIndex(c => c.id === id); if (i > -1) { carregamentoData[i][f] = parseFloat(v) || 0; carregamentoData[i].liq = carregamentoData[i].bruto - carregamentoData[i].tara; saveAll(); renderCarregamento(); } }
function changeStatusCarregamento(id, s) { const i = carregamentoData.findIndex(c => c.id === id); if (i > -1) { carregamentoData[i].status = s; if (s === 'CARREGANDO') carregamentoData[i].start = getBrazilTime(); if (s === 'SAIU') carregamentoData[i].checkout = getBrazilTime(); saveAll(); renderCarregamento(); } }
function openModalCarregamento() { document.getElementById('modalCarregamento').style.display = 'flex'; }
function addCarretaField() { document.getElementById('carretaContainer').innerHTML += `<input type="text" class="carrCarretaInput" style="width:100%; margin-top:5px;">`; }
function saveCarregamento() { const mot = document.getElementById('carrMotorista').value; const cav = document.getElementById('carrCavalo').value; const arr = []; document.querySelectorAll('.carrCarretaInput').forEach(i => { if (i.value) arr.push(i.value) }); carregamentoData.push({ id: Date.now().toString(), date: today, motorista: mot, cavalo: cav, carretas: arr, tara: 0, bruto: 0, liq: 0, status: 'AGUARDANDO', checkin: getBrazilTime() }); saveAll(); document.getElementById('modalCarregamento').style.display = 'none'; renderCarregamento(); }
function openCarrContextMenu(x, y) { const m = document.getElementById('ctxMenuCarr'); m.innerHTML = `<div class="ctx-item" onclick="openEditCarrModal()">Editar</div><div class="ctx-item" onclick="openNoteCarrModal()">Nota</div><div class="ctx-item" style="color:red" onclick="deleteCarregamento()">Excluir</div>`; m.style.left = x + 'px'; m.style.top = y + 'px'; m.style.display = 'block'; }
function openEditCarrModal() { const c = carregamentoData.find(x => x.id === contextCarrId); document.getElementById('editCarrId').value = c.id; document.getElementById('editCarrMot').value = c.motorista; document.getElementById('editCarrCav').value = c.cavalo; document.getElementById('modalEditCarr').style.display = 'flex'; closeContextMenu(); }
function saveEditCarr() { const id = document.getElementById('editCarrId').value; const i = carregamentoData.findIndex(x => x.id === id); if (i > -1) { carregamentoData[i].motorista = document.getElementById('editCarrMot').value; carregamentoData[i].cavalo = document.getElementById('editCarrCav').value; saveAll(); renderCarregamento(); } document.getElementById('modalEditCarr').style.display = 'none'; }
function deleteCarregamento() { if (confirm('Excluir?')) { carregamentoData = carregamentoData.filter(x => x.id !== contextCarrId); saveAll(); renderCarregamento(); } closeContextMenu(); }
function openNoteCarrModal() { const c = carregamentoData.find(x => x.id === contextCarrId); document.getElementById('noteCarrId').value = c.id; document.getElementById('noteCarrText').value = c.notes || ''; document.getElementById('modalNoteCarr').style.display = 'flex'; closeContextMenu(); }
function saveNoteCarr() { const id = document.getElementById('noteCarrId').value; const i = carregamentoData.findIndex(x => x.id === id); if (i > -1) { carregamentoData[i].notes = document.getElementById('noteCarrText').value; saveAll(); renderCarregamento(); } document.getElementById('modalNoteCarr').style.display = 'none'; }

function openEditTruck(id) {
    const truck = patioData.find(t => t.id === id);
    if (!truck) return;

    document.getElementById('editTruckId').value = id;
    document.getElementById('editTruckPlaca').value = truck.placa;


    const secMapReverse = { 'DOCA (ALM)': 'DOCA', 'GAVA': 'GAVA', 'MANUTENÇÃO': 'MANUTENCAO', 'INFRAESTRUTURA': 'INFRA', 'SALA DE PESAGEM': 'PESAGEM', 'LABORATÓRIO': 'LAB' };
    document.getElementById('editTruckDestino').value = secMapReverse[truck.localSpec] || 'OUT';

    document.getElementById('editTruckLaudo').checked = truck.comLaudo || false;

    // Carrega produtos para a variável temporária de edição
    editTmpItems = JSON.parse(JSON.stringify(truck.cargas[0].produtos)); // Clona o array
    renderEditTmpList();

    document.getElementById('modalEditTruck').style.display = 'flex';
    closeContextMenu();
}
function renderEditTmpList() {
    const ul = document.getElementById('editTmpList');
    ul.innerHTML = '';
    editTmpItems.forEach((item, index) => {
        ul.innerHTML += `
            <li>
                <span><b>${item.nf || 'S/N'}</b> - ${item.nome}</span>
                <button class="btn-icon-remove" onclick="removeEditTmpItem(${index})"><i class="fas fa-trash"></i></button>
            </li>`;
    });
}
function addEditTmpItem() {
    const nf = document.getElementById('editTmpNF').value;
    const prod = document.getElementById('editTmpProd').value.toUpperCase();
    if (prod) {
        editTmpItems.push({ nf: nf || 'S/N', nome: prod }); // Note: use 'nome' para consistência
        renderEditTmpList();
        document.getElementById('editTmpProd').value = '';
        document.getElementById('editTmpNF').value = '';
    }
}
function removeEditTmpItem(i) { editTmpItems.splice(i, 1); renderEditTmpList(); }
function openProdSelectForEdit() { isEditingMode = true; openProdSelect(); }
function saveEditTruck() {
    const id = document.getElementById('editTruckId').value;
    const placa = document.getElementById('editTruckPlaca').value.toUpperCase();
    const dest = document.getElementById('editTruckDestino').value;
    const laudo = document.getElementById('editTruckLaudo').checked;

    if (!id) return alert("Erro: ID do veículo não encontrado.");

    // 1. Encontra o índice exato do caminhão na memória
    const truckIndex = patioData.findIndex(t => t.id === id);

    if (truckIndex > -1) {
        const truck = patioData[truckIndex];

        truck.placa = placa;
        truck.comLaudo = laudo;

        // Atualiza Local/Setor
        const secMap = {
            'DOCA': { n: 'DOCA (ALM)', c: 'ALM' },
            'GAVA': { n: 'GAVA', c: 'GAVA' },
            'MANUTENCAO': { n: 'MANUTENÇÃO', c: 'OUT' },
            'INFRA': { n: 'INFRAESTRUTURA', c: 'OUT' },
            'PESAGEM': { n: 'SALA DE PESAGEM', c: 'OUT' },
            'LAB': { n: 'LABORATÓRIO', c: 'OUT' },
            'SST': { n: 'SST', c: 'OUT' },
            'CD': { n: 'CD', c: 'OUT' },
            'OUT': { n: 'OUTROS', c: 'OUT' },
            'COMPRAS': { n: 'COMPRAS', c: 'OUT' }
        };
        const newSec = secMap[dest] || { n: 'OUTROS', c: 'OUT' };

        // Só atualiza o local se o caminhão NÃO tiver saído (para não bugar histórico)
        if (truck.status !== 'SAIU') {
            truck.local = newSec.c;
            truck.localSpec = newSec.n;
        }

        // 3. Atualiza Produtos (se houver mudança na lista temporária do modal)
        if (editTmpItems && editTmpItems.length > 0) {
            // Atualiza no objeto do caminhão
            if (!truck.cargas || truck.cargas.length === 0) truck.cargas = [{}];
            truck.cargas[0].produtos = JSON.parse(JSON.stringify(editTmpItems)); // Copia limpa

            // Sincroniza com o MAPA CEGO (se existir)
            const mapIndex = mapData.findIndex(m => m.id === id);
            if (mapIndex > -1) {
                const currentForn = mapData[mapIndex].rows[0]?.forn || truck.empresa || 'Diversos';

                // Recria as linhas do mapa
                const newRows = editTmpItems.map((item, idx) => ({
                    id: id + '_' + idx,
                    desc: item.nome,
                    qty: '',
                    qty_nf: '',
                    nf: item.nf,
                    forn: currentForn,
                    owners: {}
                }));

                // Completa linhas vazias até 8
                for (let i = newRows.length; i < 8; i++) {
                    newRows.push({ id: id + '_x_' + i, desc: '', qty: '', qty_nf: '', nf: '', forn: '', owners: {} });
                }
                mapData[mapIndex].rows = newRows;
            }
        }

        // 4. Salva e Renderiza
        saveAll();
        renderPatio();
        document.getElementById('modalEditTruck').style.display = 'none';

    } else {
        alert("Erro Crítico: Veículo não encontrado na lista para edição.");
    }
}
function deleteTruck() {
    const id = document.getElementById('editTruckId').value;
    if (confirm('ATENÇÃO: Isso apaga o registro do pátio, mapa cego e pesagem. Confirmar?')) {
        patioData = patioData.filter(x => x.id !== id); mapData = mapData.filter(x => x.id !== id); mpData = mpData.filter(x => x.id !== id);
        saveAll(); renderPatio(); document.getElementById('modalEditTruck').style.display = 'none';
    }
}

// --- RELATÓRIOS ---

function toggleReportSelection(id) {
    if (selectedReportItems.has(id)) selectedReportItems.delete(id);
    else selectedReportItems.add(id);
}
function toggleDivergenceGroup(groupId) {
    // 1. Alternar visibilidade das linhas filhas
    const rows = document.querySelectorAll(`.div-group-${groupId}`);
    rows.forEach(r => {
        // Toggle remove se existe, adiciona se não existe
        r.classList.toggle('hidden-row');
    });

    // 2. Girar o ícone da seta
    const icon = document.getElementById(`icon-${groupId}`);
    if (icon) {
        icon.classList.toggle('rotate-90');
    }
}

function generateAdvancedReport() {
    const t = document.getElementById('repType').value;
    const s = document.getElementById('repDateStart').value;
    const e = document.getElementById('repDateEnd').value;
    const term = document.getElementById('repSearchTerm').value.toUpperCase();
    const area = document.getElementById('repResultArea');
    currentReportType = t;
    selectedReportItems.clear();

    let data = [];
    if (t === 'patio') data = patioData;
    else if (t === 'mapas') data = mapData;
    else if (t === 'carregamento') data = carregamentoData;
    else if (t === 'materia-prima') data = mpData;

    // --- LÓGICA ESPECIAL PARA DIVERGÊNCIAS ---
    if (t === 'divergencias') {
        filteredReportData = [];
        const maps = mapData.filter(x => x.date >= s && x.date <= e);
        const aggregator = {};
        const parseNum = (v) => {
            if (!v) return 0;
            if (typeof v === 'number') return v;
            let cleanStr = String(v).replace(/\./g, '').replace(',', '.');
            return parseFloat(cleanStr) || 0;
        };

        maps.forEach(m => {
            if (!m.rows) return;
            m.rows.forEach(r => {
                const qnf = parseNum(r.qty_nf);
                const qc = parseNum(r.qty);
                const diff = qc - qnf;
                // Ignora diferenças insignificantes (ex: 0.00001)
                if (Math.abs(diff) < 0.001) return;

                const fornRaw = r.forn ? r.forn.trim().toUpperCase() : 'SEM FORNECEDOR';
                const prodRaw = r.desc ? r.desc.trim().toUpperCase() : 'PRODUTO INDEFINIDO';

                if (term) {
                    const searchStr = (fornRaw + ' ' + prodRaw).toUpperCase();
                    if (!searchStr.includes(term)) return;
                }

                const uniqueKey = `${fornRaw}|||${prodRaw}`;
                if (!aggregator[uniqueKey]) {
                    aggregator[uniqueKey] = {
                        id: 'DIV_' + Math.random().toString(36).substr(2, 9),
                        realKey: uniqueKey,
                        mapId: m.id,
                        date: m.date,
                        forn: fornRaw,
                        prod: prodRaw,
                        nfs: new Set(),
                        qnf: 0,
                        qc: 0,
                        diff: 0
                    };
                }

                aggregator[uniqueKey].diff += diff;
                aggregator[uniqueKey].qnf += qnf;
                aggregator[uniqueKey].qc += qc;

                if (r.nf) aggregator[uniqueKey].nfs.add(r.nf);

                if (m.date > aggregator[uniqueKey].date) {
                    aggregator[uniqueKey].date = m.date;
                    aggregator[uniqueKey].mapId = m.id;
                }
            });
        });

        const groups = {};
        Object.values(aggregator).forEach(item => {
            item.diff = parseFloat(item.diff.toFixed(2));
            item.qnf = parseFloat(item.qnf.toFixed(2));
            item.qc = parseFloat(item.qc.toFixed(2));

            if (item.diff === 0) return;

            item.nf = Array.from(item.nfs).join(', ');
            filteredReportData.push(item);

            if (!groups[item.forn]) groups[item.forn] = [];
            groups[item.forn].push(item);
        });

        let html = '<table class="modern-table"><thead><tr><th style="width:40px"></th><th>Fornecedor</th><th>Resumo</th></tr></thead><tbody>';

        if (Object.keys(groups).length === 0) {
            area.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Nenhuma divergência pendente no período (Saldos zerados ou sem ocorrências).</p>';
            document.getElementById('repTotalCount').innerText = 0;
            document.getElementById('repFooter').style.display = 'none';
            return;
        }

        let groupIdCounter = 0;
        // Ordena fornecedores alfabeticamente
        const sortedForns = Object.keys(groups).sort();

        for (const forn of sortedForns) {
            const items = groups[forn];
            groupIdCounter++;
            const groupId = 'g' + groupIdCounter;

            // LINHA DO FORNECEDOR (AGRUPADOR)
            // Adicionei id="icon-${groupId}" na tag <i> para poder girar
            html += `
            <tr class="group-row" onclick="toggleDivergenceGroup('${groupId}')">
                <td><i id="icon-${groupId}" class="fas fa-chevron-right transition-icon"></i></td>
                <td>${forn}</td>
                <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:10px; font-size:0.8rem;">${items.length} produto(s) com diferença</span></td>
            </tr>`;

            // LINHAS DE DETALHE (Começam escondidas com a classe hidden-row)
            items.forEach(item => {
                const diffColor = item.diff > 0 ? 'green' : 'red';
                const diffSignal = item.diff > 0 ? '+' : '';

                html += `
                <tr class="detail-row div-group-${groupId} hidden-row interactive-row" onclick="openReportDetails('${item.id}', 'divergencias-single')">
                    <td><input type="checkbox" class="rep-check" onclick="event.stopPropagation(); toggleReportSelection('${item.id}')"></td>
                    <td colspan="2" style="padding-left:20px; background:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color:var(--text-main)">${item.prod}</b> 
                                <br><small style="color:#666">NF(s): ${item.nf}</small>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:bold; color:${diffColor}; font-size:1.1em;">
                                    Saldo: ${diffSignal}${item.diff}
                                </div>
                                <small style="color:#999">Qtd NF: ${item.qnf} | Físico: ${item.qc}</small>
                            </div>
                        </div>
                    </td>
                </tr>`;
            });
        }
        html += '</tbody></table>';
        area.innerHTML = html;
        document.getElementById('repTotalCount').innerText = filteredReportData.length;
        document.getElementById('repFooter').style.display = 'block';
        return;
    }

    // --- CÓDIGO RESTANTE PARA OUTROS RELATÓRIOS (Mantido igual) ---
    filteredReportData = data.filter(i => {
        const d = i.chegada || i.date || i.checkin;
        if (!d) return false;
        const ds = d.slice(0, 10);
        if (ds < s || ds > e) return false;
        if (term) { return JSON.stringify(i).toUpperCase().includes(term); }
        return true;
    });

    let html = '<table class="modern-table"><thead><tr><th style="width:40px;">#</th>';
    if (t === 'patio') html += '<th>Data</th><th>Empresa</th><th>Placa</th><th>Status</th>';
    else if (t === 'mapas') html += '<th>Data</th><th>Placa</th><th>Fornecedor</th><th>Status</th>';
    else if (t === 'materia-prima') html += '<th>Data</th><th>Produto</th><th>Placa</th><th>Líquido</th>';
    else html += '<th>Data</th><th>Motorista</th><th>Status</th>';
    html += '</tr></thead><tbody>';

    filteredReportData.forEach((i, idx) => {
        html += `<tr onclick="openReportDetails(${idx}, '${t}')" class="interactive-row">`;
        html += `<td><input type="checkbox" class="rep-check" onclick="event.stopPropagation(); toggleReportSelection('${i.id}')"></td>`;

        if (t === 'patio') html += `<td>${new Date(i.chegada).toLocaleString()}</td><td>${i.empresa}</td><td>${i.placa}</td><td>${i.status}</td>`;
        else if (t === 'mapas') html += `<td>${i.date}</td><td>${i.placa}</td><td>${i.rows[0]?.forn}</td><td>${i.launched ? 'Lançado' : 'Rascunho'}</td>`;
        else if (t === 'materia-prima') html += `<td>${new Date(i.date).toLocaleDateString()}</td><td>${i.produto}</td><td>${i.placa}</td><td>${i.liq} Kg</td>`;
        else html += `<td>${new Date(i.checkin).toLocaleString()}</td><td>${i.motorista}</td><td>${i.status}</td>`;

        html += '</tr>';
    });
    html += '</tbody></table>';

    area.innerHTML = html;
    document.getElementById('repTotalCount').innerText = filteredReportData.length;
    document.getElementById('repFooter').style.display = 'block';
}

function openReportDetails(indexOrId, typeOverride) {
    let item;
    let type = typeOverride || currentReportType;

    // Localiza o item no array filtrado
    if (type === 'divergencias-single') {
        item = filteredReportData.find(x => x.id === indexOrId);
        type = 'divergencias';
    } else {
        // Se veio por índice ou ID
        if (typeof indexOrId === 'string') {
            item = filteredReportData.find(x => x.id === indexOrId);
        } else {
            item = filteredReportData[indexOrId];
        }
    }

    if (!item) return;

    const modal = document.getElementById('modalReportDetail');
    const content = document.getElementById('repDetailContent');
    const actions = document.getElementById('repDetailActions');

    let html = '';
    let buttons = '';

    // --- 1. DETALHES DE MAPA CEGO ---
    if (type === 'mapas') {
        html = `
            <div class="detail-group">
                <p><strong>ID do Mapa:</strong> #${item.id}</p>
                <p><strong>Data:</strong> ${item.date.split('-').reverse().join('/')}</p>
                <p><strong>Placa:</strong> <span class="badge-code">${item.placa}</span></p>
                <p><strong>Setor:</strong> ${item.setor}</p>
                <p><strong>Status:</strong> ${item.launched ? '<span style="color:green">Lançado</span>' : 'Rascunho'}</p>
                ${item.divergence ? `<p style="color:red; font-weight:bold;">⚠️ Contém Divergência Ativa</p>` : ''}
            </div>
            <hr style="margin:10px 0; border-color:#eee;">
            <h5>Itens do Mapa:</h5>
            <div style="background:#f9f9f9; padding:10px; border-radius:6px; max-height:200px; overflow-y:auto;">
        `;

        if (item.rows) {
            item.rows.forEach(r => {
                if (r.desc) {
                    html += `
                    <div style="border-bottom:1px solid #e5e5e5; padding:5px 0; font-size:0.85rem;">
                        <b>${r.desc}</b><br>
                        <span style="color:#666;">NF: ${r.nf || 'S/N'} | Qtd Conferida: ${r.qty || 0}</span>
                    </div>`;
                }
            });
        }
        html += `</div>`;

        // Botão de Ação
        buttons = `<button class="btn btn-save" onclick="document.getElementById('modalReportDetail').style.display='none'; navTo('mapas'); loadMap('${item.id}')"><i class="fas fa-map"></i> ABRIR MAPA CEGO</button>`;
    }

    // --- 2. DETALHES DE DIVERGÊNCIA ---
    else if (type === 'divergencias') {
        const diffColor = item.diff > 0 ? 'green' : 'red';
        const signal = item.diff > 0 ? '+' : '';

        html = `
            <div style="text-align:center; margin-bottom:15px;">
                <h2 style="color:${diffColor}; margin:0;">${signal}${item.diff}</h2>
                <small style="color:#666; text-transform:uppercase;">Diferença Encontrada</small>
            </div>
            <div class="form-grid">
                <div><strong>Produto:</strong><br>${item.prod}</div>
                <div><strong>Fornecedor:</strong><br>${item.forn}</div>
                <div><strong>Data:</strong><br>${item.date.split('-').reverse().join('/')}</div>
                <div><strong>Nota Fiscal:</strong><br>${item.nf}</div>
            </div>
            <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin-top:15px;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Quantidade na Nota (Fiscal):</span>
                    <strong>${item.qnf}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <span>Quantidade Contada (Físico):</span>
                    <strong>${item.qc}</strong>
                </div>
            </div>
        `;

        // Botão de Ação (Leva pro mapa original)
        buttons = `<button class="btn btn-save" onclick="document.getElementById('modalReportDetail').style.display='none'; navTo('mapas'); loadMap('${item.mapId}')"><i class="fas fa-search-location"></i> VER NO MAPA</button>`;
    }

    // --- 3. DETALHES DE PESAGEM (MATÉRIA PRIMA) ---
    else if (type === 'materia-prima') {
        const difStyle = item.difKg !== 0 ? (item.difKg > 0 ? 'color:green' : 'color:red') : 'color:#666';

        html = `
            <div class="form-grid">
                <div><strong>Placa:</strong> <span class="badge-code">${item.placa}</span></div>
                <div><strong>Data:</strong> ${new Date(item.date).toLocaleDateString()}</div>
                <div class="form-full"><strong>Empresa:</strong> ${item.empresa}</div>
                <div class="form-full"><strong>Produto:</strong> ${item.produto}</div>
                <div class="form-full"><strong>Nota Fiscal:</strong> ${item.nf || 'S/N'}</div>
            </div>
            <hr style="margin:15px 0; border-color:#eee;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:#f8fafc; padding:15px; border-radius:8px;">
                <div>Tara: <b>${item.tara} Kg</b></div>
                <div>Bruto: <b>${item.bruto} Kg</b></div>
                <div style="font-size:1.1rem; color:var(--primary);">Líquido: <b>${item.liq} Kg</b></div>
                <div>Peso NF: <b>${item.pesoNF} Kg</b></div>
            </div>
            <div style="text-align:center; margin-top:15px; font-weight:bold; ${difStyle}; font-size:1.1rem;">
                Diferença: ${item.difKg} Kg (${item.difPerc}%)
            </div>
            ${item.notes ? `<p style="margin-top:15px; background:#fffbeb; padding:10px; border:1px solid #fcd34d; border-radius:4px;"><i class="fas fa-sticky-note"></i> ${item.notes}</p>` : ''}
        `;

        // Botão de Ação (Leva para a tabela filtrada na data correta)
        buttons = `<button class="btn btn-save" onclick="goToWeightView('${item.date}')"><i class="fas fa-weight"></i> IR PARA PESAGEM</button>`;
    }

    // --- 4. DETALHES DE PÁTIO/LOGÍSTICA ---
    else if (type === 'patio' || type === 'carregamento') {
        const isPatio = type === 'patio';
        html = `
            <div class="form-grid">
                <div><strong>Placa:</strong> <span class="badge-code">${item.placa || item.carretas}</span></div>
                <div><strong>Status:</strong> ${item.status}</div>
                <div class="form-full"><strong>Empresa/Mot:</strong> ${item.empresa || item.motorista}</div>
                <div><strong>Chegada/Check-in:</strong><br> ${new Date(item.chegada || item.checkin).toLocaleString()}</div>
                <div><strong>Saída/Fim:</strong><br> ${item.saida || item.checkout ? new Date(item.saida || item.checkout).toLocaleString() : '-'}</div>
            </div>
        `;

        if (isPatio && item.cargas) {
            html += `<hr style="margin:15px 0;"><h5>Cargas:</h5><ul style="list-style:none; padding:0;">`;
            item.cargas[0].produtos.forEach(p => {
                html += `<li style="padding:5px 0; border-bottom:1px dashed #eee;">${p.nome} (NF: ${p.nf})</li>`;
            });
            html += `</ul>`;
        }

        buttons = `<button class="btn btn-edit" onclick="document.getElementById('modalReportDetail').style.display='none'"><i class="fas fa-check"></i> OK</button>`;
    }

    content.innerHTML = html;
    actions.innerHTML = buttons;
    modal.style.display = 'flex';
}

// --- FUNÇÃO AUXILIAR: IR PARA PESAGEM ---
function goToWeightView(dateStr) {
    // 1. Fecha o modal
    document.getElementById('modalReportDetail').style.display = 'none';

    // 2. Navega para a tela
    navTo('materia-prima');

    // 3. Define a data no filtro
    // O formato deve ser YYYY-MM-DD. Se vier ISO completo, cortamos.
    const cleanDate = dateStr.split('T')[0];
    const dateInput = document.getElementById('mpDateFilter');

    if (dateInput) {
        dateInput.value = cleanDate;
        // 4. Força a renderização da tabela com a nova data
        renderMateriaPrima();
    }
}

function exportReportToPDF() {
    if (filteredReportData.length === 0) return alert('Gere o relatório primeiro.');
    let dataToPrint = filteredReportData;
    if (selectedReportItems.size > 0) { dataToPrint = filteredReportData.filter(i => selectedReportItems.has(i.id)); }
    const { jsPDF } = window.jspdf;

    if (currentReportType === 'mapas') {
        const doc = new jsPDF({ orientation: 'portrait' }); let y = 10;
        dataToPrint.forEach((m, i) => { if (i > 0 && i % 2 === 0) { doc.addPage(); y = 10; } drawSheetVisual(doc, m, 10, y); y += 145; });
        doc.save('Mapas_Cegos.pdf');
    } else if (currentReportType === 'divergencias') {
        const doc = new jsPDF({ orientation: 'portrait' }); doc.setFontSize(16); doc.text("Relatório de Divergências", 10, 15); doc.setFontSize(10); let y = 25;
        dataToPrint.forEach(d => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(245, 245, 245); doc.rect(10, y, 190, 20, 'F');
            doc.text(`${d.date} | ${d.forn}`, 15, y + 5);
            doc.setFont("helvetica", "bold"); doc.text(`PRODUTO: ${d.prod} (NF: ${d.nf})`, 15, y + 12); doc.text(`DIFERENÇA: ${d.diff}`, 150, y + 12); doc.setFont("helvetica", "normal"); y += 25;
        });
        doc.save('Divergencias.pdf');
    } else {
        const doc = new jsPDF({ orientation: 'landscape' }); doc.text("Relatório - " + currentReportType.toUpperCase(), 10, 10); let y = 20;
        dataToPrint.forEach(i => {
            if (y > 190) { doc.addPage(); y = 20; }
            let line = "";
            if (currentReportType === 'patio') line = `${i.chegada.slice(0, 16)} | ${i.empresa} | ${i.placa} | ${i.status}`;
            else if (currentReportType === 'materia-prima') line = `${i.date} | ${i.produto} | ${i.placa} | Liq: ${i.liq}`;
            else if (currentReportType === 'carregamento') line = `${i.checkin.slice(0, 16)} | ${i.motorista} | ${i.cavalo} | ${i.status}`;
            doc.text(line, 10, y); y += 7;
        });
        doc.save('Relatorio_Geral.pdf');
    }
}

function drawSheetVisual(doc, m, x, y) {
    const w = 190; const h = 135;
    doc.setDrawColor(100); doc.setFillColor(255, 255, 255); doc.rect(x, y, w, h, 'FD');
    doc.addImage('https://www.alimentoswilson.com.br/imgs/logo-wilson.png', 'PNG', x + 5, y + 5, 20, 10);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("RECEBIMENTO DIÁRIO - MAPA CEGO", x + 30, y + 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Data: ${m.date}`, x + 150, y + 12);
    let ty = y + 20; doc.setFillColor(50, 50, 50); doc.rect(x + 5, ty, w - 10, 8, 'F'); doc.setTextColor(255); doc.setFontSize(8);
    doc.text("DESCRIÇÃO", x + 7, ty + 5); doc.text("QTD NF", x + 80, ty + 5); doc.text("QTD CONT", x + 100, ty + 5); doc.text("NF", x + 120, ty + 5); doc.text("FORNECEDOR", x + 145, ty + 5); doc.setTextColor(0);
    ty += 8;
    for (let i = 0; i < 6; i++) {
        const r = m.rows[i] || {}; doc.rect(x + 5, ty, w - 10, 8);
        if (r.desc) { doc.text(r.desc.substring(0, 40), x + 7, ty + 5); doc.text(r.qty_nf.toString(), x + 80, ty + 5); doc.text(r.qty.toString(), x + 100, ty + 5); doc.text(r.nf.toString(), x + 120, ty + 5); doc.text(r.forn.substring(0, 15), x + 145, ty + 5); }
        ty += 8;
    }
    let fy = y + 100; doc.setFont("helvetica", "bold"); doc.text(`Setor: ${m.setor}`, x + 10, fy); doc.text(`Placa: ${m.placa}`, x + 10, fy + 10);
    doc.rect(x + 80, fy - 5, 100, 20); doc.setFontSize(7); doc.text("ASS. RECEBIMENTO", x + 82, fy); doc.text(m.signatures.receb || "__________________", x + 82, fy + 10); doc.text("ASS. CONFERENTE", x + 135, fy); doc.text(m.signatures.conf || "__________________", x + 135, fy + 10);
}

// --- SYSTEM & STORAGE ---

function toggleDarkMode() { const c = document.getElementById('darkModeToggle').checked; if (c) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode'); localStorage.setItem('aw_dark_mode', c); }
function backupData() { const d = { patio: patioData, mapas: mapData, mp: mpData, carr: carregamentoData, req: requests }; const a = document.createElement('a'); a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d)); a.download = 'backup.json'; a.click(); }
function restoreData(i) { const f = i.files[0]; const r = new FileReader(); r.onload = e => { const d = JSON.parse(e.target.result); if (confirm('Restaurar?')) { if (d.patio) localStorage.setItem('aw_caminhoes_v2', JSON.stringify(d.patio)); if (d.mapas) localStorage.setItem('mapas_cegos_v3', JSON.stringify(d.mapas)); if (d.mp) localStorage.setItem('aw_materia_prima', JSON.stringify(d.mp)); if (d.carr) localStorage.setItem('aw_carregamento', JSON.stringify(d.carr)); window.location.reload(); } }; r.readAsText(f); }
function clearAllData() {
    if (confirm('PERIGO: Isso apagará TODOS os dados de TODOS os computadores.\n\nTem certeza absoluta?')) {
        fetch(`${API_URL}/api/reset`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Sistema resetado com sucesso!');
                } else {
                    alert('Erro ao tentar resetar o servidor.');
                }
            })
            .catch(error => {
                console.error("Erro:", error);
                alert('Erro de conexão ao tentar resetar.');
            });
    }
}
function closeContextMenu() { document.querySelectorAll('.context-menu').forEach(x => x.style.display = 'none'); }
function toggleFastMode() {
    const isChecked = document.getElementById('fastModeToggle').checked;
    if (isChecked) {
        document.body.classList.add('fast-mode');
    } else {
        document.body.classList.remove('fast-mode');
    }
    localStorage.setItem('aw_fast_mode', isChecked);
}
// =========================================================
// CORREÇÃO: LÓGICA DE SALVAMENTO ROBUSTA (LOCAL FIRST)
// =========================================================
function saveAll() {
    saveToLocalOnly();
    // Salvar no servidor (Dados Transacionais)
    saveToServer('aw_caminhoes_v2', patioData);
    saveToServer('mapas_cegos_v3', mapData);
    saveToServer('aw_materia_prima', mpData);
    saveToServer('aw_carregamento', carregamentoData);
    saveToServer('aw_requests', requests);
    saveToServer('mapa_cego_users', usersData);

    // Salvar no servidor (Dados Relacionais NOVOS)
    saveToServer('aw_suppliers', suppliersData);
    saveToServer('aw_carriers', carriersData);
    saveToServer('aw_drivers', driversData);
    saveToServer('aw_plates', platesData);
    saveToServer('aw_products', productsData);
}

function saveToServer(key, data) {
    fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, data: data })
    }).catch(err => console.error("Erro ao salvar no servidor (pode estar offline):", err));
}

function saveToLocalOnly() {
    try {
        localStorage.setItem('aw_caminhoes_v2', JSON.stringify(patioData));
        localStorage.setItem('mapas_cegos_v3', JSON.stringify(mapData));
        localStorage.setItem('aw_materia_prima', JSON.stringify(mpData));
        localStorage.setItem('aw_carregamento', JSON.stringify(carregamentoData));
        localStorage.setItem('aw_requests', JSON.stringify(requests));
        localStorage.setItem('mapa_cego_users', JSON.stringify(usersData));

        // Novos
        localStorage.setItem('aw_suppliers', JSON.stringify(suppliersData));
        localStorage.setItem('aw_carriers', JSON.stringify(carriersData));
        localStorage.setItem('aw_drivers', JSON.stringify(driversData));
        localStorage.setItem('aw_plates', JSON.stringify(platesData));
        localStorage.setItem('aw_products', JSON.stringify(productsData));
    } catch (e) { console.error("Erro ao salvar local:", e); }
}
function manualRequestPermission() {
    if (!("Notification" in window)) {
        alert("Este navegador não suporta notificações de sistema.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            playBeep();
            const notif = new Notification("Configuração", {
                body: "Notificações ativadas com sucesso!",
                icon: '../Imgs/logo-sf.png'
            });
        } else {
            alert("Permissão para notificações foi negada ou bloqueada pelo navegador.");
        }
    });
}

// --- SETUP GLOBAL E EVENTOS DE JANELA ---

window.onclick = function (event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = "none";
    }
    if (!event.target.closest('.context-menu') && !event.target.closest('.interactive-row') && !event.target.closest('.mc-item') && !event.target.closest('.truck-card')) {
        closeContextMenu();
    }
};

// --- INICIALIZAÇÃO DO SISTEMA ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Wilson Core 2.0: Inicializando...");
    initRoleBasedUI();

    let lastView = localStorage.getItem('aw_last_view') || 'patio';
    
    // Redireciona almoxarifado se a última visualização foi cadastros
    if (lastView === 'cadastros' && typeof userSubType !== 'undefined' && userSubType === 'ALM') {
        lastView = 'patio';
    }

    if (typeof loggedUser !== 'undefined' && loggedUser) {
        navTo(lastView, null);
    }

    const clockEl = document.getElementById('serverTime');
    if (clockEl) {
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }, 1000);
    }
});

// --- DASHBOARD INTELIGENTE 2.0 (COM PERSISTÊNCIA) ---

let dashboardCharts = [null, null, null, null];
let currentLayoutConfig = [null, null, null, null];
function initDashboard() {
    loadSavedLayout();
}

// 1. Função chamada pelos botões "Slot X"
async function addToSlot(slotIndex) {
    const filters = {
        from: document.getElementById('dashFrom').value,
        to: document.getElementById('dashTo').value,
        product: document.getElementById('dashProduct').value,
        plate: document.getElementById('dashPlate').value,
        sector: document.getElementById('dashSector').value
    };
    currentLayoutConfig[slotIndex] = filters;
    await fetchAndRenderSlot(slotIndex, filters);
}

// 2. Busca dados e desenha
async function fetchAndRenderSlot(slotIndex, filters) {
    const slotEl = document.getElementById(`slot-${slotIndex}`);
    slotEl.classList.remove('empty');
    slotEl.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary)"></i></div>`;

    try {
        // Tenta buscar no servidor se possível
        let data = { rows: [], totalAmount: 0 };
        const token = sessionStorage.getItem('aw_token');

        try {
            const response = await fetch(`${API_URL}/api/dashboard/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
                body: JSON.stringify(filters)
            });
            if (response.ok) {
                data = await response.json();
            } else {
                throw new Error("Offline");
            }
        } catch (e) {
            // Fallback Local se o servidor falhar
            const fromDate = filters.from || '';
            const toDate = filters.to || '';
            const pRows = [];
            patioData.forEach(p => {
                const date = (p.chegada || p.date || '').slice(0, 10);
                const plateVal = p.placa || p.plate || '';
                const products = (p.cargas && p.cargas.length) ? p.cargas.flatMap(c => c.produtos ? c.produtos.map(x => x.nome || x) : [c.produto || '']) : (p.product ? [p.product] : []);
                const productMatch = !filters.product || products.join(' ').toLowerCase().includes((filters.product || '').toLowerCase());
                const plateMatch = !filters.plate || plateVal.toLowerCase().includes((filters.plate || '').toLowerCase());
                const dateOK = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
                if (productMatch && plateMatch && dateOK) {
                    pRows.push({ product: products.join(', '), plate: plateVal, date, sector: p.localSpec || p.local || p.sector || '', amount: p.cargas ? p.cargas.length : (p.amount || 0), divergence: p.divergence || false });
                }
            });
            data = { rows: pRows, totalAmount: pRows.length };
        }

        renderSlotCard(slotIndex, data, filters);

    } catch (error) {
        console.error(error);
        slotEl.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Erro ao carregar slot ${slotIndex + 1} <br><small>${error.message}</small> <br> <button class="btn btn-small" onclick="clearSlot(${slotIndex})">Limpar</button></div>`;
    }
}

// 3. Renderiza o HTML e o Gráfico
function renderSlotCard(index, data, filters) {
    const rows = data.rows || [];
    const total = data.totalAmount || 0;
    const slotEl = document.getElementById(`slot-${index}`);
    const isDivergence = filters.type === 'divergence';

    let title = filters.product ? filters.product.toUpperCase() : "VISÃO GERAL";
    if (isDivergence) title += " (DIVERGÊNCIAS)";
    else if (filters.plate) title += ` (${filters.plate})`;

    let chartConfig = {};

    if (isDivergence) {
        const prodDiffs = {};
        rows.forEach(r => {
            const diff = parseFloat(r.diff) || 0;
            if (diff !== 0) {
                const label = r.product || 'Indefinido';
                prodDiffs[label] = (prodDiffs[label] || 0) + diff;
            }
        });
        const labels = Object.keys(prodDiffs);
        const values = Object.values(prodDiffs);
        const bgColors = values.map(v => v > 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)');

        chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Diferença',
                    data: values,
                    backgroundColor: bgColors,
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        };
    } else {
        const dateCounts = {};
        rows.forEach(r => {
            const d = r.date ? r.date.split('-').slice(1).reverse().join('/') : 'ND';
            dateCounts[d] = (dateCounts[d] || 0) + (r.amount || 1);
        });
        const labels = Object.keys(dateCounts).sort();
        const values = labels.map(d => dateCounts[d]);

        chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Volume',
                    data: values,
                    borderColor: 'rgba(21, 101, 192, 1)',
                    backgroundColor: 'rgba(21, 101, 192, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        };
    }

    slotEl.innerHTML = `
        <div class="card-header">
            <div class="card-title">
                <h4>${title}</h4>
                <span>${filters.sector || 'Todos Setores'} • ${rows.length} registros</span>
            </div>
            <button onclick="clearSlot(${index})" class="btn-icon-remove"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
            <div class="kpi-row">
                <div class="kpi-box">
                    <div class="kpi-val">${total}</div>
                    <div class="kpi-lbl">${isDivergence ? 'Ocorrências' : 'Qtd. Itens'}</div>
                </div>
            </div>
            <div class="chart-container" style="height: 120px; min-height:120px; width:100%;">
                <canvas id="chart-canvas-${index}"></canvas>
            </div>
        </div>
    `;

    const ctx = document.getElementById(`chart-canvas-${index}`).getContext('2d');
    if (dashboardCharts[index]) dashboardCharts[index].destroy();
    dashboardCharts[index] = new Chart(ctx, chartConfig);
}

function clearSlot(index) {
    if (dashboardCharts[index]) {
        dashboardCharts[index].destroy();
        dashboardCharts[index] = null;
    }
    currentLayoutConfig[index] = null;
    const slotEl = document.getElementById(`slot-${index}`);
    slotEl.classList.add('empty');
    slotEl.innerHTML = `<div class="empty-state"><i class="fas fa-plus-circle"></i><p>Slot Vazio</p></div>`;
}

function clearDashboard() {
    for (let i = 0; i < 4; i++) clearSlot(i);
}

async function saveDashboardLayout() {
    const isEmpty = currentLayoutConfig.every(x => x === null);
    if (isEmpty) return alert("O dashboard está vazio.");
    const token = sessionStorage.getItem('aw_token');
    try {
        const username = loggedUser ? loggedUser.username : 'local';
        localStorage.setItem(`dashboard_layout_${username}`, JSON.stringify(currentLayoutConfig));
        console.log("Salvo localmente com sucesso.");
    } catch (e) { console.warn("Erro ao salvar local:", e); }

    if (!token) return alert("Salvo apenas neste computador (Local).");
    try {
        await fetch(`${API_URL}/api/dashboard/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ layout: currentLayoutConfig })
        });
        alert("Layout salvo no SERVIDOR!");
    } catch (e) {
        alert("Erro ao conectar no servidor. Salvo apenas localmente.");
    }
}

async function loadSavedLayout() {
    const token = sessionStorage.getItem('aw_token');
    let loadedData = null;
    if (token) {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/layout`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (response.ok) {
                const data = await response.json();
                if (data.layout) loadedData = data.layout;
            }
        } catch (e) { }
    }
    if (!loadedData) {
        const username = loggedUser ? loggedUser.username : 'local';
        const local = localStorage.getItem(`dashboard_layout_${username}`);
        if (local) loadedData = JSON.parse(local);
    }

    if (loadedData && Array.isArray(loadedData)) {
        currentLayoutConfig = loadedData;
        for (let i = 0; i < 4; i++) {
            if (loadedData[i]) setTimeout(() => fetchAndRenderSlot(i, loadedData[i]), 100);
            else clearSlot(i);
        }
    }
}
// =========================================================
// MÓDULO DE PESAGEM MANUAL INTELIGENTE
// =========================================================

// Variáveis de Estado para Pesagem Manual
let mwState = {
    supId: null,
    motId: null,
    plateId: null,
    prodExists: false
};

function openManualWeighingModal() {
    // Reset
    mwState = { supId: null, motId: null, plateId: null, prodExists: false };
    ['mwForn', 'mwProd', 'mwMot', 'mwPlaca', 'mwNF', 'mwPesoNF'].forEach(id => {
        document.getElementById(id).value = '';
        document.getElementById(id).classList.remove('input-warning');
    });

    document.getElementById('mwWarningBox').style.display = 'none';
    document.getElementById('btnSaveMW').style.display = 'inline-block';
    document.getElementById('btnReqMW').style.display = 'none';

    // Popula Datalists (Reaproveita os globais)
    populateDatalist('dlForn', suppliersData);
    populateDatalist('dlPlaca', platesData, 'numero');
    populateDatalist('dlMot', driversData);
    populateDatalist('prodListSuggestions', productsData);

    document.getElementById('modalManualWeighing').style.display = 'flex';
}

function filterWeighingChain(step) {
    const inForn = document.getElementById('mwForn');
    const inProd = document.getElementById('mwProd');
    const inPlaca = document.getElementById('mwPlaca');
    const inMot = document.getElementById('mwMot');

    // 1. Verificar Fornecedor
    if (step === 'fornecedor' || !step) {
        const val = inForn.value.toUpperCase();
        const found = suppliersData.find(s => s.nome === val);
        mwState.supId = found ? found.id : null;
        checkFieldStatus('mwForn', mwState.supId);
    }

    // 2. Verificar Produto
    if (step === 'produto' || !step) {
        const val = inProd.value.toUpperCase();
        const found = productsData.find(p => p.nome === val);
        mwState.prodExists = !!found;
        // Marca aviso se tem texto mas não existe
        if (val && !found) inProd.classList.add('input-warning');
        else inProd.classList.remove('input-warning');
    }

    // 3. Verificar Placa
    if (step === 'placa' || !step) {
        let txt = inPlaca.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (txt.length > 3 && !txt.includes('-')) txt = txt.substring(0, 3) + '-' + txt.substring(3);
        inPlaca.value = txt;

        const found = platesData.find(p => p.numero === txt);
        mwState.plateId = found ? found.id : null;
        checkFieldStatus('mwPlaca', mwState.plateId);
    }

    // 4. Verificar Motorista (Opcional, mas checa se digitado)
    if (step === 'motorista' || !step) {
        const val = inMot.value.toUpperCase();
        if (val) {
            const found = driversData.find(d => d.nome === val);
            mwState.motId = found ? found.id : null;
            checkFieldStatus('mwMot', mwState.motId);
        } else {
            mwState.motId = null; // Vazio é ok
            inMot.classList.remove('input-warning');
        }
    }

    // Avaliação Geral para Requisição
    const isNewForn = inForn.value && !mwState.supId;
    const isNewProd = inProd.value && !mwState.prodExists;
    const isNewPlaca = inPlaca.value && !mwState.plateId;
    const isNewMot = inMot.value && !mwState.motId;

    const warnBox = document.getElementById('mwWarningBox');
    const btnSave = document.getElementById('btnSaveMW');
    const btnReq = document.getElementById('btnReqMW');

    if (isNewForn || isNewProd || isNewPlaca || isNewMot) {
        warnBox.style.display = 'block';
        btnSave.style.display = 'none';
        btnReq.style.display = 'inline-block';
    } else {
        warnBox.style.display = 'none';
        btnSave.style.display = 'inline-block';
        btnReq.style.display = 'none';
    }
}

function saveManualWeighing() {
    const forn = document.getElementById('mwForn').value.toUpperCase();
    const prod = document.getElementById('mwProd').value.toUpperCase();
    const placa = document.getElementById('mwPlaca').value.toUpperCase();
    const nf = document.getElementById('mwNF').value;
    const pesoNF = parseFloat(document.getElementById('mwPesoNF').value) || 0;

    if (!forn || !prod || !placa) return alert("Preencha Fornecedor, Produto e Placa.");

    const id = 'MAN_' + Date.now();
    const todayStr = getBrazilTime().split('T')[0];

    mpData.push({
        id: id,
        date: todayStr,
        produto: prod,
        empresa: forn,
        placa: placa,
        local: 'MANUAL',
        chegada: getBrazilTime(), // Horário Corrigido
        entrada: getBrazilTime(), // Horário Corrigido
        tara: 0,
        bruto: 0,
        liq: 0,
        pesoNF: pesoNF,
        difKg: 0,
        difPerc: 0,
        nf: nf || 'S/N',
        notes: 'Pesagem Manual',
        isManual: true
    });

    saveAll();
    document.getElementById('modalManualWeighing').style.display = 'none';
    renderMateriaPrima();
    alert("Pesagem manual lançada!");
}

function submitWeighingRequest() {
    const forn = document.getElementById('mwForn').value.toUpperCase();
    const prod = document.getElementById('mwProd').value.toUpperCase();
    const placa = document.getElementById('mwPlaca').value.toUpperCase();
    const mot = document.getElementById('mwMot').value.toUpperCase();

    // Lista de produtos novos (se houver)
    const newProducts = !mwState.prodExists ? [prod] : [];

    const reqId = 'REQ_MW_' + Date.now();

    // 1. Cria Requisição Unificada
    requests.push({
        id: reqId,
        type: 'complex_entry', // Reusa o tipo para aparecer no modal unificado
        status: 'PENDENTE',
        user: (typeof loggedUser !== 'undefined' ? loggedUser.username : 'Portaria'),
        timestamp: getBrazilTime(),
        data: {
            supplier: { name: forn, id: mwState.supId },
            carrier: { name: forn, id: null },
            driver: { name: mot, id: mwState.motId },
            plate: { number: placa, id: mwState.plateId },
            newProducts: newProducts
        }
    });

    // 2. Cria a Pesagem "Pendente"
    const id = 'MAN_' + Date.now();
    const todayStr = getBrazilTime().split('T')[0];
    const nf = document.getElementById('mwNF').value;
    const pesoNF = parseFloat(document.getElementById('mwPesoNF').value) || 0;

    mpData.push({
        id: id,
        date: todayStr,
        produto: prod,
        empresa: forn, // Nome visual provisório
        placa: placa,
        local: 'MANUAL',
        chegada: getBrazilTime(),
        entrada: getBrazilTime(),
        tara: 0, bruto: 0, liq: 0, pesoNF: pesoNF,
        nf: nf || 'S/N',
        notes: 'Aguardando Cadastro (Req)',
        isManual: true,
        linkedRequestId: reqId
    });

    saveAll();
    document.getElementById('modalManualWeighing').style.display = 'none';
    renderMateriaPrima();
    sendSystemNotification(
        "Requisição de Pesagem",
        "Cadastro pendente para pesagem manual.",
        "materia-prima",
        null,
        {
            icon: '../Imgs/logo-sf.png'
        }
    )
    alert("Pesagem lançada. Requisição de cadastro enviada para aprovação.");
}