// =========================================================
// MÓDULO DE ESTADO GLOBAL E VARIÁVEIS DE CONTROLE
// =========================================================

// Dados principais do sistema
window.suppliersData = [];     // { id, nome }
window.carriersData = [];      // { id, nome, apelido, cnpj, supplierIds: [] }
window.driversData = [];       // { id, nome, doc, carrierIds: [] }
window.platesData = [];        // { id, numero, driverId }
window.productsData = [];      //

// Dados transacionais
window.patioData = [];         //
window.mapData = [];           //
window.mpData = [];            //
window.carregamentoData = [];  //
window.requests = [];          //
window.usersData = [];         //

// Estados de seleção e contexto
window.entryState = {
    selectedSupplierId: null,
    selectedCarrierId: null,
    selectedDriverId: null,
    selectedPlateId: null
};

window.tmpItems = [];          //
window.currentMapId = null;    //
window.contextMapId = null;    //
window.contextMPId = null;     //
window.contextCarrId = null;   //
window.contextTruckId = null;  //
window.contextCadId = null;    //

// Configurações de interface e relatórios
window.deleteOptionSelected = 'queue'; //
window.editTmpItems = [];              //
window.isEditingMode = false;          //
window.filteredReportData = [];        //
window.currentReportType = '';         //
window.selectedReportItems = new Set(); //
window.notifiedEvents = new Set();     //

// Catálogo padrão de produtos
window.defaultProducts = ["CX PAP 125A", "AÇ CRISTAL", "AÇ LIQUIDO", "AÇ REFINADO", "SAL REFINADO"]; //

/**
 * Fecha qualquer menu de contexto aberto na tela
 */
window.closeContextMenu = function() {
    document.querySelectorAll('.context-menu').forEach(x => x.style.display = 'none');
};