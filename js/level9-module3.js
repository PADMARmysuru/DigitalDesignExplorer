/* Level 9 · Module 3 – RTL Architecture & Coding */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: specification → block diagram → RTL (4-bit ADD/SUB unit) ---------- */
  var SPEC = 'Design a 4-bit arithmetic unit. Inputs a and b are 4-bit two\'s-complement numbers; op = 0 means ADD, op = 1 means SUBTRACT (a − b). The 4-bit result and an overflow flag must be registered on the rising edge of clk, with a synchronous reset rst.';
  var PORTS = [
    { t: 'input clk, rst, op; input [3:0] a, b; output [3:0] y; output ovf', ok: true, w: 'Every signal in the specification, with the right widths.' },
    { t: 'input clk, op; input [3:0] a, b; output [4:0] y', ok: false, w: 'The reset is missing and the specification asks for a 4-bit result plus a separate overflow flag.' },
    { t: 'input [3:0] a, b; output [3:0] sum, diff', ok: false, w: 'No clock, no op – this computes both results all the time instead of a registered, selected result.' }
  ];
  var PARTS = [
    { t: '4-bit adder', need: true, w: 'One adder does both operations.' },
    { t: 'XOR gates on b (b ^ {4{op}})', need: true, w: 'Inverts b when op = 1 (one\'s complement).' },
    { t: 'Carry-in = op', need: true, w: 'Adds the +1 that turns one\'s complement into two\'s complement: a + ~b + 1 = a − b.' },
    { t: 'Overflow detection logic', need: true, w: 'Overflow when the operands (after inversion) have the same sign and the result sign differs.' },
    { t: 'Output registers (y, ovf)', need: true, w: 'The specification says the outputs are registered.' },
    { t: 'Separate 4-bit subtractor + 2:1 mux', need: false, w: 'Works, but costs a second adder – the XOR + carry-in trick shares one adder.' },
    { t: 'Multiplier', need: false, w: 'Not in the specification.' },
    { t: 'Magnitude comparator', need: false, w: 'Not needed: overflow comes from sign bits.' }
  ];
  var LINES = [
    { q: 'Operand B after the add/subtract control:', o: ['assign bx = b ^ {4{op}};', 'assign bx = op ? -b : b;   // with a second adder', 'assign bx = ~b;'], a: 0, w: '{4{op}} replicates op to 4 bits: b is inverted only for SUB.' },
    { q: 'The adder (5-bit result keeps the carry):', o: ['assign {c4, s} = a + bx + op;', 'assign s = a + b;', 'always_ff s <= a + bx;'], a: 0, w: 'op is the carry-in: +1 for subtraction.' },
    { q: 'Overflow (two\'s complement):', o: ['assign v = (a[3] == bx[3]) && (s[3] != a[3]);', 'assign v = c4;', 'assign v = s[3];'], a: 0, w: 'The carry-out is NOT the signed overflow; compare the sign bits.' },
    { q: 'The output register:', o: ['always_ff @(posedge clk) if (rst) {ovf, y} <= \'0; else {ovf, y} <= {v, s};', 'always_comb {ovf, y} = {v, s};', 'always @(clk) y = s;'], a: 0, w: 'Synchronous reset, non-blocking assignment, both outputs registered.' }
  ];
  function specLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Guided design · specification → block diagram → RTL</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var step = 0, chosen = {}, lineOk = {};
    var dots = L.h('div', 'l7-progdots'); body.appendChild(dots);
    var view = L.h('div', ''); body.appendChild(view);
    function paint() { dots.innerHTML = [0, 1, 2, 3].map(function (i) { return '<span class="' + (i < step ? 'ok' : i === step ? 'cur' : '') + '"></span>'; }).join(''); }
    function next() { step++; render(); }
    function diagram(full) {
      var o = '';
      o += T(20, 40, 'a', 't-ink t-b', 'start') + T(20, 110, 'b', 't-ink t-b', 'start') + T(20, 170, 'op', 't-cu t-b', 'start');
      o += R(70, 90, 80, 40, 'box-cu', 8) + T(110, 115, 'XOR ×4', 't-ink t-sm') + P('M36 105H70', 'w') + P('M44 165H110V130', 'w-cu');
      o += R(200, 30, 110, 110, 'box-on', 12) + T(255, 80, '4-bit', 't-ink t-b') + T(255, 98, 'adder', 't-ink t-b');
      o += P('M36 35H200M150 110H200', 'w') + P('M110 165H255V140', 'w-cu') + T(262, 158, 'cin', 't-cu t-sm', 'start');
      o += R(360, 30, 80, 50, 'box', 8) + T(400, 60, 'overflow', 't-ink t-sm');
      o += P('M310 70H340V55H360M310 100H480', 'w');
      o += R(480, 60, 70, 80, 'box-vio', 8) + T(515, 98, 'REG', 't-ink t-b') + T(515, 116, 'y, ovf', 't-dim t-sm') + P('M440 55H500V60', 'w');
      o += P('M550 100H590', 'w-on') + T(560, 92, 'y', 't-ink t-sm', 'start');
      return S(600, 190, full ? o : o, 'ADD/SUB unit block diagram');
    }
    function render() {
      paint(); view.innerHTML = '';
      var h = function (x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; };
      h('<div class="l7-readout"><span class="k">Specification</span><br>' + SPEC + '</div>');
      if (step === 0) {
        h('<h4 style="margin:14px 0 6px">Step 1 · Interface: which port list matches the specification?</h4>');
        var ch = h('', 'l7-choice'), fb = h('', 'l7-fb');
        PORTS.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (pp) {
          var b = L.h('button', 'l7-mono', pp.t); b.type = 'button'; b.style.fontSize = '.8rem';
          b.addEventListener('click', function () { L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); }); b.classList.add(pp.ok ? 'is-right' : 'is-wrong'); L.fb(fb, pp.ok ? 'ok' : 'bad', (pp.ok ? '✓ ' : '✗ ') + pp.w); if (pp.ok) { var r = L.h('div', 'l7-row'); r.appendChild(L.btn('Next: block diagram →', 'pri', next)); fb.appendChild(r); } });
          ch.appendChild(b);
        });
      } else if (step === 1) {
        h('<h4 style="margin:14px 0 6px">Step 2 · Block diagram: select every block the design needs (and nothing more)</h4>');
        var ch2 = h('', 'l7-choice'), fb2 = h('', 'l7-fb');
        PARTS.forEach(function (pp, i) {
          var b = L.h('button', chosen[i] ? 'is-pick' : '', (chosen[i] ? '☑ ' : '☐ ') + pp.t); b.type = 'button';
          b.addEventListener('click', function () { chosen[i] = !chosen[i]; render(); });
          ch2.appendChild(b);
        });
        var r = L.h('div', 'l7-row'); fb2.parentNode.insertBefore(r, fb2);
        r.appendChild(L.btn('Check block diagram', 'pri', function () {
          var wrong = PARTS.filter(function (pp, i) { return !!chosen[i] !== pp.need; });
          if (!wrong.length) { L.fb(fb2, 'ok', '✓ Correct architecture: one adder shared for ADD and SUB.'); var r2 = L.h('div', 'l7-row'); r2.appendChild(L.btn('Next: RTL →', 'pri', next)); fb2.appendChild(r2); }
          else L.fb(fb2, 'bad', wrong.map(function (pp) { return (pp.need ? '➕ Missing: ' : '➖ Not needed: ') + '<b>' + pp.t + '</b> – ' + pp.w; }).join('<br>'));
        }));
      } else if (step === 2) {
        h('<h4 style="margin:14px 0 6px">Step 3 · RTL structure: choose the correct line for each part of the diagram</h4>');
        view.appendChild(L.h('div', 'l7-svgbox', diagram()));
        LINES.forEach(function (ln, i) {
          var box = h('<p style="font-weight:600;margin:12px 0 4px">' + (i + 1) + '. ' + ln.q + '</p>');
          var ch3 = L.h('div', 'l7-choice'); ch3.style.gridTemplateColumns = '1fr'; box.appendChild(ch3);
          var fb3 = L.h('div', 'l7-fb'); box.appendChild(fb3);
          ln.o.map(function (x, k) { return k; }).sort(function () { return Math.random() - 0.5; }).forEach(function (k) {
            var t = ln.o[k];
            var b = L.h('button', 'l7-mono' + (lineOk[i] && k === ln.a ? ' is-right' : ''), L.esc(t)); b.type = 'button'; b.style.fontSize = '.78rem';
            b.addEventListener('click', function () {
              L.$$('button', ch3).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
              b.classList.add(k === ln.a ? 'is-right' : 'is-wrong'); L.fb(fb3, k === ln.a ? 'ok' : 'bad', (k === ln.a ? '✓ ' : '✗ ') + ln.w);
              if (k === ln.a) { lineOk[i] = 1; if (Object.keys(lineOk).length === LINES.length) { step = 3; setTimeout(render, 600); } }
            });
            ch3.appendChild(b);
          });
        });
      } else {
        h('<h4 style="margin:14px 0 6px">✅ Complete RTL</h4>');
        view.appendChild(L.h('div', '', L.code('module addsub4 (\n  input  logic       clk, rst, op,      // op: 0 = ADD, 1 = SUB\n  input  logic [3:0] a, b,\n  output logic [3:0] y,\n  output logic       ovf);\n  logic [3:0] bx, s;  logic c4, v;\n  assign bx      = b ^ {4{op}};            // invert b for SUB\n  assign {c4, s} = a + bx + op;            // op = carry-in (+1 for SUB)\n  assign v       = (a[3] == bx[3]) && (s[3] != a[3]);\n  always_ff @(posedge clk)\n    if (rst) {ovf, y} <= \'0;\n    else     {ovf, y} <= {v, s};\nendmodule')));
        h('<div class="l7-fb ok">🎉 Specification → block diagram → RTL done. Notice how each RTL line maps to one block of the diagram – that is the habit of an RTL designer.</div>');
        api.done();
      }
    }
    render();
  }

  /* ---------- Widget: where should the pipeline register go? ---------- */
  function pipeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Pipelined RTL · place registers to reach 150 MHz with the fewest flip-flops</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var B = [['scale', 3.2], ['add', 2.1], ['saturate', 4.0], ['round', 1.7]], cut = [false, false, false], OV = 0.3, W = 16;
    body.appendChild(L.h('p', 'l7-hint', 'A 16-bit processing chain of four combinational blocks (delays in ns). Each register adds 0.3 ns (clock-to-Q + setup). Tap the gaps to insert or remove pipeline registers.'));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function upd() {
      var stages = [], acc = 0;
      B.forEach(function (b, i) { acc += b[1]; if (i === B.length - 1 || cut[i]) { stages.push(acc + OV); acc = 0; } });
      var T = Math.max.apply(null, stages), f = 1000 / T, regs = cut.filter(Boolean).length, ok = f >= 150;
      var o = '', x = 20;
      o += R(x, 50, 30, 50, 'box-vio', 6) + T_(x + 15, 80, 'R');
      x += 40;
      B.forEach(function (b, i) {
        o += P('M' + (x - 10) + ' 75H' + x, 'w') + R(x, 45, 100, 60, 'box-on', 10) + T_(x + 50, 72, b[0]) + L.t(x + 50, 92, b[1] + ' ns', 't-cu t-sm');
        x += 100;
        if (i < B.length - 1) {
          o += '<g class="click" data-i="' + i + '" role="button" tabindex="0">' + (cut[i] ? R(x + 6, 50, 26, 50, 'box-vio', 6) + T_(x + 19, 80, 'R') : R(x + 6, 60, 26, 30, 'box', 6) + L.t(x + 19, 80, '+', 't-dim t-b')) + '</g>';
          x += 38;
        }
      });
      o += P('M' + x + ' 75H' + (x + 10), 'w') + R(x + 10, 50, 30, 50, 'box-vio', 6) + T_(x + 25, 80, 'R');
      function T_(a, b2, s) { return L.t(a, b2, s, 't-ink t-b t-sm'); }
      pic.innerHTML = S(x + 50, 130, o, 'Pipeline');
      L.$$('g.click', pic).forEach(function (g) { g.addEventListener('click', function () { var i = +g.getAttribute('data-i'); cut[i] = !cut[i]; upd(); }); });
      out.innerHTML = '<span class="k">Stages</span> ' + stages.map(function (s) { return s.toFixed(1); }).join(' / ') + ' ns<br><span class="k">Clock period</span> = slowest stage = <span class="c">' + T.toFixed(1) + ' ns</span> → <span class="v">' + f.toFixed(0) + ' MHz</span><br><span class="k">Latency</span> ' + (regs + 1) + ' cycle' + (regs ? 's' : '') + ' · <span class="k">extra flip-flops</span> ' + regs * W;
      verdict.className = 'l7-verdict ' + (ok ? (regs === 1 ? 'ok' : 'warn') : 'bad');
      verdict.innerHTML = ok ? (regs === 1 ? '✅ 150 MHz reached with only one pipeline register (16 flip-flops)<small>The cut splits the work into two nearly equal halves (5.6 / 6.0 ns). Balanced stages = best use of each register.</small>' : '⚠️ Fast enough, but you used ' + regs + ' registers (' + regs * W + ' flip-flops)<small>Can you meet 150 MHz with just one well-placed register?</small>') :
        '❌ ' + f.toFixed(0) + ' MHz – too slow<small>The clock period is set by the slowest stage. Cut the chain where it balances the stages best.</small>';
      if (ok && regs === 1) api.done();
    }
    upd();
  }

  function archFrame(k) {
    var o = '', st = ['Specification', 'Interface', 'Block diagram', 'Datapath + control', 'RTL modules'];
    st.forEach(function (s, i) { var x = 10 + i * 118; o += R(x, 50, 108, 56, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 10) + L.t(x + 54, 82, s, i <= k ? 't-ink t-b t-sm' : 't-dim t-sm'); if (i < 4) o += P('M' + (x + 108) + ' 78H' + (x + 118), 'w'); });
    o += L.t(300, 140, ['What must it do? Widths, timing, latency, corner cases.', 'Ports, widths, clock and reset – the contract with the rest of the chip.', 'Registers, operators, muxes – drawn before any code.', 'Split what moves data from what decides when.', 'One module per block; each line of RTL maps to the diagram.'][k], 't-vio t-b t-sm');
    return S(600, 160, o, 'Specification to RTL');
  }

  L.module({
    n: 3,
    lead: 'Good RTL is drawn before it is written. Learn to turn a specification into an interface, a block diagram and a datapath/control split – and only then into clean, modular RTL, including arithmetic, mux-based and pipelined structures.',
    tags: ['specification → RTL', 'block diagrams', 'datapath/control', 'register transfers', 'mux-based RTL', 'arithmetic RTL', 'pipelined RTL', 'hierarchy'],
    sections: [
      {
        id: 'st-arch', type: 'steps', title: 'Animation: from specification to RTL', nav: 'Spec → RTL',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['Read the <b>specification</b> carefully: functions, widths, signed/unsigned, latency, throughput.', 'Fix the <b>interface</b>: every port, its width and direction, clock and reset style.', 'Draw the <b>block diagram</b>: registers, adders, muxes, comparators and how they connect.', 'Separate the <b>datapath</b> from the <b>control</b> (an FSM when operations take several cycles).', 'Write <b>RTL</b> module by module. Each line should correspond to something on the diagram.'][k], svg: archFrame(k) }; })
      },
      {
        id: 'c-bd', type: 'concept', title: 'RTL block diagrams and register-transfer operations', nav: 'Block diagrams',
        html: '<p>An RTL block diagram shows <b>registers</b> (state), <b>combinational blocks</b> between them and the <b>select/enable</b> signals that steer data. Each register transfer on the diagram becomes RTL:</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Register transfer</th><th>Hardware</th><th>RTL</th></tr>' +
          '<tr><td>R1 ← R1 + R2 when add</td><td>adder, mux/enable, register</td><td><code>if (add) r1 &lt;= r1 + r2;</code></td></tr>' +
          '<tr><td>R ← A or B</td><td>2:1 mux into R</td><td><code>r &lt;= sel ? b : a;</code></td></tr>' +
          '<tr><td>R ← R &gt;&gt; 1</td><td>wiring only (shift by constant)</td><td><code>r &lt;= r &gt;&gt; 1;</code></td></tr>' +
          '<tr><td>FLAG ← (R == 0)</td><td>zero detector, register</td><td><code>flag &lt;= (r == \'0);</code></td></tr></table></div>'
      },
      { id: 'w-spec', type: 'widget', title: 'Guided design: 4-bit ADD/SUB unit', nav: 'Spec → RTL lab', intro: 'Follow the three steps: interface, block diagram, RTL structure.', build: specLab },
      {
        id: 'c-mux', type: 'concept', title: 'Multiplexer-based and arithmetic RTL', nav: 'Mux & arithmetic',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Parallel vs priority selection</h4><p><code>case</code> on one select → a balanced mux. An <code>if / else if</code> chain → a priority chain (later conditions pass through more logic). Use case (or <code>unique case</code>) when the choices are mutually exclusive.</p></div>' +
          '<div class="l7-box cu"><h4>Arithmetic in RTL</h4><p>Write <code>+ − * &lt; ==</code>; synthesis picks the adder/multiplier architecture. Size results correctly (n+1 bits for a sum), use <code>signed</code> where needed, and share operators when they are never used at the same time.</p></div></div>' +
          L.code('// one adder, two uses: shared by design\nassign opnd = sub ? ~b : b;\nassign {c, s} = a + opnd + sub;')
      },
      {
        id: 'c-pipe', type: 'concept', title: 'Pipelined RTL structures', nav: 'Pipelined RTL',
        html: '<p>Inserting registers into a long combinational path splits it into <b>stages</b>. Each stage does part of the work every clock cycle:</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Clock period</h4><p>set by the slowest stage (+ register overhead)</p></div><div class="l7-box cu"><h4>Throughput</h4><p>one result per cycle – higher with more stages</p></div><div class="l7-box vio"><h4>Latency</h4><p>each result takes N cycles, and every stage costs W flip-flops</p></div></div>' +
          '<p style="margin-top:12px">All signals travelling together (data, valid flags, control bits) must be delayed by the same number of stages. Processor pipelines and their hazards belong to Level 13; here pipelining is an RTL datapath technique.</p>'
      },
      { id: 'w-pipe', type: 'widget', title: 'Pipeline register placement', nav: 'Pipeline lab', intro: 'Reach at least 150 MHz using as few pipeline registers as possible.', build: pipeLab },
      {
        id: 'c-mod', type: 'concept', title: 'Modular hierarchy and reusable blocks', nav: 'Hierarchy',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Partition by function</h4><p>datapath, controller, interfaces, memories – each its own module with a clear purpose.</p></div><div class="l7-box"><h4>Partition for synthesis</h4><p>Keep each module\'s outputs registered where possible: timing is then local and modules can be synthesised and reused independently.</p></div></div>' +
          L.code('module mac_top (...);\n  mac_ctrl                u_ctrl (.clk, .rst, .start, .busy, .acc_en, .clr);\n  mac_dp   #(.W(16))      u_dp   (.clk, .rst, .a, .b, .acc_en, .clr, .acc);\nendmodule')
      },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: architecture insights', nav: 'Reveal',
        items: [
          { q: 'Why draw a block diagram before coding?', a: 'It fixes the hardware you want; the RTL then describes that hardware instead of the hardware being a side effect of code.' },
          { q: 'Why does a priority if-chain create slower logic?', a: 'The last condition passes through every earlier comparison, forming a chain of muxes.' },
          { q: 'How does one adder do subtraction?', a: 'a − b = a + ~b + 1: invert b with XOR gates and set carry-in to 1.' },
          { q: 'Is the carry-out the signed overflow?', a: 'No. Signed overflow happens when both operands have the same sign and the result sign differs.' },
          { q: 'Why balance pipeline stages?', a: 'The clock period is set by the slowest stage; an unbalanced pipeline wastes the registers you added.' },
          { q: 'What must accompany pipelined data?', a: 'Its valid bit and any control bits, delayed by the same number of stages.' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: map the specification phrase to the RTL element', nav: 'Drag & drop',
        bins: ['Register', 'Mux / selection', 'Arithmetic / logic', 'Controller (FSM)'],
        items: [['"result is available on the next clock edge"', 0], ['"hold the value while busy"', 0], ['"output a or b depending on mode"', 1], ['"choose one of four sources"', 1], ['"compute the difference"', 2], ['"set flag when count is zero"', 2], ['"wait for start, then run 8 cycles"', 3], ['"assert done after the last step"', 3]]
      },
      {
        id: 'calc3', type: 'calc', title: 'Architecture calculations', nav: 'Calculate',
        items: [
          { q: 'Adding two 8-bit unsigned numbers: how many bits must the result have to never overflow?', a: 9, h: 'n + 1.', s: '<b>9</b> bits.' },
          { q: 'A 4-bit ADD/SUB unit computes 5 − 7 with op = 1. What is the 4-bit result as an unsigned value (two\'s complement of −2)?', a: 14, h: '−2 in 4 bits = 1110.', s: '1110₂ = <b>14</b> (−2 signed).' },
          { q: 'Stage delays 5.3 ns and 5.7 ns with 0.3 ns register overhead. What is the clock frequency (MHz, one decimal)?', a: 166.7, tol: 0.01, h: 'Period = 5.7 + 0.3.', s: '1 / 6.0 ns = <b>166.7 MHz</b>.' },
          { q: 'A 3-stage pipeline (2 pipeline registers) carries 24-bit data plus a valid bit. How many flip-flops do the pipeline registers add?', a: 50, h: '2 × (24 + 1).', s: '<b>50</b>.' },
          { q: 'Using a separate subtractor plus a mux instead of the XOR trick for a 16-bit unit: how many extra 1-bit full adders (ripple)?', a: 16, h: 'One extra 16-bit adder.', s: '<b>16</b> full adders, plus a 16-bit mux.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which RTL structure gives a balanced (non-priority) mux?', o: ['if / else if chain', 'case on one select', 'two always blocks', 'a latch'], a: 1, w: '' },
          { q: 'a − b with one adder is computed as…', o: ['a + b', 'a + ~b + 1', '~a + b', 'a + ~b'], a: 1, w: '' },
          { q: 'Adding a pipeline register mainly improves…', o: ['latency', 'throughput / clock frequency', 'area', 'power always'], a: 1, w: '' },
          { q: 'The first design step for a new block is…', o: ['write RTL', 'read and clarify the specification', 'synthesize', 'draw layout'], a: 1, w: '' }
        ]
      },
      {
        id: 'short3', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the steps from a specification to RTL for a new block.', k: ['specification|requirement', 'interface|ports', 'block diagram|diagram', 'datapath|control', 'rtl|module|code'], m: 'Clarify the specification (function, widths, timing, latency); define the interface (ports, clock, reset); draw a block diagram of registers, operators and muxes; separate the datapath from the control (FSM); then write modular RTL in which each part of the code corresponds to a block of the diagram.' },
          { q: 'Explain the trade-off of pipelining an RTL datapath.', k: ['frequency|period|throughput', 'latency', 'register|flip-flop|area', 'balance|slowest'], m: 'Pipelining inserts registers into a long path so each stage is shorter: the clock period (set by the slowest stage) falls and throughput rises. The costs are extra latency in cycles, extra flip-flops (area and power) and the need to delay every related signal by the same number of stages. Stages should be balanced.' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A block must select one of 8 data sources; the select signal is one-hot and exactly one bit is always set. The engineer wrote an 8-level if / else if chain.', q: 'What is a better RTL choice?', o: [{ t: 'A unique case (or AND-OR mux) on the one-hot select – no priority logic needed', ok: true, w: 'Removes the long priority chain.' }, { t: 'Add pipeline registers inside the chain', ok: false, w: 'Fixes the symptom, not the structure.' }, { t: 'Use a latch', ok: false, w: 'Never.' }] },
          { s: 'After adding a 2-stage pipeline to the datapath, the output valid signal arrives one cycle before its data.', q: 'What went wrong?', o: [{ t: 'valid was not delayed by the same number of pipeline stages as the data', ok: true, w: 'Control and data must travel together.' }, { t: 'The adder is too slow', ok: false, w: 'Timing does not cause a whole-cycle mismatch here.' }, { t: 'Pipelines never work with valid signals', ok: false, w: 'They do, when aligned.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A block diagram is drawn…', o: ['after synthesis', 'before writing RTL', 'only for FPGAs', 'never'], a: 1, w: '' },
      { d: 'Easy', q: 'R ← A or B (depending on sel) needs…', o: ['an adder', 'a 2:1 mux into R', 'a counter', 'a latch'], a: 1, w: '' },
      { d: 'Easy', q: 'Pipelining increases…', o: ['latency in cycles and throughput', 'only area', 'only power', 'nothing'], a: 0, w: '' },
      { d: 'Medium', q: 'In the ADD/SUB unit, op is connected to…', o: ['the XOR gates on b and the carry-in', 'the clock', 'the reset', 'the output register only'], a: 0, w: '' },
      { d: 'Medium', q: 'Signed overflow in a + b occurs when…', o: ['carry-out = 1', 'operands have the same sign and the result sign differs', 'the result is zero', 'b is negative'], a: 1, w: '' },
      { d: 'Medium', q: 'Stages of 4, 2 and 6 ns (no overhead) allow a clock period of…', o: ['2 ns', '4 ns', '6 ns', '12 ns'], a: 2, w: 'Slowest stage.' },
      { d: 'Medium', q: 'An if / else if chain with 6 conditions synthesizes into…', o: ['a balanced mux', 'a priority chain', 'a decoder', 'registers'], a: 1, w: '' },
      { d: 'Hard', q: 'Moving a pipeline register to balance stages 7.0 / 3.0 ns into 5.0 / 5.0 ns changes fmax from…', o: ['143 to 200 MHz', '100 to 200 MHz', '143 to 100 MHz', 'no change'], a: 0, w: '1/7 ns → 1/5 ns.' },
      { d: 'Hard', q: 'Why register module outputs in a reusable block?', o: ['to save area', 'so timing stays inside the module and integration is predictable', 'it is required by Verilog', 'to remove the clock'], a: 1, w: '' },
      { d: 'Hard', q: 'Two operations that never happen in the same cycle can…', o: ['share one hardware unit through muxes', 'never share hardware', 'only be pipelined', 'only use latches'], a: 0, w: 'Resource sharing (Module 9).' }
    ]
  });
})();
