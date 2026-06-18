// ===================================================================================
//          WILSON CORE 2.4.3 - Update - FUNCIONALIDADES & LOGICAS PRINCIPAIS         
// ===================================================================================

// =========================================================
// MÓDULO DE VALIDAÇÃO E SEGURANÇA DE DADOS
// =========================================================

// Tornamos a função global para que possa ser usada por outros módulos
window.getBrazilTime = function() {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString();
};

window.formatDuration = function(ms) {
    if (isNaN(ms) || ms < 0) return '---';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
};

window.Validators = {
    cleanName: (txt) => {
        if (!txt) return '';
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(txt)) {
            alert("ERRO: Nomes não podem conter números ou caracteres especiais.");
            return null;
        }
        return txt.toUpperCase().trim();
    },

    cleanNumber: (txt) => {
        if (!txt) return '';
        return txt.replace(/\D/g, ''); // Remove tudo que não é dígito
    },

    validatePlate: (txt) => {
        if (!txt) return null;
        const raw = txt.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const regexPlaca = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

        if (!regexPlaca.test(raw)) {
            alert("ERRO: Formato de placa inválido. Use ABC1234 ou ABC1D23.");
            return null;
        }
        return raw.substring(0, 3) + '-' + raw.substring(3); // Formata visualmente
    }
};

window.getBaseUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = "2006"; // Porta ajustada conforme server.js
    if (protocol === 'file:') {
        return `http://localhost:${port}`;
    } else {
        return `${protocol}//${hostname}:${port}`;
    }
};

window.API_URL = window.getBaseUrl();
console.log("Conectando ao servidor em:", window.API_URL);

// O Socket também precisa de ser acessível globalmente se for usado em outros ficheiros
try {
    if (typeof io !== 'undefined') {
        window.socket = io(window.API_URL);

        window.socket.on('connect', () => {
            console.log("Socket conectado!", window.socket.id);
        });

        window.socket.on('atualizar_sistema', (data) => {
            console.log("Recebida atualização do servidor:", data);
            if (typeof window.loadDataFromServer === 'function') {
                window.loadDataFromServer();
            }
        });
    } else if (!window.supabaseClient) {
        console.error("ERRO: Socket.io não foi carregado no HTML.");
    }
} catch (e) {
    console.warn("Erro ao iniciar Socket:", e);
}