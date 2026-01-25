# 📦 Sistema de Controle Operacional – Mapa Cego Digital

**Autor:** Caio Rod
**Versão:** 3.6.9
**Tipo:** Software corporativo interno (Electron + Node.js)
**Plataforma:** Windows (Desktop) – Híbrido Offline/Online
**Arquitetura:** Offline-First
**Status:** Produção / Uso empresarial

---

## 🎯 Visão Geral

Este sistema foi desenvolvido para **digitalizar e controlar processos operacionais que tradicionalmente eram manuais**, com foco especial no **Mapa Cego Digital**, controle de caminhões, pátio, conferência, pesagem e dashboards operacionais.

O projeto foi criado **do zero**, baseado em um processo real de empresa de porte médio, e **não é um sistema genérico**. Ele reflete regras de negócio específicas, exceções operacionais e necessidades reais do chão de fábrica.

O sistema é projetado para **funcionar mesmo sem internet**, garantindo continuidade operacional em ambientes industriais e redes internas (LAN/Intranet).

---

## 🧠 Conceito Central do Sistema

O sistema se baseia em cinco pilares principais:

1. **Persistência flexível via JSON** (armazenado no banco)
2. **Arquitetura Offline-First** com fallback local
3. **Sincronização em tempo real** entre máquinas (Socket.IO)
4. **Frontend como fonte da verdade** (regra de negócio no cliente)
5. **Software instalado localmente** (Electron), não apenas um site

Isso permite:

* rápida adaptação do processo
* menos migrações de banco
* controle total do ambiente
* operação contínua mesmo sem conexão

---

## 📌 Principais Funcionalidades

* Controle de Portaria
* Controle de Pátio
* Mapa Cego Digital
* Recebimento de Mercadorias
* Controle de Pesagem
* Dashboards operacionais
* Sincronização automática entre múltiplos clientes
* Persistência local + servidor central

---

## 📁 Estrutura de Pastas

```text
/backend
├── server.js              # Servidor principal (Express + Socket.IO)
├── database.sqlite        # Banco local SQLite

/frontend
├── index.html
├── js/
│   ├── script.js          # Core do sistema (estado + regras)
│   ├── *.js               # Módulos funcionais
├── css/

/electron
├── main.js                # Bootstrap do Electron
```

---

## 🧩 Backend – Como Funciona

### 🔹 Tecnologias

* Node.js
* Express
* SQLite
* Socket.IO

O backend **não contém regras de negócio**.
Sua função é:

* Persistir dados
* Sincronizar clientes
* Emitir eventos em tempo real

---

### 🔹 Banco de Dados

O banco **não usa tabelas rígidas para dados operacionais**.

#### Tabela `app_data`

Modelo **Key-Value**, usado para armazenar **dados operacionais em JSON**.

| Campo | Descrição                 |
| ----- | ------------------------- |
| key   | Identifica o tipo de dado |
| value | JSON serializado          |

Exemplos de `key`:

* `aw_caminhoes_v2`
* `aw_mapas`
* `aw_usuarios`
* `aw_ocorrencias`
* `presets_user_<id>`

👉 **RESET do sistema apaga apenas essa tabela.**

---

#### Tabela `users`

Controle de usuários do sistema.

Campos principais:

* `username`
* `password`
* `role` (Administrador, Encarregado, User)
* `sector`
* `token`

---

#### Tabela `dash_layouts`

Armazena **layouts de dashboard por usuário**.

⚠️ **Essa tabela NÃO é apagada no reset.**

---

## 🔐 Autenticação

* Login gera um **token simples**
* Token é salvo no banco
* Rotas protegidas usam middleware `requireAuth`

⚠️ **Observação:**
Este sistema **não utiliza JWT ou bcrypt por decisão de simplicidade operacional**, mas a arquitetura permite evolução futura.

---

## 🔄 Sincronização e Ciclo de Vida dos Dados

O sistema segue **4 etapas fundamentais**.

### 1️⃣ LOAD — `loadDataFromServer`

* Busca todo o banco via `GET /api/sync`
* Popula arrays globais:

  * `patioData`
  * `mapData`
  * `usersData`
* Se offline → restaura do `localStorage`

---

### 2️⃣ INTERACTION

* Usuário interage com a interface HTML
* JavaScript altera diretamente os arrays globais
* Não existe estado imutável ou virtual DOM

---

### 3️⃣ SAVE — `saveAll`

| Ação            | Destino          |
| --------------- | ---------------- |
| Backup imediato | `localStorage`   |
| Persistência    | `POST /api/sync` |
| Sincronização   | Socket.IO        |

---

### 4️⃣ RENDER

Funções de renderização:

* `renderPatio()`
* `renderMapas()`
* `renderUsuarios()`

Processo:

* Limpa o HTML
* Recria os elementos com base no estado atual

---

## 🧭 Navegação (SPA)

A navegação é controlada pela função:

```js
navTo(viewName)
```

Funcionamento:

* Esconde todas as `.view-section`
* Exibe apenas `#view-{viewName}`
* Executa o render correspondente

```js
if (view === 'mapas') renderMapas();
```

---

## 🌐 Rotas da API

### `GET /api/sync`

Retorna todo o banco:

```json
{
  "aw_caminhoes_v2": [],
  "aw_mapas": [],
  "aw_usuarios": []
}
```

---

### `POST /api/sync`

Atualiza uma coleção específica:

```json
{
  "key": "aw_mapas",
  "data": []
}
```

* Atualiza SQLite
* Emite evento Socket.IO

---

### `DELETE /api/reset`

Apaga todos os dados operacionais (`app_data`).
Uso restrito para manutenção.

---

## 🧠 Mapa Cego Digital (Núcleo do Sistema)

Este é o ponto crítico do sistema.

* Substitui processo manual
* Compara quantidades automaticamente
* Identifica divergências em tempo real

Estrutura típica:

```js
mapa = {
  date,
  placa,
  setor,
  rows: [
    { desc, qty, qty_nf }
  ]
}
```

A divergência é calculada dinamicamente, sem pré-processamento.

---

## 📊 Dashboard

Rota principal:

```http
POST /api/dashboard/query
```

Modos:

* **Quantidade** → caminhões no pátio
* **Divergência** → leitura do mapa cego

Toda a lógica de filtro ocorre em memória, diretamente sobre JSON.

---

## 🖥️ Electron

O sistema roda como:

* software instalado
* ambiente controlado
* versão única por máquina

Vantagens:

* não depende de navegador
* menos erro de ambiente
* maior confiabilidade corporativa

---

## 🛠️ Como Alterar / Estender o Sistema

### ➕ Adicionar novo tipo de dado

1. Defina uma nova `key`
2. Salve via `/api/sync`
3. Leia via `/api/sync` no frontend

Sem necessidade de:

* criar tabelas
* migrar banco

---

### ➕ Alterar regras de negócio

As regras estão no JavaScript.

* Modifique filtros, comparações e cálculos diretamente
* Isso é **intencional**

---

### ➕ Adicionar nova tela

* Criar HTML
* Criar renderizador JS
* Registrar navegação

---

## ⚠️ Boas Práticas

* Um array global = uma coleção no banco
* Não alterar JSON sem mapear impacto
* Não apagar keys antigas sem migração
* Sempre testar com dois clientes abertos
* Evitar chamadas excessivas de `saveAll()`

---

## 🔧 Solução de Problemas

### Porta 2006 em uso

Erro:

```text
EADDRINUSE: address already in use :::2006
```

Solução:

* Encerrar processos Node.js
* Finalizar `node.exe` no Gerenciador de Tarefas

---

### Dados não sincronizam

Possíveis causas:

* Firewall bloqueando porta 2006
* IP incorreto do servidor

Soluções:

* Liberar porta 2006 no Firewall
* Conferir `API_URL` em `frontend/js/script.js`

---

### SQLite Database Locked

* Evitar múltiplos saves seguidos
* Utilizar debounce/throttle
* WAL ativado

---

## 🚀 Possíveis Evoluções

* Logs persistentes
* Backup automático
* Exportação CSV / Excel
* Permissões mais granulares
* Integração com hardware (balança, leitor)

---

## 🧾 Observação Final

Este sistema **não é um ERP**.

Ele é um **software operacional sob medida**, criado para resolver problemas reais que ERPs não cobrem bem.

> A regra de negócio vem antes da estrutura técnica.

---

## ✍️ Assinatura

Desenvolvido por **Caio Rod**
Sistema proprietário — uso corporativo interno

---

cvrod prods
