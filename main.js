/* RS Funding — site scripts */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const EMAIL = 'admin@rs-funding.com';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Build a mailto: link with a subject and a pre-filled body */
  const mailto = (subject, lines) =>
    `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;

  /* "Email us" buttons open an email with a short template to fill in */
  $$('[data-mail]').forEach(a => {
    a.href = mailto('Funding request', [
      'Hi RS Funding,', '',
      "I'd like to get funding for my business.", '',
      'Business name: ',
      'Industry: ',
      'Time in business: ',
      'Average monthly deposits: ',
      'Amount needed: ',
      'Best phone number: ', '',
      'Thanks'
    ]);
  });

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Mobile menu */
  const burger = $('.burger');
  const links = $('#links');
  if (burger && links) {
    const setOpen = open => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      links.classList.toggle('is-open', open);
    };
    const isOpen = () => burger.getAttribute('aria-expanded') === 'true';
    burger.addEventListener('click', e => {
      setOpen(!isOpen());
      // opened from the keyboard: move into the list, which sits before the button in the tab order
      if (isOpen() && e.detail === 0) { const first = links.querySelector('a'); if (first) first.focus(); }
    });
    links.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !isOpen()) return;
      const inside = links.contains(document.activeElement);
      setOpen(false);
      if (inside) burger.focus();
    });
  }

  /* ---------------- Eligibility quiz ---------------- */
  const quiz = $('#quiz');
  if (quiz) {
    const steps = $$('.quiz__step', quiz);
    const questions = steps.filter(s => s.dataset.q);
    const bar = $('#quizBar');
    const count = $('#quizCount');
    const back = $('#quizBack');
    const reset = $('#quizReset');
    const segs = $$('[data-seg]', quiz);   // the three named progress segments
    const answers = {};   // values, e.g. { tib: '1-3' }
    const labels = {};    // what the visitor clicked, e.g. { tib: '1–3 years' }
    let current = 0;

    // Rough ceiling by monthly deposits, scaled by time in business. Illustrative only.
    const DEP_CAP = { 'lt10': 0, '10-25': 25000, '25-75': 90000, '75-200': 250000, '200-1m': 1000000, '1mplus': 3000000 };
    const TIB_MULT = { 'lt6': 0, '6-12': 0.6, '1-3': 0.85, '3plus': 1 };

    const show = (i, focus) => {
      current = i;
      steps.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
      const isResult = i >= questions.length;
      bar.style.width = isResult ? '100%' : ((i + 1) / questions.length * 100) + '%';
      count.textContent = isResult ? 'Your result' : `Step ${i + 1} of ${questions.length}`;
      back.hidden = i === 0 || isResult;
      reset.hidden = !isResult;
      segs.forEach((seg, idx) => {
        const key = seg.dataset.seg;
        seg.classList.toggle('is-current', idx === i);
        seg.classList.toggle('is-done', key in labels && idx !== i);
        const read = seg.querySelector('[data-read]');
        if (read) read.textContent = labels[key] || '\u2014';
      });
      if (focus) {
        const target = steps[i].querySelector('h3, .quiz__amount');
        if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      }
    };

    const renderResult = () => {
      const cap = (DEP_CAP[answers.dep] || 0) * (TIB_MULT[answers.tib] || 0);
      const amount = $('#quizAmount');
      const label = $('#quizLabel');
      const msg = $('#quizMsg');
      const cta = $('#quizCta');
      let estimateLine = [];
      if (cap > 0) {
        const est = Math.min(3000000, Math.max(10000, Math.round(cap / 5000) * 5000));
        const text = 'Up to ' + money(est);
        label.textContent = 'You may qualify for';
        amount.textContent = text;
        amount.classList.remove('is-soft');
        msg.textContent = 'Based on your answers, your business looks like a fit. Email us your results and an advisor will follow up with real numbers.';
        cta.innerHTML = 'Email my results <span class="arrow" aria-hidden="true">&rarr;</span>';
        estimateLine = [`Website estimate: ${text}`];
      } else {
        label.textContent = 'Honest answer';
        amount.textContent = 'Not quite yet.';
        amount.classList.add('is-soft');
        msg.textContent = 'Most programs need 6+ months in business and $10K+ in monthly deposits. Email us anyway. We may still have options, and we\'ll tell you straight.';
        cta.innerHTML = 'Email us anyway <span class="arrow" aria-hidden="true">&rarr;</span>';
      }
      cta.href = mailto('Funding request (eligibility check)', [
        'Hi RS Funding,', '',
        'I just took the eligibility check on your website.', '',
        `Time in business: ${labels.tib || ''}`,
        `Average monthly deposits: ${labels.dep || ''}`,
        `Use of funds: ${labels.use || ''}`,
        ...estimateLine, '',
        'Business name: ',
        'Amount needed: ',
        'Best phone number: ', '',
        'Thanks'
      ]);
    };

    quiz.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const step = chip.closest('[data-q]');
      $$('.chip', step).forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      answers[step.dataset.q] = chip.dataset.value;
      labels[step.dataset.q] = chip.textContent.trim();
      const next = current + 1;
      if (next >= questions.length) renderResult();
      setTimeout(() => show(next, true), reduceMotion ? 0 : 200);
    });
    back.addEventListener('click', () => show(Math.max(0, current - 1), true));
    reset.addEventListener('click', () => {
      [answers, labels].forEach(o => Object.keys(o).forEach(k => delete o[k]));
      $$('.chip', quiz).forEach(c => c.setAttribute('aria-pressed', 'false'));
      show(0, true);
    });
    show(0, false);
  }

  /* ---------------- Scroll-in accents ----------------
     Everything is visible without these; the class only plays a short pulse
     (timeline nodes, requirement checks) the first time the block is seen. */
  const onSeen = (el, reveal) => {
    if (!el) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { reveal(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(en => en.isIntersecting)) { reveal(); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
  };
  const timeline = $('.timeline');
  if (timeline) {
    const shell = timeline.closest('.tl');
    onSeen(timeline, () => { timeline.classList.add('is-in'); if (shell) shell.classList.add('is-in'); });
  }
  const reqPanel = $('.req__panel');
  onSeen(reqPanel, () => reqPanel.classList.add('is-in'));

  /* ---------------- Repayment chart ---------------- */
  const bars = $('#bars');
  if (bars) {
    const sales = [58, 36, 72, 90, 64, 100, 42]; // illustrative daily sales, % of best day
    const avg = sales.reduce((a, b) => a + b, 0) / sales.length;
    const SHARE = 0.28; // exaggerated slightly so the remittance bar is visible
    const slow = sales.indexOf(Math.min(...sales));
    const busy = sales.indexOf(Math.max(...sales));
    const tag = i => i === slow ? '<span class="bar__tag bar__tag--slow">Slow day</span>'
      : i === busy ? '<span class="bar__tag">Busy day</span>' : '';
    bars.innerHTML = sales.map((s, i) => `<div class="bar" style="--s:${s}%">${tag(i)}<span class="bar__pay"></span></div>`).join('')
      + '<svg class="chart__line" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline vector-effect="non-scaling-stroke" points=""/></svg>';
    const barEls = $$('.bar', bars);
    // Dashed line through the tops of the remittance bars, so the two structures read at a glance
    const line = $('polyline', bars);
    let shown = null;   // remittance heights currently drawn, in % of the chart height
    let raf = 0;
    const draw = pays => line.setAttribute('points', pays.map((p, i) => `${i * 100},${(100 - p).toFixed(2)}`).join(' '));
    const moveLine = target => {
      cancelAnimationFrame(raf);
      if (!shown || reduceMotion) { shown = target; draw(target); return; }
      const from = shown.slice();
      const t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / 550);
        const e = 1 - Math.pow(1 - t, 3);
        shown = from.map((v, i) => v + (target[i] - v) * e);
        draw(shown);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const tabs = $$('[data-mode]');
    const setMode = mode => {
      const pays = sales.map(s => mode === 'split' ? s * SHARE : avg * SHARE);
      barEls.forEach((b, i) => {
        b.style.setProperty('--p', (pays[i] / sales[i] * 100) + '%');
      });
      moveLine(pays);
      tabs.forEach(t => {
        const on = t.dataset.mode === mode;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;   // one tab stop; the arrow keys move between the two
      });
      $$('[data-desc]').forEach(d => { d.hidden = d.dataset.desc !== mode; });
      bars.setAttribute('aria-label', 'Bar chart of one illustrative week. ' + (mode === 'split'
        ? "With a percentage of sales, the remittance rises and falls with each day's sales."
        : 'With fixed ACH, the remittance is the same amount every day while sales vary.'));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => setMode(t.dataset.mode));
      t.addEventListener('keydown', e => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        setMode(next.dataset.mode);
        next.focus();
      });
    });
    setMode('split');
  }
})();
