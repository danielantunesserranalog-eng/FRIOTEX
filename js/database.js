// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const supabaseUrl = 'https://gaflsobdfcghtvpqcrdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZmxzb2JkZmNnaHR2cHFjcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Nzg1ODUsImV4cCI6MjA5MzM1NDU4NX0.Y64crvMlfCiAcO9Jn6lBFjYeO_LmUQ_xKEM2r0mxaTY';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// GERENCIAMENTO DE users
// ==========================================
async function getUsuarios() {
    const { data, error } = await supabaseClient.from('users').select('*').order('nome_de_usuario');
    if (error) console.error('Erro ao buscar users:', error);
    return data || [];
}
async function salvarUsuarioDB(usuario) {
    if (!usuario.id) {
        const hashPadrao = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
        const { data, error } = await supabaseClient.from('users').insert([{
            nome_de_usuario: usuario.username.toUpperCase(),
            papel: usuario.role,
            hash_da_senha: hashPadrao,
            deve_alterar_senha: true
        }]).select();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabaseClient.from('users').update({
            nome_de_usuario: usuario.username.toUpperCase(),
            papel: usuario.role
        }).eq('id', usuario.id).select();
        if (error) throw error;
        return data;
    }
}
async function resetarSenhaUsuario(id) {
    const hashPadrao = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
    const { error } = await supabaseClient.from('users').update({
        hash_da_senha: hashPadrao,
        deve_alterar_senha: true
    }).eq('id', id);
    if (error) throw error;
}
async function atualizarSenhaUsuario(id, novaSenhaHash) {
    const { error } = await supabaseClient.from('users').update({
        hash_da_senha: novaSenhaHash,
        deve_alterar_senha: false
    }).eq('id', id);
    if (error) throw error;
}
async function deletarUsuarioDB(id) {
    const { error } = await supabaseClient.from('users').delete().eq('id', id);
    if (error) throw error;
}

// ==========================================
// CONFIGURAÇÕES DA EMPRESA
// ==========================================
async function getEmpresa() {
    const { data, error } = await supabaseClient.from('empresa').select('*').limit(1).maybeSingle();
    return data;
}
async function salvarEmpresa(empresa) {
    if (empresa.id) {
        const { data, error } = await supabaseClient.from('empresa').update(empresa).eq('id', empresa.id).select();
        if (error) throw error; return data;
    } else {
        const { data, error } = await supabaseClient.from('empresa').insert([empresa]).select();
        if (error) throw error; return data;
    }
}

// ==========================================
// CRUD COLABORADORES
// ==========================================
async function getColaboradores() {
    const { data, error } = await supabaseClient.from('colaboradores').select('*').order('nome');
    return data || [];
}
async function salvarColaborador(colaborador) {
    if (colaborador.id) {
        const { data, error } = await supabaseClient.from('colaboradores').update(colaborador).eq('id', colaborador.id).select();
        if (error) throw error; return data;
    } else {
        delete colaborador.id;
        const { data, error } = await supabaseClient.from('colaboradores').insert([colaborador]).select();
        if (error) throw error; return data;
    }
}
async function deletarColaborador(id) {
    await supabaseClient.from('colaboradores').delete().eq('id', id);
}

// ==========================================
// CRUD CLIENTES
// ==========================================
async function getClientes() {
    const { data, error } = await supabaseClient.from('clientes').select('*').order('nome');
    return data || [];
}
async function salvarCliente(cliente) {
    if (cliente.id) {
        const { data, error } = await supabaseClient.from('clientes').update(cliente).eq('id', cliente.id).select();
        if (error) throw error; return data;
    } else {
        delete cliente.id;
        const { data, error } = await supabaseClient.from('clientes').insert([cliente]).select();
        if (error) throw error; return data;
    }
}
async function deletarCliente(id) {
    await supabaseClient.from('clientes').delete().eq('id', id);
}

// ==========================================
// CRUD CATÁLOGO
// ==========================================
async function getCatalogo() {
    const { data, error } = await supabaseClient.from('catalogo_servicos').select('*').order('nome');
    return data || [];
}
async function salvarCatalogo(item) {
    if (item.id) {
        const { data, error } = await supabaseClient.from('catalogo_servicos').update(item).eq('id', item.id).select();
        if (error) throw error; return data;
    } else {
        delete item.id;
        const { data, error } = await supabaseClient.from('catalogo_servicos').insert([item]).select();
        if (error) throw error; return data;
    }
}
async function deletarCatalogo(id) {
    await supabaseClient.from('catalogo_servicos').delete().eq('id', id);
}

// ==========================================
// CRUD SERVIÇOS
// ==========================================
async function getServicos() {
    const { data, error } = await supabaseClient.from('servicos').select('*, clientes(nome), colaboradores(nome)').order('data', { ascending: false });
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
        if (error) throw error; return data;
    } else {
        delete servico.id;
        const { data, error } = await supabaseClient.from('servicos').insert([servico]).select();
        if (error) throw error; return data;
    }
}
async function deletarServico(id) {
    await supabaseClient.from('servicos').delete().eq('id', id);
}

// ==========================================
// CRUD ORÇAMENTOS
// ==========================================
async function getOrcamentos() {
    const { data, error } = await supabaseClient.from('orcamentos').select('*, clientes(nome, telefone)').order('data', { ascending: false });
    return (data || []).map(o => ({
        ...o,
        clienteNome: o.clientes ? o.clientes.nome : 'Desconhecido',
        clienteTelefone: o.clientes ? o.clientes.telefone : ''
    }));
}
async function salvarOrcamento(orcamento) {
    delete orcamento.clienteNome;
    delete orcamento.clienteTelefone;
    if (orcamento.id) {
        const { data, error } = await supabaseClient.from('orcamentos').update(orcamento).eq('id', orcamento.id).select();
        if (error) throw error; return data;
    } else {
        delete orcamento.id;
        const { data, error } = await supabaseClient.from('orcamentos').insert([orcamento]).select();
        if (error) throw error; return data;
    }
}
async function deletarOrcamento(id) {
    await supabaseClient.from('orcamentos').delete().eq('id', id);
}

// ==========================================
// FINANCEIRO, DESPESAS E CONTAS A PAGAR
// ==========================================
async function atualizarPagamentoServico(id, status_pagamento, forma_pagamento) {
    const { data, error } = await supabaseClient.from('servicos').update({ status_pagamento, forma_pagamento }).eq('id', id).select();
    if (error) throw error; return data;
}
async function concluirServicoDB(id, forma_pagamento, valor_pago, data_vencimento, status_pagamento) {
    const payload = { status: 'Concluído', status_pagamento, forma_pagamento, valor_pago };
    if (data_vencimento) payload.data_vencimento = data_vencimento;
    else payload.data_vencimento = null;
    const { data, error } = await supabaseClient.from('servicos').update(payload).eq('id', id).select();
    if (error) throw error; return data;
}
async function getDespesas() {
    const { data, error } = await supabaseClient.from('despesas').select('*').order('data', { ascending: false });
    if (error) console.error('Erro ao buscar despesas:', error);
    return data || [];
}
async function salvarDespesa(despesa) {
    if (despesa.id) {
        const { data, error } = await supabaseClient.from('despesas').update(despesa).eq('id', despesa.id).select();
        if (error) throw error; return data;
    } else {
        delete despesa.id;
        const { data, error } = await supabaseClient.from('despesas').insert([despesa]).select();
        if (error) throw error; return data;
    }
}
async function deletarDespesa(id) {
    await supabaseClient.from('despesas').delete().eq('id', id);
}
async function registrarPagamentoFinanceiro(id, payload) {
    const { data, error } = await supabaseClient.from('servicos').update(payload).eq('id', id).select();
    if (error) throw error; return data;
}

// NOVAS FUNÇÕES: CONTAS A PAGAR
async function getContasAPagar() {
    const { data, error } = await supabaseClient.from('contas_a_pagar').select('*').order('data_vencimento', { ascending: true });
    if (error) console.error('Erro ao buscar contas a pagar:', error);
    return data || [];
}
async function salvarContaAPagar(conta) {
    if (conta.id) {
        const { data, error } = await supabaseClient.from('contas_a_pagar').update(conta).eq('id', conta.id).select();
        if (error) throw error; return data;
    } else {
        delete conta.id;
        const { data, error } = await supabaseClient.from('contas_a_pagar').insert([conta]).select();
        if (error) throw error; return data;
    }
}
async function deletarContaAPagar(id) {
    await supabaseClient.from('contas_a_pagar').delete().eq('id', id);
}