/* Solar Energy Enterprises — PWA: install prompt + service worker */
(function () {
  'use strict';

  /* ---- register service worker ---- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var installBtn = document.querySelector('.pwa-install');
  var deferred = null;

  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  /* Chrome/Edge/Android: capture the native prompt and reveal our button */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (installBtn && !standalone) installBtn.classList.add('show');
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function () {
          deferred = null;
          installBtn.classList.remove('show');
        });
      } else {
        showIosHint();
      }
    });
  }

  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (installBtn) installBtn.classList.remove('show');
  });

  /* ---- iOS Safari has no beforeinstallprompt: show a short how-to ---- */
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isSafari = isIos && !/crios|fxios|edgios/i.test(navigator.userAgent);

  function showIosHint() {
    var el = document.querySelector('.ios-hint');
    if (!el) return;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 9000);
  }

  if (installBtn && isSafari && !standalone) {
    installBtn.classList.add('show'); // let iOS users tap to see instructions
  }

  document.addEventListener('click', function (e) {
    if (e.target && e.target.matches('.ios-hint button')) {
      var el = e.target.closest('.ios-hint');
      if (el) el.classList.remove('show');
    }
  });
})();
