/* Solar Energy Enterprises — support / complaint portal */
(function () {
  'use strict';

  /* ===== CONFIG =====
     1) Create a free Google OAuth Client ID (Web application) at
        https://console.cloud.google.com/apis/credentials
     2) Under "Authorised JavaScript origins" add:
        https://pareekpiyush97.github.io
     3) Paste the Client ID below. Until then, a secure email fallback is used. */
  var CONFIG = {
    clientId: '',                 // <-- paste your Google OAuth Client ID here
    whatsapp: '919829641110'      // complaints WhatsApp (country code + number, no +)
  };

  var $ = function (s) { return document.querySelector(s); };
  var authStep = $('#authStep'), cform = $('#cform'), doneStep = $('#doneStep');
  var user = null;

  /* ---- Google Identity Services ---- */
  function b64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    try { return decodeURIComponent(escape(atob(str))); } catch (e) { return atob(str); }
  }
  function decodeJwt(token) {
    try { return JSON.parse(b64urlDecode(token.split('.')[1])); } catch (e) { return {}; }
  }
  function onGoogle(resp) {
    var p = decodeJwt(resp.credential);
    if (!p.email) return showFallback();
    setUser({ name: p.name || p.given_name || 'Customer', email: p.email, picture: p.picture || '' });
  }
  function initGoogle() {
    if (!CONFIG.clientId || typeof google === 'undefined' || !google.accounts) return showFallback();
    try {
      google.accounts.id.initialize({ client_id: CONFIG.clientId, callback: onGoogle });
      google.accounts.id.renderButton($('#gbtn'),
        { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 300 });
    } catch (e) { showFallback(); }
  }
  function showFallback() {
    var f = $('#fallback'); if (f) f.hidden = false;
    if (!CONFIG.clientId) { var or = document.querySelector('.sup__or'); if (or) or.hidden = true; }
  }

  // wait briefly for the GIS script, then init or fall back
  var tries = 0;
  (function waitGoogle() {
    if (CONFIG.clientId && typeof google === 'undefined' && tries++ < 20) { return setTimeout(waitGoogle, 150); }
    initGoogle();
  })();

  /* ---- email fallback ---- */
  var fbGo = $('#fbGo');
  if (fbGo) fbGo.addEventListener('click', function () {
    var name = $('#fbName').value.trim(), email = $('#fbEmail').value.trim();
    if (!name) { $('#fbName').focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('#fbEmail').focus(); return; }
    setUser({ name: name, email: email, picture: '' });
  });

  /* ---- signed in: show form ---- */
  function setUser(u) {
    user = u;
    $('#uName').textContent = u.name;
    $('#uEmail').textContent = u.email;
    var pic = $('#uPic');
    if (u.picture) { pic.src = u.picture; pic.hidden = false; } else { pic.hidden = true; }
    authStep.hidden = true; doneStep.hidden = true; cform.hidden = false;
    $('#cPhone').focus();
  }
  var signout = $('#signout');
  if (signout) signout.addEventListener('click', function () {
    user = null; cform.reset(); cform.hidden = true; doneStep.hidden = true; authStep.hidden = false;
    if (typeof google !== 'undefined' && google.accounts && CONFIG.clientId) { try { google.accounts.id.disableAutoSelect(); } catch (e) {} }
  });

  /* ---- build WhatsApp message + submit ---- */
  function waLink(fields) {
    var lines = [
      '*New Complaint — Solar Energy Enterprises*',
      '',
      '👤 Name: ' + user.name,
      '✉️ Email: ' + user.email,
      '📱 Phone: ' + fields.phone,
      '🏷️ Type: ' + fields.cat,
      '📌 Subject: ' + fields.sub,
      '📝 Issue: ' + fields.msg,
      fields.time ? '⏰ Best time: ' + fields.time : '',
      '',
      'Please contact me within 24 hours. (sent via website support portal)'
    ].filter(Boolean);
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  cform.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = {
      phone: $('#cPhone').value.trim(), cat: $('#cCat').value,
      sub: $('#cSub').value.trim(), msg: $('#cMsg').value.trim(), time: $('#cTime').value.trim()
    };
    if (!fields.phone || !fields.cat || !fields.sub || !fields.msg) return;
    var url = waLink(fields);
    // keep a local copy so nothing is lost on this device
    try {
      var log = JSON.parse(localStorage.getItem('see_complaints') || '[]');
      log.push({ at: new Date().toISOString(), user: user, fields: fields });
      localStorage.setItem('see_complaints', JSON.stringify(log));
    } catch (e2) {}
    window.open(url, '_blank', 'noopener');
    $('#doneName').textContent = user.name.split(' ')[0];
    $('#waLink').href = url;
    cform.hidden = true; doneStep.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var another = $('#another');
  if (another) another.addEventListener('click', function () {
    doneStep.hidden = true; cform.hidden = false; $('#cPhone').focus();
  });
})();
