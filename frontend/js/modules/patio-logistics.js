// =========================================================
// MÓDULO DE LOGÍSTICA E CONTROLE DE PÁTIO - WILSON CORE
// =========================================================

/**
 * Renderiza a visualização do pátio, organizando os caminhões por colunas de setor.
 */
window.renderPatio = function() {
    const filterEl = document.getElementById('patioDateFilter');
    const fd = filterEl ? filterEl.value : window.getBrazilTime().split('T')[0];

    // Limpeza crítica para não duplicar cards nas colunas
    ['ALM', 'GAVA', 'OUT', 'SAIU'].forEach(c => {
        const list = document.getElementById('list-' + c);
        if (list) list.innerHTML = ''; 
        const count = document.getElementById('count-' + c);
        if (count && c !== 'SAIU') count.textContent = '0';
    });

    // Atualiza o Badge de total de caminhões ativos no dia
    const badge = document.getElementById('totalTrucksBadge');
    if (badge) {
        const dailyActiveCount = window.patioData.filter(x => x.status !== 'SAIU' && (x.chegada || '').startsWith(fd)).length;
        badge.innerText = dailyActiveCount;
    }

    // Filtra e ordena os caminhões por horário de chegada
    const list = window.patioData.filter(c => {
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

        // Menu de contexto no clique direito
        card.oncontextmenu = (e) => { 
            e.preventDefault(); 
            window.openTruckContextMenu(e.pageX, e.pageY, c.id); 
        };

        let displayName = c.empresa;
        if (c.supplierId) {
            const s = window.suppliersData.find(x => x.id === c.supplierId);
            if (s) displayName = s.nome;
        }

        const laudoHtml = !isSaiu ? `<div style="font-size:0.7rem; font-weight:bold; margin-top:5px; color:${c.comLaudo ? '#16a34a' : '#dc2626'}">${c.comLaudo ? '<i class="fas fa-check-circle"></i> COM LAUDO' : '<i class="fas fa-times-circle"></i> SEM LAUDO'}</div>` : '';

        // Botões de ação baseados no status atual
        let btn = '';
        if (!isSaiu) {
            if (c.status === 'FILA') btn = `<button onclick="window.changeStatus('${c.id}','LIBERADO')" class="btn btn-save" style="width:100%; margin-top:5px;">CHAMAR</button>`;
            else if (c.status === 'LIBERADO') btn = `<button onclick="window.changeStatus('${c.id}','ENTROU')" class="btn btn-launch" style="width:100%; margin-top:5px;">ENTRADA</button>`;
            else if (c.status === 'ENTROU') btn = `<button onclick="window.changeStatus('${c.id}','SAIU')" class="btn btn-edit" style="width:100%; margin-top:5px;">SAÍDA</button>`;
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
};

/**
 * Altera o status de um veículo e registra os horários correspondentes.
 */
window.changeStatus = function(id, st) {
    const i = window.patioData.findIndex(c => c.id === id); 
    if (i > -1) {
        window.patioData[i].status = st;
        if (st === 'LIBERADO') { 
            window.patioData[i].releasedBy = typeof loggedUser !== 'undefined' ? loggedUser.username : 'Sistema'; 
            window.patioData[i].recebimentoNotified = false; 
        }
        if (st === 'ENTROU') { 
            const m = window.mpData.find(x => x.id === id); 
            if (m) m.entrada = window.getBrazilTime(); 
        }
        if (st === 'SAIU') { 
            const now = window.getBrazilTime(); 
            window.patioData[i].saida = now; 
            const m = window.mpData.find(x => x.id === id); 
            if (m) m.saida = now; 
        }
        window.saveAll(); 
        window.renderPatio();
    }
};

/**
 * Abre o menu de contexto (Botão Direito)
 */
window.openTruckContextMenu = function(x, y, id) {
    window.contextTruckId = id;
    const m = document.getElementById('ctxMenuTruck');
    const truck = window.patioData.find(t => t.id === id);
    if(!m || !truck) return;

    m.innerHTML = `
        <div class="ctx-item" onclick="window.openEditTruck('${id}')"><i class="fas fa-edit"></i> Editar Veículo</div>
        ${truck.isProvisory ? `<div class="ctx-item" style="color:orange" onclick="window.navTo('notificacoes')"><i class="fas fa-key"></i> Ver Requisição</div>` : ''}
        <div class="ctx-item" onclick="window.confirmDeleteTruck('${id}')" style="color:red"><i class="fas fa-trash"></i> Excluir...</div>
    `;

    let posX = x;
    let posY = y;
    if (x + 200 > window.innerWidth) posX = window.innerWidth - 220;
    m.style.left = posX + 'px';
    m.style.top = posY + 'px';
    m.style.display = 'block';
};

/**
 * Máscara e Validação de Placa (AAA-0000 ou AAA-0A00)
 */
document.getElementById('inPlaca')?.addEventListener('input', (e) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 3) v = v.substring(0, 3) + '-' + v.substring(3);
    e.target.value = v.substring(0, 8);
    window.evaluateRequestNecessity();
});

/**
 * Abre o modal de nova entrada limpando estados anteriores
 */
window.modalTruckOpen = function() {
    window.tmpItems = [];
    document.getElementById('tmpList').innerHTML = '';
    document.getElementById('inForn').value = '';
    document.getElementById('inPlaca').value = '';
    document.getElementById('inMot').value = '';
    document.getElementById('inTransp').value = '';
    document.getElementById('chkUseCarrier').checked = false;
    window.toggleCarrierInput();
    document.getElementById('entryWarningBox').style.display = 'none';
    document.getElementById('btnSaveTruck').style.display = 'inline-block';
    document.getElementById('btnReqTruck').style.display = 'none';
    document.getElementById('modalTruck').style.display = 'flex';
};

/**
 * Habilita/Desabilita input de transportadora
 */
window.toggleCarrierInput = function() {
    const chk = document.getElementById('chkUseCarrier').checked;
    const inp = document.getElementById('inTransp');
    if(!inp) return;
    inp.disabled = !chk;
    inp.style.backgroundColor = chk ? 'var(--bg-input)' : '#f1f5f9';
    inp.style.cursor = chk ? 'text' : 'not-allowed';
    if(!chk) inp.value = '';
    window.evaluateRequestNecessity();
};

/**
 * Validação de Produtos e Notas Fiscais (Bloqueio de NF vazia)
 */
window.addTmpItem = function() {
    const nfVal = document.getElementById('tmpNF').value.trim();
    const prodVal = document.getElementById('tmpProd').value.toUpperCase().trim();

    if (!nfVal) return alert("ERRO: Não é permitido adicionar um produto sem o número da Nota Fiscal (NF).");
    if (!prodVal) return alert("ERRO: O nome do produto é obrigatório.");

    const exists = window.productsData.find(p => p.nome === prodVal);
    const isNew = !exists;
    
    window.tmpItems.push({ nf: nfVal, prod: prodVal, isNew: isNew });
    
    const newBadge = isNew ? '<span style="background:#f59e0b; color:white; font-size:0.7rem; padding:1px 4px; border-radius:4px; margin-left:5px;">NOVO</span>' : '';
    document.getElementById('tmpList').innerHTML += `<li><b>NF: ${nfVal}</b> - ${prodVal} ${newBadge}</li>`;
    
    document.getElementById('tmpProd').value = '';
    document.getElementById('tmpNF').value = '';
    document.getElementById('tmpProd').focus();
    window.evaluateRequestNecessity();
};

/**
 * Motor de Avaliação de Requisição (Verifica todos os cadastros necessários)
 */
window.evaluateRequestNecessity = function() {
    const forn = document.getElementById('inForn').value.trim().toUpperCase();
    const mot = document.getElementById('inMot').value.trim().toUpperCase();
    const placa = document.getElementById('inPlaca').value.trim().toUpperCase();
    const useCarrier = document.getElementById('chkUseCarrier').checked;
    const transp = useCarrier ? document.getElementById('inTransp').value.trim().toUpperCase() : '';

    const fornExists = window.suppliersData.some(s => s.nome === forn);
    const motExists = window.driversData.some(d => d.nome === mot);
    const placaExists = window.platesData.some(p => p.numero === placa);
    const transpExists = !useCarrier || window.carriersData.some(c => c.nome === transp);
    const prodHasNew = window.tmpItems.some(i => i.isNew);

    const needsReq = (forn && !fornExists) || (mot && !motExists) || (placa && !placaExists) || (transp && !transpExists) || prodHasNew;

    // Feedback visual nos campos
    document.getElementById('inForn').classList.toggle('input-warning', forn && !fornExists);
    document.getElementById('inMot').classList.toggle('input-warning', mot && !motExists);
    document.getElementById('inPlaca').classList.toggle('input-warning', placa && !placaExists);
    if(useCarrier) document.getElementById('inTransp').classList.toggle('input-warning', transp && transp !== '' && !transpExists);

    document.getElementById('entryWarningBox').style.display = needsReq ? 'block' : 'none';
    document.getElementById('btnSaveTruck').style.display = needsReq ? 'none' : 'inline-block';
    document.getElementById('btnReqTruck').style.display = needsReq ? 'inline-block' : 'none';
};

/**
 * Gera a Requisição Complexa (Substitui o salvamento direto quando faltam dados)
 */
window.submitComplexRequest = function() {
    const forn = document.getElementById('inForn').value.trim().toUpperCase();
    const mot = document.getElementById('inMot').value.trim().toUpperCase();
    const placa = document.getElementById('inPlaca').value.trim().toUpperCase();
    const useCarr = document.getElementById('chkUseCarrier').checked;
    const transp = useCarr ? document.getElementById('inTransp').value.trim().toUpperCase() : '';

    if (!forn || !mot || !placa) return alert("ERRO: Preencha Fornecedor, Motorista e Placa corretamente.");
    if (window.tmpItems.length === 0) return alert("ERRO: Adicione pelo menos um produto com NF para prosseguir.");

    const reqId = 'REQ' + Date.now();
    const requesterName = (typeof loggedUser !== 'undefined') ? loggedUser.username : 'Portaria';

    const requestObj = {
        id: reqId,
        type: 'entrada_veiculo',
        status: 'PENDENTE',
        requester: requesterName,
        timestamp: window.getBrazilTime(),
        data: {
            fornecedor: { nome: forn, isNew: !window.suppliersData.some(s => s.nome === forn) },
            motorista: { nome: mot, isNew: !window.driversData.some(d => d.nome === mot) },
            placa: { numero: placa, isNew: !window.platesData.some(p => p.numero === placa) },
            transportadora: { nome: transp, isNew: useCarr && !window.carriersData.some(c => c.nome === transp), active: useCarr },
            produtosNovos: window.tmpItems.filter(i => i.isNew).map(i => i.prod),
            cargas: window.tmpItems
        }
    };

    window.requests.push(requestObj);
    
    // Cria o veículo provisório no pátio (Estado de espera por aprovação)
    window.patioData.push({
        id: 'PROV' + Date.now(),
        empresa: transp || forn,
        placa: placa,
        status: 'FILA',
        local: 'OUT',
        localSpec: 'AGUARDANDO REQ',
        isProvisory: true,
        chegada: window.getBrazilTime(),
        cargas: [{ produtos: window.tmpItems.map(i => ({ nome: i.prod, nf: i.nf })) }],
        linkedRequestId: reqId
    });

    window.saveAll();
    alert("SOLICITAÇÃO ENVIADA: O veículo foi colocado na fila mas aguarda aprovação do cadastro pelo encarregado.");
    document.getElementById('modalTruck').style.display = 'none';
    window.renderPatio();
    window.tmpItems = [];
};

/**
 * Salva entrada padrão (apenas se todos os dados já existirem)
 */
window.saveTruckAndMap = function() {
    const placaVal = document.getElementById('inPlaca').value;
    if (!placaVal) return alert("A Placa é obrigatória.");
    if (window.tmpItems.length === 0) return alert("Adicione produtos com NF.");

    const dest = document.getElementById('addDestino').value;
    const useCarrier = document.getElementById('chkUseCarrier').checked;
    const transpVal = useCarrier ? document.getElementById('inTransp').value.toUpperCase() : '';
    const laudo = document.getElementById('chkLaudo').checked;
    const balan = document.getElementById('chkBalan').checked;

    const secMap = { 'DOCA': { n: 'DOCA (ALM)', c: 'ALM' }, 'GAVA': { n: 'GAVA', c: 'GAVA' }, 'MANUTENCAO': { n: 'MANUTENÇÃO', c: 'OUT' }, 'INFRA': { n: 'INFRAESTRUTURA', c: 'OUT' }, 'PESAGEM': { n: 'SALA DE PESAGEM', c: 'OUT' }, 'LAB': { n: 'LABORATÓRIO', c: 'OUT' }, 'SST': { n: 'SST', c: 'OUT' }, 'CD': { n: 'CD', c: 'OUT' }, 'OUT': { n: 'OUTROS', c: 'OUT' }, 'COMPRAS': { n: 'COMPRAS', c: 'OUT' } };
    const sec = secMap[dest] || { n: 'OUTROS', c: 'OUT' };
    const id = Date.now().toString();
    const todayStr = window.getBrazilTime().split('T')[0];
    const dailyCount = window.patioData.filter(t => (t.chegada || '').startsWith(todayStr)).length;
    const seq = dailyCount + 1;

    let fornName = document.getElementById('inForn').value.toUpperCase();
    const displayCompany = transpVal || fornName;

    window.patioData.push({
        id, empresa: displayCompany, placa: placaVal, local: sec.c, localSpec: sec.n, status: 'FILA',
        sequencia: seq, recebimentoNotified: false, saidaNotified: false,
        comLaudo: laudo, releasedBy: null, chegada: window.getBrazilTime(), saida: null,
        isProvisory: false, cargas: [{ numero: '1', produtos: window.tmpItems.map(i => ({ nome: i.prod, qtd: '-', nf: i.nf })) }]
    });

    // Cria o Mapa Cego associado
    const mapRows = window.tmpItems.map((item, idx) => ({ id: id + '_' + idx, desc: item.prod, qty: '', qty_nf: '', nf: item.nf, forn: fornName, owners: {} }));
    for (let i = mapRows.length; i < 8; i++) mapRows.push({ id: id + '_x_' + i, desc: '', qty: '', qty_nf: '', nf: '', forn: '', owners: {} });
    window.mapData.push({ id, date: todayStr, rows: mapRows, placa: placaVal, setor: sec.n, launched: false, signatures: {}, forceUnlock: false, divergence: null });

    if (balan) {
        window.mpData.push({ id, date: todayStr, produto: window.tmpItems[0].prod, empresa: fornName, placa: placaVal, local: sec.n, chegada: window.getBrazilTime(), entrada: null, tara: 0, bruto: 0, liq: 0, pesoNF: 0, difKg: 0, difPerc: 0, nf: window.tmpItems[0].nf, notes: '' });
    }

    window.saveAll(); 
    document.getElementById('modalTruck').style.display = 'none'; 
    window.renderPatio(); 
    window.tmpItems = [];
    alert(`Veículo #${seq} registrado com sucesso!`);
};

// Vincula eventos de validação em tempo real aos inputs do modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('inForn')?.addEventListener('input', window.evaluateRequestNecessity);
    document.getElementById('inMot')?.addEventListener('input', window.evaluateRequestNecessity);
    document.getElementById('inTransp')?.addEventListener('input', window.evaluateRequestNecessity);
});

window.validateAndCleanInput = function(el, type) {
    if (type === 'name') {
        let clean = el.value.replace(/[0-9!@#$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/g, "");
        el.value = clean.toUpperCase();
    }
};