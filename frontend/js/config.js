// --- CONFIGURAÇÃO DO SUPABASE ---
window.VITE_SUPABASE_URL = "https://abmjqotikqfailjvylhu.supabase.co";
window.VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWpxb3Rpa3FmYWlsanZ5bGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDQyMTMsImV4cCI6MjA5NzE4MDIxM30.g7cXuTRhgs9wu-sHJiJGnUGL8zxEbNxHt37oTCngwOI";

const supabaseUrl = window.VITE_SUPABASE_URL;
const supabaseKey = window.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase Client inicializado com sucesso.");
} else {
    console.log("ℹ️ Supabase não configurado ou biblioteca não carregada. Usando fallback local.");
}

const SERVER_IP = "localhost"; // Em vez de 192.168.2.106
const SERVER_PORT = "2006";
window.API_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
var API_BASE_URL = window.API_BASE_URL;

// --- FORMATADOR DE PRODUTO ---
window.formatProductName = function(name) {
    if (!name) return '---';
    const trimmed = name.trim();
    if (trimmed.length <= 15) {
        return trimmed;
    }
    
    // Lista de preposições comuns em português
    const preposicoes = ["DE", "DA", "DO", "COM", "PARA", "E", "EM", "UM", "UMA", "UN"];
    
    // Obter palavras ignorando preposições
    const words = trimmed.split(/\s+/).filter(w => !preposicoes.includes(w.toUpperCase()));
    
    if (words.length === 0) return trimmed.substring(0, 12) + '...';
    
    const firstWord = words[0];
    if (words.length === 1) {
        return firstWord;
    }
    
    let secondWord = words[1];
    if (secondWord.length > 4) {
        secondWord = secondWord.substring(0, 4) + '...';
    }
    
    return firstWord + ' ' + secondWord;
};

// --- CUSTOM ALERT OVERRIDE ---
window.alert = function(message) {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.className = 'custom-alert-overlay';
        overlay.style.display = 'none';
        
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-header">
                    <img src="../Imgs/logo-sf.png" class="custom-alert-logo" alt="Logo">
                    <span class="custom-alert-title">Controladoria AW</span>
                    <button class="custom-alert-close" onclick="window.closeCustomAlert()"><i class="fas fa-times"></i></button>
                </div>
                <div class="custom-alert-body">
                    <div class="custom-alert-icon">
                        <i id="custom-alert-icon-i" class="fas fa-info-circle"></i>
                    </div>
                    <div id="custom-alert-text" class="custom-alert-text"></div>
                </div>
                <div class="custom-alert-footer">
                    <button class="btn btn-save custom-alert-btn" onclick="window.closeCustomAlert()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    const textEl = document.getElementById('custom-alert-text');
    const iconEl = document.getElementById('custom-alert-icon-i');
    const boxEl = overlay.querySelector('.custom-alert-box');
    
    textEl.innerText = message;
    
    const msgUpper = message.toUpperCase();
    if (msgUpper.includes('ERRO') || msgUpper.includes('NEGADO') || msgUpper.includes('FALHOU') || msgUpper.includes('INVÁLIDO')) {
        boxEl.className = 'custom-alert-box type-error';
        iconEl.className = 'fas fa-exclamation-triangle';
    } else if (msgUpper.includes('SUCESSO') || msgUpper.includes('APROVADO') || msgUpper.includes('RESOLVIDA') || msgUpper.includes('RESETADO') || msgUpper.includes('EXCLUÍDO') || msgUpper.includes('FINALIZAR')) {
        boxEl.className = 'custom-alert-box type-success';
        iconEl.className = 'fas fa-check-circle';
    } else {
        boxEl.className = 'custom-alert-box type-info';
        iconEl.className = 'fas fa-info-circle';
    }
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
};

window.closeCustomAlert = function() {
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
};

// --- CUSTOM TOOLTIP SYSTEM ---
let tooltipTimeout = null;
let tooltipEl = null;

document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-fullname]');
    if (!target) return;
    
    clearTimeout(tooltipTimeout);
    
    tooltipTimeout = setTimeout(() => {
        const fullname = target.getAttribute('data-fullname');
        if (!fullname) return;
        
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'custom-system-tooltip';
            document.body.appendChild(tooltipEl);
        }
        
        tooltipEl.textContent = fullname;
        tooltipEl.style.display = 'block';
        
        const rect = target.getBoundingClientRect();
        tooltipEl.style.left = `${rect.left + window.scrollX}px`;
        tooltipEl.style.top = `${rect.bottom + window.scrollY + 6}px`;
        
        // Ensure tooltip stays within screen bounds
        const tooltipRect = tooltipEl.getBoundingClientRect();
        if (rect.left + tooltipRect.width > window.innerWidth) {
            tooltipEl.style.left = `${window.innerWidth - tooltipRect.width - 15}px`;
        }
        
        setTimeout(() => {
            tooltipEl.classList.add('visible');
        }, 10);
    }, 1500); // 1.5s delay
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-fullname]');
    if (!target) return;
    
    clearTimeout(tooltipTimeout);
    if (tooltipEl) {
        tooltipEl.classList.remove('visible');
        tooltipEl.style.display = 'none';
    }
});