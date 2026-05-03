document.addEventListener('DOMContentLoaded', function() {
    // TRAVA DE SEGURANÇA: Verifica se a pessoa está logada
    // Só faz a verificação se NÃO estiver na página de login para evitar loop
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html')) {
        if (!localStorage.getItem('usuarioLogado')) {
            fazerLogout(); // Expulsa para a tela de login
            return;
        }
    }
    
    carregarMenu();
    destacarMenuAtivo();
});

function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('userRole');
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? '../login.html' : 'login.html';
}

function carregarMenu() {
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const basePath = isInPages ? '../' : '';
    
    const userRole = localStorage.getItem('userRole') || 'Técnico';
    const userName = localStorage.getItem('usuarioLogado') || 'Usuário';
    
    // Oculta itens dependendo da permissão
    const menuFinanceiro = userRole === 'Admin' ? `<li><a href="${basePath}pages/financeiro.html" data-page="financeiro"><i class="fas fa-hand-holding-usd"></i> Financeiro</a></li>` : '';
    const menuConfig = userRole === 'Admin' ? `<li class="menu-bottom"><a href="${basePath}pages/configuracoes.html" data-page="configuracoes"><i class="fas fa-cog"></i> Configurações / Usuários</a></li>` : '';
    
    const menuHTML = `
        <button class="menu-toggle" onclick="toggleMenu()">
            <i class="fas fa-bars"></i>
        </button>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-snowflake"></i> FRIOTEX</h2>
                <p>Sistemas de Refrigeração</p>
                <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div><i class="fas fa-user-circle" style="color:var(--primary);"></i> <strong>${userName}</strong><br><span style="color:var(--text-muted)">${userRole}</span></div>
                    <button onclick="fazerLogout()" style="background: none; border: none; color: var(--danger); cursor: pointer;" title="Sair"><i class="fas fa-power-off"></i></button>
                </div>
            </div>
            <ul class="menu-items">
                <li><a href="${basePath}index.html" data-page="dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
                <li><a href="${basePath}pages/clientes.html" data-page="clientes"><i class="fas fa-users"></i> Clientes</a></li>
                <li><a href="${basePath}pages/servicos.html" data-page="servicos"><i class="fas fa-tools"></i> Serviços</a></li>
                
                <li class="has-submenu">
                    <a href="#" onclick="toggleSubmenu(event, 'cadastro-submenu')" id="menu-cadastro">
                        <i class="fas fa-box"></i> Cadastros <i class="fas fa-chevron-down submenu-icon"></i>
                    </a>
                    <ul class="submenu" id="cadastro-submenu">
                        <li><a href="${basePath}pages/catalogo.html" data-page="catalogo"><i class="fas fa-tags"></i> Tabela de Preços</a></li>
                        <li><a href="${basePath}pages/colaboradores.html" data-page="colaboradores"><i class="fas fa-id-badge"></i> Colaboradores</a></li>
                    </ul>
                </li>
                
                <li><a href="${basePath}pages/orcamentos.html" data-page="orcamentos"><i class="fas fa-file-invoice-dollar"></i> Orçamentos</a></li>
                ${menuFinanceiro}
                <li><a href="${basePath}pages/relatorios.html" data-page="relatorios"><i class="fas fa-chart-bar"></i> Relatórios</a></li>
                
                ${menuConfig}
            </ul>
        </div>
    `;
    
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        menuContainer.innerHTML = menuHTML;
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function toggleSubmenu(event, submenuId) {
    event.preventDefault();
    const submenu = document.getElementById(submenuId);
    const icon = event.currentTarget.querySelector('.submenu-icon');
    
    if (submenu.classList.contains('active')) {
        submenu.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        submenu.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}

function destacarMenuAtivo() {
    const currentPage = window.location.pathname.split('/').pop();
    const links = document.querySelectorAll('.menu-items a');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        const linkPage = href.split('/').pop();
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
            
            const parentSubmenu = link.closest('.submenu');
            if (parentSubmenu) {
                parentSubmenu.classList.add('active');
                const parentLink = parentSubmenu.previousElementSibling;
                if (parentLink) {
                    parentLink.classList.add('active');
                    const icon = parentLink.querySelector('.submenu-icon');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            }
        }
    });
}

document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});