// =========================================================
// MÓDULO ADMINISTRATIVO: USUÁRIOS, RELATÓRIOS E DASHBOARD
// =========================================================

window.renderProfileArea = function() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    container.innerHTML = '';

    if (!window.loggedUser) {
        container.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">Nenhum usuário logado.</p>';
        return;
    }

    const hasPermission = function(perm) {
        const role = (window.loggedUser.role || '').toLowerCase();
        const sector = (window.loggedUser.sector || '').toLowerCase();
        const isAdm = role.includes('admin') || role.includes('administrador');
        const isReceb = sector === 'recebimento' || isAdm;
        const isConf = sector === 'conferente' || isAdm;
        const isEnc = role.includes('encarreg');

        switch(perm) {
            case 'patio': return isReceb || isConf || isEnc;
            case 'drag_truck': return isReceb;
            case 'register_truck': return isReceb;
            case 'sign_notes': return isConf;
            case 'weighing': return isConf || isReceb;
            case 'user_management': return isAdm;
            case 'staff_creation': return isEnc || isAdm;
            case 'reports_dash': return isAdm || isEnc;
            case 'approve_requests': return isAdm || isEnc;
            default: return false;
        }
    };

    const renderPermissionItem = function(label, active) {
        const icon = active 
            ? '<i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i>' 
            : '<i class="fas fa-times-circle" style="color: var(--text-muted); opacity: 0.5; margin-right: 8px;"></i>';
        const textStyle = active ? 'font-weight: 500; color: var(--text-main);' : 'color: var(--text-muted); text-decoration: line-through; opacity: 0.7;';
        return `
            <div class="permission-item" style="display: flex; align-items: center; padding: 6px 10px; background: rgba(0,0,0,0.02); border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--border-color);">
                ${icon}
                <span style="${textStyle}">${label}</span>
            </div>
        `;
    };

    const u = (window.usersData || []).find(x => x.username === window.loggedUser.username);
    const avatarEmoji = window.loggedUser.avatarEmoji || (u ? u.avatarEmoji : null) || '👤';
    const avatarColor = window.loggedUser.avatarColor || (u ? u.avatarColor : null) || '#3b82f6';
    const avatarPhoto = window.loggedUser.avatarPhoto || (u ? u.avatarPhoto : null) || null;
    const coverImage = window.loggedUser.coverImage || (u ? u.coverImage : null) || null;

    const AVATARS = [
        { emoji: '👤', color: '#3b82f6' },
        { emoji: '👷', color: '#f59e0b' },
        { emoji: '👨‍💼', color: '#8b5cf6' },
        { emoji: '👩‍💼', color: '#ec4899' },
        { emoji: '👨‍💻', color: '#10b981' },
        { emoji: '👩‍💻', color: '#14b8a6' },
        { emoji: '🕵️', color: '#6b7280' },
        { emoji: '⚡', color: '#ef4444' }
    ];

    const avatarSelectorHtml = AVATARS.map(av => {
        const isSelected = av.emoji === avatarEmoji && av.color === avatarColor;
        return `
            <div class="avatar-selector-item ${isSelected ? 'selected' : ''}" 
                 onclick="window.selectProfileAvatar('${av.emoji}', '${av.color}')" 
                 style="background-color: ${av.color};">
                ${av.emoji}
            </div>
        `;
    }).join('');

    let roleClass = 'user';
    if (window.isAdmin) roleClass = 'admin';
    else if (window.isEncarregado) roleClass = 'enc';

    let rightColumnContent = '';

    if (window.isEncarregado) {
        rightColumnContent = `
            <div class="settings-card">
                <h4><i class="fas fa-user-cog"></i> Controle de Contas (Encarregado)</h4>
                <div style="margin-bottom:20px; background:rgba(0,0,0,0.02); padding:15px; border-radius:6px; border:1px solid var(--border-color);">
                    <h5 style="margin-top:0;">Criar Conta para Funcionário (Setor: ${window.loggedUser.sector})</h5>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-muted);">Nome Completo</label>
                            <input id="new_fullname" placeholder="Ex: João da Silva" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; color:var(--text-main);">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-muted);">Nome de Assinatura</label>
                            <input id="new_display" placeholder="Ex: JOAO.SILVA" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; color:var(--text-main);">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-muted);">Usuário (Login)</label>
                            <input id="new_username" placeholder="Ex: joaosilva" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; color:var(--text-main);">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-muted);">Senha</label>
                            <input id="new_password" placeholder="***" type="password" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; color:var(--text-main);">
                        </div>
                    </div>
                    <button class="btn btn-save" onclick="window.createAccountByEncarregado()" style="width:100%;">Criar Conta</button>
                </div>
                
                <h5>Pendências de Solicitação</h5>
                <div id="encReqList" style="max-height:220px; overflow:auto; border:1px solid var(--border-color); padding:8px; border-radius:6px; background:var(--bg-card);"></div>
            </div>
        `;
        setTimeout(() => { if (typeof window.loadAccountRequests === 'function') window.loadAccountRequests(); }, 0);
    } else {
        const today = window.getBrazilTime ? window.getBrazilTime().split('T')[0] : new Date().toISOString().split('T')[0];
        const countToday = window.patioData ? window.patioData.filter(x => (x.chegada || '').startsWith(today)).length : 0;
        const countInYard = window.patioData ? window.patioData.filter(x => x.status !== 'SAIU').length : 0;
        const countGava = window.patioData ? window.patioData.filter(x => x.status === 'GAVA').length : 0;
        const countAlm = window.patioData ? window.patioData.filter(x => x.status === 'ALM').length : 0;
        const countOut = window.patioData ? window.patioData.filter(x => x.status === 'OUT').length : 0;

        rightColumnContent = `
            <div class="settings-card">
                <h4><i class="fas fa-chart-bar"></i> Estatísticas Operacionais do Pátio</h4>
                
                <div class="profile-stats-grid">
                    <div class="profile-stat-box" style="background: rgba(185, 28, 28, 0.05); border-color: rgba(185, 28, 28, 0.2);">
                        <h3>${countInYard}</h3>
                        <span>No Pátio Agora</span>
                    </div>
                    <div class="profile-stat-box">
                        <h3>${countToday}</h3>
                        <span>Entradas Hoje</span>
                    </div>
                </div>

                <h5 style="margin: 20px 0 10px 0; font-size: 0.9rem; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--primary);"></i> Distribuição por Setor
                </h5>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border: 1px solid var(--border-color);">
                        <span style="font-weight: 500; font-size: 0.85rem;"><i class="fas fa-warehouse" style="margin-right: 8px; color: var(--text-muted);"></i> Doca / ALM</span>
                        <span class="badge" style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">${countAlm}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border: 1px solid var(--border-color);">
                        <span style="font-weight: 500; font-size: 0.85rem;"><i class="fas fa-traffic-light" style="margin-right: 8px; color: var(--text-muted);"></i> GAVA</span>
                        <span class="badge" style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">${countGava}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border: 1px solid var(--border-color);">
                        <span style="font-weight: 500; font-size: 0.85rem;"><i class="fas fa-external-link-alt" style="margin-right: 8px; color: var(--text-muted);"></i> Outros Setores</span>
                        <span class="badge" style="background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">${countOut}</span>
                    </div>
                </div>

                <h5 style="margin: 20px 0 10px 0; font-size: 0.9rem; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fas fa-info-circle" style="color: var(--primary);"></i> Informações do Sistema
                </h5>
                <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.6; display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                    <strong>Status:</strong> <span style="color: #10b981; font-weight: 600;"><i class="fas fa-check-circle"></i> Operacional</span>
                    <strong>Último Sinc:</strong> <span>${new Date().toLocaleTimeString()}</span>
                    <strong>Setor Ativo:</strong> <span>${(window.loggedUser.sector || '').toUpperCase()}</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <input type="file" id="profilePhotoInput" accept="image/*" style="display: none;" onchange="window.uploadProfilePhoto(this)">
        <input type="file" id="profileCoverInput" accept="image/*" style="display: none;" onchange="window.uploadProfileCover(this)">

        <div class="profile-dashboard">
            <!-- COLUNA ESQUERDA: PERFIL + SENHA -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- CARD MEU PERFIL -->
                <div class="settings-card" style="position: relative; overflow: hidden; padding-top: 0;">
                    <!-- Banner de Capa -->
                    <div class="profile-cover-wrapper" id="profileCoverWrapper" onclick="document.getElementById('profileCoverInput').click()" 
                         style="height: 120px; background-size: cover; background-position: center; 
                                background-image: ${coverImage ? `url('${coverImage}')` : 'linear-gradient(135deg, #1e293b, #334155)'}; 
                                position: relative; cursor: pointer; border-bottom: 1px solid var(--border-color); width: calc(100% + 40px); margin-left: -20px; transition: all 0.2s;">
                        <div class="profile-cover-overlay">
                            <i class="fas fa-camera"></i> Alterar Capa
                        </div>
                    </div>

                    <div class="profile-avatar-wrapper" style="margin-top: -45px; z-index: 10;">
                        <div class="profile-avatar-circle" id="profileAvatarCircle" onclick="window.toggleAvatarSelector()" style="background-color: ${avatarPhoto ? 'transparent' : avatarColor}; overflow: hidden;">
                            ${avatarPhoto ? `<img src="${avatarPhoto}" style="width: 100%; height: 100%; object-fit: cover;" />` : avatarEmoji}
                            <div class="profile-avatar-badge"><i class="fas fa-camera"></i></div>
                        </div>
                        
                        <div class="avatar-selector-container" id="avatarSelectorContainer" style="display: none;">
                            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 5px;">Escolha seu Avatar</span>
                            <div class="avatar-selector-grid">
                                ${avatarSelectorHtml}
                            </div>
                            <button class="btn btn-edit" style="width: 100%; margin-top: 10px; font-size: 0.75rem; font-weight: bold; padding: 6px 12px; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="document.getElementById('profilePhotoInput').click()">
                                <i class="fas fa-upload"></i> Carregar Foto
                            </button>
                        </div>
                    </div>

                    <div class="profile-name-area">
                        <h3>${window.loggedUser.fullname || window.loggedUser.username}</h3>
                        <div class="profile-badge-group">
                            <span class="profile-badge role-${roleClass}">${window.loggedUser.role || 'Usuário'}</span>
                            <span class="profile-badge sector-badge">${window.loggedUser.sector || 'Geral'}${window.loggedUser.subType ? ' (' + window.loggedUser.subType + ')' : ''}</span>
                        </div>
                    </div>

                    <!-- PERMISSÕES -->
                    <div class="profile-permissions">
                        <h5><i class="fas fa-key"></i> Permissões Ativas</h5>
                        <div class="permission-grid">
                            ${(() => {
                                if (typeof window.resolveUserPermissions === 'function') window.resolveUserPermissions();
                                const p = window.userPermissions || {};
                                return [
                                    renderPermissionItem('Assinar Mapa Cego', p.canSignMap),
                                    renderPermissionItem('Editar Caminhão', p.canEditTruck),
                                    renderPermissionItem('Excluir Caminhão', p.canDeleteTruck),
                                    renderPermissionItem('Mover Fila', p.canMoveTruck),
                                    renderPermissionItem('Cadastros Gerais', p.canManageCatalogs),
                                    renderPermissionItem('Ver Notificações', p.canViewNotifications),
                                    renderPermissionItem('Relatórios & Dashboard', p.canViewReports)
                                ].join('');
                            })()}
                        </div>
                    </div>
                </div>

                <!-- CARD ALTERAR SENHA -->
                <div class="settings-card">
                    <h4><i class="fas fa-lock"></i> Alterar Senha</h4>
                    <div class="profile-form-group">
                        <div>
                            <label>Senha Atual</label>
                            <div class="profile-input-wrapper">
                                <i class="fas fa-key"></i>
                                <input type="password" id="profileCurrentPass" placeholder="••••••••">
                            </div>
                        </div>
                        <div>
                            <label>Nova Senha</label>
                            <div class="profile-input-wrapper">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="profileNewPass" placeholder="Mínimo 4 caracteres">
                            </div>
                        </div>
                        <div>
                            <label>Confirmar Nova Senha</label>
                            <div class="profile-input-wrapper">
                                <i class="fas fa-check-double"></i>
                                <input type="password" id="profileConfirmPass" placeholder="Repita a nova senha">
                            </div>
                        </div>
                        <button class="btn btn-save" onclick="window.changeProfilePassword()" style="margin-top: 5px; width: 100%; font-weight: 600;">
                            <i class="fas fa-save"></i> Atualizar Senha
                        </button>
                    </div>
                </div>
            </div>

            <!-- COLUNA DIREITA -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${rightColumnContent}
            </div>
        </div>
    `;
};

window.toggleAvatarSelector = function() {
    const el = document.getElementById('avatarSelectorContainer');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.selectProfileAvatar = function(emoji, color) {
    if (!window.loggedUser) return;
    
    // Update loggedUser state
    window.loggedUser.avatarEmoji = emoji;
    window.loggedUser.avatarColor = color;
    delete window.loggedUser.avatarPhoto; // remove custom photo to use emoji
    sessionStorage.setItem('loggedInUser', JSON.stringify(window.loggedUser));
    
    // Update in usersData database
    if (window.usersData) {
        let u = window.usersData.find(x => x.username.toLowerCase() === window.loggedUser.username.toLowerCase());
        if (!u) {
            u = {
                username: window.loggedUser.username,
                role: window.loggedUser.role,
                sector: window.loggedUser.sector,
                subType: window.loggedUser.subType
            };
            window.usersData.push(u);
        }
        u.avatarEmoji = emoji;
        u.avatarColor = color;
        delete u.avatarPhoto; // remove custom photo to use emoji
    }
    
    // Save
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    // Re-render
    window.renderProfileArea();
    if (typeof window.updateSidebarAvatar === 'function') window.updateSidebarAvatar();
};

window.compressImageFile = function(file, maxWidth, maxHeight, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

window.uploadProfilePhoto = async function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    try {
        const base64 = await window.compressImageFile(file, 150, 150, 0.75);
        
        window.loggedUser.avatarPhoto = base64;
        sessionStorage.setItem('loggedInUser', JSON.stringify(window.loggedUser));
        
        if (window.usersData) {
            let u = window.usersData.find(x => x.username.toLowerCase() === window.loggedUser.username.toLowerCase());
            if (!u) {
                u = {
                    username: window.loggedUser.username,
                    role: window.loggedUser.role,
                    sector: window.loggedUser.sector,
                    subType: window.loggedUser.subType
                };
                window.usersData.push(u);
            }
            u.avatarPhoto = base64;
            delete u.avatarEmoji;
            delete u.avatarColor;
        }
        
        if (typeof window.saveAll === 'function') {
            window.saveAll();
        }
        
        window.renderProfileArea();
        if (typeof window.updateSidebarAvatar === 'function') window.updateSidebarAvatar();
    } catch (err) {
        console.error("Erro ao processar foto de perfil:", err);
        alert("Erro ao processar imagem de perfil. Tente outro arquivo.");
    }
};

window.uploadProfileCover = async function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    try {
        const base64 = await window.compressImageFile(file, 600, 200, 0.75);
        
        window.loggedUser.coverImage = base64;
        sessionStorage.setItem('loggedInUser', JSON.stringify(window.loggedUser));
        
        if (window.usersData) {
            let u = window.usersData.find(x => x.username.toLowerCase() === window.loggedUser.username.toLowerCase());
            if (!u) {
                u = {
                    username: window.loggedUser.username,
                    role: window.loggedUser.role,
                    sector: window.loggedUser.sector,
                    subType: window.loggedUser.subType
                };
                window.usersData.push(u);
            }
            u.coverImage = base64;
        }
        
        if (typeof window.saveAll === 'function') {
            window.saveAll();
        }
        
        window.renderProfileArea();
    } catch (err) {
        console.error("Erro ao processar foto de capa:", err);
        alert("Erro ao processar imagem de capa. Tente outro arquivo.");
    }
};

window.updateSidebarAvatar = function() {
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    if (!sidebarAvatar) return;
    
    const user = window.loggedUser;
    if (!user) return;
    
    const u = (window.usersData || []).find(x => x.username === user.username);
    const photo = user.avatarPhoto || (u ? u.avatarPhoto : null) || null;
    const emoji = user.avatarEmoji || (u ? u.avatarEmoji : null) || '👤';
    const color = user.avatarColor || (u ? u.avatarColor : null) || '#3b82f6';
    
    if (photo) {
        sidebarAvatar.style.backgroundColor = 'transparent';
        sidebarAvatar.innerHTML = `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />`;
    } else {
        sidebarAvatar.style.backgroundColor = color;
        sidebarAvatar.innerHTML = `<span style="font-size: 1.25rem;">${emoji}</span>`;
    }
};

window.changeProfilePassword = function() {
    const currentPass = document.getElementById('profileCurrentPass').value;
    const newPass = document.getElementById('profileNewPass').value;
    const confirmPass = document.getElementById('profileConfirmPass').value;

    if (!currentPass || !newPass || !confirmPass) {
        alert('Por favor, preencha todos os campos da senha.');
        return;
    }

    if (!window.usersData) {
        alert('Erro: banco de dados de usuários não disponível.');
        return;
    }

    const u = window.usersData.find(x => x.username === window.loggedUser.username);
    if (!u) {
        alert('Erro: Usuário não encontrado no banco de dados.');
        return;
    }

    // Se o usuário tiver senha cadastrada, verifica.
    if (u.password && u.password !== currentPass) {
        alert('Senha atual incorreta.');
        return;
    }

    if (newPass.length < 4) {
        alert('A nova senha deve ter pelo menos 4 caracteres.');
        return;
    }

    if (newPass !== confirmPass) {
        alert('A confirmação da nova senha não coincide.');
        return;
    }

    u.password = newPass;
    window.loggedUser.password = newPass;
    sessionStorage.setItem('loggedInUser', JSON.stringify(window.loggedUser));
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }

    alert('Senha atualizada com sucesso!');
    document.getElementById('profileCurrentPass').value = '';
    document.getElementById('profileNewPass').value = '';
    document.getElementById('profileConfirmPass').value = '';
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
            html += `<td>${i.date ? i.date.split('-').reverse().join('/') : '---'}</td><td><span style="cursor:help; font-weight:600; color:var(--primary);" data-fullname="${i.produto}">${window.formatProductName(i.produto)}</span></td><td><span class="badge-code">${i.placa}</span></td><td><b style="color:var(--primary);">${(i.liq || 0).toLocaleString()} Kg</b></td>`;
        } else if (t === 'divergencias') {
            const diffColor = i.diff > 0 ? '#10b981' : '#ef4444';
            const signal = i.diff > 0 ? '+' : '';
            html += `<td>${i.date ? i.date.split('-').reverse().join('/') : '---'}</td><td><span style="cursor:help; font-weight:600; color:var(--primary);" data-fullname="${i.prod}">${window.formatProductName(i.prod)}</span></td><td><b>NF: ${i.nf}</b></td><td><b style="color:${diffColor}; font-size:0.95rem;">${signal}${i.diff}</b></td>`;
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
    const cadPerfisSection = document.getElementById('cadPerfisSection');
    const fab = document.querySelector('#view-cadastros .fab');

    if (cadPerfisSection) cadPerfisSection.style.display = 'none';

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

    if (type === 'perfis') {
        if (cadTable) cadTable.style.display = 'none';
        if (fab) fab.style.display = 'none';
        if (cadVincularSection) cadVincularSection.style.display = 'none';
        if (requestsList) requestsList.style.display = 'none';
        if (cadPerfisSection) {
            cadPerfisSection.style.display = 'block';
            window.renderPerfisDashboard();
        }
        return;
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

window.currentProductView = 'table';

window.switchProductView = function(view) {
    window.currentProductView = view;
    
    const btnTable = document.getElementById('btnViewTable');
    const btnCards = document.getElementById('btnViewCards');
    const tableContainer = document.getElementById('prodViewTableContainer');
    const gridContainer = document.getElementById('prodViewGridContainer');
    
    if (view === 'table') {
        if (btnTable) btnTable.classList.add('active');
        if (btnCards) btnCards.classList.remove('active');
        if (tableContainer) tableContainer.style.display = 'block';
        if (gridContainer) gridContainer.style.display = 'none';
    } else {
        if (btnTable) btnTable.classList.remove('active');
        if (btnCards) btnCards.classList.add('active');
        if (tableContainer) tableContainer.style.display = 'none';
        if (gridContainer) gridContainer.style.display = 'grid';
    }
    
    window.renderProductsView();
};

window.productPageSize = 25;
window.productCurrentPage = 1;

window.changeProductPageSize = function(val) {
    if (val === 'all') {
        window.productPageSize = -1;
    } else {
        window.productPageSize = parseInt(val) || 25;
    }
    window.productCurrentPage = 1;
    window.renderProductsView();
};

window.setProductPage = function(page) {
    window.productCurrentPage = page;
    window.renderProductsView();
};

window.renderProductsView = function() {
    const body = document.getElementById('prodViewBody');
    const grid = document.getElementById('prodViewGridContainer');
    const paginationContainer = document.getElementById('prodPaginationButtons');
    const term = document.getElementById('prodViewSearch')?.value.toUpperCase() || '';
    if(!body) return;

    // Filter products
    const filtered = window.productsData.filter(p => p.nome.toUpperCase().includes(term));

    // Update Catalog Stats
    const totalProducts = window.productsData.length;
    let totalCargas = 0;
    let mostFreqProduct = '---';
    let maxCargas = -1;
    
    window.productsData.forEach(p => {
        const count = parseInt(p.cargasCount) || 0;
        totalCargas += count;
        if (count > maxCargas) {
            maxCargas = count;
            mostFreqProduct = p.nome;
        }
    });
    
    const elTotal = document.getElementById('prodStatTotal');
    const elCargas = document.getElementById('prodStatCargas');
    const elFrequente = document.getElementById('prodStatFrequente');
    
    if (elTotal) elTotal.innerText = totalProducts;
    if (elCargas) elCargas.innerText = totalCargas;
    if (elFrequente) {
        elFrequente.innerText = maxCargas > 0 ? window.formatProductName(mostFreqProduct) : '---';
        if (maxCargas > 0) {
            elFrequente.setAttribute('data-fullname', mostFreqProduct);
            elFrequente.style.cursor = 'help';
        } else {
            elFrequente.removeAttribute('data-fullname');
            elFrequente.style.cursor = 'default';
        }
    }

    // Apply Pagination
    const pageSize = window.productPageSize || 25;
    const totalItems = filtered.length;
    let totalPages = 1;
    let paginated = filtered;
    
    if (pageSize !== -1) {
        totalPages = Math.ceil(totalItems / pageSize) || 1;
        if (window.productCurrentPage > totalPages) {
            window.productCurrentPage = totalPages;
        }
        if (window.productCurrentPage < 1) {
            window.productCurrentPage = 1;
        }
        const startIdx = (window.productCurrentPage - 1) * pageSize;
        paginated = filtered.slice(startIdx, startIdx + pageSize);
    } else {
        window.productCurrentPage = 1;
    }

    // Render Table View
    body.innerHTML = paginated.map(p => `
        <tr>
            <td><b style="color:var(--primary); font-family:monospace;">${p.codigo || '---'}</b></td>
            <td><span style="cursor:help; font-weight:600; color:var(--text-main);" data-fullname="${p.nome}">${window.formatProductName(p.nome)}</span></td>
            <td><b>${p.cargasCount || 0}</b></td>
            <td>${p.lastSupplier || '---'}</td>
            <td>
                <button class="btn btn-save btn-small" onclick="window.openCadModal('produto','${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-remove" onclick="window.deleteCad('produto', '${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // Render Grid View
    if (grid) {
        grid.innerHTML = paginated.map(p => `
            <div class="prod-card">
                <div class="prod-card-header">
                    <span class="prod-sku-badge">SKU: ${p.codigo || 'S/C'}</span>
                </div>
                <div class="prod-card-body">
                    <h4 class="prod-card-title" style="cursor:help;" data-fullname="${p.nome}">${window.formatProductName(p.nome)}</h4>
                    <div class="prod-card-stats">
                        <div class="prod-card-stat-row">
                            <span class="prod-card-stat-label">Cargas Recebidas:</span>
                            <span class="prod-card-stat-val">${p.cargasCount || 0}</span>
                        </div>
                        <div class="prod-card-stat-row">
                            <span class="prod-card-stat-label">Último Fornecedor:</span>
                            <span class="prod-card-stat-val">${p.lastSupplier || '---'}</span>
                        </div>
                    </div>
                    <div class="prod-card-actions">
                        <button class="btn-prod-action btn-prod-edit" onclick="window.openCadModal('produto','${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-prod-action btn-prod-del" onclick="window.deleteCad('produto', '${p.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render Pagination Controls
    if (paginationContainer) {
        if (pageSize === -1 || totalPages <= 1) {
            paginationContainer.innerHTML = '';
        } else {
            let html = '';
            
            // First Page & Previous Page buttons
            html += `<button class="page-btn" ${window.productCurrentPage === 1 ? 'disabled' : ''} onclick="window.setProductPage(1)" title="Primeira Página"><i class="fas fa-angle-double-left"></i></button>`;
            html += `<button class="page-btn" ${window.productCurrentPage === 1 ? 'disabled' : ''} onclick="window.setProductPage(${window.productCurrentPage - 1})" title="Página Anterior"><i class="fas fa-angle-left"></i></button>`;
            
            // Dynamic page buttons (show current page, and up to 2 pages before and after)
            const range = 2;
            let startPage = Math.max(1, window.productCurrentPage - range);
            let endPage = Math.min(totalPages, window.productCurrentPage + range);
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="window.setProductPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
            }
            
            for (let page = startPage; page <= endPage; page++) {
                html += `<button class="page-btn ${window.productCurrentPage === page ? 'active' : ''}" onclick="window.setProductPage(${page})">${page}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
                html += `<button class="page-btn" onclick="window.setProductPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Next Page & Last Page buttons
            html += `<button class="page-btn" ${window.productCurrentPage === totalPages ? 'disabled' : ''} onclick="window.setProductPage(${window.productCurrentPage + 1})" title="Próxima Página"><i class="fas fa-angle-right"></i></button>`;
            html += `<button class="page-btn" ${window.productCurrentPage === totalPages ? 'disabled' : ''} onclick="window.setProductPage(${totalPages})" title="Última Página"><i class="fas fa-angle-double-right"></i></button>`;
            
            paginationContainer.innerHTML = html;
        }
    }
};

window.openEditProduct = function(id) {
    window.openCadModal('produto', id);
};

window.renderRequests = function() {
    if (!(window.isRecebimento || window.isAdmin)) return;
    const list = document.getElementById('reqList');
    const historyList = document.getElementById('historyList');
    const badge = document.getElementById('badgeNotif');
    if (!list) return;
    
    const pending = window.requests.filter(r => r.status === 'PENDENTE');
    if (badge) badge.innerText = pending.length;
    
    // Render Pending Requests
    if (pending.length === 0) {
        list.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">Nenhuma requisição pendente.</p>';
    } else {
        list.innerHTML = pending.map(req => {
            let detailsHtml = '';
            if (req.type === 'edit') {
                detailsHtml = 'Solicitação de liberação de edição para Mapa Cego bloqueado.';
            } else if (req.data) {
                const parts = [];
                // Suporte aos formatos antigo e novo de dados
                const isFornNew = req.data.fornecedor?.isNew || (req.data.supplier && !req.data.supplier.id);
                const isCarrNew = (req.data.transportadora?.isNew && req.data.transportadora?.active) || (req.data.carrier && !req.data.carrier.id && req.data.carrier.name);
                const isMotNew = req.data.motorista?.isNew || (req.data.driver && !req.data.driver.id);
                const isPlacaNew = req.data.placa?.isNew || (req.data.plate && !req.data.plate.id);
                
                if (isFornNew) parts.push('Fornecedor');
                if (isCarrNew) parts.push('Transportadora');
                if (isMotNew) parts.push('Motorista');
                if (isPlacaNew) parts.push('Placa');
                
                detailsHtml = parts.length > 0 
                    ? `Cadastros Pendentes: <span style="color:#d97706; font-weight:600;">${parts.join(', ')}</span>`
                    : 'Entrada de veículo com dados pré-cadastrados.';
            } else {
                detailsHtml = 'Requisição de aprovação.';
            }
            
            return `
                <div class="notification-item" style="border-left: 4px solid #f59e0b; margin-bottom:12px; padding:16px; background:var(--bg-card); border-radius:12px; box-shadow:var(--shadow-md); transition:transform 0.2s ease; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="font-size:0.85rem; color:var(--primary); text-transform:uppercase;"><i class="fas fa-bell"></i> ${(req.type || '').replace('_', ' ')}</b>
                        <small style="color:#888; font-weight:500;"><i class="far fa-clock"></i> ${req.timestamp ? req.timestamp.slice(11, 16) + ' ' + req.timestamp.slice(8, 10) + '/' + req.timestamp.slice(5, 7) : '--:--'}</small>
                    </div>
                    <div style="font-size:0.9rem; color:var(--text-main); margin-top:2px;">
                        Solicitado por: <b>${req.requester || req.user || '---'}</b>
                    </div>
                    <p style="margin:0; font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${detailsHtml}</p>
                    <button class="btn btn-save btn-small" style="width:100%; font-weight:700; margin-top:5px; border-radius:8px;" onclick="window.openUnifiedApproval('${req.id}')">
                        <i class="fas fa-clipboard-check"></i> Analisar e Aprovar
                    </button>
                </div>
            `;
        }).join('');
    }

    // Render Resolved Request History
    if (historyList) {
        const resolved = window.requests.filter(r => r.status !== 'PENDENTE').slice(-30).reverse(); // Últimos 30 resolvidos
        if (resolved.length === 0) {
            historyList.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">Nenhum histórico de requisição.</p>';
        } else {
            historyList.innerHTML = resolved.map(req => {
                const isApproved = req.status === 'approved' || req.status === 'APROVADO';
                const statusLabel = isApproved ? 'APROVADO' : 'REJEITADO';
                const borderStyle = isApproved ? 'border-left: 4px solid #10b981;' : 'border-left: 4px solid #ef4444;';
                const icon = isApproved 
                    ? '<i class="fas fa-check-circle" style="color:#10b981;"></i>' 
                    : '<i class="fas fa-times-circle" style="color:#ef4444;"></i>';
                
                let detailsText = '';
                if (req.type === 'edit') {
                    detailsText = `Edição de Mapa Cego.`;
                } else if (req.data) {
                    const parts = [];
                    const isFornNew = req.data.fornecedor?.isNew || (req.data.supplier && !req.data.supplier.id);
                    const isCarrNew = (req.data.transportadora?.isNew && req.data.transportadora?.active) || (req.data.carrier && !req.data.carrier.id && req.data.carrier.name);
                    const isMotNew = req.data.motorista?.isNew || (req.data.driver && !req.data.driver.id);
                    const isPlacaNew = req.data.placa?.isNew || (req.data.plate && !req.data.plate.id);
                    
                    if (isFornNew) parts.push('Forn');
                    if (isCarrNew) parts.push('Transp');
                    if (isMotNew) parts.push('Mot');
                    if (isPlacaNew) parts.push('Placa');
                    
                    detailsText = parts.length > 0 ? `Entrada com Novos Cadastros: ${parts.join(', ')}` : 'Entrada de Veículo';
                } else {
                    detailsText = req.type || 'Requisição Geral';
                }
                
                return `
                    <div class="notification-item" style="${borderStyle} margin-bottom:10px; padding:12px; background:var(--bg-card); border-radius:8px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:bold; font-size:0.8rem; display:flex; align-items:center; gap:6px; text-transform:uppercase;">
                                ${icon} ${(req.type || '').replace('_', ' ')}
                            </span>
                            <span style="font-size:0.75rem; background:rgba(0,0,0,0.04); color:var(--text-muted); padding:2px 6px; border-radius:10px; font-weight:bold;">${statusLabel}</span>
                        </div>
                        <p style="margin:2px 0; font-size:0.85rem; color:var(--text-muted);">${detailsText}</p>
                        <small style="color:#888; font-size:0.75rem;"><i class="far fa-clock"></i> Solicitante: <b>${req.requester || req.user || '---'}</b></small>
                    </div>
                `;
            }).join('');
        }
    }
};

window.openUnifiedApproval = function(id) {
    if (!(window.isRecebimento || window.isAdmin)) {
        alert("Acesso negado: Apenas o Recebimento e Administradores podem analisar ou aprovar requisições.");
        return;
    }
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
    if (!(window.isRecebimento || window.isAdmin)) {
        alert("Acesso negado: Apenas o Recebimento e Administradores podem excluir informações.");
        return;
    }
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

// =========================================================
// CONTROLES DE PERFIS E GRUPOS DE ACESSO (APENAS ADMIN V2)
// =========================================================

function getActiveContainer() {
    return document.getElementById('adminPanelContainer');
}

window.activeAdminSubmenu = 'funcionarios';
window.activeMatrixTab = 'users';

window.switchAdminSubmenu = function(submenuName, button) {
    window.activeAdminSubmenu = submenuName;
    
    // Manage active state on buttons
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
        sidebar.querySelectorAll('.admin-menu-btn').forEach(btn => btn.classList.remove('active'));
    }
    if (button) {
        button.classList.add('active');
    } else {
        // Fallback search
        const btnIdMap = {
            'funcionarios': 'btnAdminSubFunc',
            'grupos': 'btnAdminSubGrupos',
            'permissoes': 'btnAdminSubPerms'
        };
        const activeBtn = document.getElementById(btnIdMap[submenuName]);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    window.renderAdminDashboard();
};

window.renderPerfisDashboard = function() {
    window.renderAdminDashboard();
};

window.renderAdminDashboard = function() {
    const container = document.getElementById('adminPanelContainer');
    if (!container) return;

    const groups = window.groupsData || [];
    const dbUsers = window.usersData || [];

    const permissionDefinitions = [
        { key: 'canSignMap', label: 'Assinar Mapa Cego', desc: 'Assinar notas fiscais e conferências' },
        { key: 'canEditTruck', label: 'Editar Caminhão', desc: 'Editar pátio, MP e carregamento' },
        { key: 'canDeleteTruck', label: 'Excluir Caminhão', desc: 'Remover pátio, MP e carregamento' },
        { key: 'canMoveTruck', label: 'Mover Caminhão na Fila', desc: 'Reordenar e movimentar cards de setor' },
        { key: 'canManageCatalogs', label: 'Gerenciar Cadastros', desc: 'Inserir/editar/deletar catalogos gerais' },
        { key: 'canViewNotifications', label: 'Ver Notificações', desc: 'Acessar tela de notificações e badges' },
        { key: 'canViewReports', label: 'Visualizar Relatórios', desc: 'Visualizar relatórios e dashboard' },
        { key: 'showMenuPatio', label: 'Menu: Pátio', desc: 'Exibir Controle de Pátio no menu lateral' },
        { key: 'showMenuMapas', label: 'Menu: Mapas Cegos', desc: 'Exibir Mapas Cegos no menu lateral' },
        { key: 'showMenuMateriaPrima', label: 'Menu: Pesagem', desc: 'Exibir Pesagem (Matéria-Prima) no menu lateral' },
        { key: 'showMenuCarregamento', label: 'Menu: Carregamento', desc: 'Exibir Carregamento no menu lateral' },
        { key: 'showMenuRelatorios', label: 'Menu: Relatórios', desc: 'Exibir Relatórios no menu lateral' },
        { key: 'showMenuDashboard', label: 'Menu: Dashboard', desc: 'Exibir Dashboard no menu lateral' },
        { key: 'showMenuCadastros', label: 'Menu: Cadastros', desc: 'Exibir Cadastros Gerais no menu lateral' },
        { key: 'showMenuProdutos', label: 'Menu: Produtos', desc: 'Exibir Catálogo de Produtos no menu lateral' },
        { key: 'showMenuNotif', label: 'Menu: Notificações', desc: 'Exibir Notificações no menu lateral' },
        { key: 'showMenuChat', label: 'Menu: Chat', desc: 'Exibir Chat no menu lateral' }
    ];

    if (window.activeAdminSubmenu === 'funcionarios') {
        container.innerHTML = `
            <div class="perfis-grid" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; width: 100%;">
                <!-- COLUNA 1: LISTA DE USUÁRIOS -->
                <div class="perfis-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 15px;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-user-cog"></i> Usuários Cadastrados</h4>
                    
                    <div style="position: relative;">
                        <input type="text" id="userSearchInput" class="form-input-styled" style="width: 100%; padding: 8px 10px 8px 30px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main);" placeholder="Buscar usuário..." oninput="window.filterUsersList(this.value)">
                        <i class="fas fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
                    </div>

                    <div id="users_list_container" style="flex: 1; overflow-y: auto; max-height: 500px; display: flex; flex-direction: column; gap: 8px;">
                        <!-- Usuários injetados aqui -->
                    </div>
                </div>

                <!-- COLUNA 2: FORMULÁRIO -->
                <div class="perfis-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 15px;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;" id="userFormTitle"><i class="fas fa-user-plus"></i> Novo Usuário</h4>
                    <div id="userFormContainer" style="display: flex; flex-direction: column; gap: 12px;">
                        <input type="hidden" id="editUserId" value="">
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Nome de Usuário (Login)</label>
                                <input type="text" id="userUsernameInput" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);" placeholder="Ex: joao">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Senha</label>
                                <input type="password" id="userPasswordInput" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);" placeholder="Senha">
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Grupo de Acesso (Herança)</label>
                            <select id="userGroupSelect" onchange="window.toggleUserPermissionsEdit(this.value)" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                <option value="">Sem Grupo (Permissões Manuais)</option>
                            </select>
                        </div>

                        <!-- Campos Manuais -->
                        <div id="manualPermissionsArea" style="display: block;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                <div>
                                    <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Função (Role)</label>
                                    <select id="userRoleSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                        <option value="user">User</option>
                                        <option value="Encarregado">Encarregado</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Setor (Sector)</label>
                                    <select id="userSectorSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                        <option value="conferente">Conferente</option>
                                        <option value="recebimento">Recebimento</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Subtipo (SubType)</label>
                                <select id="userSubTypeSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                    <option value="">Nenhum (Geral)</option>
                                    <option value="ALM">ALM (Doca/Almoxarifado)</option>
                                    <option value="GAVA">GAVA (Portaria Gava)</option>
                                    <option value="INFRA">INFRA (Infraestrutura)</option>
                                    <option value="MANUT">MANUT (Manutenção)</option>
                                    <option value="OUT">OUTROS</option>
                                </select>
                            </div>

                            <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 6px; display: block; color: var(--text-main);">Permissões Manuais</label>
                            <div class="perm-switch-grid">
                                ${permissionDefinitions.map(p => `
                                    <div class="perm-switch-card">
                                        <div class="perm-switch-info">
                                            <span class="perm-switch-title">${p.label}</span>
                                            <span class="perm-switch-desc">${p.desc}</span>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" class="perm-checkbox" data-perm="${p.key}">
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Aviso de Herança -->
                        <div id="groupInheritanceNotice" style="display: none; padding: 12px; background: rgba(185, 28, 28, 0.05); border-radius: 8px; border: 1px solid rgba(185, 28, 28, 0.15); color: var(--primary); font-size: 0.8rem; line-height: 1.4;">
                            <i class="fas fa-info-circle"></i> Este usuário herdará as permissões do grupo selecionado. As configurações manuais de acesso estão desabilitadas.
                        </div>

                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            <button onclick="window.saveUser()" class="btn btn-save" style="flex: 1; padding: 10px; font-weight: bold;"><i class="fas fa-save"></i> Salvar Usuário</button>
                            <button onclick="window.clearUserForm()" class="btn" style="padding: 10px; background: #94a3b8; color: white;"><i class="fas fa-times"></i> Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Populate Group Select in User form
        const userGroupSelect = container.querySelector('#userGroupSelect');
        if (userGroupSelect) {
            userGroupSelect.innerHTML = '<option value="">Sem Grupo (Permissões Manuais)</option>';
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = `${g.name} (${g.role}/${g.sector}/${g.subType || 'Geral'})`;
                userGroupSelect.appendChild(opt);
            });
        }

        // Render Users List
        const defaultUsers = [
            { username: 'Admin', role: 'admin', sector: 'recebimento', subType: null },
            { username: 'Caio', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Balanca', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Recebimento', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Wayner', role: 'user', sector: 'conferente', subType: 'INFRA' },
            { username: 'Manutencao', role: 'user', sector: 'conferente', subType: 'MANUT' },
            { username: 'Fabricio', role: 'user', sector: 'conferente', subType: 'ALM' },
            { username: 'Clodoaldo', role: 'user', sector: 'conferente', subType: 'ALM' },
            { username: 'Guilherme', role: 'user', sector: 'conferente', subType: 'GAVA' },
            { username: 'EncarRec', role: 'Encarregado', sector: 'recebimento', subType: null },
            { username: 'EncarConf', role: 'Encarregado', sector: 'conferente', subType: null }
        ];

        const allDisplayUsers = defaultUsers.map(du => {
            const custom = dbUsers.find(u => u.username.toLowerCase() === du.username.toLowerCase());
            return custom ? { ...du, ...custom, isDefault: true } : { ...du, password: '123', isDefault: true };
        });

        dbUsers.forEach(u => {
            if (!allDisplayUsers.find(du => du.username.toLowerCase() === u.username.toLowerCase())) {
                allDisplayUsers.push({ ...u, isDefault: false });
            }
        });

        const usersList = container.querySelector('#users_list_container');
        if (usersList) {
            usersList.innerHTML = allDisplayUsers.map(u => {
                let badgeText = u.isDefault ? 'Padrão' : 'Customizado';
                let badgeColor = u.isDefault ? 'var(--text-muted)' : 'var(--primary)';
                
                const hasOverride = !u.isDefault || dbUsers.some(dbu => dbu.username.toLowerCase() === u.username.toLowerCase());
                if (hasOverride && u.isDefault) {
                    badgeText = 'Padrão (Alterado)';
                    badgeColor = '#d97706';
                }

                let resolvedRole = u.role;
                let resolvedSector = u.sector;
                let resolvedSubType = u.subType || 'Nenhum';
                let grpLabel = 'Sem Grupo';

                if (u.group) {
                    const grp = groups.find(g => g.id === u.group || g.name === u.group);
                    if (grp) {
                        resolvedRole = grp.role;
                        resolvedSector = grp.sector;
                        resolvedSubType = grp.subType || 'Nenhum';
                        grpLabel = `<span style="color:var(--primary); font-weight:bold;">${grp.name}</span>`;
                    }
                }

                return `
                    <div class="user-list-item" data-username="${u.username}" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px; font-size:0.85rem; box-shadow: var(--shadow-sm);">
                        <div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-weight:bold; color:var(--text-main); font-size:0.95rem;">${u.username}</span>
                                <span style="font-size:0.65rem; background:${badgeColor}; color:white; padding:1px 6px; border-radius:10px; font-weight:bold;">${badgeText}</span>
                            </div>
                            <div style="color:var(--text-muted); font-size:0.75rem; margin-top:4px;">
                                <span>Grupo: <b>${grpLabel}</b></span> | 
                                <span>Role: <b>${resolvedRole}</b></span> | 
                                <span>Setor: <b>${resolvedSector}</b></span> | 
                                <span>Sub: <b>${resolvedSubType}</b></span>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window.editUser('${u.username}')" class="btn btn-save btn-small" style="padding:6px 10px;" title="Editar"><i class="fas fa-edit"></i></button>
                            ${u.isDefault ? 
                                (hasOverride ? `<button onclick="window.deleteUser('${u.username}')" class="btn-icon-remove" style="padding:6px 10px; background:#fef3c7; color:#d97706;" title="Restaurar Padrão"><i class="fas fa-undo"></i></button>` : '') 
                                : `<button onclick="window.deleteUser('${u.username}')" class="btn-icon-remove" style="padding:6px 10px;" title="Excluir"><i class="fas fa-trash"></i></button>`
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }
    } 
    else if (window.activeAdminSubmenu === 'grupos') {
        container.innerHTML = `
            <div class="perfis-grid" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; width: 100%;">
                <!-- COLUNA 1: LISTA DE GRUPOS -->
                <div class="perfis-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 15px;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-users"></i> Grupos de Acesso</h4>
                    <div id="groups_list_container" style="flex: 1; overflow-y: auto; max-height: 500px; display: flex; flex-direction: column; gap: 8px;">
                        <!-- Lista de grupos injetada -->
                    </div>
                </div>

                <!-- COLUNA 2: FORMULÁRIO -->
                <div class="perfis-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 15px;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;" id="groupFormTitle"><i class="fas fa-users-cog"></i> Novo Grupo</h4>
                    <div id="groupFormContainer" style="display: flex; flex-direction: column; gap: 12px;">
                        <input type="hidden" id="editGroupId" value="">
                        <div>
                            <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Nome do Grupo</label>
                            <input type="text" id="groupNameInput" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);" placeholder="Ex: Almoxarifado">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Função (Role)</label>
                                <select id="groupRoleSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                    <option value="user">User</option>
                                    <option value="Encarregado">Encarregado</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Setor (Sector)</label>
                                <select id="groupSectorSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                    <option value="conferente">Conferente</option>
                                    <option value="recebimento">Recebimento</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px; display: block; color: var(--text-main);">Subtipo (SubType)</label>
                            <select id="groupSubTypeSelect" class="form-input-styled" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color);">
                                <option value="">Nenhum (Geral)</option>
                                <option value="ALM">ALM (Doca/Almoxarifado)</option>
                                <option value="GAVA">GAVA (Portaria Gava)</option>
                                <option value="INFRA">INFRA (Infraestrutura)</option>
                                <option value="MANUT">MANUT (Manutenção)</option>
                                <option value="OUT">OUTROS</option>
                            </select>
                        </div>

                        <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 6px; display: block; color: var(--text-main);">Permissões do Grupo</label>
                        <div class="perm-switch-grid">
                            ${permissionDefinitions.map(p => `
                                <div class="perm-switch-card">
                                    <div class="perm-switch-info">
                                        <span class="perm-switch-title">${p.label}</span>
                                        <span class="perm-switch-desc">${p.desc}</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" class="perm-checkbox" data-perm="${p.key}">
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>

                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            <button onclick="window.saveGroup()" class="btn btn-save" style="flex: 1; padding: 10px; font-weight: bold;"><i class="fas fa-save"></i> Salvar Grupo</button>
                            <button onclick="window.clearGroupForm()" class="btn" style="padding: 10px; background: #94a3b8; color: white;"><i class="fas fa-times"></i> Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const groupsList = container.querySelector('#groups_list_container');
        if (groupsList) {
            groupsList.innerHTML = groups.map(g => {
                const subName = g.subType || 'Nenhum';
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px; font-size:0.85rem; box-shadow: var(--shadow-sm);">
                        <div>
                            <span style="font-weight:bold; color:var(--text-main); font-size:0.95rem;">${g.name}</span>
                            <div style="color:var(--text-muted); font-size:0.75rem; margin-top:4px;">
                                <span>Função: <b>${g.role}</b></span> | 
                                <span>Setor: <b>${g.sector}</b></span> | 
                                <span>Sub: <b>${subName}</b></span>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window.editGroup('${g.id}')" class="btn btn-save btn-small" style="padding:6px 10px;" title="Editar"><i class="fas fa-edit"></i></button>
                            <button onclick="window.deleteGroup('${g.id}')" class="btn-icon-remove" style="padding:6px 10px;" title="Excluir"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('') || '<div style="color:#999; text-align:center; padding:10px; font-size:0.85rem;">Nenhum grupo cadastrado</div>';
        }
    } 
    else if (window.activeAdminSubmenu === 'permissoes') {
        container.innerHTML = `
            <div class="perfis-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 15px; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-shield-alt"></i> Visão Geral de Permissões</h4>
                    <div class="matrix-tabs-bar">
                        <button id="btnMatrixTabUsers" class="matrix-tab-btn ${window.activeMatrixTab === 'users' ? 'active' : ''}" onclick="window.switchMatrixTab('users')">Usuários</button>
                        <button id="btnMatrixTabGroups" class="matrix-tab-btn ${window.activeMatrixTab === 'groups' ? 'active' : ''}" onclick="window.switchMatrixTab('groups')">Grupos de Acesso</button>
                    </div>
                </div>
                
                <div id="matrixTableContainer" class="matrix-table-wrapper">
                    <!-- Tabela Matricial Renderizada via JS -->
                </div>
            </div>
        `;
        window.renderPermissionsMatrix();
    }
};

window.filterUsersList = function(searchTerm) {
    const container = document.getElementById('users_list_container');
    if (!container) return;
    const items = container.querySelectorAll('.user-list-item');
    const term = searchTerm.toLowerCase();
    items.forEach(item => {
        const username = item.getAttribute('data-username').toLowerCase();
        if (username.includes(term)) {
            item.style.setProperty('display', 'flex', 'important');
        } else {
            item.style.setProperty('display', 'none', 'important');
        }
    });
};

window.switchMatrixTab = function(tab) {
    window.activeMatrixTab = tab;
    const btnU = document.getElementById('btnMatrixTabUsers');
    const btnG = document.getElementById('btnMatrixTabGroups');
    if (btnU && btnG) {
        if (tab === 'users') {
            btnU.classList.add('active');
            btnG.classList.remove('active');
        } else {
            btnU.classList.remove('active');
            btnG.classList.add('active');
        }
    }
    window.renderPermissionsMatrix();
};

window.renderPermissionsMatrix = function() {
    const container = document.getElementById('matrixTableContainer');
    if (!container) return;

    const groups = window.groupsData || [];
    const dbUsers = window.usersData || [];
    const defaultUsers = [
        { username: 'Admin', role: 'admin', sector: 'recebimento', subType: null },
        { username: 'Caio', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Balanca', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Recebimento', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Wayner', role: 'user', sector: 'conferente', subType: 'INFRA' },
        { username: 'Manutencao', role: 'user', sector: 'conferente', subType: 'MANUT' },
        { username: 'Fabricio', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Clodoaldo', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Guilherme', role: 'user', sector: 'conferente', subType: 'GAVA' },
        { username: 'EncarRec', role: 'Encarregado', sector: 'recebimento', subType: null },
        { username: 'EncarConf', role: 'Encarregado', sector: 'conferente', subType: null }
    ];

    const permissionCols = [
        { label: 'Assinar Mapa', key: 'canSignMap' },
        { label: 'Editar Veículo', key: 'canEditTruck' },
        { label: 'Excluir Veículo', key: 'canDeleteTruck' },
        { label: 'Mover Fila', key: 'canMoveTruck' },
        { label: 'Cadastros', key: 'canManageCatalogs' },
        { label: 'Notificações', key: 'canViewNotifications' },
        { label: 'Relatórios', key: 'canViewReports' },
        { label: 'Menu: Pátio', key: 'showMenuPatio' },
        { label: 'Menu: Mapas', key: 'showMenuMapas' },
        { label: 'Menu: Pesagem', key: 'showMenuMateriaPrima' },
        { label: 'Menu: Carreg.', key: 'showMenuCarregamento' },
        { label: 'Menu: Relat.', key: 'showMenuRelatorios' },
        { label: 'Menu: Dash', key: 'showMenuDashboard' },
        { label: 'Menu: Cadastros', key: 'showMenuCadastros' },
        { label: 'Menu: Produtos', key: 'showMenuProdutos' },
        { label: 'Menu: Notif.', key: 'showMenuNotif' },
        { label: 'Menu: Chat', key: 'showMenuChat' }
    ];

    let headersHtml = `<th>Nome / Descrição</th>`;
    permissionCols.forEach(col => {
        headersHtml += `<th style="text-align: center;">${col.label}</th>`;
    });

    let rowsHtml = '';

    if (window.activeMatrixTab === 'groups') {
        if (groups.length === 0) {
            rowsHtml = `<tr><td colspan="${permissionCols.length + 1}" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum grupo cadastrado</td></tr>`;
        } else {
            groups.forEach(g => {
                const perms = g.permissions || {};
                let cells = `<td><strong>${g.name}</strong> <span style="font-size: 0.7rem; color: var(--text-muted); display:block; margin-top:2px;">${g.role} / ${g.sector}</span></td>`;
                permissionCols.forEach(col => {
                    const isAllowed = !!perms[col.key];
                    const badgeClass = isAllowed ? 'perm-badge-allow' : 'perm-badge-deny';
                    const icon = isAllowed ? '<i class="fas fa-check"></i> Sim' : '<i class="fas fa-times"></i> Não';
                    cells += `<td style="text-align: center;"><span class="perm-badge ${badgeClass}">${icon}</span></td>`;
                });
                rowsHtml += `<tr>${cells}</tr>`;
            });
        }
    } else {
        const allUsers = defaultUsers.map(du => {
            const custom = dbUsers.find(u => u.username.toLowerCase() === du.username.toLowerCase());
            return custom ? { ...du, ...custom } : du;
        });
        dbUsers.forEach(u => {
            if (!allUsers.some(du => du.username.toLowerCase() === u.username.toLowerCase())) {
                allUsers.push(u);
            }
        });

        allUsers.forEach(u => {
            const prevLogged = window.loggedUser;
            window.loggedUser = u;
            window.resolveUserPermissions();
            const resolved = { ...window.userPermissions };
            window.loggedUser = prevLogged;
            if (prevLogged) window.resolveUserPermissions();

            let cells = `<td><strong>${u.username}</strong> <span style="font-size: 0.7rem; color: var(--text-muted); display:block; margin-top:2px;">${u.group ? 'Grupo: ' + u.group : 'Manual / Default'}</span></td>`;
            permissionCols.forEach(col => {
                const isAllowed = resolved[col.key];
                const badgeClass = isAllowed ? 'perm-badge-allow' : 'perm-badge-deny';
                const icon = isAllowed ? '<i class="fas fa-check"></i> Sim' : '<i class="fas fa-times"></i> Não';
                cells += `<td style="text-align: center;"><span class="perm-badge ${badgeClass}">${icon}</span></td>`;
            });
            rowsHtml += `<tr>${cells}</tr>`;
        });
    }

    container.innerHTML = `
        <table class="matrix-table">
            <thead>
                <tr>${headersHtml}</tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
};

window.toggleUserPermissionsEdit = function(groupId) {
    const container = getActiveContainer();
    const manualArea = container?.querySelector('#manualPermissionsArea');
    const noticeArea = container?.querySelector('#groupInheritanceNotice');
    if (!manualArea || !noticeArea) return;

    if (groupId) {
        manualArea.style.display = 'none';
        noticeArea.style.display = 'block';
    } else {
        manualArea.style.display = 'block';
        noticeArea.style.display = 'none';
    }
};

window.clearGroupForm = function() {
    const container = getActiveContainer();
    const editGroupId = container?.querySelector('#editGroupId');
    const nameIn = container?.querySelector('#groupNameInput');
    const roleSel = container?.querySelector('#groupRoleSelect');
    const sectorSel = container?.querySelector('#groupSectorSelect');
    const subSel = container?.querySelector('#groupSubTypeSelect');
    const title = container?.querySelector('#groupFormTitle');

    if (editGroupId) editGroupId.value = '';
    if (nameIn) nameIn.value = '';
    if (roleSel) roleSel.value = 'user';
    if (sectorSel) sectorSel.value = 'conferente';
    if (subSel) subSel.value = '';
    if (title) title.innerHTML = `<i class="fas fa-users-cog"></i> Novo Grupo`;

    container?.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);
};

window.clearUserForm = function() {
    const container = getActiveContainer();
    const editUserId = container?.querySelector('#editUserId');
    const userIn = container?.querySelector('#userUsernameInput');
    const passIn = container?.querySelector('#userPasswordInput');
    const grpSel = container?.querySelector('#userGroupSelect');
    const roleSel = container?.querySelector('#userRoleSelect');
    const sectorSel = container?.querySelector('#userSectorSelect');
    const subSel = container?.querySelector('#userSubTypeSelect');
    const title = container?.querySelector('#userFormTitle');

    if (editUserId) editUserId.value = '';
    if (userIn) {
        userIn.value = '';
        userIn.readOnly = false;
    }
    if (passIn) passIn.value = '';
    if (grpSel) grpSel.value = '';
    if (roleSel) roleSel.value = 'user';
    if (sectorSel) sectorSel.value = 'conferente';
    if (subSel) subSel.value = '';
    if (title) title.innerHTML = `<i class="fas fa-user-plus"></i> Novo Usuário`;

    container?.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);
    window.toggleUserPermissionsEdit('');
};

window.saveGroup = function() {
    const container = getActiveContainer();
    const editGroupId = container?.querySelector('#editGroupId')?.value;
    const nameVal = container?.querySelector('#groupNameInput')?.value.trim();
    const roleVal = container?.querySelector('#groupRoleSelect')?.value;
    const sectorVal = container?.querySelector('#groupSectorSelect')?.value;
    const subVal = container?.querySelector('#groupSubTypeSelect')?.value || null;

    if (!nameVal) {
        alert("O nome do grupo é obrigatório.");
        return;
    }

    const permissions = {};
    container.querySelectorAll('.perm-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-perm');
        permissions[key] = cb.checked;
    });

    if (!window.groupsData) window.groupsData = [];

    if (editGroupId) {
        const idx = window.groupsData.findIndex(g => g.id === editGroupId);
        if (idx > -1) {
            window.groupsData[idx].name = nameVal;
            window.groupsData[idx].role = roleVal;
            window.groupsData[idx].sector = sectorVal;
            window.groupsData[idx].subType = subVal;
            window.groupsData[idx].permissions = permissions;
        }
    } else {
        const newGrp = {
            id: Date.now().toString(),
            name: nameVal,
            role: roleVal,
            sector: sectorVal,
            subType: subVal,
            permissions: permissions
        };
        window.groupsData.push(newGrp);
    }

    window.saveAll();
    window.renderAdminDashboard();
    window.clearGroupForm();
};

window.editGroup = function(groupId) {
    const grp = (window.groupsData || []).find(g => g.id === groupId);
    if (!grp) return;

    window.switchAdminSubmenu('grupos');
    
    const container = getActiveContainer();
    const editGroupId = container?.querySelector('#editGroupId');
    const nameIn = container?.querySelector('#groupNameInput');
    const roleSel = container?.querySelector('#groupRoleSelect');
    const sectorSel = container?.querySelector('#groupSectorSelect');
    const subSel = container?.querySelector('#groupSubTypeSelect');
    const title = container?.querySelector('#groupFormTitle');

    if (editGroupId) editGroupId.value = grp.id;
    if (nameIn) nameIn.value = grp.name;
    if (roleSel) roleSel.value = grp.role;
    if (sectorSel) sectorSel.value = grp.sector;
    if (subSel) subSel.value = grp.subType || '';
    if (title) title.innerHTML = `<i class="fas fa-edit"></i> Editar Grupo: ${grp.name}`;

    const grpPerms = grp.permissions || {};
    container.querySelectorAll('.perm-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-perm');
        cb.checked = !!grpPerms[key];
    });
};

window.deleteGroup = function(groupId) {
    const grp = (window.groupsData || []).find(g => g.id === groupId);
    if (!grp) return;

    if (!confirm(`Excluir o grupo "${grp.name}"? Usuários deste grupo voltarão a usar permissões manuais.`)) return;

    window.groupsData = (window.groupsData || []).filter(g => g.id !== groupId);

    if (window.usersData) {
        window.usersData.forEach(u => {
            if (u.group === groupId || u.group === grp.name) {
                u.group = null;
            }
        });
    }

    window.saveAll();
    window.renderAdminDashboard();
};

window.saveUser = function() {
    const container = getActiveContainer();
    const editUserId = container?.querySelector('#editUserId')?.value;
    const usernameVal = container?.querySelector('#userUsernameInput')?.value.trim();
    const passwordVal = container?.querySelector('#userPasswordInput')?.value;
    const groupVal = container?.querySelector('#userGroupSelect')?.value || null;
    const roleVal = container?.querySelector('#userRoleSelect')?.value;
    const sectorVal = container?.querySelector('#userSectorSelect')?.value;
    const subVal = container?.querySelector('#userSubTypeSelect')?.value || null;

    if (!usernameVal) {
        alert("Preencha o nome do usuário.");
        return;
    }

    const permissions = {};
    container.querySelectorAll('.perm-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-perm');
        permissions[key] = cb.checked;
    });

    if (!window.usersData) window.usersData = [];

    const normalizedUsername = usernameVal.toLowerCase();

    let uIdx = window.usersData.findIndex(u => u.username.toLowerCase() === normalizedUsername);
    if (uIdx > -1) {
        if (passwordVal) window.usersData[uIdx].password = passwordVal;
        window.usersData[uIdx].group = groupVal;
        if (!groupVal) {
            window.usersData[uIdx].role = roleVal;
            window.usersData[uIdx].sector = sectorVal;
            window.usersData[uIdx].subType = subVal;
            window.usersData[uIdx].permissions = permissions;
        } else {
            delete window.usersData[uIdx].permissions;
        }
    } else {
        const defaultUsersList = [
            { username: 'Admin', role: 'admin', sector: 'recebimento', subType: null },
            { username: 'Caio', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Balanca', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Recebimento', role: 'user', sector: 'recebimento', subType: null },
            { username: 'Wayner', role: 'user', sector: 'conferente', subType: 'INFRA' },
            { username: 'Manutencao', role: 'user', sector: 'conferente', subType: 'MANUT' },
            { username: 'Fabricio', role: 'user', sector: 'conferente', subType: 'ALM' },
            { username: 'Clodoaldo', role: 'user', sector: 'conferente', subType: 'ALM' },
            { username: 'Guilherme', role: 'user', sector: 'conferente', subType: 'GAVA' },
            { username: 'EncarRec', role: 'Encarregado', sector: 'recebimento', subType: null },
            { username: 'EncarConf', role: 'Encarregado', sector: 'conferente', subType: null }
        ];

        const defUser = defaultUsersList.find(du => du.username.toLowerCase() === normalizedUsername);
        
        if (editUserId && editUserId.toLowerCase() === normalizedUsername) {
            const newOverride = {
                username: defUser ? defUser.username : usernameVal,
                password: passwordVal || '123',
                group: groupVal,
                role: groupVal ? undefined : roleVal,
                sector: groupVal ? undefined : sectorVal,
                subType: groupVal ? undefined : subVal,
                permissions: groupVal ? undefined : permissions
            };
            window.usersData.push(newOverride);
        } else {
            const defaultUsersNames = ['admin', 'caio', 'balanca', 'recebimento', 'wayner', 'manutencao', 'fabricio', 'clodoaldo', 'guilherme', 'encarrec', 'encarconf'];
            const exists = defaultUsersNames.includes(normalizedUsername) || window.usersData.some(u => u.username.toLowerCase() === normalizedUsername);
            if (exists) {
                alert(`O usuário "${usernameVal}" já existe.`);
                return;
            }

            if (!passwordVal) {
                alert("A senha é obrigatória para novos usuários.");
                return;
            }

            const newUserObj = {
                username: usernameVal,
                password: passwordVal,
                group: groupVal,
                role: groupVal ? undefined : roleVal,
                sector: groupVal ? undefined : sectorVal,
                subType: groupVal ? undefined : subVal,
                permissions: groupVal ? undefined : permissions
            };
            window.usersData.push(newUserObj);
        }
    }

    window.saveAll();
    window.renderAdminDashboard();
    window.clearUserForm();
};

window.editUser = function(username) {
    window.switchAdminSubmenu('funcionarios');

    const dbUsers = window.usersData || [];
    const defaultUsers = [
        { username: 'Admin', role: 'admin', sector: 'recebimento', subType: null },
        { username: 'Caio', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Balanca', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Recebimento', role: 'user', sector: 'recebimento', subType: null },
        { username: 'Wayner', role: 'user', sector: 'conferente', subType: 'INFRA' },
        { username: 'Manutencao', role: 'user', sector: 'conferente', subType: 'MANUT' },
        { username: 'Fabricio', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Clodoaldo', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Guilherme', role: 'user', sector: 'conferente', subType: 'GAVA' },
        { username: 'EncarRec', role: 'Encarregado', sector: 'recebimento', subType: null },
        { username: 'EncarConf', role: 'Encarregado', sector: 'conferente', subType: null }
    ];

    const matchedDef = defaultUsers.find(du => du.username.toLowerCase() === username.toLowerCase());
    const matchedDb = dbUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    const user = matchedDb ? { ...(matchedDef || {}), ...matchedDb } : { ...matchedDef, password: '123' };

    if (!user.username) return;

    const container = getActiveContainer();
    const editUserId = container?.querySelector('#editUserId');
    const userIn = container?.querySelector('#userUsernameInput');
    const passIn = container?.querySelector('#userPasswordInput');
    const grpSel = container?.querySelector('#userGroupSelect');
    const roleSel = container?.querySelector('#userRoleSelect');
    const sectorSel = container?.querySelector('#userSectorSelect');
    const subSel = container?.querySelector('#userSubTypeSelect');
    const title = container?.querySelector('#userFormTitle');

    if (editUserId) editUserId.value = user.username;
    if (userIn) {
        userIn.value = user.username;
        userIn.readOnly = true;
    }
    if (passIn) passIn.value = user.password || '';
    if (grpSel) grpSel.value = user.group || '';

    window.toggleUserPermissionsEdit(user.group || '');

    if (!user.group) {
        if (roleSel) roleSel.value = user.role || 'user';
        if (sectorSel) sectorSel.value = user.sector || 'conferente';
        if (subSel) subSel.value = user.subType || '';

        const userPerms = user.permissions || {};
        container.querySelectorAll('.perm-checkbox').forEach(cb => {
            const key = cb.getAttribute('data-perm');
            cb.checked = !!userPerms[key];
        });
    }

    if (title) title.innerHTML = `<i class="fas fa-edit"></i> Editar Usuário: ${user.username}`;
};

window.deleteUser = function(username) {
    const isDefault = ['admin', 'caio', 'balanca', 'recebimento', 'wayner', 'manutencao', 'fabricio', 'clodoaldo', 'guilherme', 'encarrec', 'encarconf'].includes(username.toLowerCase());

    if (isDefault) {
        if (!confirm(`Deseja restaurar o usuário padrão "${username}" para as configurações originais de fábrica?`)) return;
        window.usersData = (window.usersData || []).filter(u => u.username.toLowerCase() !== username.toLowerCase());
    } else {
        if (!confirm(`Excluir permanentemente o usuário "${username}"?`)) return;
        window.usersData = (window.usersData || []).filter(u => u.username.toLowerCase() !== username.toLowerCase());
    }

    window.saveAll();
    window.renderAdminDashboard();
};