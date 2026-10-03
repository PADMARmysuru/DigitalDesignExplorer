/* Level 7 · Module 2 – VLSI Arithmetic Circuit Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Prefix networks (verified: every bit receives the full group 0..i) ---------- */
  function prefixOps(N, type) {
    var Lg = Math.log2(N), st = [], k, i, o, d;
    if (type === 'ks') for (k = 0; k < Lg; k++) { o = []; for (i = (1 << k); i < N; i++) o.push([i, i - (1 << k)]); st.push(o); }
    if (type === 'sk') for (k = 0; k < Lg; k++) { o = []; for (i = 0; i < N; i++) if ((i >> k) & 1) o.push([i, ((i >> k) << k) - 1]); st.push(o); }
    if (type === 'bk') {
      for (d = 0; d < Lg; d++) { o = []; for (i = 0; i < N; i++) if ((i + 1) % (1 << (d + 1)) === 0) o.push([i, i - (1 << d)]); st.push(o); }
      for (d = Lg - 2; d >= 0; d--) { o = []; for (i = 3 * (1 << d) - 1; i < N; i += 1 << (d + 1)) o.push([i, i - (1 << d)]); st.push(o); }
    }
    return st;
  }
  /* ---------- Dadda reduction (8×8 → 35 FA, 7 HA, 4 stages) ---------- */
  function dadda(N) {
    var h = [], c; for (c = 0; c < 2 * N - 1; c++) h.push(Math.min(c + 1, 2 * N - 1 - c));
    var seq = [2]; while (true) { var nx = Math.floor(seq[seq.length - 1] * 1.5); if (nx >= N) break; seq.push(nx); }
    seq.reverse();
    var FA = 0, HA = 0, hist = [h.slice()];
    seq.forEach(function (dd) {
      var nh = [], cin = 0;
      for (c = 0; c < h.length || cin; c++) {
        var x = (h[c] || 0) + cin, fa = 0, ha = 0;
        while (x > dd) { if (x - dd >= 2) { fa++; x -= 2; } else { ha++; x -= 1; } }
        nh[c] = x; cin = fa + ha; FA += fa; HA += ha;
      }
      h = nh; hist.push(h.slice());
    });
    return { seq: seq, FA: FA, HA: HA, hist: hist };
  }
  function wallaceStages(N) { var hh = N, s = 0; while (hh > 2) { hh = 2 * Math.floor(hh / 3) + (hh % 3); s++; } return s; }

  /* ---------- Widget: carry lab (8-bit generate / propagate) ---------- */
  function carryLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Carry lab · generate, propagate and the real carry chain</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var N = 8, n = 0, cin = 0;
    var A = L.bits(body, 'A', N, 0x5B, upd), B = L.bits(body, 'B', N, 0x25, upd);
    var r = L.h('div', 'l7-row'); body.appendChild(r);
    var cb = L.btn('Cin = 0', '', function () { cin ^= 1; cb.textContent = 'Cin = ' + cin; cb.classList.toggle('is-on', !!cin); upd(); }); r.appendChild(cb);
    r.appendChild(L.btn('Worst case: A=0xFF, B=0x01', 'ghost', function () { A.set(0xFF); B.set(0x01); upd(); }));
    r.appendChild(L.btn('Random', 'ghost', function () { A.set(Math.random() * 256 | 0); B.set(Math.random() * 256 | 0); upd(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function upd() {
      n++; if (n >= 5) api.done();
      var a = A.get(), b = B.get(), c = [cin], g = [], p = [], s = [], chain = 0, run = 0, i;
      for (i = 0; i < N; i++) {
        var ai = (a >> i) & 1, bi = (b >> i) & 1;
        g[i] = ai & bi; p[i] = ai ^ bi; s[i] = p[i] ^ c[i]; c[i + 1] = g[i] | (p[i] & c[i]);
        if (p[i] && c[i]) { run++; chain = Math.max(chain, run); } else run = 0;
      }
      var W = 640, o = '', x0 = 70, dx = 68;
      ['A', 'B', 'g', 'p', 'c', 'S'].forEach(function (lbl, row) { o += T(30, 34 + row * 30, lbl, 't-dim t-b', 'middle'); });
      for (i = 0; i < N; i++) {
        var x = x0 + (N - 1 - i) * dx;
        o += T(x, 14, 'bit ' + i, 't-dim t-sm');
        o += T(x, 34, (a >> i) & 1, 't-ink') + T(x, 64, (b >> i) & 1, 't-ink');
        o += R(x - 14, 78, 28, 22, g[i] ? 'box-cu' : 'box', 5) + T(x, 94, g[i], g[i] ? 't-cu t-b' : 't-dim');
        o += R(x - 14, 108, 28, 22, p[i] ? 'box-vio' : 'box', 5) + T(x, 124, p[i], p[i] ? 't-vio t-b' : 't-dim');
        o += R(x - 14, 138, 28, 22, c[i] ? 'box-on' : 'box', 5) + T(x, 154, c[i], c[i] ? 't-sig t-b' : 't-dim');
        o += T(x, 184, s[i], 't-ink t-b t-lg');
        if (c[i + 1] && i < N - 1) o += P('M' + (x - 16) + ' 149H' + (x - dx + 16), 'w-on flow');
      }
      o += T(x0 - 40, 154, 'c', 't-dim');
      pic.innerHTML = S(W, 196, o, 'Generate, propagate and carry for each bit');
      var sum = (a + b + cin) & 0xFF, cout = c[N];
      out.innerHTML = '<span class="k">A + B + Cin</span> = ' + a + ' + ' + b + ' + ' + cin + ' = <span class="v">' + (a + b + cin) + '</span>' +
        ' → S = ' + L.bin(sum, 8) + ', Cout = <span class="c">' + cout + '</span><br><span class="k">g<sub>i</sub>=a<sub>i</sub>·b<sub>i</sub> (orange)  p<sub>i</sub>=a<sub>i</sub>⊕b<sub>i</sub> (violet)  c<sub>i+1</sub>=g<sub>i</sub>+p<sub>i</sub>·c<sub>i</sub></span>' +
        '<br><span class="k">Longest carry ripple through propagate bits:</span> <span class="v">' + chain + '</span> bit' + (chain === 1 ? '' : 's') + ' (it can be as long as 8 – try the worst case, then set Cin = 1)';
    }
    upd();
  }

  /* ---------- Widget: adder architecture delay explorer ---------- */
  function adderDelay(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Architecture explorer · unit-gate-delay model</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var N = 32, moved = 0;
    L.select(body, 'Width N', [['8', '8 bits'], ['16', '16 bits'], ['32', '32 bits'], ['64', '64 bits'], ['128', '128 bits']], '32', function (v) { N = +v; moved++; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var note = L.h('div', 'l7-fb'); body.appendChild(note);
    function upd() {
      if (moved >= 2) api.done();
      var lg = Math.log2(N);
      var kSkip = Math.max(2, Math.round(Math.sqrt(N / 4))), kSel = Math.max(2, Math.round(Math.sqrt(N / 2)));
      var rows = [
        ['Ripple carry', 2 * N, 'O(N)', 'N full adders'],
        ['Carry skip (k=' + kSkip + ')', 4 * kSkip + N / kSkip, 'O(√N)', 'skip mux per block'],
        ['Carry select (k=' + kSel + ')', 2 * kSel + N / kSel, 'O(√N)', '≈2× adder hardware'],
        ['Carry look-ahead (4-bit groups)', 2 + 4 * Math.ceil(Math.log(N) / Math.log(4)), 'O(log N)', 'G/P look-ahead units'],
        ['Prefix – Kogge–Stone', 2 * lg + 2, 'O(log N)', 'N·log₂N − N + 1 cells']
      ];
      var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; })), o = '', W = 660;
      rows.forEach(function (r, i) {
        var y = 16 + i * 44, w = Math.max(6, 380 * r[1] / mx);
        o += T(8, y + 18, r[0], 't-ink', 'start') + T(8, y + 33, r[2] + ' · ' + r[3], 't-dim t-sm', 'start');
        o += '<rect x="250" y="' + (y + 6) + '" width="' + w.toFixed(1) + '" height="20" rx="4" fill="' + (i === 0 ? 'var(--l7-bad)' : i === 4 ? 'var(--l7-sig)' : 'var(--l7-cu)') + '" opacity=".85"/>';
        o += T(258 + w, y + 21, Math.round(r[1]) + ' τ', 't-ink t-b', 'start');
      });
      pic.innerHTML = S(W, 240, o, 'Adder delay comparison');
      L.fb(note, 'info', 'Approximate critical-path delay in unit gate delays τ for N = ' + N + '. Ripple grows linearly; skip and select grow with √N (block size k chosen near its optimum); look-ahead and prefix adders grow with log N. The exact numbers depend on the circuit – compare the <b>trend</b>.');
    }
    upd();
  }

  /* ---------- Widget: prefix network visualiser ---------- */
  function prefixLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Prefix network visualiser · black cells compute (G,P) group terms</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var N = 8, type = 'ks', seen = {};
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var tb = [['ks', 'Kogge–Stone'], ['sk', 'Sklansky'], ['bk', 'Brent–Kung']].map(function (t) {
      var b = L.btn(t[1], t[0] === type ? 'is-on' : '', function () { type = t[0]; tb.forEach(function (x) { x.classList.toggle('is-on', x === b); }); upd(); });
      row.appendChild(b); return b;
    });
    L.select(row, 'Bits', [['8', '8'], ['16', '16']], '8', function (v) { N = +v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var info = L.h('div', 'l7-readout'); body.appendChild(info);
    function upd() {
      seen[type] = 1; if (Object.keys(seen).length === 3) api.done();
      var st = prefixOps(N, type), dx = N === 8 ? 64 : 36, W = 40 + dx * N, dy = 54, H = 86 + dy * st.length, o = '';
      var X = function (i) { return 30 + (N - 1 - i) * dx; };
      var fan = {}, cells = 0;
      for (var i = 0; i < N; i++) { o += T(X(i), 16, i, 't-dim t-sm'); o += R(X(i) - 9, 24, 18, 14, 'box-vio', 3); }
      st.forEach(function (ops, k) {
        var y0 = 38 + k * dy, y1 = y0 + dy, busy = {};
        ops.forEach(function (op) { busy[op[0]] = 1; fan[op[1] + '_' + k] = (fan[op[1] + '_' + k] || 0) + 1; });
        for (var i2 = 0; i2 < N; i2++) o += P('M' + X(i2) + ' ' + y0 + 'V' + y1, 'w-thin');
        ops.forEach(function (op) { cells++; o += P('M' + X(op[1]) + ' ' + (y0 + 6) + 'L' + X(op[0]) + ' ' + (y1 - 8), 'w-cu'); o += L.dot(X(op[0]), y1 - 6, 7, 'dot-on'); });
      });
      var yE = 38 + st.length * dy;
      for (var j = 0; j < N; j++) o += P('M' + X(j) + ' ' + yE + 'V' + (yE + 16), 'w') + T(X(j), yE + 30, 'c' + (j + 1), 't-sig t-sm');
      o += T(W / 2, H - 4, 'MSB ←   bit position   → LSB', 't-dim t-sm');
      pic.innerHTML = S(W, H, o, 'Prefix adder network');
      var mf = 0; Object.keys(fan).forEach(function (k) { mf = Math.max(mf, fan[k]); });
      var desc = { ks: 'Minimum depth (log₂N) and fanout of 2, but the most cells and long parallel wires – very fast, wire-heavy.', sk: 'Minimum depth (log₂N) and few cells, but fanout doubles at every stage – drivers must be sized up.', bk: 'Fewest cells and fanout 2, but about 2·log₂N − 1 stages – compact and power-friendly, slower.' }[type];
      info.innerHTML = '<span class="k">Stages</span> <span class="v">' + st.length + '</span> · <span class="k">Black cells</span> <span class="c">' + cells + '</span> · <span class="k">Max fanout of a node</span> <span class="v">' + (mf + 1) + '</span><br>' + desc;
    }
    upd();
  }

  /* ---------- Widget: multiplier lab ---------- */
  function multLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Multiplier lab · partial products and tree reduction</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var n = 0;
    var A = L.bits(body, 'Multiplicand A', 4, 13, upd), B = L.bits(body, 'Multiplier B', 4, 11, upd);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var sel = L.h('div', ''); body.appendChild(sel);
    var M = 8;
    L.select(sel, 'Tree size N×N', [['4', '4×4'], ['8', '8×8'], ['16', '16×16'], ['32', '32×32']], '8', function (v) { M = +v; n++; tree(); });
    var tr = L.h('div', 'l7-readout'); body.appendChild(tr);
    function upd() {
      n++; if (n >= 4) api.done();
      var a = A.get(), b = B.get(), o = '', dx = 46, X = function (c) { return 30 + (7 - c) * dx; };
      for (var c = 0; c < 8; c++) o += T(X(c), 14, 'w' + c, 't-dim t-sm');
      for (var j = 0; j < 4; j++) {
        var bj = (b >> j) & 1;
        o += T(X(7) - 26, 44 + j * 30, 'b' + j + '=' + bj, bj ? 't-sig t-sm' : 't-dim t-sm', 'end');
        for (var i = 0; i < 4; i++) { var v = ((a >> i) & 1) & bj; o += R(X(i + j) - 12, 28 + j * 30, 24, 22, v ? 'box-on' : 'box', 5) + T(X(i + j), 44 + j * 30, v, v ? 't-sig t-b' : 't-dim'); }
      }
      o += P('M' + (X(7) - 20) + ' 150H' + (X(0) + 20), 'w');
      var pr = a * b;
      for (var k = 0; k < 8; k++) o += T(X(k), 172, (pr >> k) & 1, 't-cu t-b t-lg');
      pic.innerHTML = S(400, 186, o, '4 by 4 partial product array');
      out.innerHTML = '<span class="k">A × B</span> = ' + a + ' × ' + b + ' = <span class="v">' + pr + '</span> = ' + L.bin(pr, 8) + '<br><span class="k">Partial product bit</span> pp<sub>ij</sub> = a<sub>i</sub>·b<sub>j</sub> (an AND gate) – 4×4 = 16 AND gates, shifted by j columns';
    }
    function tree() {
      var d = dadda(M), w = wallaceStages(M);
      tr.innerHTML = '<span class="k">' + M + '×' + M + ':</span> ' + M * M + ' partial-product bits, tallest column ' + M +
        '<br><span class="k">Dadda heights</span> ' + M + ' → ' + d.seq.join(' → ') + ' · <span class="v">' + d.seq.length + ' stages</span>, <span class="c">' + d.FA + ' FA + ' + d.HA + ' HA</span>, then a ' + (2 * M - 2) + '-bit carry-propagate adder' +
        '<br><span class="k">Wallace</span> also <span class="v">' + w + ' stages</span> (reduces as early as possible, using more half adders and a shorter final adder)' +
        '<br><span class="k">Array multiplier</span> ≈ ' + (M - 1) + ' rows of adders in series → delay grows ~linearly with N';
    }
    upd(); tree();
  }

  /* ---------- Widget: subtractor & comparator ---------- */
  function subLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Subtractor &amp; comparator · A − B = A + B̄ + 1</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var n = 0;
    var A = L.bits(body, 'A', 8, 100, upd), B = L.bits(body, 'B', 8, 37, upd);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var outs = {};
    function upd() {
      var a = A.get(), b = B.get(), nb = (~b) & 0xFF, raw = a + nb + 1, r = raw & 0xFF, co = raw >> 8;
      var rel = a > b ? 'A > B' : a < b ? 'A < B' : 'A = B'; outs[rel] = 1; n++;
      if (Object.keys(outs).length === 3) api.done();
      out.innerHTML = '<span class="k">A</span>       ' + L.bin(a, 8) + '  (' + a + ')<br><span class="k">B̄</span>       ' + L.bin(nb, 8) + '  (invert B)<br><span class="k">+ 1</span>     carry-in = 1<br>' +
        '<span class="k">Result</span>  <span class="v">' + L.bin(r, 8) + '</span>  Cout = <span class="c">' + co + '</span>  Z = ' + (r === 0 ? 1 : 0) +
        '<br><span class="k">Unsigned compare:</span> Cout = 1 → A ≥ B (no borrow) · Z = 1 → A = B';
      L.fb(fb, 'info', 'Result: <b>' + rel + '</b>. ' + (co ? 'No borrow (Cout = 1)' : 'Borrow (Cout = 0)') + (r === 0 ? ' and the result is zero, so the numbers are equal.' : '.') + ' Make A > B, A < B and A = B to complete this activity.');
    }
    upd();
  }

  function rippleFrame(k) {
    // 4-bit ripple: 0111 + 0001; carry reaches bit k
    var o = '', a = [1, 1, 1, 0], b = [1, 0, 0, 0], c = [0, 1, 1, 1, 0], s = [0, 0, 0, 1];
    for (var i = 0; i < 4; i++) {
      var x = 470 - i * 140, act = i < k;
      o += R(x - 45, 50, 90, 60, i === k - 1 ? 'box-on' : act ? 'box-ok' : 'box', 8) + T(x, 76, 'FA' + i, 't-ink t-b') + T(x, 96, 'a=' + a[i] + ' b=' + b[i], 't-dim t-sm');
      o += P('M' + x + ' 110V140', act ? 'w-on' : 'w') + T(x, 158, act ? 's' + i + '=' + s[i] : 's' + i + '=?', act ? 't-sig t-b' : 't-dim');
      o += P('M' + (x - 45) + ' 80H' + (x - 95), act ? 'w-on' : 'w');
      o += T(x - 70, 72, 'c' + (i + 1) + '=' + (act ? c[i + 1] : '?'), act ? 't-cu t-sm' : 't-dim t-sm');
    }
    o += P('M560 80H515', 'w-on') + T(565, 84, 'c0=0', 't-dim t-sm', 'start');
    o += T(300, 24, 'A = 0111, B = 0001  →  carry ripples one stage per step', 't-ink');
    return S(620, 175, o, 'Ripple carry adder step ' + k);
  }

  L.module({
    n: 2,
    lead: 'An adder sits on the critical path of almost every chip. Compare how ripple, skip, select, look-ahead and prefix adders attack the carry problem, then build up to fast multipliers with Wallace and Dadda trees.',
    tags: ['generate / propagate', 'RCA', 'CLA', 'carry select', 'carry skip', 'prefix adders', 'Wallace', 'Dadda'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-add', type: 'concept', title: 'The carry problem and generate / propagate', nav: 'Carry problem',
        html: '<p>Every adder bit computes a sum and a carry. The sum of bit i needs the carry into bit i, which depends on <i>all</i> lower bits – so a wide adder is limited by how fast carries can travel. Every fast adder starts by computing two signals per bit:</p>' +
          '<div class="l7-eq">g<sub>i</sub> = a<sub>i</sub>·b<sub>i</sub> (generate)   p<sub>i</sub> = a<sub>i</sub> ⊕ b<sub>i</sub> (propagate)   c<sub>i+1</sub> = g<sub>i</sub> + p<sub>i</sub>·c<sub>i</sub>   s<sub>i</sub> = p<sub>i</sub> ⊕ c<sub>i</sub></div>' +
          '<p>A bit <b>generates</b> a carry regardless of the incoming carry when both inputs are 1; it <b>propagates</b> (passes on) an incoming carry when exactly one input is 1. The architectures in this module differ only in how they compute the carries from g and p.</p>'
      },
      { id: 'w-carry', type: 'widget', title: 'Carry lab: see generate, propagate and the carry chain', nav: 'Carry lab', intro: 'Toggle bits of A and B. Orange = generate, violet = propagate, teal = carry. Try the worst case, where a carry must ripple through every bit.', build: carryLab },
      {
        id: 'st-ripple', type: 'steps', title: 'Animation: a carry rippling through a 4-bit RCA', nav: 'Ripple animation',
        frames: [
          { t: 'A <b>ripple-carry adder (RCA)</b> chains N full adders. Each FA must wait for the carry from the previous stage.', svg: rippleFrame(0) },
          { t: 'FA0: 1 + 1 + 0 → s0 = 0, c1 = 1 (generate).', svg: rippleFrame(1) },
          { t: 'FA1: 1 + 0 + 1 → s1 = 0, c2 = 1 (propagate).', svg: rippleFrame(2) },
          { t: 'FA2: 1 + 0 + 1 → s2 = 0, c3 = 1 (propagate).', svg: rippleFrame(3) },
          { t: 'FA3: 0 + 0 + 1 → s3 = 1. Result 1000 = 8 after <b>four</b> carry delays. Delay ∝ N: simple and small, but too slow for wide words.', svg: rippleFrame(4) }
        ]
      },
      {
        id: 'c-fast', type: 'concept', title: 'Look-ahead, select, skip and prefix adders', nav: 'Fast adders',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Carry look-ahead (CLA)</h4><p>Expand the carry recursion so every carry is computed directly from g, p and c<sub>0</sub>:</p><div class="l7-eq">c<sub>2</sub> = g<sub>1</sub> + p<sub>1</sub>g<sub>0</sub> + p<sub>1</sub>p<sub>0</sub>c<sub>0</sub></div><p>Groups of 4 bits produce a group generate G and group propagate P; a second-level look-ahead unit combines groups. Delay ≈ O(log N).</p></div>' +
          '<div class="l7-box cu"><h4>Carry select</h4><p>Each block computes its sum twice, assuming carry-in 0 and 1, in parallel. When the real carry arrives, a multiplexer selects the right result. Trades about 2× hardware for speed; delay ≈ O(√N).</p></div>' +
          '<div class="l7-box vio"><h4>Carry skip (bypass)</h4><p>If every bit of a block propagates (P = p<sub>i</sub>·…·p<sub>j</sub> = 1), the block\'s carry-in is passed straight to its carry-out through a skip multiplexer instead of rippling. Small extra hardware; delay ≈ O(√N).</p></div>' +
          '<div class="l7-box"><h4>Prefix adders</h4><p>Treat carry computation as a parallel prefix problem using the associative operator (G,P)∘(G′,P′) = (G + P·G′, P·P′). Kogge–Stone, Sklansky and Brent–Kung are different trees for the same job, trading depth, cell count and fanout.</p></div></div>'
      },
      { id: 'w-delay', type: 'widget', title: 'Architecture explorer: how delay scales with width', nav: 'Delay explorer', intro: 'Change the width at least twice and compare the growth of each architecture.', build: adderDelay },
      { id: 'w-prefix', type: 'widget', title: 'Prefix network visualiser', nav: 'Prefix trees', intro: 'Compare all three prefix networks. Each black dot combines the group (G,P) from its own column with the one from the column its copper line comes from.', build: prefixLab },
      {
        id: 'c-subcmp', type: 'concept', title: 'Subtractors and comparators', nav: 'Sub & compare',
        html: '<p>In two\'s complement, <b>A − B = A + B̄ + 1</b>: invert B and set the adder\'s carry-in to 1. A single adder with XOR gates on the B inputs (controlled by a SUB signal that also drives c<sub>0</sub>) is an <b>adder/subtractor</b>. The carry-out of the subtraction gives an unsigned comparison: C<sub>out</sub> = 1 means no borrow, so A ≥ B.</p>' +
          '<p>Dedicated <b>comparators</b> are often cheaper than a full subtractor. Equality is an XNOR per bit followed by an AND tree (A = B when all bits match). A magnitude comparator scans from the MSB: A > B at the first bit position, from the top, where a<sub>i</sub> = 1 and b<sub>i</sub> = 0 while all higher bits are equal. This is again a prefix-style computation and can be built as a tree for speed.</p>'
      },
      { id: 'w-sub', type: 'widget', title: 'Subtractor & comparator lab', nav: 'Sub lab', intro: 'Set A and B so that you see all three relations: A > B, A < B and A = B.', build: subLab },
      {
        id: 'c-mult', type: 'concept', title: 'Multiplier architectures: array, Wallace and Dadda', nav: 'Multipliers',
        html: '<p>An N×N multiplication creates N rows of partial products (pp<sub>ij</sub> = a<sub>i</sub>·b<sub>j</sub>, N² AND gates) that must be added. Architectures differ in how they add them:</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Array</h4><p>A regular grid of full adders, one row per partial product. Easy to lay out; delay grows linearly with N.</p></div>' +
          '<div class="l7-box sig"><h4>Wallace tree</h4><p>Uses full adders as 3:2 counters to reduce every group of three rows to two as early as possible. O(log N) stages, then one fast carry-propagate adder.</p></div>' +
          '<div class="l7-box cu"><h4>Dadda tree</h4><p>Reduces column heights only as much as needed to reach the next target height (…, 13, 9, 6, 4, 3, 2). Same number of stages as Wallace, fewer counters, a slightly wider final adder.</p></div></div>' +
          '<p style="margin-top:12px">Further speed-ups such as Booth recoding (halving the number of partial products) build on the same ideas.</p>'
      },
      { id: 'w-mult', type: 'widget', title: 'Multiplier lab: partial products and reduction trees', nav: 'Multiplier lab', intro: 'Change A and B a few times to see the partial-product array, then change the tree size to compare Dadda and Wallace.', build: multLab },
      {
        id: 'rv-arith', type: 'reveal', title: 'Click to reveal: arithmetic design insights', nav: 'Reveal',
        items: [
          { q: 'Why is p<sub>i</sub> sometimes defined as a<sub>i</sub> + b<sub>i</sub> (OR) instead of XOR?', a: 'For carry computation either works: when both bits are 1 the generate term already produces the carry. OR is cheaper and faster for the carry tree; the XOR version is still needed for the sum.' },
          { q: 'What limits Kogge–Stone in real chips?', a: 'Its many long, parallel wires. Wire capacitance and routing congestion cost area and power, so designers often use hybrids (e.g. sparse trees) that trade a little depth for far fewer wires.' },
          { q: 'Why does carry select roughly double area?', a: 'Each block (except the first) contains two adders – one for carry-in 0 and one for carry-in 1 – plus multiplexers.' },
          { q: 'Why is the worst case of a carry-skip adder at the ends?', a: 'The carry must ripple through the first block (to generate), skip through the middle blocks, then ripple through the last block. Making the first and last blocks smaller improves it.' },
          { q: 'What is a 3:2 counter?', a: 'A full adder seen as a compressor: three bits of the same weight in, a sum bit of the same weight and a carry bit of the next weight out.' },
          { q: 'Why add a fast CPA at the end of a Wallace tree?', a: 'The tree leaves two rows (sum and carry). Adding them needs a full carry-propagate adder, often a prefix adder, which is now the slowest part.' }
        ]
      },
      {
        id: 'dd-arith', type: 'drag', title: 'Drag & drop: match the feature to the architecture', nav: 'Drag & drop',
        bins: ['Ripple carry', 'Carry select', 'Carry skip', 'Prefix adder', 'Multiplier tree'],
        items: [['Delay grows linearly with N', 0], ['Smallest adder area', 0], ['Computes each block twice', 1], ['Multiplexer chooses the precomputed sum', 1], ['Bypasses a block when all bits propagate', 2], ['Block propagate P controls a mux', 2], ['Kogge–Stone / Brent–Kung', 3], ['Associative (G,P) operator', 3], ['3:2 counters reduce rows', 4], ['Column heights 6 → 4 → 3 → 2', 4]]
      },
      { part: 'Practice' },
      {
        id: 'calc2', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A 32-bit ripple-carry adder has a carry delay of 45 ps per full adder. Estimate the worst-case carry delay (in ns).', a: 1.44, u: 'ns', h: 'The carry passes through all 32 full adders.', s: '32 × 45 ps = 1440 ps = <b>1.44 ns</b>.' },
          { q: 'A bit has a<sub>i</sub> = 1, b<sub>i</sub> = 0 and incoming carry c<sub>i</sub> = 1. What is its carry-out c<sub>i+1</sub>?', a: 1, tol: 0, abs: 0.01, h: 'g = a·b, p = a⊕b, c<sub>i+1</sub> = g + p·c.', s: 'g = 0, p = 1 → c<sub>i+1</sub> = 0 + 1·1 = <b>1</b>. The bit propagates the incoming carry without generating one.' },
          { q: 'Given g<sub>1</sub> = 0, p<sub>1</sub> = 1, g<sub>0</sub> = 1, p<sub>0</sub> = 0 and c<sub>0</sub> = 0, compute c<sub>2</sub> using look-ahead.', a: 1, tol: 0, abs: 0.01, h: 'c<sub>2</sub> = g<sub>1</sub> + p<sub>1</sub>g<sub>0</sub> + p<sub>1</sub>p<sub>0</sub>c<sub>0</sub>', s: 'c<sub>2</sub> = 0 + 1·1 + 1·0·0 = <b>1</b>.' },
          { q: 'How many partial-product bits (AND gates) does a 12 × 12 unsigned multiplier generate?', a: 144, tol: 0, abs: 0.01, h: 'One AND per pair (a<sub>i</sub>, b<sub>j</sub>).', s: '12 × 12 = <b>144</b>.' },
          { q: 'How many black (G,P) cells does a 16-bit Kogge–Stone network have? (Use N·log₂N − N + 1.)', a: 49, tol: 0, abs: 0.01, h: 'N = 16, log₂N = 4.', s: '16 × 4 − 16 + 1 = <b>49</b>. Check it in the prefix visualiser.' },
          { q: 'How many reduction stages does a Dadda tree need for a 16 × 16 multiplier? (target heights 13, 9, 6, 4, 3, 2)', a: 6, tol: 0, abs: 0.01, h: 'Count the target heights below 16.', s: '16 → 13 → 9 → 6 → 4 → 3 → 2: <b>6 stages</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which signal tells you that bit i will pass on an incoming carry?', o: ['generate g<sub>i</sub>', 'propagate p<sub>i</sub>', 'sum s<sub>i</sub>', 'carry-out c<sub>i+1</sub>'], a: 1, w: 'p<sub>i</sub> = a<sub>i</sub> ⊕ b<sub>i</sub>.' },
          { q: 'Which prefix adder has the minimum number of cells?', o: ['Kogge–Stone', 'Sklansky', 'Brent–Kung', 'All are equal'], a: 2, w: 'Brent–Kung: 2N − 2 − log₂N cells, at the cost of more stages.' },
          { q: 'Subtraction A − B in two\'s complement uses…', o: ['A + B', 'A + B̄', 'A + B̄ + 1', 'Ā + B + 1'], a: 2, w: 'Invert B and set carry-in = 1.' },
          { q: 'Compared with a Wallace tree, a Dadda tree typically uses…', o: ['more stages', 'fewer counters and a wider final adder', 'no full adders', 'Booth recoding'], a: 1, w: 'Dadda reduces only as much as needed per stage.' }
        ]
      },
      {
        id: 'short2', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain how a carry-select adder achieves its speed and what it costs.', k: ['both|two|0 and 1', 'parallel|precompute|in advance', 'mux|multiplexer|select', 'area|hardware|duplicate'], m: 'Each block computes two results in parallel, one assuming carry-in 0 and one assuming carry-in 1. When the actual carry arrives, a multiplexer selects the correct sum and carry-out, so the carry only passes through one mux per block instead of rippling through every bit. The cost is roughly double the adder hardware plus the multiplexers, and more power.' },
          { q: 'Why are prefix adders described as O(log N), and what trade-offs separate Kogge–Stone from Brent–Kung?', k: ['associative|prefix', 'log|tree|stages', 'wire|fanout|cells', 'area|power|depth'], m: 'The (G,P) combining operator is associative, so group carries can be computed with a binary tree of depth log₂N instead of a linear chain. Kogge–Stone reaches minimum depth with fanout 2 but uses many cells and long wires; Brent–Kung uses the fewest cells and short wiring but needs about twice the depth.' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A 64-bit adder in a battery-powered sensor chip runs at a low clock frequency. Area and energy matter far more than speed.', q: 'Which adder would you start with?', o: [{ t: 'Kogge–Stone prefix adder', ok: false, w: 'Fastest, but large and wire-heavy – wasted when speed is not needed.' }, { t: 'Ripple-carry or a small carry-skip adder', ok: true, w: 'Correct: the smallest, lowest-energy designs meet a relaxed timing target.' }, { t: 'Carry-select adder', ok: false, w: 'Roughly doubles the hardware for speed you do not need.' }] },
          { s: 'Your 16 × 16 multiplier is too slow. Profiling shows most delay is in adding the partial products with a row-by-row array.', q: 'What change addresses the bottleneck?', o: [{ t: 'Replace the array with a Wallace or Dadda tree plus a fast final adder', ok: true, w: 'Right: the tree reduces 16 rows in about 6 stages instead of ~15 rows of adders.' }, { t: 'Use a faster ripple adder in each row', ok: false, w: 'The structure is still linear in the number of rows.' }, { t: 'Increase the number of partial products', ok: false, w: 'More partial products make it slower; Booth recoding reduces them.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'The generate signal for bit i is…', o: ['a<sub>i</sub> ⊕ b<sub>i</sub>', 'a<sub>i</sub>·b<sub>i</sub>', 'a<sub>i</sub> + b<sub>i</sub>', 'p<sub>i</sub>·c<sub>i</sub>'], a: 1, w: 'Both inputs 1 → a carry is generated.' },
      { q: 'The carry recurrence is c<sub>i+1</sub> = …', o: ['g<sub>i</sub>·p<sub>i</sub>', 'g<sub>i</sub> + p<sub>i</sub>·c<sub>i</sub>', 'p<sub>i</sub> ⊕ c<sub>i</sub>', 'g<sub>i</sub> ⊕ c<sub>i</sub>'], a: 1, w: 'Generate here, or propagate an incoming carry.' },
      { q: 'The delay of a ripple-carry adder grows as…', o: ['O(1)', 'O(log N)', 'O(√N)', 'O(N)'], a: 3, w: 'The carry passes through every bit.' },
      { q: 'In a carry-skip adder, a block passes its carry-in directly to carry-out when…', o: ['all its bits generate', 'all its bits propagate', 'any bit generates', 'its sum is zero'], a: 1, w: 'Block propagate P = 1 enables the skip.' },
      { q: 'Kogge–Stone prefix adders are characterised by…', o: ['maximum depth, minimum area', 'minimum depth, fanout 2, many wires', 'linear delay', 'high fanout and few cells'], a: 1, w: 'log₂N stages, regular fanout, wire-heavy.' },
      { q: 'Sklansky prefix networks have…', o: ['fanout that grows with each stage', '2·log₂N stages', 'no black cells', 'a carry chain'], a: 0, w: 'Minimum depth and few cells, but high fanout.' },
      { q: 'An adder/subtractor uses XOR gates on B controlled by SUB, and…', o: ['SUB also drives the carry-in', 'SUB drives the sum outputs', 'SUB inverts A', 'no other change'], a: 0, w: 'Carry-in = 1 provides the +1 of two\'s complement.' },
      { q: 'A full adder used in a multiplier tree acts as a…', o: ['2:1 multiplexer', '3:2 counter', '4:2 decoder', 'comparator'], a: 1, w: 'Three equal-weight bits in, sum and carry out.' },
      { q: 'An 8 × 8 Dadda tree needs how many reduction stages?', o: ['2', '3', '4', '8'], a: 2, w: '8 → 6 → 4 → 3 → 2.' },
      { q: 'An equality comparator for two 8-bit numbers can be built from…', o: ['8 XNOR gates and an 8-input AND tree', 'a single full adder', 'an 8:1 multiplexer', 'a barrel shifter'], a: 0, w: 'Equal when every bit pair matches.' }
    ]
  });
})();
