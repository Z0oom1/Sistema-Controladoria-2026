const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const compression = require('compression');

const PORT = 2006;
const DB_FILE = 'database.sqlite';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000
});

// --- MIDDLEWARE OTIMIZADO ---
app.use(compression()); // Compressão gzip
app.use(cors());

// Limitar tamanho apenas quando necessário
app.use(bodyParser.json({ limit: '10mb' })); // Reduzido de 50mb
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Cache headers para arquivos estáticos
app.use((req, res, next) => {
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hora
    }
    next();
});

// --- CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: '1h',
    etag: false
}));

// Rota Raiz: Entrega o LOGIN.HTML
app.get('/', (req, res) => {
    const loginPath = path.join(__dirname, '../frontend/pages/login.html');
    res.sendFile(loginPath, (err) => {
        if (err) res.status(500).send(`Erro ao carregar login: ${err.message}`);
    });
});

// --- BANCO DE DADOS COM POOL ---
const dbPath = path.resolve(__dirname, DB_FILE);
const db = new sqlite3.Database(dbPath, (err) => {
    if (!err) {
        console.log('Banco de dados conectado');
        initDb();
    } else {
        console.error('Erro ao conectar banco:', err);
    }
});

// Configurar para melhor performance
function initDb() {
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;');
    db.run('PRAGMA cache_size = -64000;'); // 64MB cache
    db.run('PRAGMA temp_store = MEMORY;');
    
    db.run(`CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// --- CACHE EM MEMÓRIA ---
class DataCache {
    constructor(ttl = 30000) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    delete(key) {
        this.cache.delete(key);
    }
}

const dataCache = new DataCache(30000); // 30s TTL

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    socket.on('pedir_dados', () => {
        io.emit('atualizar_sistema');
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// --- ROTAS API OTIMIZADAS ---

/**
 * Status do servidor
 */
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

/**
 * Sincronização de dados com cache
 */
app.get('/api/sync', (req, res) => {
    // Verificar cache primeiro
    const cached = dataCache.get('full_sync');
    if (cached) {
        return res.json(cached);
    }

    db.all(`SELECT * FROM app_data`, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados:', err);
            return res.status(500).json({ error: err.message });
        }

        const data = {};
        rows.forEach(row => {
            try {
                data[row.key] = JSON.parse(row.value);
            } catch {
                data[row.key] = row.value;
            }
        });

        // Armazenar em cache
        dataCache.set('full_sync', data);

        // Adicionar headers de cache
        res.set('Cache-Control', 'public, max-age=30');
        res.json(data);
    });
});

/**
 * Salvar dados específicos
 */
app.post('/api/sync', (req, res) => {
    const { key, data } = req.body;

    if (!key || data === undefined) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    let jsonStr;
    try {
        jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
        return res.status(400).json({ error: 'JSON inválido' });
    }

    const sql = `INSERT INTO app_data (key, value, updated_at) 
                 VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET 
                 value=excluded.value, 
                 updated_at=CURRENT_TIMESTAMP`;

    db.run(sql, [key, jsonStr], function(err) {
        if (err) {
            console.error('Erro ao salvar:', err);
            return res.status(500).json({ error: err.message });
        }

        // Invalidar cache
        dataCache.delete('full_sync');

        // Notificar clientes
        io.emit('atualizar_sistema', { updatedKey: key });

        res.json({ success: true });
    });
});

/**
 * Restaurar dados em lote
 */
app.post('/api/restore', (req, res) => {
    const fullData = req.body;

    if (!fullData || typeof fullData !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    db.serialize(() => {
        db.run('DELETE FROM app_data', (err) => {
            if (err) {
                console.error('Erro ao limpar dados:', err);
                return res.status(500).json({ error: err.message });
            }

            const stmt = db.prepare('INSERT INTO app_data (key, value) VALUES (?, ?)');
            const keys = Object.keys(fullData);

            let completed = 0;
            keys.forEach(key => {
                stmt.run(key, JSON.stringify(fullData[key]), (err) => {
                    if (err) console.error(`Erro ao restaurar ${key}:`, err);
                    completed++;

                    if (completed === keys.length) {
                        stmt.finalize(() => {
                            dataCache.clear();
                            io.emit('atualizar_sistema');
                            res.json({ success: true });
                        });
                    }
                });
            });
        });
    });
});

/**
 * Resetar todos os dados
 */
app.delete('/api/reset', (req, res) => {
    db.run('DELETE FROM app_data', [], (err) => {
        if (err) {
            console.error('Erro ao resetar:', err);
            return res.status(500).json({ error: err.message });
        }

        dataCache.clear();
        io.emit('atualizar_sistema');
        res.json({ success: true });
    });
});

// --- TRATAMENTO DE ERROS ---
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// --- INICIAR SERVIDOR ---
server.listen(PORT, () => {
    console.log(`🚀 Servidor Wilson rodando em http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido, encerrando...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
});
