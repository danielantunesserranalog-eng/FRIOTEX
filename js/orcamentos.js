let catalogoGlobal = [];

async function carregarOrcamentos() {
    const orcamentos = await getOrcamentos();
    const tbody = document.getElementById('orcamentos-list');
    
    if (orcamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum orçamento gerado</td></tr>';
        return;
    }
    
    tbody.innerHTML = orcamentos.map(orcamento => `
        <tr>
            <td><strong>${orcamento.clienteNome}</strong></td>
            <td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td>
            <td>${orcamento.validade} dias</td>
            <td><strong>R$ ${parseFloat(orcamento.valor).toFixed(2)}</strong></td>
            <td class="actions">
                <button class="btn-icon" style="color: var(--primary);" onclick="gerarPDF(${orcamento.id})" title="Gerar PDF"><i class="fas fa-file-pdf"></i></button>
                <button class="btn-icon" style="color: var(--danger);" onclick="excluirOrcamento(${orcamento.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function abrirModalOrcamento() {
    const clientes = await getClientes();
    catalogoGlobal = await getCatalogo();
    
    document.getElementById('clienteSelect').innerHTML = '<option value="">Selecione...</option>' + 
        clientes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`).join('');
    
    document.getElementById('orcamentoForm').reset();
    document.getElementById('orcamentoId').value = '';
    document.getElementById('dataOrcamento').value = new Date().toISOString().split('T')[0];
    document.getElementById('container-itens').innerHTML = ''; 
    document.getElementById('displayTotal').innerText = '0.00';
    document.getElementById('valorTotal').value = 0;
    
    adicionarLinhaItem();
    
    document.getElementById('orcamentoModal').style.display = 'block';
}

function fecharModalOrcamento() {
    document.getElementById('orcamentoModal').style.display = 'none';
}

function adicionarLinhaItem() {
    const container = document.getElementById('container-itens');
    const idUnico = Date.now();
    
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `row-${idUnico}`;
    
    const opcoesCatalogo = catalogoGlobal.map(c => `<option value="${c.nome}" data-preco="${c.valor_padrao}">${c.nome}</option>`).join('');
    
    div.innerHTML = `
        <select class="item-desc" onchange="atualizarPrecoLinha(${idUnico})" required>
            <option value="">Selecione ou digite...</option>
            ${opcoesCatalogo}
            <option value="OUTRO">Outro (Digitar Manualmente)</option>
        </select>
        <input type="number" class="item-qtd" value="1" min="1" step="0.1" oninput="calcularTotalLinha(${idUnico})" required>
        <input type="number" class="item-valor" value="0" step="0.01" oninput="calcularTotalLinha(${idUnico})" required>
        <input type="number" class="item-subtotal" value="0" readonly style="background: rgba(0,0,0,0.3); border-color: transparent;">
        <button type="button" class="btn-icon" style="color:var(--danger)" onclick="removerLinha(${idUnico})"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
}

function atualizarPrecoLinha(id) {
    const row = document.getElementById(`row-${id}`);
    const select = row.querySelector('.item-desc');
    const inputValor = row.querySelector('.item-valor');
    
    if (select.value === 'OUTRO') {
        select.outerHTML = `<input type="text" class="item-desc" placeholder="Descreva o item..." required>`;
        inputValor.value = 0;
    } else {
        const opcaoSelecionada = select.options[select.selectedIndex];
        if(opcaoSelecionada && opcaoSelecionada.getAttribute('data-preco')) {
            inputValor.value = opcaoSelecionada.getAttribute('data-preco');
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
    document.querySelectorAll('.item-subtotal').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
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
    if (confirm('Tem certeza que deseja excluir?')) {
        await deletarOrcamento(id);
        carregarOrcamentos();
    }
}

// ==========================================
// GERADOR DE PDF PROFISSIONAL COM DADOS DA EMPRESA
// ==========================================
async function gerarPDF(id) {
    const orcamentos = await getOrcamentos();
    const orcamento = orcamentos.find(o => o.id === id);
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.id == orcamento.cliente_id);
    
    // Busca as configurações globais da empresa cadastradas no Menu
    const empresa = await getEmpresa();
    const empresaNome = empresa?.nome_empresa || 'NOME DA EMPRESA';
    const empresaCnpj = empresa?.cnpj || '00.000.000/0001-00';
    const empresaEndereco = empresa?.endereco || 'Endereço não cadastrado';
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
            
            <!-- CABEÇALHO DA EMPRESA E DOCUMENTO -->
            <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #0ea5e9; padding-bottom: 25px; margin-bottom: 35px;">
                <div>
                    <h1 style="color: #0f172a; margin: 0; font-size: 34px; font-weight: 800; letter-spacing: -1px; text-transform: uppercase;">${empresaNome}</h1>
                    <p style="margin: 4px 0 0 0; color: #0ea5e9; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Sistemas de Refrigeração</p>
                    <div style="margin-top: 15px; font-size: 12px; color: #64748b; line-height: 1.6;">
                        <p style="margin:0;">CNPJ: ${empresaCnpj}</p>
                        <p style="margin:0;">${empresaEndereco}</p>
                        <p style="margin:0;">${empresaTelefone}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 700;">ORÇAMENTO</h2>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Nº <strong style="color:#0f172a;">${orcamento.id.toString().slice(-6).padStart(6, '0')}</strong></p>
                    <div style="margin-top: 20px; display: inline-block; text-align: right; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                        <p style="margin: 0 0 6px 0;"><strong style="color: #475569;">Data de Emissão:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-BR')}</p>
                        <p style="margin: 0;"><strong style="color: #475569;">Validade da Proposta:</strong> ${orcamento.validade} dias</p>
                    </div>
                </div>
            </div>

            <!-- DADOS DO CLIENTE -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0ea5e9; border-radius: 6px; padding: 20px; margin-bottom: 35px;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Dados do Cliente</h3>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 8px 0;"><strong style="color: #475569;">Nome / Razão Social:</strong> <span style="color: #0f172a; font-weight: 500;">${cliente.nome}</span></p>
                        <p style="margin: 0;"><strong style="color: #475569;">Telefone / Contato:</strong> <span style="color: #0f172a;">${cliente.telefone}</span></p>
                    </div>
                    <div style="flex: 1;">
                        <p style="margin: 0 0 8px 0;"><strong style="color: #475569;">E-mail:</strong> <span style="color: #0f172a;">${cliente.email || 'Não informado'}</span></p>
                        <p style="margin: 0;"><strong style="color: #475569;">Endereço:</strong> <span style="color: #0f172a;">${cliente.rua || ''} ${cliente.numero || ''} ${cliente.cidade ? '- ' + cliente.cidade : ''}</span></p>
                    </div>
                </div>
            </div>

            <!-- TABELA DE ITENS -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 6px 0 0 0;">Descrição / Serviço</th>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Qtd</th>
                        <th style="background: #0f172a; color: white; padding: 14px 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Valor Unit.</th>
                        <th style="background: #0ea5e9; color: white; padding: 14px 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0 6px 0 0;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itensHTML}
                </tbody>
            </table>

            <!-- TOTAL E DESCONTOS -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                <div style="width: 320px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 22px; font-weight: 700; color: #0f172a;">
                        <span>Total Geral:</span>
                        <span style="color: #0ea5e9;">R$ ${parseFloat(orcamento.valor).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- OBSERVAÇÕES -->
            <div style="margin-bottom: 80px;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Condições Gerais e Observações</h3>
                <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0; white-space: pre-line;">${orcamento.observacoes || 'Sem observações adicionais para este orçamento.'}</p>
            </div>

            <!-- ASSINATURAS (Fixadas no fundo do bloco) -->
            <div style="position: absolute; bottom: 40px; left: 40px; right: 40px; display: flex; justify-content: space-between; text-align: center;">
                <div style="width: 42%;">
                    <div style="border-top: 1px solid #0f172a; margin-bottom: 8px;"></div>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${empresaNome}</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Depto. Técnico / Comercial</p>
                </div>
                <div style="width: 42%;">
                    <div style="border-top: 1px solid #0f172a; margin-bottom: 8px;"></div>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${cliente.nome}</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">De Acordo / Aceite do Cliente</p>
                </div>
            </div>
        </div>
    `;
    
    pdfContainer.style.display = 'block';
    
    const opt = {
        margin: 0,
        filename: `Orcamento_${orcamento.id}_${cliente.nome.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(document.getElementById('documento-pdf')).save().then(() => {
        pdfContainer.style.display = 'none';
        pdfContainer.innerHTML = '';
    });
}

carregarOrcamentos();