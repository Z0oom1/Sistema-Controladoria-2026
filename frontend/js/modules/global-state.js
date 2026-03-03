// =========================================================
// MÓDULO DE ESTADO GLOBAL - REFATORADO COM PADRÃO LOCAL
// =========================================================

/**
 * StateManager: Padrão centralizado para gerenciar estado
 * Reduz variáveis globais e melhora performance
 */
class StateManager {
    constructor() {
        this.state = {
            // Dados principais do sistema
            suppliers: [],
            carriers: [],
            drivers: [],
            plates: [],
            products: [],

            // Dados transacionais
            patio: [],
            maps: [],
            materiaPrima: [],
            carregamento: [],
            requests: [],
            users: [],

            // Estados de seleção e contexto
            entryState: {
                selectedSupplierId: null,
                selectedCarrierId: null,
                selectedDriverId: null,
                selectedPlateId: null
            },

            // Contextos e seleções
            tmpItems: [],
            currentMapId: null,
            contextMapId: null,
            contextMPId: null,
            contextCarrId: null,
            contextTruckId: null,
            contextCadId: null,

            // Configurações de interface
            deleteOptionSelected: 'queue',
            editTmpItems: [],
            isEditingMode: false,
            filteredReportData: [],
            currentReportType: '',
            selectedReportItems: new Set(),
            notifiedEvents: new Set(),

            // Catálogo padrão
            defaultProducts: ["CX PAP 125A", "AÇ CRISTAL", "AÇ LIQUIDO", "AÇ REFINADO", "SAL REFINADO"]
        };

        this.listeners = new Map();
    }

    /**
     * Obtém valor do estado
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;
        for (const key of keys) {
            value = value?.[key];
        }
        return value;
    }

    /**
     * Define valor do estado e notifica listeners
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let obj = this.state;

        for (const key of keys) {
            if (!obj[key]) obj[key] = {};
            obj = obj[key];
        }

        const oldValue = obj[lastKey];
        obj[lastKey] = value;

        // Notificar listeners
        if (oldValue !== value) {
            this.notify(path, value, oldValue);
        }
    }

    /**
     * Observa mudanças em um caminho do estado
     */
    watch(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path).push(callback);

        // Retorna função para unsubscribe
        return () => {
            const callbacks = this.listeners.get(path);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    /**
     * Notifica listeners sobre mudanças
     */
    notify(path, newValue, oldValue) {
        const callbacks = this.listeners.get(path) || [];
        callbacks.forEach(cb => {
            try {
                cb(newValue, oldValue);
            } catch (e) {
                console.error(`Erro em listener para ${path}:`, e);
            }
        });
    }

    /**
     * Obtém todo o estado (para debug)
     */
    getState() {
        return this.state;
    }

    /**
     * Reseta estado para valores iniciais
     */
    reset() {
        this.state = {
            suppliers: [],
            carriers: [],
            drivers: [],
            plates: [],
            products: [],
            patio: [],
            maps: [],
            materiaPrima: [],
            carregamento: [],
            requests: [],
            users: [],
            entryState: {
                selectedSupplierId: null,
                selectedCarrierId: null,
                selectedDriverId: null,
                selectedPlateId: null
            },
            tmpItems: [],
            currentMapId: null,
            contextMapId: null,
            contextMPId: null,
            contextCarrId: null,
            contextTruckId: null,
            contextCadId: null,
            deleteOptionSelected: 'queue',
            editTmpItems: [],
            isEditingMode: false,
            filteredReportData: [],
            currentReportType: '',
            selectedReportItems: new Set(),
            notifiedEvents: new Set(),
            defaultProducts: ["CX PAP 125A", "AÇ CRISTAL", "AÇ LIQUIDO", "AÇ REFINADO", "SAL REFINADO"]
        };
    }
}

// Instância global do StateManager
window.appState = new StateManager();

// --- COMPATIBILIDADE COM CÓDIGO ANTIGO (BACKWARD COMPATIBILITY) ---
// Manter variáveis globais como getters/setters que apontam para o StateManager

Object.defineProperty(window, 'suppliersData', {
    get() { return appState.get('suppliers'); },
    set(v) { appState.set('suppliers', v); }
});

Object.defineProperty(window, 'carriersData', {
    get() { return appState.get('carriers'); },
    set(v) { appState.set('carriers', v); }
});

Object.defineProperty(window, 'driversData', {
    get() { return appState.get('drivers'); },
    set(v) { appState.set('drivers', v); }
});

Object.defineProperty(window, 'platesData', {
    get() { return appState.get('plates'); },
    set(v) { appState.set('plates', v); }
});

Object.defineProperty(window, 'productsData', {
    get() { return appState.get('products'); },
    set(v) { appState.set('products', v); }
});

Object.defineProperty(window, 'patioData', {
    get() { return appState.get('patio'); },
    set(v) { appState.set('patio', v); }
});

Object.defineProperty(window, 'mapData', {
    get() { return appState.get('maps'); },
    set(v) { appState.set('maps', v); }
});

Object.defineProperty(window, 'mpData', {
    get() { return appState.get('materiaPrima'); },
    set(v) { appState.set('materiaPrima', v); }
});

Object.defineProperty(window, 'carregamentoData', {
    get() { return appState.get('carregamento'); },
    set(v) { appState.set('carregamento', v); }
});

Object.defineProperty(window, 'requests', {
    get() { return appState.get('requests'); },
    set(v) { appState.set('requests', v); }
});

Object.defineProperty(window, 'usersData', {
    get() { return appState.get('users'); },
    set(v) { appState.set('users', v); }
});

Object.defineProperty(window, 'entryState', {
    get() { return appState.get('entryState'); },
    set(v) { appState.set('entryState', v); }
});

Object.defineProperty(window, 'tmpItems', {
    get() { return appState.get('tmpItems'); },
    set(v) { appState.set('tmpItems', v); }
});

Object.defineProperty(window, 'currentMapId', {
    get() { return appState.get('currentMapId'); },
    set(v) { appState.set('currentMapId', v); }
});

Object.defineProperty(window, 'contextMapId', {
    get() { return appState.get('contextMapId'); },
    set(v) { appState.set('contextMapId', v); }
});

Object.defineProperty(window, 'contextMPId', {
    get() { return appState.get('contextMPId'); },
    set(v) { appState.set('contextMPId', v); }
});

Object.defineProperty(window, 'contextCarrId', {
    get() { return appState.get('contextCarrId'); },
    set(v) { appState.set('contextCarrId', v); }
});

Object.defineProperty(window, 'contextTruckId', {
    get() { return appState.get('contextTruckId'); },
    set(v) { appState.set('contextTruckId', v); }
});

Object.defineProperty(window, 'contextCadId', {
    get() { return appState.get('contextCadId'); },
    set(v) { appState.set('contextCadId', v); }
});

Object.defineProperty(window, 'deleteOptionSelected', {
    get() { return appState.get('deleteOptionSelected'); },
    set(v) { appState.set('deleteOptionSelected', v); }
});

Object.defineProperty(window, 'editTmpItems', {
    get() { return appState.get('editTmpItems'); },
    set(v) { appState.set('editTmpItems', v); }
});

Object.defineProperty(window, 'isEditingMode', {
    get() { return appState.get('isEditingMode'); },
    set(v) { appState.set('isEditingMode', v); }
});

Object.defineProperty(window, 'filteredReportData', {
    get() { return appState.get('filteredReportData'); },
    set(v) { appState.set('filteredReportData', v); }
});

Object.defineProperty(window, 'currentReportType', {
    get() { return appState.get('currentReportType'); },
    set(v) { appState.set('currentReportType', v); }
});

Object.defineProperty(window, 'selectedReportItems', {
    get() { return appState.get('selectedReportItems'); },
    set(v) { appState.set('selectedReportItems', v); }
});

Object.defineProperty(window, 'notifiedEvents', {
    get() { return appState.get('notifiedEvents'); },
    set(v) { appState.set('notifiedEvents', v); }
});

Object.defineProperty(window, 'defaultProducts', {
    get() { return appState.get('defaultProducts'); },
    set(v) { appState.set('defaultProducts', v); }
});

/**
 * Função utilitária para fechar menus de contexto
 */
window.closeContextMenu = function() {
    document.querySelectorAll('.context-menu').forEach(x => x.style.display = 'none');
};
