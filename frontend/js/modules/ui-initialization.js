// =========================================================
// MÓDULO DE INICIALIZAÇÃO DE INTERFACE E NAVEGAÇÃO
// =========================================================

/**
 * Inicializa a interface com base nas permissões do utilizador (Role-Based UI)
 */
window.initRoleBasedUI = function() {
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

    // Restrições para Conferentes
    if (typeof isConferente !== 'undefined' && isConferente) {
        const fab = document.getElementById('fabAddTruck'); if (fab) fab.style.display = 'none';
        const mc = document.getElementById('menuCarregamento'); if (mc) mc.style.display = 'none';
    } else {
        const fab = document.getElementById('fabAddTruck'); if (fab) fab.style.display = 'flex';
        const mc = document.getElementById('menuCarregamento'); if (mc) mc.style.display = 'flex';
    }

    // Visibilidade do menu de Matéria-Prima
    const mmp = document.getElementById('menuMateriaPrima');
    if (typeof isRecebimento !== 'undefined') {
        if (mmp) mmp.style.display = isRecebimento ? 'flex' : 'none';
    }

    // Visibilidade do Dashboard (Encarregados e Admins)
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

    // Lógica de colunas por Subtipo de utilizador
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

    // Inicializa campos de data com a data atual do Brasil
    ['patioDateFilter', 'mapDate', 'mpDateFilter', 'carrDateFilter', 'mapListDateFilter', 'repDateStart', 'repDateEnd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = window.getBrazilTime().split('T')[0];
    });

    // Relógio do Servidor
    setInterval(() => { 
        const el = document.getElementById('serverTime'); 
        if (el) el.textContent = new Date().toLocaleTimeString(); 
    }, 1000);
};

/**
 * Função principal de navegação entre as secções da App
 */
window.navTo = function(view, el) {
    // Bloqueia acesso ao cadastro para utilizadores do almoxarifado
    if (view === 'cadastros' && typeof userSubType !== 'undefined' && userSubType === 'ALM') {
        alert('Acesso negado: Utilizadores do almoxarifado não têm permissão para aceder a cadastros.');
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

    const mainSide = document.querySelector('.main-sidebar'); 
    if (mainSide) mainSide.classList.remove('show-mobile');

    const titles = {
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
        'dashboard': 'Dashboard'
    };

    if (view === 'produtos' && typeof window.renderProductsView === 'function') window.renderProductsView();

    const currentTitle = titles[view] || 'Home Page';
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = currentTitle;

    const appTitle = document.querySelector('.app-title');
    if (appTitle) {
        appTitle.innerText = `CONTROLADORIA AW - ${currentTitle.toUpperCase()}`;
    }

    // Aciona a renderização específica da View
    if (view === 'patio' && typeof window.renderPatio === 'function') window.renderPatio();
    if (view === 'mapas' && typeof window.renderMapList === 'function') { window.renderMapList(); window.updateMapState(); }
    if (view === 'materia-prima' && typeof window.renderMateriaPrima === 'function') window.renderMateriaPrima();
    if (view === 'carregamento' && typeof window.renderCarregamento === 'function') window.renderCarregamento();
    if (view === 'cadastros' && typeof window.renderCadastros === 'function') window.renderCadastros();
    if (view === 'notificacoes' && typeof window.renderRequests === 'function') window.renderRequests();
    if (view === 'perfil' && typeof window.renderProfileArea === 'function') window.renderProfileArea();
    if (view === 'dashboard' && typeof window.renderDashboard === 'function') window.renderDashboard();
    if (view === 'configuracoes' && typeof window.updatePermissionStatus === 'function') window.updatePermissionStatus();

    localStorage.setItem('aw_last_view', view);
};

window.toggleMobileMenu = function() { 
    const sb = document.querySelector('.main-sidebar'); 
    if (sb) sb.classList.toggle('show-mobile'); 
};

window.toggleMapListMobile = function() { 
    const mm = document.getElementById('mobileMapList'); 
    if (mm) mm.classList.toggle('open'); 
};

window.logout = function() { 
    sessionStorage.removeItem('loggedInUser'); 
    window.location.href = 'login.html'; 
};