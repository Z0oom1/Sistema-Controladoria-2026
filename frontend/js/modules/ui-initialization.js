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

    // Aplicar estado do menu lateral colapsado
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
        const sidebar = document.querySelector('.main-sidebar');
        const content = document.querySelector('.content-area');
        const toggleIcon = document.getElementById('sidebarToggleIcon');
        if (sidebar && content) {
            sidebar.classList.add('collapsed');
            content.classList.add('collapsed');
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
        }
    }
    
    if (localStorage.getItem('aw_fast_mode') === 'true') {
        document.body.classList.add('fast-mode');
        const ftg = domCache.get('fastModeToggle');
        if (ftg) ftg.checked = true;
    }

    const perms = window.userPermissions || {};
    const isConf = typeof isConferente !== 'undefined' && isConferente;
    const isAdm = typeof isAdmin !== 'undefined' ? isAdmin : false;

    // Restrições de FABs continuam usando as regras de ação
    const fabAddTruck = domCache.get('fabAddTruck');
    if (fabAddTruck) fabAddTruck.style.display = isConf ? 'none' : 'flex';

    // Visibilidade dos menus baseada em permissões customizadas
    const menuPatio = domCache.get('menuPatio');
    if (menuPatio) menuPatio.style.display = perms.showMenuPatio !== false ? 'flex' : 'none';

    const menuMapas = domCache.get('menuMapas');
    if (menuMapas) menuMapas.style.display = perms.showMenuMapas !== false ? 'flex' : 'none';

    const menuMateriaPrima = domCache.get('menuMateriaPrima');
    if (menuMateriaPrima) menuMateriaPrima.style.display = perms.showMenuMateriaPrima !== false ? 'flex' : 'none';

    const menuCarregamento = domCache.get('menuCarregamento');
    if (menuCarregamento) menuCarregamento.style.display = perms.showMenuCarregamento !== false ? 'flex' : 'none';

    const menuRelatorios = domCache.get('menuRelatorios');
    if (menuRelatorios) menuRelatorios.style.display = perms.showMenuRelatorios !== false ? 'flex' : 'none';

    const menuDashboard = domCache.get('menuDashboard');
    if (menuDashboard) menuDashboard.style.display = perms.showMenuDashboard !== false ? 'flex' : 'none';

    const menuCadastros = domCache.get('menuCadastros');
    if (menuCadastros) menuCadastros.style.display = perms.showMenuCadastros !== false ? 'flex' : 'none';

    const menuProdutos = domCache.get('menuProdutos');
    if (menuProdutos) menuProdutos.style.display = perms.showMenuProdutos !== false ? 'flex' : 'none';

    const menuNotif = domCache.get('menuNotif');
    if (menuNotif) menuNotif.style.display = perms.showMenuNotif !== false ? 'flex' : 'none';

    const menuChat = domCache.get('menuChat');
    if (menuChat) menuChat.style.display = perms.showMenuChat !== false ? 'flex' : 'none';

    // Controle de acesso ao Painel Admin
    const menuAdmin = domCache.get('menuAdmin');
    if (menuAdmin) {
        menuAdmin.style.display = isAdm ? 'flex' : 'none';
    }

    // Validar se a aba atualmente ativa é permitida, caso contrário redirecionar
    const activeSection = document.querySelector('.view-section.active');
    const currentView = activeSection ? activeSection.id.replace('view-', '') : 'patio';
    if (!window.isViewAllowed(currentView)) {
        const orderOfViews = ['patio', 'mapas', 'materia-prima', 'carregamento', 'relatorios', 'dashboard', 'cadastros', 'produtos', 'notificacoes', 'chat', 'perfil', 'configuracoes'];
        const firstAllowed = orderOfViews.find(v => window.isViewAllowed(v));
        if (firstAllowed) {
            window.navTo(firstAllowed, null);
        }
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
 * Verifica se o usuário tem permissão para visualizar uma aba específica
 */
window.isViewAllowed = function(view) {
    const user = window.loggedUser;
    if (!user) return false;

    const usernameLower = (user.username || '').toLowerCase();
    const isAdm = usernameLower === 'admin' || (user.role || '').toLowerCase().includes('admin') || (user.role || '').toLowerCase().includes('administrador');
    if (isAdm) return true;

    const perms = window.userPermissions || {};

    // Configurações e Perfil são sempre permitidos
    if (view === 'configuracoes' || view === 'perfil') return true;

    if (view === 'admin') return false; // Apenas admins (tratado acima)

    // Mapeamento de views para permissões showMenu
    const permissionMap = {
        'patio': 'showMenuPatio',
        'mapas': 'showMenuMapas',
        'materia-prima': 'showMenuMateriaPrima',
        'carregamento': 'showMenuCarregamento',
        'relatorios': 'showMenuRelatorios',
        'dashboard': 'showMenuDashboard',
        'cadastros': 'showMenuCadastros',
        'produtos': 'showMenuProdutos',
        'notificacoes': 'showMenuNotif',
        'chat': 'showMenuChat'
    };

    const permKey = permissionMap[view];
    if (permKey) {
        return perms[permKey] !== false;
    }

    return true;
};

/**
 * Função principal de navegação entre as secções da App
 * Otimizada com cache e menos manipulação de DOM
 */
window.navTo = function(view, el) {
    if (!window.isViewAllowed(view)) {
        alert('Acesso negado: Você não tem permissão para acessar esta área.');
        return;
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

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.main-sidebar');
    const content = document.querySelector('.content-area');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    if (!sidebar || !content) return;
    
    const isCollapsed = sidebar.classList.toggle('collapsed');
    content.classList.toggle('collapsed', isCollapsed);
    
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
    
    if (toggleIcon) {
        if (isCollapsed) {
            toggleIcon.className = 'fas fa-chevron-right';
        } else {
            toggleIcon.className = 'fas fa-chevron-left';
        }
    }
};
