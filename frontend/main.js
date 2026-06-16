const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');

// Verifica se estamos rodando pelo comando 'npm run dev'
const isDev = process.env.npm_lifecycle_event === "dev";

// --- CONFIGURAÇÃO DE REDE ---
// Coloque aqui o MESMO IP que você colocou no arquivo frontend/js/config.js
const SERVER_IP = "192.168.0.100"; // <--- ALTERE AQUI PARA O SEU IP
const SERVER_PORT = 2006;
const VITE_PORT = 5173;

// app.disableHardwareAcceleration(); // Reativado para aceleração por GPU (melhor performance de renderização)

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        autoHideMenuBar: true,
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'Imgs', 'logo.png'),
        webPreferences: {
            nodeIntegration: true, // Necessário para sua arquitetura atual
            contextIsolation: false,
            webSecurity: false // Permite carregar recursos locais e remotos misturados
        }
    });

    if (process.platform === 'darwin') {
        const image = nativeImage.createFromPath(path.join(__dirname, 'Imgs', 'logo.png'));
        app.dock.setIcon(image);
    }

    if (isDev) {
        // --- MODO DESENVOLVIMENTO (Vite + Hot Reload) ---
        console.log(`⚡ Modo DEV: Carregando via Vite na porta ${VITE_PORT}`);
        
        // No modo dev, usamos o localhost do Vite
        win.loadURL(`http://localhost:${VITE_PORT}/pages/login.html`);
        
        // Abre o Inspecionar Elemento para ajudar no debug
        win.webContents.openDevTools({ mode: 'detach' });

    } else {
        // --- MODO PRODUÇÃO / REDE ---
        // Aqui está a mudança: Tentamos carregar do IP do Servidor primeiro.
        // Isso é útil se você quiser servir a interface pelo servidor Node.
        // Se falhar (offline), carregamos o arquivo local.
        
        const serverUrl = `http://${SERVER_IP}:${SERVER_PORT}/`;
        console.log(`🚀 Tentando conectar ao servidor: ${serverUrl}`);

        win.loadURL(serverUrl).catch((err) => {
            console.log("⚠️ Servidor não encontrado ou offline. Carregando arquivos locais.");
            // Fallback: Carrega o arquivo físico do computador
            win.loadFile(path.join(__dirname, 'pages', 'login.html'));
        });
    }

    // --- SEUS CONTROLES DE JANELA (Mantidos) ---
    ipcMain.on('minimize-app', () => win.minimize());
    
    ipcMain.on('maximize-app', () => {
        win.isMaximized() ? win.unmaximize() : win.maximize();
    });

    ipcMain.on('close-app', () => win.close());

    win.on('closed', () => {
        ipcMain.removeAllListeners('minimize-app');
        ipcMain.removeAllListeners('maximize-app');
        ipcMain.removeAllListeners('close-app');
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});