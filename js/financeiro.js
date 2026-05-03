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
        const valor = parseFloat(s.valor || 0);
        totalGeral += valor;

        // Lógica para somar os totais baseado no status_pagamento do banco
        if (s.status_pagamento === 'Pago') {
            totalRecebido += valor;
        } else {
            totalPendente += valor;
        }

        const formaAtual = s.forma_pagamento || '';
        const statusAtual = s.status_pagamento || 'Pendente';

        return `
            <tr id="row-fin-${s.id}">
                <td>
                    <strong>${s.clienteNome}</strong><br>
                    <small style="color:var(--text-muted)">${new Date(s.data).toLocaleDateString('pt-BR')} - ${s.tipo}</small>
                </td>
                <td><strong style="font-size: 16px;">R$ ${valor.toFixed(2)}</strong></td>
                <td>
                    <select id="forma-${s.id}" class="select-fin">
                        <option value="" ${formaAtual === '' ? 'selected' : ''}>A Definir</option>
                        <option value="PIX" ${formaAtual === 'PIX' ? 'selected' : ''}>PIX</option>
                        <option value="Dinheiro" ${formaAtual === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                        <option value="Débito" ${formaAtual === 'Débito' ? 'selected' : ''}>Cartão de Débito</option>
                        <option value="Crédito" ${formaAtual === 'Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                        <option value="Nota" ${formaAtual === 'Nota' ? 'selected' : ''}>Faturado (Nota)</option>
                    </select>
                </td>
                <td>
                    <select id="status-${s.id}" class="select-fin" style="font-weight: 600; color: ${statusAtual === 'Pago' ? 'var(--success)' : 'var(--warning)'}">
                        <option value="Pendente" ${statusAtual !== 'Pago' ? 'selected' : ''}>Pendente</option>
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
    
    // Feedback visual rápido
    const btn = document.querySelector(`#row-fin-${id} button`);
    const btnTextoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    try {
        await atualizarPagamentoServico(id, statusVal, formaVal);
        
        // Recarrega a tela para atualizar os valores dos indicadores lá no topo
        await carregarFinanceiro();
        
        // Exibe mensagem de sucesso flutuante
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