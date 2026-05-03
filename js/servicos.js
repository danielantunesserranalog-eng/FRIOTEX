let abaAtual = 'ativos'; // 'ativos' ou 'historico'
let servicosGlobais = [];
let valorTotalServicoAtual = 0;

async function carregarServicos() {
    servicosGlobais = await getServicos();
    renderizarAba();
}

function mudarAbaServicos(aba) {
    abaAtual = aba;
    document.getElementById('tab-ativos').className = aba === 'ativos' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    document.getElementById('tab-historico').className = aba === 'historico' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    renderizarAba();
}

function renderizarAba() {
    let filtrados = [];
    if (abaAtual === 'ativos') {
        filtrados = servicosGlobais.filter(s => s.status !== 'Concluído');
    } else {
        filtrados = servicosGlobais.filter(s => s.status === 'Concluído');
    }
    renderizarServicos(filtrados);
}

function renderizarServicos(servicos) {
    const tbody = document.getElementById('servicos-list');
    if (!tbody) return;
    
    if (servicos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum serviço encontrado nesta aba.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = servicos.map(s => {
        const valTotal = parseFloat(s.valor || 0);
        let valPagoDisplay = '';
        
        if (s.status === 'Concluído') {
            const valPago = s.valor_pago !== null && s.valor_pago !== undefined ? parseFloat(s.valor_pago) : (s.status_pagamento === 'Pago' ? valTotal : 0);
            if (valPago < valTotal) {
                valPagoDisplay = `<br><small style="color:var(--warning); font-weight:600;">Pago: R$ ${valPago.toFixed(2)}</small>`;
            } else {
                valPagoDisplay = `<br><small style="color:var(--success); font-weight:600;">Totalmente Pago</small>`;
            }
        }

        return `
            <tr>
                <td><strong>${s.clienteNome}</strong><br><small style="color:var(--text-muted)">${s.tipo}</small></td>
                <td>${new Date(s.data).toLocaleDateString()} <br><small style="color:var(--primary)"><i class="fas fa-clock"></i> ${s.hora || 'Sem hora'}</small></td>
                <td><i class="fas fa-user-circle"></i> ${s.colaboradorNome}</td>
                <td><span class="status-badge ${s.status === 'Concluído' ? 'status-success' : s.status === 'Em andamento' ? 'status-warning' : 'status-info'}">${s.status}</span></td>
                <td><strong>R$ ${valTotal.toFixed(2)}</strong>${valPagoDisplay}</td>
                <td class="actions">
                    ${s.status !== 'Concluído' ? `<button class="btn-icon" style="color:var(--success)" onclick="abrirModalConcluir(${s.id})" title="Concluir Serviço"><i class="fas fa-check-double"></i></button>` : ''}
                    <button class="btn-icon" onclick="editarServico(${s.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="excluirServico(${s.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                    <button class="btn-icon" onclick="verDetalhesServico(${s.id})" title="Detalhes"><i class="fas fa-info-circle"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// CRUD BÁSICO DE SERVIÇOS
// ==========================================
async function abrirModalServico(servico = null) {
    const form = document.getElementById('servicoForm');
    
    const clientes = await getClientes();
    document.getElementById('clienteSelect').innerHTML = '<option value="">Selecione um cliente...</option>' + 
        clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        
    const colabs = await getColaboradores();
    document.getElementById('colaboradorSelect').innerHTML = '<option value="">Selecione um técnico...</option>' + 
        colabs.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    
    if (servico) {
        document.getElementById('modalTitleServico').innerHTML = '<i class="fas fa-edit"></i> Editar Serviço';
        document.getElementById('servicoId').value = servico.id;
        document.getElementById('clienteSelect').value = servico.cliente_id;
        document.getElementById('tipoServico').value = servico.tipo;
        document.getElementById('dataServico').value = servico.data;
        document.getElementById('horaServico').value = servico.hora || '';
        document.getElementById('colaboradorSelect').value = servico.colaborador_id || '';
        document.getElementById('status').value = servico.status;
        document.getElementById('valor').value = servico.valor;
        document.getElementById('descricao').value = servico.descricao || '';
    } else {
        document.getElementById('modalTitleServico').innerHTML = '<i class="fas fa-plus-circle"></i> Novo Serviço';
        form.reset();
        document.getElementById('servicoId').value = '';
        document.getElementById('dataServico').value = new Date().toISOString().split('T')[0];
        document.getElementById('status').value = 'Pendente';
    }
    
    document.getElementById('servicoModal').style.display = 'block';
}

function fecharModalServico() { document.getElementById('servicoModal').style.display = 'none'; }

async function editarServico(id) {
    const servico = servicosGlobais.find(s => s.id === id);
    if (servico) await abrirModalServico(servico);
}

async function excluirServico(id) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        await deletarServico(id);
        carregarServicos();
    }
}

document.getElementById('servicoForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const servico = {
        id: document.getElementById('servicoId').value || null,
        cliente_id: parseInt(document.getElementById('clienteSelect').value),
        tipo: document.getElementById('tipoServico').value,
        data: document.getElementById('dataServico').value,
        hora: document.getElementById('horaServico').value,
        colaborador_id: parseInt(document.getElementById('colaboradorSelect').value) || null,
        status: document.getElementById('status').value,
        valor: parseFloat(document.getElementById('valor').value),
        descricao: document.getElementById('descricao').value
    };
    
    await salvarServico(servico);
    fecharModalServico();
    carregarServicos();
});

// ==========================================
// CONCLUIR SERVIÇO (MULTI PAGAMENTOS)
// ==========================================
function abrirModalConcluir(id) {
    const servico = servicosGlobais.find(s => s.id === id);
    if(!servico) return;

    valorTotalServicoAtual = parseFloat(servico.valor) || 0;
    document.getElementById('concluirValorTotalDisplay').innerText = `R$ ${valorTotalServicoAtual.toFixed(2)}`;
    
    document.getElementById('concluirForm').reset();
    document.getElementById('concluirServicoId').value = id;
    document.getElementById('container-pgtos').innerHTML = '';
    document.getElementById('blocoRestante').style.display = 'none';
    document.getElementById('concluirDataPrevisao').required = false;
    
    adicionarLinhaPgto(valorTotalServicoAtual);
    document.getElementById('concluirModal').style.display = 'block';
}

function fecharModalConcluir() { document.getElementById('concluirModal').style.display = 'none'; }

function adicionarLinhaPgto(valorPadrao = 0) {
    const container = document.getElementById('container-pgtos');
    const idUnico = Date.now();
    const div = document.createElement('div');
    div.className = 'form-row';
    div.style.cssText = 'margin-top: 0; padding: 0; gap: 10px; margin-bottom: 10px; align-items: flex-end;';
    div.id = `pgto-row-${idUnico}`;
    
    div.innerHTML = `
        <div class="form-group" style="padding: 0; margin: 0; flex: 2;">
            <label>Forma</label>
            <select class="pgto-forma" required>
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Débito">Cartão de Débito</option>
                <option value="Crédito">Cartão de Crédito</option>
                <option value="Nota">Faturado (Nota)</option>
            </select>
        </div>
        <div class="form-group" style="padding: 0; margin: 0; flex: 2;">
            <label>Valor (R$)</label>
            <input type="number" class="pgto-valor" step="0.01" min="0" value="${valorPadrao > 0 ? valorPadrao.toFixed(2) : ''}" oninput="calcularTotalPgto()" required>
        </div>
        <div style="flex: 0.5;">
            <button type="button" class="btn-icon" style="color:var(--danger); width: 100%; height: 42px; background: rgba(239, 68, 68, 0.1);" onclick="removerLinhaPgto(${idUnico})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
    calcularTotalPgto();
}

function removerLinhaPgto(id) {
    const row = document.getElementById(`pgto-row-${id}`);
    if(row) row.remove();
    calcularTotalPgto();
}

function calcularTotalPgto() {
    let totalPago = 0;
    document.querySelectorAll('.pgto-valor').forEach(input => {
        totalPago += parseFloat(input.value) || 0;
    });
    
    document.getElementById('concluirTotalPagoDisplay').innerText = `R$ ${totalPago.toFixed(2)}`;
    
    const restante = valorTotalServicoAtual - totalPago;
    const blocoRestante = document.getElementById('blocoRestante');
    const inputPrevisao = document.getElementById('concluirDataPrevisao');
    
    if (restante > 0.001) { 
        blocoRestante.style.display = 'block';
        document.getElementById('concluirRestanteDisplay').innerText = `R$ ${restante.toFixed(2)}`;
        inputPrevisao.required = true;
    } else {
        blocoRestante.style.display = 'none';
        inputPrevisao.required = false;
        inputPrevisao.value = '';
    }
}

document.getElementById('concluirForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('concluirServicoId').value;
    
    let totalPago = 0;
    let formasDetalhadas = [];
    
    document.querySelectorAll('[id^="pgto-row-"]').forEach(row => {
        const forma = row.querySelector('.pgto-forma').value;
        const valor = parseFloat(row.querySelector('.pgto-valor').value) || 0;
        if (valor > 0) {
            totalPago += valor;
            formasDetalhadas.push(`${forma} (R$ ${valor.toFixed(2)})`);
        }
    });
    
    const formaPgtoString = formasDetalhadas.join(' + ') || 'Não pago';
    const restante = valorTotalServicoAtual - totalPago;
    
    let statusPgto = 'Pago';
    let dataVencimento = null;
    
    if (restante > 0.001) {
        statusPgto = 'Parcial';
        dataVencimento = document.getElementById('concluirDataPrevisao').value;
        if(!dataVencimento) {
            alert('Por favor, informe a data de previsão para receber o valor restante.');
            return;
        }
    }
    
    try {
        await concluirServicoDB(id, formaPgtoString, totalPago, dataVencimento, statusPgto);
        fecharModalConcluir();
        await carregarServicos(); 
        
        const msg = document.createElement('div');
        msg.textContent = 'Serviço concluído com sucesso!';
        msg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:var(--success); color:white; padding:12px 24px; border-radius:var(--radius-md); z-index:9999;';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 4000);
    } catch (erro) {
        alert('Erro ao concluir. Verifique se as novas colunas foram criadas no Supabase.');
        console.error(erro);
    }
});

// ==========================================
// DETALHES DO SERVIÇO
// ==========================================
async function verDetalhesServico(id) {
    const servico = servicosGlobais.find(s => s.id === id);
    const empresa = await getEmpresa();
    
    if (servico) {
        document.getElementById('detalhesContent').innerHTML = `
            <div style="padding: 20px;">
                <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 15px; margin-bottom: 15px; text-align: center;">
                    <h3 style="color: var(--primary); margin: 0;">${empresa?.nome_empresa || 'Ordem de Serviço'}</h3>
                </div>
                <div class="form-row" style="margin-top:0; padding:0;">
                    <div class="detail-item"><label>Cliente:</label><p><strong>${servico.clienteNome}</strong></p></div>
                    <div class="detail-item"><label>Serviço:</label><p>${servico.tipo}</p></div>
                </div>
                <div class="form-row" style="padding:0;">
                    <div class="detail-item"><label>Data e Hora:</label><p>${new Date(servico.data).toLocaleDateString()} às ${servico.hora || '--:--'}</p></div>
                    <div class="detail-item"><label>Técnico Responsável:</label><p>${servico.colaboradorNome}</p></div>
                </div>
                <div class="form-row" style="padding:0;">
                    <div class="detail-item"><label>Status:</label><p><span class="status-badge status-info">${servico.status}</span></p></div>
                    <div class="detail-item"><label>Valor Total:</label><p><strong>R$ ${parseFloat(servico.valor).toFixed(2)}</strong></p></div>
                </div>
                ${servico.forma_pagamento ? `
                <div class="form-row" style="padding:0; margin-top:15px;">
                    <div class="detail-item" style="grid-column: 1 / -1;"><label>Pagamentos Registrados:</label><p style="color: var(--success); font-weight: 600;">${servico.forma_pagamento}</p></div>
                </div>` : ''}
                <div class="detail-item" style="margin-top: 15px;"><label>Descrição:</label><p style="white-space: pre-line;">${servico.descricao || 'Nenhuma descrição fornecida'}</p></div>
            </div>
        `;
        document.getElementById('detalhesModal').style.display = 'block';
    }
}

function fecharDetalhesModal() { document.getElementById('detalhesModal').style.display = 'none'; }

// Inicializa a página
carregarServicos();