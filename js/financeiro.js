let abaFinAtual = 'entradas';
let servicosGerais = [];
let despesasGerais = [];

document.addEventListener('DOMContentLoaded', carregarTudo);

async function carregarTudo() {
    servicosGerais = await getServicos();
    try {
        despesasGerais = await getDespesas(); // Tenta buscar despesas
    } catch(e) {
        console.warn("Tabela de despesas não criada ainda no Supabase.");
        despesasGerais = [];
    }
    calcularIndicadores();
    renderizarAba();
}

function calcularIndicadores() {
    let recebido = 0;
    let pendente = 0;
    let saidas = 0;

    // Calcula Entradas
    servicosGerais.forEach(s => {
        const valorTotal = parseFloat(s.valor || 0);
        let valPago = s.valor_pago !== null && s.valor_pago !== undefined ? parseFloat(s.valor_pago) : (s.status_pagamento === 'Pago' ? valorTotal : 0);
        if (valPago > valorTotal) valPago = valorTotal;

        let valPendente = valorTotal - valPago;
        if (valPendente < 0) valPendente = 0;

        recebido += valPago;
        pendente += valPendente;
    });

    // Calcula Saídas
    despesasGerais.forEach(d => {
        saidas += parseFloat(d.valor || 0);
    });

    const saldo = recebido - saidas;

    document.getElementById('total-recebido').textContent = `R$ ${recebido.toFixed(2)}`;
    document.getElementById('total-saidas').textContent = `R$ ${saidas.toFixed(2)}`;
    document.getElementById('saldo-atual').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('total-pendente').textContent = `R$ ${pendente.toFixed(2)}`;
}

function mudarAbaFin(aba) {
    abaFinAtual = aba;
    document.getElementById('tab-entradas').className = aba === 'entradas' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    document.getElementById('tab-saidas').className = aba === 'saidas' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    renderizarAba();
}

function renderizarAba() {
    const thead = document.getElementById('fin-thead');
    const tbody = document.getElementById('financeiro-list');

    if (abaFinAtual === 'entradas') {
        thead.innerHTML = `
            <tr>
                <th>Cliente / Origem</th>
                <th>Próx. Vencimento</th>
                <th>Valores</th>
                <th>Status do Pgto</th>
                <th>Ações</th>
            </tr>
        `;
        
        if (servicosGerais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma entrada registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = servicosGerais.map(s => {
            const valorTotal = parseFloat(s.valor || 0);
            let valPago = s.valor_pago !== null && s.valor_pago !== undefined ? parseFloat(s.valor_pago) : (s.status_pagamento === 'Pago' ? valorTotal : 0);
            if (valPago > valorTotal) valPago = valorTotal;
            let valPendente = valorTotal - valPago;
            if (valPendente < 0) valPendente = 0;

            const statusAtual = s.status_pagamento || 'Pendente';
            
            // Formata a data de vencimento se existir
            let vencimentoBadge = '-';
            if (s.data_vencimento && valPendente > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                const corVenc = s.data_vencimento < hoje ? 'var(--danger)' : 'var(--warning)';
                vencimentoBadge = `<span style="color: ${corVenc}; font-weight: bold;"><i class="fas fa-calendar-alt"></i> ${new Date(s.data_vencimento).toLocaleDateString('pt-BR')}</span>`;
            } else if (statusAtual === 'Pago') {
                vencimentoBadge = `<span style="color: var(--success);"><i class="fas fa-check"></i> Recebido</span>`;
            }

            let infoValores = `<strong>R$ ${valorTotal.toFixed(2)}</strong>`;
            if (statusAtual === 'Parcial' && valPendente > 0) {
                infoValores += `<br><small style="color:var(--success);">Pago: R$ ${valPago.toFixed(2)}</small>`;
                infoValores += `<br><small style="color:var(--warning);">Falta: R$ ${valPendente.toFixed(2)}</small>`;
            }

            return `
                <tr id="row-fin-${s.id}">
                    <td><strong>${s.clienteNome}</strong><br><small style="color:var(--text-muted)">Serviço: ${new Date(s.data).toLocaleDateString('pt-BR')}</small></td>
                    <td>${vencimentoBadge}</td>
                    <td>${infoValores}</td>
                    <td>
                        <select id="status-${s.id}" class="select-fin" style="font-weight: 600; color: ${statusAtual === 'Pago' ? 'var(--success)' : (statusAtual === 'Parcial' ? 'var(--warning)' : 'var(--danger)')}">
                            <option value="Pendente" ${statusAtual === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Parcial" ${statusAtual === 'Parcial' ? 'selected' : ''} ${statusAtual !== 'Parcial' ? 'disabled' : ''}>Parcial</option>
                            <option value="Pago" ${statusAtual === 'Pago' ? 'selected' : ''}>Pago Total</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="atualizarStatusEntrada(${s.id})">
                            <i class="fas fa-save"></i> Atualizar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        // ABA DE SAÍDAS
        thead.innerHTML = `
            <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Motivo / Por que?</th>
                <th>Valor Retirado</th>
                <th>Ações</th>
            </tr>
        `;
        
        if (despesasGerais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma saída ou sangria registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = despesasGerais.map(d => {
            return `
                <tr>
                    <td>${new Date(d.data).toLocaleDateString('pt-BR')}</td>
                    <td><span class="status-badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">${d.categoria}</span></td>
                    <td>${d.descricao}</td>
                    <td><strong style="color: var(--danger);">R$ ${parseFloat(d.valor).toFixed(2)}</strong></td>
                    <td>
                        <button class="btn-icon" style="color: var(--danger);" onclick="apagarSaida(${d.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

async function atualizarStatusEntrada(id) {
    const statusVal = document.getElementById(`status-${id}`).value;
    const btn = document.querySelector(`#row-fin-${id} button`);
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // O Supabase atualizará apenas o status (a forma a gente assume que se manteve ou foi acordada)
        await atualizarPagamentoServico(id, statusVal, null);
        await carregarTudo();
    } catch (e) {
        alert('Erro ao atualizar.');
    }
}

// ==========================================
// MODAL DE SAÍDAS (SANGRIAS)
// ==========================================
function abrirModalSaida() {
    document.getElementById('saidaForm').reset();
    document.getElementById('saidaData').value = new Date().toISOString().split('T')[0];
    document.getElementById('saidaModal').style.display = 'block';
}

function fecharModalSaida() {
    document.getElementById('saidaModal').style.display = 'none';
}

document.getElementById('saidaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Salvando...';

    const despesa = {
        data: document.getElementById('saidaData').value,
        categoria: document.getElementById('saidaCategoria').value,
        valor: parseFloat(document.getElementById('saidaValor').value),
        descricao: document.getElementById('saidaMotivo').value
    };

    try {
        await salvarDespesa(despesa);
        fecharModalSaida();
        await carregarTudo();
    } catch (err) {
        alert("Erro ao salvar saída. Verifique se criou a tabela 'despesas' no Supabase.");
    } finally {
        btn.innerHTML = 'Salvar Saída';
    }
});

async function apagarSaida(id) {
    if(confirm('Tem certeza que deseja apagar este registro de saída? O saldo será recalculado.')) {
        await deletarDespesa(id);
        await carregarTudo();
    }
}