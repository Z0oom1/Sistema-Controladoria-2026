// =========================================================
// MÓDULO DE INICIALIZAÇÃO DE INTERFACE E NAVEGAÇÃO - OTIMIZADO
// =========================================================

/**
 * Cache de elementos DOM para evitar múltiplas buscas
 */
class DOMCache {
    constructor() {
        this.cache = new Map();
    }

    get(id) {
        if (!this.cache.has(id)) {
            this.cache.set(id, document.getElementById(id));
        }
        return this.cache.get(id);
    }

    clear() {
        this.cache.clear();
    }
}

const domCache = new DOMCache();

/**
 * Inicializa a interface com base nas permissões do utilizador (Role-Based UI)
 * Otimizado com cache de elementos
 */
window.initRoleBasedUI = function() {
    // Aplicar preferências de tema/modo
    if (localStorage.getItem('aw_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        const tg = domCache.get('darkModeToggle');
        if (tg) tg.checked = true;
    }
    
    if (localStorage.getItem('aw_fast_mode') === 'true') {
        document.body.classList.add('fast-mode');
        const ftg = domCache.get('fastModeToggle');
        if (ftg) ftg.checked = true;
    }

    // Restrições para Conferentes
    const isConf = typeof isConferente !== 'undefined' && isConferente;
    const fabAddTruck = domCache.get('fabAddTruck');
    const menuCarregamento = domCache.get('menuCarregamento');
    
    if (fabAddTruck) fabAddTruck.style.display = isConf ? 'none' : 'flex';
    if (menuCarregamento) menuCarregamento.style.display = isConf ? 'none' : 'flex';

    // Visibilidade do menu de Matéria-Prima
    const mmp = domCache.get('menuMateriaPrima');
    const isRec = typeof isRecebimento !== 'undefined' ? isRecebimento : false;
    if (mmp) mmp.style.display = isRec ? 'flex' : 'none';

    // Visibilidade do Dashboard (Encarregados e Admins)
    const perms = window.userPermissions || {};
    const menuDash = domCache.get('menuDashboard');
    const isEnc = typeof isEncarregado !== 'undefined' ? isEncarregado : false;
    const isAdm = typeof isAdmin !== 'undefined' ? isAdmin : false;
    const canViewReports = perms.canViewReports !== undefined ? perms.canViewReports : (isEnc || isAdm);
    if (menuDash) menuDash.style.display = canViewReports ? 'flex' : 'none';

    const menuRelatorios = domCache.get('menuRelatorios');
    if (menuRelatorios) menuRelatorios.style.display = canViewReports ? 'flex' : 'none';

    // Controle de acesso ao menu de cadastros
    const menuCadastros = domCache.get('menuCadastros');
    const canManageCatalogs = perms.canManageCatalogs !== undefined ? perms.canManageCatalogs : (isRec || isAdm);
    if (menuCadastros) {
        menuCadastros.style.display = canManageCatalogs ? 'flex' : 'none';
    }

    // Controle de acesso ao menu de notificações
    const menuNotif = domCache.get('menuNotif');
    const canViewNotifications = perms.canViewNotifications !== undefined ? perms.canViewNotifications : (isRec || isAdm);
    if (menuNotif) {
        menuNotif.style.display = canViewNotifications ? 'flex' : 'none';
    }

    // Controle de acesso ao Painel Admin
    const menuAdmin = domCache.get('menuAdmin');
    if (menuAdmin) {
        menuAdmin.style.display = isAdm ? 'flex' : 'none';
    }

    // Antigo botão de Perfis desabilitado
    const tabPerfis = document.getElementById('tabPerfis');
    if (tabPerfis) tabPerfis.style.display = 'none';

    // Lógica de colunas por Subtipo de utilizador
    if (isConf && typeof userSubType !== 'undefined' && userSubType) {
        const cA = domCache.get('col-ALM');
        const cG = domCache.get('col-GAVA');
        const cO = domCache.get('col-OUT');

        // Resetar visibilidade
        [cA, cG, cO].forEach(col => {
            if (col) col.style.display = 'none';
        });

        // Aplicar visibilidade específica
        if (userSubType === 'ALM') {
            if (cA) cA.style.display = 'flex';
            if (cG) cG.style.display = 'flex';
        } else if (userSubType === 'GAVA') {
            if (cG) cG.style.display = 'flex';
        } else {
            if (cO) cO.style.display = 'flex';
            const subTypeNames = {
                'INFRA': 'INFRAESTRUTURA',
                'MANUT': 'MANUTENÇÃO',
                'LAB': 'LABORATÓRIO',
                'PESAGEM': 'PESAGEM',
                'SST': 'SST',
                'CD': 'CD',
                'COMPRAS': 'COMPRAS'
            };
            const tit = cO?.querySelector('.col-header');
            if (tit && subTypeNames[userSubType]) {
                tit.innerHTML = `${subTypeNames[userSubType]} <span id="count-OUT">0</span>`;
            }
        }
    }

    // Inicializar campos de data com a data atual do Brasil
    const dateFields = ['patioDateFilter', 'mapDate', 'mpDateFilter', 'carrDateFilter', 'mapListDateFilter', 'repDateStart', 'repDateEnd'];
    const brazilDate = window.getBrazilTime().split('T')[0];
    dateFields.forEach(id => {
        const el = domCache.get(id);
        if (el) el.value = brazilDate;
    });

    // Atualizar avatar do rodapé da barra lateral se disponível
    if (typeof window.updateSidebarAvatar === 'function') {
        window.updateSidebarAvatar();
    }

    // Relógio do Servidor (com interval otimizado)
    let clockInterval = null;
    const startClock = () => {
        const el = domCache.get('serverTime');
        if (el && !clockInterval) {
            clockInterval = setInterval(() => {
                el.textContent = new Date().toLocaleTimeString();
            }, 1000);
        }
    };
    
    // Iniciar relógio quando visível
    if (document.visibilityState === 'visible') {
        startClock();
    }
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startClock();
        } else if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
        }
    });
};

/**
 * Mapa de títulos para views
 */
const VIEW_TITLES = {
    patio: 'Controle de Pátio',
    mapas: 'Mapas Cegos',
    relatorios: 'Relatórios',
    notificacoes: 'Notificações',
    cadastros: 'Cadastros Gerais',
    produtos: 'Catálogo de Produtos',
    'materia-prima': 'Matéria Prima',
    'carregamento': 'Carregamento',
    'configuracoes': 'Configurações',
    'perfil': 'Área do Usuário',
    'admin': 'Painel Administrativo',
    'chat': 'Chat',
    'dashboard': 'Dashboard'
};

/**
 * Mapa de handlers de renderização por view
 */
const VIEW_HANDLERS = {
    'cadastros': () => {
        if (typeof userSubType !== 'undefined' && userSubType === 'ALM') {
            window.navTo('patio', null);
        } else if (typeof window.renderCadastros === 'function') {
            window.renderCadastros();
        }
    },
    'patio': () => typeof window.renderPatio === 'function' && window.renderPatio(),
    'mapas': () => {
        if (typeof window.renderMapList === 'function') {
            window.renderMapList();
            if (typeof window.updateMapState === 'function') {
                window.updateMapState();
            }
        }
    },
    'materia-prima': () => typeof window.renderMateriaPrima === 'function' && window.renderMateriaPrima(),
    'carregamento': () => typeof window.renderCarregamento === 'function' && window.renderCarregamento(),
    'notificacoes': () => typeof window.renderRequests === 'function' && window.renderRequests(),
    'perfil': () => typeof window.renderProfileArea === 'function' && window.renderProfileArea(),
    'admin': () => typeof window.renderAdminDashboard === 'function' && window.renderAdminDashboard(),
    'chat': () => typeof window.renderChat === 'function' && window.renderChat(),
    'dashboard': () => typeof window.renderDashboard === 'function' && window.renderDashboard(),
    'produtos': () => typeof window.renderProductsView === 'function' && window.renderProductsView(),
    'configuracoes': () => typeof window.updatePermissionStatus === 'function' && window.updatePermissionStatus()
};

/**
 * Função principal de navegação entre as secções da App
 * Otimizada com cache e menos manipulação de DOM
 */
window.navTo = function(view, el) {
    const perms = window.userPermissions || {};

    if (view === 'cadastros') {
        const canAccess = perms.canManageCatalogs !== undefined ? perms.canManageCatalogs : (window.isRecebimento || window.isAdmin);
        if (!canAccess) {
            alert('Acesso negado: Você não tem permissão para acessar cadastros.');
            return;
        }
    }
    if (view === 'notificacoes') {
        const canAccess = perms.canViewNotifications !== undefined ? perms.canViewNotifications : (window.isRecebimento || window.isAdmin);
        if (!canAccess) {
            alert('Acesso negado: Você não tem permissão para acessar notificações.');
            return;
        }
    }
    if (view === 'relatorios' || view === 'dashboard') {
        const canAccess = perms.canViewReports !== undefined ? perms.canViewReports : (window.isAdmin || window.isEncarregado);
        if (!canAccess) {
            alert('Acesso negado: Você não tem permissão para acessar relatórios ou dashboards.');
            return;
        }
    }
    if (view === 'admin') {
        if (!window.isAdmin) {
            alert('Acesso negado: Apenas Administradores têm permissão para acessar o Painel Admin.');
            return;
        }
    }

    // Remover classe active de todas as views e menu items
    document.querySelectorAll('.view-section.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-item.active').forEach(m => m.classList.remove('active'));

    // Adicionar classe active à view selecionada
    const viewElement = domCache.get('view-' + view);
    if (viewElement) viewElement.classList.add('active');

    // Adicionar classe active ao menu item
    if (el) {
        el.classList.add('active');
    } else {
        const link = document.querySelector(`.menu-item[onclick*="'${view}'"]`);
        if (link) link.classList.add('active');
    }

    // Fechar menu mobile
    const mainSide = document.querySelector('.main-sidebar');
    if (mainSide) mainSide.classList.remove('show-mobile');

    // Atualizar títulos
    const title = VIEW_TITLES[view] || 'Home Page';
    const pt = domCache.get('pageTitle');
    if (pt) pt.textContent = title;

    const appTitle = document.querySelector('.app-title');
    if (appTitle) appTitle.innerText = `CONTROLADORIA AW - ${title.toUpperCase()}`;

    // Executar handler de renderização
    const handler = VIEW_HANDLERS[view];
    if (handler) handler();

    // --- Controle de visibilidade dos FABs globais ---
    const fabPesagem = document.getElementById('fabPesagem');
    const fabCarregamento = document.getElementById('fabCarregamento');
    if (fabPesagem) fabPesagem.style.display = (view === 'materia-prima') ? 'flex' : 'none';
    if (fabCarregamento) fabCarregamento.style.display = (view === 'carregamento') ? 'flex' : 'none';

    // Salvar última view
    localStorage.setItem('aw_last_view', view);
};

/**
 * Alterna menu mobile
 */
window.toggleMobileMenu = function() { 
    const sb = document.querySelector('.main-sidebar'); 
    if (sb) sb.classList.toggle('show-mobile'); 
};

/**
 * Alterna lista de mapas mobile
 */
window.toggleMapListMobile = function() { 
    const mm = domCache.get('mobileMapList');
    if (mm) mm.classList.toggle('open'); 
};

window.logout = function() { 
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('aw_token');
    domCache.clear();
    if (window.location.protocol === 'file:') {
        window.location.href = 'login.html'; 
    } else {
        window.location.href = '/login'; 
    }
};

/**
 * Fecha todos os menus de contexto
 */
window.closeContextMenu = function() {
    const menuIds = ['ctxMenu', 'ctxMenuMP', 'ctxMenuTruck', 'ctxMenuCarr', 'ctxMenuCad'];
    menuIds.forEach(id => {
        const el = domCache.get(id);
        if (el) el.style.display = 'none';
    });
};

/**
 * Event listener para fechar menus ao clicar fora
 * Usando event delegation para melhor performance
 */
document.addEventListener('click', (e) => {
    // Verificar se clicou fora de um menu
    const menus = document.querySelectorAll('[id^="ctxMenu"]');
    let clickedMenu = false;
    
    for (const menu of menus) {
        if (menu.contains(e.target)) {
            clickedMenu = true;
            break;
        }
    }
    
    if (!clickedMenu) {
        window.closeContextMenu();
    }
}, { passive: true });
