function renderNavbar() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  var routes = Router.routes;
  var links = '';
  var keys = Object.keys(routes);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    links += '<a data-route="' + key + '">' + routes[key].nav + '</a>';
  }

  navbar.innerHTML =
    '<div class="container">' +
    '<a class="nav-brand" data-route="home" style="cursor:pointer">RadClean</a>' +
    '<ul class="nav-links">' + links + '</ul>' +
    '</div>';

  navbar.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== navbar) {
      var route = el.getAttribute('data-route');
      if (route) {
        e.preventDefault();
        Router.go(route);
        return;
      }
      el = el.parentElement;
    }
  });
}
