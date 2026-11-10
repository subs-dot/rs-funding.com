/* RS Funding — site scripts */
(() => {
  'use strict';

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
    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
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
      count.textContent = isResult ? 'RESULT' : `0${i + 1} / 0${questions.length}`;
      back.hidden = i === 0 || isResult;
      reset.hidden = !isResult;
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

  /* ---------------- Timeline fill on scroll ---------------- */
  const timeline = $('.timeline');
  if (timeline) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      timeline.classList.add('is-in');
    } else {
      const io = new IntersectionObserver(entries => {
        if (entries.some(en => en.isIntersecting)) { timeline.classList.add('is-in'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(timeline);
    }
  }

  /* ---------------- Repayment chart ---------------- */
  const bars = $('#bars');
  if (bars) {
    const sales = [58, 36, 72, 90, 64, 100, 42]; // illustrative daily sales, % of best day
    const avg = sales.reduce((a, b) => a + b, 0) / sales.length;
    const SHARE = 0.28; // exaggerated slightly so the remittance bar is visible
    bars.innerHTML = sales.map(s => `<div class="bar" style="--s:${s}%"><span class="bar__pay"></span></div>`).join('');
    const barEls = $$('.bar', bars);
    const setMode = mode => {
      barEls.forEach((b, i) => {
        const pay = mode === 'split' ? sales[i] * SHARE : avg * SHARE;
        b.style.setProperty('--p', (pay / sales[i] * 100) + '%');
      });
      $$('[data-mode]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.mode === mode)));
      $$('[data-desc]').forEach(d => { d.hidden = d.dataset.desc !== mode; });
    };
    $$('[data-mode]').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
    setMode('split');
  }
})();
