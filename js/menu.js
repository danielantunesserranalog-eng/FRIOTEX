document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    if (!currentPath.includes('login.html')) {
        // Verifica se está logado
        if (!localStorage.getItem('usuarioLogado')) {
            fazerLogout();
            return;
        }
        
        // PROTEÇÃO: Se precisa trocar a senha, chuta de volta pro index
        if (localStorage.getItem('precisaTrocarSenha') === 'true' && currentPath.includes('/pages/')) {
            window.location.href = '../index.html';
            return;
        }
    }
    
    carregarMenu();
    destacarMenuAtivo();
});

function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('userRole');
    localStorage.removeItem('precisaTrocarSenha');
    localStorage.removeItem('userId');
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? '../login.html' : 'login.html';
}

function carregarMenu() {
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const basePath = isInPages ? '../' : '';
    
    const userRole = localStorage.getItem('userRole') || 'Técnico';
    const userName = localStorage.getItem('usuarioLogado') || 'Usuário';
    
    const menuFinanceiro = userRole === 'Admin' ? `<li><a href="${basePath}pages/financeiro.html" data-page="financeiro"><i class="fas fa-hand-holding-usd"></i> Financeiro</a></li>` : '';
    const menuConfig = userRole === 'Admin' ? `<li class="menu-bottom"><a href="${basePath}pages/configuracoes.html" data-page="configuracoes"><i class="fas fa-cog"></i> Configurações / Usuários</a></li>` : '';
    
    const menuHTML = `
        <!-- Overlay Escuro para Mobile -->
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleMenu()"></div>
        
        <!-- Sidebar Desktop / Drawer Mobile -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-snowflake"></i> FRIOTEX</h2>
                <p>Sistemas de Refrigeração</p>
                <div class="user-profile-box">
                    <div><i class="fas fa-user-circle" style="color:var(--primary);"></i> <strong>${userName}</strong><br><span style="color:var(--text-muted)">${userRole}</span></div>
                    <button onclick="fazerLogout()" class="logout-btn" title="Sair"><i class="fas fa-power-off"></i></button>
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

        <!-- Top Header (Apenas Mobile) -->
        <div class="mobile-header">
            <div class="mobile-header-title">
                <i class="fas fa-snowflake" style="color: var(--primary);"></i> FRIOTEX
            </div>
            <div class="mobile-header-user" onclick="toggleMenu()">
                <img src="https://ui-avatars.com/api/?name=${userName}&background=0ea5e9&color=fff&rounded=true&bold=true" alt="Perfil" width="34" height="34" style="border-radius: 50%; border: 2px solid var(--border-color);">
            </div>
        </div>

        <!-- Bottom Navigation Bar (Apenas Mobile) -->
        <div class="mobile-bottom-nav">
            <a href="${basePath}index.html" data-page="dashboard"><i class="fas fa-home"></i><span>Início</span></a>
            <a href="${basePath}pages/clientes.html" data-page="clientes"><i class="fas fa-users"></i><span>Clientes</span></a>
            <a href="${basePath}pages/servicos.html" data-page="servicos"><i class="fas fa-tools"></i><span>Serviços</span></a>
            <button onclick="toggleMenu()"><i class="fas fa-bars"></i><span>Menu</span></button>
        </div>
    `;
    
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        menuContainer.innerHTML = menuHTML;
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
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
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.menu-items a, .mobile-bottom-nav a');
    
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