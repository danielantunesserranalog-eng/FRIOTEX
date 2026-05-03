document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosEmpresa();
});

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
    
    const empresaData = {
        id: document.getElementById('empresaId').value ? parseInt(document.getElementById('empresaId').value) : null,
        nome_empresa: document.getElementById('nome_empresa').value,
        cnpj: document.getElementById('cnpj').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value
    };

    try {
        await salvarEmpresa(empresaData);
        
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.textContent = 'Configurações salvas com sucesso!';
        msg.style.cssText = 'position:fixed; top:20px; right:20px; background:#48bb78; color:white; padding:12px 24px; border-radius:12px; z-index:9999;';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
        
        await carregarDadosEmpresa();
    } catch (error) {
        alert("Erro ao salvar configurações da empresa.");
        console.error(error);
    }
});