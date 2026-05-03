document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosEmpresa();
    await carregarListaUsuarios();
});

// LOGICA EMPRESA
async function carregarDadosEmpresa() {
    try {
        const empresa = await getEmpresa();
        if (empresa) {
            document.getElementById('empresaId').value = empresa.id || '';
            document.getElementById('nome_empresa').value = empresa.nome_empresa || '';
            document.getElementById('cnpj').value = empresa.cnpj || '';
            document.getElementById('telefone').value = empresa.telefone || '';
            document.getElementById('endereco').value = empresa.endereco || '';
        }
    } catch (error) {
        console.error("Erro ao carregar dados da empresa:", error);
    }
}

document.getElementById('empresaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    const empresaData = {
        id: document.getElementById('empresaId').value ? parseInt(document.getElementById('empresaId').value) : null,
        nome_empresa: document.getElementById('nome_empresa').value,
        cnpj: document.getElementById('cnpj').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value
    };
    try {
        await salvarEmpresa(empresaData);
        alert('Configurações salvas com sucesso!');
        await carregarDadosEmpresa();
    } catch (error) {
        alert("Erro ao salvar empresa.");
    }
    btn.innerHTML = '<i class="fas fa-save"></i> Salvar Empresa';
});

// LOGICA USUARIOS
async function carregarListaUsuarios() {
    const usuarios = await getUsuarios();
    const tbody = document.getElementById('usuarios-list');
    
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum usuário cadastrado.</td></tr>';
        return;
    }
    
    tbody.innerHTML = usuarios.map(u => {
        // Verifica se o usuário precisa trocar a senha e cria um crachá bonito
        const statusSenha = u.deve_alterar_senha 
            ? '<br><span class="status-badge status-warning" style="margin-top:4px; font-size:10px;"><i class="fas fa-clock"></i> Senha Pendente (12345)</span>' 
            : '<br><span class="status-badge status-success" style="margin-top:4px; font-size:10px;"><i class="fas fa-check"></i> Acesso Ativo</span>';
        
        return `
        <tr>
            <td style="padding: 10px;"><strong>${u.nome_de_usuario}</strong> ${statusSenha}</td>
            <td style="padding: 10px;"><span class="status-badge ${u.papel === 'Admin' ? 'status-info' : 'status-warning'}">${u.papel}</span></td>
            <td style="padding: 10px;" class="actions">
                <button class="btn-icon" onclick="editarUsuario(${u.id}, '${u.nome_de_usuario}', '${u.papel}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="resetarSenha(${u.id})" title="Resetar Senha para 12345"><i class="fas fa-key"></i></button>
                <button class="btn-icon" style="color: var(--danger);" onclick="apagarUsuario(${u.id}, '${u.nome_de_usuario}')" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

function abrirModalUsuario() {
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('usuarioLogin').readOnly = false;
    document.getElementById('modalTitleUsuario').innerHTML = '<i class="fas fa-user-plus"></i> Novo Usuário';
    document.getElementById('usuarioModal').style.display = 'block';
}

function fecharModalUsuario() {
    document.getElementById('usuarioModal').style.display = 'none';
}

function editarUsuario(id, username, role) {
    document.getElementById('usuarioId').value = id;
    document.getElementById('usuarioLogin').value = username;
    document.getElementById('usuarioLogin').readOnly = true; // Login não pode ser mudado fácil
    document.getElementById('usuarioRole').value = role;
    document.getElementById('modalTitleUsuario').innerHTML = '<i class="fas fa-user-edit"></i> Editar Permissão';
    document.getElementById('usuarioModal').style.display = 'block';
}

document.getElementById('usuarioForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('usuarioId').value;
    const usr = {
        id: id ? parseInt(id) : null,
        username: document.getElementById('usuarioLogin').value.trim(),
        role: document.getElementById('usuarioRole').value
    };
    
    try {
        await salvarUsuarioDB(usr);
        fecharModalUsuario();
        carregarListaUsuarios();
        alert('Usuário salvo com sucesso!');
    } catch (e) {
        alert('Erro ao salvar. Verifique se o login já existe.');
        console.error(e);
    }
});

async function resetarSenha(id) {
    if(confirm('Tem certeza que deseja RESETAR a senha deste usuário para "12345"?')) {
        try {
            await resetarSenhaUsuario(id);
            alert('Senha resetada com sucesso! No próximo login, o usuário deverá criar uma nova.');
            carregarListaUsuarios();
        } catch(e) {
            alert('Erro ao resetar senha.');
        }
    }
}

async function apagarUsuario(id, username) {
    if(username === 'ADMIN') { alert('O usuário ADMIN principal não pode ser apagado.'); return; }
    if(username === localStorage.getItem('usuarioLogado')) { alert('Você não pode apagar a si mesmo enquanto estiver logado.'); return; }
    
    if(confirm(`Tem certeza que deseja apagar permanentemente o usuário ${username}?`)) {
        try {
            await deletarUsuarioDB(id);
            carregarListaUsuarios();
        } catch(e) {
            alert('Erro ao apagar usuário.');
        }
    }
}