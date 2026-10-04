/* Level 13 · Module 6 – Out-of-Order Execution */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var LAT = { ALU: 1, MUL: 4, MEM: 3 };
  var PROG = [
    { t: 'ld  r1, 0(r9)', u: 'MEM', d: 'r1', s: ['r9'] },
    { t: 'mul r2, r1, r3', u: 'MUL', d: 'r2', s: ['r1', 'r3'] },
    { t: 'add r4, r5, r6', u: 'ALU', d: 'r4', s: ['r5', 'r6'] },
    { t: 'sub r5, r4, r7', u: 'ALU', d: 'r5', s: ['r4', 'r7'] },
    { t: 'add r2, r8, r9', u: 'ALU', d: 'r2', s: ['r8', 'r9'] },
    { t: 'add r6, r2, r4', u: 'ALU', d: 'r6', s: ['r2', 'r4'] }
  ];
  /* Precompute the timeline with renaming (true dependences only), 2-wide rename and commit, one unit of each type */
  function timeline() {
    var n = PROG.length, ren = [], ex = [], fin = [], com = [], prod = [];
    var last = {};
    PROG.forEach(function (I, i) { prod.push(I.s.map(function (r) { return last[r] != null ? last[r] : -1; })); last[I.d] = i; });
    for (var i = 0; i < n; i++) ren[i] = 1 + Math.floor(i / 2);
    var busy = { ALU: {}, MUL: {}, MEM: {} };
    for (var c = 1; c < 60; c++) {
      for (i = 0; i < n; i++) {
        if (ex[i] != null || ren[i] >= c) continue;
        var ready = prod[i].every(function (p) { return p < 0 || (fin[p] != null && fin[p] + 1 <= c); });
        if (ready && !busy[PROG[i].u][c]) { ex[i] = c; fin[i] = c + LAT[PROG[i].u] - 1; busy[PROG[i].u][c] = 1; }
      }
    }
    var cnt = {};
    for (i = 0; i < n; i++) { var cc = Math.max(fin[i] + 1, i ? com[i - 1] : 0); while ((cnt[cc] || 0) >= 2) cc++; com[i] = cc; cnt[cc] = (cnt[cc] || 0) + 1; }
    return { ren: ren, ex: ex, fin: fin, com: com, prod: prod, end: com[n - 1] };
  }

  /* ---------- Widget: Tomasulo / OoO simulator ---------- */
  function oooLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Out-of-order simulator · queue → rename → reservation stations → units → ROB → commit</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var tl = timeline(), cyc = 0, answered = false, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('▶ Next cycle', 'pri', function () { cyc = Math.min(tl.end, cyc + 1); draw(); }));
    row.appendChild(L.btn('⏭ Run to end', 'ghost', function () { cyc = tl.end; draw(); }));
    row.appendChild(L.btn('↺ Reset', 'ghost', function () { cyc = 0; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var qbox = L.h('div', ''); body.appendChild(qbox);
    function where(i) {
      if (cyc >= tl.com[i]) return 'commit';
      if (cyc > tl.fin[i]) return 'rob-done';
      if (cyc >= tl.ex[i]) return 'fu';
      if (cyc >= tl.ren[i]) return 'rs';
      return 'queue';
    }
    function draw() {
      var cols = [['queue', 'Instruction queue'], ['rs', 'Reservation stations'], ['fu', 'Functional units'], ['rob', 'Reorder buffer'], ['commit', 'Committed']], o = '';
      cols.forEach(function (c, k) { o += R(4 + k * 120, 4, 112, 250, 'box', 10) + T(60 + k * 120, 22, c[1], 't-ink t-b t-sm'); });
      var slot = { queue: 0, rs: 0, fu: 0, rob: 0, commit: 0 };
      PROG.forEach(function (I, i) {
        var w = where(i), col = w === 'rob-done' ? 'rob' : w, k = ['queue', 'rs', 'fu', 'rob', 'commit'].indexOf(col), y = 32 + slot[col]++ * 36;
        var cls = w === 'fu' ? 'box-cu' : w === 'rob-done' ? 'box-ok' : w === 'commit' ? 'box-on' : 'box';
        var sub = w === 'fu' ? I.u + ' ' + (cyc - tl.ex[i] + 1) + '/' + LAT[I.u] : w === 'rob-done' ? 'done – waiting' : w === 'rs' ? (tl.prod[i].some(function (p) { return p >= 0 && !(tl.fin[p] != null && tl.fin[p] + 1 <= cyc); }) ? 'waiting operands' : 'ready') : w === 'commit' ? 'c' + tl.com[i] : '';
        o += R(10 + k * 120, y, 100, 32, cls, 6) + T(60 + k * 120, y + 14, 'I' + (i + 1) + ' ' + I.t.split(' ')[0], 't-ink t-b t-sm') + T(60 + k * 120, y + 27, sub, 't-dim t-sm');
        if (w === 'fu' || w === 'rs') o += R(10 + 3 * 120, 32 + (slot.rob++) * 36, 100, 32, w === 'rob-done' ? 'box-ok' : 'box', 6) + T(60 + 3 * 120, 32 + (slot.rob - 1) * 36 + 20, 'I' + (i + 1) + (w === 'rob-done' ? ' ✓' : ' …'), 't-ink t-sm');
      });
      // rename table
      var map = {}; PROG.forEach(function (I, i) { if (cyc >= tl.ren[i]) map[I.d] = 'P' + (i + 1) + (cyc >= tl.com[i] ? '' : '*'); });
      o += T(4, 276, 'Rename table: ' + (Object.keys(map).sort().map(function (r) { return r + '→' + map[r]; }).join('  ') || '(empty)') + '   (* = speculative, not yet committed)', 't-dim t-sm', 'start');
      pic.innerHTML = S(610, 286, o, 'OoO pipeline state');
      out.innerHTML = '<span class="k">Cycle</span> ' + cyc + ' / ' + tl.end + '<br>' + PROG.map(function (I, i) { return 'I' + (i + 1) + ': rename c' + tl.ren[i] + ' · execute c' + tl.ex[i] + '–' + tl.fin[i] + ' · commit c' + tl.com[i]; }).join('<br>');
      if (cyc >= tl.end && !answered) {
        qbox.innerHTML = '<p><b>Question:</b> I3 and I5 finished long before I2 – so why did they commit after I2?</p>';
        var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; qbox.appendChild(ch);
        var fb = L.h('div', 'l7-fb'); qbox.appendChild(fb);
        [['Commit happens in program order, so the architectural state is always precise (exceptions and mispredictions can be recovered)', 1], ['Their results were wrong and had to be recomputed', 0], ['The reorder buffer was full', 0]].forEach(function (op) {
          var b = L.h('button', '', op[0]); b.type = 'button';
          b.addEventListener('click', function () { if (op[1]) { answered = true; b.classList.add('is-right'); L.fb(fb, 'ok', '✓ Execute out of order, commit in order. If I2 had raised an exception, I3–I6 would simply be discarded. 🎉 Lab complete.'); if (!done) { done = true; api.done(); } } else { b.classList.add('is-wrong'); L.fb(fb, 'bad', '✗ Look at what the ROB does at the commit stage.'); } });
          ch.appendChild(b);
        });
      } else if (cyc < tl.end) qbox.innerHTML = '<p class="l7-hint">Step to the end. Watch I3 and I5 overtake the slow load/multiply chain – and the WAW on r2 disappear through renaming.</p>';
    }
    draw();
  }

  function tFrame(k) {
    var o = '', st = ['Queue', 'Rename', 'Reservation stations', 'Functional units', 'Reorder buffer', 'Commit'];
    st.forEach(function (s, i) { var x = 6 + i * 99; o += R(x, 50, 92, 46, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(x + 46, 78, s, 't-ink t-b t-sm'); if (i < 5) o += P('M' + (x + 92) + ' 73H' + (x + 99), 'w'); });
    o += T(300, 26, ['Instructions wait in program order', 'Each destination gets a new physical register; WAR/WAW vanish', 'Instructions wait here until their operands are ready (Tomasulo)', 'Ready instructions execute – in any order', 'Results are kept with their program position', 'The oldest finished instructions update the architectural state, in order'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'OoO pipeline');
  }

  L.module({
    n: 6,
    lead: 'Out-of-order processors execute instructions as soon as their operands are ready instead of in program order – then put everything back in order before anyone can notice. Follow Tomasulo\'s idea, register renaming and the reorder buffer cycle by cycle.',
    tags: ['in-order vs OoO', 'RAW / WAR / WAW', 'register renaming', 'reservation stations', 'Tomasulo', 'reorder buffer', 'dynamic scheduling', 'commit', 'precise exceptions'],
    sections: [
      {
        id: 'st-ooo', type: 'steps', title: 'Animation: the out-of-order pipeline', nav: 'OoO pipeline',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['Fetched instructions wait in the queue.', 'Renaming removes false dependences.', 'Reservation stations hold instructions until operands arrive on the common data bus.', 'Execution happens out of order.', 'The ROB remembers program order.', 'Commit retires instructions in order – precise state.'][k], svg: tFrame(k) }; })
      },
      {
        id: 'c-tom', type: 'concept', title: 'Tomasulo, the ROB and precise exceptions', nav: 'Tomasulo & ROB',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Tomasulo\'s algorithm</h4><p>Reservation stations capture operand values or the tag of the instruction that will produce them. When a result is broadcast on the common data bus, every waiting station with that tag grabs it. Renaming is built in.</p></div><div class="l7-box cu"><h4>Reorder buffer (ROB)</h4><p>A circular queue in program order. Instructions enter at rename, are marked done when they finish, and leave at the head in order. Exceptions and mispredictions discard everything younger – <b>precise exceptions</b>.</p></div></div>'
      },
      { id: 'w-ooo', type: 'widget', title: 'Tomasulo / OoO simulator', nav: 'OoO simulator', intro: 'Step through the six instructions and watch where each one is every cycle. Then answer the question.', build: oooLab },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: OoO insights', nav: 'Reveal',
        items: [
          { q: 'What happens to I5\'s write to r2 if I2 (also writing r2) is still executing?', a: 'Nothing bad: they write different physical registers; later readers of r2 get I5\'s register.' },
          { q: 'Why is the ROB size important?', a: 'It limits how many instructions can be in flight – how far the core can look past a slow load.' },
          { q: 'What is a precise exception?', a: 'All instructions before the faulting one have completed, none after it have changed state – so software can handle it and resume.' },
          { q: 'Why is OoO power-hungry?', a: 'Large associative structures (RS wakeup, ROB, rename) are searched every cycle.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: which structure?', nav: 'Drag & drop',
        bins: ['Rename table', 'Reservation station', 'Reorder buffer'],
        items: [['maps r2 to physical register P5', 0], ['waits for an operand tag on the CDB', 1], ['keeps instructions in program order', 2], ['retires the oldest finished instruction', 2], ['holds a ready instruction until a unit is free', 1]]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'OoO processors commit…', o: ['in program order', 'out of order', 'randomly', 'never'], a: 0, w: '' },
          { q: 'Reservation stations hold…', o: ['instructions waiting for operands', 'cache lines', 'branch targets', 'committed state'], a: 0, w: '' },
          { q: 'Precise exceptions are provided by…', o: ['the reorder buffer', 'the BTB', 'the cache', 'the ALU'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A load misses in all caches (300 cycles). The ROB has 64 entries.', q: 'What eventually happens?', o: [{ t: 'The ROB fills with younger instructions behind the load and the core stalls until it returns', ok: true, w: 'In-order commit means the load blocks the head.' }, { t: 'Younger instructions commit first', ok: false, w: 'Never – commit is in order.' }, { t: 'The load is skipped', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Out-of-order execution executes instructions…', o: ['when their operands are ready', 'strictly in program order', 'only after commit', 'randomly'], a: 0, w: '' },
      { d: 'Easy', q: 'The CDB in Tomasulo is…', o: ['the common data bus that broadcasts results', 'a cache', 'a predictor', 'a clock'], a: 0, w: '' },
      { d: 'Easy', q: 'WAR and WAW are removed by…', o: ['register renaming', 'forwarding', 'caching', 'stalling'], a: 0, w: '' },
      { d: 'Medium', q: 'An instruction is marked done in the ROB when…', o: ['it finishes execution', 'it is fetched', 'it is renamed', 'it is predicted'], a: 0, w: '' },
      { d: 'Medium', q: 'Commit width 2 means…', o: ['up to 2 instructions retire per cycle', '2 units', '2 stages', '2 registers'], a: 0, w: '' },
      { d: 'Medium', q: 'A faulting instruction in the ROB causes…', o: ['younger instructions to be discarded', 'older instructions to be discarded', 'nothing', 'a cache flush'], a: 0, w: '' },
      { d: 'Medium', q: 'A larger ROB allows…', o: ['more instructions in flight', 'fewer registers', 'smaller caches', 'no renaming'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can I3 execute before I2 in the simulator?', o: ['it does not depend on I2\'s result', 'it is older', 'I2 was skipped', 'the ROB was empty'], a: 0, w: '' },
      { d: 'Hard', q: 'After renaming, readers of r2 after I5 get…', o: ['I5\'s physical register', 'I2\'s physical register', 'the old architectural r2', 'zero'], a: 0, w: '' },
      { d: 'Hard', q: 'A long-latency load at the ROB head causes…', o: ['commit to stall', 'out-of-order commit', 'a misprediction', 'renaming to stop forever'], a: 0, w: '' }
    ]
  });
})();
