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
        // Gera o hash da senha digitada
        const hashDigitado = await hashPassword(passwordDigitada);

        // Busca o usuário no Supabase
        const { data: usuario, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('nome_de_usuario', usernameDigitado)
            .single();

        // Verifica se houve erro na busca ou se o usuário não existe
        if (error || !usuario) {
            alert('Usuário não encontrado!');
            btn.innerHTML = btnTextoOriginal;
            btn.disabled = false;
            return;
        }

        // Compara a senha do banco com a digitada
        if (usuario.hash_da_senha === hashDigitado) {
            
            // Login com sucesso! Salva a sessão no LocalStorage
            localStorage.setItem('usuarioLogado', usuario.nome_de_usuario);
            localStorage.setItem('userRole', usuario.papel);

            // Verifica se é o primeiro acesso e obriga a troca da senha
            if (usuario.deve_alterar_senha) {
                alert('Este é seu primeiro acesso ou sua senha foi resetada. Você precisará criar uma nova senha.');
                // Se quiser criar a tela de troca de senha depois, mude o caminho abaixo:
                // window.location.href = 'trocar_senha.html';
                
                // Por enquanto, apenas deixa passar para o index
                window.location.href = 'index.html'; 
            } else {
                window.location.href = 'index.html';
            }

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