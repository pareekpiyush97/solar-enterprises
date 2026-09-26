/* Solar Energy Enterprises — analytics
 *
 * ONE thing to do to switch this on: paste the GA4 Measurement ID below.
 * You get it from Google Analytics → Admin → Data streams → your web stream.
 * It looks like G-ABCD123XYZ.
 *
 * Until it is filled in this file does nothing at all — no network request,
 * no cookie, no console error. So it is safe to ship before the ID exists.
 *
 * Deliberately NOT loaded on portal.html. That is the staff management system,
 * and counting your own team's visits would both pollute the numbers and track
 * staff for no reason.
 */
const MEASUREMENT_ID = "G-VN064KBSJ7";

/* ------------------------------------------------------------------ */
if (MEASUREMENT_ID) {
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());

  /* Ad-personalisation signals are switched off on purpose. This business is not
     running Google Ads, so the only thing they would add is a heavier consent
     obligation for data nobody here will use. Plain traffic measurement only. */
  gtag("config", MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  /* ---- the events that actually matter ----------------------------------
     Pageviews alone cannot answer the question this business has, which is
     "did anyone try to contact us?". On a local solar site almost nobody fills
     a form first — they tap the phone number or WhatsApp. Those taps are the
     real conversions, so they are tracked explicitly rather than left to
     GA4's automatic outbound-link guessing.                                */

  const send = (name, params) => gtag("event", name, params || {});

  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const where = location.pathname.replace(/^\/|\.html$/g, "") || "home";

    if (href.startsWith("tel:"))              send("call_click",       { page: where });
    else if (/wa\.me|api\.whatsapp\.com/.test(href))
                                              send("whatsapp_click",   { page: where });
    else if (href.startsWith("mailto:"))      send("email_click",      { page: where });
    else if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(href))
                                              send("directions_click", { page: where });
  }, { passive: true });

  /* Fired by the enquiry forms only after the submission actually succeeded,
     so a failed send or a caught bot never counts as a lead.
     generate_lead is GA4's own recommended event name for this. */
  document.addEventListener("solar:lead", e => {
    send("generate_lead", { form: (e.detail && e.detail.form) || "unknown" });
  });
}
