// =========================================================
// MÓDULO DE MAPAS CEGOS, PESAGEM E CARREGAMENTO
// =========================================================

/**
 * Controla a visibilidade da folha do mapa ou do estado vazio
 */
window.updateMapState = function() {
    const sheet = document.getElementById('mapSheet');
    const empty = document.getElementById('mapEmptyState');
    if (!sheet || !empty) return;
    if (window.currentMapId && window.mapData.find(m => m.id === window.currentMapId)) {
        sheet.style.display = 'block'; 
        empty.style.display = 'none';
    } else {
        window.currentMapId = null; 
        sheet.style.display = 'none'; 
        empty.style.display = 'flex';
        document.querySelectorAll('.mc-item').forEach(el => el.classList.remove('selected'));
    }
};

/**
 * Renderiza a lista lateral de mapas para a data selecionada
 */
window.renderMapList = function() {
    const fd = document.getElementById('mapListDateFilter').value;
    const l = document.getElementById('mapList');
    if(!l) return;
    l.innerHTML = '';

    const filteredMaps = window.mapData.filter(m => m.date === fd).slice().reverse();

    if (filteredMaps.length === 0) {
        l.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum mapa para esta data.</div>';
        return;
    }

    filteredMaps.forEach(m => {
        const el = document.createElement('div');
        el.className = `mc-item ${window.currentMapId === m.id ? 'selected' : ''}`;
        if (m.divergence) el.style.borderLeft = "4px solid red";

        el.innerHTML = `
            <div><b>${m.rows[0]?.forn || 'Diversos'}</b></div>
            <small>${m.placa} • ${m.setor}</small>
            <div>${m.launched ? '<span style="color:green">Lançado</span>' : 'Rascunho'} ${m.divergence ? '<b style="color:red">(DIV)</b>' : ''}</div>
        `;

        el.onclick = () => { window.loadMap(m.id); };
        l.appendChild(el);
    });
};

/**
 * Carrega os dados de um mapa específico para edição/visualização
 */
window.loadMap = function(id) {
    window.currentMapId = id; 
    const m = window.mapData.find(x => x.id === id); 
    if (!m) return;
    
    document.getElementById('mapDate').value = m.date; 
    document.getElementById('mapPlaca').value = m.placa; 
    document.getElementById('mapSetor').value = m.setor;
    
    const banner = document.getElementById('divBanner');
    if (m.divergence) { 
        banner.style.display = 'block'; 
        document.getElementById('divBannerText').innerHTML = `De: ${m.divergence.reporter}<br>"${m.divergence.reason}"`; 
        document.getElementById('divResolveBtn').innerHTML = window.isRecebimento ? `<button class="btn btn-save" onclick="window.resolveDivergence('${m.id}')">Resolver</button>` : ''; 
    } else {
        banner.style.display = 'none';
    }

    const st = document.getElementById('mapStatus');
    if (m.launched && !m.forceUnlock) { 
        st.textContent = 'LANÇADO (Bloqueado)'; 
        st.style.color = 'green'; 
        document.getElementById('btnLaunch').style.display = 'none'; 
        document.getElementById('btnRequestEdit').style.display = window.isConferente ? 'inline-block' : 'none'; 
    } else { 
        st.textContent = m.forceUnlock ? 'EM EDIÇÃO (Desbloqueado)' : 'Rascunho'; 
        st.style.color = m.forceUnlock ? 'orange' : '#666'; 
        document.getElementById('btnLaunch').style.display = 'inline-block'; 
        document.getElementById('btnRequestEdit').style.display = 'none'; 
    }
    
    document.getElementById('sigReceb').textContent = m.signatures?.receb || ''; 
    document.getElementById('sigConf').textContent = m.signatures?.conf || '';
    
    window.renderRows(m); 
    window.renderMapList(); 
    window.updateMapState();
};

/**
 * Renderiza as linhas de itens do mapa cego
 */
window.renderRows = function(m) {
    const tb = document.getElementById('mapBody'); 
    tb.innerHTML = '';
    const locked = m.launched && !m.forceUnlock;

    m.rows.forEach(r => {
        const tr = document.createElement('tr');
        const createCell = (f, role) => {
            let ro = locked;
            if (!locked) {
                if (role === 'conf' && !window.isConferente) ro = true;
                if (role === 'receb' && !window.isRecebimento) ro = true;
            }
            let val = r[f];
            if (window.isConferente && f === 'qty_nf') { val = '---'; ro = true; }
            if (f === 'desc') {
                return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="window.updateRow('${r.id}','${f}',this.value)" style="width:100%; cursor:help; color:var(--primary); font-weight:600;" onclick="window.showProductCodePopup(this.value)" title="Clique para ver o código"></td>`;
            }
            return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="window.updateRow('${r.id}','${f}',this.value)" style="width:100%"></td>`;
        };
        tr.innerHTML = `${createCell('desc', 'receb')} ${createCell('qty_nf', 'receb')} ${createCell('qty', 'conf')} ${createCell('nf', 'receb')} ${createCell('forn', 'receb')}`;
        tb.appendChild(tr);
    });
};

window.updateRow = function(rid, f, v) { 
    const m = window.mapData.find(x => x.id === window.currentMapId); 
    if (m) {
        const r = m.rows.find(x => x.id === rid); 
        if (r) { r[f] = v; window.saveAll(); } 
    }
};

window.signMap = function(role) {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return;
    if (m.launched && !m.forceUnlock) return alert("Mapa lançado e bloqueado.");

    const name = (typeof loggedUser !== 'undefined') ? loggedUser.username : 'USUÁRIO';
    
    if (role === 'receb') {
        if (!window.isRecebimento) return alert("Apenas o Recebimento pode assinar aqui.");
        if(!m.signatures) m.signatures = {};
        m.signatures.receb = name;
    } else {
        if (!window.isConferente && !window.isAdmin) return alert("Apenas conferentes podem assinar aqui.");
        if(!m.signatures) m.signatures = {};
        m.signatures.conf = name;
    }

    window.saveAll();
    window.loadMap(m.id);
};

window.launchMap = function() {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return;
    if (!m.signatures?.receb || !m.signatures?.conf) {
        return alert("ERRO: O mapa precisa das duas assinaturas (Recebimento e Conferência) para ser lançado.");
    }

    let hasDivergence = false;
    let divReason = "";
    m.rows.forEach(r => {
        if (r.desc && r.qty_nf && r.qty) {
            if (parseFloat(r.qty_nf) !== parseFloat(r.qty)) {
                hasDivergence = true;
                divReason += `${r.desc}: NF(${r.qty_nf}) vs Real(${r.qty}); `;
            }
        }
    });

    if (hasDivergence) {
        m.divergence = { reporter: m.signatures.conf, reason: divReason, date: window.getBrazilTime(), status: 'PENDENTE' };
        alert("Divergência detectada e registrada!");
    }

    m.launched = true;
    m.forceUnlock = false;
    window.saveAll();
    window.loadMap(m.id);
    alert("Mapa lançado com sucesso!");
};

window.showProductCodePopup = function(productName) {
    if(!productName) return;
    const prod = window.productsData.find(p => p.nome === productName.toUpperCase());
    const modal = document.getElementById('modalProdCode');
    if(!modal) return;
    document.getElementById('popProdName').innerText = productName.toUpperCase();
    document.getElementById('popProdCode').innerText = prod ? (prod.sku || 'SEM SKU') : 'NÃO CADASTRADO';
    modal.style.display = 'flex';
};

window.resolveDivergence = function(id) {
    if(!window.isRecebimento) return alert("Apenas o Recebimento pode resolver divergências.");
    const m = window.mapData.find(x => x.id === id);
    if(m && confirm("Deseja marcar esta divergência como resolvida?")) {
        m.divergence = null;
        window.saveAll();
        window.loadMap(id);
    }
};

// --- LÓGICA DE MATÉRIA-PRIMA (PESAGEM) ---

window.renderMateriaPrima = function() {
    const tb = document.getElementById('mpBody');
    if(!tb) return;
    tb.innerHTML = '';
    const d = document.getElementById('mpDateFilter').value;

    window.mpData.filter(m => m.date === d).forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'interactive-row';
        tr.oncontextmenu = function (e) { 
            e.preventDefault(); 
            window.contextMPId = m.id; 
            if (typeof window.openMPContextMenu === 'function') window.openMPContextMenu(e.pageX, e.pageY); 
        };

        const diffFormatted = Number(m.difKg).toFixed(2);
        tr.innerHTML = `
        <td>${new Date(m.date).toLocaleDateString()}</td>
        <td><b>${m.produto}</b><br><small>${m.empresa}</small></td>
        <td>${m.placa}</td>
        <td>${m.local}</td>
        <td>${m.chegada ? m.chegada.slice(11, 16) : '-'}</td>
        <td>${m.entrada ? m.entrada.slice(11, 16) : '-'}</td>
        <td><input type="number" class="cell" style="width:100px" value="${m.tara}" onchange="window.updateWeights('${m.id}','tara',this.value)"></td>
        <td><input type="number" class="cell" style="width:100px" value="${m.bruto}" onchange="window.updateWeights('${m.id}','bruto',this.value)"></td>
        <td style="font-weight:bold">${m.liq}</td>
        <td><input type="number" class="cell" style="width:100px" value="${m.pesoNF}" onchange="window.updateWeights('${m.id}','pesoNF',this.value)"></td>
        <td style="color:${m.difKg < 0 ? 'red' : 'green'}">${diffFormatted}</td>
        <td>${m.difPerc}%</td>
        <td>${m.saida ? m.saida.slice(11, 16) : '-'}</td>
        <td>${m.nf || 'S/N'}</td>`;
        tb.appendChild(tr);
    });
};

window.updateWeights = function(id, f, v) {
    const i = window.mpData.findIndex(m => m.id === id); 
    if (i > -1) {
        window.mpData[i][f] = parseFloat(v) || 0; 
        window.mpData[i].liq = window.mpData[i].bruto - window.mpData[i].tara;
        window.mpData[i].difKg = window.mpData[i].liq - window.mpData[i].pesoNF; 
        window.mpData[i].difPerc = window.mpData[i].pesoNF ? ((window.mpData[i].difKg / window.mpData[i].pesoNF) * 100).toFixed(2) : 0;
        window.saveAll(); 
        window.renderMateriaPrima();
    }
};

// --- LÓGICA DE CARREGAMENTO ---

window.renderCarregamento = function() {
    const tb = document.getElementById('carrBody'); 
    if(!tb) return;
    tb.innerHTML = '';
    const d = document.getElementById('carrDateFilter').value;
    window.carregamentoData.filter(c => c.status !== 'SAIU' || c.date === d).forEach(c => {
        const tr = document.createElement('tr');
        tr.oncontextmenu = function (e) { 
            e.preventDefault(); 
            window.contextCarrId = c.id; 
            if (typeof window.openCarrContextMenu === 'function') window.openCarrContextMenu(e.pageX, e.pageY); 
        };
        let btn = c.status === 'AGUARDANDO' ? `<button class="btn btn-save btn-small" onclick="window.changeStatusCarregamento('${c.id}','CARREGANDO')">LIBERAR</button>` : (c.status === 'CARREGANDO' ? `<button class="btn btn-edit btn-small" onclick="window.changeStatusCarregamento('${c.id}','SAIU')">FINALIZAR</button>` : '-');
        tr.innerHTML = `<td>${c.status}</td><td>${c.motorista}</td><td>${c.cavalo}</td><td>${(c.carretas || []).join(',')}</td><td><input class="cell" style="width:50px" value="${c.tara || 0}" onchange="window.updateCarrWeight('${c.id}','tara',this.value)"></td><td><input class="cell" style="width:50px" value="${c.bruto || 0}" onchange="window.updateCarrWeight('${c.id}','bruto',this.value)"></td><td>${c.liq || 0}</td><td>${(c.checkin || '').slice(11, 16) || '-'}</td><td>${(c.start || '').slice(11, 16) || '-'}</td><td>${(c.checkout || '').slice(11, 16) || '-'}</td><td>${btn}</td>`;
        tb.appendChild(tr);
    });
};

window.changeStatusCarregamento = function(id, s) { 
    const i = window.carregamentoData.findIndex(c => c.id === id); 
    if (i > -1) { 
        window.carregamentoData[i].status = s; 
        if (s === 'CARREGANDO') window.carregamentoData[i].start = window.getBrazilTime(); 
        if (s === 'SAIU') window.carregamentoData[i].checkout = window.getBrazilTime(); 
        window.saveAll(); 
        window.renderCarregamento(); 
    } 
};