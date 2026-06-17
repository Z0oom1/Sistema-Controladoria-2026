// ==========================================================================
// MÓDULO DE CHAT EM TEMPO REAL - WILSON SYSTEM
// ==========================================================================

// Estado interno do Chat
window.activeChatId = 'global'; // Chat Geral por padrão
window.chatUnreadCounts = {};
window.editingMessageId = null;

// Inicialização automática do módulo
(function initChatModule() {
    console.log("Wilson Chat: Módulo inicializado.");
    
    // Inscreve no monitoramento de novas mensagens de forma reativa
    if (window.appState) {
        window.appState.watch('chatMessages', (newMsgs, oldMsgs) => {
            const oldList = oldMsgs || [];
            const newList = newMsgs || [];
            
            // Se o número de mensagens aumentou, identifica as novas
            if (newList.length > oldList.length) {
                const newAdded = newList.filter(m => !oldList.some(o => o.id === m.id));
                const loggedInUser = window.loggedUser?.username || '';
                
                let receivedNew = false;
                newAdded.forEach(m => {
                    // Ignora mensagens enviadas pelo próprio usuário
                    if (m.sender === loggedInUser) return;
                    
                    // Verifica se a mensagem é endereçada a este usuário ou canal global
                    const isForMe = m.recipient === 'global' || m.recipient === loggedInUser;
                    if (!isForMe) return;
                    
                    const chatKey = m.recipient === 'global' ? 'global' : m.sender;
                    
                    // Se não estiver visualizando este chat específico ou se a aba ativa não for o chat
                    const currentView = localStorage.getItem('aw_last_view');
                    if (window.activeChatId !== chatKey || currentView !== 'chat') {
                        window.chatUnreadCounts[chatKey] = (window.chatUnreadCounts[chatKey] || 0) + 1;
                        receivedNew = true;
                        
                        // Notificação de sistema
                        const senderDisplay = m.sender;
                        const bodyMsg = m.deleted ? "Mensagem apagada" : (m.text || "Nova mensagem");
                        
                        if (typeof window.sendSystemNotification === 'function') {
                            window.sendSystemNotification(
                                `Chat: Mensagem de ${senderDisplay}`,
                                bodyMsg,
                                'chat'
                            );
                        }
                    }
                });
                
                // Toca alerta sonoro e atualiza os badges visuais
                if (receivedNew) {
                    if (typeof window.playBeep === 'function') window.playBeep();
                }
                
                window.updateChatBadges();
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
                <div class="chat-search-wrapper">
                    <div class="chat-search-input-group">
                        <i class="fas fa-search"></i>
                        <input type="text" id="chatSearch" placeholder="Buscar contato..." onkeyup="window.renderChatSidebar()">
                    </div>
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
    
    let html = '';
    
    // 1. Canal Global (Chat Geral)
    const isGlobalActive = window.activeChatId === 'global';
    const globalUnread = window.chatUnreadCounts['global'] || 0;
    
    // Obter última mensagem do chat geral para exibir no preview
    const globalMsgs = (window.chatMessagesData || []).filter(m => m.recipient === 'global');
    const lastGlobalMsg = globalMsgs[globalMsgs.length - 1];
    let globalPreview = 'Canal Público da Empresa';
    if (lastGlobalMsg) {
        const prefix = lastGlobalMsg.sender === loggedInUser ? 'Você: ' : `${lastGlobalMsg.sender}: `;
        globalPreview = lastGlobalMsg.deleted ? `${prefix}Mensagem apagada` : `${prefix}${lastGlobalMsg.text}`;
    }
    
    html += `
        <div class="chat-user-item ${isGlobalActive ? 'active' : ''}" onclick="window.openChat('global')">
            <div class="chat-avatar" style="background-color: var(--primary); color: white;">
                <i class="fas fa-users"></i>
            </div>
            <div class="chat-user-info">
                <div class="chat-user-name-row">
                    <span class="chat-user-name">Chat Geral (Todos)</span>
                    ${globalUnread > 0 ? `<span class="chat-user-badge">${globalUnread}</span>` : ''}
                </div>
                <div class="chat-user-role" style="font-weight: ${globalUnread > 0 ? '600' : 'normal'}; color: ${globalUnread > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${globalPreview}</div>
            </div>
        </div>
    `;
    
    // Linha divisória de canais/DMs
    html += `<div style="height: 1px; background: var(--border-color); margin: 6px 10px; opacity: 0.5;"></div>`;
    
    // 2. Direct Messages (Usuários)
    const allUsers = window.getAllUsers();
    
    // Filtra usuários pelo termo de busca e exclui o próprio usuário logado
    const filteredUsers = allUsers.filter(u => {
        if (u.username.toLowerCase() === loggedInUser.toLowerCase()) return false;
        return u.username.toLowerCase().includes(searchTerm) || 
               (u.fullname || '').toLowerCase().includes(searchTerm);
    }).sort((a, b) => a.username.localeCompare(b.username));
    
    if (filteredUsers.length === 0) {
        html += `<div style="padding: 20px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">Nenhum contato encontrado</div>`;
    } else {
        filteredUsers.forEach(u => {
            const isActive = window.activeChatId === u.username;
            const unread = window.chatUnreadCounts[u.username] || 0;
            
            // Preview da última mensagem
            const dmMsgs = (window.chatMessagesData || []).filter(m => 
                (m.sender === loggedInUser && m.recipient === u.username) ||
                (m.sender === u.username && m.recipient === loggedInUser)
            );
            const lastDm = dmMsgs[dmMsgs.length - 1];
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
            
            // Indicador de "Online" Mockado (Admin e usuários com atividade recente)
            const isOnline = u.username.toLowerCase() === 'admin' || u.username.toLowerCase() === 'caio' || u.firstLogin === false;
            
            html += `
                <div class="chat-user-item ${isActive ? 'active' : ''}" onclick="window.openChat('${u.username}')">
                    <div class="chat-avatar">
                        ${avatarHtml}
                        <div class="chat-avatar-status ${isOnline ? 'online' : ''}"></div>
                    </div>
                    <div class="chat-user-info">
                        <div class="chat-user-name-row">
                            <span class="chat-user-name">${u.fullname || u.username}</span>
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
 * Renderiza o corpo da janela de Chat selecionada
 */
window.renderChatWindow = function() {
    const chatWindowEl = document.getElementById('chatWindow');
    if (!chatWindowEl) return;
    
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
    
    const loggedInUser = window.loggedUser?.username || '';
    
    // Obter dados do chat atual
    let title = 'Chat Geral';
    let statusText = 'Canal público de comunicação';
    let headerAvatar = `<i class="fas fa-users"></i>`;
    let headerAvatarColor = 'var(--primary)';
    
    if (window.activeChatId !== 'global') {
        const u = window.getAllUsers().find(x => x.username === window.activeChatId);
        title = u ? (u.fullname || u.username) : window.activeChatId;
        const role = u ? (u.role || 'Usuário') : 'Externo';
        const sector = u ? (u.sector || 'Geral') : '';
        statusText = `${role.toUpperCase()} ${sector ? '- ' + sector.toUpperCase() : ''}`;
        
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
    
    // Filtrar mensagens para a conversa atual
    let filteredMsgs = [];
    if (window.activeChatId === 'global') {
        filteredMsgs = (window.chatMessagesData || []).filter(m => m.recipient === 'global');
    } else {
        filteredMsgs = (window.chatMessagesData || []).filter(m => 
            (m.sender === loggedInUser && m.recipient === window.activeChatId) ||
            (m.sender === window.activeChatId && m.recipient === loggedInUser)
        );
    }
    
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
        
        // Detalhes do remetente (necessário no chat geral)
        let senderNameHtml = '';
        let messageAvatarHtml = '';
        
        if (window.activeChatId === 'global' && !isSelf) {
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
        
        // Ações da mensagem (editar/excluir) para mensagens próprias que não estejam apagadas
        let actionsHtml = '';
        if (isSelf && !m.deleted) {
            actionsHtml = `
                <div class="message-actions-trigger">
                    <button class="message-action-btn" onclick="window.editChatMessage('${m.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="message-action-btn delete" onclick="window.deleteChatMessage('${m.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
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
    
    chatWindowEl.innerHTML = `
        <!-- Cabeçalho -->
        <header class="chat-header">
            <div class="chat-header-user">
                <!-- Botão voltar no Mobile -->
                <button class="btn-chat-back" onclick="window.closeChatMobile()" style="display:none;"><i class="fas fa-arrow-left"></i></button>
                
                <div class="chat-avatar" style="background-color: ${headerAvatarColor}; border-color: var(--border-color);">
                    ${headerAvatar}
                </div>
                <div class="chat-header-details">
                    <span class="chat-header-name">${title}</span>
                    <span class="chat-header-status">${statusText}</span>
                </div>
            </div>
            <div class="chat-header-actions">
                <!-- Ações adicionais se necessário -->
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
        
        // Foca no textarea
        const txtInput = document.getElementById('chatInput');
        if (txtInput) txtInput.focus();
        
        // Ajusta textarea height dinamicamente
        if (txtInput) {
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
    
    // Zera notificações não lidas para esta conversa
    window.chatUnreadCounts[chatId] = 0;
    window.updateChatBadges();
    
    window.renderChatSidebar();
    window.renderChatWindow();
};

/**
 * Fecha janela ativa no Mobile e retorna à lista de contatos
 */
window.closeChatMobile = function() {
    window.activeChatId = null;
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
    
    if (window.editingMessageId) {
        // MODO EDIÇÃO
        const msg = window.chatMessagesData.find(x => x.id === window.editingMessageId);
        if (msg) {
            msg.text = text;
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
            text: text,
            timestamp: new Date().toISOString(),
            edited: false,
            editedAt: null,
            deleted: false,
            deletedAt: null
        };
        window.chatMessagesData.push(newMsgObj);
    }
    
    // Limpa o input
    inputEl.value = '';
    inputEl.style.height = 'auto';
    
    // Salva local e sincroniza com servidor
    if (typeof window.saveAll === 'function') {
        window.saveAll();
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
        
        // Salva local e sincroniza com servidor
        if (typeof window.saveAll === 'function') {
            window.saveAll();
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
