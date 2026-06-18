// ==========================================================================
// MÓDULO DE CHAT EM TEMPO REAL - WILSON SYSTEM
// ==========================================================================

// Estado interno do Chat
window.activeChatId = 'global'; // Chat Geral por padrão
window.chatUnreadCounts = {};
window.editingMessageId = null;
window.onlineUsersStatus = {};

// Easter Egg functions
window.activeEasterEggType = 'meme';

window.showEasterEggPresent = function(type = 'meme') {
    window.activeEasterEggType = type;
    const presentModal = document.getElementById('modalEasterEggPresent');
    if (presentModal) presentModal.style.display = 'flex';
};

window.closeEasterEggPresent = function() {
    const presentModal = document.getElementById('modalEasterEggPresent');
    if (presentModal) presentModal.style.display = 'none';
};

window.openEasterEggMeme = function() {
    window.closeEasterEggPresent();
    
    // Configura a imagem com base no tipo de presente
    const imgEl = document.querySelector('#modalEasterEggMeme img');
    if (imgEl) {
        const type = window.activeEasterEggType || 'meme';
        if (type === 'dog') {
            imgEl.src = '/Imgs/dog.jpeg';
        } else if (type === 'converceiro') {
            imgEl.src = '/Imgs/converceiro.jpeg';
        } else if (type.startsWith('custom_')) {
            const codeName = type.substring(7); // Remove o prefixo "custom_"
            const customEggs = window.customEasterEggs || [];
            const matchedEgg = customEggs.find(x => x.code.toLowerCase() === codeName);
            if (matchedEgg && matchedEgg.image) {
                imgEl.src = matchedEgg.image;
            } else {
                imgEl.src = '/Imgs/meme.jpeg';
            }
        } else {
            imgEl.src = '/Imgs/meme.jpeg';
        }
    }
    
    const memeModal = document.getElementById('modalEasterEggMeme');
    if (memeModal) memeModal.style.display = 'flex';
};

// Funções do Admin para gerenciar Códigos Especiais
window.selectedEggImageBase64 = null;

window.handleNewEggImageSelect = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) { // Limite de 2MB para base64
        alert('A imagem é muito grande! Escolha uma imagem de até 2MB.');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        window.selectedEggImageBase64 = e.target.result;
        
        // Exibe preview
        const previewContainer = document.getElementById('newEggImagePreviewContainer');
        const previewImg = document.getElementById('newEggImagePreview');
        const previewName = document.getElementById('newEggImageName');
        
        if (previewContainer && previewImg && previewName) {
            previewImg.src = e.target.result;
            previewName.innerText = file.name;
            previewContainer.style.display = 'flex';
        }
    };
    reader.readAsDataURL(file);
};

window.clearNewEggImageSelection = function() {
    window.selectedEggImageBase64 = null;
    const input = document.getElementById('newEggImageInput');
    if (input) input.value = '';
    
    const previewContainer = document.getElementById('newEggImagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
};

window.saveNewEasterEgg = function() {
    const codeInput = document.getElementById('newEggCode');
    if (!codeInput) return;
    
    const code = codeInput.value.trim().toLowerCase();
    
    // Validações
    if (!code) {
        alert('Por favor, digite o nome do código.');
        return;
    }
    
    if (!/^[a-z0-9_-]+$/.test(code)) {
        alert('O código deve conter apenas letras, números, hífens ou underlines, sem espaços.');
        return;
    }
    
    const nativeCodes = ['gueguel', 'bulldog', 'converseiro'];
    if (nativeCodes.includes(code)) {
        alert('Este código já é nativo do sistema e não pode ser cadastrado novamente.');
        return;
    }
    
    const customList = window.customEasterEggs || [];
    if (customList.some(x => x.code.toLowerCase() === code)) {
        alert('Este código já existe! Escolha outro nome.');
        return;
    }
    
    if (!window.selectedEggImageBase64) {
        alert('Por favor, selecione uma imagem para associar a este código.');
        return;
    }
    
    // Adiciona à lista
    customList.push({
        code: code,
        image: window.selectedEggImageBase64
    });
    
    window.customEasterEggs = customList;
    
    // Salvar e sincronizar
    if (typeof window.saveAll === 'function') {
        window.saveAll(true);
    }
    
    alert(`Código --${code}-- cadastrado com sucesso!`);
    
    // Limpar campos
    codeInput.value = '';
    window.clearNewEggImageSelection();
    
    // Re-renderizar lista
    window.renderCustomEasterEggs();
};

window.deleteEasterEgg = function(code) {
    if (!confirm(`Tem certeza que deseja excluir o código --${code}--?`)) return;
    
    let customList = window.customEasterEggs || [];
    customList = customList.filter(x => x.code.toLowerCase() !== code.toLowerCase());
    
    window.customEasterEggs = customList;
    
    // Salvar e sincronizar
    if (typeof window.saveAll === 'function') {
        window.saveAll(true);
    }
    
    // Re-renderizar lista
    window.renderCustomEasterEggs();
};

window.renderCustomEasterEggs = function() {
    const listEl = document.getElementById('customEasterEggsList');
    if (!listEl) return;
    
    const customList = window.customEasterEggs || [];
    
    if (customList.length === 0) {
        listEl.innerHTML = '<div style="padding:10px; text-align:center; font-size:0.8rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:4px;">Nenhum código personalizado cadastrado.</div>';
        return;
    }
    
    let html = '';
    customList.forEach(egg => {
        html += `
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:6px;">
                <img src="${egg.image}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;" />
                <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
                    <span style="font-weight:bold; font-size:0.85rem; font-family:monospace; color:var(--text-main);">--${egg.code}--</span>
                </div>
                <button class="message-action-btn delete" onclick="window.deleteEasterEgg('${egg.code}')" title="Excluir Código" style="width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:4px; border:1px solid rgba(0,0,0,0.1); margin:0; background:transparent;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

window.closeEasterEggMeme = function() {
    const memeModal = document.getElementById('modalEasterEggMeme');
    if (memeModal) memeModal.style.display = 'none';
};

window.openChatUserProfile = function(username) {
    const modal = document.getElementById('modalChatUserProfile');
    if (!modal) return;
    
    const u = window.getAllUsers().find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u) return;
    
    // 1. Cover Background
    const coverEl = document.getElementById('chatUserProfileCover');
    if (coverEl) {
        if (u.coverImage) {
            coverEl.style.backgroundImage = `url('${u.coverImage}')`;
            coverEl.style.backgroundColor = 'transparent';
        } else {
            coverEl.style.backgroundImage = 'none';
            coverEl.style.backgroundColor = 'var(--primary)';
        }
    }
    
    // 2. Avatar Photo
    const avatarEl = document.getElementById('chatUserProfileAvatar');
    if (avatarEl) {
        if (u.avatarPhoto) {
            avatarEl.innerHTML = `<img src="${u.avatarPhoto}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;" />`;
            avatarEl.style.backgroundColor = 'transparent';
        } else {
            const color = u.avatarColor || '#3b82f6';
            const emoji = u.avatarEmoji || '👤';
            avatarEl.innerText = emoji;
            avatarEl.style.backgroundColor = color;
        }
    }
    
    // 3. User Details
    const fullNameEl = document.getElementById('chatUserProfileFullName');
    const usernameEl = document.getElementById('chatUserProfileUsername');
    if (fullNameEl) fullNameEl.innerText = u.fullname || u.username;
    if (usernameEl) usernameEl.innerText = `@${u.username}`;
    
    // 4. Status Badge
    const statusBadgeEl = document.getElementById('chatUserProfileStatusBadge');
    if (statusBadgeEl) {
        const presence = window.onlineUsersStatus ? window.onlineUsersStatus[u.username] : 'offline';
        let statusText = 'Offline';
        let statusColor = '#94a3b8';
        if (presence === 'online') {
            statusText = 'Online';
            statusColor = '#10b981';
        } else if (presence === 'idle') {
            statusText = 'Ausente';
            statusColor = '#eab308';
        }
        
        statusBadgeEl.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></span> ${statusText}`;
    }
    
    // 5. Grid Details
    const roleEl = document.getElementById('chatUserProfileRole');
    const sectorEl = document.getElementById('chatUserProfileSector');
    const createdEl = document.getElementById('chatUserProfileCreated');
    const lastAccessEl = document.getElementById('chatUserProfileLastAccess');
    
    if (roleEl) roleEl.innerText = (u.role || 'Usuário').toUpperCase();
    if (sectorEl) sectorEl.innerText = (u.sector || 'Geral').toUpperCase();
    
    // Formatar data de criação se disponível
    if (createdEl) {
        if (u.createdAt) {
            try {
                const date = new Date(u.createdAt);
                createdEl.innerText = date.toLocaleDateString('pt-BR');
            } catch (e) {
                createdEl.innerText = 'Não Informado';
            }
        } else {
            createdEl.innerText = 'Não Informado';
        }
    }
    
    // Formatar último acesso
    if (lastAccessEl) {
        const presence = window.onlineUsersStatus ? window.onlineUsersStatus[u.username] : 'offline';
        if (presence === 'online') {
            lastAccessEl.innerText = 'Agora mesmo';
        } else if (u.lastAccess) {
            try {
                const date = new Date(u.lastAccess);
                const isToday = date.toDateString() === new Date().toDateString();
                if (isToday) {
                    lastAccessEl.innerText = 'Hoje às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                } else {
                    lastAccessEl.innerText = date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                lastAccessEl.innerText = 'Nunca';
            }
        } else {
            lastAccessEl.innerText = 'Nunca';
        }
    }
    
    modal.style.display = 'flex';
};

window.closeChatUserProfile = function() {
    const modal = document.getElementById('modalChatUserProfile');
    if (modal) modal.style.display = 'none';
};

// Efeitos sonoros sintetizados para o Chat (Web Audio API)
window.playSentSound = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        let ctx = window.globalAudioCtx;
        if (!ctx || ctx.state === 'closed') { 
            ctx = new AudioContext(); 
            window.globalAudioCtx = ctx; 
        } else if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain();
        osc.connect(gain); 
        gain.connect(ctx.destination);
        
        osc.type = 'sine'; 
        const now = ctx.currentTime;
        
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
        
        gain.gain.setValueAtTime(0, now); 
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.start(now); 
        osc.stop(now + 0.12);
    } catch (e) {
        console.warn("Audio blocked:", e);
    }
};

window.playReceivedSound = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        let ctx = window.globalAudioCtx;
        if (!ctx || ctx.state === 'closed') { 
            ctx = new AudioContext(); 
            window.globalAudioCtx = ctx; 
        } else if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(520, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.start(now);
        osc1.stop(now + 0.12);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(660, now + 0.06);
        gain2.gain.setValueAtTime(0, now + 0.06);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.22);
    } catch (e) {
        console.warn("Audio blocked:", e);
    }
};

// Gerenciamento de Presença (Online / Ausente / Offline)
let lastPresenceActivityTime = Date.now();
let currentPresenceStatus = 'online';
const PRESENCE_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutos em ms

function checkPresenceIdleStatus() {
    const now = Date.now();
    let targetStatus = 'online';
    
    if (document.hidden || document.visibilityState === 'hidden') {
        targetStatus = 'idle';
    } else if (now - lastPresenceActivityTime > PRESENCE_IDLE_TIMEOUT) {
        targetStatus = 'idle';
    }
    
    if (targetStatus !== currentPresenceStatus) {
        currentPresenceStatus = targetStatus;
        if (window.socket && window.socket.connected && window.loggedUser?.username) {
            window.socket.emit('user_status_change', { status: currentPresenceStatus });
        }
    }
}

function resetPresenceIdleTimer() {
    lastPresenceActivityTime = Date.now();
    if (currentPresenceStatus === 'idle') {
        currentPresenceStatus = 'online';
        if (window.socket && window.socket.connected && window.loggedUser?.username) {
            window.socket.emit('user_status_change', { status: 'online' });
        }
    }
}

// Inicia escuta de atividades e interval
(function initPresenceSystem() {
    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evt => {
        document.addEventListener(evt, resetPresenceIdleTimer, { passive: true });
    });
    
    setInterval(checkPresenceIdleStatus, 10000);
    document.addEventListener('visibilitychange', checkPresenceIdleStatus);
    
    // Conectar eventos do Socket.io para presença
    window.initPresenceEvents = function() {
        if (!window.socket) return;

        const bindPresenceEvents = () => {
            if (window.loggedUser?.username) {
                window.socket.emit('user_online', {
                    username: window.loggedUser.username,
                    status: currentPresenceStatus
                });
            }
        };

        window.socket.on('connect', bindPresenceEvents);
        
        window.socket.on('online_users_list', (statusMap) => {
            window.onlineUsersStatus = statusMap || {};
            const currentView = localStorage.getItem('aw_last_view');
            if (currentView === 'chat') {
                window.renderChatSidebar();
                window.renderChatWindow();
            }
        });
        
        // Emit inicial se já estiver conectado
        if (window.socket.connected) {
            bindPresenceEvents();
        }
    };

    if (window.socket) {
        window.initPresenceEvents();
    }
})();

window.calculateUnreadCounts = function() {
    window.chatUnreadCounts = {};
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;

    const messages = window.chatMessagesData || [];
    messages.forEach(m => {
        if (m.sender === loggedInUser) return; // ignora mensagens enviadas pelo próprio usuário
        
        // Ignora mensagens que o usuário apagou para si mesmo
        if (m.deletedFor && Array.isArray(m.deletedFor) && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
            return;
        }

        let isForMe = false;
        let chatKey = '';
        
        if (m.recipient === 'global') {
            isForMe = true;
            chatKey = 'global';
        } else if (m.recipient && m.recipient.startsWith('group_')) {
            const grp = (window.chatGroupsData || []).find(g => g.id === m.recipient);
            if (grp && grp.members && grp.members.some(mb => mb.toLowerCase() === loggedInUser.toLowerCase())) {
                isForMe = true;
                chatKey = m.recipient;
            }
        } else if (m.recipient === loggedInUser) {
            isForMe = true;
            chatKey = m.sender;
        }
        
        if (!isForMe) return;
        // Só considera não lida se o usuário logado não estiver na lista de quem já leu
        if (m.readBy && Array.isArray(m.readBy)) {
            if (!m.readBy.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
                window.chatUnreadCounts[chatKey] = (window.chatUnreadCounts[chatKey] || 0) + 1;
            }
        }
    });

    window.updateChatBadges();
};

window.markActiveChatAsRead = function() {
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser || !window.activeChatId) return;
    
    const currentView = localStorage.getItem('aw_last_view');
    if (currentView !== 'chat') return;
    
    let changed = false;
    const messages = window.chatMessagesData || [];
    
    messages.forEach(m => {
        if (m.sender === loggedInUser) return;
        
        let match = false;
        if (window.activeChatId === 'global' && m.recipient === 'global') {
            match = true;
        } else if (window.activeChatId.startsWith('group_') && m.recipient === window.activeChatId) {
            match = true;
        } else if (m.recipient === loggedInUser && m.sender === window.activeChatId) {
            match = true;
        }
        
        if (match) {
            if (!m.readBy) {
                m.readBy = [loggedInUser];
                changed = true;
            } else if (Array.isArray(m.readBy) && !m.readBy.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
                m.readBy.push(loggedInUser);
                changed = true;
            }
        }
    });
    
    if (changed) {
        if (typeof window.saveAll === 'function') {
            window.saveAll(true);
        }
    }
};

(function initChatModule() {
    console.log("Wilson Chat: Módulo inicializado.");
    
    // Inscreve no monitoramento de novas mensagens de forma reativa
    if (window.appState) {
        window.appState.watch('chatMessages', (newMsgs, oldMsgs) => {
            const oldList = oldMsgs || [];
            const newList = newMsgs || [];
            
            // Recalcula contagem de não lidos dinamicamente baseada nos dados persistidos
            window.calculateUnreadCounts();
            
            // Se o número de mensagens aumentou, identifica as novas
            if (newList.length > oldList.length && oldList.length > 0) {
                const newAdded = newList.filter(m => !oldList.some(o => o.id === m.id));
                const loggedInUser = window.loggedUser?.username || '';
                const currentView = localStorage.getItem('aw_last_view');
                
                let receivedNew = false;
                let activeChatChanged = false;
                
                newAdded.forEach(m => {
                    // Ignora mensagens enviadas pelo próprio usuário
                    if (m.sender === loggedInUser) return;
                    
                    // Verifica se a mensagem é endereçada a este usuário, canal global ou a um grupo do qual é membro
                    let isForMe = false;
                    let chatKey = '';
                    
                    if (m.recipient === 'global') {
                        isForMe = true;
                        chatKey = 'global';
                    } else if (m.recipient && m.recipient.startsWith('group_')) {
                        const grp = (window.chatGroupsData || []).find(g => g.id === m.recipient);
                        if (grp && grp.members && grp.members.some(mb => mb.toLowerCase() === loggedInUser.toLowerCase())) {
                            isForMe = true;
                            chatKey = m.recipient;
                        }
                    } else if (m.recipient === loggedInUser) {
                        isForMe = true;
                        chatKey = m.sender;
                    }
                    
                    if (!isForMe) return;

                    // Easter Egg Present Check
                    const eggValue = m.easterEgg || (m.text ? m.text.trim() : '');
                    const textClean = typeof eggValue === 'string' ? eggValue.trim() : '';
                    const easterEggs = {
                        '--gueguel--': 'meme',
                        '--bulldog--': 'dog',
                        '--converseiro--': 'converceiro'
                    };
                    
                    let targetEggType = null;
                    if (easterEggs[textClean]) {
                        targetEggType = easterEggs[textClean];
                    } else if (textClean.startsWith('--') && textClean.endsWith('--') && textClean.length > 4) {
                        const codeName = textClean.slice(2, -2).trim().toLowerCase();
                        const customEggs = window.customEasterEggs || [];
                        const matchedEgg = customEggs.find(x => x.code.toLowerCase() === codeName);
                        if (matchedEgg) {
                            targetEggType = 'custom_' + codeName;
                        }
                    }
                    
                    if (targetEggType && !m.deleted) {
                        const loggedUser = window.loggedUser?.username || '';
                        const storageKey = `${loggedUser}_processed_presents`;
                        let processed = [];
                        try {
                            processed = JSON.parse(localStorage.getItem(storageKey)) || [];
                        } catch (e) {}
                        
                        if (!processed.includes(m.id)) {
                            processed.push(m.id);
                            localStorage.setItem(storageKey, JSON.stringify(processed));
                            if (typeof window.showEasterEggPresent === 'function') {
                                window.showEasterEggPresent(targetEggType);
                            }
                        }
                    }
                    
                    // Se estiver visualizando este chat específico e a aba ativa for o chat, marcar como lida imediatamente
                    if (window.activeChatId === chatKey && currentView === 'chat') {
                        if (!m.readBy) m.readBy = [];
                        if (!m.readBy.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
                            m.readBy.push(loggedInUser);
                            activeChatChanged = true;
                        }
                    } else {
                        // Caso contrário, é uma mensagem realmente nova e não visualizada
                        receivedNew = true;
                        
                        // Notificação de sistema
                        const senderDisplay = m.sender;
                        const bodyMsg = m.deleted ? "Mensagem apagada" : (m.text || "Nova mensagem");
                        
                        let notificationTitle = `Chat: Em trânsito de ${senderDisplay}`;
                        if (m.recipient.startsWith('group_')) {
                            const grp = (window.chatGroupsData || []).find(g => g.id === m.recipient);
                            const grpName = grp ? grp.name : 'Grupo';
                            notificationTitle = `Chat [${grpName}]: ${senderDisplay}`;
                        }
                        
                        if (typeof window.sendSystemNotification === 'function') {
                            window.sendSystemNotification(
                                notificationTitle,
                                bodyMsg,
                                'chat'
                            );
                        }
                    }
                });
                
                if (activeChatChanged) {
                    if (typeof window.saveAll === 'function') {
                        window.saveAll();
                    }
                }
                
                // Toca alerta sonoro
                if (receivedNew) {
                    if (typeof window.playReceivedSound === 'function') {
                        window.playReceivedSound();
                    } else if (typeof window.playBeep === 'function') {
                        window.playBeep();
                    }
                }
                
                window.calculateUnreadCounts();
            }
            
            // Se a visualização do chat estiver aberta, atualiza a janela
            const currentView = localStorage.getItem('aw_last_view');
            if (currentView === 'chat') {
                window.renderChatSidebar();
                window.renderChatWindow();
            }
        });
    }
})();

/**
 * Atualiza o badge do menu do chat e da lista de conversas
 */
window.updateChatBadges = function() {
    const badgeMenu = document.getElementById('badgeChat');
    const totalUnread = Object.values(window.chatUnreadCounts).reduce((a, b) => a + b, 0);
    
    if (badgeMenu) {
        if (totalUnread > 0) {
            badgeMenu.innerText = totalUnread;
            badgeMenu.style.display = 'inline-block';
        } else {
            badgeMenu.style.display = 'none';
        }
    }
};

/**
 * Retorna lista de todas as contas combinadas (padrão + banco de dados)
 */
window.getAllUsers = function() {
    const defaultUsers = [
        { username: 'Admin', role: 'admin', sector: 'recebimento' },
        { username: 'Caio', role: 'user', sector: 'recebimento' },
        { username: 'Balanca', role: 'user', sector: 'recebimento' },
        { username: 'Recebimento', role: 'user', sector: 'recebimento' },
        { username: 'Wayner', role: 'user', sector: 'conferente', subType: 'INFRA' },
        { username: 'Manutencao', role: 'user', sector: 'conferente', subType: 'MANUT' },
        { username: 'Fabricio', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Clodoaldo', role: 'user', sector: 'conferente', subType: 'ALM' },
        { username: 'Guilherme', role: 'user', sector: 'conferente', subType: 'GAVA' },
        { username: 'EncarRec', role: 'Encarregado', sector: 'recebimento' },
        { username: 'EncarConf', role: 'Encarregado', sector: 'conferente' }
    ];
    
    const users = window.usersData || [];
    const allUsers = defaultUsers.map(du => {
        const override = users.find(u => u.username.toLowerCase() === du.username.toLowerCase());
        return override ? { ...du, ...override } : du;
    });
    
    users.forEach(u => {
        if (u && u.username && !allUsers.find(x => x.username.toLowerCase() === u.username.toLowerCase())) {
            allUsers.push(u);
        }
    });
    
    return allUsers;
};

/**
 * Renderização da view do Chat
 */
window.renderChat = function() {
    const container = document.getElementById('chatContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="chat-layout">
            <!-- Sidebar -->
            <div class="chat-sidebar" id="chatSidebar">
                <div class="chat-search-wrapper" style="display: flex; gap: 8px; align-items: center;">
                    <div class="chat-search-input-group" style="flex: 1;">
                        <i class="fas fa-search"></i>
                        <input type="text" id="chatSearch" placeholder="Buscar contato..." onkeyup="window.renderChatSidebar()">
                    </div>
                    <button class="btn btn-save" onclick="window.openCreateGroupModal()" style="padding: 8px 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; flex-shrink: 0; margin: 0; height: 34px;" title="Criar Novo Grupo">
                        <i class="fas fa-plus"></i> <span class="hide-mobile-inline">Grupo</span>
                    </button>
                </div>
                <div class="chat-user-list" id="chatUserList"></div>
            </div>
            
            <!-- Janela de Chat -->
            <div class="chat-window" id="chatWindow"></div>
        </div>
    `;
    
    window.renderChatSidebar();
    window.renderChatWindow();
    window.updateChatBadges();
};

/**
 * Renderiza os contatos na barra lateral
 */
window.renderChatSidebar = function() {
    const userListEl = document.getElementById('chatUserList');
    if (!userListEl) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    const searchTerm = document.getElementById('chatSearch')?.value.toLowerCase() || '';
    
    const nicknamesKey = loggedInUser + '_chat_nicknames';
    let nicknames = {};
    try { nicknames = JSON.parse(localStorage.getItem(nicknamesKey)) || {}; } catch(err) {}

    const pinnedKey = loggedInUser + '_chat_pinned';
    let pinnedList = [];
    try { pinnedList = JSON.parse(localStorage.getItem(pinnedKey)) || []; } catch(err) {}
    
    let html = '';
    
    // 1. Canal Global (Chat Geral)
    const isGlobalActive = window.activeChatId === 'global';
    const globalUnread = window.chatUnreadCounts['global'] || 0;
    
    // Obter última mensagem do chat geral para exibir no preview
    const globalMsgs = (window.chatMessagesData || []).filter(m => 
        m.recipient === 'global' && 
        !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
    );
    const lastGlobalMsg = globalMsgs[globalMsgs.length - 1];
    let globalPreview = 'Canal Público da Empresa';
    if (lastGlobalMsg) {
        const prefix = lastGlobalMsg.sender === loggedInUser ? 'Você: ' : `${lastGlobalMsg.sender}: `;
        globalPreview = lastGlobalMsg.deleted ? `${prefix}Mensagem apagada` : `${prefix}${lastGlobalMsg.text}`;
    }
    
    const isGlobalPinned = pinnedList.includes('global');
    const displayGlobalName = nicknames['global'] || 'Chat Geral (Todos)';
    
    html += `
        <div class="chat-user-item ${isGlobalActive ? 'active' : ''}" onclick="window.openChat('global')" oncontextmenu="window.onChatUserContextMenu(event, 'global', 'global'); return false;">
            <div class="chat-avatar" style="background-color: var(--primary); color: white;">
                <i class="fas fa-users"></i>
            </div>
            <div class="chat-user-info">
                <div class="chat-user-name-row">
                    <span class="chat-user-name">
                        ${displayGlobalName}
                        ${isGlobalPinned ? `<i class="fas fa-thumbtack" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; transform: rotate(45deg);" title="Fixado"></i>` : ''}
                    </span>
                    ${globalUnread > 0 ? `<span class="chat-user-badge">${globalUnread}</span>` : ''}
                </div>
                <div class="chat-user-role" style="font-weight: ${globalUnread > 0 ? '600' : 'normal'}; color: ${globalUnread > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${globalPreview}</div>
            </div>
        </div>
    `;
    
    html += `<div style="height: 1px; background: var(--border-color); margin: 6px 10px; opacity: 0.5;"></div>`;
    
    // 2. Grupos de Conversa
    const loggedInUserLower = loggedInUser.toLowerCase();
    const myGroups = (window.chatGroupsData || []).filter(g => 
        g.members && g.members.some(m => m.toLowerCase() === loggedInUserLower)
    );
    
    const getGroupLatestMsgTime = (groupId) => {
        const msgs = (window.chatMessagesData || []).filter(m => 
            m.recipient === groupId && 
            !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
        );
        if (msgs.length === 0) return 0;
        return msgs.reduce((max, m) => {
            const time = new Date(m.timestamp).getTime();
            return time > max ? time : max;
        }, 0);
    };
    
    const filteredGroups = myGroups.filter(g => 
        g.name.toLowerCase().includes(searchTerm)
    ).sort((a, b) => {
        const isPinnedA = pinnedList.includes(a.id);
        const isPinnedB = pinnedList.includes(b.id);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        
        const timeA = getGroupLatestMsgTime(a.id);
        const timeB = getGroupLatestMsgTime(b.id);
        if (timeA !== timeB) {
            return timeB - timeA; // Mais recente primeiro
        }
        return a.name.localeCompare(b.name);
    });
    
    if (filteredGroups.length > 0) {
        html += `<div style="font-size: 0.72rem; font-weight: bold; text-transform: uppercase; color: var(--text-muted); margin: 12px 12px 6px 12px; letter-spacing: 0.5px;">Grupos de Conversa</div>`;
        
        filteredGroups.forEach(g => {
            const isActive = window.activeChatId === g.id;
            const unread = window.chatUnreadCounts[g.id] || 0;
            const latestTime = getGroupLatestMsgTime(g.id);
            const hasChatted = latestTime > 0;
            
            // Preview da última mensagem do grupo
            const groupMsgs = (window.chatMessagesData || []).filter(m => 
                m.recipient === g.id && 
                !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
            );
            const lastMsg = groupMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[groupMsgs.length - 1];
            let previewText = `${g.members.length} membros`;
            if (lastMsg) {
                const prefix = lastMsg.sender === loggedInUser ? 'Você: ' : `${lastMsg.sender}: `;
                previewText = lastMsg.deleted ? `${prefix}Mensagem apagada` : `${prefix}${lastMsg.text}`;
            }
            
            // Avatar do grupo
            let avatarHtml = '';
            if (g.photo) {
                avatarHtml = `<img src="${g.photo}" alt="Group Photo" />`;
            } else {
                avatarHtml = `<i class="fas fa-users" style="color: var(--primary);"></i>`;
            }
            
            const groupStyle = hasChatted ? '' : 'opacity: 0.55; filter: grayscale(35%); transition: all 0.2s ease;';
            const displayName = nicknames[g.id] || g.name;
            const isPinned = pinnedList.includes(g.id);
            
            html += `
                <div class="chat-user-item ${isActive ? 'active' : ''}" onclick="window.openChat('${g.id}')" oncontextmenu="window.onChatUserContextMenu(event, '${g.id}', 'group'); return false;" style="${groupStyle}">
                    <div class="chat-avatar" style="background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;">
                        ${avatarHtml}
                    </div>
                    <div class="chat-user-info">
                        <div class="chat-user-name-row">
                            <span class="chat-user-name">
                                <i class="fas fa-hashtag" style="font-size: 0.75rem; color: var(--primary); margin-right: 4px;"></i>${displayName}
                                ${isPinned ? `<i class="fas fa-thumbtack" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; transform: rotate(45deg);" title="Fixado"></i>` : ''}
                            </span>
                            ${unread > 0 ? `<span class="chat-user-badge">${unread}</span>` : ''}
                        </div>
                        <div class="chat-user-role" style="font-weight: ${unread > 0 ? '600' : 'normal'}; color: ${unread > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${previewText}</div>
                    </div>
                </div>
            `;
        });
        
        // Linha divisória
        html += `<div style="height: 1px; background: var(--border-color); margin: 6px 10px; opacity: 0.5;"></div>`;
    }
    
    // 3. Direct Messages (Usuários)
    const allUsers = window.getAllUsers();
    
    // Função auxiliar para obter o timestamp da mensagem mais recente com este contato
    const getLatestMsgTime = (username) => {
        const msgs = (window.chatMessagesData || []).filter(m => 
            ((m.sender === loggedInUser && m.recipient === username) ||
             (m.sender === username && m.recipient === loggedInUser)) &&
            !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
        );
        if (msgs.length === 0) return 0;
        return msgs.reduce((max, m) => {
            const time = new Date(m.timestamp).getTime();
            return time > max ? time : max;
        }, 0);
    };
    
    // Filtra usuários pelo termo de busca e exclui o próprio usuário logado
    // Ordena pela data da conversa mais recente, se for fixado, e depois alfabeticamente
    const filteredUsers = allUsers.filter(u => {
        if (u.username.toLowerCase() === loggedInUser.toLowerCase()) return false;
        return u.username.toLowerCase().includes(searchTerm) || 
               (u.fullname || '').toLowerCase().includes(searchTerm);
    }).sort((a, b) => {
        const isPinnedA = pinnedList.includes(a.username);
        const isPinnedB = pinnedList.includes(b.username);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        
        const timeA = getLatestMsgTime(a.username);
        const timeB = getLatestMsgTime(b.username);
        if (timeA !== timeB) {
            return timeB - timeA; // Mais recente primeiro
        }
        return a.username.localeCompare(b.username);
    });
    
    if (filteredUsers.length === 0) {
        if (myGroups.length === 0) {
            html += `<div style="padding: 20px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">Nenhum contato encontrado</div>`;
        }
    } else {
        html += `<div style="font-size: 0.72rem; font-weight: bold; text-transform: uppercase; color: var(--text-muted); margin: 12px 12px 6px 12px; letter-spacing: 0.5px;">Mensagens Diretas</div>`;
        
        filteredUsers.forEach(u => {
            const isActive = window.activeChatId === u.username;
            const unread = window.chatUnreadCounts[u.username] || 0;
            const latestTime = getLatestMsgTime(u.username);
            const hasChatted = latestTime > 0;
            
            // Preview da última mensagem
            const dmMsgs = (window.chatMessagesData || []).filter(m => 
                ((m.sender === loggedInUser && m.recipient === u.username) ||
                 (m.sender === u.username && m.recipient === loggedInUser)) &&
                !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
            );
            const lastDm = dmMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[dmMsgs.length - 1];
            let DmPreview = u.role ? `${u.role.toUpperCase()} - ${(u.sector || 'Geral').toUpperCase()}` : 'Sem cargo';
            if (lastDm) {
                const prefix = lastDm.sender === loggedInUser ? 'Você: ' : '';
                DmPreview = lastDm.deleted ? `${prefix}Mensagem apagada` : `${prefix}${lastDm.text}`;
            }
            
            // Renderização do avatar (imagem ou padrão)
            let avatarHtml = '';
            if (u.avatarPhoto) {
                avatarHtml = `<img src="${u.avatarPhoto}" alt="Avatar" />`;
            } else {
                const color = u.avatarColor || '#3b82f6';
                const emoji = u.avatarEmoji || '👤';
                avatarHtml = `<div style="width:100%; height:100%; background-color:${color}; display:flex; align-items:center; justify-content:center;">${emoji}</div>`;
            }
            
            // Indicador de "Online" real-time
            const status = window.onlineUsersStatus ? window.onlineUsersStatus[u.username] : 'offline';
            let statusClass = 'offline';
            if (status === 'online') statusClass = 'online';
            else if (status === 'idle') statusClass = 'idle';
            
            // Caso nunca tenha conversado com a pessoa ela fica levemente mais acinzedada e translúcida
            const contactStyle = hasChatted ? '' : 'opacity: 0.55; filter: grayscale(35%); transition: all 0.2s ease;';
            const displayName = nicknames[u.username] || u.fullname || u.username;
            const isPinned = pinnedList.includes(u.username);
            
            html += `
                <div class="chat-user-item ${isActive ? 'active' : ''}" onclick="window.openChat('${u.username}')" oncontextmenu="window.onChatUserContextMenu(event, '${u.username}', 'dm'); return false;" style="${contactStyle}">
                    <div class="chat-avatar">
                        ${avatarHtml}
                        <div class="chat-avatar-status ${statusClass}"></div>
                    </div>
                    <div class="chat-user-info">
                        <div class="chat-user-name-row">
                            <span class="chat-user-name">
                                ${displayName}
                                ${isPinned ? `<i class="fas fa-thumbtack" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; transform: rotate(45deg);" title="Fixado"></i>` : ''}
                            </span>
                            ${unread > 0 ? `<span class="chat-user-badge">${unread}</span>` : ''}
                        </div>
                        <div class="chat-user-role" style="font-weight: ${unread > 0 ? '600' : 'normal'}; color: ${unread > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${DmPreview}</div>
                    </div>
                </div>
            `;
        });
    }
    
    userListEl.innerHTML = html;
};

/**
 * Renderiza o corpo da janela di Chat selecionada
 */
window.renderChatWindow = function() {
    const chatWindowEl = document.getElementById('chatWindow');
    if (!chatWindowEl) return;
    
    // Captura o estado atual do input de chat para evitar perder o que o usuário está digitando
    const activeEl = document.activeElement;
    const chatInputEl = document.getElementById('chatInput');
    const hasFocus = chatInputEl && (activeEl === chatInputEl);
    let pendingText = '';
    let selStart = 0;
    let selEnd = 0;
    
    if (chatInputEl) {
        pendingText = chatInputEl.value;
        selStart = chatInputEl.selectionStart;
        selEnd = chatInputEl.selectionEnd;
    }
    
    if (!window.activeChatId) {
        // Estado Vazio (Sem chat aberto)
        chatWindowEl.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-comments chat-empty-icon"></i>
                <h3>Wilson Chat</h3>
                <p>Selecione um contato ou o Chat Geral na barra lateral para começar a conversar.</p>
            </div>
        `;
        return;
    }
    
    // Marca mensagens no chat ativo como lidas
    window.markActiveChatAsRead();
    
    const loggedInUser = window.loggedUser?.username || '';
    
    let isGroup = false;
    let currentGroup = null;
    if (window.activeChatId && window.activeChatId.startsWith('group_')) {
        isGroup = true;
        currentGroup = (window.chatGroupsData || []).find(g => g.id === window.activeChatId);
    }
    
    const nicknamesKey = loggedInUser + '_chat_nicknames';
    let nicknames = {};
    try { nicknames = JSON.parse(localStorage.getItem(nicknamesKey)) || {}; } catch(err) {}

    // Obter dados do chat atual
    let title = nicknames['global'] || 'Chat Geral';
    let statusText = 'Canal público de comunicação';
    let headerAvatar = `<i class="fas fa-users"></i>`;
    let headerAvatarColor = 'var(--primary)';
    
    if (window.activeChatId !== 'global') {
        if (isGroup) {
            title = nicknames[window.activeChatId] || (currentGroup ? currentGroup.name : 'Grupo');
            statusText = `Grupo • ${currentGroup ? currentGroup.members.length : 0} membros`;
            if (currentGroup && currentGroup.photo) {
                headerAvatar = `<img src="${currentGroup.photo}" alt="Group Avatar" style="width:100%; height:100%; object-fit:cover;" />`;
                headerAvatarColor = 'transparent';
            } else {
                headerAvatar = `<i class="fas fa-users" style="color: var(--primary);"></i>`;
                headerAvatarColor = 'rgba(0,0,0,0.05)';
            }
        } else {
            const u = window.getAllUsers().find(x => x.username === window.activeChatId);
            const baseTitle = u ? (u.fullname || u.username) : window.activeChatId;
            title = nicknames[window.activeChatId] || baseTitle;
            const role = u ? (u.role || 'Usuário') : 'Externo';
            const sector = u ? (u.sector || 'Geral') : '';
            
            const presence = window.onlineUsersStatus ? window.onlineUsersStatus[window.activeChatId] : 'offline';
            let presenceText = 'Offline';
            let presenceColor = 'var(--text-muted)';
            if (presence === 'online') {
                presenceText = 'Online';
                presenceColor = '#10b981';
            } else if (presence === 'idle') {
                presenceText = 'Ausente';
                presenceColor = '#eab308';
            }
            
            statusText = `<span style="color:${presenceColor}; font-weight:600;">● ${presenceText}</span> • ${role.toUpperCase()} ${sector ? '- ' + sector.toUpperCase() : ''}`;
            
            if (u && u.avatarPhoto) {
                headerAvatar = `<img src="${u.avatarPhoto}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;" />`;
                headerAvatarColor = 'transparent';
            } else {
                const color = u ? (u.avatarColor || '#3b82f6') : '#94a3b8';
                const emoji = u ? (u.avatarEmoji || '👤') : '👤';
                headerAvatar = emoji;
                headerAvatarColor = color;
            }
        }
    }
    
    // Filtrar mensagens para a conversa atual
    let filteredMsgs = [];
    if (window.activeChatId === 'global') {
        filteredMsgs = (window.chatMessagesData || []).filter(m => m.recipient === 'global');
    } else if (isGroup) {
        filteredMsgs = (window.chatMessagesData || []).filter(m => m.recipient === window.activeChatId);
    } else {
        filteredMsgs = (window.chatMessagesData || []).filter(m => 
            (m.sender === loggedInUser && m.recipient === window.activeChatId) ||
            (m.sender === window.activeChatId && m.recipient === loggedInUser)
        );
    }
    
    // Ignora mensagens que o usuário ativo excluiu para si mesmo
    filteredMsgs = filteredMsgs.filter(m => 
        !(m.deletedFor && m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase()))
    );
    
    // Ordenar cronologicamente
    filteredMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Gera as bolhas de mensagem HTML
    let msgsHtml = '';
    let lastDateStr = '';
    
    filteredMsgs.forEach(m => {
        const isSelf = m.sender === loggedInUser;
        const msgDateStr = new Date(m.timestamp).toDateString();
        
        // Divisor de dia
        if (msgDateStr !== lastDateStr) {
            lastDateStr = msgDateStr;
            msgsHtml += `<div class="chat-day-divider">${window.getDayDividerText(m.timestamp)}</div>`;
        }
        
        // Detalhes do remetente (necessário no chat geral ou em grupos)
        let senderNameHtml = '';
        let messageAvatarHtml = '';
        
        if ((window.activeChatId === 'global' || isGroup) && !isSelf) {
            const senderUser = window.getAllUsers().find(x => x.username === m.sender);
            
            if (senderUser && senderUser.avatarPhoto) {
                messageAvatarHtml = `<div class="chat-avatar" style="width: 28px; height: 28px; font-size: 0.9rem; border: 1px solid var(--border-color); margin-top: auto;"><img src="${senderUser.avatarPhoto}" /></div>`;
            } else {
                const color = senderUser ? (senderUser.avatarColor || '#3b82f6') : '#94a3b8';
                const emoji = senderUser ? (senderUser.avatarEmoji || '👤') : '👤';
                messageAvatarHtml = `<div class="chat-avatar" style="width: 28px; height: 28px; font-size: 0.9rem; background-color: ${color}; border: 1px solid var(--border-color); margin-top: auto;">${emoji}</div>`;
            }
            
            senderNameHtml = `<span style="font-weight:700; font-size:0.75rem; color:var(--primary); display:block; margin-bottom:3px;">${senderUser?.fullname || m.sender}</span>`;
        }
        
        // Ações da mensagem (editar/excluir) baseadas na autoria e estado de exclusão global
        let actionsHtml = '';
        if (isSelf && !m.deleted) {
            actionsHtml = `
                <div class="message-actions-trigger">
                    <button class="message-action-btn" onclick="window.editChatMessage('${m.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="message-action-btn delete" onclick="window.deleteChatMessage('${m.id}')" title="Excluir para todos"><i class="fas fa-trash"></i></button>
                </div>
            `;
        } else if (isSelf && m.deleted) {
            actionsHtml = `
                <div class="message-actions-trigger">
                    <button class="message-action-btn delete" onclick="window.deleteChatMessageForMe('${m.id}')" title="Excluir para mim"><i class="fas fa-trash"></i></button>
                </div>
            `;
        } else { // !isSelf
            actionsHtml = `
                <div class="message-actions-trigger">
                    <button class="message-action-btn delete" onclick="window.deleteChatMessageForMe('${m.id}')" title="Excluir para mim"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }
        
        // Texto da mensagem
        let textDisplay = '';
        if (m.deleted) {
            textDisplay = `<span class="message-text deleted"><i class="fas fa-ban"></i> Esta mensagem foi apagada.</span>`;
        } else {
            // Escapa o HTML para evitar injeção XSS e converte quebras de linha em <br>
            const escaped = (m.text || '')
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
            textDisplay = `<span class="message-text">${escaped.replace(/\n/g, '<br>')}</span>`;
        }
        
        // Hora e edição badge
        const timeStr = window.formatMessageTime(m.timestamp);
        const editedBadge = m.edited && !m.deleted ? `<span class="message-badge-edited">(editado)</span>` : '';
        
        msgsHtml += `
            <div style="display:flex; gap:8px; justify-content: ${isSelf ? 'flex-end' : 'flex-start'}; align-items:flex-end;">
                ${!isSelf ? messageAvatarHtml : ''}
                <div class="message-wrapper ${isSelf ? 'self' : 'other'}">
                    ${actionsHtml}
                    <div class="message-bubble">
                        ${senderNameHtml}
                        ${textDisplay}
                        <div class="message-info-row">
                            <span>${timeStr}</span>
                            ${editedBadge}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Banner de edição se houver uma edição ativa
    let editModeHtml = '';
    let btnIcon = 'fa-paper-plane';
    if (window.editingMessageId) {
        btnIcon = 'fa-check';
        const msgToEdit = (window.chatMessagesData || []).find(x => x.id === window.editingMessageId);
        editModeHtml = `
            <div class="chat-edit-mode-banner">
                <span><i class="fas fa-edit"></i> Editando mensagem...</span>
                <span class="chat-edit-mode-cancel" onclick="window.cancelChatMessageEdit()">Cancelar</span>
            </div>
        `;
    }
    
    const headerActionsHtml = isGroup ? `
        <button class="message-action-btn" onclick="window.openGroupInfoModal('${window.activeChatId}')" title="Informações do Grupo" style="width: 35px; height: 35px; border-radius: 8px; font-size: 0.95rem; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
            <i class="fas fa-cog"></i>
        </button>
    ` : '';
    
    chatWindowEl.innerHTML = `
        <!-- Cabeçalho -->
        <header class="chat-header">
            <div class="chat-header-user">
                <!-- Botão voltar no Mobile -->
                <button class="btn-chat-back" onclick="window.closeChatMobile()" style="display:none;"><i class="fas fa-arrow-left"></i></button>
                
                <div style="display: flex; align-items: center; gap: 10px; ${!isGroup && window.activeChatId !== 'global' ? 'cursor: pointer;' : ''}" ${!isGroup && window.activeChatId !== 'global' ? `onclick="window.openChatUserProfile('${window.activeChatId}')"` : ''}>
                    <div class="chat-avatar" style="background-color: ${headerAvatarColor}; border-color: var(--border-color);">
                        ${headerAvatar}
                    </div>
                    <div class="chat-header-details">
                        <span class="chat-header-name">${title}</span>
                        <span class="chat-header-status">${statusText}</span>
                    </div>
                </div>
            </div>
            <div class="chat-header-actions">
                ${headerActionsHtml}
            </div>
        </header>
        
        <!-- Conteúdo do Histórico -->
        <div class="chat-messages-container" id="chatMessages">
            ${msgsHtml || `<div class="chat-empty-state"><i class="far fa-comments chat-empty-icon"></i><p>Nenhuma mensagem ainda. Escreva uma mensagem abaixo!</p></div>`}
        </div>
        
        <!-- Área de Digitação -->
        <div class="chat-input-area">
            ${editModeHtml}
            <div class="chat-input-bar">
                <div class="chat-input-wrapper">
                    <textarea id="chatInput" class="chat-input-textarea" placeholder="Escreva uma mensagem..." rows="1" onkeydown="window.handleChatInputKeyDown(event)"></textarea>
                </div>
                <button class="btn-chat-send" id="chatSendBtn" onclick="window.sendChatMessage()">
                    <i class="fas ${btnIcon}"></i>
                </button>
            </div>
        </div>
    `;
    
    // Auto-scroll para o fundo do histórico
    setTimeout(() => {
        const historyEl = document.getElementById('chatMessages');
        if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
        
        // Foca no textarea e restaura estado
        const txtInput = document.getElementById('chatInput');
        if (txtInput) {
            // Restaura o texto pendente se houver
            if (pendingText !== undefined && pendingText !== null && pendingText !== '') {
                txtInput.value = pendingText;
            }
            
            // Foca e restaura seleção se tinha foco
            if (hasFocus) {
                txtInput.focus();
                try {
                    txtInput.setSelectionRange(selStart, selEnd);
                } catch (e) {}
            }
            
            // Ajusta altura
            txtInput.style.height = 'auto';
            txtInput.style.height = (txtInput.scrollHeight) + 'px';
            
            // Re-adiciona listener para redimensionamento dinâmico
            txtInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
    }, 50);
    
    // Mostra/oculta elementos em view mobile
    const sidebar = document.getElementById('chatSidebar');
    const windowEl = document.getElementById('chatWindow');
    if (sidebar && windowEl && window.innerWidth <= 768) {
        sidebar.classList.add('hidden-mobile');
        windowEl.classList.add('show-mobile');
        
        // Corrige exibição do botão voltar
        const backBtn = windowEl.querySelector('.btn-chat-back');
        if (backBtn) backBtn.style.display = 'block';
    }
};

/**
 * Seleciona e abre um chat específico, zerando contador de não lidos
 */
window.openChat = function(chatId) {
    window.activeChatId = chatId;
    window.editingMessageId = null; // Cancela edição pendente
    
    // Limpa o input antes de trocar de chat
    const chatInputEl = document.getElementById('chatInput');
    if (chatInputEl) chatInputEl.value = '';
    
    // Marca como lidas no banco de dados e sincroniza
    window.markActiveChatAsRead();
    window.calculateUnreadCounts();
    
    window.renderChatSidebar();
    window.renderChatWindow();
};

/**
 * Fecha janela ativa no Mobile e retorna à lista de contatos
 */
window.closeChatMobile = function() {
    window.activeChatId = null;
    const chatInputEl = document.getElementById('chatInput');
    if (chatInputEl) chatInputEl.value = '';
    const sidebar = document.getElementById('chatSidebar');
    const windowEl = document.getElementById('chatWindow');
    if (sidebar && windowEl) {
        sidebar.classList.remove('hidden-mobile');
        windowEl.classList.remove('show-mobile');
    }
    window.renderChatSidebar();
};

/**
 * Envia uma nova mensagem ou atualiza uma existente (modo edição)
 */
window.sendChatMessage = function() {
    const inputEl = document.getElementById('chatInput');
    if (!inputEl) return;
    
    const text = inputEl.value.trim();
    if (!text) return;
    
    if (!window.chatMessagesData) window.chatMessagesData = [];
    
    const loggedInUser = window.loggedUser?.username || '';
    
    let isEgg = false;
    let textToSend = text;
    let eggCode = null;

    const textClean = text.trim();
    const nativeEggs = ['--gueguel--', '--bulldog--', '--converseiro--'];
    if (nativeEggs.includes(textClean)) {
        isEgg = true;
        eggCode = textClean;
        textToSend = '(código secreto enviado)';
    } else if (textClean.startsWith('--') && textClean.endsWith('--') && textClean.length > 4) {
        const codeName = textClean.slice(2, -2).trim().toLowerCase();
        const customEggs = window.customEasterEggs || [];
        const matchedEgg = customEggs.find(x => x.code.toLowerCase() === codeName);
        if (matchedEgg) {
            isEgg = true;
            eggCode = textClean;
            textToSend = '(código secreto enviado)';
        }
    }

    if (window.editingMessageId) {
        // MODO EDIÇÃO
        const msg = window.chatMessagesData.find(x => x.id === window.editingMessageId);
        if (msg) {
            msg.text = textToSend;
            if (isEgg) msg.easterEgg = eggCode;
            msg.edited = true;
            msg.editedAt = new Date().toISOString();
        }
        window.editingMessageId = null;
    } else {
        // MODO ENVIO NOVO
        const newMsgObj = {
            id: "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            sender: loggedInUser,
            recipient: window.activeChatId,
            text: textToSend,
            timestamp: new Date().toISOString(),
            edited: false,
            editedAt: null,
            deleted: false,
            deletedAt: null,
            readBy: [loggedInUser],
            deletedFor: []
        };
        if (isEgg) {
            newMsgObj.easterEgg = eggCode;
        }
        window.chatMessagesData.push(newMsgObj);
        if (typeof window.playSentSound === 'function') {
            window.playSentSound();
        }
    }
    
    // Limpa o input
    inputEl.value = '';
    inputEl.style.height = 'auto';
    
    // Salva local e sincroniza com servidor imediatamente
    if (typeof window.saveAll === 'function') {
        window.saveAll(true);
    }
    
    // Re-renderiza localmente
    window.renderChatSidebar();
    window.renderChatWindow();
};

/**
 * Configura o modo de edição para uma mensagem
 */
window.editChatMessage = function(msgId) {
    const msg = (window.chatMessagesData || []).find(x => x.id === msgId);
    if (!msg) return;
    
    window.editingMessageId = msgId;
    window.renderChatWindow();
    
    // Põe o texto no input e foca
    const inputEl = document.getElementById('chatInput');
    if (inputEl) {
        inputEl.value = msg.text || '';
        inputEl.focus();
        inputEl.style.height = 'auto';
        inputEl.style.height = (inputEl.scrollHeight) + 'px';
    }
};

/**
 * Cancela o modo de edição da mensagem
 */
window.cancelChatMessageEdit = function() {
    window.editingMessageId = null;
    const chatInputEl = document.getElementById('chatInput');
    if (chatInputEl) chatInputEl.value = '';
    window.renderChatWindow();
};

/**
 * Marca uma mensagem como "Apagada"
 */
window.deleteChatMessage = function(msgId) {
    if (!confirm("Tem certeza que deseja apagar esta mensagem?")) return;
    
    const msg = (window.chatMessagesData || []).find(x => x.id === msgId);
    if (msg) {
        msg.deleted = true;
        msg.deletedAt = new Date().toISOString();
        msg.text = ''; // limpa texto original por privacidade
        
        // Salva local e sincroniza com servidor imediatamente
        if (typeof window.saveAll === 'function') {
            window.saveAll(true);
        }
        
        window.renderChatWindow();
        window.renderChatSidebar();
    }
};

window.deleteChatMessageForMe = function(msgId) {
    if (!confirm("Tem certeza que deseja apagar esta mensagem para você? ela não aparecerá mais neste computador.")) return;
    
    const msg = (window.chatMessagesData || []).find(x => x.id === msgId);
    if (msg) {
        const loggedInUser = window.loggedUser?.username || '';
        if (!loggedInUser) return;
        
        if (!msg.deletedFor) {
            msg.deletedFor = [];
        }
        
        if (!msg.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
            msg.deletedFor.push(loggedInUser);
        }
        
        // Salva local e sincroniza com servidor imediatamente
        if (typeof window.saveAll === 'function') {
            window.saveAll(true);
        }
        
        window.renderChatWindow();
        window.renderChatSidebar();
    }
};

/**
 * Controla envio de mensagens ao pressionar Enter no Textarea
 */
window.handleChatInputKeyDown = function(event) {
    // Se pressionou Enter sem Shift, envia a mensagem
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendChatMessage();
    }
};

/**
 * Utilitários Auxiliares de Formatação de Data e Hora
 */
window.formatMessageTime = function(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
};

window.getDayDividerText = function(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Hoje';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ontem';
        } else {
            return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    } catch (e) {
        return '';
    }
};

// ==========================================================================
// FUNÇÕES DE GERENCIAMENTO DE GRUPOS
// ==========================================================================

window.openCreateGroupModal = function() {
    const modal = document.getElementById('modalCreateGroup');
    if (!modal) return;
    
    const nameInput = document.getElementById('newGroupName');
    if (nameInput) nameInput.value = '';
    
    const userListEl = document.getElementById('createGroupUsersList');
    if (userListEl) {
        const loggedInUser = window.loggedUser?.username || '';
        const allUsers = window.getAllUsers();
        
        let html = '';
        allUsers.forEach(u => {
            if (u.username.toLowerCase() === loggedInUser.toLowerCase()) return;
            
            let avatarHtml = '';
            if (u.avatarPhoto) {
                avatarHtml = `<img src="${u.avatarPhoto}" alt="Avatar" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" />`;
            } else {
                const color = u.avatarColor || '#3b82f6';
                const emoji = u.avatarEmoji || '👤';
                avatarHtml = `<div style="width:28px; height:28px; border-radius:50%; background-color:${color}; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">${emoji}</div>`;
            }
            
            html += `
                <label class="group-user-checkbox-label" style="margin-bottom: 4px;">
                    <input type="checkbox" name="createGroupUsers" value="${u.username}">
                    ${avatarHtml}
                    <span>${u.fullname || u.username}</span>
                </label>
            `;
        });
        userListEl.innerHTML = html;
    }
    
    modal.style.display = 'flex';
};

window.closeCreateGroupModal = function() {
    const modal = document.getElementById('modalCreateGroup');
    if (modal) modal.style.display = 'none';
};

window.submitCreateGroup = function() {
    const nameInput = document.getElementById('newGroupName');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
        alert("Por favor, insira o nome do grupo.");
        return;
    }
    
    const checkboxes = document.querySelectorAll('input[name="createGroupUsers"]:checked');
    const selectedUsernames = Array.from(checkboxes).map(cb => cb.value);
    
    window.createChatGroup(name, selectedUsernames);
    window.closeCreateGroupModal();
};

window.createChatGroup = function(name, selectedUsernames) {
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;
    
    const groupId = "group_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const members = [loggedInUser];
    
    selectedUsernames.forEach(username => {
        if (!members.includes(username)) {
            members.push(username);
        }
    });
    
    const newGroup = {
        id: groupId,
        name: name,
        photo: null,
        members: members,
        admins: [loggedInUser],
        createdBy: loggedInUser,
        createdAt: new Date().toISOString()
    };
    
    if (!window.chatGroupsData) window.chatGroupsData = [];
    window.chatGroupsData.push(newGroup);
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    window.activeChatId = groupId;
    window.renderChatSidebar();
    window.renderChatWindow();
};

window.openGroupInfoModal = function(groupId) {
    window.currentViewingGroupId = groupId;
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    const isAdmin = grp.admins && grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase());
    
    const avatarCircle = document.getElementById('groupInfoAvatarCircle');
    if (avatarCircle) {
        if (grp.photo) {
            avatarCircle.innerHTML = `<img src="${grp.photo}" style="width:100%; height:100%; object-fit:cover;" />`;
        } else {
            avatarCircle.innerHTML = '<i class="fas fa-users"></i>';
        }
        
        if (isAdmin) {
            avatarCircle.onclick = () => document.getElementById('groupPhotoInput').click();
            avatarCircle.style.cursor = 'pointer';
            avatarCircle.title = "Alterar Foto do Grupo";
        } else {
            avatarCircle.onclick = null;
            avatarCircle.style.cursor = 'default';
            avatarCircle.title = "";
        }
    }
    
    const nameInput = document.getElementById('groupInfoNameInput');
    if (nameInput) {
        nameInput.value = grp.name;
        nameInput.disabled = true;
        nameInput.style.borderBottom = '1px dashed transparent';
    }
    
    const btnEdit = document.getElementById('btnEditGroupName');
    if (btnEdit) btnEdit.style.display = isAdmin ? 'inline-block' : 'none';
    
    const btnSave = document.getElementById('btnSaveGroupName');
    if (btnSave) btnSave.style.display = 'none';
    
    const btnAdd = document.getElementById('btnAddMembersBtn');
    if (btnAdd) btnAdd.style.display = isAdmin ? 'inline-block' : 'none';
    
    const membersListEl = document.getElementById('groupInfoMembersList');
    if (membersListEl) {
        let html = '';
        const allUsers = window.getAllUsers();
        
        grp.members.forEach(mUsername => {
            const u = allUsers.find(x => x.username.toLowerCase() === mUsername.toLowerCase());
            const mName = u ? (u.fullname || u.username) : mUsername;
            
            const isMemAdmin = grp.admins && grp.admins.some(a => a.toLowerCase() === mUsername.toLowerCase());
            const isCreator = grp.createdBy && grp.createdBy.toLowerCase() === mUsername.toLowerCase();
            
            let badgeHtml = '';
            if (isCreator) {
                badgeHtml = `<span class="group-badge owner">Criador</span>`;
            } else if (isMemAdmin) {
                badgeHtml = `<span class="group-badge admin">Admin</span>`;
            }
            
            let memberAvatar = '';
            if (u && u.avatarPhoto) {
                memberAvatar = `<img src="${u.avatarPhoto}" alt="Avatar" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" />`;
            } else {
                const color = u ? (u.avatarColor || '#3b82f6') : '#94a3b8';
                const emoji = u ? (u.avatarEmoji || '👤') : '👤';
                memberAvatar = `<div style="width:32px; height:32px; border-radius:50%; background-color:${color}; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${emoji}</div>`;
            }
            
            let actionsHtml = '';
            const isSelf = mUsername.toLowerCase() === loggedInUser.toLowerCase();
            
            if (isAdmin && !isSelf) {
                const adminIcon = isMemAdmin ? 'fa-user-shield' : 'fa-shield-alt';
                const adminTitle = isMemAdmin ? 'Remover Admin' : 'Tornar Admin';
                const adminColor = isMemAdmin ? '#ef4444' : '#10b981';
                
                actionsHtml = `
                    <div style="display: flex; gap: 6px;">
                        <button class="message-action-btn" onclick="window.toggleGroupAdmin('${groupId}', '${mUsername}', ${!isMemAdmin})" title="${adminTitle}" style="color: ${adminColor}; border-color: rgba(0,0,0,0.1);">
                            <i class="fas ${adminIcon}"></i>
                        </button>
                        <button class="message-action-btn delete" onclick="window.removeGroupMember('${groupId}', '${mUsername}')" title="Remover do Grupo">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                `;
            }
            
            html += `
                <div class="group-member-item" style="margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${memberAvatar}
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 600; font-size: 0.82rem; color: var(--text-main);">${mName}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${u ? (u.role || 'Membro') : 'Membro'}</span>
                        </div>
                        ${badgeHtml}
                    </div>
                    ${actionsHtml}
                </div>
            `;
        });
        membersListEl.innerHTML = html;
    }
    
    document.getElementById('modalGroupInfo').style.display = 'flex';
};

window.closeGroupInfoModal = function() {
    const modal = document.getElementById('modalGroupInfo');
    if (modal) modal.style.display = 'none';
};

window.toggleGroupAdmin = function(groupId, username, makeAdmin) {
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!grp.admins || !grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase())) {
        alert("Apenas administradores podem gerenciar cargos.");
        return;
    }
    
    if (!grp.admins) grp.admins = [];
    
    if (makeAdmin) {
        if (!grp.admins.some(a => a.toLowerCase() === username.toLowerCase())) {
            grp.admins.push(username);
        }
    } else {
        if (grp.admins.length === 1 && grp.admins.some(a => a.toLowerCase() === username.toLowerCase())) {
            alert("O grupo deve ter pelo menos um administrador.");
            return;
        }
        grp.admins = grp.admins.filter(a => a.toLowerCase() !== username.toLowerCase());
    }
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    window.openGroupInfoModal(groupId);
};

window.removeGroupMember = function(groupId, username) {
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!grp.admins || !grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase())) {
        alert("Apenas administradores podem remover membros.");
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${username} do grupo?`)) {
        grp.members = grp.members.filter(m => m.toLowerCase() !== username.toLowerCase());
        grp.admins = grp.admins.filter(a => a.toLowerCase() !== username.toLowerCase());
        
        if (typeof window.saveAll === 'function') {
            window.saveAll();
        }
        
        window.openGroupInfoModal(groupId);
        window.renderChatSidebar();
        window.renderChatWindow();
    }
};

window.enableGroupRename = function() {
    const nameInput = document.getElementById('groupInfoNameInput');
    if (nameInput) {
        nameInput.disabled = false;
        nameInput.focus();
        nameInput.style.borderBottom = '1px dashed var(--primary)';
    }
    
    const btnEdit = document.getElementById('btnEditGroupName');
    if (btnEdit) btnEdit.style.display = 'none';
    
    const btnSave = document.getElementById('btnSaveGroupName');
    if (btnSave) btnSave.style.display = 'inline-block';
};

window.saveGroupName = function() {
    const groupId = window.currentViewingGroupId;
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!grp.admins || !grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase())) {
        alert("Apenas administradores podem alterar o nome do grupo.");
        return;
    }
    
    const nameInput = document.getElementById('groupInfoNameInput');
    const newName = nameInput ? nameInput.value.trim() : '';
    if (!newName) {
        alert("O nome do grupo não pode ser vazio.");
        return;
    }
    
    grp.name = newName;
    
    if (nameInput) {
        nameInput.disabled = true;
        nameInput.style.borderBottom = '1px dashed transparent';
    }
    
    const btnEdit = document.getElementById('btnEditGroupName');
    if (btnEdit) btnEdit.style.display = 'inline-block';
    
    const btnSave = document.getElementById('btnSaveGroupName');
    if (btnSave) btnSave.style.display = 'none';
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    window.renderChatSidebar();
    window.renderChatWindow();
};

window.uploadGroupPhoto = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const groupId = window.currentViewingGroupId;
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!grp.admins || !grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase())) {
        alert("Apenas administradores podem alterar a foto do grupo.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 150;
            const MAX_HEIGHT = 150;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            grp.photo = dataUrl;
            
            const avatarCircle = document.getElementById('groupInfoAvatarCircle');
            if (avatarCircle) {
                avatarCircle.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
            }
            
            if (typeof window.saveAll === 'function') {
                window.saveAll();
            }
            
            window.renderChatSidebar();
            window.renderChatWindow();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.openAddMembersModal = function() {
    const groupId = window.currentViewingGroupId;
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const listEl = document.getElementById('addMembersUsersList');
    if (!listEl) return;
    
    const allUsers = window.getAllUsers();
    const nonMembers = allUsers.filter(u => 
        !grp.members.some(m => m.toLowerCase() === u.username.toLowerCase())
    );
    
    let html = '';
    if (nonMembers.length === 0) {
        html = `<div style="text-align: center; font-size: 0.85rem; color: var(--text-muted); padding: 15px;">Todos os usuários já fazem parte deste grupo.</div>`;
    } else {
        nonMembers.forEach(u => {
            let avatarHtml = '';
            if (u.avatarPhoto) {
                avatarHtml = `<img src="${u.avatarPhoto}" alt="Avatar" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" />`;
            } else {
                const color = u.avatarColor || '#3b82f6';
                const emoji = u.avatarEmoji || '👤';
                avatarHtml = `<div style="width:28px; height:28px; border-radius:50%; background-color:${color}; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">${emoji}</div>`;
            }
            
            html += `
                <label class="group-user-checkbox-label" style="margin-bottom: 6px;">
                    <input type="checkbox" name="addMembersUsers" value="${u.username}">
                    ${avatarHtml}
                    <span>${u.fullname || u.username}</span>
                </label>
            `;
        });
    }
    
    listEl.innerHTML = html;
    document.getElementById('modalAddMembers').style.display = 'flex';
};

window.submitAddMembers = function() {
    const groupId = window.currentViewingGroupId;
    const grp = (window.chatGroupsData || []).find(g => g.id === groupId);
    if (!grp) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!grp.admins || !grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase())) {
        alert("Apenas administradores podem adicionar membros.");
        return;
    }
    
    const checkboxes = document.querySelectorAll('input[name="addMembersUsers"]:checked');
    const selectedUsernames = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedUsernames.length === 0) {
        document.getElementById('modalAddMembers').style.display = 'none';
        return;
    }
    
    selectedUsernames.forEach(username => {
        if (!grp.members.some(m => m.toLowerCase() === username.toLowerCase())) {
            grp.members.push(username);
        }
    });
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    document.getElementById('modalAddMembers').style.display = 'none';
    window.openGroupInfoModal(groupId);
    window.renderChatSidebar();
    window.renderChatWindow();
};

window.leaveGroupFromModal = function() {
    const groupId = window.currentViewingGroupId;
    if (confirm("Tem certeza que deseja sair do grupo?")) {
        window.leaveGroup(groupId);
    }
};

window.leaveGroup = function(groupId) {
    const grpIndex = (window.chatGroupsData || []).findIndex(g => g.id === groupId);
    if (grpIndex === -1) return;
    
    const grp = window.chatGroupsData[grpIndex];
    const loggedInUser = window.loggedUser?.username || '';
    
    grp.members = grp.members.filter(m => m.toLowerCase() !== loggedInUser.toLowerCase());
    
    const wasAdmin = grp.admins && grp.admins.some(a => a.toLowerCase() === loggedInUser.toLowerCase());
    if (wasAdmin) {
        grp.admins = grp.admins.filter(a => a.toLowerCase() !== loggedInUser.toLowerCase());
    }
    
    if (grp.members.length === 0) {
        window.chatGroupsData.splice(grpIndex, 1);
    } else {
        if (!grp.admins || grp.admins.length === 0) {
            grp.admins = [];
            const nextAdmin = grp.members[0];
            grp.admins.push(nextAdmin);
        }
    }
    
    if (typeof window.saveAll === 'function') {
        window.saveAll();
    }
    
    window.closeGroupInfoModal();
    const addModal = document.getElementById('modalAddMembers');
    if (addModal) addModal.style.display = 'none';
    
    window.activeChatId = 'global';
    window.renderChatSidebar();
    window.renderChatWindow();
};

window.onChatUserContextMenu = function(e, targetId, type) {
    e.preventDefault();
    e.stopPropagation();
    
    const menu = document.getElementById('ctxMenuChat');
    if (!menu) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;
    
    const pinnedKey = loggedInUser + '_chat_pinned';
    let pinnedList = [];
    try { pinnedList = JSON.parse(localStorage.getItem(pinnedKey)) || []; } catch(err) {}
    const isPinned = pinnedList.includes(targetId);
    
    let html = '';
    
    if (targetId !== 'global') {
        html += `
            <div class="ctx-item" onclick="window.setChatNickname('${targetId}')">
                <i class="fas fa-edit"></i> Apelidar
            </div>
        `;
    }
    
    html += `
        <div class="ctx-item" onclick="window.togglePinChat('${targetId}')">
            <i class="fas fa-thumbtack"></i> ${isPinned ? 'Desafixar' : 'Fixar no Topo'}
        </div>
    `;
    
    html += `
        <div class="ctx-item" style="color: red;" onclick="window.clearChatMessagesForMe('${targetId}', '${type}')">
            <i class="fas fa-trash-alt"></i> Excluir Mensagens
        </div>
    `;
    
    menu.innerHTML = html;
    menu.style.display = 'block';
    
    const x = e.clientX;
    const y = e.clientY;
    
    const menuWidth = 200;
    const menuHeight = 120;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    if (x + menuWidth > windowWidth) {
        left = windowWidth - menuWidth - 10;
    }
    if (y + menuHeight > windowHeight) {
        top = windowHeight - menuHeight - 10;
    }
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
};

window.setChatNickname = function(targetId) {
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;
    
    const nicknamesKey = loggedInUser + '_chat_nicknames';
    let nicknames = {};
    try { nicknames = JSON.parse(localStorage.getItem(nicknamesKey)) || {}; } catch(err) {}
    
    const currentNickname = nicknames[targetId] || '';
    const newNickname = prompt("Digite o apelido para esta conversa (deixe em branco para remover):", currentNickname);
    
    if (newNickname === null) return;
    
    if (newNickname.trim() === '') {
        delete nicknames[targetId];
    } else {
        nicknames[targetId] = newNickname.trim();
    }
    
    localStorage.setItem(nicknamesKey, JSON.stringify(nicknames));
    
    window.renderChatSidebar();
    window.renderChatWindow();
};

window.togglePinChat = function(targetId) {
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;
    
    const pinnedKey = loggedInUser + '_chat_pinned';
    let pinnedList = [];
    try { pinnedList = JSON.parse(localStorage.getItem(pinnedKey)) || []; } catch(err) {}
    
    if (pinnedList.includes(targetId)) {
        pinnedList = pinnedList.filter(id => id !== targetId);
    } else {
        pinnedList.push(targetId);
    }
    
    localStorage.setItem(pinnedKey, JSON.stringify(pinnedList));
    window.renderChatSidebar();
};

window.clearChatMessagesForMe = function(targetId, type) {
    if (!confirm("Tem certeza que deseja apagar o histórico de mensagens desta conversa para você?")) return;
    
    const loggedInUser = window.loggedUser?.username || '';
    if (!loggedInUser) return;
    
    let changed = false;
    const messages = window.chatMessagesData || [];
    
    messages.forEach(m => {
        let match = false;
        if (targetId === 'global' && m.recipient === 'global') {
            match = true;
        } else if (type === 'group' && m.recipient === targetId) {
            match = true;
        } else if (type === 'dm' && (
            (m.sender === loggedInUser && m.recipient === targetId) ||
            (m.sender === targetId && m.recipient === loggedInUser)
        )) {
            match = true;
        }
        
        if (match) {
            if (!m.deletedFor) {
                m.deletedFor = [];
            }
            if (!m.deletedFor.some(u => u.toLowerCase() === loggedInUser.toLowerCase())) {
                m.deletedFor.push(loggedInUser);
                changed = true;
            }
        }
    });
    
    if (changed) {
        if (typeof window.saveAll === 'function') {
            window.saveAll(true);
        }
        window.calculateUnreadCounts();
        window.renderChatSidebar();
        window.renderChatWindow();
    }
};
