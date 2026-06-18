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

const syncDebouncer = new Debouncer(300); // 300ms debounce para sync

// Cache removido - dados sempre frescos para garantir sincronia em tempo real

window.isDataLoadedFromServer = false;
window.lastSyncedData = {};

/**
 * Carrega todos os dados do servidor.
 * Se falhar, tenta restaurar os dados do LocalStorage.
 */
let activeLoadPromise = null;
const originalLoadDataFromServer = async function() {
    try {
        let data = {};
        if (window.supabaseClient) {
            const { data: rows, error } = await window.supabaseClient
                .from('app_data')
                .select('*');
            
            if (error) throw error;
            
            rows.forEach(row => {
                data[row.key] = row.value;
            });
        } else {
            const response = await fetch(`${window.API_URL}/api/sync?t=${Date.now()}`, { 
                cache: "no-store",
                signal: AbortSignal.timeout(10000) // 10s timeout
            });

            if (!response.ok) throw new Error("Offline");
            data = await response.json();
        }

        // Atualizar cache de sincronização local
        Object.keys(data).forEach(key => {
            window.lastSyncedData[key] = JSON.stringify(data[key]);
        });

        // Aplicar dados ao estado
        applyDataToState(data);

        window.isDataLoadedFromServer = true;
        window.saveToLocalOnly();
    } catch (error) {
        console.warn("Modo Offline / Erro Sync:", error);
        window.restoreFromLocal();
    }

    if (typeof window.refreshCurrentView === 'function') {
        window.refreshCurrentView();
    }

    if (typeof window.hideLoading === 'function') {
        window.hideLoading();
    }
};

window.loadDataFromServer = async function() {
    if (activeLoadPromise) {
        return activeLoadPromise;
    }
    activeLoadPromise = originalLoadDataFromServer().finally(() => {
        activeLoadPromise = null;
    });
    return activeLoadPromise;
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
        window.appState.set('groups', data.mapa_cego_groups || []);
        window.appState.set('chatMessages', data.aw_chat_messages || []);
        window.appState.set('chatGroups', data.aw_chat_groups || []);
        window.appState.set('customEasterEggs', data.aw_custom_easter_eggs || []);

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
        window.groupsData = data.mapa_cego_groups || [];
        window.chatMessagesData = data.aw_chat_messages || [];
        window.chatGroupsData = data.aw_chat_groups || [];
        window.customEasterEggs = data.aw_custom_easter_eggs || [];

        window.suppliersData = data.aw_suppliers || [];
        window.carriersData = data.aw_carriers || [];
        window.driversData = data.aw_drivers || [];
        window.platesData = data.aw_plates || [];
        window.productsData = data.aw_products || [];
    }

    // Mesclar o usuário logado com o registro correspondente no banco de dados para recuperar avatares/capas
    if (window.loggedUser) {
        const users = window.appState ? window.appState.get('users') : window.usersData;
        if (users && Array.isArray(users)) {
            const dbUser = users.find(u => u.username.toLowerCase() === window.loggedUser.username.toLowerCase());
            if (dbUser) {
                window.loggedUser.avatarEmoji = dbUser.avatarEmoji || window.loggedUser.avatarEmoji;
                window.loggedUser.avatarColor = dbUser.avatarColor || window.loggedUser.avatarColor;
                window.loggedUser.avatarPhoto = dbUser.avatarPhoto || null;
                window.loggedUser.coverImage = dbUser.coverImage || null;
                sessionStorage.setItem('loggedInUser', JSON.stringify(window.loggedUser));

                // Atualiza o lastAccess uma única vez por sessão de uso
                if (!window.hasUpdatedLastAccess) {
                    dbUser.lastAccess = new Date().toISOString();
                    window.hasUpdatedLastAccess = true;
                    if (window.appState) {
                        window.appState.set('users', users);
                    }
                    if (typeof window.saveAll === 'function') {
                        window.saveAll(true);
                    }
                }
            }
        }
    }

    if (typeof window.resolveUserPermissions === 'function') {
        window.resolveUserPermissions();
    }
    if (typeof window.initRoleBasedUI === 'function') {
        window.initRoleBasedUI();
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
        aw_chat_messages: JSON.parse(localStorage.getItem('aw_chat_messages') || '[]'),
        aw_chat_groups: JSON.parse(localStorage.getItem('aw_chat_groups') || '[]'),
        mapa_cego_groups: JSON.parse(localStorage.getItem('mapa_cego_groups') || '[]'),
        aw_suppliers: JSON.parse(localStorage.getItem('aw_suppliers') || '[]'),
        aw_carriers: JSON.parse(localStorage.getItem('aw_carriers') || '[]'),
        aw_drivers: JSON.parse(localStorage.getItem('aw_drivers') || '[]'),
        aw_plates: JSON.parse(localStorage.getItem('aw_plates') || '[]'),
        aw_products: JSON.parse(localStorage.getItem('aw_products') || '[]'),
        aw_custom_easter_eggs: JSON.parse(localStorage.getItem('aw_custom_easter_eggs') || '[]')
    };

    // Se encontramos dados locais válidos, podemos assumir que temos um estado inicial
    if (localStorage.getItem('aw_caminhoes_v2') || localStorage.getItem('mapas_cegos_v3')) {
        window.isDataLoadedFromServer = true;
    }

    applyDataToState(data);
};

/**
 * Salva todos os dados atuais tanto localmente quanto no servidor
 * Com debounce para evitar múltiplas requisições
 */
window.saveAll = function(immediate = false) {
    window.saveToLocalOnly();
    
    const performSync = () => {
        // Sincronizar dados transacionais
        window.saveToServer('aw_caminhoes_v2', window.patioData);
        window.saveToServer('mapas_cegos_v3', window.mapData);
        window.saveToServer('aw_materia_prima', window.mpData);
        window.saveToServer('aw_carregamento', window.carregamentoData);
        window.saveToServer('aw_requests', window.requests);
        window.saveToServer('mapa_cego_users', window.usersData);
        window.saveToServer('aw_chat_messages', window.chatMessagesData);
        window.saveToServer('aw_chat_groups', window.chatGroupsData);
        window.saveToServer('mapa_cego_groups', window.groupsData);
        window.saveToServer('aw_custom_easter_eggs', window.customEasterEggs);

        // Sincronizar dados de cadastro
        window.saveToServer('aw_suppliers', window.suppliersData);
        window.saveToServer('aw_carriers', window.carriersData);
        window.saveToServer('aw_drivers', window.driversData);
        window.saveToServer('aw_plates', window.platesData);
        window.saveToServer('aw_products', window.productsData);
    };

    if (immediate) {
        syncDebouncer.cancel('save_all');
        performSync();
    } else {
        syncDebouncer.execute('save_all', performSync);
    }
};

/**
 * Envia uma chave de dados específica para o servidor via POST
 * Com tratamento de erro melhorado
 */
window.saveToServer = function(key, data) {
    // Permite enviar arrays vazios (exclusão de registros é válida)
    if (data === undefined || data === null) {
        return;
    }

    // Bloqueia salvamento se o primeiro load ainda não aconteceu
    if (!window.isDataLoadedFromServer) {
        console.warn(`[Sync] Salvamento de ${key} ignorado: Dados iniciais não carregados.`);
        return;
    }

    const serialized = JSON.stringify(data);
    if (window.lastSyncedData[key] === serialized) {
        // Sem modificações, ignora requisição de rede
        return;
    }

    // Otimista: assume que o salvamento vai dar certo para evitar requisições redundantes consecutivas
    window.lastSyncedData[key] = serialized;

    if (window.supabaseClient) {
        window.supabaseClient
            .from('app_data')
            .upsert({ key: key, value: data })
            .then(({ error }) => {
                if (error) {
                    console.error(`Erro ao salvar ${key} no Supabase:`, error.message);
                    // Reverter cache se der erro
                    delete window.lastSyncedData[key];
                }
            })
            .catch(err => {
                console.error(`Erro de conexão ao salvar ${key} no Supabase:`, err.message);
                delete window.lastSyncedData[key];
            });
    } else {
        fetch(`${window.API_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key, data: data }),
            signal: AbortSignal.timeout(5000)
        }).catch(err => {
            console.error(`Erro ao salvar ${key} no servidor:`, err.message);
            delete window.lastSyncedData[key];
        });
    }
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
        localStorage.setItem('aw_chat_messages', JSON.stringify(window.chatMessagesData));
        localStorage.setItem('aw_chat_groups', JSON.stringify(window.chatGroupsData));
        localStorage.setItem('mapa_cego_groups', JSON.stringify(window.groupsData));

        localStorage.setItem('aw_suppliers', JSON.stringify(window.suppliersData));
        localStorage.setItem('aw_carriers', JSON.stringify(window.carriersData));
        localStorage.setItem('aw_drivers', JSON.stringify(window.driversData));
        localStorage.setItem('aw_plates', JSON.stringify(window.platesData));
        localStorage.setItem('aw_products', JSON.stringify(window.productsData));
        localStorage.setItem('aw_custom_easter_eggs', JSON.stringify(window.customEasterEggs));
    } catch (e) { 
        console.error("Erro ao salvar local:", e); 
    }
};

/**
 * Atualiza a visualização da tela ativa no momento
 * Com verificação de função antes de chamar
 */
window.lastRenderedData = window.lastRenderedData || {};

window.refreshCurrentView = function() {
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection) {
        const currentView = activeSection.id.replace('view-', '');
        
        // Obter dados relevantes para a aba atual
        let currentDataString = '';
        if (currentView === 'cadastros') {
            currentDataString = JSON.stringify([window.suppliersData, window.carriersData, window.driversData, window.platesData, window.productsData]);
        } else if (currentView === 'patio') {
            currentDataString = JSON.stringify([window.patioData]);
        } else if (currentView === 'mapas') {
            currentDataString = JSON.stringify([window.mapData, window.usersData]);
        } else if (currentView === 'materia-prima') {
            currentDataString = JSON.stringify([window.mpData]);
        } else if (currentView === 'carregamento') {
            currentDataString = JSON.stringify([window.carregamentoData]);
        } else if (currentView === 'notificacoes') {
            currentDataString = JSON.stringify([window.requests]);
        } else if (currentView === 'admin') {
            currentDataString = JSON.stringify([window.usersData, window.groupsData]);
        } else if (currentView === 'chat') {
            currentDataString = JSON.stringify([window.chatMessagesData, window.chatGroupsData, window.usersData, window.onlineUsersStatus]);
        } else if (currentView === 'dashboard') {
            currentDataString = JSON.stringify([window.patioData, window.mapData, window.carregamentoData, window.mpData]);
        } else if (currentView === 'configuracoes') {
            currentDataString = JSON.stringify([window.customEasterEggs]);
        }

        // Se os dados não mudaram, pulamos a re-renderização completa da view ativa
        if (currentDataString && window.lastRenderedData[currentView] === currentDataString) {
            if (typeof window.updateBadge === 'function') window.updateBadge();
            if (typeof window.updateAccountRequestBadge === 'function') window.updateAccountRequestBadge();
            if (typeof window.checkForNotifications === 'function') window.checkForNotifications();
            return;
        }

        // Se for a view de chat e a estrutura básica do chat já estiver renderizada,
        // atualizamos apenas os sub-elementos dinâmicos para não quebrar a digitação
        if (currentView === 'chat' && document.getElementById('chatSidebar') && document.getElementById('chatWindow')) {
            if (typeof window.renderChatSidebar === 'function') window.renderChatSidebar();
            if (typeof window.renderChatWindow === 'function') window.renderChatWindow();
            if (typeof window.updateChatBadges === 'function') window.updateChatBadges();
            
            window.lastRenderedData[currentView] = currentDataString;
            
            if (typeof window.updateBadge === 'function') window.updateBadge();
            if (typeof window.updateAccountRequestBadge === 'function') window.updateAccountRequestBadge();
            if (typeof window.checkForNotifications === 'function') window.checkForNotifications();
            return;
        }

        // Caso contrário, atualiza o cache e executa a renderização completa da view
        if (currentDataString) {
            window.lastRenderedData[currentView] = currentDataString;
        }
        
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
            'admin': () => typeof window.renderAdminDashboard === 'function' && window.renderAdminDashboard(),
            'chat': () => typeof window.renderChat === 'function' && window.renderChat(),
            'dashboard': () => typeof window.renderDashboard === 'function' && window.renderDashboard(),
            'configuracoes': () => typeof window.updatePermissionStatus === 'function' && window.updatePermissionStatus()
        };

        const handler = viewHandlers[currentView];
        if (handler) handler();
    }

    if (typeof window.updateBadge === 'function') window.updateBadge();
    if (typeof window.updateAccountRequestBadge === 'function') window.updateAccountRequestBadge();
    if (typeof window.checkForNotifications === 'function') window.checkForNotifications();
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
        if (window.supabaseClient) {
            window.supabaseClient
                .from('app_data')
                .delete()
                .neq('key', 'aw_products') // Deleta todas as chaves exceto produtos
                .then(({ error }) => {
                    if (error) {
                        alert('Erro ao tentar resetar o Supabase: ' + error.message);
                    } else {
                        alert('Sistema resetado com sucesso no Supabase!');
                    }
                })
                .catch(error => {
                    console.error("Erro ao resetar Supabase:", error);
                    alert('Erro de conexão ao tentar resetar the Supabase.');
                });
        } else {
            fetch(`${window.API_URL}/api/reset`, { 
                method: 'DELETE',
                signal: AbortSignal.timeout(10000)
            })
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
};
