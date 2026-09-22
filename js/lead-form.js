/* Solar Energy Enterprises — lead capture.
   Drop <div data-lead-form></div> anywhere and this mounts a form into it.

   Why this exists: before it, index/residential/commercial had no form at all.
   Every enquiry became a WhatsApp message or a phone call, so nothing was ever
   recorded, nobody could count enquiries, and time-to-first-reply — the biggest
   lever on a solar lead — could not be measured.

   WhatsApp is NOT removed. It stays, and still works for anyone who prefers it.
   This only means an enquiry now also leaves a record. */

const SUPABASE_URL = "https://jsbzinoecnqfjgrhkqzi.supabase.co";
const SUPABASE_KEY = "sb_publishable_7aFmJDJQ1PBws9HVhV0DWw_KWK9AliH";
const WHATSAPP = "918504035110";

const BILLS = ["Under 1,500", "1,500 - 3,000", "3,000 - 6,000", "6,000 - 12,000", "Over 12,000"];

const CSS = `
.lf{background:var(--paper,#fff);border:1px solid var(--line,rgba(14,31,51,.13));
  border-radius:var(--r,16px);padding:clamp(20px,3.4vw,34px)}
.lf h3{font-family:var(--serif,Georgia,serif);font-weight:600;margin:0 0 5px;
  font-size:clamp(19px,2.3vw,25px);color:var(--ink,#0e1f33)}
.lf .lf-sub{color:var(--muted,rgba(14,31,51,.6));font-size:13.5px;margin:0 0 20px;line-height:1.55}
.lf-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lf-grid .full{grid-column:1/-1}
.lf label{display:block;font-size:11px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--faint,rgba(14,31,51,.42));margin-bottom:5px}
.lf input,.lf select,.lf textarea{width:100%;font:inherit;font-size:14px;padding:11px 13px;
  border:1px solid var(--line,rgba(14,31,51,.13));border-radius:10px;
  background:var(--paper,#fff);color:var(--ink,#0e1f33)}
.lf input:focus,.lf select:focus,.lf textarea:focus{outline:2px solid var(--blue,#155a9e);outline-offset:1px;border-color:transparent}
.lf textarea{min-height:76px;resize:vertical}
.lf-hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important}
.lf-btn{width:100%;margin-top:16px;border:0;border-radius:11px;padding:14px;font:inherit;
  font-size:15px;font-weight:600;cursor:pointer;background:var(--blue,#155a9e);color:#fff}
.lf-btn:hover{background:var(--blue-2,#10406f)}
.lf-btn[disabled]{opacity:.6;cursor:default}
.lf-or{text-align:center;color:var(--faint,rgba(14,31,51,.42));font-size:12.5px;margin:13px 0 0}
.lf-wa{display:block;text-align:center;margin-top:9px;color:var(--blue,#155a9e);
  font-weight:600;font-size:14px;text-decoration:none}
.lf-wa:hover{text-decoration:underline}
.lf-err{background:#fdeceb;border:1px solid #f3c6c3;color:#8d221c;border-radius:10px;
  padding:11px 14px;margin-top:13px;font-size:13px}
.lf-ok{text-align:center;padding:14px 4px}
.lf-ok .tick{width:52px;height:52px;border-radius:50%;background:#e9f4ed;color:#0f7b46;
  display:grid;place-items:center;margin:0 auto 15px;font-size:26px;font-weight:700}
.lf-ok h3{margin-bottom:8px}
@media(max-width:560px){.lf-grid{grid-template-columns:1fr}}
`;

function markup(pageType){
  const bills = BILLS.map(b => `<option value="${b}">&#8377; ${b}</option>`).join("");
  return `<form class="lf" novalidate>
    <h3>Get a free solar consultation</h3>
    <p class="lf-sub">Tell us a little and we will call you back with an honest estimate &mdash;
      system size, cost, subsidy you qualify for, and payback period. No obligation.</p>
    <div class="lf-grid">
      <div><label for="lf-name">Your name</label><input id="lf-name" name="name" required autocomplete="name" placeholder="Full name"></div>
      <div><label for="lf-phone">Phone</label><input id="lf-phone" name="phone" required inputmode="tel" autocomplete="tel" placeholder="10-digit mobile"></div>
      <div><label for="lf-city">City or area</label><input id="lf-city" name="city" autocomplete="address-level2" placeholder="Bikaner"></div>
      <div><label for="lf-type">Property</label><select id="lf-type" name="property_type">
        <option value="residential"${pageType === "residential" ? " selected" : ""}>Home</option>
        <option value="commercial"${pageType === "commercial" ? " selected" : ""}>Shop or business</option>
        <option value="enterprise"${pageType === "enterprise" ? " selected" : ""}>Factory or institution</option>
        <option value="other">Something else</option>
      </select></div>
      <div class="full"><label for="lf-bill">Your usual monthly electricity bill</label>
        <select id="lf-bill" name="monthly_bill"><option value="">Prefer not to say</option>${bills}</select></div>
      <div class="full"><label for="lf-src">How did you hear about us?</label>
        <select id="lf-src" name="lead_source">
          <option value="">Select...</option>
          <option value="referral">Someone recommended you</option>
          <option value="google_search">Google search</option>
          <option value="google_maps">Google Maps</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="walk_in">Passed your office</option>
          <option value="other">Somewhere else</option>
        </select></div>
      <div class="full lf-ref" hidden><label for="lf-ref">Who recommended us?</label>
        <input id="lf-ref" name="referred_by" placeholder="Their name or area — so we can thank them"></div>
      <div class="full"><label for="lf-msg">Anything else (optional)</label>
        <textarea id="lf-msg" name="message" placeholder="Roof type, rough area, when you want it done..."></textarea></div>
    </div>
    <input class="lf-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="lf-btn" type="submit">Request a call back</button>
    <p class="lf-or">or reach us right now</p>
    <a class="lf-wa" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Solar Energy Enterprises, I want a free solar consultation.")}" target="_blank" rel="noopener">Message on WhatsApp &rarr;</a>
  </form>`;
}

function successMarkup(name){
  return `<div class="lf lf-ok">
    <div class="tick">&#10003;</div>
    <h3>Thank you${name ? ", " + name : ""}</h3>
    <p class="lf-sub">We have your enquiry. Someone will call you back shortly.
      If it is urgent, WhatsApp is the fastest way to reach us.</p>
    <a class="lf-wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">Message on WhatsApp &rarr;</a>
  </div>`;
}

function mount(host){
  const pageType = host.getAttribute("data-lead-form") || "";
  host.innerHTML = markup(pageType);
  const form = host.querySelector("form");
  const btn  = form.querySelector(".lf-btn");

  const fail = msg => {
    form.querySelectorAll(".lf-err").forEach(e => e.remove());
    const d = document.createElement("div");
    d.className = "lf-err";
    d.textContent = msg;
    btn.after(d);
  };

  const src = form.querySelector("[name=lead_source]");
  const refWrap = form.querySelector(".lf-ref");
  if (src && refWrap) src.addEventListener("change", () => { refWrap.hidden = src.value !== "referral"; });

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = new FormData(form);

    // honeypot: real people never fill a field they cannot see
    if ((f.get("company") || "").trim()) { host.innerHTML = successMarkup(""); return; }

    const name  = (f.get("name")  || "").trim();
    const phone = (f.get("phone") || "").trim();
    if (name.length < 2)  return fail("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return fail("Please enter a valid 10-digit mobile number.");

    btn.disabled = true;
    btn.textContent = "Sending...";

    const payload = {
      name, phone,
      city:          (f.get("city") || "").trim() || null,
      property_type: f.get("property_type") || null,
      monthly_bill:  f.get("monthly_bill") || null,
      message:       (f.get("message") || "").trim() || null,
      source_page:   (location.pathname.split("/").pop() || "index.html").replace(".html", ""),
      lead_source:   f.get("lead_source") || null,
      referred_by:   (f.get("referred_by") || "").trim() || null
    };

    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/leads", {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      host.innerHTML = successMarkup(name.split(" ")[0]);
    } catch (err) {
      /* Never lose the enquiry because a request failed. Hand them to WhatsApp
         with everything they typed already in the message. */
      btn.disabled = false;
      btn.textContent = "Request a call back";
      const txt = `Hi Solar Energy Enterprises, I want a free solar consultation.%0AName: ${name}%0APhone: ${phone}` +
                  (payload.city ? `%0ACity: ${payload.city}` : "") +
                  (payload.monthly_bill ? `%0AMonthly bill: ${payload.monthly_bill}` : "");
      fail("Could not send just now. Please use WhatsApp instead \u2014 the link below already has your details.");
      const wa = form.querySelector(".lf-wa");
      if (wa) wa.href = `https://wa.me/${WHATSAPP}?text=${txt}`;
    }
  });
}

function init(){
  if (!document.querySelector("[data-lead-form]")) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.querySelectorAll("[data-lead-form]").forEach(mount);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
