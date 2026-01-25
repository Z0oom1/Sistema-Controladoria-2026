const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

const PORT = 2006
const DB_FILE = 'database.sqlite'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] }
})

app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

// --- CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, '../frontend')))

// Rota Raiz: Entrega o LOGIN.HTML
app.get('/', (req, res) => {
    const loginPath = path.join(__dirname, '../frontend/pages/login.html')
    res.sendFile(loginPath, (err) => {
        if (err) res.status(500).send(`Erro ao carregar login: ${err.message}`)
    })
})

// --- Banco de Dados ---
const dbPath = path.resolve(__dirname, DB_FILE)
const db = new sqlite3.Database(dbPath, (err) => {
    if (!err) initDb()
})

function initDb() {
    db.run('PRAGMA journal_mode = WAL;')
    db.run(`CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT
    )`)
}

// --- Socket.IO ---
io.on('connection', (socket) => {
    socket.on('pedir_dados', () => io.emit('atualizar_sistema'))
})

// --- Rotas API ---
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', uptime: process.uptime() })
})

app.get('/api/sync', (req, res) => {
    db.all(`SELECT * FROM app_data`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message })
        const data = {}
        rows.forEach(row => {
            try { data[row.key] = JSON.parse(row.value) } 
            catch { data[row.key] = row.value }
        })
        res.json(data)
    })
})

app.post('/api/sync', (req, res) => {
    const { key, data } = req.body
    if (!key || data === undefined) return res.status(400).json({ error: 'Parâmetros inválidos' })
    
    let jsonStr
    try { jsonStr = typeof data === 'string' ? data : JSON.stringify(data) } 
    catch { return res.status(400).json({ error: 'JSON inválido' }) }

    const sql = `INSERT INTO app_data (key, value) VALUES (?, ?) 
                 ON CONFLICT(key) DO UPDATE SET value=excluded.value`

    db.run(sql, [key, jsonStr], (err) => {
        if (err) return res.status(500).json({ error: err.message })
        io.emit('atualizar_sistema', { updatedKey: key })
        res.json({ success: true })
    })
})

app.post('/api/restore', (req, res) => {
    const fullData = req.body;
    db.serialize(() => {
        db.run('DELETE FROM app_data');
        const stmt = db.prepare('INSERT INTO app_data (key, value) VALUES (?, ?)');
        Object.keys(fullData).forEach(key => {
            stmt.run(key, JSON.stringify(fullData[key]));
        });
        stmt.finalize(() => {
            io.emit('atualizar_sistema');
            res.json({ success: true });
        });
    });
});

app.delete('/api/reset', (req, res) => {
    db.run('DELETE FROM app_data', [], (err) => {
        if (err) return res.status(500).json({ error: err.message })
        io.emit('atualizar_sistema')
        res.json({ success: true })
    })
})

// --- DASHBOARD (FRONTEND FINAL) ---
app.get('/dashboard', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wilson Control vFinal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #0f172a; color: #e2e8f0; font-family: sans-serif; overflow: hidden; }
        .glass { background: #1e293b; border: 1px solid #334155; }
        .json-editor { background: #0d1117; color: #c9d1d9; font-family: monospace; width: 100%; min-height: 300px; padding: 1rem; border-radius: 0.5rem; outline: none; resize: none; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        
        /* Menu Contexto */
        #ctxMenu { display: none; position: absolute; z-index: 100; width: 150px; background: #1e293b; border: 1px solid #475569; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); overflow: hidden; }
        #ctxMenu button { width: 100%; text-align: left; padding: 10px 15px; font-size: 14px; color: #cbd5e1; transition: 0.2s; }
        #ctxMenu button:hover { background: #334155; color: white; }
        #ctxMenu button.danger:hover { background: #7f1d1d; color: #fca5a5; }

        /* Modal Edit */
        #editModal { display: none; }
    </style>
</head>
<body class="flex h-screen" onclick="hideCtxMenu()">

    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div class="p-6 border-b border-slate-800 flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">W</div>
            <h1 class="font-bold text-lg">Wilson<span class="text-blue-500">DB</span></h1>
        </div>
        <nav id="sidebarList" class="flex-1 overflow-y-auto p-4 space-y-1"></nav>
        <div class="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500">
            <span id="statusIndicator" class="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
            <span id="statusText">Desconectado</span>
        </div>
    </aside>

    <main class="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header class="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
            <h2 id="currentTitle" class="font-semibold text-lg">Visão Geral</h2>
            <div class="flex gap-3">
                <button onclick="resetSystem()" class="text-xs bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900 px-3 py-2 rounded transition font-bold"><i class="fas fa-trash-alt"></i> Resetar Tudo</button>
                <div class="w-px h-6 bg-slate-700 mx-2"></div>
                <button onclick="downloadBackup()" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded border border-slate-700 transition"><i class="fas fa-download"></i> Backup</button>
                <label class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded border border-slate-700 cursor-pointer transition">
                    <i class="fas fa-upload"></i> Restaurar
                    <input type="file" class="hidden" onchange="restoreBackup(this)" accept=".json">
                </label>
            </div>
        </header>

        <div id="contentArea" class="flex-1 overflow-y-auto p-6 space-y-6"></div>
    </main>

    <div id="ctxMenu">
        <button onclick="handleCtxEdit()"><i class="fas fa-pen mr-2"></i> Editar</button>
        <button onclick="handleCtxDelete()" class="danger text-red-400"><i class="fas fa-trash mr-2"></i> Excluir</button>
    </div>

    <div id="editModal" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
        <div class="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl border border-slate-700 p-6 transform transition-all scale-100">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-white">Editar Item</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white"><i class="fas fa-times"></i></button>
            </div>
            <textarea id="modalEditor" class="json-editor"></textarea>
            <div class="flex justify-end gap-3 mt-4">
                <button onclick="closeModal()" class="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">Cancelar</button>
                <button onclick="saveModalEdit()" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">Salvar Alterações</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let globalData = {};
        let currentKey = null;
        let isEditing = false;
        
        // Context Menu Vars
        let ctxTarget = { key: null, index: null, item: null };

        // Elementos
        const sidebarList = document.getElementById('sidebarList');
        const contentArea = document.getElementById('contentArea');
        const currentTitle = document.getElementById('currentTitle');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const ctxMenu = document.getElementById('ctxMenu');
        const editModal = document.getElementById('editModal');
        const modalEditor = document.getElementById('modalEditor');

        // --- Core ---
        async function loadData() {
            try {
                const res = await fetch('/api/sync');
                globalData = await res.json();
                renderSidebar();
                renderContent();
                statusIndicator.className = 'inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]';
                statusText.innerText = 'Online';
                statusText.className = 'text-emerald-500';
            } catch (e) {
                statusIndicator.className = 'inline-block w-2 h-2 rounded-full bg-red-500';
                statusText.innerText = 'Offline';
                statusText.className = 'text-red-500';
            }
        }

        // --- Renderização ---
        function renderSidebar() {
            sidebarList.innerHTML = '';
            const allBtn = document.createElement('button');
            allBtn.className = \`w-full text-left px-3 py-2 rounded text-sm mb-4 transition \${currentKey === null ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}\`;
            allBtn.innerHTML = '<i class="fas fa-layer-group w-5"></i> Todos os Veículos';
            allBtn.onclick = () => { currentKey = null; isEditing = false; renderContent(); renderSidebar(); };
            sidebarList.appendChild(allBtn);

            const keys = Object.keys(globalData);
            if (keys.length > 0) {
                const label = document.createElement('div');
                label.className = 'text-xs uppercase font-bold text-slate-600 px-3 mb-2 mt-4';
                label.innerText = 'Coleções';
                sidebarList.appendChild(label);
            }

            keys.forEach(key => {
                const btn = document.createElement('button');
                btn.className = \`w-full text-left px-3 py-2 rounded text-sm mb-1 transition flex justify-between \${currentKey === key ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800'}\`;
                const count = Array.isArray(globalData[key]) ? globalData[key].length : '{obj}';
                btn.innerHTML = \`<span>\${key}</span> <span class="text-xs bg-slate-900 px-2 rounded text-slate-500">\${count}</span>\`;
                btn.onclick = () => { currentKey = key; isEditing = false; renderContent(); renderSidebar(); };
                sidebarList.appendChild(btn);
            });
        }

        function renderContent() {
            contentArea.innerHTML = '';
            
            // 1. Visão Geral (Todos)
            if (currentKey === null) {
                currentTitle.innerText = 'Todos os Veículos';
                let allVehicles = [];
                
                // Percorre todas as listas para achar arrays
                Object.keys(globalData).forEach(key => {
                    if(Array.isArray(globalData[key])) {
                        // Adiciona metadados para saber a origem ao clicar
                        const items = globalData[key].map((item, idx) => ({ ...item, _originKey: key, _originIndex: idx }));
                        allVehicles = allVehicles.concat(items);
                    }
                });
                
                if(allVehicles.length === 0) {
                    contentArea.innerHTML = '<div class="text-center text-slate-500 mt-20">Nenhum dado encontrado.</div>';
                    return;
                }
                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 xl:grid-cols-2 gap-4';
                allVehicles.forEach(v => grid.appendChild(createVehicleCard(v, v._originKey, v._originIndex)));
                contentArea.appendChild(grid);
                return;
            }

            // 2. Visão Detalhada
            currentTitle.innerText = 'Coleção: ' + currentKey;
            const toolbar = document.createElement('div');
            toolbar.className = 'flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700 mb-4';
            
            if (!isEditing) {
                toolbar.innerHTML = \`<span class="text-sm text-slate-400">Visualização</span> <button onclick="startEdit()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-sm">Editar JSON Completo</button>\`;
                contentArea.appendChild(toolbar);
                const data = globalData[currentKey];
                
                if(Array.isArray(data)) {
                    const grid = document.createElement('div');
                    grid.className = 'grid grid-cols-1 xl:grid-cols-2 gap-4';
                    data.forEach((v, idx) => grid.appendChild(createVehicleCard(v, currentKey, idx)));
                    contentArea.appendChild(grid);
                } else {
                    const pre = document.createElement('pre');
                    pre.className = 'glass p-4 rounded text-blue-300 font-mono text-sm overflow-auto';
                    pre.innerText = JSON.stringify(data, null, 2);
                    contentArea.appendChild(pre);
                }
            } else {
                toolbar.innerHTML = \`<span class="text-yellow-500 font-bold">Editando Coleção Inteira</span> <div class="flex gap-2"><button onclick="saveEdit()" class="bg-emerald-600 text-white px-4 py-1 rounded text-sm">Salvar</button><button onclick="cancelEdit()" class="bg-slate-700 text-white px-4 py-1 rounded text-sm">Cancelar</button></div>\`;
                contentArea.appendChild(toolbar);
                const textarea = document.createElement('textarea');
                textarea.id = 'editorArea';
                textarea.className = 'json-editor';
                textarea.value = JSON.stringify(globalData[currentKey], null, 4);
                contentArea.appendChild(textarea);
            }
        }

        function createVehicleCard(v, key, index) {
            let statusClass = 'bg-slate-700 text-slate-300';
            if(v.status === 'ENTROU') statusClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            if(v.status === 'SAIU') statusClass = 'bg-red-500/20 text-red-400 border border-red-500/30';
            if(v.status === 'FILA') statusClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

            const div = document.createElement('div');
            div.className = 'glass p-4 rounded-lg hover:border-blue-500/50 transition relative group select-none';
            div.innerHTML = \`
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-white text-lg">\${v.empresa || '-'} - \${v.placa || '-'}</h3>
                    <span class="text-xs font-bold px-2 py-1 rounded \${statusClass}">\${v.status || 'N/A'}</span>
                </div>
                <div class="text-sm text-slate-400 space-y-1">
                    <p><span class="text-slate-500">Local:</span> \${v.localSpec || '-'}</p>
                    <p><span class="text-slate-500">Chegada:</span> \${v.chegada ? new Date(v.chegada).toLocaleString() : '-'}</p>
                </div>
                <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-slate-500 text-xs">Botão Direito para Opções</div>
            \`;

            // Evento de Context Menu (Right Click)
            div.oncontextmenu = (e) => {
                e.preventDefault();
                showCtxMenu(e, key, index, v);
            };

            return div;
        }

        // --- Menu Contexto Lógica ---
        function showCtxMenu(e, key, index, item) {
            ctxTarget = { key, index, item };
            ctxMenu.style.display = 'block';
            ctxMenu.style.left = e.pageX + 'px';
            ctxMenu.style.top = e.pageY + 'px';
        }

        function hideCtxMenu() {
            ctxMenu.style.display = 'none';
        }

        async function handleCtxDelete() {
            if(!ctxTarget.key) return;
            if(!confirm(\`Excluir o registro de \${ctxTarget.item.placa || 'item'}?\`)) return;

            // Remove do array local
            const list = globalData[ctxTarget.key];
            if(Array.isArray(list)) {
                list.splice(ctxTarget.index, 1);
                
                // Envia array atualizado para o servidor
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ key: ctxTarget.key, data: list })
                });
            }
            hideCtxMenu();
        }

        function handleCtxEdit() {
            if(!ctxTarget.key) return;
            // Abre o modal com os dados do item
            // Removemos metadados internos antes de editar
            const cleanItem = { ...ctxTarget.item };
            delete cleanItem._originKey;
            delete cleanItem._originIndex;

            modalEditor.value = JSON.stringify(cleanItem, null, 4);
            editModal.style.display = 'flex';
            hideCtxMenu();
        }

        function closeModal() {
            editModal.style.display = 'none';
        }

        async function saveModalEdit() {
            try {
                const newItem = JSON.parse(modalEditor.value);
                const list = globalData[ctxTarget.key];
                
                // Atualiza o item no array local
                if(Array.isArray(list)) {
                    list[ctxTarget.index] = newItem;
                    
                    // Salva no servidor
                    await fetch('/api/sync', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ key: ctxTarget.key, data: list })
                    });
                }
                closeModal();
            } catch(e) {
                alert('Erro de sintaxe JSON: ' + e.message);
            }
        }

        // --- Botões Globais ---
        async function resetSystem() {
            const pass = prompt("Digite a senha de administrador para APAGAR TUDO:");
            if(pass === "1234") {
                if(confirm("ATENÇÃO: ISSO VAI APAGAR TODO O BANCO DE DADOS. TEM CERTEZA?")) {
                    await fetch('/api/reset', { method: 'DELETE' });
                    alert("Sistema resetado com sucesso.");
                }
            } else if (pass !== null) {
                alert("Senha incorreta.");
            }
        }

        // --- Edição Completa da Collection (Antigo) ---
        function startEdit() { isEditing = true; renderContent(); }
        function cancelEdit() { isEditing = false; renderContent(); }
        async function saveEdit() {
            try {
                const newVal = JSON.parse(document.getElementById('editorArea').value);
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ key: currentKey, data: newVal })
                });
                isEditing = false;
            } catch(e) { alert('Erro no JSON: ' + e.message); }
        }

        // --- Backup / Restore ---
        function downloadBackup() {
            const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalData));
            const a = document.createElement('a');
            a.href = str; a.download = 'backup.json'; a.click();
        }

        async function restoreBackup(input) {
            if(!input.files[0] || !confirm('Substituir dados pelo backup?')) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                await fetch('/api/restore', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(JSON.parse(e.target.result))
                });
                input.value = ''; // Reset input
            };
            reader.readAsText(input.files[0]);
        }

        // Init
        loadData();
        socket.on('atualizar_sistema', () => { if(!isEditing && editModal.style.display === 'none') loadData(); });
    </script>
</body>
</html>
    `)
})

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor rodando na porta ${PORT}`))
process.on('SIGINT', () => db.close(() => process.exit(0)))