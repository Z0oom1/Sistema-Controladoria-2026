// =========================================================
// MÓDULO DE NOTIFICAÇÕES E ÁUDIO
// =========================================================

// Contexto de áudio global para o sistema
window.globalAudioCtx = null;

// Solicitação inicial de permissão para notificações
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Desbloqueia o AudioContext após o primeiro clique do utilizador
document.addEventListener('click', function unlockAudio() {
    if (!window.globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            window.globalAudioCtx = new AudioContext();
            const osc = window.globalAudioCtx.createOscillator(); 
            const gain = window.globalAudioCtx.createGain();
            gain.gain.value = 0; 
            osc.connect(gain); 
            gain.connect(window.globalAudioCtx.destination);
            osc.start(0); 
            osc.stop(0.1);
        }
    }
    document.removeEventListener('click', unlockAudio);
});

// Gera um som de bipe eletrónico
window.playBeep = function() {
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
        osc.frequency.value = 550;
        const now = ctx.currentTime; 
        gain.gain.setValueAtTime(0, now); 
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now); 
        osc.stop(now + 0.8);
    } catch (e) { 
        console.warn("Audio blocked:", e); 
    }
};

// Envia uma notificação sonora e visual
window.sendSystemNotification = function(title, body, targetView, targetId) {
    window.playBeep();
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        window.createVisualNotification(title, body, targetView, targetId);
    }
};

// Cria a notificação nativa do navegador
window.createVisualNotification = function(title, body, targetView, targetId) {
    try {
        const notif = new Notification(title, { 
            body: body, 
            icon: '/img/logo-sf.png' 
        });
        notif.onclick = function () { 
            window.focus(); 
            if (targetView && typeof window.navTo === 'function') {
                window.navTo(targetView);
            } 
            if (targetId && targetView === 'mapas' && typeof window.loadMap === 'function') {
                window.loadMap(targetId);
            } 
            this.close(); 
        };
    } catch (e) { 
        console.error("Notif error", e); 
    }
};

// Solicita permissão manualmente e envia teste
window.manualRequestPermission = function() {
    if (!("Notification" in window)) {
        alert("Este navegador não suporta notificações de sistema.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            window.playBeep();
            new Notification("Configuração", {
                body: "Notificações ativadas com sucesso!",
                icon: '../Imgs/logo-sf.png'
            });
        } else {
            alert("Permissão para notificações foi negada ou bloqueada pelo navegador.");
        }
    });
};