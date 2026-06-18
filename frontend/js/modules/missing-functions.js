// ===================================================================================
//  MÓDULO DE FUNÇÕES COMPLEMENTARES - Wilson Core 2.4.3
//  Contém todas as funções que existiam no script.js legado mas não foram migradas
//  para os módulos ES. Todas são expostas via window.* para compatibilidade com
//  os event handlers inline do HTML (onclick="...", onchange="...", etc.)
// ===================================================================================

// =========================================================
// MÓDULO DE ENTRADA INTELIGENTE (FUNIL / FILTER CHAIN)
// =========================================================

window.populateDatalist = function(listId, dataArr, displayField = 'nome') {
    const dl = document.getElementById(listId);
    if (!dl) return;
    dl.innerHTML = '';
    if (!dataArr || !Array.isArray(dataArr)) {
        console.warn(`[populateDatalist] dataArr é inválido ou não é um Array para a lista "${listId}"`);
        return;
    }
    dataArr.forEach(item => {
        const val = item[displayField] || item.nome;
        const opt = document.createElement('option');
        opt.value = val;
        dl.appendChild(opt);
    });
};

window.toggleCarrierInput = function() {
    const chk = document.getElementById('chkUseCarrier');
    const input = document.getElementById('inTransp');
    if (!chk || !input) return;

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
        window.entryState.selectedCarrierId = null;
        input.classList.remove('input-warning');
        window.filterChain('transportadora');
    }
    window.evaluateRequestNecessity();
};

window.filterChain = function(step) {
    const inForn = document.getElementById('inForn');
    const inTransp = document.getElementById('inTransp');
    const inMot = document.getElementById('inMot');
    const inPlaca = document.getElementById('inPlaca');
    const chkUseCarrier = document.getElementById('chkUseCarrier');
    if (!inForn || !inMot || !inPlaca || !chkUseCarrier) return;
    const useCarrier = chkUseCarrier.checked;

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
        window.entryState.selectedSupplierId = findId(window.suppliersData, inForn.value);
        window.checkFieldStatus('inForn', window.entryState.selectedSupplierId);

        if (useCarrier) {
            let validCarriers = window.carriersData;
            if (window.entryState.selectedSupplierId) {
                validCarriers = window.carriersData.filter(c => c.supplierIds && c.supplierIds.includes(window.entryState.selectedSupplierId));
            }
            window.populateDatalist('dlTransp', validCarriers, 'apelido');
        }
    }

    if (step === 'transportadora' || step === 'fornecedor') {
        if (useCarrier && inTransp) {
            window.entryState.selectedCarrierId = findId(window.carriersData, inTransp.value);
            window.checkFieldStatus('inTransp', window.entryState.selectedCarrierId);

            if (window.entryState.selectedCarrierId) {
                const validDrivers = window.driversData.filter(d => d.carrierIds && d.carrierIds.includes(window.entryState.selectedCarrierId));
                window.populateDatalist('dlMot', validDrivers);
            } else {
                window.populateDatalist('dlMot', window.driversData);
            }
        } else {
            window.entryState.selectedCarrierId = null;
            if (window.entryState.selectedSupplierId) {
                const validDrivers = window.driversData.filter(d => d.supplierIds && d.supplierIds.includes(window.entryState.selectedSupplierId));
                window.populateDatalist('dlMot', validDrivers);
            } else {
                window.populateDatalist('dlMot', window.driversData);
            }
        }
    }

    if (step === 'motorista' || step === 'transportadora' || (step === 'fornecedor' && !useCarrier)) {
        window.entryState.selectedDriverId = findId(window.driversData, inMot.value);
        window.checkFieldStatus('inMot', window.entryState.selectedDriverId);

        let validPlates = [];
        if (window.entryState.selectedDriverId) {
            validPlates = window.platesData.filter(p => p.driverId === window.entryState.selectedDriverId);
        }
        window.populateDatalist('dlPlaca', validPlates, 'numero');
    }

    if (step === 'placa' || step === 'motorista') {
        let raw = inPlaca.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (raw.length >= 7) {
            raw = raw.substring(0, 7);
            inPlaca.value = raw.substring(0, 3) + '-' + raw.substring(3);
        }

        window.entryState.selectedPlateId = window.platesData.find(p =>
            p.numero.replace('-', '') === raw
        )?.id || null;

        window.checkFieldStatus('inPlaca', window.entryState.selectedPlateId);
    }

    window.evaluateRequestNecessity();
};

window.checkFieldStatus = function(inputId, idFound) {
    const el = document.getElementById(inputId);
    if (!el) return;
    if (el.value.trim() !== '' && !idFound) el.classList.add('input-warning');
    else el.classList.remove('input-warning');
};

window.checkProductInput = function() {
    const el = document.getElementById('tmpProd');
    if (!el) return;
    const val = el.value.toUpperCase();

    const dl = document.getElementById('prodListSuggestions');
    if (dl && dl.options.length === 0) {
        dl.innerHTML = '';
        window.productsData.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nome;
            dl.appendChild(opt);
        });
    }

    const exists = window.productsData.find(p => p.nome === val);
    if (val.length > 0 && !exists) {
        el.classList.add('input-warning');
    } else {
        el.classList.remove('input-warning');
    }

    window.evaluateRequestNecessity();
};

window.evaluateRequestNecessity = function() {
    const inForn = document.getElementById('inForn');
    const inTransp = document.getElementById('inTransp');
    const inMot = document.getElementById('inMot');
    const inPlaca = document.getElementById('inPlaca');
    const chkUseCarrier = document.getElementById('chkUseCarrier');
    if (!inForn || !inMot || !inPlaca || !chkUseCarrier) return;
    const useCarrier = chkUseCarrier.checked;

    const isNewForn = inForn.value && !window.entryState.selectedSupplierId;
    const isNewTransp = useCarrier && inTransp && inTransp.value && !window.entryState.selectedCarrierId;
    const isNewMot = inMot.value && !window.entryState.selectedDriverId;
    const isNewPlaca = inPlaca.value && !window.entryState.selectedPlateId;
    const hasNewProd = window.tmpItems.some(i => i.isNew);

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
};

// =========================================================
// MÓDULO DE EDIÇÃO E EXCLUSÃO DE CAMINHÃO
// =========================================================

window.openEditTruck = function(id) {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar veículos.");
        return;
    }
    const truck = window.patioData.find(t => t.id === id);
    if (!truck) return;

    document.getElementById('editTruckId').value = id;
    document.getElementById('editTruckPlaca').value = truck.placa;

    const secMapReverse = {
        'DOCA (ALM)': 'DOCA',
        'GAVA': 'GAVA',
        'MANUTENÇÃO': 'MANUTENCAO',
        'INFRAESTRUTURA': 'INFRA',
        'SALA DE PESAGEM': 'PESAGEM',
        'LABORATÓRIO': 'LAB',
        'SST': 'SST',
        'CD': 'CD',
        'OUTROS': 'OUT',
        'COMPRAS': 'COMPRAS'
    };
    document.getElementById('editTruckDestino').value = secMapReverse[truck.localSpec] || 'OUT';
    document.getElementById('editTruckLaudo').checked = truck.comLaudo || false;

    // Carrega produtos para a variável temporária de edição
    window.editTmpItems = JSON.parse(JSON.stringify(
        (truck.cargas && truck.cargas[0] && truck.cargas[0].produtos) ? truck.cargas[0].produtos : []
    ));
    window.renderEditTmpList();

    document.getElementById('modalEditTruck').style.display = 'flex';
    window.closeContextMenu();
};

window.renderEditTmpList = function() {
    const ul = document.getElementById('editTmpList');
    if (!ul) return;
    ul.innerHTML = '';
    (window.editTmpItems || []).forEach((item, index) => {
        ul.innerHTML += `
            <li>
                <span><b>${item.nf || 'S/N'}</b> - ${item.nome}</span>
                <button class="btn-icon-remove" onclick="window.removeEditTmpItem(${index})"><i class="fas fa-trash"></i></button>
            </li>`;
    });
};

window.addEditTmpItem = function() {
    const nf = document.getElementById('editTmpNF').value;
    const prod = document.getElementById('editTmpProd').value.toUpperCase();
    if (prod) {
        window.editTmpItems.push({ nf: nf || 'S/N', nome: prod });
        window.renderEditTmpList();
        document.getElementById('editTmpProd').value = '';
        document.getElementById('editTmpNF').value = '';
    }
};

window.removeEditTmpItem = function(i) {
    window.editTmpItems.splice(i, 1);
    window.renderEditTmpList();
};

window.openProdSelectForEdit = function() {
    window.isEditingMode = true;
    if (typeof window.openProdSelect === 'function') window.openProdSelect();
};

window.saveEditTruck = function() {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar veículos.");
        return;
    }
    const id = document.getElementById('editTruckId').value;
    const placa = document.getElementById('editTruckPlaca').value.toUpperCase();
    const dest = document.getElementById('editTruckDestino').value;
    const laudo = document.getElementById('editTruckLaudo').checked;

    if (!id) return alert("Erro: ID do veículo não encontrado.");

    const truckIndex = window.patioData.findIndex(t => t.id === id);

    if (truckIndex > -1) {
        const truck = window.patioData[truckIndex];

        truck.placa = placa;
        truck.comLaudo = laudo;

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

        if (truck.status !== 'SAIU') {
            truck.local = newSec.c;
            truck.localSpec = newSec.n;
        }

        if (window.editTmpItems && window.editTmpItems.length > 0) {
            if (!truck.cargas || truck.cargas.length === 0) truck.cargas = [{}];
            truck.cargas[0].produtos = JSON.parse(JSON.stringify(window.editTmpItems));

            const mapIndex = window.mapData.findIndex(m => m.id === id);
            if (mapIndex > -1) {
                const currentForn = window.mapData[mapIndex].rows[0]?.forn || truck.empresa || 'Diversos';
                const newRows = window.editTmpItems.map((item, idx) => ({
                    id: id + '_' + idx,
                    desc: item.nome,
                    qty: '',
                    qty_nf: '',
                    nf: item.nf,
                    forn: currentForn,
                    owners: {}
                }));
                for (let i = newRows.length; i < 8; i++) {
                    newRows.push({ id: id + '_x_' + i, desc: '', qty: '', qty_nf: '', nf: '', forn: '', owners: {} });
                }
                window.mapData[mapIndex].rows = newRows;
            }
        }

        window.saveAll();
        window.renderPatio();
        document.getElementById('modalEditTruck').style.display = 'none';
    } else {
        alert("Erro Crítico: Veículo não encontrado na lista para edição.");
    }
};

window.deleteTruck = function() {
    const p = window.userPermissions || { canDeleteTruck: window.isRecebimento || window.isAdmin };
    if (!p.canDeleteTruck) {
        alert("Acesso negado: Você não tem permissão para excluir veículos.");
        return;
    }
    const id = document.getElementById('editTruckId').value;
    if (confirm('ATENÇÃO: Isso apaga o registro do pátio, mapa cego e pesagem. Confirmar?')) {
        window.patioData = window.patioData.filter(x => x.id !== id);
        window.mapData = window.mapData.filter(x => x.id !== id);
        window.mpData = window.mpData.filter(x => x.id !== id);
        window.saveAll();
        window.renderPatio();
        document.getElementById('modalEditTruck').style.display = 'none';
    }
};

window.confirmDeleteTruck = function(id) {
    const p = window.userPermissions || { canDeleteTruck: window.isRecebimento || window.isAdmin };
    if (!p.canDeleteTruck) {
        alert("Acesso negado: Você não tem permissão para excluir veículos.");
        return;
    }
    window.contextTruckId = id;
    window.deleteOptionSelected = 'queue';
    document.querySelectorAll('.del-option').forEach(el => el.classList.remove('selected'));
    const optQueue = document.getElementById('optQueue');
    if (optQueue) optQueue.classList.add('selected');
    const modal = document.getElementById('modalDeleteConfirm');
    if (modal) modal.style.display = 'flex';
    window.closeContextMenu();
};

window.selectDeleteOption = function(opt) {
    window.deleteOptionSelected = opt;
    document.querySelectorAll('.del-option').forEach(el => el.classList.remove('selected'));
    if (opt === 'queue') {
        const el = document.getElementById('optQueue');
        if (el) el.classList.add('selected');
    } else {
        const el = document.getElementById('optGeneral');
        if (el) el.classList.add('selected');
    }
};

window.executeDeleteTruck = function() {
    const p = window.userPermissions || { canDeleteTruck: window.isRecebimento || window.isAdmin };
    if (!p.canDeleteTruck) {
        alert("Acesso negado: Você não tem permissão para excluir veículos.");
        return;
    }
    const id = window.contextTruckId;
    if (!id) return;

    if (window.deleteOptionSelected === 'queue') {
        window.patioData = window.patioData.filter(x => x.id !== id);
    } else if (window.deleteOptionSelected === 'general') {
        window.patioData = window.patioData.filter(x => x.id !== id);
        window.mapData = window.mapData.filter(x => x.id !== id);
        window.mpData = window.mpData.filter(x => x.id !== id);
    }

    window.saveAll();
    window.renderPatio();

    const viewMapas = document.getElementById('view-mapas');
    if (viewMapas && viewMapas.classList.contains('active')) window.renderMapList();
    const viewMP = document.getElementById('view-materia-prima');
    if (viewMP && viewMP.classList.contains('active')) window.renderMateriaPrima();

    const modal = document.getElementById('modalDeleteConfirm');
    if (modal) modal.style.display = 'none';
    alert("Registro excluído com sucesso.");
};

// =========================================================
// MÓDULO DE CADASTROS (CRUD)
// =========================================================

window.openCadSelectModal = function() {
    const m = document.getElementById('modalCadSelect');
    if (m) m.style.display = 'flex';
};

window.openCadModal = function(type, editId = null) {
    const p = window.userPermissions || { canManageCatalogs: window.isRecebimento || window.isAdmin };
    if (!p.canManageCatalogs) {
        alert("Acesso negado: Você não tem permissão para gerenciar cadastros.");
        return;
    }
    const modalSel = document.getElementById('modalCadSelect');
    if (modalSel) modalSel.style.display = 'none';
    const modal = document.getElementById('modalCadForm');
    if (!modal) return;
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
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="00.000.000/0000-00" oninput="this.value = window.Validators.cleanNumber(this.value)">
            </div>
        `;
    } else if (type === 'transportadora') {
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
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="00.000.000/0000-00" oninput="this.value = window.Validators.cleanNumber(this.value)">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-link"></i> Fornecedores Vinculados (Segure Ctrl)</label>
                <select id="cadLinks" multiple class="form-input-styled" style="height:100px;"></select>
            </div>
        `;
        setTimeout(() => window.populateSelect('cadLinks', window.suppliersData, 'nome'), 50);
    } else if (type === 'motorista') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-user"></i> Nome Completo</label>
                <input id="cadName" class="form-input-styled" placeholder="Ex: JOAO DA SILVA">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-id-card"></i> CPF / CNH</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="Apenas números" oninput="this.value = window.Validators.cleanNumber(this.value)">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-truck-loading"></i> Transportadora Principal</label>
                <select id="cadLinks" class="form-input-styled">
                    <option value="">-- Selecione --</option>
                </select>
            </div>
        `;
        setTimeout(() => window.populateSelect('cadLinks', window.carriersData, 'apelido'), 50);
    } else if (type === 'placa') {
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
        setTimeout(() => window.populateSelect('cadLinks', window.driversData, 'nome'), 50);
    } else if (type === 'produto') {
        fields.innerHTML = `
            <div class="form-full">
                <label class="form-label"><i class="fas fa-box"></i> Nome do Produto</label>
                <input id="cadName" class="form-input-styled" placeholder="Ex: AÇUCAR CRISTAL">
            </div>
            <div class="form-full">
                <label class="form-label"><i class="fas fa-barcode"></i> Código do Produto</label>
                <input id="cadDoc" class="form-input-styled input-fit-content" placeholder="Ex: 102030">
            </div>
        `;
    }

    if (editId) {
        setTimeout(() => {
            let item = null;
            if (type === 'fornecedor') item = window.suppliersData.find(x => x.id === editId);
            else if (type === 'transportadora') item = window.carriersData.find(x => x.id === editId);
            else if (type === 'motorista') item = window.driversData.find(x => x.id === editId);
            else if (type === 'placa') item = window.platesData.find(x => x.id === editId);
            else if (type === 'produto') item = window.productsData.find(x => x.id === editId);

            if (item) {
                const cadName = document.getElementById('cadName');
                const cadNick = document.getElementById('cadNick');
                const cadDoc = document.getElementById('cadDoc');
                if (cadName) cadName.value = item.nome || item.numero || '';
                if (cadNick) cadNick.value = item.apelido || '';
                if (cadDoc) cadDoc.value = item.cnpj || item.doc || item.codigo || '';

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
};

window.populateSelect = function(elId, data, displayField) {
    const sel = document.getElementById(elId);
    if (!sel) return;

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
};

window.saveOfficialCadastro = function() {
    const p = window.userPermissions || { canManageCatalogs: window.isRecebimento || window.isAdmin };
    if (!p.canManageCatalogs) {
        alert("Acesso negado: Você não tem permissão para gerenciar cadastros.");
        return;
    }
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
        const cadNick = document.getElementById('cadNick');
        const cadDoc = document.getElementById('cadDoc');
        updateList(window.suppliersData, {
            nome: name,
            apelido: cadNick ? cadNick.value.toUpperCase().trim() : '',
            cnpj: cadDoc ? cadDoc.docVal || cadDoc.value : ''
        });
    } else if (type === 'transportadora') {
        const cadNick = document.getElementById('cadNick');
        const cadDoc = document.getElementById('cadDoc');
        const links = Array.from(document.getElementById('cadLinks').selectedOptions).map(o => o.value);
        updateList(window.carriersData, {
            nome: name,
            apelido: cadNick ? cadNick.value.toUpperCase().trim() : '',
            cnpj: cadDoc ? cadDoc.value : '',
            supplierIds: links
        });
    } else if (type === 'motorista') {
        const cadDoc = document.getElementById('cadDoc');
        const link = document.getElementById('cadLinks').value;
        updateList(window.driversData, {
            nome: name,
            doc: cadDoc ? cadDoc.value : '',
            carrierIds: link ? [link] : []
        });
    } else if (type === 'placa') {
        const formattedPlate = window.Validators.validatePlate(name);
        if (!formattedPlate) return;
        const link = document.getElementById('cadLinks').value;
        updateList(window.platesData, {
            numero: formattedPlate,
            driverId: link
        });
    } else if (type === 'produto') {
        const cadDoc = document.getElementById('cadDoc');
        updateList(window.productsData, {
            nome: name,
            codigo: cadDoc ? cadDoc.value : ''
        });
    }

    window.saveAll();
    document.getElementById('modalCadForm').style.display = 'none';
    window.renderCadastros();
};

window.deleteCadastro = function(type, id) {
    const p = window.userPermissions || { canManageCatalogs: window.isRecebimento || window.isAdmin };
    if (!p.canManageCatalogs) {
        alert("Acesso negado: Você não tem permissão para excluir cadastros.");
        return;
    }
    if (!confirm("Tem certeza que deseja excluir este registro?\nIsso pode afetar históricos antigos.")) return;

    if (type === 'fornecedor') window.suppliersData = window.suppliersData.filter(x => x.id !== id);
    else if (type === 'transportadora') window.carriersData = window.carriersData.filter(x => x.id !== id);
    else if (type === 'motorista') window.driversData = window.driversData.filter(x => x.id !== id);
    else if (type === 'placa') window.platesData = window.platesData.filter(x => x.id !== id);
    else if (type === 'produto') window.productsData = window.productsData.filter(x => x.id !== id);

    window.saveAll();
    window.renderCadastros();
};

window.openCtxMenuCad = function(x, y, id, type) {
    window.contextCadId = id;
    const menu = document.getElementById('ctxMenuCad');
    if (!menu) return;
    menu.innerHTML = `
        <div class="ctx-item" onclick="window.openCadModal('${type}', '${id}')"><i class="fas fa-edit"></i> Editar</div>
        <div class="ctx-item" style="color:red" onclick="window.deleteCadastro('${type}', '${id}')"><i class="fas fa-trash"></i> Excluir</div>
    `;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
};

window.renderRequestsTable = function(term) {
    const tbody = document.getElementById('cadTableBody');
    if (!tbody) return;
    window.requests.filter(r => r.status === 'PENDENTE' && r.type === 'complex_entry').forEach(r => {
        const d = r.data;
        let novos = [];
        if (!d.supplier.id) novos.push('Fornecedor');
        if (!d.carrier.id) novos.push('Transp');
        if (!d.driver.id) novos.push('Mot');
        if (!d.plate.id) novos.push('Placa');
        if (d.newProducts && d.newProducts.length > 0) novos.push(`${d.newProducts.length} Prod(s)`);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(r.timestamp).toLocaleString()}</td>
            <td>
                <b>Cadastros Pendentes:</b> <span style="color:#d97706">${novos.join(', ')}</span>
                <br><small>Solicitado por: ${r.user}</small>
            </td>
            <td style="text-align:right">
                <button class="btn btn-save btn-small" onclick="window.openUnifiedApprovalModal('${r.id}')">
                    <i class="fas fa-search"></i> Analisar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openUnifiedApprovalModal = function(reqId) {
    const p = window.userPermissions || { canViewNotifications: window.isRecebimento || window.isAdmin };
    if (!p.canViewNotifications) {
        alert("Acesso negado: Você não tem permissão para analisar ou aprovar requisições.");
        return;
    }
    const req = window.requests.find(r => r.id === reqId);
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
                        <label class="form-label">Código (Obrigatório)</label>
                        <input id="appProdCode_${idx}" class="form-input-styled" placeholder="Ex: 102030">
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
};

window.confirmUnifiedApproval = function() {
    const reqId = document.getElementById('appReqId').value;
    const req = window.requests.find(r => r.id === reqId);
    if (!req) return;
    const d = req.data;

    let supId = d.supplier.id;
    if (!supId && d.supplier.name) {
        const name = (document.getElementById('appSupName') || {}).value || d.supplier.name;
        const nick = (document.getElementById('appSupNick') || {}).value || '';
        const doc = (document.getElementById('appSupDoc') || {}).value || '';
        supId = Date.now().toString();
        window.suppliersData.push({ id: supId, nome: name.toUpperCase(), apelido: nick.toUpperCase(), cnpj: doc });
    }

    let carId = d.carrier.id;
    if (!carId && d.carrier.name) {
        const name = (document.getElementById('appCarrName') || {}).value || d.carrier.name;
        const nick = (document.getElementById('appCarrNick') || {}).value || '';
        const doc = (document.getElementById('appCarrDoc') || {}).value || '';
        carId = (Date.now() + 1).toString();
        window.carriersData.push({ id: carId, nome: name.toUpperCase(), apelido: nick.toUpperCase(), cnpj: doc, supplierIds: supId ? [supId] : [] });
    } else if (carId && supId) {
        const c = window.carriersData.find(x => x.id === carId);
        if (c && !c.supplierIds.includes(supId)) c.supplierIds.push(supId);
    }

    let drivId = d.driver.id;
    if (!drivId && d.driver.name) {
        const name = (document.getElementById('appDrivName') || {}).value || d.driver.name;
        const doc = (document.getElementById('appDrivDoc') || {}).value || '';
        drivId = (Date.now() + 2).toString();
        window.driversData.push({ id: drivId, nome: name.toUpperCase(), doc: doc, carrierIds: carId ? [carId] : [] });
    } else if (drivId && carId) {
        const dr = window.driversData.find(x => x.id === drivId);
        if (dr && !dr.carrierIds.includes(carId)) dr.carrierIds.push(carId);
    }

    let plateId = d.plate.id;
    if (!plateId && d.plate.number) {
        const num = (document.getElementById('appPlateNum') || {}).value || d.plate.number;
        plateId = (Date.now() + 3).toString();
        window.platesData.push({ id: plateId, numero: num.toUpperCase(), driverId: drivId });
    }

    if (d.newProducts && d.newProducts.length > 0) {
        d.newProducts.forEach((_, idx) => {
            const nameEl = document.getElementById(`appProdName_${idx}`);
            const codeEl = document.getElementById(`appProdCode_${idx}`);
            const name = nameEl ? nameEl.value.toUpperCase() : '';
            const code = codeEl ? codeEl.value : '';
            if (name && !window.productsData.find(p => p.nome === name)) {
                window.productsData.push({ id: (Date.now() + idx + 10).toString(), nome: name, codigo: code });
            }
        });
    }

    const truck = window.patioData.find(t => t.linkedRequestId === reqId);
    if (truck) {
        truck.isProvisory = false;
        truck.supplierId = supId;
        truck.carrierId = carId;
        truck.driverId = drivId;
        truck.plateId = plateId;
        const appCarrNick = document.getElementById('appCarrNick');
        const appCarrName = document.getElementById('appCarrName');
        if (!d.carrier.id && (appCarrNick || appCarrName)) {
            truck.empresa = (appCarrNick && appCarrNick.value) || (appCarrName && appCarrName.value) || truck.empresa;
        }
        const appPlateNum = document.getElementById('appPlateNum');
        if (!d.plate.id && appPlateNum) truck.placa = appPlateNum.value;
    }

    const mpItem = window.mpData.find(m => m.linkedRequestId === reqId);
    if (mpItem) {
        mpItem.notes = 'Pesagem Manual';
        const appFornName = document.getElementById('appSupName');
        if (appFornName && appFornName.value) {
            mpItem.empresa = appFornName.value.toUpperCase();
        }
        const appPlateNum = document.getElementById('appPlateNum');
        if (appPlateNum && appPlateNum.value) {
            mpItem.placa = appPlateNum.value.toUpperCase();
        }
    }

    // Capturar assinatura digital do canvas se desenhada
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
        const signatureData = canvas.toDataURL();
        const map = window.mapData.find(m => m.id === truck?.id);
        if (map) {
            if (!map.signatures) map.signatures = {};
            map.signatures[req.requester || 'Conferente'] = signatureData;
            map.conferenteSignature = signatureData; // Atalho
        }
    }

    req.status = 'APROVADO';
    window.saveAll();
    window.renderCadastros();
    document.getElementById('modalUnifiedApproval').style.display = 'none';
    alert("Tudo aprovado e cadastrado com sucesso!");
};

window.rejectUnifiedRequest = function() {
    const reqId = document.getElementById('appReqId').value;
    if (!confirm("Tem certeza que deseja rejeitar? O caminhão continuará como provisório/pendente.")) return;

    const req = window.requests.find(r => r.id === reqId);
    if (req) req.status = 'REJEITADO';

    window.saveAll();
    window.renderCadastros();
    document.getElementById('modalUnifiedApproval').style.display = 'none';
};

// =========================================================
// MÓDULO DE MATÉRIA PRIMA (PESAGEM)
// =========================================================

window.goToMapFromContext = function(id) {
    window.closeContextMenu();
    window.navTo('mapas');
    setTimeout(() => {
        if (typeof window.loadMap === 'function') window.loadMap(id);
    }, 100);
};

window.deleteMateriaPrima = function() {
    const p = window.userPermissions || { canDeleteTruck: window.isRecebimento || window.isAdmin };
    if (!p.canDeleteTruck) {
        alert("Acesso negado: Você não tem permissão para excluir registros de pesagem.");
        return;
    }
    if (confirm("Deseja excluir este registro de pesagem?")) {
        window.mpData = window.mpData.filter(x => x.id !== window.contextMPId);
        window.saveAll();
        window.renderMateriaPrima();
    }
    window.closeContextMenu();
};

window.openManualMPModal = function() {
    window.openManualWeighingModal();
};

window.saveManualMP = function() {
    const pl = (document.getElementById('manMPPlaca') || {}).value || '';
    const pr = (document.getElementById('manMPProd') || {}).value || '';
    if (!pl || !pr) return alert("Placa e Produto são obrigatórios.");
    const id = 'MAN_' + Date.now();
    const d = (document.getElementById('mpDateFilter') || {}).value || window.getBrazilTime().split('T')[0];
    window.mpData.push({
        id: id,
        date: d,
        produto: pr,
        empresa: (document.getElementById('manMPEmp') || {}).value || '',
        placa: pl.toUpperCase(),
        local: 'MANUAL',
        chegada: window.getBrazilTime(),
        entrada: window.getBrazilTime(),
        tara: parseFloat((document.getElementById('manMPTara') || {}).value) || 0,
        bruto: 0, liq: 0, pesoNF: 0, difKg: 0, difPerc: 0,
        nf: (document.getElementById('manMPNF') || {}).value || '',
        notes: '',
        isManual: true
    });
    window.saveAll();
    window.renderMateriaPrima();
    const modal = document.getElementById('modalManualMP');
    if (modal) modal.style.display = 'none';
};

window.openEditMPModal = function() {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar registros.");
        return;
    }
    const m = window.mpData.find(x => x.id === window.contextMPId);
    if (!m) return;
    document.getElementById('editMPId').value = m.id;
    document.getElementById('editMPEmpresa').value = m.empresa;
    document.getElementById('editMPPlaca').value = m.placa;
    document.getElementById('editMPProduto').value = m.produto;
    document.getElementById('modalEditMP').style.display = 'flex';
    window.closeContextMenu();
};

window.saveEditMP = function() {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar registros.");
        return;
    }
    const id = document.getElementById('editMPId').value;
    const i = window.mpData.findIndex(x => x.id === id);
    if (i > -1) {
        window.mpData[i].empresa = document.getElementById('editMPEmpresa').value;
        window.mpData[i].placa = document.getElementById('editMPPlaca').value;
        window.mpData[i].produto = document.getElementById('editMPProduto').value;
        window.saveAll();
        window.renderMateriaPrima();
    }
    document.getElementById('modalEditMP').style.display = 'none';
};

window.openNoteMPModal = function() {
    const m = window.mpData.find(x => x.id === window.contextMPId);
    if (!m) return;
    document.getElementById('noteMPId').value = m.id;
    document.getElementById('noteMPText').value = m.notes || '';
    document.getElementById('modalNoteMP').style.display = 'flex';
    window.closeContextMenu();
};

window.saveNoteMP = function() {
    const id = document.getElementById('noteMPId').value;
    const i = window.mpData.findIndex(x => x.id === id);
    if (i > -1) {
        window.mpData[i].notes = document.getElementById('noteMPText').value;
        window.saveAll();
        window.renderMateriaPrima();
    }
    document.getElementById('modalNoteMP').style.display = 'none';
};

// =========================================================
// MÓDULO DE CARREGAMENTO
// =========================================================

window.openModalCarregamento = function() {
    try {
        console.log("[openModalCarregamento] Abrindo modal de carregamento");
        
        // Resetar os inputs do modal
        const motInput = document.getElementById('carrMotorista');
        const cavInput = document.getElementById('carrCavalo');
        if (motInput) motInput.value = '';
        if (cavInput) cavInput.value = '';
        
        const container = document.getElementById('carretaContainer');
        if (container) {
            // Reinicializar o container com apenas uma input e o list correto
            container.innerHTML = `<input type="text" class="carrCarretaInput form-input-styled" placeholder="Placa da carreta" list="dlPlacaCarrCarr" autocomplete="off">`;
        }

        // Popular sugestões dinâmicas de motoristas e placas (cavalos / carretas)
        window.populateDatalist('dlMotCarr', window.driversData);
        window.populateDatalist('dlPlacaCavCarr', window.platesData, 'numero');
        window.populateDatalist('dlPlacaCarrCarr', window.platesData, 'numero');

        const modal = document.getElementById('modalCarregamento');
        if (modal) modal.style.display = 'flex';
    } catch (e) {
        console.error("[openModalCarregamento] Erro ao abrir modal de carregamento:", e);
        alert("Erro ao abrir modal de carregamento: " + e.message);
    }
};

window.addCarretaField = function() {
    const container = document.getElementById('carretaContainer');
    if (container) {
        container.innerHTML += `<input type="text" class="carrCarretaInput form-input-styled" style="width:100%; margin-top:5px;" placeholder="Placa da carreta" list="dlPlacaCarrCarr" autocomplete="off">`;
    }
};

window.saveCarregamento = function() {
    try {
        const mot = (document.getElementById('carrMotorista') || {}).value || '';
        const cav = (document.getElementById('carrCavalo') || {}).value || '';
        const arr = [];
        document.querySelectorAll('.carrCarretaInput').forEach(i => { if (i.value) arr.push(i.value); });
        
        if (!mot || !cav) {
            return alert("Por favor, preencha o motorista e a placa do cavalo.");
        }

        const todayStr = window.getBrazilTime().split('T')[0];
        
        if (!Array.isArray(window.carregamentoData)) {
            window.carregamentoData = [];
        }

        window.carregamentoData.push({
            id: Date.now().toString(),
            date: todayStr,
            motorista: mot,
            cavalo: cav,
            carretas: arr,
            tara: 0, bruto: 0, liq: 0,
            status: 'AGUARDANDO',
            checkin: window.getBrazilTime()
        });
        
        window.saveAll();
        const modal = document.getElementById('modalCarregamento');
        if (modal) modal.style.display = 'none';
        window.renderCarregamento();
        alert("Carregamento manual lançado com sucesso!");
    } catch (err) {
        console.error("[saveCarregamento] Erro:", err);
        alert("Erro ao salvar carregamento: " + err.message);
    }
};

window.updateCarrWeight = function(id, f, v) {
    const i = window.carregamentoData.findIndex(c => c.id === id);
    if (i > -1) {
        window.carregamentoData[i][f] = parseFloat(v) || 0;
        window.carregamentoData[i].liq = window.carregamentoData[i].bruto - window.carregamentoData[i].tara;
        window.saveAll();
        window.renderCarregamento();
    }
};

window.openCarrContextMenu = function(x, y) {
    const m = document.getElementById('ctxMenuCarr');
    if (!m) return;
    const p = window.userPermissions || {
        canEditTruck: window.isRecebimento || window.isAdmin,
        canDeleteTruck: window.isRecebimento || window.isAdmin
    };
    let items = '';
    if (p.canEditTruck) {
        items += `<div class="ctx-item" onclick="window.openEditCarrModal()"><i class="fas fa-edit"></i> Editar</div>`;
    }
    items += `<div class="ctx-item" onclick="window.openNoteCarrModal()"><i class="fas fa-sticky-note"></i> Nota</div>`;
    if (p.canDeleteTruck) {
        items += `<div class="ctx-item" style="color:red" onclick="window.deleteCarregamento()"><i class="fas fa-trash"></i> Excluir</div>`;
    }
    m.innerHTML = items;
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    m.style.display = 'block';
};

window.openEditCarrModal = function() {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar registros.");
        return;
    }
    const c = window.carregamentoData.find(x => x.id === window.contextCarrId);
    if (!c) return;
    document.getElementById('editCarrId').value = c.id;
    document.getElementById('editCarrMot').value = c.motorista;
    document.getElementById('editCarrCav').value = c.cavalo;
    document.getElementById('modalEditCarr').style.display = 'flex';
    window.closeContextMenu();
};

window.saveEditCarr = function() {
    const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
    if (!p.canEditTruck) {
        alert("Acesso negado: Você não tem permissão para editar registros.");
        return;
    }
    const id = document.getElementById('editCarrId').value;
    const i = window.carregamentoData.findIndex(x => x.id === id);
    if (i > -1) {
        window.carregamentoData[i].motorista = document.getElementById('editCarrMot').value;
        window.carregamentoData[i].cavalo = document.getElementById('editCarrCav').value;
        window.saveAll();
        window.renderCarregamento();
    }
    document.getElementById('modalEditCarr').style.display = 'none';
};

window.deleteCarregamento = function() {
    const p = window.userPermissions || { canDeleteTruck: window.isRecebimento || window.isAdmin };
    if (!p.canDeleteTruck) {
        alert("Acesso negado: Você não tem permissão para excluir registros.");
        return;
    }
    if (confirm('Excluir?')) {
        window.carregamentoData = window.carregamentoData.filter(x => x.id !== window.contextCarrId);
        window.saveAll();
        window.renderCarregamento();
    }
    window.closeContextMenu();
};

window.openNoteCarrModal = function() {
    const c = window.carregamentoData.find(x => x.id === window.contextCarrId);
    if (!c) return;
    document.getElementById('noteCarrId').value = c.id;
    document.getElementById('noteCarrText').value = c.notes || '';
    document.getElementById('modalNoteCarr').style.display = 'flex';
    window.closeContextMenu();
};

window.saveNoteCarr = function() {
    const id = document.getElementById('noteCarrId').value;
    const i = window.carregamentoData.findIndex(x => x.id === id);
    if (i > -1) {
        window.carregamentoData[i].notes = document.getElementById('noteCarrText').value;
        window.saveAll();
        window.renderCarregamento();
    }
    document.getElementById('modalNoteCarr').style.display = 'none';
};

// =========================================================
// MÓDULO DE NOTIFICAÇÕES E REQUISIÇÕES
// =========================================================

window.updateBadge = function() {
    const p = window.userPermissions || { canViewNotifications: window.isRecebimento || window.isAdmin };
    const isAuthorized = p.canViewNotifications;
    const pending = isAuthorized ? window.requests.filter(r => r.status === 'PENDENTE').length : 0;
    const b = document.getElementById('badgeNotif');
    if (b) {
        if (pending > 0) {
            b.innerText = pending;
            b.style.display = 'inline-block';
        } else {
            b.style.display = 'none';
        }
    }
};

window.checkForNotifications = function() {
    const modal = document.getElementById('modalNotification');
    if (modal && modal.style.display === 'flex') return;

    const todayStr = window.getBrazilTime().split('T')[0];

    if (typeof window.isConferente !== 'undefined' && window.isConferente) {
        const queue = window.patioData.filter(c =>
            c.status === 'FILA' &&
            (c.chegada || '').startsWith(todayStr)
        );

        for (const truck of queue) {
            const arrivalKey = truck.id + '_arrival';
            if (window.notifiedEvents.has(arrivalKey)) continue;

            let shouldNotify = false;
            if (truck.local === 'ALM' && window.userSubType === 'ALM') shouldNotify = true;
            else if (truck.local === 'GAVA' && window.userSubType === 'GAVA') shouldNotify = true;
            else if (truck.local === 'OUT' && !['ALM', 'GAVA'].includes(window.userSubType)) shouldNotify = true;
            else if (!window.userSubType) shouldNotify = true;

            if (shouldNotify) {
                window.sendSystemNotification(
                    "Novo Veículo na Fila",
                    `Setor: ${truck.localSpec}\n${truck.empresa}\nPlaca: ${truck.placa}`,
                    'patio',
                    truck.id
                );
                window.notifiedEvents.add(arrivalKey);
            }
        }
    }

    const call = window.patioData.find(c =>
        c.status === 'LIBERADO' &&
        !c.recebimentoNotified &&
        (c.chegada || '').startsWith(todayStr)
    );

    const pCheck = window.userPermissions || { canViewNotifications: window.isRecebimento || window.isAdmin };
    if (call && pCheck.canViewNotifications) {
        if (!window.notifiedEvents.has(call.id)) {
            const releaser = call.releasedBy || 'Operador';
            const msg = `${releaser} liberou ${call.empresa} para descarga\nPlaca: ${call.placa}`;
            window.showNotificationPopup('release', call);
            window.sendSystemNotification("Veículo Liberado!", msg, 'patio', call.id);
            window.notifiedEvents.add(call.id);
            return;
        }
    }

    const div = window.requests.find(r =>
        r.type === 'divergence' &&
        r.target === window.loggedUser.username &&
        r.status === 'pending'
    );

    if (div && !window.notifiedEvents.has(div.id)) {
        window.showNotificationPopup('divergence', div);
        window.sendSystemNotification("⚠️ DIVERGÊNCIA", `Motivo: ${div.msg}`, 'mapas', div.mapId);
        window.notifiedEvents.add(div.id);
    }

    window.updateBadge();
};

window.showNotificationPopup = function(type, data) {
    const p = document.getElementById('notifPopupContent');
    const modal = document.getElementById('modalNotification');
    if (!modal || !p) return;
    modal.style.display = 'flex';
    if (type === 'release') {
        p.innerHTML = `<h2 style="color:green">Liberado!</h2><p>${data.empresa} - ${data.placa}</p><button class="btn btn-save" onclick="window.confirmNotification('release','${data.id}')">OK</button>`;
    } else {
        p.innerHTML = `<h2 style="color:red">Divergência</h2><p>${data.msg}</p><button class="btn btn-edit" onclick="window.confirmNotification('divergence','${data.id}')">Ver</button>`;
    }
};

window.confirmNotification = function(type, id) {
    if (type === 'release') {
        const i = window.patioData.findIndex(c => c.id === id);
        if (i > -1) window.patioData[i].recebimentoNotified = true;
    } else {
        const i = window.requests.findIndex(r => r.id == id);
        if (i > -1) {
            window.requests[i].status = 'seen';
            window.navTo('mapas');
            if (window.requests[i].mapId && typeof window.loadMap === 'function') window.loadMap(window.requests[i].mapId);
        }
    }
    const modalNotif = document.getElementById('modalNotification');
    if (modalNotif) modalNotif.style.display = 'none';
    window.saveAll();
};

window.resolveRequest = function(id, st) {
    const i = window.requests.findIndex(r => r.id === id);
    if (i > -1) {
        window.requests[i].status = st;
        if (st === 'approved' && window.requests[i].type === 'edit') {
            const m = window.mapData.find(x => x.id === window.requests[i].mapId);
            if (m) {
                m.forceUnlock = true;
                m.authorizedEditor = window.requests[i].requester;
            }
        }
        window.saveAll();
        if (typeof window.renderRequests === 'function') window.renderRequests();
        if (typeof window.updateBadge === 'function') window.updateBadge();
        // Se estivermos visualizando o mapa editado, recarrega para desbloquear na hora
        if (window.currentMapId === window.requests[i].mapId && typeof window.loadMap === 'function') {
            window.loadMap(window.currentMapId);
        }
    }
};

// =========================================================
// MÓDULO DE USUÁRIOS (ADMIN)
// =========================================================

window.renderUserList = function() {
    const tbody = document.getElementById('adminUserList');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.usersData.forEach(u => {
        const isMe = u.username === window.loggedUser.username;
        const btn = isMe
            ? '<span style="color:#999; font-size:0.8rem;">(Você)</span>'
            : `<button class="btn btn-edit btn-small" onclick="window.removeUser('${u.username}')" style="color:red; border-color:red;">Remover</button>`;
        let secDisplay = u.sector || '';
        if (u.subType) secDisplay += ` (${u.subType})`;
        tbody.innerHTML += `<tr><td><b>${u.username}</b></td><td>${u.role}</td><td>${secDisplay}</td><td>${btn}</td></tr>`;
    });
};

window.addNewUser = function() {
    const username = (document.getElementById('newUsername') || {}).value || '';
    const password = (document.getElementById('newPassword') || {}).value || '';
    const role = (document.getElementById('newRole') || {}).value || 'user';
    const sectorVal = (document.getElementById('newSector') || {}).value || 'recebimento';

    if (!username || !password) return alert('Preencha usuário e senha.');
    if (window.usersData.find(u => u.username === username)) return alert('Usuário já existe.');

    let sector = sectorVal;
    let subType = null;
    const subTypes = ['ALM', 'GAVA', 'INFRA', 'MANUT', 'LAB', 'SST', 'CD', 'COMPRAS'];
    if (subTypes.includes(sectorVal)) {
        sector = 'conferente';
        subType = sectorVal;
    }

    window.usersData.push({ username, password, role, sector, subType, firstLogin: true });
    window.saveAll();
    window.renderUserList();
    alert('Usuário criado com sucesso.');
};

window.removeUser = function(username) {
    if (!confirm(`Remover usuário "${username}"?`)) return;
    window.usersData = window.usersData.filter(u => u.username !== username);
    window.saveAll();
    window.renderUserList();
};

// =========================================================
// MÓDULO DE SISTEMA E CONFIGURAÇÕES
// =========================================================

window.toggleDarkMode = function() {
    const c = document.getElementById('darkModeToggle');
    if (!c) return;
    if (c.checked) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('aw_dark_mode', c.checked);
};

window.toggleFastMode = function() {
    const c = document.getElementById('fastModeToggle');
    if (!c) return;
    if (c.checked) document.body.classList.add('fast-mode');
    else document.body.classList.remove('fast-mode');
    localStorage.setItem('aw_fast_mode', c.checked);
};

window.goToWeightView = function(dateStr) {
    document.getElementById('modalReportDetail').style.display = 'none';
    window.navTo('materia-prima');
    const cleanDate = dateStr.split('T')[0];
    const dateInput = document.getElementById('mpDateFilter');
    if (dateInput) {
        dateInput.value = cleanDate;
        window.renderMateriaPrima();
    }
};

window.openReportDetails = function(indexOrId, typeOverride) {
    let item;
    let type = typeOverride || window.currentReportType;

    if (type === 'divergencias-single') {
        item = window.filteredReportData.find(x => x.id === indexOrId);
        type = 'divergencias';
    } else {
        if (typeof indexOrId === 'string') {
            item = window.filteredReportData.find(x => x.id === indexOrId);
        } else {
            item = window.filteredReportData[indexOrId];
        }
    }

    if (!item) return;

    const modal = document.getElementById('modalReportDetail');
    const content = document.getElementById('repDetailContent');
    const actions = document.getElementById('repDetailActions');

    let html = '';
    let buttons = '';

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
                    html += `<div style="border-bottom:1px solid #e5e5e5; padding:5px 0; font-size:0.85rem;"><b>${r.desc}</b><br><span style="color:#666;">NF: ${r.nf || 'S/N'} | Qtd Conferida: ${r.qty || 0}</span></div>`;
                }
            });
        }
        html += `</div>`;

        // Renderiza assinatura digitalizada do conferente se presente
        if (item.conferenteSignature) {
            html += `
                <div style="margin-top: 15px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; background: #fff;">
                    <span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">Assinatura Digitalizada</span>
                    <img src="${item.conferenteSignature}" style="max-height: 60px; max-width: 100%; border: 1px solid #e2e8f0; border-radius: 4px;" />
                </div>
            `;
        }

        buttons = `<button class="btn btn-save" onclick="document.getElementById('modalReportDetail').style.display='none'; window.navTo('mapas'); window.loadMap('${item.id}')"><i class="fas fa-map"></i> ABRIR MAPA CEGO</button>`;
    } else if (type === 'divergencias') {
        const diffColor = item.diff > 0 ? 'green' : 'red';
        const signal = item.diff > 0 ? '+' : '';
        
        if (item.isGroup) {
            html = `
                <div style="text-align:center; margin-bottom:15px;">
                    <h2 style="color:${diffColor}; margin:0;">${signal}${item.diff}</h2>
                    <small style="color:#666; text-transform:uppercase;">Diferença Consolidada</small>
                </div>
                <div class="form-grid">
                    <div><strong>Produto:</strong><br>${item.prod}</div>
                    <div><strong>Fornecedor:</strong><br>${item.forn}</div>
                    <div><strong>Última Ocorrência:</strong><br>${item.date ? item.date.split('-').reverse().join('/') : '---'}</div>
                    <div><strong>Notas Fiscais:</strong><br>${item.nf}</div>
                </div>
                <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin-top:15px;">
                    <div style="display:flex; justify-content:space-between;"><span>Total na Nota (Fiscal):</span><strong>${item.qnf}</strong></div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px;"><span>Total Contado (Físico):</span><strong>${item.qc}</strong></div>
                </div>
                <hr style="margin:15px 0; border-color:#cbd5e1;">
                <h5 style="margin-bottom:8px; color:var(--text-main); font-weight:600;">Mapas que compõem esta divergência:</h5>
                <div style="background:var(--bg-input); padding:10px; border-radius:6px; max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
            `;
            if (item.groupKeys && Array.isArray(item.groupKeys)) {
                item.groupKeys.forEach(gk => {
                    const associatedMap = window.mapData.find(m => m.id === gk.mapId);
                    if (associatedMap) {
                        const rowItem = associatedMap.rows[gk.rowIdx];
                        const diffVal = (parseFloat(rowItem.qty) || 0) - (parseFloat(rowItem.qty_nf) || 0);
                        const diffSignal = diffVal > 0 ? '+' : '';
                        const diffColorVal = diffVal > 0 ? 'green' : 'red';
                        
                        html += `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:6px; font-size:0.85rem; color:var(--text-main);">
                                <div>
                                    <b>Mapa: #${associatedMap.id}</b> (${associatedMap.date ? associatedMap.date.split('-').reverse().join('/') : '---'})<br>
                                    <span style="color:var(--text-muted);">Placa: ${associatedMap.placa} | NF: ${rowItem.nf || 'S/N'}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="color:${diffColorVal}; font-weight:bold;">${diffSignal}${diffVal}</span>
                                    <button class="btn btn-save btn-small" style="padding:4px 8px; font-size:0.75rem;" onclick="document.getElementById('modalReportDetail').style.display='none'; window.navTo('mapas'); window.loadMap('${associatedMap.id}')">Abrir</button>
                                </div>
                            </div>
                        `;
                    }
                });
            }
            html += `</div>`;
            buttons = `<button class="btn btn-edit" onclick="document.getElementById('modalReportDetail').style.display='none'">Fechar</button>`;
        } else {
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
                    <div style="display:flex; justify-content:space-between;"><span>Quantidade na Nota (Fiscal):</span><strong>${item.qnf}</strong></div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px;"><span>Quantidade Contada (Físico):</span><strong>${item.qc}</strong></div>
                </div>
            `;
            buttons = `<button class="btn btn-save" onclick="document.getElementById('modalReportDetail').style.display='none'; window.navTo('mapas'); window.loadMap('${item.mapId}')"><i class="fas fa-search-location"></i> VER NO MAPA</button>`;
        }
    } else if (type === 'materia-prima') {
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
        buttons = `<button class="btn btn-save" onclick="window.goToWeightView('${item.date}')"><i class="fas fa-weight"></i> IR PARA PESAGEM</button>`;
    } else if (type === 'patio' || type === 'carregamento') {
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
};

window.toggleReportSelection = function(id) {
    if (window.selectedReportItems.has(id)) window.selectedReportItems.delete(id);
    else window.selectedReportItems.add(id);
};

window.toggleDivergenceGroup = function(groupId) {
    const rows = document.querySelectorAll(`.div-group-${groupId}`);
    rows.forEach(r => r.classList.toggle('hidden-row'));
    const icon = document.getElementById(`icon-${groupId}`);
    if (icon) icon.classList.toggle('rotate-90');
};

// =========================================================
// MÓDULO DE PESAGEM MANUAL INTELIGENTE
// =========================================================

window.mwState = { supId: null, motId: null, plateId: null, prodExists: false };

window.updateMWMiniCalculations = function() {
    const bruto = parseFloat(document.getElementById('mwBruto').value) || 0;
    const tara = parseFloat(document.getElementById('mwTara').value) || 0;
    const pesoNF = parseFloat(document.getElementById('mwPesoNF').value) || 0;

    const liq = bruto - tara;
    const difKg = liq - pesoNF;
    const difPerc = pesoNF ? ((difKg / pesoNF) * 100).toFixed(2) : 0;

    const panel = document.getElementById('mwCalculationsPanel');
    if (panel) {
        if (bruto > 0 || tara > 0) {
            panel.style.display = 'flex';
        } else {
            panel.style.display = 'none';
        }
    }

    const calcLiq = document.getElementById('mwCalcLiq');
    if (calcLiq) {
        calcLiq.textContent = liq.toLocaleString() + ' Kg';
    }

    const calcDif = document.getElementById('mwCalcDif');
    if (calcDif) {
        if (pesoNF > 0) {
            const color = Math.abs(difPerc) > 1.0 ? '#ef4444' : '#10b981'; // 1% de tolerância
            calcDif.style.color = color;
            calcDif.textContent = `${difKg > 0 ? '+' : ''}${difKg.toLocaleString()} Kg (${difPerc}%)`;
        } else {
            calcDif.style.color = 'var(--text-muted)';
            calcDif.textContent = '--- Kg';
        }
    }

    // Anima a Balança LED com o Peso Bruto (se houver), caso contrário com o Peso da Nota
    const targetWeight = bruto > 0 ? bruto : pesoNF;
    if (typeof window.animateLEDWeight === 'function') {
        window.animateLEDWeight(targetWeight);
    }
};

window.openManualWeighingModal = function() {
    try {
        console.log("[openManualWeighingModal] Abrindo modal de pesagem manual");
        window.mwState = { supId: null, motId: null, plateId: null, prodExists: false };
        ['mwForn', 'mwProd', 'mwMot', 'mwPlaca', 'mwNF', 'mwPesoNF', 'mwBruto', 'mwTara'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('input-warning'); }
        });

        const warnBox = document.getElementById('mwWarningBox');
        const btnSave = document.getElementById('btnSaveMW');
        const btnReq = document.getElementById('btnReqMW');
        if (warnBox) warnBox.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
        if (btnReq) btnReq.style.display = 'none';

        // Reset painel de cálculos e balança LED
        const panel = document.getElementById('mwCalculationsPanel');
        if (panel) panel.style.display = 'none';

        const led = document.getElementById('ledDisplayWeight');
        if (led) led.innerHTML = `000000 <span style="font-size: 0.9rem; color: rgba(239, 68, 68, 0.5); font-weight: normal;">KG</span>`;

        window.populateDatalist('dlFornMW', window.suppliersData);
        window.populateDatalist('dlPlacaMW', window.platesData, 'numero');
        window.populateDatalist('dlMotMW', window.driversData);
        window.populateDatalist('prodListSuggestions', window.productsData);

        const modal = document.getElementById('modalManualWeighing');
        if (modal) modal.style.display = 'flex';
    } catch (e) {
        console.error("[openManualWeighingModal] Erro ao abrir modal de pesagem manual:", e);
        alert("Erro ao abrir modal de pesagem: " + e.message);
    }
};

window.filterWeighingChain = function(step) {
    const inForn = document.getElementById('mwForn');
    const inProd = document.getElementById('mwProd');
    const inPlaca = document.getElementById('mwPlaca');
    const inMot = document.getElementById('mwMot');

    const suppliers = Array.isArray(window.suppliersData) ? window.suppliersData : [];
    const products = Array.isArray(window.productsData) ? window.productsData : [];
    const plates = Array.isArray(window.platesData) ? window.platesData : [];
    const drivers = Array.isArray(window.driversData) ? window.driversData : [];

    if (step === 'fornecedor' || !step) {
        const val = inForn ? inForn.value.toUpperCase() : '';
        const found = suppliers.find(s => s.nome === val);
        window.mwState.supId = found ? found.id : null;
        window.checkFieldStatus('mwForn', window.mwState.supId);
    }

    if (step === 'produto' || !step) {
        const val = inProd ? inProd.value.toUpperCase() : '';
        const found = products.find(p => p.nome === val);
        window.mwState.prodExists = !!found;
        if (val && !found) inProd.classList.add('input-warning');
        else if (inProd) inProd.classList.remove('input-warning');
    }

    if (step === 'placa' || !step) {
        if (inPlaca) {
            let txt = inPlaca.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (txt.length > 3 && !txt.includes('-')) txt = txt.substring(0, 3) + '-' + txt.substring(3);
            inPlaca.value = txt;
            const found = plates.find(p => p.numero === txt);
            window.mwState.plateId = found ? found.id : null;
            window.checkFieldStatus('mwPlaca', window.mwState.plateId);
        }
    }

    if (step === 'motorista' || !step) {
        if (inMot) {
            const val = inMot.value.toUpperCase();
            if (val) {
                const found = drivers.find(d => d.nome === val);
                window.mwState.motId = found ? found.id : null;
                window.checkFieldStatus('mwMot', window.mwState.motId);
            } else {
                window.mwState.motId = null;
                inMot.classList.remove('input-warning');
            }
        }
    }

    const isNewForn = inForn && inForn.value && !window.mwState.supId;
    const isNewProd = inProd && inProd.value && !window.mwState.prodExists;
    const isNewPlaca = inPlaca && inPlaca.value && !window.mwState.plateId;
    const isNewMot = inMot && inMot.value && !window.mwState.motId;

    const warnBox = document.getElementById('mwWarningBox');
    const btnSave = document.getElementById('btnSaveMW');
    const btnReq = document.getElementById('btnReqMW');

    if (isNewForn || isNewProd || isNewPlaca || isNewMot) {
        if (warnBox) warnBox.style.display = 'block';
        if (btnSave) btnSave.style.display = 'none';
        if (btnReq) btnReq.style.display = 'inline-block';
    } else {
        if (warnBox) warnBox.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
        if (btnReq) btnReq.style.display = 'none';
    }
};

window.saveManualWeighing = function() {
    try {
        const forn = (document.getElementById('mwForn') || {}).value || '';
        const prod = (document.getElementById('mwProd') || {}).value || '';
        const placa = (document.getElementById('mwPlaca') || {}).value || '';
        const nf = (document.getElementById('mwNF') || {}).value || '';
        const pesoNF = parseFloat((document.getElementById('mwPesoNF') || {}).value) || 0;
        const bruto = parseFloat((document.getElementById('mwBruto') || {}).value) || 0;
        const tara = parseFloat((document.getElementById('mwTara') || {}).value) || 0;

        if (!forn || !prod || !placa) return alert("Preencha Fornecedor, Produto e Placa.");

        const id = 'MAN_' + Date.now();
        const todayStr = window.getBrazilTime().split('T')[0];

        const liq = bruto - tara;
        const difKg = liq - pesoNF;
        const difPerc = pesoNF ? ((difKg / pesoNF) * 100).toFixed(2) : 0;

        if (!Array.isArray(window.mpData)) {
            window.mpData = [];
        }

        window.mpData.push({
            id: id,
            date: todayStr,
            produto: prod.toUpperCase(),
            empresa: forn.toUpperCase(),
            placa: placa.toUpperCase(),
            local: 'MANUAL',
            chegada: window.getBrazilTime(),
            entrada: window.getBrazilTime(),
            tara: tara,
            bruto: bruto,
            liq: liq,
            pesoNF: pesoNF,
            difKg: difKg,
            difPerc: difPerc,
            nf: nf || 'S/N',
            notes: 'Pesagem Manual',
            isManual: true
        });

        window.saveAll();
        const modal = document.getElementById('modalManualWeighing');
        if (modal) modal.style.display = 'none';
        window.renderMateriaPrima();
        alert("Pesagem manual lançada com sucesso!");
    } catch (err) {
        console.error("[saveManualWeighing] Erro:", err);
        alert("Erro ao lançar pesagem manual: " + err.message);
    }
};

window.submitWeighingRequest = function() {
    try {
        const forn = (document.getElementById('mwForn') || {}).value || '';
        const prod = (document.getElementById('mwProd') || {}).value || '';
        const placa = (document.getElementById('mwPlaca') || {}).value || '';
        const mot = (document.getElementById('mwMot') || {}).value || '';
        const nf = (document.getElementById('mwNF') || {}).value || '';
        const pesoNF = parseFloat((document.getElementById('mwPesoNF') || {}).value) || 0;
        const bruto = parseFloat((document.getElementById('mwBruto') || {}).value) || 0;
        const tara = parseFloat((document.getElementById('mwTara') || {}).value) || 0;

        if (!forn || !prod || !placa) return alert("Preencha Fornecedor, Produto e Placa.");

        const newProducts = !window.mwState.prodExists ? [prod.toUpperCase()] : [];
        const reqId = 'REQ_MW_' + Date.now();

        if (!Array.isArray(window.requests)) {
            window.requests = [];
        }

        window.requests.push({
            id: reqId,
            type: 'complex_entry',
            status: 'PENDENTE',
            user: (typeof window.loggedUser !== 'undefined' ? window.loggedUser.username : 'Portaria'),
            timestamp: window.getBrazilTime(),
            data: {
                supplier: { name: forn.toUpperCase(), id: window.mwState.supId },
                carrier: { name: forn.toUpperCase(), id: null },
                driver: { name: mot.toUpperCase(), id: window.mwState.motId },
                plate: { number: placa.toUpperCase(), id: window.mwState.plateId },
                newProducts: newProducts
            }
        });

        const id = 'MAN_' + Date.now();
        const todayStr = window.getBrazilTime().split('T')[0];

        const liq = bruto - tara;
        const difKg = liq - pesoNF;
        const difPerc = pesoNF ? ((difKg / pesoNF) * 100).toFixed(2) : 0;

        if (!Array.isArray(window.mpData)) {
            window.mpData = [];
        }

        window.mpData.push({
            id: id,
            date: todayStr,
            produto: prod.toUpperCase(),
            empresa: forn.toUpperCase(),
            placa: placa.toUpperCase(),
            local: 'MANUAL',
            chegada: window.getBrazilTime(),
            entrada: window.getBrazilTime(),
            tara: tara, bruto: bruto, liq: liq, pesoNF: pesoNF,
            difKg: difKg, difPerc: difPerc,
            nf: nf || 'S/N',
            notes: 'Aguardando Cadastro (Req)',
            isManual: true,
            linkedRequestId: reqId
        });

        window.saveAll();
        const modal = document.getElementById('modalManualWeighing');
        if (modal) modal.style.display = 'none';
        window.renderMateriaPrima();
        if (typeof window.sendSystemNotification === 'function') {
            window.sendSystemNotification("Requisição de Pesagem", "Cadastro pendente para pesagem manual.", "materia-prima", null);
        }
        alert("Pesagem lançada. Requisição de cadastro enviada para aprovação.");
    } catch (err) {
        console.error("[submitWeighingRequest] Erro:", err);
        alert("Erro ao solicitar pesagem manual: " + err.message);
    }
};

// =========================================================
// FUNÇÕES FALTANTES: PESAGEM, DASHBOARD, CONFIGURAÇÕES
// =========================================================

window.openMPContextMenu = function(x, y) {
    const m = document.getElementById('ctxMenuMP');
    if (!m) return;
    const p = window.userPermissions || {
        canEditTruck: window.isRecebimento || window.isAdmin,
        canDeleteTruck: window.isRecebimento || window.isAdmin
    };
    let items = '';
    if (p.canEditTruck) {
        items += `<div class="ctx-item" onclick="window.openEditMPModal()"><i class="fas fa-edit"></i> Editar</div>`;
    }
    items += `<div class="ctx-item" onclick="window.openNoteMPModal()"><i class="fas fa-sticky-note"></i> Nota</div>`;
    items += `<div class="ctx-item" onclick="window.goToMapFromContext(window.contextMPId)"><i class="fas fa-map"></i> Ver Mapa</div>`;
    if (p.canDeleteTruck) {
        items += `<div class="ctx-item" style="color:red" onclick="window.deleteMateriaPrima()"><i class="fas fa-trash"></i> Excluir</div>`;
    }
    m.innerHTML = items;
    let posX = x;
    let posY = y;
    if (x + 200 > window.innerWidth) posX = window.innerWidth - 220;
    m.style.left = posX + 'px';
    m.style.top = posY + 'px';
    m.style.display = 'block';
};

window.updatePermissionStatus = function() {
    // Atualiza status de permissões na tela de configurações
    const el = document.getElementById('permStatus');
    if (el) {
        el.innerHTML = `
            <p><b>Usuário:</b> ${typeof loggedUser !== 'undefined' ? loggedUser.username : '---'}</p>
            <p><b>Setor:</b> ${typeof loggedUser !== 'undefined' ? loggedUser.sector : '---'}</p>
            <p><b>Função:</b> ${typeof loggedUser !== 'undefined' ? loggedUser.role : '---'}</p>
        `;
    }
};

window.createAccountByEncarregado = function() {
    const fullname = (document.getElementById('new_fullname') || {}).value || '';
    const display = (document.getElementById('new_display') || {}).value || '';
    const username = (document.getElementById('new_username') || {}).value || '';
    const password = (document.getElementById('new_password') || {}).value || '';

    if (!username || !password) return alert('Preencha usuário e senha.');
    if (window.usersData.find(u => u.username === username)) return alert('Usuário já existe.');

    const sector = typeof loggedUser !== 'undefined' ? loggedUser.sector : 'conferente';
    window.usersData.push({ username, password, fullname, displayName: display, role: 'user', sector, firstLogin: true });
    window.saveAll();
    alert('Conta criada com sucesso!');
    ['new_fullname', 'new_display', 'new_username', 'new_password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
};

window.loadAccountRequests = function() {
    const container = document.getElementById('encReqList');
    if (!container) return;
    const pending = window.requests.filter(r => r.status === 'PENDENTE' && r.type === 'complex_entry');
    if (pending.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:10px;">Nenhuma solicitação pendente.</p>';
        return;
    }
    container.innerHTML = pending.map(r => `
        <div style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div><b>${r.user || r.requester || '---'}</b><br><small>${r.timestamp ? new Date(r.timestamp).toLocaleString() : '--'}</small></div>
            <button class="btn btn-save btn-small" onclick="window.openUnifiedApproval('${r.id}')">Analisar</button>
        </div>
    `).join('');
};

// Dashboard - Funções Premium (V3)
window.initDashboard = function() {
    const layout = JSON.parse(localStorage.getItem('aw_dash_layout') || '[]');
    for (let i = 0; i < 4; i++) {
        if (layout[i]) {
            window.addToSlot(i, layout[i]);
        } else {
            window.clearSlot(i);
        }
    }
};

window.addToSlot = function(slotIndex, chartType) {
    const slot = document.getElementById('slot-' + slotIndex);
    if (!slot) return;

    if (!chartType) {
        const types = [
            { value: 'trucks_today', label: '🚚 Fluxo de Caminhões (Hoje)' },
            { value: 'trucks_week', label: '📅 Entradas Semanais (7 dias)' },
            { value: 'weight_today', label: '⚖️ Carga Pesada (Pesagens Hoje)' },
            { value: 'maps_status', label: '📋 Auditoria de Mapas Cegos' }
        ];
        const options = types.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
        slot.innerHTML = `
            <div style="padding:20px; text-align:center; display:flex; flex-direction:column; justify-content:center; height:100%; box-sizing:border-box;">
                <h4 style="margin-top:0; margin-bottom:12px; color:var(--text-main);"><i class="fas fa-chart-pie" style="color:var(--primary);"></i> Escolher Gráfico</h4>
                <select id="slotType_${slotIndex}" class="form-input-styled" style="margin-bottom:15px; width:100%;">${options}</select>
                <button class="btn btn-save" style="width:100%; justify-content:center;" onclick="window.addToSlot(${slotIndex}, document.getElementById('slotType_${slotIndex}').value)">Confirmar e Inserir</button>
            </div>
        `;
        return;
    }

    const today = window.getBrazilTime().split('T')[0];
    let canvas = document.createElement('canvas');
    canvas.id = 'chart_' + slotIndex;
    canvas.style.maxHeight = '230px';
    slot.innerHTML = `<div style="padding:5px; position:relative; height:100%; box-sizing:border-box;"><button class="btn btn-edit btn-small" style="position:absolute; top:8px; right:8px; z-index:10; border:none; padding:4px 8px;" onclick="window.clearSlot(${slotIndex})"><i class="fas fa-times"></i></button></div>`;
    slot.querySelector('div').appendChild(canvas);
    slot.classList.remove('empty');

    const ctx = canvas.getContext('2d');
    let chartData = {};

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f3f4f6' : '#1f2937';
    const gridColor = isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.4)';

    if (chartType === 'trucks_today') {
        const trucks = window.patioData.filter(t => (t.chegada || '').startsWith(today));
        const byStatus = { 'FILA': 0, 'LIBERADO': 0, 'ENTROU': 0, 'SAIU': 0 };
        trucks.forEach(t => { if (byStatus[t.status] !== undefined) byStatus[t.status]++; });
        chartData = {
            type: 'doughnut',
            data: {
                labels: ['Fila de Espera', 'Chamado/Liberado', 'Em Descarga', 'Finalizado'],
                datasets: [{ 
                    data: Object.values(byStatus), 
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { labels: { color: textColor, font: { size: 10 } } },
                    title: { display: true, text: 'Distribuição do Fluxo (Hoje)', color: textColor, font: { size: 13, weight: 'bold' } } 
                } 
            }
        };
    } else if (chartType === 'weight_today') {
        const weights = window.mpData.filter(m => m.date === today);
        chartData = {
            type: 'bar',
            data: {
                labels: weights.map(w => w.placa),
                datasets: [{ 
                    label: 'Peso Líquido (Kg)', 
                    data: weights.map(w => w.liq), 
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#3b82f6',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: textColor, font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { color: textColor, font: { size: 9 } }, grid: { color: gridColor } }
                },
                plugins: { 
                    legend: { display: false },
                    title: { display: true, text: 'Pesagens Ativas (Hoje)', color: textColor, font: { size: 13, weight: 'bold' } } 
                } 
            }
        };
    } else if (chartType === 'maps_status') {
        const launched = window.mapData.filter(m => m.launched).length;
        const draft = window.mapData.filter(m => !m.launched).length;
        chartData = {
            type: 'pie',
            data: {
                labels: ['Lançados (Auditados)', 'Rascunhos Pendentes'],
                datasets: [{ 
                    data: [launched, draft], 
                    backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(245, 158, 11, 0.85)'],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { labels: { color: textColor, font: { size: 10 } } },
                    title: { display: true, text: 'Status de Auditoria de Mapas Cegos', color: textColor, font: { size: 13, weight: 'bold' } } 
                } 
            }
        };
    } else {
        // trucks_week
        const days = [];
        const counts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            days.push(ds.slice(5).split('-').reverse().join('/'));
            counts.push(window.patioData.filter(t => (t.chegada || '').startsWith(ds)).length);
        }
        chartData = {
            type: 'line',
            data: {
                labels: days,
                datasets: [{ 
                    label: 'Cargas Recebidas', 
                    data: counts, 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: textColor, font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { color: textColor, font: { size: 9 } }, grid: { color: gridColor } }
                },
                plugins: { 
                    legend: { labels: { color: textColor } },
                    title: { display: true, text: 'Histórico de Entradas (7 dias)', color: textColor, font: { size: 13, weight: 'bold' } } 
                } 
            }
        };
    }

    if (typeof Chart !== 'undefined') {
        if (window.activeCharts === undefined) window.activeCharts = {};
        if (window.activeCharts[slotIndex]) window.activeCharts[slotIndex].destroy();
        window.activeCharts[slotIndex] = new Chart(ctx, chartData);
    }
};

window.clearSlot = function(slotIndex) {
    const slot = document.getElementById('slot-' + slotIndex);
    if (!slot) return;
    if (window.activeCharts && window.activeCharts[slotIndex]) {
        window.activeCharts[slotIndex].destroy();
        delete window.activeCharts[slotIndex];
    }
    slot.innerHTML = `
        <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">
            <i class="fas fa-plus-circle" style="font-size:2rem; opacity:0.3; margin-bottom:8px;"></i>
            <button class="btn btn-primary" onclick="window.addToSlot(${slotIndex})">Adicionar Gráfico</button>
        </div>
    `;
    slot.classList.add('empty');
};

window.saveDashboardLayout = function() {
    const layout = [];
    for (let i = 0; i < 4; i++) {
        const chartCanvas = document.getElementById('chart_' + i);
        if (chartCanvas && window.activeCharts && window.activeCharts[i]) {
            const titleText = window.activeCharts[i].options.plugins.title.text;
            let type = 'trucks_today';
            if (titleText.includes('Pesagem')) type = 'weight_today';
            else if (titleText.includes('Auditoria')) type = 'maps_status';
            else if (titleText.includes('Histórico')) type = 'trucks_week';
            layout.push(type);
        } else {
            layout.push(null);
        }
    }
    localStorage.setItem('aw_dash_layout', JSON.stringify(layout));
    alert('Layout do Painel Salvo com Sucesso!');
};

window.clearDashboard = function() {
    if (confirm('Limpar todos os gráficos e resetar o painel?')) {
        for (let i = 0; i < 4; i++) window.clearSlot(i);
        localStorage.removeItem('aw_dash_layout');
    }
};

window.updateAccountRequestBadge = function() {
    const badge = document.getElementById('cadBadgeReq');
    if (!badge) return;
    const count = window.requests.filter(r => r.status === 'PENDENTE').length;
    if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
};

// =========================================================
// FUNÇÕES DE MAPA CEGO E RELATÓRIOS
// =========================================================

/**
 * Salva as alterações do mapa atual
 */
window.saveCurrentMap = function() {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return alert('Nenhum mapa selecionado.');
    
    let changeDetails = [];
    if (m.launched && window.mapSnapshot) {
        try {
            const oldRows = JSON.parse(window.mapSnapshot);
            m.rows.forEach((r, idx) => {
                const oldR = oldRows.find(x => x.id === r.id) || {};
                const fields = ['desc', 'qty_nf', 'qty', 'nf', 'forn'];
                fields.forEach(f => {
                    const oldVal = (oldR[f] !== undefined && oldR[f] !== null ? oldR[f] : '').toString().trim();
                    const newVal = (r[f] !== undefined && r[f] !== null ? r[f] : '').toString().trim();
                    if (oldVal !== newVal) {
                        const fieldNames = {
                            desc: 'Descrição',
                            qty_nf: 'Qtd NF',
                            qty: 'Qtd Contada',
                            nf: 'Nota Fiscal',
                            forn: 'Fornecedor'
                        };
                        changeDetails.push(`Linha #${idx + 1} (${r.desc || 'Sem desc'}): ${fieldNames[f]} alterado de "${oldVal || 'vazio'}" para "${newVal || 'vazio'}"`);
                    }
                });
            });
        } catch(e) {
            console.error("Erro ao comparar snapshot", e);
        }
    }
    
    if (m.launched && window.mapHeaderSnapshot) {
        try {
            const oldHeader = JSON.parse(window.mapHeaderSnapshot);
            const dateInput = document.getElementById('mapDate').value;
            const placaInput = document.getElementById('mapPlaca').value;
            const setorInput = document.getElementById('mapSetor').value;
            
            if (oldHeader.date !== dateInput) {
                changeDetails.push(`Data alterada de "${oldHeader.date}" para "${dateInput}"`);
            }
            if (oldHeader.placa !== placaInput) {
                changeDetails.push(`Placa alterada de "${oldHeader.placa}" para "${placaInput}"`);
            }
            if (oldHeader.setor !== setorInput) {
                changeDetails.push(`Setor alterado de "${oldHeader.setor}" para "${setorInput}"`);
            }
        } catch(e) {
            console.error("Erro ao comparar header snapshot", e);
        }
    }

    m.date = document.getElementById('mapDate').value;
    m.placa = document.getElementById('mapPlaca').value;
    m.setor = document.getElementById('mapSetor').value;

    if (changeDetails.length > 0) {
        if (!m.changeHistory) m.changeHistory = [];
        m.changeHistory.push({
            user: window.loggedUser.username,
            timestamp: window.getBrazilTime(),
            changes: changeDetails
        });
        m.changeCount = (m.changeCount || 0) + 1;
        
        const p = window.userPermissions || { canEditTruck: window.isRecebimento || window.isAdmin };
        if (m.authorizedEditor === window.loggedUser.username && !p.canEditTruck) {
            m.authorizedEditor = null;
            m.forceUnlock = false;
        }
        
        window.saveAll();
        alert(`Mapa salvo com sucesso! Foram registradas ${changeDetails.length} alterações.`);
    } else {
        window.saveAll();
        alert('Mapa salvo com sucesso!');
    }

    window.loadMap(m.id);
};

/**
 * Solicita edição de um mapa já lançado
 */
window.openRequestEditModal = function(mapId) {
    const m = window.mapData.find(x => x.id === mapId);
    if (!m) return alert('Mapa cego não encontrado.');
    
    document.getElementById('reqEditMapId').value = mapId;
    document.getElementById('reqEditForn').textContent = m.rows[0]?.forn || 'Diversos';
    document.getElementById('reqEditPlaca').textContent = m.placa || 'Sem placa';
    document.getElementById('reqEditDate').textContent = m.date || 'Sem data';
    document.getElementById('reqEditJustification').value = '';
    
    if (window.isRecebimento) {
        document.getElementById('radEditNf').checked = true;
    } else {
        document.getElementById('radEditContada').checked = true;
    }
    
    document.getElementById('modalRequestEdit').style.display = 'flex';
    if (typeof window.closeContextMenu === 'function') window.closeContextMenu();
};

window.submitEditRequest = function() {
    const mapId = document.getElementById('reqEditMapId').value;
    const part = document.querySelector('input[name="reqEditPart"]:checked')?.value || 'contada';
    const justification = document.getElementById('reqEditJustification').value.trim();
    
    if (!justification) {
        return alert('Por favor, insira uma justificativa para a alteração.');
    }
    
    const user = (typeof window.loggedUser !== 'undefined') ? window.loggedUser.username : 'Usuário';
    const hasPending = window.requests.some(r => r.mapId === mapId && r.status === 'PENDENTE' && r.requester === user);
    if (hasPending) {
        return alert('Você já possui uma solicitação de edição pendente para este mapa.');
    }
    
    const reqId = 'REQ_EDIT_' + Date.now();
    const timeStr = window.getBrazilTime ? window.getBrazilTime() : new Date().toISOString();
    
    window.requests.push({
        id: reqId,
        type: 'edit',
        status: 'PENDENTE',
        requester: user,
        user: user,
        mapId: mapId,
        editPart: part, // 'contada' ou 'nf'
        justification: justification,
        timestamp: timeStr
    });
    
    window.saveAll();
    if (typeof window.updateBadge === 'function') window.updateBadge();
    if (typeof window.renderRequests === 'function') window.renderRequests();
    
    alert('Solicitação de edição enviada ao encarregado e administrador.');
    document.getElementById('modalRequestEdit').style.display = 'none';
};

window.triggerRequest = function(type) {
    if (type === 'edit') {
        if (!window.currentMapId) return alert('Nenhum mapa selecionado.');
        window.openRequestEditModal(window.currentMapId);
    }
};

/**
 * Exporta o relatório atual para PDF
 */
window.exportReportToPDF = function() {
    const area = document.getElementById('repResultArea');
    if (!area || !area.innerHTML.trim()) return alert('Gere um relatório primeiro.');
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>Relatório</title><style>body{font-family:Arial,sans-serif;font-size:12px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:6px;} th{background:#f0f0f0;}</style></head><body>');
    w.document.write('<h2>Relatório - ' + new Date().toLocaleDateString() + '</h2>');
    w.document.write(area.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
};

/**
 * Confirma a troca de senha no primeiro acesso
 */
window.confirmFirstAccessChange = function() {
    const p1 = (document.getElementById('firstNewPass') || {}).value || '';
    const p2 = (document.getElementById('firstNewPass2') || {}).value || '';
    if (!p1 || p1.length < 4) return alert('A senha deve ter pelo menos 4 caracteres.');
    if (p1 !== p2) return alert('As senhas não coincidem.');
    if (typeof loggedUser === 'undefined') return;
    const u = window.usersData.find(x => x.username === loggedUser.username);
    if (u) {
        u.password = p1;
        u.firstLogin = false;
        window.saveAll();
        document.getElementById('modalFirstAccess').style.display = 'none';
        alert('Senha alterada com sucesso!');
    }
};

// =========================================================
// INICIALIZAÇÃO E INTERVALO DE NOTIFICAÇÕES
// =========================================================

// --- ASSINATURA DIGITAL DO CONFERENTE (CANVAS DRAWING) ---
let isDrawing = false;
let sigCanvas = null;
let sigCtx = null;

window.initSignatureCanvas = function() {
    sigCanvas = document.getElementById('signatureCanvas');
    if (!sigCanvas) return;
    
    sigCtx = sigCanvas.getContext('2d');
    
    // Limpa o canvas e desenha uma linha pontilhada de guia
    window.clearSignatureCanvas();

    // Eventos de Ponteiro (suporta mouse, caneta digital e toque)
    sigCanvas.addEventListener('pointerdown', (e) => {
        isDrawing = true;
        sigCtx.beginPath();
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    sigCanvas.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        sigCtx.stroke();
    });

    sigCanvas.addEventListener('pointerup', () => {
        isDrawing = false;
    });

    sigCanvas.addEventListener('pointerleave', () => {
        isDrawing = false;
    });
};

window.clearSignatureCanvas = function() {
    if (!sigCanvas || !sigCtx) return;
    sigCtx.fillStyle = '#ffffff';
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
    
    // Desenha guia pontilhada discreta de "Assine aqui"
    sigCtx.strokeStyle = '#cccccc';
    sigCtx.lineWidth = 1;
    sigCtx.setLineDash([5, 5]);
    sigCtx.beginPath();
    sigCtx.moveTo(20, sigCanvas.height - 25);
    sigCtx.lineTo(sigCanvas.width - 20, sigCanvas.height - 25);
    sigCtx.stroke();
    
    // Escreve texto discreto
    sigCtx.fillStyle = '#888888';
    sigCtx.font = '10px Arial';
    sigCtx.fillText('ASSINATURA DIGITAL DO CONFERENTE', sigCanvas.width / 2 - 95, sigCanvas.height - 10);
    
    // Restaura configurações de pintura
    sigCtx.strokeStyle = '#1e3a8a'; // Tinta azul marinho premium
    sigCtx.lineWidth = 2.5;
    sigCtx.setLineDash([]);
};

// Vincula a abertura do modal à inicialização do canvas
const originalOpenUnifiedApproval = window.openUnifiedApproval;
window.openUnifiedApproval = function(id) {
    if (typeof originalOpenUnifiedApproval === 'function') {
        originalOpenUnifiedApproval(id);
    }
    // Inicializa o canvas após o modal estar vísivel (delay de 100ms)
    setTimeout(() => {
        window.initSignatureCanvas();
    }, 100);
};

// --- BALANÇA LED ANIMAÇÃO PROGRESSIVA ---
window.animateLEDWeight = function(targetWeight) {
    const el = document.getElementById('ledDisplayWeight');
    if (!el) return;
    
    const start = 0;
    const duration = 800; // 800ms de animação
    const startTime = performance.now();
    
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Efeito easeOutQuad para desacelerar perto do fim
        const easeProgress = progress * (2 - progress);
        const currentWeight = Math.round(start + easeProgress * (targetWeight - start));
        
        // Formata os números com zeros à esquerda (ex: 012430)
        const formatted = String(currentWeight).padStart(6, '0');
        el.innerHTML = `${formatted} <span style="font-size: 0.9rem; color: rgba(239, 68, 68, 0.5); font-weight: normal;">KG</span>`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
};

// Vincula o evento do input do modal de pesagem
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'mwPesoNF') {
        const val = parseFloat(e.target.value) || 0;
        window.animateLEDWeight(val);
    }
});

// --- DIAGNÓSTICOS DO SERVIDOR (HEALTH CHECK) ---
window.runDiagnostics = async function() {
    const btn = document.querySelector('button[onclick*="runDiagnostics"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando Latência...';
    }
    
    const startTime = performance.now();
    try {
        if (window.supabaseClient) {
            // Mede o ping fazendo uma consulta leve
            const { data, error } = await window.supabaseClient.from('app_data').select('key').limit(1);
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            if (error) throw error;

            const pingEl = document.getElementById('diagPing');
            if (pingEl) {
                pingEl.innerText = `${latency} ms`;
                if (latency < 100) pingEl.style.color = '#10b981'; // Verde excelente
                else if (latency < 250) pingEl.style.color = '#f59e0b'; // Laranja ok
                else pingEl.style.color = '#ef4444'; // Vermelho lento
            }

            const connsEl = document.getElementById('diagConns');
            if (connsEl) connsEl.innerText = 'Ativa (Supabase Realtime)';

            const dbSizeEl = document.getElementById('diagDbSize');
            if (dbSizeEl) {
                const { count, error: countErr } = await window.supabaseClient
                    .from('app_data')
                    .select('*', { count: 'exact', head: true });
                dbSizeEl.innerText = countErr ? '--' : `${count} tabelas JSON`;
            }

            const uptimeEl = document.getElementById('diagUptime');
            if (uptimeEl) {
                uptimeEl.innerText = 'Nuvem (Supabase)';
            }
        } else {
            const response = await fetch(`${window.API_URL}/api/diagnostics?t=${Date.now()}`, { cache: 'no-store' });
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            
            const data = await response.json();
            
            // Atualiza os displays do card com animações/cores suaves
            const pingEl = document.getElementById('diagPing');
            if (pingEl) {
                pingEl.innerText = `${latency} ms`;
                if (latency < 30) pingEl.style.color = '#10b981'; // Verde excelente
                else if (latency < 100) pingEl.style.color = '#f59e0b'; // Laranja ok
                else pingEl.style.color = '#ef4444'; // Vermelho lento
            }

            const connsEl = document.getElementById('diagConns');
            if (connsEl) connsEl.innerText = data.activeConnections || '1';

            const dbSizeEl = document.getElementById('diagDbSize');
            if (dbSizeEl) dbSizeEl.innerText = `${(data.dbSize / 1024).toFixed(1)} KB`;

            const uptimeEl = document.getElementById('diagUptime');
            if (uptimeEl) {
                const ut = data.uptime || 0;
                const hrs = Math.floor(ut / 3600);
                const mins = Math.floor((ut % 3600) / 60);
                const secs = Math.floor(ut % 60);
                uptimeEl.innerText = `${hrs}h ${mins}m ${secs}s`;
            }
        }
    } catch (err) {
        console.error('Erro no diagnóstico:', err);
        const pingEl = document.getElementById('diagPing');
        if (pingEl) {
            pingEl.innerText = 'Offline';
            pingEl.style.color = '#ef4444';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-network-wired"></i> Executar Diagnóstico de Rede';
        }
    }
};

window.saveLinkRelation = function(type, idA, idB) {
    const p = window.userPermissions || { canManageCatalogs: window.isRecebimento || window.isAdmin };
    if (!p.canManageCatalogs) {
        alert("Acesso negado: Você não tem permissão para vincular entidades.");
        return false;
    }
    if (!idA || !idB) {
        alert("Selecione ambas as entidades para vincular!");
        return false;
    }
    
    if (type === 'supplier_carrier') {
        const carrier = window.carriersData.find(c => c.id === idB);
        if (!carrier) return false;
        if (!carrier.supplierIds) carrier.supplierIds = [];
        if (!carrier.supplierIds.includes(idA)) {
            carrier.supplierIds.push(idA);
        }
    } else if (type === 'carrier_driver') {
        const driver = window.driversData.find(d => d.id === idB);
        if (!driver) return false;
        if (!driver.carrierIds) driver.carrierIds = [];
        if (!driver.carrierIds.includes(idA)) {
            driver.carrierIds.push(idA);
        }
    } else if (type === 'supplier_driver') {
        const driver = window.driversData.find(d => d.id === idB);
        if (!driver) return false;
        if (!driver.supplierIds) driver.supplierIds = [];
        if (!driver.supplierIds.includes(idA)) {
            driver.supplierIds.push(idA);
        }
    } else if (type === 'driver_plate') {
        const plate = window.platesData.find(p => p.id === idB);
        if (!plate) return false;
        plate.driverId = idA;
    }
    
    window.saveAll();
    return true;
};

window.removeLinkRelation = function(type, idA, idB) {
    if (type === 'supplier_carrier') {
        const carrier = window.carriersData.find(c => c.id === idB);
        if (carrier && carrier.supplierIds) {
            carrier.supplierIds = carrier.supplierIds.filter(id => id !== idA);
        }
    } else if (type === 'carrier_driver') {
        const driver = window.driversData.find(d => d.id === idB);
        if (driver && driver.carrierIds) {
            driver.carrierIds = driver.carrierIds.filter(id => id !== idA);
        }
    } else if (type === 'supplier_driver') {
        const driver = window.driversData.find(d => d.id === idB);
        if (driver && driver.supplierIds) {
            driver.supplierIds = driver.supplierIds.filter(id => id !== idA);
        }
    } else if (type === 'driver_plate') {
        const plate = window.platesData.find(p => p.id === idB);
        if (plate && plate.driverId === idA) {
            plate.driverId = null;
        }
    }
    
    window.saveAll();
    return true;
};

console.log("Wilson Core: Módulo de funções complementares carregado com melhorias premium.");
