document.addEventListener('DOMContentLoaded', carregarColaboradores);

async function carregarColaboradores() {
    const colabs = await getColaboradores();
    const tbody = document.getElementById('colaboradores-list');
    
    if (colabs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum colaborador cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = colabs.map(c => `
        <tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.telefone || '-'}</td>
            <td class="actions">
                <button class="btn-icon" onclick="editarColab(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="excluirColab(${c.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function abrirModalColab(colab = null) {
    document.getElementById('colabForm').reset();
    document.getElementById('colabId').value = '';
    
    if(colab) {
        document.getElementById('modalTitleColab').innerHTML = '<i class="fas fa-edit"></i> Editar Colaborador';
        document.getElementById('colabId').value = colab.id;
        document.getElementById('nomeColab').value = colab.nome;
        document.getElementById('telefoneColab').value = colab.telefone;
    } else {
        document.getElementById('modalTitleColab').innerHTML = '<i class="fas fa-user-plus"></i> Novo Colaborador';
    }
    document.getElementById('colabModal').style.display = 'block';
}

function fecharModalColab() {
    document.getElementById('colabModal').style.display = 'none';
}

async function editarColab(id) {
    const colabs = await getColaboradores();
    abrirModalColab(colabs.find(c => c.id === id));
}

async function excluirColab(id) {
    if(confirm('Excluir este colaborador?')) {
        await deletarColaborador(id);
        carregarColaboradores();
    }
}

document.getElementById('colabForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const colab = {
        id: document.getElementById('colabId').value || null,
        nome: document.getElementById('nomeColab').value,
        telefone: document.getElementById('telefoneColab').value
    };
    await salvarColaborador(colab);
    fecharModalColab();
    carregarColaboradores();
});