// =========================================================
// MÓDULO ADMINISTRATIVO: USUÁRIOS, RELATÓRIOS E DASHBOARD
// =========================================================

window.renderProfileArea = function() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    container.innerHTML = '';

    if (window.isAdmin) {
        container.innerHTML = `
            <div class="settings-card">
                <h4><i class="fas fa-users-cog"></i> Gerenciamento de Usuários (Administrador)</h4>
                <div style="margin-bottom:20px; background:var(--bg-input); padding:15px; border-radius:6px; border:1px solid var(--border-color);">
                    <h5>Adicionar Novo Usuário</h5>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap:10px; align-items:end;">
                        <div><label style="font-size:0.8rem">Usuário</label><input type="text" id="newUsername" placeholder="Ex: Joao"></div>
                        <div><label style="font-size:0.8rem">Senha</label><input type="text" id="newPassword" placeholder="***"></div>
                        <div><label style="font-size:0.8rem">Função</label>
                            <select id="newRole"><option value="user">Usuário</option><option value="admin">Administrador</option></select>
                        </div>
                        <div><label style="font-size:0.8rem">Setor/Subtipo</label>
                            <select id="newSector">
                                <option value="recebimento">Recebimento</option>
                                <option value="conferente">Conferente (Geral)</option>
                                <option value="ALM">Conferente ALM</option>
                                <option value="GAVA">Conferente GAVA</option>
                                <option value="INFRA">Conferente INFRA</option>
                                <option value="MANUT">Conferente MANUT</option>
                            </select>
                        </div>
                        <button class="btn btn-save" onclick="window.addNewUser()">Adicionar</button>
                    </div>
                </div>
                <table class="modern-table">
                    <thead><tr><th>Usuário</th><th>Função</th><th>Setor/Subtipo</th><th>Ações</th></tr></thead>
                    <tbody id="adminUserList"></tbody>
                </table>
            </div>
        `;
        if (typeof window.renderUserList === 'function') window.renderUserList();
    } else {
        const today = window.getBrazilTime().split('T')[0];
        const countToday = window.patioData.filter(x => (x.chegada || '').startsWith(today)).length;
        if (window.isEncarregado) {
            container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <h4><i class="fas fa-id-card"></i> Meu Perfil</h4>
                    <p><b>Usuário:</b> ${loggedUser.username}</p>
                    <p><b>Função:</b> ${loggedUser.role}</p>
                    <p><b>Setor:</b> ${loggedUser.sector} ${loggedUser.subType ? '(' + loggedUser.subType + ')' : ''}</p>
                </div>
                <div class="settings-card">
                    <h4><i class="fas fa-chart-bar"></i> Estatísticas Hoje</h4>
                    <p>Caminhões no Pátio: <b>${window.patioData.filter(x => x.status !== 'SAIU').length}</b></p>
                    <p>Entradas Totais: <b>${countToday}</b></p>
                </div>
            </div>
            <div style="margin-top:18px;">
                <div class="settings-card">
                    <h4><i class="fas fa-user-cog"></i> Controle de Contas (Encarregado)</h4>
                    <div style="margin-bottom:10px; background:var(--bg-input); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
                        <h5 style="margin-top:0;">Criar Conta para Funcionário (Setor: ${loggedUser.sector})</h5>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; align-items:end;">
                            <input id="new_fullname" placeholder="Nome Completo">
                            <input id="new_display" placeholder="Nome de Assinatura">
                            <input id="new_username" placeholder="Login">
                            <input id="new_password" placeholder="Senha">
                            <button class="btn btn-save" onclick="window.createAccountByEncarregado()">Criar</button>
                        </div>
                    </div>
                    <h5>Pendências de Solicitação</h5>
                    <div id="encReqList" style="max-height:220px; overflow:auto; border:1px solid var(--border-color); padding:8px; border-radius:6px; background:var(--bg-card);"></div>
                </div>
            </div>
            `;
            if (typeof window.loadAccountRequests === 'function') window.loadAccountRequests();
        } else {
            container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <h4><i class="fas fa-id-card"></i> Meu Perfil</h4>
                    <p><b>Usuário:</b> ${loggedUser.username}</p>
                    <p><b>Setor:</b> ${loggedUser.sector}</p>
                </div>
                <div class="settings-card">
                    <h4><i class="fas fa-chart-bar"></i> Estatísticas Hoje</h4>
                    <p>Caminhões no Pátio: <b>${window.patioData.filter(x => x.status !== 'SAIU').length}</b></p>
                    <p>Entradas Totais: <b>${countToday}</b></p>
                </div>
            </div>
            `;
        }
    }
};

window.switchRepTab = function(type) {
    const input = document.getElementById('repType');
    if (!input) return;
    input.value = type;

    // Toggle styles of all buttons
    document.querySelectorAll('.rep-tab').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'var(--bg-card)';
            btn.style.color = 'var(--text-main)';
        }
    });

    window.generateAdvancedReport();
};

window.generateAdvancedReport = function() {
    const t = document.getElementById('repType').value;
    const s = document.getElementById('repDateStart').value;
    const e = document.getElementById('repDateEnd').value;
    const term = document.getElementById('repSearchTerm').value.toUpperCase();
    const area = document.getElementById('repResultArea');
    window.currentReportType = t;
    window.selectedReportItems.clear();

    let data = [];
    if (t === 'patio') data = window.patioData;
    else if (t === 'mapas') data = window.mapData;
    else if (t === 'carregamento') data = window.carregamentoData;
    else if (t === 'materia-prima') data = window.mpData;
    else if (t === 'divergencias') {
        const groups = {};
        window.mapData.forEach(m => {
            if (m.rows && Array.isArray(m.rows)) {
                m.rows.forEach((r, rowIdx) => {
                    const qConf = parseFloat(r.qty) || 0;
                    const qNf = parseFloat(r.qty_nf) || 0;
                    const diff = qConf - qNf;
                    if (diff !== 0) {
                        const fornName = (r.forn || m.rows[0]?.forn || 'Diversos').toUpperCase().trim();
                        const prodName = (r.desc || 'Desconhecido').toUpperCase().trim();
                        const key = fornName + '|||' + prodName;
                        
                        if (!groups[key]) {
                            groups[key] = {
                                forn: r.forn || m.rows[0]?.forn || 'Diversos',
                                prod: r.desc || 'Desconhecido',
                                dates: [],
                                nfs: new Set(),
                                qnf: 0,
                                qc: 0,
                                diff: 0,
                                rows: []
                            };
                        }
                        groups[key].dates.push(m.date || 'S/D');
                        if (r.nf && r.nf !== 'S/N') groups[key].nfs.add(r.nf);
                        groups[key].qnf += qNf;
                        groups[key].qc += qConf;
                        groups[key].diff += diff;
                        groups[key].rows.push({ mapId: m.id, rowIdx });
                    }
                });
            }
        });

        data = [];
        Object.keys(groups).forEach(key => {
            const grp = groups[key];
            if (Math.abs(grp.diff) >= 0.01) {
                const sortedDates = grp.dates.filter(d => d !== 'S/D').sort();
                const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : 'S/D';
                const nfList = grp.nfs.size > 0 ? Array.from(grp.nfs).join(', ') : 'S/N';
                data.push({
                    id: 'DIV_GRP_' + key.replace(/[^a-zA-Z0-9]/g, '_'),
                    date: latestDate,
                    placa: 'Consolidado',
                    forn: grp.forn,
                    prod: grp.prod,
                    nf: nfList,
                    qnf: grp.qnf,
                    qc: grp.qc,
                    diff: grp.diff,
                    isGroup: true,
                    groupKeys: grp.rows
                });
            }
        });
    }

    window.filteredReportData = data.filter(i => {
        if (t === 'divergencias') {
            if (term) return JSON.stringify(i).toUpperCase().includes(term);
            return true;
        }
        const d = i.chegada || i.date || i.checkin;
        if (!d) return false;
        const ds = d.slice(0, 10);
        if (s && ds < s) return false;
        if (e && ds > e) return false;
        if (term) return JSON.stringify(i).toUpperCase().includes(term);
        return true;
    });

    let html = '<table class="modern-table"><thead><tr><th style="width:40px;">#</th>';
    if (t === 'patio') html += '<th>Data</th><th>Empresa</th><th>Placa</th><th>Status</th>';
    else if (t === 'mapas') html += '<th>Data</th><th>Placa</th><th>Fornecedor</th><th>Status</th>';
    else if (t === 'materia-prima') html += '<th>Data</th><th>Produto</th><th>Placa</th><th>Líquido</th>';
    else if (t === 'divergencias') html += '<th>Data</th><th>Produto</th><th>Nota Fiscal</th><th>Divergência</th>';
    else html += '<th>Data</th><th>Motorista</th><th>Status</th>';
    html += '</tr></thead><tbody>';

    window.filteredReportData.forEach((i, idx) => {
        html += `<tr onclick="window.openReportDetails(${idx}, '${t}')" class="interactive-row">`;
        html += `<td><input type="checkbox" class="rep-check" onclick="event.stopPropagation(); window.toggleReportSelection('${i.id}')"></td>`;
        
        if (t === 'patio') {
            const isSaiu = i.status === 'SAIU';
            const statusBg = isSaiu ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
            const statusColor = isSaiu ? '#ef4444' : '#10b981';
            html += `<td>${new Date(i.chegada).toLocaleString('pt-BR')}</td><td>${i.empresa}</td><td><span class="badge-code">${i.placa}</span></td><td><span style="background:${statusBg}; color:${statusColor}; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.75rem;">${i.status}</span></td>`;
        } else if (t === 'mapas') {
            const isLaunched = i.launched;
            const statusBg = isLaunched ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
            const statusColor = isLaunched ? '#10b981' : '#f59e0b';
            html += `<td>${i.date ? i.date.split('-').reverse().join('/') : '---'}</td><td><span class="badge-code">${i.placa}</span></td><td>${i.rows?.[0]?.forn || '---'}</td><td><span style="background:${statusBg}; color:${statusColor}; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.75rem;">${isLaunched ? 'Lançado' : 'Rascunho'}</span></td>`;
        } else if (t === 'materia-prima') {
            html += `<td>${i.date ? i.date.split('-').reverse().join('/') : '---'}</td><td>${i.produto}</td><td><span class="badge-code">${i.placa}</span></td><td><b style="color:var(--primary);">${(i.liq || 0).toLocaleString()} Kg</b></td>`;
        } else if (t === 'divergencias') {
            const diffColor = i.diff > 0 ? '#10b981' : '#ef4444';
            const signal = i.diff > 0 ? '+' : '';
            html += `<td>${i.date ? i.date.split('-').reverse().join('/') : '---'}</td><td>${i.prod}</td><td><b>NF: ${i.nf}</b></td><td><b style="color:${diffColor}; font-size:0.95rem;">${signal}${i.diff}</b></td>`;
        } else {
            html += `<td>${new Date(i.checkin).toLocaleString('pt-BR')}</td><td>${i.motorista}</td><td><span style="background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.75rem;">${i.status}</span></td>`;
        }
        
        html += '</tr>';
    });
    html += '</tbody></table>';

    area.innerHTML = html;
    document.getElementById('repTotalCount').innerText = window.filteredReportData.length;
    document.getElementById('repFooter').style.display = 'block';
};

window.renderDashboard = function() {
    let dashView = document.getElementById('view-dashboard');
    if (!dashView) return;
    if (!document.getElementById('slot-0')) {
        dashView.innerHTML = `
            <div class="dashboard-controls">
                <h2>Dashboard Inteligente</h2>
                <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:end; margin-bottom:15px;">
                    <div><label>De:</label><input type="date" id="dashFrom" class="form-control"></div>
                    <div><label>Até:</label><input type="date" id="dashTo" class="form-control"></div>
                    <div><label>Produto:</label><input type="text" id="dashProduct" placeholder="Ex: AÇUCAR" class="form-control"></div>
                    <div><label>Placa:</label><input type="text" id="dashPlate" placeholder="ABC-1234" class="form-control"></div>
                    <div><label>Setor:</label>
                        <select id="dashSector" class="form-control">
                            <option value="">Todos</option><option value="ALM">Almoxarifado</option>
                            <option value="GAVA">Gava</option><option value="RECEBIMENTO">Recebimento</option>
                        </select>
                    </div>
                    <button class="btn btn-save" onclick="window.saveDashboardLayout()"><i class="fas fa-save"></i> Salvar Layout</button>
                    <button class="btn btn-edit" onclick="window.clearDashboard()"><i class="fas fa-trash"></i> Limpar</button>
                </div>
            </div>
            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                <div class="dash-slot" id="slot-0"><div class="empty-state"><button class="btn btn-primary" onclick="window.addToSlot(0)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-1"><div class="empty-state"><button class="btn btn-primary" onclick="window.addToSlot(1)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-2"><div class="empty-state"><button class="btn btn-primary" onclick="window.addToSlot(2)">+ Adicionar Gráfico</button></div></div>
                <div class="dash-slot" id="slot-3"><div class="empty-state"><button class="btn btn-primary" onclick="window.addToSlot(3)">+ Adicionar Gráfico</button></div></div>
            </div>
        `;
    }
    if (typeof window.initDashboard === 'function') window.initDashboard();
};

window.toggleLinkDestType = function(val) {
    const carrDiv = document.getElementById('destCarrierContainer');
    const supDiv = document.getElementById('destSupplierContainer');
    if (val === 'carrier') {
        if (carrDiv) carrDiv.style.display = 'block';
        if (supDiv) supDiv.style.display = 'none';
    } else {
        if (carrDiv) carrDiv.style.display = 'none';
        if (supDiv) supDiv.style.display = 'block';
    }
};

window.handleLinkRelation = function(type) {
    let idA, idB;
    if (type === 'supplier_carrier') {
        idA = document.getElementById('linkSupSelect')?.value;
        idB = document.getElementById('linkCarrSelect')?.value;
    } else if (type === 'carrier_driver') {
        idA = document.getElementById('linkDriverCarrSelect')?.value;
        idB = document.getElementById('linkDriverSelect')?.value;
    } else if (type === 'supplier_driver') {
        idA = document.getElementById('linkDriverSupSelect')?.value;
        idB = document.getElementById('linkDriverSelect')?.value;
    } else if (type === 'driver_plate') {
        idA = document.getElementById('linkDriverPlateSelect')?.value;
        idB = document.getElementById('linkPlateSelect')?.value;
    }
    
    if (window.saveLinkRelation(type, idA, idB)) {
        window.renderCadastros();
    }
};

window.handleUnlinkRelation = function(type, idA, idB) {
    if (confirm("Deseja desvincular estas entidades?")) {
        if (window.removeLinkRelation(type, idA, idB)) {
            window.renderCadastros();
        }
    }
};

window.switchCadTab = function(type) {
    const input = document.getElementById('cadFilterType');
    if (!input) return;
    input.value = type;

    // Toggle styles of all buttons
    document.querySelectorAll('.cad-tab').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'var(--bg-card)';
            btn.style.color = 'var(--text-main)';
        }
    });

    window.renderCadastros();
};

window.renderCadastros = function() {
    const type = document.getElementById('cadFilterType').value;
    const term = document.getElementById('cadSearch').value.toUpperCase();
    const head = document.getElementById('cadTableHead');
    const body = document.getElementById('cadTableBody');
    if(!head || !body) return;

    const populateSelectOpts = (selectId, data, labelKey = 'nome') => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Selecione --</option>';
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item[labelKey] || item.nome || item.numero || item.apelido || 'Sem nome';
            select.appendChild(opt);
        });
    };

    const cadTable = document.getElementById('cadTable');
    const cadVincularSection = document.getElementById('cadVincularSection');
    const requestsList = document.getElementById('requestsList');
    const fab = document.querySelector('#view-cadastros .fab');

    // Update pending requests badge next to tab name
    const pendingRequests = window.requests.filter(r => r.status === 'PENDENTE');
    const badgeReq = document.getElementById('cadBadgeReq');
    if (badgeReq) {
        if (pendingRequests.length > 0) {
            badgeReq.innerText = pendingRequests.length;
            badgeReq.style.display = 'inline-block';
        } else {
            badgeReq.style.display = 'none';
        }
    }

    if (type === 'vincular') {
        if (cadTable) cadTable.style.display = 'none';
        if (fab) fab.style.display = 'none';
        if (requestsList) requestsList.style.display = 'none';
        if (cadVincularSection) {
            cadVincularSection.style.display = 'block';
            cadVincularSection.innerHTML = `
                <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
                    <!-- COLUNA 1: Fornecedor ↔ Transportadora -->
                    <div style="flex: 1; min-width: 300px; background: var(--bg-card); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 15px;">
                        <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-handshake"></i> Fornecedores ↔ Transportadoras</h4>
                        <div style="background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Fornecedor (Empresa)</label>
                                <select id="linkSupSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Transportadora</label>
                                <select id="linkCarrSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <button onclick="window.handleLinkRelation('supplier_carrier')" class="btn btn-save" style="width: 100%; padding: 10px; font-weight: bold; margin-top: 5px;"><i class="fas fa-plus"></i> Criar Vínculo</button>
                        </div>
                        <div style="flex: 1; overflow-y: auto; max-height: 250px; border-top: 1px solid #eee; padding-top: 10px;">
                            <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 8px; color: var(--text-muted);">Vínculos Ativos</label>
                            <div id="supplier_carrier_list" style="display: flex; flex-direction: column; gap: 8px;"></div>
                        </div>
                    </div>

                    <!-- COLUNA 2: Motorista ↔ Transportadora / Fornecedor -->
                    <div style="flex: 1; min-width: 300px; background: var(--bg-card); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 15px;">
                        <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-user-friends"></i> Motoristas ↔ Vínculos</h4>
                        <div style="background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Motorista</label>
                                <select id="linkDriverSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Tipo de Destino</label>
                                <select id="linkDestType" onchange="window.toggleLinkDestType(this.value)" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                    <option value="carrier">Transportadora</option>
                                    <option value="supplier">Fornecedor (Direto)</option>
                                </select>
                            </div>
                            <div id="destCarrierContainer">
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Transportadora</label>
                                <select id="linkDriverCarrSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <div id="destSupplierContainer" style="display: none;">
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Fornecedor (Empresa)</label>
                                <select id="linkDriverSupSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <button onclick="window.handleLinkRelation(document.getElementById('linkDestType').value === 'carrier' ? 'carrier_driver' : 'supplier_driver')" class="btn btn-save" style="width: 100%; padding: 10px; font-weight: bold; margin-top: 5px;"><i class="fas fa-plus"></i> Criar Vínculo</button>
                        </div>
                        <div style="flex: 1; overflow-y: auto; max-height: 250px; border-top: 1px solid #eee; padding-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 4px; color: var(--text-muted);">Vínculos com Transportadoras</label>
                                <div id="carrier_driver_list" style="display: flex; flex-direction: column; gap: 6px;"></div>
                            </div>
                            <div style="margin-top: 5px;">
                                <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 4px; color: var(--text-muted);">Vínculos com Fornecedores</label>
                                <div id="supplier_driver_list" style="display: flex; flex-direction: column; gap: 6px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUNA 3: Motorista ↔ Placa -->
                    <div style="flex: 1; min-width: 300px; background: var(--bg-card); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 15px;">
                        <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-id-card"></i> Motoristas ↔ Placas</h4>
                        <div style="background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Motorista</label>
                                <select id="linkDriverPlateSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Placa</label>
                                <select id="linkPlateSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);"></select>
                            </div>
                            <button onclick="window.handleLinkRelation('driver_plate')" class="btn btn-save" style="width: 100%; padding: 10px; font-weight: bold; margin-top: 5px;"><i class="fas fa-plus"></i> Criar Vínculo</button>
                        </div>
                        <div style="flex: 1; overflow-y: auto; max-height: 250px; border-top: 1px solid #eee; padding-top: 10px;">
                            <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 8px; color: var(--text-muted);">Vínculos Ativos</label>
                            <div id="driver_plate_list" style="display: flex; flex-direction: column; gap: 8px;"></div>
                        </div>
                    </div>
                </div>
            `;

            // Populate selectors
            const sortedSuppliers = [...window.suppliersData].sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));
            const sortedCarriers = [...window.carriersData].sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));
            const sortedDrivers = [...window.driversData].sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));
            const sortedPlates = [...window.platesData].sort((a,b) => (a.numero || '').localeCompare(b.numero || ''));

            populateSelectOpts('linkSupSelect', sortedSuppliers, 'nome');
            populateSelectOpts('linkCarrSelect', sortedCarriers, 'nome');
            
            populateSelectOpts('linkDriverSelect', sortedDrivers, 'nome');
            populateSelectOpts('linkDriverCarrSelect', sortedCarriers, 'nome');
            populateSelectOpts('linkDriverSupSelect', sortedSuppliers, 'nome');
            
            populateSelectOpts('linkDriverPlateSelect', sortedDrivers, 'nome');
            populateSelectOpts('linkPlateSelect', sortedPlates, 'numero');

            // Render supplier_carrier list
            const scList = document.getElementById('supplier_carrier_list');
            if (scList) {
                let html = '';
                sortedCarriers.forEach(c => {
                    if (c.supplierIds && Array.isArray(c.supplierIds)) {
                        c.supplierIds.forEach(supId => {
                            const supplier = window.suppliersData.find(s => s.id === supId);
                            const sName = supplier ? supplier.nome : 'Fornecedor Desconhecido';
                            const cName = c.nome || c.apelido || 'Transportadora Desconhecida';
                            html += `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.015); border:1px solid rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:0.85rem;">
                                    <div style="flex:1; padding-right:10px; word-break:break-word;">
                                        <span style="font-weight:bold; color:var(--text-main);">${sName}</span>
                                        <span style="color:#888; font-size:0.75rem; display:block;"><i class="fas fa-link"></i> ${cName}</span>
                                    </div>
                                    <button onclick="window.handleUnlinkRelation('supplier_carrier', '${supId}', '${c.id}')" class="btn-icon-remove" style="padding:4px 8px; background:#fee2e2; border-radius:4px; border:none; color:#ef4444; cursor:pointer;" title="Desvincular"><i class="fas fa-unlink"></i></button>
                                </div>
                            `;
                        });
                    }
                });
                scList.innerHTML = html || '<div style="color:#999; text-align:center; font-size:0.8rem; padding:10px;">Nenhum vínculo ativo</div>';
            }

            // Render carrier_driver list
            const cdList = document.getElementById('carrier_driver_list');
            if (cdList) {
                let html = '';
                sortedDrivers.forEach(d => {
                    if (d.carrierIds && Array.isArray(d.carrierIds)) {
                        d.carrierIds.forEach(cId => {
                            const carrier = window.carriersData.find(c => c.id === cId);
                            const cName = carrier ? (carrier.nome || carrier.apelido) : 'Transportadora Desconhecida';
                            const dName = d.nome || 'Motorista Desconhecido';
                            html += `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.015); border:1px solid rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:0.85rem;">
                                    <div style="flex:1; padding-right:10px; word-break:break-word;">
                                        <span style="font-weight:bold; color:var(--text-main);">${dName}</span>
                                        <span style="color:#888; font-size:0.75rem; display:block;"><i class="fas fa-truck"></i> Transp: ${cName}</span>
                                    </div>
                                    <button onclick="window.handleUnlinkRelation('carrier_driver', '${cId}', '${d.id}')" class="btn-icon-remove" style="padding:4px 8px; background:#fee2e2; border-radius:4px; border:none; color:#ef4444; cursor:pointer;" title="Desvincular"><i class="fas fa-unlink"></i></button>
                                </div>
                            `;
                        });
                    }
                });
                cdList.innerHTML = html || '<div style="color:#999; text-align:center; font-size:0.8rem; padding:5px;">Sem transportadora vinculada</div>';
            }

            // Render supplier_driver list
            const sdList = document.getElementById('supplier_driver_list');
            if (sdList) {
                let html = '';
                sortedDrivers.forEach(d => {
                    if (d.supplierIds && Array.isArray(d.supplierIds)) {
                        d.supplierIds.forEach(supId => {
                            const supplier = window.suppliersData.find(s => s.id === supId);
                            const sName = supplier ? supplier.nome : 'Fornecedor Desconhecido';
                            const dName = d.nome || 'Motorista Desconhecido';
                            html += `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.015); border:1px solid rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:0.85rem;">
                                    <div style="flex:1; padding-right:10px; word-break:break-word;">
                                        <span style="font-weight:bold; color:var(--text-main);">${dName}</span>
                                        <span style="color:#888; font-size:0.75rem; display:block;"><i class="fas fa-building"></i> Forn: ${sName}</span>
                                    </div>
                                    <button onclick="window.handleUnlinkRelation('supplier_driver', '${supId}', '${d.id}')" class="btn-icon-remove" style="padding:4px 8px; background:#fee2e2; border-radius:4px; border:none; color:#ef4444; cursor:pointer;" title="Desvincular"><i class="fas fa-unlink"></i></button>
                                </div>
                            `;
                        });
                    }
                });
                sdList.innerHTML = html || '<div style="color:#999; text-align:center; font-size:0.8rem; padding:5px;">Sem fornecedor vinculado</div>';
            }

            // Render driver_plate list
            const dpList = document.getElementById('driver_plate_list');
            if (dpList) {
                let html = '';
                sortedPlates.forEach(p => {
                    if (p.driverId) {
                        const driver = window.driversData.find(d => d.id === p.driverId);
                        const dName = driver ? driver.nome : 'Motorista Desconhecido';
                        const pNum = p.numero || 'Placa Desconhecida';
                        html += `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.015); border:1px solid rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:0.85rem;">
                                <div style="flex:1; padding-right:10px; word-break:break-word;">
                                    <span style="font-weight:bold; color:var(--text-main);">${pNum}</span>
                                    <span style="color:#888; font-size:0.75rem; display:block;"><i class="fas fa-user"></i> Motorista: ${dName}</span>
                                </div>
                                <button onclick="window.handleUnlinkRelation('driver_plate', '${p.driverId}', '${p.id}')" class="btn-icon-remove" style="padding:4px 8px; background:#fee2e2; border-radius:4px; border:none; color:#ef4444; cursor:pointer;" title="Desvincular"><i class="fas fa-unlink"></i></button>
                            </div>
                        `;
                    }
                });
                dpList.innerHTML = html || '<div style="color:#999; text-align:center; font-size:0.8rem; padding:10px;">Nenhum vínculo ativo</div>';
            }
        }
        return;
    } else if (type === 'requests') {
        if (cadTable) cadTable.style.display = 'none';
        if (fab) fab.style.display = 'none';
        if (cadVincularSection) cadVincularSection.style.display = 'none';
        if (requestsList) {
            requestsList.style.display = 'block';
            
            const filtered = pendingRequests.filter(r => 
                (r.requester || r.user || '').toUpperCase().includes(term) ||
                (r.type || '').toUpperCase().includes(term) ||
                JSON.stringify(r.data || {}).toUpperCase().includes(term)
            );

            if (filtered.length === 0) {
                requestsList.innerHTML = `
                    <div style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-check-circle" style="font-size:3rem; color:#16a34a; margin-bottom:15px; display:block;"></i>
                        <h4 style="margin:0; font-weight:bold;">Nenhuma requisição pendente!</h4>
                        <p style="margin:5px 0 0; font-size:0.9rem;">Todas as aprovações de cadastro de entrada já foram processadas.</p>
                    </div>
                `;
            } else {
                requestsList.innerHTML = `
                    <h4 style="color: var(--primary); margin-top:0; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-clipboard-check"></i> Aprovações de Cadastro Pendentes (${filtered.length})
                    </h4>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:15px;">
                        ${filtered.map(r => {
                            const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleString('pt-BR') : 'Sem data';
                            const requester = r.requester || r.user || 'Desconhecido';
                            
                            let detailsHtml = '';
                            if (r.data) {
                                const sup = r.data.supplier?.name || '---';
                                const supNew = !r.data.supplier?.id ? '<span style="color:#d97706; font-size:0.75rem; font-weight:bold;">[NOVO]</span>' : '';
                                
                                const carr = r.data.carrier?.name || '---';
                                const carrNew = !r.data.carrier?.id && carr !== '---' ? '<span style="color:#d97706; font-size:0.75rem; font-weight:bold;">[NOVO]</span>' : '';
                                
                                const mot = r.data.driver?.name || '---';
                                const motNew = !r.data.driver?.id ? '<span style="color:#d97706; font-size:0.75rem; font-weight:bold;">[NOVO]</span>' : '';
                                
                                const plate = r.data.plate?.number || '---';
                                const plateNew = !r.data.plate?.id ? '<span style="color:#d97706; font-size:0.75rem; font-weight:bold;">[NOVO]</span>' : '';

                                detailsHtml = `
                                    <div style="font-size:0.85rem; background:rgba(0,0,0,0.015); border:1px solid rgba(0,0,0,0.05); padding:8px; border-radius:6px; margin-top:8px; display:flex; flex-direction:column; gap:4px;">
                                        <div><b>Fornecedor:</b> ${sup} ${supNew}</div>
                                        <div><b>Transportadora:</b> ${carr} ${carrNew}</div>
                                        <div><b>Motorista:</b> ${mot} ${motNew}</div>
                                        <div><b>Placa:</b> ${plate} ${plateNew}</div>
                                    </div>
                                `;
                            }

                            return `
                                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:15px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
                                    <div>
                                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:8px; margin-bottom:8px;">
                                            <span style="font-weight:bold; color:var(--primary); font-size:0.8rem; text-transform:uppercase;">
                                                <i class="fas fa-truck-moving"></i> Entrada de Veículo
                                            </span>
                                            <span style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</span>
                                        </div>
                                        <div style="font-size:0.9rem; color:var(--text-main);">
                                            Solicitante: <b>${requester}</b>
                                        </div>
                                        ${detailsHtml}
                                    </div>
                                    <button class="btn btn-save" style="width:100%; font-weight:bold; padding:8px; margin-top:5px;" onclick="window.openUnifiedApproval('${r.id}')">
                                        <i class="fas fa-search"></i> Analisar & Aprovar
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }
        return;
    } else {
        if (cadTable) cadTable.style.display = '';
        if (fab) fab.style.display = '';
        if (cadVincularSection) cadVincularSection.style.display = 'none';
        if (requestsList) requestsList.style.display = 'none';
    }

    // Oculta cadReqSection redundante, pois agora as requisições têm uma aba dedicada lindíssima
    const reqSection = document.getElementById('cadReqSection');
    if (reqSection) {
        reqSection.style.display = 'none';
    }

    let data = [];
    if(type === 'fornecedor') {
        data = window.suppliersData;
        head.innerHTML = '<tr><th>Nome</th><th>Apelido</th><th>CNPJ</th><th>Ações</th></tr>';
    } else if(type === 'transportadora') {
        data = window.carriersData;
        head.innerHTML = '<tr><th>Nome</th><th>Apelido</th><th>CNPJ</th><th>Ações</th></tr>';
    } else if(type === 'motorista') {
        data = window.driversData;
        head.innerHTML = '<tr><th>Nome</th><th>Documento</th><th>Ações</th></tr>';
    } else if(type === 'placa') {
        data = window.platesData;
        head.innerHTML = '<tr><th>Placa</th><th>Motorista</th><th>Ações</th></tr>';
    } else if(type === 'produto') {
        data = window.productsData;
        head.innerHTML = '<tr><th>Código</th><th>Produto</th><th>Ações</th></tr>';
    }

    const filtered = data.filter(item => JSON.stringify(item).toUpperCase().includes(term));
    body.innerHTML = filtered.map(item => {
        let cols = '';
        if (type === 'fornecedor') {
            cols = `<td>${item.nome || '---'}</td><td>${item.apelido || '---'}</td><td>${item.cnpj || '---'}</td>`;
        } else if (type === 'transportadora') {
            cols = `<td>${item.nome || '---'}</td><td>${item.apelido || '---'}</td><td>${item.cnpj || '---'}</td>`;
        } else if (type === 'motorista') {
            cols = `<td>${item.nome || '---'}</td><td>${item.doc || '---'}</td>`;
        } else if (type === 'placa') {
            const driver = window.driversData.find(d => d.id === item.driverId);
            cols = `<td>${item.numero || '---'}</td><td>${driver ? driver.nome : '---'}</td>`;
        } else if (type === 'produto') {
            cols = `<td><b style="color:var(--primary)">${item.codigo || '---'}</b></td><td>${item.nome || '---'}</td>`;
        }
        return `
            <tr>
                ${cols}
                <td>
                    <button class="btn btn-save btn-small" onclick="window.openCadModal('${type}','${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon-remove" style="margin-left:4px" onclick="window.deleteCad('${type}','${item.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};

window.renderProductsView = function() {
    const body = document.getElementById('prodViewBody');
    const term = document.getElementById('prodViewSearch')?.value.toUpperCase() || '';
    if(!body) return;

    const filtered = window.productsData.filter(p => p.nome.toUpperCase().includes(term));
    body.innerHTML = filtered.map(p => `
        <tr>
            <td><b style="color:var(--primary)">${p.codigo || '---'}</b></td>
            <td>${p.nome}</td>
            <td>${p.cargasCount || 0}</td>
            <td>${p.lastSupplier || '---'}</td>
            <td>
                <button class="btn btn-save btn-small" onclick="window.openCadModal('produto','${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-remove" onclick="window.deleteCad('produto', '${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
};

window.openEditProduct = function(id) {
    window.openCadModal('produto', id);
};

window.renderRequests = function() {
    const list = document.getElementById('reqList');
    const badge = document.getElementById('badgeNotif');
    if (!list) return;
    const pending = window.requests.filter(r => r.status === 'PENDENTE');
    if (badge) badge.innerText = pending.length;
    if (pending.length === 0) {
        list.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">Nenhuma requisição pendente.</p>';
        return;
    }
    list.innerHTML = pending.map(req => `
        <div class="notification-item" style="border-left: 4px solid #f59e0b; margin-bottom:10px; padding:12px; background:var(--bg-card); border-radius:8px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <b style="font-size:0.8rem; color:var(--primary);">${(req.type || '').toUpperCase()}</b>
                <small style="color:#888;">${req.timestamp ? req.timestamp.slice(11, 16) : '--:--'}</small>
            </div>
            <p style="margin:5px 0; font-size:0.9rem;">Solicitado por: <b>${req.requester || req.user || '---'}</b></p>
            <button class="btn btn-save btn-small" style="width:100%" onclick="window.openUnifiedApproval('${req.id}')">Analisar e Aprovar</button>
        </div>
    `).join('');
};

window.openUnifiedApproval = function(id) {
    const req = window.requests.find(r => r.id === id);
    if (!req) return;

    if (req.type === 'edit') {
        const m = window.mapData.find(x => x.id === req.mapId);
        const mapDesc = m ? `Placa: ${m.placa || 'Sem placa'} - Setor: ${m.setor || 'Sem setor'}` : `ID: ${req.mapId}`;
        const decision = confirm(`Solicitação de EDIÇÃO de Mapa Cego por: ${req.requester || 'Conferente'}\nMapa: ${mapDesc}\n\nDeseja APROVAR esta solicitação?\n\n[OK] para APROVAR e liberar edição para ${req.requester}\n[Cancelar] para REJEITAR ou cancelar.`);
        if (decision) {
            window.resolveRequest(id, 'approved');
            alert(`Solicitação de edição APROVADA para o usuário ${req.requester}!`);
        } else {
            if (confirm("Deseja realmente REJEITAR esta solicitação de edição?")) {
                window.resolveRequest(id, 'rejected');
                alert("Solicitação de edição REJEITADA.");
            }
        }
        return;
    }

    // Suporte a ambos os formatos de requisição (novo e antigo)
    if (req.type === 'entrada_veiculo' && req.data && req.data.fornecedor) {
        req.data = {
            supplier: { name: req.data.fornecedor.nome, id: req.data.fornecedor.isNew ? null : 'exists' },
            carrier: { name: req.data.transportadora?.nome || '', id: req.data.transportadora?.isNew ? null : (req.data.transportadora?.active ? 'exists' : null) },
            driver: { name: req.data.motorista.nome, id: req.data.motorista.isNew ? null : 'exists' },
            plate: { number: req.data.placa.numero, id: req.data.placa.isNew ? null : 'exists' },
            newProducts: req.data.produtosNovos || []
        };
        req.type = 'complex_entry';
    }

    if (typeof window.openUnifiedApprovalModal === 'function') {
        window.openUnifiedApprovalModal(id);
    }
};

// confirmUnifiedApproval é definido no missing-functions.js com lógica completa
// Esta versão é um fallback caso o módulo não tenha carregado
if (typeof window.confirmUnifiedApproval !== 'function') {
    window.confirmUnifiedApproval = function() {
        alert('Erro: módulo de aprovação não carregado. Recarregue a página.');
    };
}

window.deleteCad = function(type, id) {
    if(!confirm("Excluir este cadastro?")) return;
    if(type === 'fornecedor') window.suppliersData = window.suppliersData.filter(x => x.id !== id);
    else if(type === 'motorista') window.driversData = window.driversData.filter(x => x.id !== id);
    else if(type === 'placa') window.platesData = window.platesData.filter(x => x.id !== id);
    else if(type === 'transportadora') window.carriersData = window.carriersData.filter(x => x.id !== id);
    else if(type === 'produto') window.productsData = window.productsData.filter(x => x.id !== id);
    window.saveAll(); window.renderCadastros(); window.renderProductsView();
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initRoleBasedUI === 'function') window.initRoleBasedUI();
    if (typeof window.loadDataFromServer === 'function') window.loadDataFromServer();
    setInterval(() => { if (typeof window.renderRequests === 'function') window.renderRequests(); }, 4000);
});