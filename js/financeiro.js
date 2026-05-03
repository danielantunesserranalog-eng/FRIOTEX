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
                <th>Cliente / Serviço</th>
                <th>Vencimento</th>
                <th>Valores</th>
                <th>Status</th>
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
            
            // Lógica de visualização do vencimento
            let vencimentoBadge = '-';
            if (s.data_vencimento && valPendente > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                const corVenc = s.data_vencimento < hoje ? 'var(--danger)' : 'var(--warning)';
                vencimentoBadge = `<span style="color: ${corVenc}; font-weight: bold;"><i class="fas fa-calendar-alt"></i> ${new Date(s.data_vencimento).toLocaleDateString('pt-BR')}</span>`;
            } else if (statusAtual === 'Pago') {
                vencimentoBadge = `<span style="color: var(--success);"><i class="fas fa-check"></i> Quitado</span>`;
            }

            // Exibição dos valores exatos do que já foi pago e falta
            let infoValores = `<strong>R$ ${valorTotal.toFixed(2)}</strong>`;
            if (valPago > 0 && valPendente > 0) {
                infoValores += `<br><small style="color:var(--success);">Pago: R$ ${valPago.toFixed(2)}</small>`;
                infoValores += `<br><small style="color:var(--warning);">Falta: R$ ${valPendente.toFixed(2)}</small>`;
            }

            // Botão ou Badge de Status
            let btnAcao = '';
            let badgeStatus = '';
            
            if (statusAtual === 'Pago') {
                badgeStatus = `<span class="status-badge status-success">Pago</span>`;
                btnAcao = `<span style="color: var(--text-muted); font-size: 13px;">Nenhuma ação</span>`;
            } else {
                badgeStatus = `<span class="status-badge status-warning">${statusAtual}</span>`;
                btnAcao = `<button class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: var(--success); border-color: var(--success);" onclick="abrirModalReceber(${s.id})"><i class="fas fa-hand-holding-usd"></i> Receber</button>`;
            }

            return `
                <tr id="row-fin-${s.id}">
                    <td><strong>${s.clienteNome}</strong><br><small style="color:var(--text-muted)">Serviço: ${new Date(s.data).toLocaleDateString('pt-BR')}</small></td>
                    <td>${vencimentoBadge}</td>
                    <td>${infoValores}</td>
                    <td>${badgeStatus}</td>
                    <td>${btnAcao}</td>
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

// ==========================================
// FUNÇÕES DO MODAL DE RECEBIMENTO PARCIAL E TOTAL
// ==========================================
function abrirModalReceber(id) {
    const servico = servicosGerais.find(s => s.id === id);
    if(!servico) return;

    const valorTotal = parseFloat(servico.valor || 0);
    let valPago = servico.valor_pago !== null && servico.valor_pago !== undefined ? parseFloat(servico.valor_pago) : (servico.status_pagamento === 'Pago' ? valorTotal : 0);
    if(valPago > valorTotal) valPago = valorTotal;
    const falta = valorTotal - valPago;

    document.getElementById('recFormaAnterior').value = servico.forma_pagamento || '';
    document.getElementById('recServicoId').value = id;
    document.getElementById('recValorTotal').value = valorTotal;
    document.getElementById('recValorJaPago').value = valPago;
    
    document.getElementById('recDisplayTotal').innerText = `R$ ${valorTotal.toFixed(2)}`;
    document.getElementById('recDisplayJaPago').innerText = `R$ ${valPago.toFixed(2)}`;
    document.getElementById('recDisplayFalta').innerText = `R$ ${falta.toFixed(2)}`;

    const inputPagando = document.getElementById('recValorPagando');
    inputPagando.value = '';
    // Define o valor máximo permitido para que o usuário não pague mais do que deve
    inputPagando.max = falta.toFixed(2);
    
    document.getElementById('blocoNovoRestante').style.display = 'none';
    document.getElementById('recNovaData').required = false;

    document.getElementById('receberModal').style.display = 'block';
}

function fecharModalReceber() {
    document.getElementById('receberModal').style.display = 'none';
}

function calcularBaixa() {
    const valorTotal = parseFloat(document.getElementById('recValorTotal').value) || 0;
    const jaPago = parseFloat(document.getElementById('recValorJaPago').value) || 0;
    const pagandoAgora = parseFloat(document.getElementById('recValorPagando').value) || 0;

    const faltaOriginal = valorTotal - jaPago;
    const novoFalta = faltaOriginal - pagandoAgora;

    const bloco = document.getElementById('blocoNovoRestante');
    const inputData = document.getElementById('recNovaData');

    if (novoFalta > 0.001) { // Se ainda faltar algum centavo, exige nova data
        bloco.style.display = 'block';
        document.getElementById('recDisplayNovoFalta').innerText = `R$ ${novoFalta.toFixed(2)}`;
        inputData.required = true;
    } else {
        bloco.style.display = 'none';
        inputData.required = false;
        inputData.value = '';
    }
}

document.getElementById('receberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    btn.disabled = true;

    try {
        const id = document.getElementById('recServicoId').value;
        const valorTotal = parseFloat(document.getElementById('recValorTotal').value);
        const jaPago = parseFloat(document.getElementById('recValorJaPago').value);
        const pagandoAgora = parseFloat(document.getElementById('recValorPagando').value);
        const formaAnterior = document.getElementById('recFormaAnterior').value;
        const formaNova = document.getElementById('recFormaPgto').value;

        const novoTotalPago = jaPago + pagandoAgora;
        const restante = valorTotal - novoTotalPago;

        let statusPgto = 'Pago';
        let dataVenc = null;

        // Se sobrou saldo, é parcial
        if (restante > 0.001) {
            statusPgto = 'Parcial';
            dataVenc = document.getElementById('recNovaData').value;
        }

        // Histórico de pagamentos (Ex: PIX (R$ 50) + Dinheiro (R$ 30))
        let historicoPgto = formaAnterior;
        const novoRegistro = `${formaNova} (R$ ${pagandoAgora.toFixed(2)})`;
        if (historicoPgto && historicoPgto !== '') {
            historicoPgto += ` + ${novoRegistro}`;
        } else {
            historicoPgto = novoRegistro;
        }

        const payload = {
            valor_pago: novoTotalPago,
            status_pagamento: statusPgto,
            forma_pagamento: historicoPgto,
            data_vencimento: dataVenc
        };

        await registrarPagamentoFinanceiro(id, payload);
        fecharModalReceber();
        await carregarTudo(); // Recarrega os indicadores e a tabela
        
        // Alerta de Sucesso
        const msg = document.createElement('div');
        msg.textContent = 'Pagamento baixado com sucesso!';
        msg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:var(--success); color:white; padding:12px 24px; border-radius:var(--radius-md); z-index:9999;';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 4000);

    } catch(err) {
        alert('Erro ao registrar recebimento.');
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});