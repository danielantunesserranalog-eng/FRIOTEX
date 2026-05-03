let catalogoGlobal = [];
let abaAtualOrc = 'pendentes'; 
let orcGlobais = [];

async function carregarOrcamentos() {
    orcGlobais = await getOrcamentos();
    renderizarAbaOrcamentos();
}

function mudarAbaOrcamentos(aba) {
    abaAtualOrc = aba;
    document.getElementById('tab-pendentes').className = aba === 'pendentes' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    document.getElementById('tab-historico').className = aba === 'historico' ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
    renderizarAbaOrcamentos();
}

function renderizarAbaOrcamentos() {
    const tbody = document.getElementById('orcamentos-list');
    
    let filtrados = [];
    if (abaAtualOrc === 'pendentes') {
        filtrados = orcGlobais.filter(o => o.status !== 'Aceito');
    } else {
        filtrados = orcGlobais.filter(o => o.status === 'Aceito');
    }
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum orçamento encontrado nesta aba</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtrados.map(orcamento => {
        const itensDescricao = (orcamento.itens || []).map(i => i.descricao).join(', ');
        const descResumida = itensDescricao.length > 50 ? itensDescricao.substring(0, 50) + '...' : (itensDescricao || 'Sem itens');
        const btnAprovar = orcamento.status !== 'Aceito' ? `<button class="btn-icon" style="color: var(--success);" onclick="abrirModalAprovar(${orcamento.id})" title="Aprovar e Gerar Serviço"><i class="fas fa-check-circle"></i></button>` : `<span class="badge" style="background: rgba(16,185,129,0.1); color: var(--success);">Aceito</span>`;
        
        return `
            <tr>
                <td><strong>#${orcamento.id.toString().padStart(5, '0')}</strong></td>
                <td>${orcamento.clienteNome}</td>
                <td><span style="color: var(--primary); font-weight: 500;" title="${itensDescricao}">${descResumida}</span></td>
                <td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td>
                <td><strong style="color: #10b981;">R$ ${parseFloat(orcamento.valor).toFixed(2)}</strong></td>
                <td class="actions">
                    <button class="btn-icon" style="color: var(--text-main);" onclick="visualizarOrcamento(${orcamento.id})" title="Visualizar na tela"><i class="fas fa-eye"></i></button>
                    ${btnAprovar}
                    <button class="btn-icon" style="color: #25D366;" onclick="enviarWhatsApp(${orcamento.id})" title="Enviar PDF pelo WhatsApp"><i class="fab fa-whatsapp"></i></button>
                    <button class="btn-icon" style="color: var(--primary);" onclick="gerarPDF(${orcamento.id})" title="Baixar PDF"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn-icon" style="color: var(--danger);" onclick="excluirOrcamento(${orcamento.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// LÓGICA DO ORÇAMENTO (CRIAR E EDITAR)
// ==========================================
async function abrirModalOrcamento() {
    const clientes = await getClientes();
    catalogoGlobal = await getCatalogo();
    
    document.getElementById('clienteSelect').innerHTML = '<option value="">Selecione um cliente...</option>' + 
        clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        
    document.getElementById('orcamentoForm').reset();
    document.getElementById('orcamentoId').value = '';
    document.getElementById('dataOrcamento').value = new Date().toISOString().split('T')[0];
    document.getElementById('container-itens').innerHTML = ''; 
    document.getElementById('displayTotal').innerText = '0.00';
    document.getElementById('valorTotal').value = 0;
    
    adicionarLinhaItem();
    document.getElementById('orcamentoModal').style.display = 'block';
}

function fecharModalOrcamento() { document.getElementById('orcamentoModal').style.display = 'none'; }

function adicionarLinhaItem() {
    const container = document.getElementById('container-itens');
    const idUnico = Date.now();
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `row-${idUnico}`;
    
    const opcoesCatalogo = catalogoGlobal.map(c => 
        `<option value="${c.nome}" data-preco="${c.valor_padrao}">${c.nome} (R$ ${parseFloat(c.valor_padrao).toFixed(2)})</option>`
    ).join('');
    
    div.innerHTML = `
        <div>
            <select class="item-desc" onchange="atualizarPrecoLinha(${idUnico})" required>
                <option value="">Selecione um serviço ou peça...</option>
                <optgroup label="Seu Catálogo">${opcoesCatalogo}</optgroup>
                <optgroup label="Personalizado"><option value="OUTRO">+ Digitar item manualmente</option></optgroup>
            </select>
        </div>
        <div><input type="number" class="item-qtd" value="1" min="0.1" step="0.1" oninput="calcularTotalLinha(${idUnico})" required></div>
        <div class="input-with-icon"><span>R$</span><input type="number" class="item-valor" value="0.00" step="0.01" oninput="calcularTotalLinha(${idUnico})" required></div>
        <div class="input-with-icon"><span style="color: var(--primary);">R$</span><input type="text" class="item-subtotal item-subtotal-box" value="0.00" readonly></div>
        <div><button type="button" class="btn-icon" style="color:var(--danger); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1);" onclick="removerLinha(${idUnico})"><i class="fas fa-trash"></i></button></div>
    `;
    container.appendChild(div);
}

function atualizarPrecoLinha(id) {
    const row = document.getElementById(`row-${id}`);
    const select = row.querySelector('.item-desc');
    const inputValor = row.querySelector('.item-valor');
    
    if (select.value === 'OUTRO') {
        select.outerHTML = `<input type="text" class="item-desc" placeholder="Descreva o serviço/peça..." style="border-color: var(--primary); box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);" required autofocus>`;
        inputValor.value = '0.00';
    } else {
        const opc = select.options[select.selectedIndex];
        if(opc && opc.getAttribute('data-preco')) {
            inputValor.value = parseFloat(opc.getAttribute('data-preco')).toFixed(2);
        }
    }
    calcularTotalLinha(id);
}

function calcularTotalLinha(id) {
    const row = document.getElementById(`row-${id}`);
    const qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
    const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
    row.querySelector('.item-subtotal').value = (qtd * valor).toFixed(2);
    calcularTotalGeral();
}

function removerLinha(id) {
    document.getElementById(`row-${id}`).remove();
    calcularTotalGeral();
}

function calcularTotalGeral() {
    let total = 0;
    document.querySelectorAll('.item-subtotal').forEach(inp => total += parseFloat(inp.value) || 0);
    document.getElementById('valorTotal').value = total;
    document.getElementById('displayTotal').innerText = total.toFixed(2);
}

document.getElementById('orcamentoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    let arrayItens = [];
    document.querySelectorAll('.item-row').forEach(row => {
        arrayItens.push({
            descricao: row.querySelector('.item-desc').value,
            quantidade: parseFloat(row.querySelector('.item-qtd').value),
            valorUnitario: parseFloat(row.querySelector('.item-valor').value),
            subtotal: parseFloat(row.querySelector('.item-subtotal').value)
        });
    });
    
    const orcamento = {
        cliente_id: parseInt(document.getElementById('clienteSelect').value),
        data: document.getElementById('dataOrcamento').value,
        validade: parseInt(document.getElementById('validade').value),
        valor: parseFloat(document.getElementById('valorTotal').value),
        descricao: "Orçamento gerado pelo sistema",
        itens: arrayItens,
        observacoes: document.getElementById('observacoesOrcamento').value
    };
    
    await salvarOrcamento(orcamento);
    fecharModalOrcamento();
    carregarOrcamentos();
});

async function excluirOrcamento(id) {
    if (confirm('Excluir este orçamento definitivamente?')) {
        await deletarOrcamento(id);
        carregarOrcamentos();
    }
}

// ==========================================
// APROVAR ORÇAMENTO E WHATSAPP
// ==========================================
async function abrirModalAprovar(orcamentoId) {
    const colabs = await getColaboradores();
    document.getElementById('aprovColaborador').innerHTML = '<option value="">Selecione um técnico...</option>' + 
        colabs.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        
    const orcamentoOriginal = orcGlobais.find(o => o.id === orcamentoId);
    
    document.getElementById('aprovarForm').reset();
    document.getElementById('aprovOrcamentoId').value = orcamentoId;
    document.getElementById('aprovData').value = new Date().toISOString().split('T')[0];
    
    if (orcamentoOriginal && orcamentoOriginal.tipo) {
        const selectTipo = document.getElementById('aprovTipoServico');
        let optionExists = Array.from(selectTipo.options).some(opt => opt.value === orcamentoOriginal.tipo);
        if(!optionExists) selectTipo.innerHTML += `<option value="${orcamentoOriginal.tipo}">${orcamentoOriginal.tipo}</option>`;
        selectTipo.value = orcamentoOriginal.tipo;
    }
    
    document.getElementById('aprovarModal').style.display = 'block';
}

function fecharModalAprovar() { document.getElementById('aprovarModal').style.display = 'none'; }

document.getElementById('aprovarForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const orcamentoId = parseInt(document.getElementById('aprovOrcamentoId').value);
    const orcamentoOriginal = orcGlobais.find(o => o.id === orcamentoId);
    
    if(!orcamentoOriginal) return;
    
    let detalhesItens = orcamentoOriginal.itens.map(i => `${i.quantidade}x ${i.descricao}`).join("\n");
    let desc = `Serviço gerado a partir do Orçamento #${orcamentoOriginal.id}\nItens:\n${detalhesItens}`;
    
    const novoServico = {
        cliente_id: orcamentoOriginal.cliente_id,
        tipo: document.getElementById('aprovTipoServico').value,
        data: document.getElementById('aprovData').value,
        hora: document.getElementById('aprovHora').value,
        colaborador_id: parseInt(document.getElementById('aprovColaborador').value),
        status: 'Pendente',
        valor: orcamentoOriginal.valor,
        descricao: desc,
        prazo: null
    };
    
    try {
        await salvarServico(novoServico);
        await salvarOrcamento({ id: orcamentoOriginal.id, status: 'Aceito' });
        
        alert('Serviço agendado e orçamento transferido para o Histórico!');
        fecharModalAprovar();
        carregarOrcamentos();
    } catch (err) {
        alert("Erro ao gerar o serviço.");
        console.error(err);
    }
});

async function enviarWhatsApp(id) {
    const orcamento = orcGlobais.find(o => o.id === id);
    if (!orcamento) return;
    
    // Gera e baixa o PDF localmente
    await gerarPDF(id);
    
    // Formata o número (remove traços e parênteses)
    let numero = orcamento.clienteTelefone ? orcamento.clienteTelefone.replace(/\D/g, '') : '';
    
    if (numero && numero.length >= 10) {
        // Se for número nacional, adiciona o 55 do Brasil
        if (numero.length === 10 || numero.length === 11) {
            numero = '55' + numero;
        }
        
        const msg = `Olá, ${orcamento.clienteNome}! Tudo bem?\n\nSegue em anexo o *Orçamento #${orcamento.id.toString().padStart(5, '0')}* referente aos nossos serviços, no valor total de *R$ ${parseFloat(orcamento.valor).toFixed(2)}*.\n\nEstou enviando o arquivo PDF com todos os detalhes. Qualquer dúvida, estou à disposição!`;
        const url = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(msg)}`;
        
        // Aguarda 1,5 segundos para o navegador terminar de baixar o PDF e depois abre a nova aba do WhatsApp
        setTimeout(() => {
            window.open(url, '_blank');
        }, 1500);
    } else {
        alert('O PDF foi gerado! Porém, este cliente não tem um telefone válido cadastrado para abrir o WhatsApp automaticamente.');
    }
}

// ==========================================
// VISUALIZAR ORÇAMENTO & PDF
// ==========================================
async function visualizarOrcamento(id) {
    const orcamento = orcGlobais.find(o => o.id === id);
    if (!orcamento) return;
    
    const itensHTML = (orcamento.itens || []).map(item => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px 10px; color: var(--text-main);">${item.descricao}</td>
            <td style="padding: 12px 10px; text-align: center; color: var(--text-main);">${item.quantidade}</td>
            <td style="padding: 12px 10px; text-align: right; color: var(--text-main);">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: var(--primary);">R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    document.getElementById('conteudoVisualizarOrcamento').innerHTML = `
        <div style="margin-bottom: 25px; display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 20px;">
            <div>
                <h3 style="margin-bottom: 8px; color: var(--text-main); font-size: 20px;">Orçamento #${orcamento.id.toString().padStart(5, '0')}</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 4px;"><strong>Cliente:</strong> ${orcamento.clienteNome}</p>
                <p style="color: var(--text-muted); font-size: 14px; margin: 0;"><strong>Data de Emissão:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-BR')}</p>
            </div>
            <div style="text-align: right; background: var(--bg-input); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Valor Total</p>
                <h3 style="color: var(--success); font-size: 26px; margin-bottom: 4px;">R$ ${parseFloat(orcamento.valor).toFixed(2)}</h3>
                <p style="color: var(--text-muted); font-size: 12px; margin: 0;">Válido por ${orcamento.validade} dias</p>
            </div>
        </div>
        
        <h4 style="margin-bottom: 15px; color: var(--text-main); font-size: 16px;"><i class="fas fa-list-ul"></i> Itens do Orçamento</h4>
        <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: rgba(0,0,0,0.2); text-align: left;">
                        <th style="padding: 12px 10px; color: var(--text-muted); font-weight: 600;">Descrição do Serviço ou Peça</th>
                        <th style="padding: 12px 10px; text-align: center; color: var(--text-muted); font-weight: 600;">Qtd</th>
                        <th style="padding: 12px 10px; text-align: right; color: var(--text-muted); font-weight: 600;">Valor Unit.</th>
                        <th style="padding: 12px 10px; text-align: right; color: var(--text-muted); font-weight: 600;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
        
        <div style="background: rgba(14, 165, 233, 0.05); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--primary);">
            <h4 style="margin-bottom: 8px; color: var(--text-main); font-size: 14px;">Condições e Observações</h4>
            <p style="color: var(--text-muted); font-size: 13px; margin: 0; white-space: pre-line; line-height: 1.6;">${orcamento.observacoes || 'Nenhuma observação informada.'}</p>
        </div>
    `;
    document.getElementById('visualizarOrcamentoModal').style.display = 'block';
}

function fecharModalVisualizarOrcamento() { document.getElementById('visualizarOrcamentoModal').style.display = 'none'; }

async function gerarPDF(id) {
    const orcamento = orcGlobais.find(o => o.id === id);
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.id == orcamento.cliente_id);
    const empresa = await getEmpresa();
    
    const empresaNome = empresa?.nome_empresa || 'NOME DA EMPRESA';
    const empresaCnpj = empresa?.cnpj || '00.000.000/0001-00';
    const empresaEndereco = empresa?.endereco || 'Endereço cadastrado';
    const empresaTelefone = empresa?.telefone || '(00) 00000-0000';
    
    if (!orcamento || !cliente) return;
    const itensHTML = (orcamento.itens || []).map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 13px;">${item.descricao}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-size: 13px;">${item.quantidade}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-size: 13px;">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a; font-size: 13px;">R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');
    
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer.innerHTML = `
        <div id="documento-pdf" style="padding: 40px; background: white; color: #334155; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; position: relative; min-height: 1040px; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #0ea5e9; padding-bottom: 25px; margin-bottom: 35px;">
                <div>
                    <h1 style="color: #0f172a; margin: 0; font-size: 34px; font-weight: 800;">${empresaNome}</h1>
                    <div style="margin-top: 15px; font-size: 12px; color: #64748b; line-height: 1.6;">
                        <p style="margin:0;">CNPJ: ${empresaCnpj}</p><p style="margin:0;">${empresaEndereco}</p><p style="margin:0;">${empresaTelefone}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 700;">ORÇAMENTO</h2>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Nº <strong style="color:#0f172a;">${orcamento.id.toString().padStart(6, '0')}</strong></p>
                    <div style="margin-top: 20px; display: inline-block; text-align: right; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                        <p style="margin: 0 0 6px 0;"><strong style="color: #475569;">Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0ea5e9; border-radius: 6px; padding: 20px; margin-bottom: 35px;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 14px; text-transform: uppercase;">Dados do Orçamento</h3>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <div style="flex: 1;"><p style="margin: 0 0 8px 0;"><strong style="color: #475569;">Cliente:</strong> <span style="color: #0f172a; font-weight: 500;">${cliente.nome}</span></p></div>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: left; font-size: 12px;">Descrição</th>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: center; font-size: 12px;">Qtd</th>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: right; font-size: 12px;">V. Unit.</th>
                        <th style="background: #0ea5e9; color: white; padding: 14px 12px; text-align: right; font-size: 12px;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itensHTML}</tbody>
            </table>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                <div style="width: 320px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 22px; font-weight: 700; color: #0f172a;">
                        <span>Total Geral:</span><span style="color: #0ea5e9;">R$ ${parseFloat(orcamento.valor).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    pdfContainer.style.display = 'block';
    
    // Retornamos a promessa para o WhatsApp saber quando terminou de baixar
    return html2pdf().set({
        margin: 0, filename: `Orcamento_${orcamento.id}.pdf`, image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    }).from(document.getElementById('documento-pdf')).save().then(() => {
        pdfContainer.style.display = 'none'; pdfContainer.innerHTML = '';
    });
}

carregarOrcamentos();