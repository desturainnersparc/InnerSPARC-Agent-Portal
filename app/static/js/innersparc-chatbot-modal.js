  const EMAIL = 'innersparcrealtyservices@gmail.com';

  // ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
  // Claude handles ALL messages. No regex. It understands natural language,
  // Filipino/Taglish, typos, rephrasing, follow-up context — everything.
  const SYSTEM_PROMPT = `You are SPARC Assistant, the friendly AI chatbot for Inner SPARC Realty Services — a real estate agency in Dasmarinas, Cavite, Philippines.

COMPANY KNOWLEDGE BASE:
- Office: Blk 26 Lot 4 Phase 3, Avida Residences Sta. Catalina, Brgy. Salawag, Dasmarinas, Cavite, Philippines
- Hours: Monday to Sunday, 9:00 AM – 5:00 PM
- Phone: (046) 458-0706 | 0917-853-4875 (Globe/TM) | 0999-994-3304 (Smart/T&T)
- Email: innersparcrealtyservices@gmail.com
- Properties offered: House & lot, townhouse, condo units — in Avida Residences Sta. Catalina and nearby Cavite developments
- Payment: Flexible terms, in-house financing, bank loans available
- Site tripping: Available by appointment; agents personally guide prospective buyers
- The team responds to emails within a few hours during business hours

BEHAVIOR RULES:
- Be warm, conversational, and concise (2–4 sentences per reply max)
- Understand all phrasings: formal, casual, Taglish (e.g. "magkano yung bahay?", "pwede bang mag-visit?", "saan kayo?")
- Maintain context across the conversation — remember what was said earlier
- Never fabricate specific prices, unit availability, or lot sizes — say you'll connect them with an agent
- If asked something completely unrelated to real estate or Inner SPARC, politely redirect

RESPONSE FORMAT — you must ALWAYS respond with valid JSON only, no prose outside it:
{
  "reply": "Your message to the user. Use \\n for line breaks. Use **text** for bold.",
  "quickReplies": ["Up to 3 short follow-up suggestions relevant to what was just discussed"],
  "gmail": false,
  "gmailSubject": "",
  "gmailBody": ""
}

Set gmail: true (and fill gmailSubject + gmailBody) ONLY when the user wants to:
- Schedule a site tripping / property visit
- Send a direct message to the team
- Get a price list or detailed brochure
- Ask something you cannot fully answer

When gmail is true, write a gmailBody that's already filled with context from the conversation (property type they mentioned, preferred schedule, etc.) so the user just has to hit send.

IMPORTANT: Return ONLY the JSON object. No markdown fences, no extra text.`;

  // ── STATE ─────────────────────────────────────────────────────────────────
  let busy = false;
  let initialized = false;
  let history = [];

  // ── MODAL ─────────────────────────────────────────────────────────────────
  function openModal() {
    document.getElementById('overlay').classList.add('open');
    if (!initialized) { initialized = true; setTimeout(greet, 350); }
    setTimeout(() => document.getElementById('userInput').focus(), 400);
  }
  function closeModal() { document.getElementById('overlay').classList.remove('open'); }
  function handleOverlay(e) { if (e.target === document.getElementById('overlay')) closeModal(); }

  function greet() {
    botMsg(
      "Hi there! 👋 Welcome to **Inner SPARC Realty Services**. I'm your AI assistant — ask me anything about our properties, payment options, site trippings, or how to get in touch. How can I help you today?",
      false, '', '', false
    );
    setQR(["Available properties", "Pricing & payment", "Schedule a visit", "Business hours", "Contact an agent"]);
  }

  // ── SEND ──────────────────────────────────────────────────────────────────
  function sendMsg() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    clearQR();
    userMsg(text);
    callAI(text);
  }

  function getCsrfToken() {
    const cookieMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
  }

  // ── AI API (server-side provider proxy) ───────────────────────────────────
  async function callAI(text) {
    busy = true;
    setBtnDisabled(true);
    showTyping();

    history.push({ role: 'user', content: text });

    try {
      const csrfToken = getCsrfToken();
      const headers = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const res = await fetch('/portal-ai/chat/', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          messages: history
        })
      });

      const data = await res.json();
      const raw = data?.data?.content?.map(b => b.text || '').join('').trim() || '';

      hideTyping();

      // Parse structured JSON from the backend model output.
      let parsed;
      try {
        const clean = raw.replace(/^```json|^```|```$/gm, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        // Graceful fallback if JSON parse fails
        parsed = {
          reply: raw || "I didn't quite catch that — could you rephrase? 😊",
          quickReplies: ["Ask something else", "Contact an agent"],
          gmail: false
        };
      }

      history.push({ role: 'assistant', content: raw });

      botMsg(
        parsed.reply,
        !!parsed.gmail,
        parsed.gmailSubject || '',
        parsed.gmailBody || '',
        true
      );

      if (parsed.quickReplies?.length) setQR(parsed.quickReplies);

    } catch (err) {
      hideTyping();
      botMsg(
        "Sorry, I'm having a little trouble connecting right now. 😅 Please try again or reach our team directly.",
        true,
        'Inquiry – Inner SPARC Realty',
        'Hi Inner SPARC team,\n\nI would like to inquire about:\n\n'
      );
    }

    busy = false;
    setBtnDisabled(false);
  }

  // ── DOM HELPERS ───────────────────────────────────────────────────────────
  function botMsg(text, gmail = false, gmailSubject = '', gmailBody = '', isAI = false) {
    const body = document.getElementById('chatBody');
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';

    const av = document.createElement('div');
    av.className = 'msg-avatar'; av.textContent = '🏠';

    const right = document.createElement('div');
    const bub = document.createElement('div');
    bub.className = 'bubble';
    bub.innerHTML = fmt(text);

    if (gmail) {
      const subj = gmailSubject || 'Inquiry – Inner SPARC Realty';
      const bod  = gmailBody   || 'Hi Inner SPARC team,\n\nI would like to inquire about:\n\n';
      const link = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(bod)}`;
      const a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.className = 'gmail-btn';
      a.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.148C21.69 2.28 24 3.434 24 5.457z"/></svg> Open Gmail draft`;
      bub.appendChild(a);
    }

    right.appendChild(bub);

    if (isAI) {
      const label = document.createElement('div');
      label.className = 'ai-label';
      label.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> AI-generated response`;
      right.appendChild(label);
    }

    wrap.appendChild(av);
    wrap.appendChild(right);
    body.appendChild(wrap);
    scrollBottom();
  }

  function userMsg(text) {
    const body = document.getElementById('chatBody');
    const wrap = document.createElement('div');
    wrap.className = 'msg user';
    const bub = document.createElement('div');
    bub.className = 'bubble'; bub.textContent = text;
    wrap.appendChild(bub);
    body.appendChild(wrap);
    scrollBottom();
  }

  function showTyping() {
    const body = document.getElementById('chatBody');
    const el = document.createElement('div');
    el.className = 'msg bot'; el.id = 'typing';
    el.innerHTML = `<div class="msg-avatar">🏠</div><div class="typing-bubble"><span></span><span></span><span></span></div>`;
    body.appendChild(el);
    scrollBottom();
  }
  function hideTyping() { document.getElementById('typing')?.remove(); }

  function setQR(opts) {
    const c = document.getElementById('quickReplies');
    c.innerHTML = '';
    opts.slice(0, 3).forEach(o => {
      const b = document.createElement('button');
      b.className = 'qr'; b.textContent = o;
      b.onclick = () => { clearQR(); userMsg(o); callAI(o); };
      c.appendChild(b);
    });
  }
  function clearQR() { document.getElementById('quickReplies').innerHTML = ''; }
  function setBtnDisabled(v) { document.getElementById('sendBtn').disabled = v; }
  function scrollBottom() {
    const b = document.getElementById('chatBody');
    requestAnimationFrame(() => b.scrollTop = b.scrollHeight);
  }
  function fmt(t) {
    return t
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
</script>
