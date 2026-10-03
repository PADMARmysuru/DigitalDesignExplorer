/* Level 9 · Module 5 – RTL Design for Synthesis */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var V = ['✅ Synthesizable', '❌ Not synthesizable', '⚠️ Synthesizes, but unintended hardware or behaviour'];

  /* ---------- Widget: Will this RTL synthesize? ---------- */
  function willItDrill(root, api) {
    L.drill(root, api, {
      bar: '"Will this RTL synthesize?"', label: 'Snippet', fixed: true, next: 'Next snippet →',
      items: [
        { c: 'always_ff @(posedge clk or negedge rst_n)\n  if (!rst_n)  q <= \'0;\n  else if (en) q <= d;', o: V, a: 0, w: 'Clean register with asynchronous reset and enable.' },
        { c: 'always @(posedge clk)\n  q <= #2 d;          // model clock-to-Q', o: V, a: 2, w: 'Synthesis IGNORES # delays (with a warning). The hardware is a plain flip-flop, so simulation and gates can behave differently. Keep delays out of RTL.' },
        { c: 'initial begin\n  count = 4\'d5;        // start value\nend', o: V, a: 1, w: 'ASIC synthesis ignores initial blocks: real flip-flops power up unknown. Use a reset. (Some FPGA tools accept initial values for registers and memories.)' },
        { c: 'always_comb begin\n  p = 1\'b0;\n  for (int i = 0; i < 8; i++)\n    p = p ^ d[i];       // parity\nend', o: V, a: 0, w: 'Constant loop bounds: the loop unrolls into an XOR tree.' },
        { c: 'always_comb begin\n  n = 0; t = x;\n  while (t != 0) begin   // count leading bits\n    t = t >> 1;  n = n + 1;\n  end\nend', o: V, a: 1, w: 'The number of iterations depends on data, so the hardware size cannot be fixed. Rewrite with a constant-bound for-loop.' },
        { c: 'always_comb\n  if (sel) y = a;        // no else', o: V, a: 2, w: 'When sel = 0, y must keep its old value → a LATCH is inferred. Add an else or a default.' },
        { c: 'always_ff @(posedge clk) if (a_wr) r <= a;\nalways_ff @(posedge clk) if (b_wr) r <= b;', o: V, a: 1, w: 'r is driven by two always blocks: multiple drivers. Combine both writes in one block (with a priority).' },
        { c: 'always @(a)              // b missing!\n  y = a & b;', o: V, a: 2, w: 'Synthesis builds the AND gate and ignores the sensitivity list, but simulation only updates y when a changes → simulation/synthesis mismatch. Use always_comb.' },
        { c: 'logic [7:0] mem [0:255];\nalways_ff @(posedge clk) if (we) mem[waddr] <= din;\nalways_ff @(posedge clk)         dout <= mem[raddr];', o: V, a: 0, w: 'A standard RAM template: synthesis infers a memory (or a RAM macro / FPGA block RAM).' },
        { c: 'assign x = y & a;\nassign y = x | b;      // x depends on y, y on x', o: V, a: 2, w: 'A combinational loop: gates are built but they form a loop that can oscillate or latch, and timing analysis cannot handle it. Break the loop with a register.' }
      ]
    });
  }

  /* ---------- Widget: latch hunter ---------- */
  function latchLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Latch hunter · make every output fully assigned</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var f = { def: false, els: false, g1: false, cdef: false };
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var opts = [['def', 'Defaults at the top'], ['els', 'Add final else'], ['g1', 'Assign grant in req1 branch'], ['cdef', 'Add case default']], btns = {};
    opts.forEach(function (o) { btns[o[0]] = L.btn(o[1], '', function () { f[o[0]] = !f[o[0]]; upd(); }); row.appendChild(btns[o[0]]); });
    var code = L.h('div', ''); body.appendChild(code);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function upd() {
      opts.forEach(function (o) { btns[o[0]].classList.toggle('is-on', f[o[0]]); });
      var src = 'always_comb begin\n' + (f.def ? '  y = \'0;  grant = 1\'b0;  z = \'0;      // defaults\n' : '') +
        '  if (req0) begin\n    y = a;  grant = 1\'b1;\n  end\n  else if (req1) begin\n    y = b;' + (f.g1 ? '  grant = 1\'b1;' : '') + '\n  end\n' +
        (f.els ? '  else begin\n    y = \'0;  grant = 1\'b0;\n  end\n' : '') +
        '  case (sel)\n    2\'b00: z = c;\n    2\'b01: z = d;\n    2\'b10: z = e;\n' + (f.cdef ? '    default: z = \'0;\n' : '') + '  endcase\nend';
      code.innerHTML = L.code(src);
      var lat = { y: !f.def && !f.els, grant: !f.def && (!f.els || !f.g1), z: !f.def && !f.cdef };
      var n = Object.keys(lat).filter(function (k) { return lat[k]; });
      var o = '';
      ['y', 'grant', 'z'].forEach(function (s, i) {
        var x = 40 + i * 190, bad = lat[s];
        o += R(x, 30, 150, 70, bad ? 'box-bad' : 'box-ok', 10) + T(x + 75, 58, s, 't-ink t-b') + T(x + 75, 82, bad ? 'LATCH inferred' : 'combinational ✓', bad ? 't-bad t-b t-sm' : 't-ok t-b t-sm');
      });
      pic.innerHTML = S(620, 116, o, 'Inferred hardware');
      verdict.className = 'l7-verdict ' + (n.length ? 'bad' : 'ok');
      verdict.innerHTML = n.length ? '⚠️ ' + n.length + ' latch' + (n.length > 1 ? 'es' : '') + ': ' + n.join(', ') + '<small>A latch appears whenever some path through always_comb does not assign the signal: the hardware must remember the old value.</small>'
        : '✅ No latches<small>Every signal is assigned on every path. Note that "Defaults at the top" alone fixes all three – the most robust habit.</small>';
      if (!n.length) api.done();
    }
    upd();
  }

  function infFrame(k) {
    var it = [
      ['Register', 'always_ff @(posedge clk) q <= d;', 'D flip-flops'],
      ['Multiplexer', 'always_comb case (s) ... endcase', 'mux tree'],
      ['RAM', 'array written in always_ff, read by address', 'memory / RAM macro'],
      ['ROM', 'case or constant array indexed by address', 'ROM / logic'],
      ['Latch', 'always_comb with an unassigned path', 'level-sensitive latch'],
      ['Tri-state', "assign bus = en ? d : 'z;", 'tri-state buffer (I/O pads)']
    ][k];
    var o = R(30, 30, 250, 110, 'box', 12) + T(155, 60, 'RTL pattern', 't-dim t-b t-sm') + T(155, 92, it[1].length > 34 ? it[1].slice(0, 34) + '…' : it[1], 't-ink t-sm');
    o += P('M280 85H330', 'w-on flow') + R(330, 30, 240, 110, k === 4 ? 'box-bad' : 'box-on', 12) + T(450, 72, it[0], 't-ink t-b') + T(450, 98, it[2], 't-dim t-sm');
    return S(600, 170, o, 'Inference: ' + it[0]);
  }

  L.module({
    n: 5,
    lead: 'Synthesis tools do not read your intentions – they infer hardware from patterns in your code. Learn which patterns become registers, RAMs, ROMs, muxes, latches or tri-states, which code cannot be synthesized at all, and how to avoid hardware you never asked for.',
    tags: ['synthesizable vs not', 'hardware inference', 'register / RAM / ROM', 'mux inference', 'latch inference', 'tri-state', 'unintended hardware', 'synthesis-friendly coding'],
    sections: [
      {
        id: 'c-syn', type: 'concept', title: 'Synthesizable vs non-synthesizable', nav: 'What synthesizes',
        html: '<p>A synthesis tool must turn every construct into a <b>fixed amount of hardware</b> that works on clock edges. Anything that depends on simulation time, on run-time sizes or on the file system cannot be built.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Construct</th><th>Synthesis</th></tr>' +
          '<tr><td><code>#</code> delays</td><td>ignored (warning) → simulation/synthesis mismatch</td></tr>' +
          '<tr><td><code>initial</code></td><td>ignored for ASICs (use reset); some FPGA tools use it for power-up values</td></tr>' +
          '<tr><td>for-loop, constant bounds</td><td>unrolled into parallel hardware</td></tr>' +
          '<tr><td>while / loop with data-dependent bound</td><td>not synthesizable</td></tr>' +
          '<tr><td>$display, file I/O, classes</td><td>ignored or rejected – testbench only</td></tr></table></div>'
      },
      { id: 'w-will', type: 'widget', title: 'Will this RTL synthesize?', nav: 'Will it synthesize?', intro: 'For each snippet choose ✅ synthesizable, ❌ not synthesizable, or ⚠️ synthesizes but produces unintended hardware / behaviour. Read the explanation each time.', build: willItDrill },
      {
        id: 'st-inf', type: 'steps', title: 'Animation: hardware inference', nav: 'Inference',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['<b>Register inference</b>: a clocked block assigning a signal → flip-flops. A reset branch → reset flip-flops; an if without else → enable.', '<b>Multiplexer inference</b>: case / ? : / if-else assigning one signal from several sources.', '<b>RAM inference</b>: an array written in a clocked block and read by an address. Follow the vendor\'s template so a real memory is used, not thousands of flip-flops.', '<b>ROM inference</b>: a case statement or constant array indexed by an address.', '<b>Latch inference</b>: an always_comb (or always @*) block where some path leaves a signal unassigned. Almost always a bug.', '<b>Tri-state inference</b>: assigning \'z. Used at chip I/O pads; inside ASICs use muxes instead.'][k], svg: infFrame(k) }; })
      },
      {
        id: 'c-unint', type: 'concept', title: 'Avoiding unintended hardware', nav: 'Unintended hardware',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Unintended latches</h4><p>Missing else, missing case default, signals not assigned in every branch. <b>Fix:</b> default assignments at the top of always_comb.</p></div>' +
          '<div class="l7-box vio"><h4>Multiple drivers</h4><p>The same signal assigned in two always blocks or by two assigns. <b>Fix:</b> one block per signal.</p></div>' +
          '<div class="l7-box sig"><h4>Combinational loops</h4><p>A signal depending on itself without a register. <b>Fix:</b> break the loop with a flip-flop.</p></div>' +
          '<div class="l7-box"><h4>Simulation/synthesis mismatch</h4><p>Incomplete sensitivity lists, # delays, initial values. <b>Fix:</b> always_comb / always_ff, resets, no delays.</p></div></div>'
      },
      { id: 'w-latch', type: 'widget', title: 'Latch hunter', nav: 'Latch hunter', intro: 'This always_comb block infers latches. Use the buttons to change the code until no latch remains.', build: latchLab },
      {
        id: 'c-friendly', type: 'concept', title: 'Synthesis-friendly coding checklist', nav: 'Checklist',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Always</h4><ul><li>always_ff for registers, always_comb for logic</li><li>defaults first in every always_comb</li><li>a default in every case</li><li>a reset for every control register</li><li>one driver per signal</li></ul></div><div class="l7-box"><h4>Never (in RTL)</h4><ul><li># delays, initial for ASIC state</li><li>data-dependent loop bounds</li><li>latches unless intended (and then always_latch)</li><li>clock gating or logic on clocks/resets by hand</li><li>internal tri-states in ASICs</li></ul></div></div>'
      },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: inference insights', nav: 'Reveal',
        items: [
          { q: 'Why is a latch worse than a flip-flop in most designs?', a: 'It is level-sensitive and transparent while enabled, which complicates timing analysis, can pass glitches, and is usually not what the designer meant.' },
          { q: 'What tells the tool to build a RAM instead of flip-flops?', a: 'Coding the array in the vendor\'s recognised template (synchronous write, registered or asynchronous read as supported), or instantiating a memory macro directly.' },
          { q: 'Is always_latch ever correct?', a: 'Yes, when a latch is intended (some low-power or time-borrowing designs). always_latch documents the intent and tools check it.' },
          { q: 'Why are delays in RTL dangerous even though they are ignored?', a: 'Simulation shows behaviour the gates will not have, so bugs or false passes slip through.' },
          { q: 'Why avoid tri-states inside an ASIC?', a: 'Bus contention, floating nodes and test difficulties; a mux does the same job safely.' },
          { q: 'What does synthesis do with an unused output?', a: 'It removes the logic that only drives it – reported as removed / unloaded logic (Module 8).' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: what hardware is inferred?', nav: 'Drag & drop',
        bins: ['Flip-flops', 'Latch', 'Mux', 'Memory / ROM'],
        items: [['always_ff @(posedge clk) q <= d;', 0], ['counter with synchronous reset', 0], ['always_comb if (en) y = d; (no else)', 1], ['case without default in always @*', 1], ['assign y = s ? a : b;', 2], ['case (sel) with all branches + default', 2], ['logic [7:0] m[0:1023] written on clk', 3], ['case (addr) returning constants', 3]]
      },
      {
        id: 'calc5', type: 'calc', title: 'Inference calculations', nav: 'Calculate',
        items: [
          { q: 'logic [15:0] mem [0:511] implemented in flip-flops instead of a RAM: how many flip-flops?', a: 8192, h: '16 × 512.', s: '<b>8192</b> – which is why RAM inference matters.' },
          { q: 'How many address bits does a 512-word memory need?', a: 9, h: 'log2 512.', s: '<b>9</b>.' },
          { q: 'An unrolled for-loop computes parity of 32 bits with 2-input XORs. How many XOR gates?', a: 31, h: 'n − 1.', s: '<b>31</b> (arranged as a tree of depth 5).' },
          { q: 'In the latch hunter, how many latches appear when NO fix is applied?', a: 3, h: 'y, grant and z.', s: '<b>3</b>.' },
          { q: 'A ROM of 64 words × 8 bits holds how many bits?', a: 512, h: '64 × 8.', s: '<b>512</b>.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Synthesis-prediction MCQs', nav: 'MCQ',
        items: [
          { q: '<code>always_comb if (en) y = d;</code> infers…', o: ['a flip-flop', 'a latch', 'a mux only', 'nothing'], a: 1, w: '' },
          { q: 'A # delay in RTL is…', o: ['built as a delay line', 'ignored by synthesis', 'converted to a register', 'an error always'], a: 1, w: '' },
          { q: 'Which loop is synthesizable?', o: ['for with constant bounds', 'while (data != 0)', 'forever #5', 'for with a run-time bound'], a: 0, w: '' },
          { q: 'Assigning \'z to an internal ASIC bus infers…', o: ['a tri-state buffer (discouraged inside ASICs)', 'a latch', 'a RAM', 'nothing'], a: 0, w: '' }
        ]
      },
      {
        id: 'short5', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain how an unintended latch is inferred and how to prevent it.', k: ['assign|path|branch', 'keep|remember|hold|old value', 'default', 'else|case'], m: 'In a combinational block, if some path through the if/case structure does not assign a signal, the hardware must hold the previous value, so the tool infers a level-sensitive latch. Prevent it by assigning default values to every output at the top of always_comb and by covering every branch (final else, case default).' },
          { q: 'Why do # delays and initial blocks cause trouble in RTL meant for ASIC synthesis?', k: ['ignore', 'mismatch|differ', 'reset|power-up|unknown', 'simulation'], m: 'Synthesis ignores # delays and initial blocks, so the gate-level design behaves differently from the RTL simulation (mismatch). Real flip-flops power up unknown, so start values must come from a reset, and timing must come from the clock, not from delays.' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Synthesis of a 4K-word buffer took hours and produced 32,768 flip-flops instead of using memory.', q: 'What should you do?', o: [{ t: 'Recode the array using the RAM template (synchronous write, supported read style) or instantiate a memory macro', ok: true, w: 'The tool did not recognise a memory pattern.' }, { t: 'Increase the clock period', ok: false, w: 'Unrelated.' }, { t: 'Use an initial block to fill it', ok: false, w: 'Does not change inference.' }] },
          { s: 'RTL simulation passes, but gate-level simulation fails on a signal written as always @(a) y = a & b.', q: 'Cause and fix?', o: [{ t: 'Incomplete sensitivity list – simulation mismatch; use always_comb', ok: true, w: 'The gates react to b; the RTL simulation did not.' }, { t: 'The AND gate is too slow', ok: false, w: 'A functional mismatch, not timing.' }, { t: 'Synthesis built a latch', ok: false, w: 'It built an AND gate.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Which is NOT synthesizable?', o: ['always_ff', 'while (data != 0)', 'case', 'assign'], a: 1, w: '' },
      { d: 'Easy', q: 'A missing else in always_comb can infer…', o: ['a latch', 'a RAM', 'a counter', 'a tri-state'], a: 0, w: '' },
      { d: 'Easy', q: 'Synthesis treats # delays as…', o: ['real delays', 'ignored', 'registers', 'clock edges'], a: 1, w: '' },
      { d: 'Medium', q: 'Two always blocks assigning the same signal cause…', o: ['a mux', 'multiple drivers', 'a latch', 'a RAM'], a: 1, w: '' },
      { d: 'Medium', q: 'Prediction: <code>always_comb begin y = 0; if (s) y = a; end</code>', o: ['latch', 'combinational mux/AND – no latch', 'flip-flop', 'not synthesizable'], a: 1, w: 'The default covers the else path.' },
      { d: 'Medium', q: 'A case on addr returning constants infers…', o: ['a ROM / logic', 'a RAM', 'a latch', 'a counter'], a: 0, w: '' },
      { d: 'Medium', q: 'assign a = b | c; assign c = a & d; creates…', o: ['a register', 'a combinational loop', 'a mux', 'nothing'], a: 1, w: '' },
      { d: 'Hard', q: 'logic [31:0] m[0:1023] built from flip-flops needs…', o: ['1024', '32,768', '32', '10'], a: 1, w: '32 × 1024.' },
      { d: 'Hard', q: 'always @(a) y = a & b; leads to…', o: ['a latch', 'simulation/synthesis mismatch', 'a syntax error', 'a RAM'], a: 1, w: '' },
      { d: 'Hard', q: 'An initial block setting a register to 5, in an ASIC, results in…', o: ['register powers up as 5', 'value ignored – register powers up unknown', 'a ROM', 'a latch'], a: 1, w: '' }
    ]
  });
})();
