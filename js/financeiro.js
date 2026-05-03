document.addEventListener('DOMContentLoaded', carregarFinanceiro);

async function carregarFinanceiro() {
    const servicos = await getServicos();
    const tbody = document.getElementById('financeiro-list');

    let totalRecebido = 0;
    let totalPendente = 0;
    let totalGeral = 0;

    if (servicos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum serviço registrado para o financeiro.</td></tr>';
        return;
    }

    tbody.innerHTML = servicos.map(s => {
        const valorTotal = parseFloat(s.valor || 0);
        totalGeral += valorTotal;

        // Lógica corrigida para lidar com pagamentos parciais
        let valPago = s.valor_pago !== null && s.valor_pago !== undefined ? parseFloat(s.valor_pago) : (s.status_pagamento === 'Pago' ? valorTotal : 0);
        if (valPago > valorTotal) valPago = valorTotal;

        let valPendente = valorTotal - valPago;
        if (valPendente < 0) valPendente = 0;

        // Agora soma corretamente nos cards superiores
        totalRecebido += valPago;
        totalPendente += valPendente;

        const formaAtual = s.forma_pagamento || '';
        const statusAtual = s.status_pagamento || 'Pendente';

        // Melhoria na interface: Mostra o que foi pago e o que falta se for parcial
        let infoValores = `<strong style="font-size: 16px;">R$ ${valorTotal.toFixed(2)}</strong>`;
        if (statusAtual === 'Parcial' && valPendente > 0) {
            infoValores += `<br><small style="color:var(--success); font-weight:600;">Pago: R$ ${valPago.toFixed(2)}</small>`;
            infoValores += `<br><small style="color:var(--warning); font-weight:600;">Falta: R$ ${valPendente.toFixed(2)}</small>`;
        }

        return `
            <tr id="row-fin-${s.id}">
                <td>
                    <strong>${s.clienteNome}</strong><br>
                    <small style="color:var(--text-muted)">${new Date(s.data).toLocaleDateString('pt-BR')} - ${s.tipo}</small>
                </td>
                <td>${infoValores}</td>
                <td>
                    <select id="forma-${s.id}" class="select-fin">
                        <option value="" ${formaAtual === '' ? 'selected' : ''}>A Definir</option>
                        <option value="PIX" ${formaAtual.includes('PIX') ? 'selected' : ''}>PIX</option>
                        <option value="Dinheiro" ${formaAtual.includes('Dinheiro') ? 'selected' : ''}>Dinheiro</option>
                        <option value="Débito" ${formaAtual.includes('Débito') ? 'selected' : ''}>Cartão de Débito</option>
                        <option value="Crédito" ${formaAtual.includes('Crédito') ? 'selected' : ''}>Cartão de Crédito</option>
                        <option value="Nota" ${formaAtual.includes('Nota') ? 'selected' : ''}>Faturado (Nota)</option>
                    </select>
                </td>
                <td>
                    <select id="status-${s.id}" class="select-fin" style="font-weight: 600; color: ${statusAtual === 'Pago' ? 'var(--success)' : (statusAtual === 'Parcial' ? 'var(--warning)' : 'var(--danger)')}">
                        <option value="Pendente" ${statusAtual === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Parcial" ${statusAtual === 'Parcial' ? 'selected' : ''} ${statusAtual !== 'Parcial' ? 'disabled' : ''}>Parcial</option>
                        <option value="Pago" ${statusAtual === 'Pago' ? 'selected' : ''}>Pago</option>
                    </select>
                </td>
                <td>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="salvarPgto(${s.id})">
                        <i class="fas fa-save"></i> Atualizar
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Atualiza os indicadores no topo da tela
    document.getElementById('total-recebido').textContent = `R$ ${totalRecebido.toFixed(2)}`;
    document.getElementById('total-pendente').textContent = `R$ ${totalPendente.toFixed(2)}`;
    document.getElementById('total-geral').textContent = `R$ ${totalGeral.toFixed(2)}`;
}

async function salvarPgto(id) {
    const statusVal = document.getElementById(`status-${id}`).value;
    const formaVal = document.getElementById(`forma-${id}`).value;

    const btn = document.querySelector(`#row-fin-${id} button`);
    const btnTextoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        await atualizarPagamentoServico(id, statusVal, formaVal);
        
        await carregarFinanceiro();
        
        const msg = document.createElement('div');
        msg.textContent = 'Pagamento atualizado com sucesso!';
        msg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:var(--success); color:white; padding:12px 24px; border-radius:8px; z-index:9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
        
    } catch (erro) {
        alert("Erro ao atualizar o banco de dados.");
        btn.innerHTML = btnTextoOriginal;
    }
}