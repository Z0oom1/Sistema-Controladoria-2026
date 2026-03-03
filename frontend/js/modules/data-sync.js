// =========================================================
// LÓGICA DE CARREGAMENTO E SINCRONIZAÇÃO (OFFLINE FIRST) - OTIMIZADA
// =========================================================

/**
 * Utilitário de Debounce para evitar múltiplas requisições
 */
class Debouncer {
    constructor(delay = 1000) {
        this.delay = delay;
        this.timers = new Map();
    }

    execute(key, fn) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        const timer = setTimeout(() => {
            fn();
            this.timers.delete(key);
        }, this.delay);

        this.timers.set(key, timer);
    }

    cancel(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }
}

const syncDebouncer = new Debouncer(2000); // 2s debounce para sync

/**
 * Cache de sincronização com controle de TTL
 */
class SyncCache {
    constructor(ttl = 30000) { // 30s default
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }
}

const syncCache = new SyncCache();

/**
 * Carrega todos os dados do servidor com cache
 * Se falhar, tenta restaurar os dados do LocalStorage.
 */
window.loadDataFromServer = async function() {
    // Verificar cache primeiro
    const cached = syncCache.get('full_sync');
    if (cached) {
        console.log('Usando dados em cache');
        applyDataToState(cached);
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/api/sync?t=${Date.now()}`, { 
            cache: "no-store",
            signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!response.ok) throw new Error("Offline");
        const data = await response.json();

        // Armazenar em cache
        syncCache.set('full_sync', data);

        // Aplicar dados ao estado
        applyDataToState(data);

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
 * Aplica dados ao estado de forma eficiente
 */
function applyDataToState(data) {
    // Usar appState para melhor performance
    if (window.appState) {
        window.appState.set('patio', data.aw_caminhoes_v2 || []);
        window.appState.set('maps', data.mapas_cegos_v3 || []);
        window.appState.set('materiaPrima', data.aw_materia_prima || []);
        window.appState.set('carregamento', data.aw_carregamento || []);
        window.appState.set('requests', data.aw_requests || []);
        window.appState.set('users', data.mapa_cego_users || []);

        window.appState.set('suppliers', data.aw_suppliers || []);
        window.appState.set('carriers', data.aw_carriers || []);
        window.appState.set('drivers', data.aw_drivers || []);
        window.appState.set('plates', data.aw_plates || []);
        window.appState.set('products', data.aw_products || []);
    } else {
        // Fallback para código antigo
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
    }
}

/**
 * Restaura os dados salvos localmente no navegador
 */
window.restoreFromLocal = function() {
    const data = {
        aw_caminhoes_v2: JSON.parse(localStorage.getItem('aw_caminhoes_v2') || '[]'),
        mapas_cegos_v3: JSON.parse(localStorage.getItem('mapas_cegos_v3') || '[]'),
        aw_materia_prima: JSON.parse(localStorage.getItem('aw_materia_prima') || '[]'),
        aw_carregamento: JSON.parse(localStorage.getItem('aw_carregamento') || '[]'),
        aw_requests: JSON.parse(localStorage.getItem('aw_requests') || '[]'),
        mapa_cego_users: JSON.parse(localStorage.getItem('mapa_cego_users') || '[]'),
        aw_suppliers: JSON.parse(localStorage.getItem('aw_suppliers') || '[]'),
        aw_carriers: JSON.parse(localStorage.getItem('aw_carriers') || '[]'),
        aw_drivers: JSON.parse(localStorage.getItem('aw_drivers') || '[]'),
        aw_plates: JSON.parse(localStorage.getItem('aw_plates') || '[]'),
        aw_products: JSON.parse(localStorage.getItem('aw_products') || '[]')
    };

    applyDataToState(data);
};

/**
 * Salva todos os dados atuais tanto localmente quanto no servidor
 * Com debounce para evitar múltiplas requisições
 */
window.saveAll = function() {
    window.saveToLocalOnly();
    
    // Usar debounce para evitar múltiplas requisições simultâneas
    syncDebouncer.execute('save_all', () => {
        // Sincronizar dados transacionais
        window.saveToServer('aw_caminhoes_v2', window.patioData);
        window.saveToServer('mapas_cegos_v3', window.mapData);
        window.saveToServer('aw_materia_prima', window.mpData);
        window.saveToServer('aw_carregamento', window.carregamentoData);
        window.saveToServer('aw_requests', window.requests);
        window.saveToServer('mapa_cego_users', window.usersData);

        // Sincronizar dados de cadastro
        window.saveToServer('aw_suppliers', window.suppliersData);
        window.saveToServer('aw_carriers', window.carriersData);
        window.saveToServer('aw_drivers', window.driversData);
        window.saveToServer('aw_plates', window.platesData);
        window.saveToServer('aw_products', window.productsData);

        // Limpar cache após salvar
        syncCache.clear();
    });
};

/**
 * Envia uma chave de dados específica para o servidor via POST
 * Com tratamento de erro melhorado
 */
window.saveToServer = function(key, data) {
    // Evitar enviar dados vazios
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return;
    }

    fetch(`${window.API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, data: data }),
        signal: AbortSignal.timeout(5000)
    }).catch(err => {
        console.error(`Erro ao salvar ${key} no servidor:`, err.message);
    });
};

/**
 * Persiste os dados atuais apenas no LocalStorage do navegador
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
    } catch (e) { 
        console.error("Erro ao salvar local:", e); 
    }
};

/**
 * Atualiza a visualização da tela ativa no momento
 * Com verificação de função antes de chamar
 */
window.refreshCurrentView = function() {
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection) {
        const currentView = activeSection.id.replace('view-', '');
        
        // Usar um mapa de funções para evitar múltiplos if
        const viewHandlers = {
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
            'dashboard': () => typeof window.renderDashboard === 'function' && window.renderDashboard()
        };

        const handler = viewHandlers[currentView];
        if (handler) handler();
    }

    if (typeof window.updateBadge === 'function') window.updateBadge();
    if (typeof window.updateAccountRequestBadge === 'function') window.updateAccountRequestBadge();
};

/**
 * Gera um arquivo JSON para backup dos dados atuais
 */
window.backupData = function() {
    const d = { 
        patio: window.patioData, 
        mapas: window.mapData, 
        mp: window.mpData, 
        carr: window.carregamentoData, 
        req: window.requests 
    };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d));
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};

/**
 * Restaura dados a partir de um arquivo JSON carregado pelo usuário
 */
window.restoreData = function(i) {
    const f = i.files[0];
    const r = new FileReader();
    r.onload = e => {
        const d = JSON.parse(e.target.result);
        if (confirm('Restaurar dados do backup?')) {
            if (d.patio) localStorage.setItem('aw_caminhoes_v2', JSON.stringify(d.patio));
            if (d.mapas) localStorage.setItem('mapas_cegos_v3', JSON.stringify(d.mapas));
            if (d.mp) localStorage.setItem('aw_materia_prima', JSON.stringify(d.mp));
            if (d.carr) localStorage.setItem('aw_carregamento', JSON.stringify(d.carr));
            syncCache.clear();
            window.location.reload();
        }
    };
    r.readAsText(f);
};

/**
 * Reseta todos os dados no servidor (requer confirmação)
 */
window.clearAllData = function() {
    if (confirm('PERIGO: Isso apagará TODOS os dados de TODOS os computadores.\n\nTem certeza absoluta?')) {
        fetch(`${window.API_URL}/api/reset`, { 
            method: 'DELETE',
            signal: AbortSignal.timeout(10000)
        })
            .then(response => {
                if (response.ok) {
                    syncCache.clear();
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
