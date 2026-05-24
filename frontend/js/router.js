const Router = {
  routes: {
    'home':       { render: renderHome, nav: '首页' },
    'workspace':  { render: renderWorkbench, nav: '工作台' },
    'dashboard':  { render: renderDashboard, nav: '仪表盘' },
    'terminology':{ render: renderTerminology, nav: '术语库' },
    'about':      { render: renderAbout, nav: '关于' },
  },

  current: 'home',

  init() {
    window.addEventListener('hashchange', () => this.navigate());
    const hash = location.hash.replace('#/', '') || 'home';
    this.navigate(hash);
  },

  navigate(route) {
    const target = route || location.hash.replace('#/', '') || 'home';
    if (!this.routes[target]) { this.navigate('home'); return; }

    this.current = target;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${target}`);
    if (page) {
      page.classList.add('active');
      page.style.animation = 'none';
      page.offsetHeight;
      page.style.animation = 'fadeInUp 0.3s ease forwards';
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.route === target);
    });

    if (this.routes[target].render) {
      this.routes[target].render();
    }
  },

  go(route) {
    location.hash = '#/' + route;
  }
};
