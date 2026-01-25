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

    window.filteredReportData = data.filter(i => {
        const d = i.chegada || i.date || i.checkin;
        if (!d) return false;
        const ds = d.slice(0, 10);
        if (ds < s || ds > e) return false;
        if (term) return JSON.stringify(i).toUpperCase().includes(term);
        return true;
    });

    let html = '<table class="modern-table"><thead><tr><th style="width:40px;">#</th>';
    if (t === 'patio') html += '<th>Data</th><th>Empresa</th><th>Placa</th><th>Status</th>';
    else if (t === 'mapas') html += '<th>Data</th><th>Placa</th><th>Fornecedor</th><th>Status</th>';
    else if (t === 'materia-prima') html += '<th>Data</th><th>Produto</th><th>Placa</th><th>Líquido</th>';
    else html += '<th>Data</th><th>Motorista</th><th>Status</th>';
    html += '</tr></thead><tbody>';

    window.filteredReportData.forEach((i, idx) => {
        html += `<tr onclick="window.openReportDetails(${idx}, '${t}')" class="interactive-row">`;
        html += `<td><input type="checkbox" class="rep-check" onclick="event.stopPropagation(); window.toggleReportSelection('${i.id}')"></td>`;
        if (t === 'patio') html += `<td>${new Date(i.chegada).toLocaleString()}</td><td>${i.empresa}</td><td>${i.placa}</td><td>${i.status}</td>`;
        else if (t === 'mapas') html += `<td>${i.date}</td><td>${i.placa}</td><td>${i.rows[0]?.forn}</td><td>${i.launched ? 'Lançado' : 'Rascunho'}</td>`;
        else if (t === 'materia-prima') html += `<td>${new Date(i.date).toLocaleDateString()}</td><td>${i.produto}</td><td>${i.placa}</td><td>${i.liq} Kg</td>`;
        else html += `<td>${new Date(i.checkin).toLocaleString()}</td><td>${i.motorista}</td><td>${i.status}</td>`;
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

window.renderCadastros = function() {
    const type = document.getElementById('cadFilterType').value;
    const term = document.getElementById('cadSearch').value.toUpperCase();
    const head = document.getElementById('cadTableHead');
    const body = document.getElementById('cadTableBody');
    if(!head || !body) return;

    let data = [];
    if(type === 'fornecedor') {
        data = window.suppliersData;
        head.innerHTML = '<tr><th>ID</th><th>Nome</th><th>Ações</th></tr>';
    } else if(type === 'transportadora') {
        data = window.carriersData;
        head.innerHTML = '<tr><th>ID</th><th>Nome</th><th>Ações</th></tr>';
    } else if(type === 'motorista') {
        data = window.driversData;
        head.innerHTML = '<tr><th>ID</th><th>Nome</th><th>Documento</th><th>Ações</th></tr>';
    } else if(type === 'placa') {
        data = window.platesData;
        head.innerHTML = '<tr><th>ID</th><th>Placa</th><th>Ações</th></tr>';
    } else if(type === 'produto') {
        data = window.productsData;
        head.innerHTML = '<tr><th>SKU</th><th>Produto</th><th>Ações</th></tr>';
    }

    const filtered = data.filter(item => JSON.stringify(item).toUpperCase().includes(term));
    body.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.id || item.sku || item.numero || '---'}</td>
            <td>${item.nome || item.numero}</td>
            ${type === 'motorista' ? `<td>${item.doc || '---'}</td>` : ''}
            <td><button class="btn-icon-remove" onclick="window.deleteCad('${type}','${item.id || item.sku || item.numero}')"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
};

window.renderProductsView = function() {
    const body = document.getElementById('prodViewBody');
    const term = document.getElementById('prodViewSearch')?.value.toUpperCase() || '';
    if(!body) return;

    const filtered = window.productsData.filter(p => p.nome.toUpperCase().includes(term));
    body.innerHTML = filtered.map(p => `
        <tr>
            <td><b style="color:var(--primary)">${p.sku || '---'}</b></td>
            <td>${p.nome}</td>
            <td>${p.cargasCount || 0}</td>
            <td>${p.lastSupplier || '---'}</td>
            <td>
                <button class="btn btn-save btn-small" onclick="window.openEditProduct('${p.id || p.nome}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-remove" onclick="window.deleteCad('produto', '${p.id || p.nome}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
};

window.openEditProduct = function(id) {
    const prod = window.productsData.find(p => (p.id === id || p.nome === id));
    if(!prod) return;
    const newSku = prompt(`Editando Produto: ${prod.nome}\n\nDigite o novo Código (SKU):`, prod.sku || "");
    if (newSku !== null) {
        prod.sku = newSku.toUpperCase();
        window.saveAll();
        window.renderProductsView();
    }
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
                <b style="font-size:0.8rem; color:var(--primary);">${req.type.toUpperCase()}</b>
                <small style="color:#888;">${req.timestamp ? req.timestamp.slice(11, 16) : '--:--'}</small>
            </div>
            <p style="margin:5px 0; font-size:0.9rem;">Solicitado por: <b>${req.requester}</b></p>
            <button class="btn btn-save btn-small" style="width:100%" onclick="window.openUnifiedApproval('${req.id}')">Analisar e Aprovar</button>
        </div>
    `).join('');
};

window.openUnifiedApproval = function(id) {
    const req = window.requests.find(r => r.id === id);
    if (!req) return;
    const modal = document.getElementById('modalUnifiedApproval');
    const container = document.getElementById('approvalContainer');
    if(!modal || !container) return;
    document.getElementById('appReqId').value = id;
    let html = '<div style="display:grid; gap:15px;">';
    if(req.data.fornecedor?.isNew) html += `<div><label>FORNECEDOR:</label><input type="text" id="appForn" value="${req.data.fornecedor.nome}" class="form-input-styled input-warning"></div>`;
    if(req.data.transportadora?.active && req.data.transportadora?.isNew) html += `<div><label>TRANSPORTADORA:</label><input type="text" id="appTransp" value="${req.data.transportadora.nome}" class="form-input-styled input-warning"></div>`;
    if(req.data.motorista?.isNew) html += `<div><label>MOTORISTA:</label><input type="text" id="appMot" value="${req.data.motorista.nome}" class="form-input-styled input-warning"></div>`;
    if(req.data.placa?.isNew) html += `<div><label>PLACA:</label><input type="text" id="appPlaca" value="${req.data.placa.numero}" class="form-input-styled input-warning"></div>`;
    html += '</div>';
    container.innerHTML = html;
    modal.style.display = 'flex';
};

window.confirmUnifiedApproval = function() {
    const id = document.getElementById('appReqId').value;
    const reqIndex = window.requests.findIndex(r => r.id === id);
    if (reqIndex === -1) return;
    const req = window.requests[reqIndex];
    if(req.data.fornecedor?.isNew) {
        const val = document.getElementById('appForn').value.toUpperCase();
        window.suppliersData.push({ id: 'SUP' + Date.now(), nome: val });
    }
    if(req.data.motorista?.isNew) {
        const val = document.getElementById('appMot').value.toUpperCase();
        window.driversData.push({ id: 'DRV' + Date.now(), nome: val, carrierIds: [] });
    }
    if(req.data.placa?.isNew) {
        const val = document.getElementById('appPlaca').value.toUpperCase();
        window.platesData.push({ id: 'PLK' + Date.now(), numero: val });
    }
    window.requests[reqIndex].status = 'APROVADO';
    const truck = window.patioData.find(t => t.linkedRequestId === id);
    if(truck) { truck.isProvisory = false; truck.localSpec = 'APROVADO'; }
    window.saveAll();
    alert("Requisição aprovada!");
    document.getElementById('modalUnifiedApproval').style.display = 'none';
    window.renderRequests(); window.renderPatio();
};

window.deleteCad = function(type, id) {
    if(!confirm("Excluir este cadastro?")) return;
    if(type === 'fornecedor') window.suppliersData = window.suppliersData.filter(x => x.id !== id);
    else if(type === 'motorista') window.driversData = window.driversData.filter(x => x.id !== id);
    else if(type === 'placa') window.platesData = window.platesData.filter(x => x.id !== id);
    else if(type === 'produto') window.productsData = window.productsData.filter(x => (x.id !== id && x.sku !== id));
    window.saveAll(); window.renderCadastros(); window.renderProductsView();
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initRoleBasedUI === 'function') window.initRoleBasedUI();
    if (typeof window.loadDataFromServer === 'function') window.loadDataFromServer();
    setInterval(() => { if (typeof window.renderRequests === 'function') window.renderRequests(); }, 4000);
});