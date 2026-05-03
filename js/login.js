// js/login.js

// 1. Função para criptografar a senha digitada em SHA-256
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. Evento disparado ao clicar em "Entrar"
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button');
    const btnTextoOriginal = btn.innerText;
    btn.innerHTML = 'Autenticando...';
    btn.disabled = true;

    const usernameDigitado = document.getElementById('username').value.trim().toUpperCase();
    const passwordDigitada = document.getElementById('password').value;

    try {
        const hashDigitado = await hashPassword(passwordDigitada);

        const { data: usuario, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('nome_de_usuario', usernameDigitado)
            .maybeSingle();

        if (error || !usuario) {
            alert('Usuário não encontrado!');
            btn.innerHTML = btnTextoOriginal;
            btn.disabled = false;
            return;
        }

        if (usuario.hash_da_senha === hashDigitado) {
            
            let papelDoBanco = usuario.papel || usuario.role || 'Técnico';
            if (papelDoBanco.toUpperCase() === 'ADMIN') {
                papelDoBanco = 'Admin';
            } else {
                papelDoBanco = 'Técnico';
            }

            localStorage.setItem('usuarioLogado', usuario.nome_de_usuario);
            localStorage.setItem('userRole', papelDoBanco);

            // A MUDANÇA ESTÁ AQUI: Cria a trava de troca de senha no navegador
            if (usuario.deve_alterar_senha) {
                localStorage.setItem('precisaTrocarSenha', 'true');
                localStorage.setItem('userId', usuario.id); // Salva o ID para usar na atualização
            } else {
                localStorage.removeItem('precisaTrocarSenha');
                localStorage.removeItem('userId');
            } 
            
            window.location.href = 'index.html';

        } else {
            alert('Senha incorreta!');
        }

    } catch (err) {
        console.error('Erro no login:', err);
        alert('Erro ao se conectar com o servidor.');
    } finally {
        btn.innerHTML = btnTextoOriginal;
        btn.disabled = false;
    }
});