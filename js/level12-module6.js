/* Level 12 · Module 6 – Logic BIST */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var TAPS = { 'x4+x3+1': [3, 2], 'x4+x+1': [3, 0], 'x4+x2+1': [3, 1], 'x4+x3+x2+x+1': [3, 2, 1, 0] };
  function step(s, taps) { var fb = taps.reduce(function (a, t) { return a ^ ((s >> t) & 1); }, 0); return ((s << 1) | fb) & 15; }
  function seq(seed, taps) { var out = [seed], s = seed; for (var i = 0; i < 20; i++) { s = step(s, taps); if (s === seed) break; out.push(s); } return out; }
  function cut(p, fault) { var y = ((p * 3) ^ (p >> 1)) & 15; if (fault) y = y | 8; return y; }       // circuit under test; fault: output bit 3 stuck-at-1
  function misr(resps) { var s = 0; resps.forEach(function (r) { var fb = ((s >> 3) ^ (s >> 2)) & 1; s = (((s << 1) | fb) & 15) ^ r; }); return s; }
  function bin(v) { var s = v.toString(2); while (s.length < 4) s = '0' + s; return s; }

  /* ---------- Widget: LFSR + MISR simulator ---------- */
  function bistLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>LFSR + MISR simulator · 4-bit pattern generator and signature register</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var tap = 'x4+x2+1', seed = 1, fault = false, maxSeen = false, faultCaught = false, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Feedback polynomial', Object.keys(TAPS).map(function (k) { return [k, k]; }), tap, function (v) { tap = v; draw(); });
    L.select(row, 'Seed', [['1', '0001'], ['6', '0110'], ['9', '1001'], ['0', '0000']], '1', function (v) { seed = +v; draw(); });
    var bf = L.btn('Inject fault (output bit 3 stuck-at-1): OFF', '', function () { fault = !fault; draw(); }); row.appendChild(bf);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      bf.innerHTML = 'Inject fault (output bit 3 stuck-at-1): ' + (fault ? 'ON' : 'OFF'); bf.classList.toggle('is-on', fault);
      var pats = seed === 0 ? [0] : seq(seed, TAPS[tap]), period = pats.length;
      if (period === 15) maxSeen = true;
      var good = misr(pats.map(function (p) { return cut(p, false); })), sig = misr(pats.map(function (p) { return cut(p, fault); }));
      if (fault && sig !== good && period === 15) faultCaught = true;
      var o = '';
      pats.slice(0, 15).forEach(function (p, i) { var x = 10 + (i % 15) * 39; o += R(x, 20, 36, 22, 'box-on', 4) + T(x + 18, 35, bin(p), 't-ink t-sm'); });
      o += T(300, 60, period === 15 ? 'maximal length: all 15 non-zero states visited' : seed === 0 ? 'all-zero seed: the LFSR is stuck at 0000 forever' : 'period ' + period + ' – the sequence repeats early (non-primitive polynomial)', period === 15 ? 't-ok t-b t-sm' : 't-bad t-b t-sm');
      o += R(150, 76, 110, 40, 'box-cu', 8) + T(205, 101, 'circuit under test', 't-ink t-sm') + P('M100 96H150M260 96H330', 'w-on') + R(330, 76, 110, 40, 'box-vio', 8) + T(385, 101, 'MISR', 't-ink t-b t-sm');
      o += T(60, 100, 'LFSR', 't-ink t-b t-sm') + T(500, 92, 'signature', 't-dim t-sm') + T(500, 110, bin(sig), sig === good ? 't-ok t-b' : 't-bad t-b');
      pic.innerHTML = S(600, 130, o, 'LBIST');
      out.innerHTML = '<span class="k">Patterns applied</span> ' + period + ' · <span class="k">golden signature</span> ' + bin(good) + ' · <span class="k">observed</span> ' + bin(sig) + ' → ' + (sig === good ? (fault ? '<span class="c">fault NOT detected (aliasing or not excited)</span>' : '<span class="v">PASS</span>') : '<span class="v">FAIL – fault detected</span>') +
        '<br><span class="k">Aliasing probability</span> for an n-bit MISR ≈ 2<sup>−n</sup>: 4 bits → 6.25 %, 32 bits → 2.3 × 10<sup>−10</sup>';
      verdict.className = 'l7-verdict ' + (maxSeen && faultCaught ? 'ok' : 'warn');
      verdict.innerHTML = (maxSeen ? '✅' : '○') + ' maximal-length LFSR found · ' + (faultCaught ? '✅' : '○') + ' fault detected by the signature<small>' + (maxSeen && faultCaught ? 'A primitive polynomial gives 2ⁿ − 1 patterns; the MISR compresses all responses into one signature that changes when a fault is excited.' : 'Find a polynomial that visits all 15 states, then inject the fault.') + '</small>';
      if (maxSeen && faultCaught && !done) { done = true; api.done(); }
    }
    draw();
  }

  function lbFrame(k) {
    var o = '', b = [['PRPG (LFSR)', 'box-on'], ['phase shifter', 'box'], ['scan chains (CUT)', 'box-cu'], ['X-masking', 'box'], ['MISR', 'box-vio'], ['compare golden', 'box-ok']];
    b.forEach(function (x, i) { var X = 6 + i * 99; o += R(X, 50, 92, 46, i <= k + 1 ? x[1] : 'box', 8) + T(X + 46, 78, x[0], 't-ink t-b t-sm'); if (i < 5) o += P('M' + (X + 92) + ' 73H' + (X + 99), 'w'); });
    o += T(300, 28, ['The LFSR generates pseudo-random patterns on chip', 'A phase shifter de-correlates neighbouring chains', 'Responses are captured in the scan chains', 'Unknown (X) values are masked; the MISR compacts the rest', 'At the end the signature is compared with the golden value'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'LBIST architecture');
  }

  L.module({
    n: 6,
    lead: 'Level 5 introduced LFSRs, signature analysis and BILBO. Logic BIST puts a complete tester inside the chip: pattern generator, phase shifter, scan chains, X-masking and MISR – used for in-field and power-on self-test in cars and servers.',
    tags: ['LFSR', 'pseudo-random patterns', 'MISR', 'signature analysis', 'aliasing', 'X-masking', 'test points', 'LBIST architecture'],
    sections: [
      {
        id: 'st-lb', type: 'steps', title: 'Animation: an LBIST architecture', nav: 'LBIST architecture',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['Pseudo-random pattern generator (LFSR).', 'Phase shifter feeds many chains with different sequences.', 'Scan chains apply patterns and capture responses.', 'X-sources are blocked; the MISR compacts responses.', 'Pass/fail by signature comparison – no external tester needed.'][k], svg: lbFrame(k) }; })
      },
      { id: 'w-bist', type: 'widget', title: 'LFSR + MISR simulator', nav: 'LFSR / MISR lab', intro: 'Find a maximal-length polynomial, then inject a fault and watch the signature change.', build: bistLab },
      {
        id: 'c-issues', type: 'concept', title: 'LBIST challenges', nav: 'Challenges',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Random-pattern resistance</h4><p>Some faults need very specific values (e.g. a wide AND) – test points or deterministic top-up patterns fix this.</p></div><div class="l7-box cu"><h4>X-values</h4><p>Any unknown value corrupts the signature – memories, analogue blocks and uninitialised flops must be masked or bounded.</p></div><div class="l7-box vio"><h4>Aliasing</h4><p>A faulty response can map to the good signature with probability ≈ 2⁻ⁿ – negligible for 32-bit MISRs.</p></div></div>'
      },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: LBIST insights', nav: 'Reveal',
        items: [
          { q: 'Can a real fault give the golden signature?', a: 'Yes – aliasing. With this 4-bit MISR, a stuck-at-1 on output bit 2 happens to produce exactly the golden signature for both 15-pattern sequences. That is why real MISRs are 32 bits or wider.' },
          { q: 'Why must the LFSR seed be non-zero?', a: 'With XOR feedback, 0000 maps to 0000 forever.' },
          { q: 'What makes a polynomial primitive?', a: 'It generates the maximal period 2ⁿ − 1 – every non-zero state appears once.' },
          { q: 'Why use LBIST in cars?', a: 'Safety standards require periodic self-test in the field, without a tester.' },
          { q: 'Why does LBIST cost more area than compression?', a: 'It adds the PRPG, MISR, control and often test points and X-bounding logic.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: LBIST component roles', nav: 'Drag & drop',
        bins: ['Generate stimulus', 'Compact responses', 'Protect the signature'],
        items: [['LFSR / PRPG', 0], ['phase shifter', 0], ['MISR', 1], ['signature comparator', 1], ['X-masking logic', 2], ['X-bounding of memory outputs', 2]]
      },
      {
        id: 'calc6', type: 'calc', title: 'LBIST calculations', nav: 'Calculate',
        items: [
          { q: 'Maximal period of a 16-bit LFSR?', a: 65535, h: '2¹⁶ − 1.', s: '<b>65,535</b>.' },
          { q: 'Aliasing probability of an 8-bit MISR, as a percentage (two decimals)?', a: 0.39, tol: 0.02, h: '2⁻⁸.', s: '≈ <b>0.39 %</b>.' },
          { q: '100,000 LBIST patterns with 200-cycle shifts at 100 MHz: time (ms)?', a: 200, h: '2·10⁷ cycles / 10⁸.', s: '<b>200 ms</b>.' }
        ]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A MISR…', o: ['compacts many responses into a signature', 'generates patterns', 'stores the netlist', 'repairs memories'], a: 0, w: '' },
          { q: 'Aliasing means…', o: ['a faulty response gives the good signature', 'the LFSR stops', 'X-values', 'scan shift fails'], a: 0, w: '' },
          { q: 'Random-pattern-resistant faults are helped by…', o: ['test points', 'longer chains', 'fewer patterns', 'removing the MISR'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'LBIST signatures differ from chip to chip even on good dies.', q: 'Most likely cause?', o: [{ t: 'Unknown (X) values reaching the MISR – they need masking or bounding', ok: true, w: 'X-values make signatures unpredictable.' }, { t: 'Aliasing', ok: false, w: 'Aliasing hides faults; it does not create differences.' }, { t: 'Too many patterns', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'An LFSR in LBIST generates…', o: ['pseudo-random patterns', 'signatures', 'clocks', 'repairs'], a: 0, w: '' },
      { d: 'Easy', q: 'LBIST needs an external tester…', o: ['no – it is self-testing', 'always', 'only for memories', 'only for clocks'], a: 0, w: '' },
      { d: 'Easy', q: 'The golden signature is…', o: ['the MISR value of a fault-free circuit', 'the seed', 'the polynomial', 'the pattern count'], a: 0, w: '' },
      { d: 'Medium', q: 'Maximal period of a 5-bit LFSR =', o: ['31', '32', '16', '25'], a: 0, w: '' },
      { d: 'Medium', q: 'A phase shifter…', o: ['de-correlates the sequences fed to neighbouring chains', 'shifts clocks', 'compacts responses', 'repairs cells'], a: 0, w: '' },
      { d: 'Medium', q: 'X-masking is needed because…', o: ['unknown values corrupt the signature', 'patterns are random', 'chains are long', 'MISRs are small'], a: 0, w: '' },
      { d: 'Medium', q: 'All-zero LFSR seed…', o: ['locks the LFSR at zero', 'gives maximal length', 'is preferred', 'has no effect'], a: 0, w: '' },
      { d: 'Hard', q: 'Aliasing probability of a 32-bit MISR ≈', o: ['2⁻³²', '1/32', '50 %', '0'], a: 0, w: '' },
      { d: 'Hard', q: 'LBIST is typically required for…', o: ['in-field self-test in safety systems', 'reducing area', 'boundary scan', 'routing'], a: 0, w: '' },
      { d: 'Hard', q: 'Why do LBIST designs add test points?', o: ['to raise detection of random-pattern-resistant faults', 'to cut power', 'to fix timing', 'to add pins'], a: 0, w: '' }
    ]
  });
})();
