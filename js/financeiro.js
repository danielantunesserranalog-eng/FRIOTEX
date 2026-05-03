let abaFinAtual = 'entradas';
let servicosGerais = [];
let despesasGerais = [];
let contasGerais = [];

document.addEventListener('DOMContentLoaded', carregarTudo);

async function carregarTudo() {
    servicosGerais = await getServicos();
    try {
        despesasGerais = await getDespesas();
        contasGerais = await getContasAPagar();
    } catch(e) {
        console.warn("Tabelas novas não criadas ainda no Supabase.");
    }
    calcularIndicadores();
    renderizarAba();
}

function calcularIndicadores() {
    let recebido = 0;
    let pendente = 0;
    let saidas = 0;
    let contasPendentes = 0;

    // Entradas
    servicosGerais.forEach(s => {
        const valorTotal = parseFloat(s.valor || 0);
        let valPago = s.valor_pago !== null && s.valor_pago !== undefined ? parseFloat(s.valor_pago) : (s.status_pagamento === 'Pago' ? valorTotal : 0);
        if (valPago > valorTotal) valPago = valorTotal;

        let valPendente = valorTotal - valPago;
        if (valPendente < 0) valPendente = 0;

        recebido += valPago;
        pendente += valPendente;
    });

    // Saídas (Pagas)
    despesasGerais.forEach(d => {
        saidas += parseFloat(d.valor || 0);
    });

    // Contas a Pagar (Futuro)
    contasGerais.forEach(c => {
        if(c.status !== 'Pago') {
            contasPendentes += parseFloat(c.valor || 0);
        }
    });

    const saldo = recebido - saidas;

    document.getElementById('total-recebido').textContent = `R$ ${recebido.toFixed(2)}`;
    document.getElementById('total-saidas').textContent = `R$ ${saidas.toFixed(2)}`;
    document.getElementById('saldo-atual').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('total-pendente').textContent = `R$ ${pendente.toFixed(2)}`;
    document.getElementById('total-contas-pendentes').textContent = `R$ ${contasPendentes.toFixed(2)}`;
}

function mudarAbaFin(aba) {
    abaFinAtual = aba;
    document.getElementById('tab-entradas').className = aba === 'entradas' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    document.getElementById('tab-saidas').className = aba === 'saidas' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    document.getElementById('tab-apagar').className = aba === 'apagar' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
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
            
            let vencimentoBadge = '-';
            if (s.data_vencimento && valPendente > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                const corVenc = s.data_vencimento < hoje ? 'var(--danger)' : 'var(--warning)';
                vencimentoBadge = `<span style="color: ${corVenc}; font-weight: bold;"><i class="fas fa-calendar-alt"></i> ${new Date(s.data_vencimento).toLocaleDateString('pt-BR')}</span>`;
            } else if (statusAtual === 'Pago') {
                vencimentoBadge = `<span style="color: var(--success);"><i class="fas fa-check"></i> Quitado</span>`;
            }

            let infoValores = `<strong>R$ ${valorTotal.toFixed(2)}</strong>`;
            if (valPago > 0 && valPendente > 0) {
                infoValores += `<br><small style="color:var(--success);">Pago: R$ ${valPago.toFixed(2)}</small>`;
                infoValores += `<br><small style="color:var(--warning);">Falta: R$ ${valPendente.toFixed(2)}</small>`;
            }

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

    } else if (abaFinAtual === 'apagar') {
        // ABA DE CONTAS A PAGAR (AGENDA)
        thead.innerHTML = `
            <tr>
                <th>Descrição / Beneficiário</th>
                <th>Categoria / Tipo</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Ações</th>
            </tr>
        `;
        
        const pendentes = contasGerais.filter(c => c.status !== 'Pago');

        if (pendentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma conta a pagar agendada.</td></tr>';
            return;
        }

        tbody.innerHTML = pendentes.map(c => {
            const hoje = new Date().toISOString().split('T')[0];
            const estaAtrasado = c.data_vencimento < hoje;
            const corData = estaAtrasado ? 'var(--danger)' : 'var(--text-main)';
            const iconAtraso = estaAtrasado ? '<i class="fas fa-exclamation-circle"></i> Atrasado: ' : '';
            const badgeRecorrente = c.recorrente ? `<span class="badge" style="background: rgba(14,165,233,0.1); color: var(--primary); font-size: 10px; margin-left: 8px;"><i class="fas fa-sync-alt"></i> Fixa Mês</span>` : '';

            return `
                <tr>
                    <td><strong>${c.descricao}</strong> ${badgeRecorrente}</td>
                    <td><span style="color: var(--text-muted);">${c.categoria}</span></td>
                    <td style="color: ${corData}; font-weight: ${estaAtrasado ? 'bold' : 'normal'};">${iconAtraso}${new Date(c.data_vencimento).toLocaleDateString('pt-BR')}</td>
                    <td><strong style="color: var(--warning); font-size: 16px;">R$ ${parseFloat(c.valor).toFixed(2)}</strong></td>
                    <td class="actions">
                        <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: var(--success); border-color: var(--success);" onclick="confirmarPagamentoConta(${c.id})" title="Dar Baixa (Deduzir do Caixa)">
                            <i class="fas fa-check"></i> Pagar
                        </button>
                        <button class="btn-icon" style="color: var(--danger);" onclick="excluirConta(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

    } else {
        // ABA DE SAÍDAS (HISTÓRICO PAGO)
        thead.innerHTML = `
            <tr>
                <th>Data da Saída</th>
                <th>Categoria</th>
                <th>Descrição / Referência</th>
                <th>Valor Retirado</th>
                <th>Ações</th>
            </tr>
        `;
        
        if (despesasGerais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum histórico de saídas.</td></tr>';
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
                        <button class="btn-icon" style="color: var(--danger);" onclick="apagarSaida(${d.id})" title="Apagar e Estornar Saldo"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// ==========================================
// CONTAS A PAGAR (AGENDAR E PAGAR)
// ==========================================
function abrirModalAgendar() {
    document.getElementById('agendarForm').reset();
    document.getElementById('agId').value = '';
    document.getElementById('agData').value = new Date().toISOString().split('T')[0];
    document.getElementById('agendarModal').style.display = 'block';
}

function fecharModalAgendar() {
    document.getElementById('agendarModal').style.display = 'none';
}

document.getElementById('agendarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Salvando...';

    const conta = {
        descricao: document.getElementById('agDescricao').value,
        categoria: document.getElementById('agCategoria').value,
        valor: parseFloat(document.getElementById('agValor').value),
        data_vencimento: document.getElementById('agData').value,
        recorrente: document.getElementById('agRecorrente').checked,
        status: 'Pendente'
    };

    try {
        await salvarContaAPagar(conta);
        fecharModalAgendar();
        await carregarTudo();
    } catch (err) {
        alert("Erro ao salvar. Verifique se criou a tabela 'contas_a_pagar' no Supabase.");
    } finally {
        btn.innerHTML = 'Salvar Agendamento';
    }
});

async function excluirConta(id) {
    if(confirm('Tem certeza que deseja excluir esta previsão de conta a pagar?')) {
        await deletarContaAPagar(id);
        await carregarTudo();
    }
}

async function confirmarPagamentoConta(id) {
    const conta = contasGerais.find(c => c.id === id);
    if(!conta) return;

    if(confirm(`Você confirma o pagamento de "${conta.descricao}" (R$ ${conta.valor})? \n\nIsso moverá a conta para o Histórico de Saídas e abaterá o valor do seu Saldo Atual no sistema.`)) {
        try {
            // 1. Marca a conta original como paga
            await salvarContaAPagar({ id: conta.id, status: 'Pago' });
            
            // 2. Cria a despesa real para bater no fluxo de caixa
            await salvarDespesa({
                data: new Date().toISOString().split('T')[0],
                categoria: conta.categoria,
                valor: conta.valor,
                descricao: `PGT Conta Agendada: ${conta.descricao}`
            });

            // 3. Se for recorrente, clona a conta para o próximo mês automaticamente
            if (conta.recorrente) {
                let dataVenc = new Date(conta.data_vencimento);
                dataVenc.setMonth(dataVenc.getMonth() + 1); // Soma 1 mês
                const proximoMesData = dataVenc.toISOString().split('T')[0];

                await salvarContaAPagar({
                    descricao: conta.descricao,
                    categoria: conta.categoria,
                    valor: conta.valor,
                    data_vencimento: proximoMesData,
                    status: 'Pendente',
                    recorrente: true
                });
                alert('Conta paga! O agendamento para o mês que vem já foi criado automaticamente.');
            } else {
                alert('Conta paga com sucesso e saldo deduzido!');
            }

            await carregarTudo();

        } catch (e) {
            alert('Erro ao processar pagamento da conta.');
            console.error(e);
        }
    }
}

// ==========================================
// SAÍDAS AVULSAS E SANGRIAS
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
        alert("Erro ao salvar saída.");
    } finally {
        btn.innerHTML = 'Confirmar Saída';
    }
});

async function apagarSaida(id) {
    if(confirm('Tem certeza que deseja apagar este registro de saída? O dinheiro voltará para o Saldo Atual.')) {
        await deletarDespesa(id);
        await carregarTudo();
    }
}

// ==========================================
// FUNÇÕES DO MODAL DE RECEBIMENTO DE ENTRADAS
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

    if (novoFalta > 0.001) {
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

        if (restante > 0.001) {
            statusPgto = 'Parcial';
            dataVenc = document.getElementById('recNovaData').value;
        }

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
        await carregarTudo();
        
        const msg = document.createElement('div');
        msg.textContent = 'Pagamento baixado com sucesso!';
        msg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:var(--success); color:white; padding:12px 24px; border-radius:var(--radius-md); z-index:9999;';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 4000);

    } catch(err) {
        alert('Erro ao registrar recebimento.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});