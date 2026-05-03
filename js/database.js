// ==========================================
// BARREIRA DE SEGURANÇA E SESSÃO
// ==========================================
const currentFileName = window.location.pathname.split('/').pop() || 'index.html';
const isPagesFolder = window.location.pathname.includes('/pages/');

const loginPath = isPagesFolder ? '../login.html' : 'login.html';
const indexPath = isPagesFolder ? '../index.html' : 'index.html';

if (currentFileName !== 'login.html') {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    const userRole = localStorage.getItem('userRole'); 
    
    if (!usuarioLogado) {
        window.location.href = loginPath;
    } else {
        // Bloqueia acesso a menus administrativos para quem for Técnico
        // Nota: 'Administrador' e 'Técnico' devem bater com o que está no banco
        if (userRole === 'Técnico' && (currentFileName === 'financeiro.html' || currentFileName === 'configuracoes.html')) {
            alert('Acesso Negado: Esta área é restrita a Administradores.');
            window.location.href = indexPath;
        }
    }
}

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const supabaseUrl = 'https://gaflsobdfcghtvpqcrdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZmxzb2JkZmNnaHR2cHFjcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Nzg1ODUsImV4cCI6MjA5MzM1NDU4NX0.Y64crvMlfCiAcO9Jn6lBFjYeO_LmUQ_xKEM2r0mxaTY';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// GERENCIAMENTO DE USUÁRIOS (ADMIN)
// ==========================================
async function getUsuarios() {
    const { data, error } = await supabaseClient.from('usuários').select('*').order('nome_de_usuário');
    if (error) console.error('Erro ao buscar usuários:', error);
    return data || [];
}

async function salvarUsuarioDB(usuario) {
    if (!usuario.id) {
        // Senha padrão 12345 em hash SHA-256
        const hashPadrao = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
        const { data, error } = await supabaseClient.from('usuários').insert([{
            nome_de_usuário: usuario.username.toUpperCase(),
            papel: usuario.role,
            hash_da_senha: hashPadrao,
            deve_alterar_a_senha: true
        }]).select();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabaseClient.from('usuários').update({
            nome_de_usuário: usuario.username.toUpperCase(),
            papel: usuario.role
        }).eq('id', usuario.id).select();
        if (error) throw error;
        return data;
    }
}

async function resetarSenhaUsuario(id) {
    const hashPadrao = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
    const { error } = await supabaseClient.from('usuários').update({
        hash_da_senha: hashPadrao,
        deve_alterar_a_senha: true
    }).eq('id', id);
    if (error) throw error;
}

async function deletarUsuarioDB(id) {
    const { error } = await supabaseClient.from('usuários').delete().eq('id', id);
    if (error) throw error;
}

// ==========================================
// CONFIGURAÇÕES DA EMPRESA
// ==========================================
async function getEmpresa() {
    const { data, error } = await supabaseClient.from('empresa').select('*').limit(1).maybeSingle();
    if (error) console.error('Erro ao buscar empresa:', error);
    return data;
}

async function salvarEmpresa(empresa) {
    if (empresa.id) {
        const { data, error } = await supabaseClient.from('empresa').update(empresa).eq('id', empresa.id).select();
        if (error) throw error;
        return data ? data[0] : null;
    } else {
        const { data, error } = await supabaseClient.from('empresa').insert([empresa]).select();
        if (error) throw error;
        return data ? data[0] : null;
    }
}

// ==========================================
// COLABORADORES CRUD
// ==========================================
async function getColaboradores() {
    const { data, error } = await supabaseClient.from('colaboradores').select('*').order('nome');
    if (error) console.error('Erro ao buscar colaboradores:', error);
    return data || [];
}

async function salvarColaborador(colaborador) {
    if (colaborador.id) {
        const { data, error } = await supabaseClient.from('colaboradores').update(colaborador).eq('id', colaborador.id).select();
        if (error) throw error;
        return data ? data[0] : null;
    } else {
        delete colaborador.id;
        const { data, error } = await supabaseClient.from('colaboradores').insert([colaborador]).select();
        if (error) throw error;
        return data ? data[0] : null;
    }
}

async function deletarColaborador(id) {
    const { error } = await supabaseClient.from('colaboradores').delete().eq('id', id);
    if (error) console.error('Erro ao deletar colaborador:', error);
}

// ==========================================
// CLIENTES CRUD
// ==========================================
async function getClientes() {
    const { data, error } = await supabaseClient.from('clientes').select('*').order('nome');
    if (error) console.error('Erro ao buscar clientes:', error);
    return data || [];
}

async function salvarCliente(cliente) {
    if (cliente.id) {
        const { data, error } = await supabaseClient.from('clientes').update(cliente).eq('id', cliente.id).select();
        if (error) console.error('Erro ao atualizar cliente:', error);
        return data ? data[0] : null;
    } else {
        delete cliente.id;
        const { data, error } = await supabaseClient.from('clientes').insert([cliente]).select();
        if (error) console.error('Erro ao inserir cliente:', error);
        return data ? data[0] : null;
    }
}

async function deletarCliente(id) {
    const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
    if (error) console.error('Erro ao deletar cliente:', error);
}

// ==========================================
// CATÁLOGO DE SERVIÇOS/PEÇAS CRUD
// ==========================================
async function getCatalogo() {
    const { data, error } = await supabaseClient.from('catalogo_servicos').select('*').order('nome');
    if (error) console.error('Erro ao buscar catálogo:', error);
    return data || [];
}

async function salvarCatalogo(item) {
    if (item.id) {
        const { data, error } = await supabaseClient.from('catalogo_servicos').update(item).eq('id', item.id).select();
        if (error) console.error('Erro ao atualizar item do catálogo:', error);
        return data;
    } else {
        delete item.id;
        const { data, error } = await supabaseClient.from('catalogo_servicos').insert([item]).select();
        if (error) console.error('Erro ao inserir item no catálogo:', error);
        return data;
    }
}

async function deletarCatalogo(id) {
    const { error } = await supabaseClient.from('catalogo_servicos').delete().eq('id', id);
    if (error) console.error('Erro ao deletar item do catálogo:', error);
}

// ==========================================
// SERVIÇOS EXECUTADOS CRUD
// ==========================================
async function getServicos() {
    const { data, error } = await supabaseClient.from('servicos').select('*, clientes(nome), colaboradores(nome)').order('data', { ascending: false });
    if (error) console.error('Erro ao buscar serviços:', error);
    return (data || []).map(s => ({
        ...s,
        clienteNome: s.clientes ? s.clientes.nome : 'Desconhecido',
        colaboradorNome: s.colaboradores ? s.colaboradores.nome : 'Não Atribuído'
    }));
}

async function salvarServico(servico) {
    delete servico.clienteNome;
    delete servico.colaboradorNome;
    if (servico.id) {
        const { data, error } = await supabaseClient.from('servicos').update(servico).eq('id', servico.id).select();
        if (error) console.error('Erro ao atualizar serviço:', error);
        return data;
    } else {
        delete servico.id;
        const { data, error } = await supabaseClient.from('servicos').insert([servico]).select();
        if (error) console.error('Erro ao inserir serviço:', error);
        return data;
    }
}

async function deletarServico(id) {
    const { error } = await supabaseClient.from('servicos').delete().eq('id', id);
    if (error) console.error('Erro ao deletar serviço:', error);
}

// ==========================================
// ORÇAMENTOS CRUD
// ==========================================
async function getOrcamentos() {
    const { data, error } = await supabaseClient.from('orcamentos').select('*, clientes(nome)').order('data', { ascending: false });
    if (error) console.error('Erro ao buscar orçamentos:', error);
    return (data || []).map(o => ({
        ...o,
        clienteNome: o.clientes ? o.clientes.nome : 'Desconhecido'
    }));
}

async function salvarOrcamento(orcamento) {
    delete orcamento.clienteNome;
    if (orcamento.id) {
        const { data, error } = await supabaseClient.from('orcamentos').update(orcamento).eq('id', orcamento.id).select();
        if (error) console.error('Erro ao atualizar orçamento:', error);
        return data;
    } else {
        delete orcamento.id;
        const { data, error } = await supabaseClient.from('orcamentos').insert([orcamento]).select();
        if (error) console.error('Erro ao inserir orçamento:', error);
        return data;
    }
}

async function deletarOrcamento(id) {
    const { error } = await supabaseClient.from('orcamentos').delete().eq('id', id);
    if (error) console.error('Erro ao deletar orçamento:', error);
}

// ==========================================
// FINANCEIRO & CONCLUSÃO DE SERVIÇO
// ==========================================
async function atualizarPagamentoServico(id, status_pagamento, forma_pagamento) {
    const { data, error } = await supabaseClient
        .from('servicos')
        .update({ 
            status_pagamento: status_pagamento, 
            forma_pagamento: forma_pagamento 
        })
        .eq('id', id)
        .select();
        
    if (error) console.error('Erro ao atualizar pagamento:', error);
    return data;
}

async function concluirServicoDB(id, forma_pagamento, valor_pago, data_vencimento, status_pagamento) {
    const payload = { 
        status: 'Concluído',
        status_pagamento: status_pagamento, 
        forma_pagamento: forma_pagamento,
        valor_pago: valor_pago
    };
    
    if (data_vencimento) {
        payload.data_vencimento = data_vencimento;
    } else {
        payload.data_vencimento = null;
    }

    const { data, error } = await supabaseClient
        .from('servicos')
        .update(payload)
        .eq('id', id)
        .select();
        
    if (error) console.error('Erro ao concluir serviço:', error);
    return data;
}