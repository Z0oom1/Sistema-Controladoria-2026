// =========================================================
// LÓGICA DE CARREGAMENTO E SINCRONIZAÇÃO (OFFLINE FIRST)
// =========================================================

/**
 * Carrega todos os dados do servidor e atualiza o estado global.
 * Se falhar, tenta restaurar os dados do LocalStorage.
 */
window.loadDataFromServer = async function() {
    try {
        const response = await fetch(`${window.API_URL}/api/sync?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Offline");
        const data = await response.json();

        // Atualiza variáveis globais com dados do servidor
        window.patioData = data.aw_caminhoes_v2 || [];
        window.mapData = data.mapas_cegos_v3 || [];
        window.mpData = data.aw_materia_prima || [];
        window.carregamentoData = data.aw_carregamento || [];
        window.requests = data.aw_requests || [];
        window.usersData = data.mapa_cego_users || [];

        window.suppliersData = data.aw_suppliers || [];
        window.carriersData = data.aw_carriers || [];
        window.driversData = data.aw_drivers || [];
        window.platesData = data.aw_plates || [];
        window.productsData = data.aw_products || [];

        window.saveToLocalOnly();
    } catch (error) {
        console.warn("Modo Offline / Erro Sync:", error);
        window.restoreFromLocal();
    }
    if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
    }
};

/**
 * Restaura os dados salvos localmente no navegador.
 */
window.restoreFromLocal = function() {
    window.patioData = JSON.parse(localStorage.getItem('aw_caminhoes_v2') || '[]');
    window.mapData = JSON.parse(localStorage.getItem('mapas_cegos_v3') || '[]');
    window.mpData = JSON.parse(localStorage.getItem('aw_materia_prima') || '[]');
    window.carregamentoData = JSON.parse(localStorage.getItem('aw_carregamento') || '[]');
    window.requests = JSON.parse(localStorage.getItem('aw_requests') || '[]');
    window.usersData = JSON.parse(localStorage.getItem('mapa_cego_users') || '[]');

    window.suppliersData = JSON.parse(localStorage.getItem('aw_suppliers') || '[]');
    window.carriersData = JSON.parse(localStorage.getItem('aw_carriers') || '[]');
    window.driversData = JSON.parse(localStorage.getItem('aw_drivers') || '[]');
    window.platesData = JSON.parse(localStorage.getItem('aw_plates') || '[]');
    window.productsData = JSON.parse(localStorage.getItem('aw_products') || '[]');
};

/**
 * Salva todos os dados atuais tanto localmente quanto no servidor.
 */
window.saveAll = function() {
    window.saveToLocalOnly();
    
    // Sincroniza dados transacionais com o servidor
    window.saveToServer('aw_caminhoes_v2', window.patioData);
    window.saveToServer('mapas_cegos_v3', window.mapData);
    window.saveToServer('aw_materia_prima', window.mpData);
    window.saveToServer('aw_carregamento', window.carregamentoData);
    window.saveToServer('aw_requests', window.requests);
    window.saveToServer('mapa_cego_users', window.usersData);

    // Sincroniza dados de cadastro
    window.saveToServer('aw_suppliers', window.suppliersData);
    window.saveToServer('aw_carriers', window.carriersData);
    window.saveToServer('aw_drivers', window.driversData);
    window.saveToServer('aw_plates', window.platesData);
    window.saveToServer('aw_products', window.productsData);
};

/**
 * Envia uma chave de dados específica para o servidor via POST.
 */
window.saveToServer = function(key, data) {
    fetch(`${window.API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, data: data })
    }).catch(err => console.error("Erro ao salvar no servidor (pode estar offline):", err));
};

/**
 * Persiste os dados atuais apenas no LocalStorage do navegador.
 */
window.saveToLocalOnly = function() {
    try {
        localStorage.setItem('aw_caminhoes_v2', JSON.stringify(window.patioData));
        localStorage.setItem('mapas_cegos_v3', JSON.stringify(window.mapData));
        localStorage.setItem('aw_materia_prima', JSON.stringify(window.mpData));
        localStorage.setItem('aw_carregamento', JSON.stringify(window.carregamentoData));
        localStorage.setItem('aw_requests', JSON.stringify(window.requests));
        localStorage.setItem('mapa_cego_users', JSON.stringify(window.usersData));

        localStorage.setItem('aw_suppliers', JSON.stringify(window.suppliersData));
        localStorage.setItem('aw_carriers', JSON.stringify(window.carriersData));
        localStorage.setItem('aw_drivers', JSON.stringify(window.driversData));
        localStorage.setItem('aw_plates', JSON.stringify(window.platesData));
        localStorage.setItem('aw_products', JSON.stringify(window.productsData));
    } catch (e) { console.error("Erro ao salvar local:", e); }
};

/**
 * Atualiza a visualização da tela ativa no momento.
 */
window.refreshCurrentView = function() {
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection) {
        const currentView = activeSection.id.replace('view-', '');
        if (currentView === 'cadastros' && typeof userSubType !== 'undefined' && userSubType === 'ALM') {
            window.navTo('patio', null);
            return;
        }
        if (currentView === 'patio' && typeof window.renderPatio === 'function') window.renderPatio();
        else if (currentView === 'mapas' && typeof window.renderMapList === 'function') { window.renderMapList(); window.updateMapState(); }
        else if (currentView === 'materia-prima' && typeof window.renderMateriaPrima === 'function') window.renderMateriaPrima();
        else if (currentView === 'carregamento' && typeof window.renderCarregamento === 'function') window.renderCarregamento();
        else if (currentView === 'cadastros' && typeof window.renderCadastros === 'function') window.renderCadastros();
        else if (currentView === 'notificacoes' && typeof window.renderRequests === 'function') window.renderRequests();
        else if (currentView === 'dashboard' && typeof window.renderDashboard === 'function') window.renderDashboard();
    }
    if (typeof window.updateBadge === 'function') window.updateBadge();
    if (typeof window.updateAccountRequestBadge === 'function') window.updateAccountRequestBadge();
};

/**
 * Gera um arquivo JSON para backup dos dados atuais.
 */
window.backupData = function() {
    const d = { patio: window.patioData, mapas: window.mapData, mp: window.mpData, carr: window.carregamentoData, req: window.requests };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d));
    a.download = 'backup.json';
    a.click();
};

/**
 * Restaura dados a partir de um arquivo JSON carregado pelo usuário.
 */
window.restoreData = function(i) {
    const f = i.files[0];
    const r = new FileReader();
    r.onload = e => {
        const d = JSON.parse(e.target.result);
        if (confirm('Restaurar?')) {
            if (d.patio) localStorage.setItem('aw_caminhoes_v2', JSON.stringify(d.patio));
            if (d.mapas) localStorage.setItem('mapas_cegos_v3', JSON.stringify(d.mapas));
            if (d.mp) localStorage.setItem('aw_materia_prima', JSON.stringify(d.mp));
            if (d.carr) localStorage.setItem('aw_carregamento', JSON.stringify(d.carr));
            window.location.reload();
        }
    };
    r.readAsText(f);
};

/**
 * Reseta todos os dados no servidor (requer confirmação).
 */
window.clearAllData = function() {
    if (confirm('PERIGO: Isso apagará TODOS os dados de TODOS os computadores.\n\nTem certeza absoluta?')) {
        fetch(`${window.API_URL}/api/reset`, { method: 'DELETE' })
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
};