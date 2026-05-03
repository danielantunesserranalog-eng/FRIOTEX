let clientesFiltrados = [];

async function carregarClientes() {
    const clientes = await getClientes();
    clientesFiltrados = clientes;
    renderizarClientes(clientes);
}

function renderizarClientes(clientes) {
    const tbody = document.getElementById('clientes-list');
    if (!tbody) return;
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum cliente cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(cliente => {
        // Monta o endereço de forma elegante para a tabela
        const enderecoFormatado = cliente.cidade 
            ? `${cliente.cidade}/${cliente.estado} - ${cliente.bairro}`
            : (cliente.endereco || '-'); // Fallback para clientes antigos

        return `
            <tr>
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.telefone}</td>
                <td>${cliente.email || '-'}</td>
                <td>${enderecoFormatado}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="editarCliente(${cliente.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="excluirCliente(${cliente.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-icon" onclick="verServicosCliente(${cliente.id})" title="Ver serviços">
                        <i class="fas fa-tools"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function abrirModalCliente(cliente = null) {
    const modal = document.getElementById('clienteModal');
    const form = document.getElementById('clienteForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (cliente) {
        modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Cliente';
        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('nome').value = cliente.nome;
        document.getElementById('telefone').value = cliente.telefone;
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('cep').value = cliente.cep || '';
        document.getElementById('rua').value = cliente.rua || '';
        document.getElementById('numero').value = cliente.numero || '';
        document.getElementById('bairro').value = cliente.bairro || '';
        document.getElementById('cidade').value = cliente.cidade || '';
        document.getElementById('estado').value = cliente.estado || '';
        document.getElementById('observacoes').value = cliente.observacoes || '';
    } else {
        modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Cliente';
        form.reset();
        document.getElementById('clienteId').value = '';
    }
    
    modal.style.display = 'block';
}

function fecharModalCliente() {
    document.getElementById('clienteModal').style.display = 'none';
}

// ==== BUSCA AUTOMÁTICA DE CEP (VIACEP) ====
async function buscarCEP(cep) {
    // Remove qualquer caractere que não seja número (ex: traços)
    const cepLimpo = cep.replace(/\D/g, '');
    
    // Verifica se tem 8 dígitos válidos
    if (cepLimpo.length !== 8) return;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
            document.getElementById('rua').value = data.logradouro;
            document.getElementById('bairro').value = data.bairro;
            document.getElementById('cidade').value = data.localidade;
            document.getElementById('estado').value = data.uf;
            
            // Foca automaticamente no campo número para o usuário só digitar ele
            document.getElementById('numero').focus(); 
        } else {
            alert('CEP não encontrado. Você pode preencher os campos manualmente.');
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
    }
}

async function editarCliente(id) {
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
        abrirModalCliente(cliente);
    }
}

async function excluirCliente(id) {
    if (confirm('⚠️ Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.')) {
        await deletarCliente(id);
        await carregarClientes();
        if (typeof carregarEstatisticas === 'function') {
            await carregarEstatisticas();
        }
    }
}

async function filtrarClientes() {
    const searchTerm = document.getElementById('search-cliente').value.toLowerCase();
    const clientes = await getClientes();
    
    if (searchTerm === '') {
        clientesFiltrados = clientes;
    } else {
        clientesFiltrados = clientes.filter(cliente => 
            cliente.nome.toLowerCase().includes(searchTerm) ||
            cliente.telefone.includes(searchTerm) ||
            (cliente.cidade && cliente.cidade.toLowerCase().includes(searchTerm)) ||
            (cliente.bairro && cliente.bairro.toLowerCase().includes(searchTerm))
        );
    }
    
    renderizarClientes(clientesFiltrados);
}

async function limparFiltro() {
    document.getElementById('search-cliente').value = '';
    await carregarClientes();
}

async function verServicosCliente(clienteId) {
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
        window.location.href = `servicos.html?cliente=${clienteId}`;
    }
}

// Event Listeners
if (document.getElementById('clienteForm')) {
    document.getElementById('clienteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Coleta todos os dados, incluindo os novos campos de endereço
        const cliente = {
            id: parseInt(document.getElementById('clienteId').value) || null,
            nome: document.getElementById('nome').value,
            telefone: document.getElementById('telefone').value,
            email: document.getElementById('email').value,
            cep: document.getElementById('cep').value,
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value.toUpperCase(),
            observacoes: document.getElementById('observacoes').value
        };
        
        if (!cliente.nome || !cliente.telefone) {
            alert('Por favor, preencha todos os campos obrigatórios (*)');
            return;
        }
        
        try {
            await salvarCliente(cliente);
            fecharModalCliente();
            await carregarClientes();
            
            const msg = document.createElement('div');
            msg.className = 'success-message';
            msg.textContent = 'Cliente salvo com sucesso!';
            msg.style.cssText = 'position:fixed; top:20px; right:20px; background:#48bb78; color:white; padding:12px 24px; border-radius:12px; z-index:9999;';
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        } catch (error) {
            alert("Erro ao salvar cliente. Verifique o banco de dados.");
            console.error(error);
        }
    });
    
    window.onclick = function(event) {
        const modal = document.getElementById('clienteModal');
        if (event.target === modal) fecharModalCliente();
        const modalServico = document.getElementById('servicoModal');
        if (event.target === modalServico) fecharModalServico();
    }
    
    carregarClientes();
}