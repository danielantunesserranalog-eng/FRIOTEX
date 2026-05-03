let servicosFiltrados = [];

async function carregarServicos() {
    const servicos = await getServicos();
    servicosFiltrados = servicos;
    renderizarServicos(servicos);
}

function renderizarServicos(servicos) {
    const tbody = document.getElementById('servicos-list');
    if (!tbody) return;
    
    if (servicos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Nenhum serviço cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = servicos.map(servico => `
        <tr>
            <td><strong>${servico.clienteNome}</strong></td>
            <td>${servico.tipo}</td>
            <td>${new Date(servico.data).toLocaleDateString()}</td>
            <td><span class="status-badge ${servico.status === 'Concluído' ? 'status-success' : servico.status === 'Em andamento' ? 'status-warning' : 'status-info'}">${servico.status}</span></td>
            <td><strong>R$ ${parseFloat(servico.valor).toFixed(2)}</strong></td>
            <td class="actions">
                <button class="btn-icon" onclick="editarServico(${servico.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="excluirServico(${servico.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon" onclick="verDetalhesServico(${servico.id})" title="Detalhes">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function abrirModalServico(servico = null) {
    const modal = document.getElementById('servicoModal');
    const form = document.getElementById('servicoForm');
    const modalTitle = document.getElementById('modalTitleServico');
    
    const clientes = await getClientes();
    const clienteSelect = document.getElementById('clienteSelect');
    clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>' + 
        clientes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`).join('');
    
    if (servico) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Serviço';
        document.getElementById('servicoId').value = servico.id;
        document.getElementById('clienteSelect').value = servico.cliente_id || servico.clienteId;
        document.getElementById('tipoServico').value = servico.tipo;
        document.getElementById('dataServico').value = servico.data;
        document.getElementById('status').value = servico.status;
        document.getElementById('valor').value = servico.valor;
        document.getElementById('descricao').value = servico.descricao || '';
        document.getElementById('prazo').value = servico.prazo || '';
    } else {
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Novo Serviço';
        form.reset();
        document.getElementById('servicoId').value = '';
        document.getElementById('dataServico').value = new Date().toISOString().split('T')[0];
        document.getElementById('status').value = 'Pendente';
    }
    
    modal.style.display = 'block';
}

function fecharModalServico() {
    document.getElementById('servicoModal').style.display = 'none';
}

async function editarServico(id) {
    const servicos = await getServicos();
    const servico = servicos.find(s => s.id === id);
    if (servico) {
        await abrirModalServico(servico);
    }
}

async function excluirServico(id) {
    if (confirm('  Tem certeza que deseja excluir este serviço?')) {
        await deletarServico(id);
        await carregarServicos();
        if (typeof carregarEstatisticas === 'function') {
            await carregarEstatisticas();
        }
    }
}

async function filtrarServicos() {
    const status = document.getElementById('status-filter').value;
    const searchTerm = document.getElementById('search-servico').value.toLowerCase();
    let servicos = await getServicos();
    
    if (status !== 'todos') {
        servicos = servicos.filter(s => s.status === status);
    }
    
    if (searchTerm !== '') {
        servicos = servicos.filter(s => 
            s.clienteNome.toLowerCase().includes(searchTerm) ||
            s.tipo.toLowerCase().includes(searchTerm) ||
            (s.descricao && s.descricao.toLowerCase().includes(searchTerm))
        );
    }
    
    servicosFiltrados = servicos;
    renderizarServicos(servicos);
}

async function limparFiltros() {
    document.getElementById('search-servico').value = '';
    document.getElementById('status-filter').value = 'todos';
    await carregarServicos();
}

// ONDE OS DADOS DA EMPRESA SÃO APLICADOS NO DETALHE DO SERVIÇO
async function verDetalhesServico(id) {
    const servicos = await getServicos();
    const servico = servicos.find(s => s.id === id);
    
    // Busca os dados configurados da Empresa para imprimir na Ordem de Serviço / Detalhe
    const empresa = await getEmpresa();
    const nomeEmpresa = empresa?.nome_empresa || 'Empresa (Não configurada)';
    const foneEmpresa = empresa?.telefone || '';
    
    if (servico) {
        const modal = document.getElementById('detalhesModal');
        const content = document.getElementById('detalhesContent');
        content.innerHTML = `
            <div style="padding: 20px;">
                <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 15px; margin-bottom: 15px; text-align: center;">
                    <h3 style="color: var(--primary); margin: 0;">${nomeEmpresa}</h3>
                    <small style="color: var(--text-muted);">${foneEmpresa}</small>
                </div>
                <div class="detail-item">
                    <label>Cliente:</label>
                    <p><strong>${servico.clienteNome}</strong></p>
                </div>
                <div class="detail-item">
                    <label>Tipo de Serviço:</label>
                    <p>${servico.tipo}</p>
                </div>
                <div class="detail-item">
                    <label>Data:</label>
                    <p>${new Date(servico.data).toLocaleDateString()}</p>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <p><span class="status-badge ${servico.status === 'Concluído' ? 'status-success' : servico.status === 'Em andamento' ? 'status-warning' : 'status-info'}">${servico.status}</span></p>
                </div>
                <div class="detail-item">
                    <label>Valor:</label>
                    <p><strong>R$ ${parseFloat(servico.valor).toFixed(2)}</strong></p>
                </div>
                <div class="detail-item">
                    <label>Descrição:</label>
                    <p>${servico.descricao || 'Nenhuma descrição fornecida'}</p>
                </div>
                ${servico.prazo ? `<div class="detail-item"><label>Prazo:</label><p>${servico.prazo} dias</p></div>` : ''}
            </div>
        `;
        modal.style.display = 'block';
    }
}

function fecharDetalhesModal() {
    document.getElementById('detalhesModal').style.display = 'none';
}

async function checkClienteParam() {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('cliente');
    if (clienteId) {
        const clientes = await getClientes();
        const cliente = clientes.find(c => c.id == clienteId);
        if (cliente) {
            await abrirModalServico();
            const select = document.getElementById('clienteSelect');
            select.value = cliente.id;
        }
    }
}

// Event Listeners
if (document.getElementById('servicoForm')) {
    document.getElementById('servicoForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const clienteId = parseInt(document.getElementById('clienteSelect').value);
        
        if (!clienteId) {
            alert('Selecione um cliente');
            return;
        }
        
        const servico = {
            id: parseInt(document.getElementById('servicoId').value) || null,
            cliente_id: clienteId,
            tipo: document.getElementById('tipoServico').value,
            data: document.getElementById('dataServico').value,
            status: document.getElementById('status').value,
            valor: parseFloat(document.getElementById('valor').value),
            descricao: document.getElementById('descricao').value,
            prazo: parseInt(document.getElementById('prazo').value) || null
        };
        
        if (!servico.tipo || !servico.data || !servico.valor) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }
        
        await salvarServico(servico);
        fecharModalServico();
        await carregarServicos();
        
        if (typeof carregarEstatisticas === 'function') {
            await carregarEstatisticas();
        }
        
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.textContent = 'Serviço salvo com sucesso!';
        msg.style.cssText = 'position:fixed; top:20px; right:20px; background:#48bb78; color:white; padding:12px 24px; border-radius:12px; z-index:9999;';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    });
    
    checkClienteParam();
    carregarServicos();
}