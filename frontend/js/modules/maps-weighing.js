// =========================================================
// MÓDULO DE MAPAS CEGOS, PESAGEM E CARREGAMENTO
// =========================================================

/**
 * Determina se o usuário logado tem permissão para acessar um determinado setor
 */
window.hasSectorAccess = function(sector) {
    if (window.isAdmin || window.isEncarregado || window.isRecebimento) return true;
    if (!window.isConferente) return false;
    
    const subType = window.userSubType || (window.loggedUser ? window.loggedUser.subType : null);
    if (!subType) return true; // Se não houver subtipo definido, permite acesso padrão
    
    const normalizedSector = (sector || '').toUpperCase().trim();
    if (subType === 'ALM') {
        return normalizedSector === 'DOCA (ALM)' || normalizedSector === 'GAVA';
    }
    if (subType === 'GAVA') {
        return normalizedSector === 'GAVA';
    }
    
    const mapping = {
        'INFRA': 'INFRAESTRUTURA',
        'MANUT': 'MANUTENÇÃO',
        'LAB': 'LABORATÓRIO',
        'PESAGEM': 'SALA DE PESAGEM',
        'SST': 'SST',
        'CD': 'CD',
        'COMPRAS': 'COMPRAS'
    };
    
    const allowed = mapping[subType];
    return allowed ? normalizedSector === allowed : false;
};

/**
 * Determina se o mapa é editável pelo usuário logado no momento
 */
window.isMapEditableForUser = function(m) {
    if (!m) return false;
    if (!m.launched) return true;
    if (window.isAdmin) return true;
    if (m.authorizedEditor && window.loggedUser && m.authorizedEditor === window.loggedUser.username) return true;
    return false;
};

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

    const filteredMaps = window.mapData.filter(m => m.date === fd && window.hasSectorAccess(m.setor)).slice().reverse();

    if (filteredMaps.length === 0) {
        l.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum mapa para esta data.</div>';
        return;
    }

    filteredMaps.forEach(m => {
        const el = document.createElement('div');
        el.className = `mc-item ${window.currentMapId === m.id ? 'selected' : ''}`;
        
        let netDiff = 0;
        let hasDivergence = false;
        m.rows.forEach(r => {
            if (r.desc && r.qty_nf !== undefined && r.qty !== undefined && r.qty_nf !== '' && r.qty !== '') {
                const qNf = parseFloat(r.qty_nf) || 0;
                const qReal = parseFloat(r.qty) || 0;
                const diff = qReal - qNf;
                if (diff !== 0) {
                    hasDivergence = true;
                    netDiff += diff;
                }
            }
        });

        if (hasDivergence) {
            if (netDiff < 0) {
                el.style.borderLeft = "5px solid #ef4444";
            } else if (netDiff > 0) {
                el.style.borderLeft = "5px solid #10b981";
            } else {
                el.style.borderLeft = "5px solid #f59e0b";
            }
        }

        let divBadge = '';
        if (hasDivergence) {
            if (netDiff < 0) {
                divBadge = '<span style="background:rgba(239,68,68,0.12); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:4px;" title="Divergência para menos"><i class="fas fa-arrow-down"></i> DIV (-)</span>';
            } else if (netDiff > 0) {
                divBadge = '<span style="background:rgba(16,185,129,0.12); color:#10b981; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:4px;" title="Divergência para mais"><i class="fas fa-arrow-up"></i> DIV (+)</span>';
            } else {
                divBadge = '<span style="background:rgba(245,158,11,0.12); color:#f59e0b; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:4px;" title="Divergência neutra compensada"><i class="fas fa-exchange-alt"></i> DIV (=)</span>';
            }
        }

        let altBadge = '';
        if (m.changeCount && m.changeCount > 0) {
            altBadge = `<span style="background:rgba(6,182,212,0.12); color:#0891b2; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:4px;" title="Alterado ${m.changeCount} vez(es)"><i class="fas fa-history"></i> Alterado (${m.changeCount}x)</span>`;
        }

        let manualSigBadge = '';
        if (m.manualSignature) {
            manualSigBadge = '<span style="background:rgba(30,58,138,0.12); color:#1e3a8a; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:4px;" title="Requer Assinatura Manual"><i class="fas fa-signature"></i> Manual</span>';
        }

        el.innerHTML = `
            <div><b>${m.rows[0]?.forn || 'Diversos'}</b></div>
            <small>${m.placa} • ${m.setor}</small>
            <div style="display:flex; align-items:center; gap:2px; margin-top:5px; flex-wrap:wrap;">
                ${m.launched ? '<span style="color:#10b981; font-weight:bold; font-size:0.75rem;">Lançado</span>' : '<span style="color:#64748b; font-size:0.75rem;">Rascunho</span>'}
                ${divBadge}
                ${altBadge}
                ${manualSigBadge}
            </div>
        `;

        el.onclick = () => { window.loadMap(m.id); };
        
        el.oncontextmenu = (e) => {
            e.preventDefault();
            window.openMapContextMenu(e.pageX, e.pageY, m.id);
        };
        
        l.appendChild(el);
    });
};

/**
 * Abre o menu de contexto do Mapa Cego (Clique Direito)
 */
window.openMapContextMenu = function(x, y, id) {
    window.contextMapId = id;
    const m = document.getElementById('ctxMenu');
    if (!m) return;
    
    const map = window.mapData.find(x => x.id === id);
    let requestEditHtml = '';
    if (map && map.launched && !window.isAdmin) {
        requestEditHtml = `<div class="ctx-item" onclick="window.openRequestEditModal('${id}')"><i class="fas fa-edit"></i> Solicitar Edição</div>`;
    }

    let adminHtml = '';
    if (window.isAdmin && map) {
        const statusText = map.manualSignature ? 'Ativada (Toque/Mouse)' : 'Desativada (Texto)';
        adminHtml = `<div class="ctx-item" onclick="window.toggleManualSignature('${id}')"><i class="fas fa-signature"></i> Assinatura Manual: ${statusText}</div>`;
    }

    m.innerHTML = `
        <div class="ctx-item" onclick="window.loadMap('${id}')"><i class="fas fa-eye"></i> Visualizar Mapa</div>
        ${requestEditHtml}
        ${adminHtml}
        <div class="ctx-item" style="color:red" onclick="window.deleteMapCego('${id}')"><i class="fas fa-trash"></i> Excluir Mapa</div>
    `;
    let posX = x;
    let posY = y;
    if (x + 200 > window.innerWidth) posX = window.innerWidth - 220;
    m.style.left = posX + 'px';
    m.style.top = posY + 'px';
    m.style.display = 'block';
};

/**
 * Exclui permanentemente um mapa cego
 */
window.deleteMapCego = function(id) {
    if (confirm("Deseja excluir este mapa cego? Esta ação é irreversível e removerá as contagens.")) {
        window.mapData = window.mapData.filter(m => m.id !== id);
        window.saveAll();
        if (window.currentMapId === id) {
            window.currentMapId = null;
            window.updateMapState();
        }
        window.renderMapList();
    }
    window.closeContextMenu();
};

/**
 * Salva a alteração do setor no objeto do mapa
 */
window.updateMapSetor = function(val) {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (m) {
        m.setor = val;
        window.saveAll();
        window.renderMapList();
    }
};

/**
 * Carrega os dados de um mapa específico para edição/visualização
 */
window.loadMap = function(id) {
    window.currentMapId = id; 
    const m = window.mapData.find(x => x.id === id); 
    if (!m) return;

    if (typeof window.hasSectorAccess === 'function' && !window.hasSectorAccess(m.setor)) {
        alert("Acesso negado: Você não tem permissão para visualizar mapas deste setor.");
        window.currentMapId = null;
        window.updateMapState();
        return;
    }
    
    window.mapSnapshot = JSON.stringify(m.rows);
    window.mapHeaderSnapshot = JSON.stringify({ date: m.date, placa: m.placa, setor: m.setor });
    
    document.getElementById('mapDate').value = m.date; 
    document.getElementById('mapPlaca').value = m.placa; 
    document.getElementById('mapSetor').value = m.setor;
    
    const editable = window.isMapEditableForUser(m);
    const headerEditable = editable && (!m.launched || window.isAdmin);
    
    document.getElementById('mapSetor').disabled = !headerEditable;
    document.getElementById('mapPlaca').readOnly = !headerEditable;
    document.getElementById('mapDate').readOnly = !headerEditable;
    
    const banner = document.getElementById('divBanner');
    if (m.divergence) { 
        banner.style.display = 'block'; 
        document.getElementById('divBannerText').innerHTML = `De: ${m.divergence.reporter}<br>"${m.divergence.reason}"`; 
        document.getElementById('divResolveBtn').innerHTML = window.isRecebimento ? `<button class="btn btn-save" onclick="window.resolveDivergence('${m.id}')">Resolver</button>` : ''; 
    } else {
        banner.style.display = 'none';
    }

    const st = document.getElementById('mapStatus');
    const btnLaunch = document.getElementById('btnLaunch');
    const btnRequestEdit = document.getElementById('btnRequestEdit');
    const btnSave = document.querySelector('.mc-btn-save');
    
    if (m.launched) {
        if (m.authorizedEditor === window.loggedUser.username) {
            st.textContent = `EDIÇÃO AUTORIZADA (${window.loggedUser.username})`;
            st.style.color = '#3b82f6';
            if (btnLaunch) btnLaunch.style.display = 'inline-block';
            if (btnRequestEdit) btnRequestEdit.style.display = 'none';
            if (btnSave) btnSave.style.display = 'inline-block';
        } else {
            st.textContent = m.changeCount ? `LANÇADO (Bloqueado) - Alterado ${m.changeCount}x` : 'LANÇADO (Bloqueado)'; 
            st.style.color = 'green'; 
            if (btnLaunch) btnLaunch.style.display = 'none'; 
            if (btnRequestEdit) btnRequestEdit.style.display = (!window.isAdmin) ? 'inline-block' : 'none'; 
            if (btnSave) btnSave.style.display = window.isAdmin ? 'inline-block' : 'none';
        }
    } else { 
        st.textContent = 'Rascunho'; 
        st.style.color = '#666'; 
        if (btnLaunch) btnLaunch.style.display = 'inline-block'; 
        if (btnRequestEdit) btnRequestEdit.style.display = 'none'; 
        if (btnSave) btnSave.style.display = 'inline-block';
    }
    
    const hasWeigh = window.mpData.some(x => x.id === m.id || (x.placa === m.placa && x.date === m.date));
    const btnGoToWeigh = document.getElementById('btnGoToWeigh');
    if (btnGoToWeigh) {
        btnGoToWeigh.style.display = hasWeigh ? 'inline-block' : 'none';
    }

    const btnMapHistory = document.getElementById('btnMapHistory');
    if (btnMapHistory) {
        btnMapHistory.style.display = (m.changeHistory && m.changeHistory.length > 0) ? 'inline-block' : 'none';
    }
    
    const sigRecebEl = document.getElementById('sigReceb');
    if (sigRecebEl) {
        if (m.signatures?.receb) {
            if (m.signatures.receb.startsWith('data:image/')) {
                sigRecebEl.innerHTML = `<img src="${m.signatures.receb}" style="max-height: 50px; max-width: 150px; background: white; border-radius: 4px; padding: 2px; display: block; border: 1px solid #cbd5e1;" />`;
            } else {
                sigRecebEl.textContent = m.signatures.receb;
            }
        } else {
            sigRecebEl.innerHTML = '';
        }
    }

    const sigConfEl = document.getElementById('sigConf');
    if (sigConfEl) {
        if (m.signatures?.conf) {
            if (m.signatures.conf.startsWith('data:image/')) {
                sigConfEl.innerHTML = `<img src="${m.signatures.conf}" style="max-height: 50px; max-width: 150px; background: white; border-radius: 4px; padding: 2px; display: block; border: 1px solid #cbd5e1;" />`;
            } else {
                sigConfEl.textContent = m.signatures.conf;
            }
        } else {
            sigConfEl.innerHTML = '';
        }
    }
    
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
    const editable = window.isMapEditableForUser(m);

    m.rows.forEach(r => {
        const tr = document.createElement('tr');
        
        let rowBg = '';
        let rowTextColor = '';
        if (r.desc && r.qty_nf !== undefined && r.qty !== undefined && r.qty_nf !== '' && r.qty !== '') {
            const qNf = parseFloat(r.qty_nf) || 0;
            const qReal = parseFloat(r.qty) || 0;
            if (qReal < qNf) {
                rowBg = 'rgba(239, 68, 68, 0.08)';
                rowTextColor = '#ef4444';
            } else if (qReal > qNf) {
                rowBg = 'rgba(16, 185, 129, 0.08)';
                rowTextColor = '#10b981';
            }
        }
        
        if (rowBg) {
            tr.style.backgroundColor = rowBg;
        }

        const createCell = (f, role) => {
            let ro = !editable;
            if (editable && !window.isAdmin) {
                if (role === 'conf' && !window.isConferente) ro = true;
                if (role === 'receb' && !window.isRecebimento) ro = true;
            }
            
            let val = r[f] !== undefined ? r[f] : '';
            if (window.isConferente && f === 'qty_nf' && !window.isAdmin && !window.isRecebimento) {
                val = '---';
                ro = true;
            }
            
            let cellStyle = 'width:100%;';
            if (rowTextColor && (f === 'qty_nf' || f === 'qty')) {
                cellStyle += ` color: ${rowTextColor}; font-weight: bold;`;
            }

            if (f === 'desc') {
                return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="window.updateRow('${r.id}','${f}',this.value)" style="${cellStyle} cursor:help; color:var(--primary); font-weight:600;" onclick="window.showProductCodePopup(this.value)" title="Clique para ver o código"></td>`;
            }
            return `<td><input type="text" class="cell" value="${val}" ${ro ? 'readonly' : ''} onchange="window.updateRow('${r.id}','${f}',this.value)" style="${cellStyle}"></td>`;
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
    if (window.userPermissions && !window.userPermissions.canSignMap) {
        return alert("Você não tem permissão para assinar o mapa cego.");
    }
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return;
    if (m.launched && !m.forceUnlock) return alert("Mapa lançado e bloqueado.");

    if (m.manualSignature) {
        window.openMapSignatureCanvasModal(role);
        return;
    }

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

    const activeRows = m.rows.filter(r => r.desc && r.desc.trim() !== '');
    if (activeRows.length === 0) {
        return alert("ERRO: O mapa cego precisa ter pelo menos um material preenchido para ser lançado.");
    }

    let hasEmpty = false;
    activeRows.forEach(r => {
        const hasQtyNf = r.qty_nf !== undefined && r.qty_nf !== null && r.qty_nf.toString().trim() !== '';
        const hasQtyReal = r.qty !== undefined && r.qty !== null && r.qty.toString().trim() !== '';
        if (!hasQtyNf || !hasQtyReal) {
            hasEmpty = true;
        }
    });

    if (hasEmpty) {
        return alert("ERRO: Todos os itens com descrição de material devem possuir a Quantidade da NF e a Quantidade Contada preenchidas antes de lançar.");
    }

    let hasDivergence = false;
    let divReason = "";
    activeRows.forEach(r => {
        if (parseFloat(r.qty_nf) !== parseFloat(r.qty)) {
            hasDivergence = true;
            divReason += `${r.desc}: NF(${r.qty_nf}) vs Real(${r.qty}); `;
        }
    });

    if (hasDivergence) {
        m.divergence = { reporter: m.signatures.conf, reason: divReason, date: window.getBrazilTime(), status: 'PENDENTE' };
        alert("Divergência detectada e registrada!");
    } else {
        m.divergence = null;
    }

    m.launched = true;
    m.forceUnlock = false;
    m.authorizedEditor = null;
    window.saveAll();
    window.loadMap(m.id);
    alert("Mapa lançado com sucesso!");
};

window.showProductCodePopup = function(productName) {
    if(!productName) return;
    const nameUpper = productName.toUpperCase().trim();
    const prod = window.productsData.find(p => p.nome === nameUpper);
    const modal = document.getElementById('modalProdCode');
    if(!modal) return;
    const lblName = document.getElementById('popProdName');
    const lblCode = document.getElementById('popProdCode');
    if(!lblName || !lblCode) return;
    lblName.innerText = nameUpper;
    // Usa prod.codigo (campo correto do sistema)
    const code = prod ? (prod.codigo || prod.sku || null) : null;
    if (code) {
        lblCode.innerText = code;
        lblCode.style.color = 'var(--primary)';
        lblCode.style.fontSize = '2.5rem';
    } else {
        lblCode.innerText = 'NÃO CADASTRADO';
        lblCode.style.color = '#ccc';
        lblCode.style.fontSize = '1.5rem';
    }
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
        if (window.currentMapId === m.id) {
            tr.style.backgroundColor = 'rgba(139, 92, 246, 0.08)';
            tr.style.border = '2px dashed #8b5cf6';
        }
        tr.oncontextmenu = function (e) { 
            e.preventDefault(); 
            window.contextMPId = m.id; 
            if (typeof window.openMPContextMenu === 'function') window.openMPContextMenu(e.pageX, e.pageY); 
        };

        const diffFormatted = Number(m.difKg).toFixed(2);
        
        // Alerta para auditoria caso a diferença exceda 1% tolerada
        const exceedsTolerance = Math.abs(m.difPerc) > 1.0;
        const alertBadge = exceedsTolerance 
            ? `<span style="background:rgba(239,68,68,0.12); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:6px; display:inline-flex; align-items:center; gap:2px;" title="Divergência excede 1% tolerância"><i class="fas fa-exclamation-triangle"></i> AUDITORIA</span>` 
            : '';

        const localBadge = m.local === 'MANUAL'
            ? `<span style="background:rgba(59,130,246,0.12); color:#3b82f6; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-keyboard"></i> Manual</span>`
            : `<span style="background:rgba(16,185,129,0.12); color:#10b981; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-balance-scale"></i> Balança</span>`;

        const inputStyle = `border:1px solid var(--border-color); border-radius:6px; padding:6px 8px; font-weight:bold; background:var(--bg-input); color:var(--text-main); font-family:inherit; font-size:0.85rem; text-align:right; width:80px; transition:border-color 0.15s ease; outline:none;`;

        tr.innerHTML = `
        <td>${m.date ? m.date.split('-').reverse().join('/') : '---'}</td>
        <td><b style="cursor:help; color:var(--primary);" data-fullname="${m.produto}">${window.formatProductName(m.produto)}</b><br><small style="color:var(--text-muted);">${m.empresa}</small></td>
        <td><span class="badge-code">${m.placa}</span></td>
        <td>${localBadge}</td>
        <td><b style="color:var(--text-muted);">${m.chegada ? m.chegada.slice(11, 16) : '-'}</b></td>
        <td><b style="color:var(--text-muted);">${m.entrada ? m.entrada.slice(11, 16) : '-'}</b></td>
        <td><input type="number" style="${inputStyle}" value="${m.tara}" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'" onchange="window.updateWeights('${m.id}','tara',this.value)"></td>
        <td><input type="number" style="${inputStyle}" value="${m.bruto}" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'" onchange="window.updateWeights('${m.id}','bruto',this.value)"></td>
        <td><b style="color:var(--primary); font-size:0.9rem;">${(m.liq || 0).toLocaleString()} Kg</b></td>
        <td><input type="number" style="${inputStyle}" value="${m.pesoNF}" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'" onchange="window.updateWeights('${m.id}','pesoNF',this.value)"></td>
        <td style="color:${m.difKg < 0 ? '#ef4444' : '#10b981'}; font-weight:bold; font-size:0.9rem;">${m.difKg > 0 ? '+' : ''}${parseFloat(diffFormatted).toLocaleString()} Kg</td>
        <td><b style="color:${m.difKg < 0 ? '#ef4444' : '#10b981'};">${m.difPerc}%</b>${alertBadge}</td>
        <td><b style="color:var(--text-muted);">${m.saida ? m.saida.slice(11, 16) : '-'}</b></td>
        <td><b>NF: ${m.nf || 'S/N'}</b></td>`;
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
        tr.className = 'interactive-row';
        tr.oncontextmenu = function (e) { 
            e.preventDefault(); 
            window.contextCarrId = c.id; 
            if (typeof window.openCarrContextMenu === 'function') window.openCarrContextMenu(e.pageX, e.pageY); 
        };
        
        let statusBadge = '';
        let btn = '-';
        
        if (c.status === 'AGUARDANDO') {
            statusBadge = `<span style="background:rgba(245,158,11,0.12); color:#f59e0b; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-clock"></i> AGUARDANDO</span>`;
            btn = `<button class="btn btn-save btn-small" style="padding:6px 12px; font-weight:bold; display:flex; align-items:center; gap:4px;" onclick="window.changeStatusCarregamento('${c.id}','CARREGANDO')"><i class="fas fa-play"></i> LIBERAR</button>`;
        } else if (c.status === 'CARREGANDO') {
            statusBadge = `<span style="background:rgba(59,130,246,0.12); color:#3b82f6; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-spinner fa-spin"></i> CARREGANDO</span>`;
            btn = `<button class="btn btn-launch btn-small" style="padding:6px 12px; font-weight:bold; display:flex; align-items:center; gap:4px;" onclick="window.changeStatusCarregamento('${c.id}','SAIU')"><i class="fas fa-check"></i> FINALIZAR</button>`;
        } else {
            statusBadge = `<span style="background:rgba(16,185,129,0.12); color:#10b981; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-check-circle"></i> SAIU</span>`;
        }

        const inputStyle = `border:1px solid var(--border-color); border-radius:6px; padding:6px 8px; font-weight:bold; background:var(--bg-input); color:var(--text-main); font-family:inherit; font-size:0.85rem; text-align:right; width:70px; transition:border-color 0.15s ease; outline:none;`;

        tr.innerHTML = `
            <td>${statusBadge}</td>
            <td><b>${c.motorista}</b></td>
            <td><span class="badge-code">${c.cavalo}</span></td>
            <td>${(c.carretas || []).map(plat => `<span class="badge-code" style="background:rgba(0,0,0,0.03); color:var(--text-main); margin-right:4px;">${plat}</span>`).join('')}</td>
            <td><input type="number" style="${inputStyle}" value="${c.tara || 0}" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'" onchange="window.updateCarrWeight('${c.id}','tara',this.value)"></td>
            <td><input type="number" style="${inputStyle}" value="${c.bruto || 0}" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'" onchange="window.updateCarrWeight('${c.id}','bruto',this.value)"></td>
            <td><b style="color:var(--primary); font-size:0.9rem;">${(c.liq || 0).toLocaleString()} Kg</b></td>
            <td><b style="color:var(--text-muted);">${(c.checkin || '').slice(11, 16) || '-'}</b></td>
            <td><b style="color:var(--text-muted);">${(c.start || '').slice(11, 16) || '-'}</b></td>
            <td><b style="color:var(--text-muted);">${(c.checkout || '').slice(11, 16) || '-'}</b></td>
            <td>${btn}</td>
        `;
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

/**
 * Atalho para ir para a Pesagem do caminhão selecionado
 */
window.goToWeightFromCurrentMap = function() {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return;
    
    window.navTo('materia-prima');
    
    const filter = document.getElementById('mpDateFilter');
    if (filter) {
        filter.value = m.date;
        window.renderMateriaPrima();
    }
};

/**
 * Mostra o histórico de alterações feitas no mapa cego
 */
window.showMapChangeHistory = function() {
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m || !m.changeHistory || m.changeHistory.length === 0) {
        return alert("Nenhuma alteração registrada para este mapa cego.");
    }
    
    const content = document.getElementById('mapHistoryContent');
    if (!content) return;
    
    let html = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>Placa:</strong> <span>${m.placa || 'Sem Placa'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>Setor:</strong> <span>${m.setor || 'Sem Setor'}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <strong>Total de Edições:</strong> <span class="badge-code" style="background:rgba(6,182,212,0.1); color:#0891b2; font-weight:bold;">${m.changeCount || 0}x</span>
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
    `;
    
    m.changeHistory.forEach((h, hIdx) => {
        const dateFormatted = h.timestamp ? h.timestamp.slice(11, 16) + ' ' + h.timestamp.slice(8, 10) + '/' + h.timestamp.slice(5, 7) + '/' + h.timestamp.slice(0, 4) : 'Data Indisponível';
        
        let changesList = (h.changes || []).map(c => `<li style="margin-left:20px; font-size:0.88rem; color:#475569; list-style-type:disc;">${c}</li>`).join('');
        if (!changesList) {
            changesList = '<li style="margin-left:20px; font-size:0.88rem; color:#94a3b8; list-style-type:disc;">Alterações gerais</li>';
        }
        
        html += `
            <div style="border-left:3px solid #06b6d4; padding-left:12px; margin-bottom:5px; background:rgba(6, 182, 212, 0.02); padding:10px 12px; border-radius:4px; border:1px solid #e2e8f0; border-left-width:3px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-weight:bold; color:#0e7490;"><i class="fas fa-user-edit"></i> ${h.user || 'Usuário'}</span>
                    <span style="font-size:0.75rem; color:#64748b;"><i class="far fa-clock"></i> ${dateFormatted}</span>
                </div>
                <ul style="margin:0; padding:0;">
                    ${changesList}
                </ul>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
    
    const modal = document.getElementById('modalMapHistory');
    if (modal) modal.style.display = 'flex';
};

// =========================================================
// ASSINATURA MANUAL (CANVAS) PARA MAPAS CEGOS
// =========================================================

window.toggleManualSignature = function(id) {
    const map = window.mapData.find(x => x.id === id);
    if (!map) return;
    if (!window.isAdmin) return alert("Apenas administradores podem alterar esta configuração.");
    
    map.manualSignature = !map.manualSignature;
    
    window.saveAll();
    window.renderMapList();
    if (window.currentMapId === id) {
        window.loadMap(id);
    }
    window.closeContextMenu();
    alert(`Assinatura manual para o mapa #${id} foi ${map.manualSignature ? 'ATIVADA' : 'DESATIVADA'}.`);
};

let mapIsDrawing = false;
let mapSigCanvas = null;
let mapSigCtx = null;

window.initMapSignatureCanvas = function() {
    mapSigCanvas = document.getElementById('mapSignatureCanvas');
    if (!mapSigCanvas) return;
    
    mapSigCtx = mapSigCanvas.getContext('2d');
    
    window.clearMapSignatureCanvas();

    if (mapSigCanvas._eventsInitialized) return;
    mapSigCanvas._eventsInitialized = true;

    mapSigCanvas.addEventListener('pointerdown', (e) => {
        mapIsDrawing = true;
        mapSigCtx.beginPath();
        const rect = mapSigCanvas.getBoundingClientRect();
        mapSigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    mapSigCanvas.addEventListener('pointermove', (e) => {
        if (!mapIsDrawing) return;
        const rect = mapSigCanvas.getBoundingClientRect();
        mapSigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        mapSigCtx.stroke();
    });

    mapSigCanvas.addEventListener('pointerup', () => {
        mapIsDrawing = false;
    });

    mapSigCanvas.addEventListener('pointerleave', () => {
        mapIsDrawing = false;
    });
};

window.clearMapSignatureCanvas = function() {
    if (!mapSigCanvas || !mapSigCtx) return;
    mapSigCtx.fillStyle = '#ffffff';
    mapSigCtx.fillRect(0, 0, mapSigCanvas.width, mapSigCanvas.height);
    
    mapSigCtx.strokeStyle = '#cccccc';
    mapSigCtx.lineWidth = 1;
    mapSigCtx.setLineDash([5, 5]);
    mapSigCtx.beginPath();
    mapSigCtx.moveTo(20, mapSigCanvas.height - 25);
    mapSigCtx.lineTo(mapSigCanvas.width - 20, mapSigCanvas.height - 25);
    mapSigCtx.stroke();
    
    mapSigCtx.fillStyle = '#888888';
    mapSigCtx.font = '10px Arial';
    const role = document.getElementById('mapSignatureRole')?.value || 'receb';
    const labelText = role === 'receb' ? 'ASSINATURA MANUAL DO RECEBIMENTO' : 'ASSINATURA MANUAL DO CONFERENTE';
    mapSigCtx.fillText(labelText, mapSigCanvas.width / 2 - 95, mapSigCanvas.height - 10);
    
    mapSigCtx.strokeStyle = '#1e3a8a';
    mapSigCtx.lineWidth = 2.5;
    mapSigCtx.setLineDash([]);
};

window.openMapSignatureCanvasModal = function(role) {
    const modal = document.getElementById('modalMapSignatureCanvas');
    if (!modal) return;
    
    if (role === 'receb') {
        if (!window.isRecebimento) return alert("Apenas o Recebimento pode assinar aqui.");
    } else {
        if (!window.isConferente && !window.isAdmin) return alert("Apenas conferentes podem assinar aqui.");
    }

    document.getElementById('mapSignatureRole').value = role;
    document.getElementById('mapSignatureRoleName').textContent = role === 'receb' ? 'Recebimento' : 'Conferência';
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
        window.initMapSignatureCanvas();
    }, 100);
};

window.closeMapSignatureCanvasModal = function() {
    const modal = document.getElementById('modalMapSignatureCanvas');
    if (modal) modal.style.display = 'none';
};

window.confirmMapSignature = function() {
    const role = document.getElementById('mapSignatureRole').value;
    const m = window.mapData.find(x => x.id === window.currentMapId);
    if (!m) return;

    if (!mapSigCanvas || !mapSigCtx) return;

    const signatureData = mapSigCanvas.toDataURL();
    
    if (!m.signatures) m.signatures = {};
    
    if (role === 'receb') {
        m.signatures.receb = signatureData;
    } else {
        m.signatures.conf = signatureData;
        m.conferenteSignature = signatureData;
    }

    window.saveAll();
    window.loadMap(m.id);
    window.closeMapSignatureCanvasModal();
};