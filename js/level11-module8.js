/* Level 11 · Module 8 – Digital Interface Verification */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var V = [0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0], RD = [0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0];
  var D = ['', 'A1', 'A1', '', 'B2', 'B3', 'C4', '', '', 'D5', '', 'E6', ''], RX = ['', '', 'A1', '', '', 'B3', '', '', '', 'D5', '', 'E7', ''];
  var REASONS = ['Data changed while valid = 1 and ready = 0', 'valid was withdrawn before the transfer completed', 'Received data does not match the sent data (scoreboard mismatch)', 'ready may never be high while valid is low'];
  var EV = [
    { w: [1, 2], ok: true, msg: 'valid waits for ready with stable data; transfer of A1 at cycle 2 – correct.' },
    { w: [4, 5], ok: false, r: 0, msg: 'data changed from B2 to B3 while waiting – the receiver may capture either. Assertion: valid && !ready |=> $stable(data).' },
    { w: [6, 7], ok: false, r: 1, msg: 'C4 was offered and then withdrawn without being accepted. Assertion: valid && !ready |=> valid.' },
    { w: [8, 8], ok: true, msg: 'ready high without valid is allowed (the receiver is simply ready); no transfer happens.' },
    { w: [9, 9], ok: true, msg: 'valid and ready in the same cycle: single-cycle transfer of D5 – correct.' },
    { w: [11, 11], ok: false, r: 2, msg: 'E6 was sent but E7 arrived – data corruption inside the DUT. Only a scoreboard comparing ends finds this; the protocol itself was legal.' }
  ];

  /* ---------- Widget: protocol verification lab ---------- */
  function protoLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Protocol verification lab · valid/ready handshake</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, st = {}, done = false;
    body.appendChild(L.h('p', 'l7-hint', 'Rules: a transfer happens in a cycle where valid and ready are both 1. Once valid is 1 it must stay 1 with stable data until the transfer. Check each numbered event.'));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var panel = L.h('div', ''); body.appendChild(panel);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      var W = 44, o = '', x0 = 80;
      [['clk', null], ['valid', V], ['ready', RD]].forEach(function (r, i) {
        var y = 30 + i * 36, d = 'M' + x0 + ' ' + (y + 18);
        if (!r[1]) { for (var t = 0; t < 13; t++) d += 'V' + y + 'H' + (x0 + t * W + W / 2) + 'V' + (y + 18) + 'H' + (x0 + (t + 1) * W); o += P(d, 'wv-clk'); }
        else { r[1].forEach(function (v, t) { d += 'V' + (y + (v ? 0 : 18)) + 'H' + (x0 + (t + 1) * W); }); o += P(d, 'w-on'); }
        o += T(x0 - 8, y + 14, r[0], 't-dim t-sm', 'end');
      });
      o += T(x0 - 8, 154, 'data', 't-dim t-sm', 'end') + T(x0 - 8, 184, 'rx data', 't-dim t-sm', 'end');
      for (var t = 0; t < 13; t++) { if (D[t]) o += R(x0 + t * W + 2, 140, W - 4, 22, 'box', 4) + T(x0 + t * W + W / 2, 156, D[t], 't-ink t-sm'); if (RX[t]) o += R(x0 + t * W + 2, 170, W - 4, 22, RX[t] === D[t] ? 'box-ok' : 'box-bad', 4) + T(x0 + t * W + W / 2, 186, RX[t], 't-ink t-sm'); }
      EV.forEach(function (e, i) {
        var x = x0 + e.w[0] * W, w = (e.w[1] - e.w[0] + 1) * W, s = st[i];
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0"><rect x="' + x + '" y="22" width="' + w + '" height="174" fill="' + (s ? 'rgba(52,199,89,.1)' : i === cur ? 'rgba(0,113,227,.12)' : 'rgba(0,0,0,.02)') + '" stroke="' + (s ? '#34c759' : i === cur ? '#0071e3' : '#c7c7cc') + '" stroke-dasharray="4 3"/>' +
          '<circle cx="' + (x + w / 2) + '" cy="210" r="11" fill="' + (s ? '#34c759' : i === cur ? '#0071e3' : '#8e8e93') + '"/>' + T(x + w / 2, 214, s ? '✓' : String(i + 1), 't-b t-sm').replace('class="', 'fill="#fff" class="') + '</g>';
      });
      pic.innerHTML = S(680, 226, o, 'Handshake trace');
      L.$$('g.click', pic).forEach(function (g) { g.addEventListener('click', function () { cur = +g.getAttribute('data-i'); draw(); }); });
      panel.innerHTML = '';
      var e = EV[cur];
      panel.appendChild(L.h('h4', '', 'Event ' + (cur + 1) + ' (cycle' + (e.w[0] === e.w[1] ? ' ' + e.w[0] : 's ' + e.w[0] + '–' + e.w[1]) + ')'));
      if (st[cur]) { panel.appendChild(L.h('div', 'l7-fb ok', '✓ ' + e.msg)); }
      else {
        var ch = L.h('div', 'l7-choice'); panel.appendChild(ch);
        [['✅ Correct behaviour', true]].concat(REASONS.map(function (r, k) { return ['❌ Violation: ' + r, k]; })).forEach(function (opt) {
          var b = L.h('button', '', opt[0]); b.type = 'button';
          b.addEventListener('click', function () {
            var right = opt[1] === true ? e.ok : (!e.ok && opt[1] === e.r);
            if (right) { st[cur] = 1; L.fb(fb, 'ok', '✓ ' + e.msg); var nx = EV.findIndex(function (x, i) { return !st[i]; }); if (nx >= 0) cur = nx; draw(); }
            else { b.classList.add('is-wrong'); L.fb(fb, 'bad', opt[1] === 3 ? '✗ That is not a rule: ready may be high at any time.' : '✗ Look at valid, ready and data in this window again.'); }
          });
          ch.appendChild(b);
        });
      }
      var n = Object.keys(st).length;
      if (n === EV.length && !done) { done = true; api.done(); L.fb(fb, 'ok', '🎉 All six events judged: 3 correct transfers/idle cycles, 2 protocol violations (assertions catch them) and 1 data corruption (the scoreboard catches it).'); }
    }
    draw();
  }

  /* ---------- Widget: which checker for which interface bug? ---------- */
  function ifDrill(root, api) {
    L.drill(root, api, {
      bar: 'Interface verification · which check finds the bug?', label: 'Bug',
      items: [
        { q: 'A FIFO accepts a write while full and overwrites the oldest data.', o: ['Scoreboard (reference queue) + assertion !(wr && full)', 'Toggle coverage', 'Clock check only', 'Synthesis report'], a: 0, w: 'Data loss shows in the scoreboard; the assertion pinpoints the illegal write.' },
        { q: 'A UART receiver accepts a frame with a wrong parity bit as valid.', o: ['Error-injection test with corrupted parity + check of the parity_err flag', 'Only random valid frames', 'Line coverage', 'A faster baud rate'], a: 0, w: 'Error paths need deliberately injected errors.' },
        { q: 'A register reads back a value different from what was written.', o: ['Write-read-compare register test against a register model', 'Toggle coverage only', 'An X-check', 'Power analysis'], a: 0, w: 'Register models predict reset values and read-back values for every field.' },
        { q: 'An AXI-style slave sends a read response before the address handshake completed.', o: ['Protocol assertion on channel ordering', 'Code coverage', 'Directed reset test', 'Scoreboard on data only'], a: 0, w: 'Ordering rules between channels are protocol properties – assertions.' },
        { q: 'A bus master never tests back-pressure (ready held low for many cycles).', o: ['Random ready-delay constraints in the slave agent + coverage of wait lengths', 'More data values', 'A bigger FIFO', 'Line coverage'], a: 0, w: 'Interface timing variation must be part of the stimulus and covered.' }
      ]
    });
  }

  function hsFrame(k) {
    var o = '', W = 60;
    [['valid', [0, 1, 1, 1, 0]], ['ready', [0, 0, 0, 1, 0]]].forEach(function (r, i) { var y = 40 + i * 40, d = 'M60 ' + (y + 20); r[1].forEach(function (v, t) { d += 'V' + (y + (v ? 0 : 20)) + 'H' + (60 + (t + 1) * W); }); o += P(d, 'w-on') + T(52, y + 15, r[0], 't-dim t-sm', 'end'); });
    if (k >= 1) o += '<rect x="' + (60 + W) + '" y="30" width="' + 2 * W + '" height="70" fill="rgba(255,149,0,.12)"/>' + T(60 + 2 * W, 120, 'waiting: hold valid + data', 't-cu t-sm');
    if (k >= 2) o += '<rect x="' + (60 + 3 * W) + '" y="30" width="' + W + '" height="70" fill="rgba(52,199,89,.2)"/>' + T(60 + 3.5 * W, 120, 'transfer', 't-ok t-b t-sm');
    o += T(450, 50, ['valid/ready handshake', 'sender waits for receiver', 'both high = one transfer', ''][k] || '', 't-vio t-b t-sm', 'start');
    return S(600, 136, o, 'Handshake');
  }

  L.module({
    n: 8,
    lead: 'Most bugs live at interfaces: between blocks, at buses and protocols. Learn how FIFOs, UARTs, register interfaces and handshake/AXI-style buses are verified with protocol assertions, scoreboards and deliberate error injection.',
    tags: ['FIFO', 'UART', 'register interface', 'handshakes', 'AXI-style concepts', 'protocol checking', 'assertions', 'scoreboards', 'error injection'],
    sections: [
      {
        id: 'st-hs', type: 'steps', title: 'Animation: the valid/ready handshake', nav: 'Handshake',
        frames: [0, 1, 2].map(function (k) { return { t: ['The sender raises valid with data.', 'If ready is low, the sender must keep valid and data stable.', 'A transfer happens in the cycle where both valid and ready are high. AXI-style buses use this on every channel.'][k], svg: hsFrame(k) }; })
      },
      {
        id: 'c-if', type: 'concept', title: 'Verifying common interfaces', nav: 'Interfaces',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Interface</th><th>Key checks</th><th>Typical tools</th></tr>' +
          '<tr><td>FIFO</td><td>order, no loss/duplication, full/empty flags, overflow/underflow handling</td><td>queue scoreboard, flag assertions, fill-level coverage</td></tr>' +
          '<tr><td>UART</td><td>frame format, every baud/parity setting, error detection</td><td>loop-back scoreboard, error injection</td></tr>' +
          '<tr><td>Register interface</td><td>reset values, read/write access, read-only fields</td><td>register model, write-read tests</td></tr>' +
          '<tr><td>Handshake / AXI-style</td><td>valid/ready rules, channel ordering, back-pressure, bursts</td><td>protocol assertions, random delays, scoreboard</td></tr></table></div>'
      },
      { id: 'w-proto', type: 'widget', title: 'Protocol verification lab', nav: 'Protocol lab', intro: 'Tap each numbered event and decide whether it is correct or which rule it breaks.', build: protoLab },
      {
        id: 'c-err', type: 'concept', title: 'Error injection', nav: 'Error injection',
        html: '<p>Error-handling logic is only exercised if errors happen. Testbenches deliberately <b>inject</b> them: corrupted parity or CRC, illegal opcodes, writes to a full FIFO, protocol violations from the driver. The checks then verify that the DUT detects, reports and recovers correctly – and that legal traffic afterwards still works.</p>'
      },
      { id: 'w-if', type: 'widget', title: 'Which check finds the bug?', nav: 'Interface drill', intro: 'Pick the verification technique that catches each interface bug.', build: ifDrill },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: interface insights', nav: 'Reveal',
        items: [
          { q: 'Why do protocol violations need assertions and data bugs need scoreboards?', a: 'Assertions check timing rules at the pins; scoreboards check end-to-end data correctness. Each misses what the other finds.' },
          { q: 'Why randomise ready delays?', a: 'Many bugs appear only under back-pressure or long stalls.' },
          { q: 'What is verification IP (VIP)?', a: 'A ready-made agent with drivers, monitors, assertions and coverage for a standard protocol.' },
          { q: 'Why test after an error?', a: 'Recovery bugs are common: the DUT may handle the error but corrupt the next legal transfer.' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: assertion or scoreboard?', nav: 'Drag & drop',
        bins: ['Protocol assertion', 'Scoreboard'],
        items: [['valid dropped before ready', 0], ['data changed while waiting', 0], ['response before request', 0], ['FIFO output order wrong', 1], ['UART byte corrupted', 1], ['register read-back wrong', 1]]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In a valid/ready handshake, a transfer occurs when…', o: ['valid and ready are both high', 'valid is high', 'ready is high', 'data changes'], a: 0, w: '' },
          { q: 'Error injection is used to verify…', o: ['error detection and recovery logic', 'clock trees', 'synthesis', 'layout'], a: 0, w: '' },
          { q: 'A FIFO\'s data ordering is best checked by…', o: ['a reference-queue scoreboard', 'toggle coverage', 'line coverage', 'a reset test only'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'All protocol assertions pass, but software reports occasional wrong bytes from the UART.', q: 'What was missing?', o: [{ t: 'An end-to-end scoreboard comparing transmitted and received data', ok: true, w: 'Legal protocol, wrong data.' }, { t: 'More assertions', ok: false, w: 'Protocol was fine.' }, { t: 'A slower baud rate', ok: false, w: 'Hides the bug.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Most bugs are found at…', o: ['interfaces between blocks', 'power pads', 'masks', 'testbench comments'], a: 0, w: '' },
      { d: 'Easy', q: 'A scoreboard checks…', o: ['data correctness end to end', 'protocol timing only', 'synthesis', 'clock skew'], a: 0, w: '' },
      { d: 'Easy', q: 'ready high while valid is low is…', o: ['allowed – no transfer happens', 'a violation', 'a transfer', 'a reset'], a: 0, w: '' },
      { d: 'Medium', q: 'Writing to a full FIFO should be tested by…', o: ['error injection + overflow checks', 'never doing it', 'line coverage', 'longer reset'], a: 0, w: '' },
      { d: 'Medium', q: 'valid && !ready |=> $stable(data) checks…', o: ['data does not change while waiting', 'valid toggles', 'ready rises', 'parity'], a: 0, w: '' },
      { d: 'Medium', q: 'Register interfaces are often verified with…', o: ['a register model and write-read tests', 'toggle coverage only', 'GDSII', 'ATPG'], a: 0, w: '' },
      { d: 'Medium', q: 'Back-pressure testing means…', o: ['holding ready low for varying times', 'faster clocks', 'larger data', 'fewer tests'], a: 0, w: '' },
      { d: 'Hard', q: 'A corrupted payload with a legal handshake is caught by…', o: ['the scoreboard', 'the protocol assertions', 'toggle coverage', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'AXI-style buses add the challenge of…', o: ['multiple independent channels and ordering rules', 'no handshakes', 'no data', 'single-bit transfers only'], a: 0, w: '' },
      { d: 'Hard', q: 'Why check normal traffic after an injected error?', o: ['recovery bugs may corrupt later transfers', 'it is required by SV', 'to raise coverage only', 'it is not needed'], a: 0, w: '' }
    ]
  });
})();
