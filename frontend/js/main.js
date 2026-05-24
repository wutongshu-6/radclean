(function() {
  renderNavbar();
  document.getElementById('footer-container').innerHTML = renderFooter();
  Router.init();

  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document.body) {
      var nav = el.getAttribute('data-nav');
      if (nav) {
        e.preventDefault();
        Router.go(nav);
        return;
      }
      el = el.parentElement;
    }
  });
})();
