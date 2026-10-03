/* Level 9 · Module 10 – RTL-to-Gate-Level Project */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path, esc = L.esc;

  /* Each project: spec, architecture choice, RTL choice, simulation check and a synthesis model.
     syn: cells, ff (flip-flops), area, delay (ns, area-optimised), crit [start, end], pw (mW at 100 MHz) */
  var PROJECTS = [
    { id: 'alu', name: '4-bit ALU', icon: '➕',
      spec: '4-bit ALU with a 2-bit opcode: 00 ADD, 01 SUB, 10 AND, 11 OR. Registered 4-bit result y and a zero flag (y == 0).',
      arch: { o: ['One adder (XOR on b + carry-in for SUB), a logic unit, a 4:1 result mux, zero detector, output registers', 'Separate adder and subtractor with no output mux – both results go to y', 'A multi-cycle FSM that computes one bit per clock'], a: 0, w: 'Shared adder, a result mux selected by op, zero flag from the result, registered outputs.' },
      code: { q: 'Which RTL computes the result?', o: ['always_comb unique case (op)\n  2\'b00: r = a + b;\n  2\'b01: r = a - b;\n  2\'b10: r = a & b;\n  default: r = a | b;\nendcase', 'always_comb if (op == 2\'b00) r = a + b;', 'always_ff @(posedge clk) r = a + b - (a & b);'], a: 0, w: 'Complete case with default – no latch, every opcode covered.' },
      sim: { q: 'Simulation: a = 5, b = 3, op = 01 (SUB). After the clock edge, y = ?', a: 2, w: '5 − 3 = 2 (zero = 0).' },
      syn: { cells: 58, ff: 5, area: 96.4, delay: 3.1, crit: ['op_q_reg[0]', 'y_reg[3]'], pw: 0.8 } },
    { id: 'uart', name: 'UART transmitter', icon: '📡',
      spec: 'UART transmitter, 8N1: on start, send a 0 start bit, 8 data bits LSB first, a 1 stop bit; one bit per baud tick; busy while sending.',
      arch: { o: ['FSM (IDLE / START / DATA / STOP) + 8-bit shift register + 3-bit bit counter + baud tick counter', 'A single 10-bit register with no control', 'A RAM holding the bit sequence'], a: 0, w: 'Control (FSM) sequences the datapath (shift register, counters).' },
      code: { q: 'Which line drives the serial output tx?', o: ['assign tx = (state == START) ? 1\'b0 :\n            (state == DATA)  ? sr[0] : 1\'b1;', 'assign tx = sr[7];', 'always_comb if (state == DATA) tx = sr[0];   // no else'], a: 0, w: 'Idle and stop are 1, start is 0, data is sent LSB first. The third option infers a latch.' },
      sim: { q: 'Simulation: sending 8\'h55 (0101 0101). What is the first DATA bit on tx (0 or 1)?', a: 1, w: 'LSB first: bit 0 of 0x55 is 1.' },
      syn: { cells: 112, ff: 31, area: 180.2, delay: 2.4, crit: ['baud_cnt_reg[3]', 'baud_cnt_reg[9]'], pw: 0.6 } },
    { id: 'mac', name: 'Arithmetic unit (MAC)', icon: '✖️',
      spec: 'Arithmetic unit: acc ← acc + a × b every cycle when en = 1 (a, b 8-bit unsigned; acc 20-bit); clr resets acc.',
      arch: { o: ['8×8 multiplier → 20-bit adder → accumulator register with clear/enable', 'Two adders and no register', 'A lookup ROM for all products'], a: 0, w: 'Multiply, add and store – the classic MAC datapath.' },
      code: { q: 'Which RTL updates the accumulator?', o: ['always_ff @(posedge clk)\n  if (clr)     acc <= \'0;\n  else if (en) acc <= acc + a * b;', 'always_comb acc = acc + a * b;', 'always_ff @(posedge clk) acc = a * b;'], a: 0, w: 'Registered with clear and enable; always_comb would create a combinational loop.' },
      sim: { q: 'Simulation: acc = 10, a = 3, b = 4, en = 1. After the clock edge, acc = ?', a: 22, w: '10 + 3 × 4 = 22.' },
      syn: { cells: 640, ff: 37, area: 1104.6, delay: 6.8, crit: ['a_q_reg[0]', 'acc_reg[15]'], pw: 4.0 } },
    { id: 'fifo', name: 'Synchronous FIFO', icon: '📥',
      spec: '16-entry × 8-bit synchronous FIFO with write/read enables, full and empty flags, single clock.',
      arch: { o: ['16×8 storage array + 5-bit write and read pointers (extra wrap bit) + full/empty from the pointers', 'A single 8-bit register', 'Two FSMs and no storage'], a: 0, w: 'The extra pointer bit distinguishes full from empty when the addresses are equal.' },
      code: { q: 'Which expression gives full?', o: ['assign full = (wptr[4] != rptr[4]) &&\n              (wptr[3:0] == rptr[3:0]);', 'assign full = (wptr == rptr);', 'assign full = wptr[4];'], a: 0, w: 'Same address, different wrap bit = the writer is one lap ahead = full. (wptr == rptr means empty.)' },
      sim: { q: 'Simulation: after reset, 16 writes and no reads. Is full 1 or 0?', a: 1, w: '16 entries written into a 16-deep FIFO – full = 1.' },
      syn: { cells: 352, ff: 138, area: 758.9, delay: 2.2, crit: ['rptr_reg[1]', 'dout_reg[7]'], pw: 1.5 } },
    { id: 'rf', name: 'Register file', icon: '🗄️',
      spec: 'Register file: 8 registers × 16 bits, one write port, two independent read ports (combinational read).',
      arch: { o: ['8 × 16-bit registers + write decoder/enables + two 8:1 × 16-bit read muxes', 'One 16-bit register and a counter', 'A FIFO'], a: 0, w: 'Storage, write decode and one mux per read port.' },
      code: { q: 'Which RTL writes the register file?', o: ['always_ff @(posedge clk)\n  if (we) rf[waddr] <= wdata;', 'always_comb if (we) rf[waddr] = wdata;', 'assign rf[waddr] = wdata;'], a: 0, w: 'Clocked write with enable. The combinational version infers latches.' },
      sim: { q: 'Simulation: write 16\'h1234 to register 3, then raddr1 = 3. Read data rd1 as a decimal number?', a: 4660, w: '0x1234 = 4660.' },
      syn: { cells: 418, ff: 128, area: 978.1, delay: 1.9, crit: ['raddr1', 'rd1[11]'], pw: 1.8 } },
    { id: 'vend', name: 'Digital controller (vending)', icon: '🥤',
      spec: 'Vending controller: accepts 5 and 10 coins (one per cycle), item costs 15; asserts dispense for one cycle when 15 or more is inserted, then returns to 0 credit.',
      arch: { o: ['Moore FSM with credit states 0, 5, 10, 15 (dispense in state 15)', 'A 32-bit adder and RAM', 'A shift register'], a: 0, w: 'Small control problem → a small FSM.' },
      code: { q: 'Which next-state code is safe?', o: ['always_comb begin\n  next = state;\n  unique case (state)\n    C0:  if (c10) next = C10; else if (c5) next = C5;\n    C5:  if (c10) next = C15; else if (c5) next = C10;\n    C10: if (c5 || c10) next = C15;\n    C15: next = C0;\n  endcase\nend', 'always_comb case (state) C0: if (c5) next = C5; endcase', 'always_ff @(posedge clk) next = state + 1;'], a: 0, w: 'Default first, every state handled.' },
      sim: { q: 'Simulation: insert 10, then 5. In the following cycle dispense = ? (0 or 1)', a: 1, w: '10 + 5 = 15 → state C15 → dispense.' },
      syn: { cells: 34, ff: 2, area: 52.3, delay: 1.2, crit: ['state_reg[0]', 'state_reg[1]'], pw: 0.2 } },
    { id: 'gcd', name: 'Simple datapath (GCD)', icon: '🧮',
      spec: 'GCD unit: load a and b (8-bit); repeatedly subtract the smaller from the larger until equal; result and done.',
      arch: { o: ['Registers A and B, comparator, subtractor, input muxes, and an FSM (IDLE / RUN / DONE)', 'Only a comparator', 'A ROM of all GCD results'], a: 0, w: 'Datapath (registers, compare, subtract, muxes) + control FSM.' },
      code: { q: 'Which RTL performs one GCD step?', o: ['always_ff @(posedge clk)\n  if (run)\n    if (A > B) A <= A - B;\n    else if (B > A) B <= B - A;', 'always_comb while (A != B) A = A - B;', 'always_ff @(posedge clk) A <= A - B; B <= B - A;'], a: 0, w: 'One subtraction per clock; the while loop is not synthesizable.' },
      sim: { q: 'Simulation: a = 12, b = 18. Final result = ?', a: 6, w: 'GCD(12, 18) = 6.' },
      syn: { cells: 214, ff: 19, area: 391.7, delay: 3.6, crit: ['A_reg[2]', 'A_reg[7]'], pw: 1.1 } }
  ];

  var STEPS = ['Specification', 'RTL architecture', 'RTL coding', 'Functional simulation', 'Synthesis', 'Gate-level netlist', 'Synthesis report'];

  function synth(p, f, eff) {
    var s = p.syn, timing = eff === 'timing';
    var delay = +(s.delay * (timing ? 0.7 : 1)).toFixed(2), period = +(1000 / f).toFixed(2);
    return {
      f: f, eff: eff, period: period, delay: delay,
      slack: +(period - delay).toFixed(2),
      area: +(s.area * (timing ? 1.3 : 1)).toFixed(1),
      cells: Math.round(s.cells * (timing ? 1.25 : 1)),
      ff: s.ff,
      power: +(s.pw * f / 100 * (timing ? 1.2 : 1)).toFixed(2),
      crit: s.crit
    };
  }

  function projectLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>RTL-to-gate project · choose a design and take it to a netlist</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var st = { p: null, step: 0, max: 0, ok: {}, f: 200, eff: 'area', res: null, runs: 0 };
    var head = L.h('div', ''); body.appendChild(head);
    var bar = L.h('div', 'l7-row'); body.appendChild(bar);
    var view = L.h('div', ''); body.appendChild(view);
    var nav = L.h('div', 'l7-row'); body.appendChild(nav);

    function choose() {
      head.innerHTML = '<p class="l7-hint">Choose one project (you can switch later; your progress in the steps restarts).</p>';
      var ch = L.h('div', 'l7-choice'); head.appendChild(ch);
      PROJECTS.forEach(function (p) {
        var b = L.h('button', st.p === p ? 'is-right' : '', '<span style="font-size:1.4rem">' + p.icon + '</span><br>' + esc(p.name)); b.type = 'button';
        b.addEventListener('click', function () { st = { p: p, step: 0, max: 0, ok: {}, f: 200, eff: 'area', res: null, runs: 0 }; choose(); draw(); });
        ch.appendChild(b);
      });
    }
    function go(i) { st.step = i; st.max = Math.max(st.max, i); draw(); }
    function choiceQ(container, q, key, mono) {
      var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; container.appendChild(ch);
      var fb = L.h('div', 'l7-fb'); container.appendChild(fb);
      if (!st.order) st.order = {};
      var ok_ = key + ':' + q.o.length;
      if (!st.order[ok_]) st.order[ok_] = q.o.map(function (x, i) { return i; }).sort(function () { return Math.random() - 0.5; });
      st.order[ok_].forEach(function (k) {
        var t = q.o[k];
        var b = L.h('button', (st.ok[key] && k === q.a ? 'is-right ' : '') + (mono ? 'l7-mono' : ''), mono ? '<pre style="margin:0;white-space:pre-wrap;font:inherit;font-size:.78rem">' + esc(t) + '</pre>' : esc(t)); b.type = 'button';
        b.addEventListener('click', function () {
          L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
          b.classList.add(k === q.a ? 'is-right' : 'is-wrong');
          L.fb(fb, k === q.a ? 'ok' : 'bad', (k === q.a ? '✓ ' : '✗ ') + (k === q.a ? q.w : 'Not this one – compare it carefully with the specification.'));
          if (k === q.a) { st.ok[key] = 1; if (st.step === 6) draw(); else drawNav(); }
        });
        ch.appendChild(b);
      });
      if (st.ok[key]) L.fb(fb, 'ok', '✓ ' + q.w);
    }
    function numQ(container, q, key) {
      var row = L.h('div', 'l7-calc-row'); container.appendChild(row);
      var inp = document.createElement('input'); inp.className = 'l7-input'; inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('aria-label', q.q);
      row.appendChild(inp);
      var fb = L.h('div', 'l7-fb'); container.appendChild(fb);
      row.appendChild(L.btn('Check', 'pri', function () {
        var x = parseFloat(String(inp.value).replace('−', '-'));
        var ok = !isNaN(x) && Math.abs(x - q.a) <= Math.max(Math.abs(q.a) * (q.tol || 0), q.abs || 0.0001);
        inp.style.borderColor = ok ? 'var(--l7-ok)' : 'var(--l7-bad)';
        L.fb(fb, ok ? 'ok' : 'bad', ok ? '✓ ' + (q.w || 'Correct.') : '✗ Not yet – ' + (q.h || 'look again.'));
        if (ok) { st.ok[key] = 1; if (st.step === 6) draw(); else drawNav(); }
      }));
      if (st.ok[key]) { inp.value = q.a; inp.style.borderColor = 'var(--l7-ok)'; L.fb(fb, 'ok', '✓ ' + (q.w || 'Correct.')); }
    }
    function canNext() {
      var s = st.step;
      if (s === 1) return !!st.ok.arch;
      if (s === 2) return !!st.ok.code;
      if (s === 3) return !!st.ok.sim;
      if (s === 4) return !!st.res;
      return s < 6;
    }
    function drawNav() {
      nav.innerHTML = '';
      if (!st.p) return;
      if (st.step > 0) nav.appendChild(L.btn('← Back', 'ghost', function () { go(st.step - 1); }));
      if (st.step < 6) { var b = L.btn('Next: ' + STEPS[st.step + 1] + ' →', 'pri', function () { go(st.step + 1); }); b.disabled = !canNext(); nav.appendChild(b); }
    }
    function draw() {
      bar.innerHTML = ''; view.innerHTML = '';
      if (!st.p) { drawNav(); return; }
      STEPS.forEach(function (s, i) {
        var b = L.btn((i < st.max ? '✓ ' : '') + (i + 1) + '. ' + s, i === st.step ? 'is-on' : '', function () { if (i <= st.max) go(i); });
        b.style.fontSize = '.8rem'; if (i > st.max) b.disabled = true; bar.appendChild(b);
      });
      var p = st.p, s = st.step, h = function (x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; };
      h('<h3 style="margin:10px 0 6px">' + p.icon + ' ' + esc(p.name) + ' · Step ' + (s + 1) + ': ' + STEPS[s] + '</h3>');
      if (s === 0) {
        h('<div class="l7-readout"><span class="k">Specification</span><br>' + esc(p.spec) + '</div>');
        h('<p>Read the specification carefully: list the inputs, outputs, widths, what is registered, and which operations happen in which cycle. Then continue to the architecture.</p>');
      }
      if (s === 1) { h('<p><b>Which architecture implements the specification?</b></p>'); choiceQ(view, p.arch, 'arch'); }
      if (s === 2) { h('<p><b>' + esc(p.code.q) + '</b></p>'); choiceQ(view, p.code, 'code', true); }
      if (s === 3) { h('<p><b>' + esc(p.sim.q) + '</b> (check the RTL behaviour before synthesis)</p>'); numQ(view, { q: p.sim.q, a: p.sim.a, w: p.sim.w, h: 'trace the RTL by hand, one clock edge at a time.' }, 'sim'); }
      if (s === 4) {
        h('<p>Choose the synthesis settings, then run synthesis. If timing fails, change the settings and run again – just like a real flow.</p>');
        var row = L.h('div', 'l7-row'); view.appendChild(row);
        L.select(row, 'Target clock (create_clock)', [['100', '100 MHz (10 ns)'], ['200', '200 MHz (5 ns)'], ['400', '400 MHz (2.5 ns)']], String(st.f), function (v) { st.f = +v; });
        L.select(row, 'Optimisation effort', [['area', 'Area-optimised'], ['timing', 'Timing-optimised']], st.eff, function (v) { st.eff = v; });
        row.appendChild(L.btn('▶ Run synthesis', 'pri', function () { st.res = synth(p, st.f, st.eff); st.runs++; ['r1', 'r2', 'r3', 'r4', 'r5'].forEach(function (k) { delete st.ok[k]; }); draw(); }));
        if (st.res) {
          var r = st.res;
          h('<div class="l7-verdict ' + (r.slack >= 0 ? 'ok' : 'bad') + '">' + (r.slack >= 0 ? '✅ Synthesis finished – timing met (slack +' + r.slack.toFixed(2) + ' ns)' : '❌ Synthesis finished – timing VIOLATED (slack ' + r.slack.toFixed(2) + ' ns)') +
            '<small>Run ' + st.runs + ': ' + r.f + ' MHz, ' + (r.eff === 'timing' ? 'timing' : 'area') + '-optimised. ' + (r.slack < 0 ? 'Try timing-optimised effort or a lower clock. (In a real project you might also pipeline the RTL – Module 9.)' : 'Continue to the netlist.') + '</small></div>');
        }
      }
      if (s === 5) {
        var q = st.res, comb = q.cells - q.ff;
        h('<p>The gate-level netlist – library cells and the nets between them – is the output of synthesis. Cell usage for your run:</p>');
        h('<div class="l7-table-wrap"><table class="l7-table"><tr><th>Cell group</th><th>Count</th></tr><tr><td>Sequential (DFF)</td><td>' + q.ff + '</td></tr><tr><td>Combinational (NAND/NOR/AOI/XOR/MUX …)</td><td>' + comb + '</td></tr><tr><td><b>Total cells</b></td><td><b>' + q.cells + '</b></td></tr></table></div>');
        view.appendChild(L.h('div', '', L.code('module ' + p.id + ' ( clk, rst_n, ... );\n  // ' + q.cells + ' cells, ' + (q.eff === 'timing' ? 'timing' : 'area') + '-optimised at ' + q.f + ' MHz\n  DFF_X1   ' + q.crit[1].replace(/\[|\]/g, '_') + ' ( .D(n' + (q.cells - 3) + '), .CK(clk), .Q(...) );\n  AOI22_X1 U' + (q.cells - 12) + ' ( .A1(n41), .A2(n7), .B1(n12), .B2(n3), .ZN(n58) );\n  ' + (q.eff === 'timing' ? 'NAND2_X2' : 'NAND2_X1') + ' U' + (q.cells - 30) + ' ( .A1(n58), .A2(n19), .ZN(n60) );\n  ...\nendmodule', 'sm')));
        h('<p class="l7-hint">' + (q.eff === 'timing' ? 'Timing-optimised: larger drive strengths (_X2) and faster structures – more cells and area.' : 'Area-optimised: minimum-size cells and simple structures.') + '</p>');
      }
      if (s === 6) {
        var x = st.res;
        h('<p>Read the synthesis report of your run and answer the questions.</p>');
        view.appendChild(L.h('div', '', L.code('Report : area / timing / power      Design : ' + p.id + '\nNumber of cells:              ' + x.cells + '\nNumber of sequential cells:   ' + x.ff + '\nTotal cell area:              ' + x.area.toFixed(1) + '\n\nclock clk  period ' + x.period.toFixed(2) + ' ns\nStartpoint: ' + x.crit[0] + '\nEndpoint:   ' + x.crit[1] + '\ndata arrival time             ' + x.delay.toFixed(2) + '\ndata required time            ' + x.period.toFixed(2) + '\nslack (' + (x.slack >= 0 ? 'MET' : 'VIOLATED') + ')                  ' + x.slack.toFixed(2) + '\n\nTotal dynamic power (est.):   ' + x.power.toFixed(2) + ' mW', 'sm')));
        var qs = [
          { k: 'r1', q: 'Total cell area', a: x.area, tol: 0.001, w: 'From the area report.' },
          { k: 'r2', q: 'Number of cells', a: x.cells },
          { k: 'r3', q: 'Worst slack (ns)', a: x.slack, tol: 0.001, abs: 0.001 },
          { k: 'r4', q: 'Estimated power (mW)', a: x.power, tol: 0.001, abs: 0.001 }
        ];
        qs.forEach(function (q) { h('<p style="font-weight:600;margin:10px 0 4px">' + q.q + '</p>'); numQ(view, q, q.k); });
        h('<p style="font-weight:600;margin:10px 0 4px">Where is the critical path?</p>');
        var opts = [x.crit[0] + ' → ' + x.crit[1], x.crit[1] + ' → ' + x.crit[0], 'clk → ' + x.crit[1]];
        choiceQ(view, { o: opts, a: 0, w: 'Startpoint → endpoint as listed in the timing report.' }, 'r5');
        var all = ['r1', 'r2', 'r3', 'r4', 'r5'].every(function (k) { return st.ok[k]; });
        var fin = h('', '');
        if (all) {
          if (x.slack >= 0) {
            fin.innerHTML = '<div class="l7-verdict ok">🏁 Project complete: ' + esc(p.name) + ' at ' + x.f + ' MHz, ' + x.cells + ' cells, ' + x.area.toFixed(1) + ' area, slack +' + x.slack.toFixed(2) + ' ns.<small>Specification → architecture → RTL → simulation → synthesis → netlist → report: the complete front-end flow. Try another project or a faster clock.</small></div>';
            api.done();
          } else fin.innerHTML = '<div class="l7-verdict bad">Report read correctly – but this run fails timing (slack ' + x.slack.toFixed(2) + ' ns).<small>Go back to Step 5, change the clock or the effort, run synthesis again and analyse the new report to complete the project.</small></div>';
        }
      }
      drawNav();
    }
    choose(); draw();
  }

  function flowFrame(k) {
    var st = ['Spec', 'Architecture', 'RTL', 'Simulation', 'Synthesis', 'Netlist', 'Report'], o = '';
    st.forEach(function (s, i) { var x = 6 + i * 84; o += R(x, 50, 76, 48, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(x + 38, 79, s, i <= k ? 't-ink t-b t-sm' : 't-dim t-sm'); if (i < 6) o += P('M' + (x + 76) + ' 74H' + (x + 84), 'w'); });
    o += T(300, 132, ['What must it do?', 'Which blocks and how are they connected?', 'Synthesizable SystemVerilog for each block.', 'Does the RTL do what the specification says?', 'RTL + library + constraints → gates.', 'Library cells and nets.', 'Area, timing, power, warnings – then iterate.'][k], 't-vio t-b t-sm');
    return S(600, 150, o, 'Front-end flow');
  }

  L.module({
    n: 10,
    lead: 'Put the whole level together. Choose a design, take it from specification through architecture, RTL and simulation to synthesis – then read the netlist and the report your own choices produced.',
    tags: ['project', 'specification', 'architecture', 'RTL coding', 'simulation', 'synthesis', 'netlist', 'report analysis'],
    sections: [
      {
        id: 'st-flow', type: 'steps', title: 'Animation: the RTL-to-gates flow', nav: 'The flow',
        frames: [0, 1, 2, 3, 4, 5, 6].map(function (k) { return { t: ['<b>Specification</b> – inputs, outputs, behaviour, performance.', '<b>Architecture</b> – block diagram, datapath and control.', '<b>RTL coding</b> – synthesizable, latch-free SystemVerilog.', '<b>Functional simulation</b> – check behaviour before synthesis (detailed verification methodology is Level 11).', '<b>Synthesis</b> – with the right constraints and library.', '<b>Gate-level netlist</b> – the input to physical design (Level 10).', '<b>Synthesis report</b> – area, cells, timing, power, warnings. Iterate until clean.'][k], svg: flowFrame(k) }; })
      },
      { id: 'w-proj', type: 'widget', title: 'Your RTL-to-gate project', nav: 'Project', intro: 'Choose one of seven projects and complete all seven steps. The project is complete when your final run meets timing and you have analysed its report correctly.', build: projectLab },
      {
        id: 'c-check', type: 'concept', title: 'Project checklist', nav: 'Checklist',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Before synthesis</h4><ul><li>Every specification item mapped to a block</li><li>No latches, one driver per signal, resets present</li><li>Simulation shows the specified behaviour</li><li>Constraints written (clock, I/O, exceptions)</li></ul></div><div class="l7-box cu"><h4>After synthesis</h4><ul><li>Slack ≥ 0 at the target clock</li><li>Area and power within budget</li><li>Zero unexplained warnings</li><li>Critical path understood – and improved in RTL if needed</li></ul></div></div>'
      },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: lessons from the project', nav: 'Lessons',
        items: [
          { q: 'Why did the same RTL give different results in different runs?', a: 'The clock constraint and the optimisation goal change the cells and structures synthesis chooses.' },
          { q: 'What if timing still fails at the highest effort?', a: 'Change the RTL: pipeline, restructure or share differently (Module 9), or relax the specification.' },
          { q: 'Why simulate before synthesis?', a: 'Synthesis faithfully implements the RTL – including its bugs. Function must be right first.' },
          { q: 'Is the synthesis report the final timing answer?', a: 'No – after physical design (Level 10), sign-off STA with real wires confirms it.' },
          { q: 'What makes a project easy to synthesise?', a: 'Clear datapath/control split, registered outputs, no latches, realistic constraints.' },
          { q: 'What comes next in the flow?', a: 'Physical design (Level 10), advanced verification (Level 11) and test (Level 12).' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: order the flow', nav: 'Flow order',
        bins: ['Front: specification → RTL', 'Middle: simulation & synthesis', 'End: netlist & reports'],
        items: [['Write the specification', 0], ['Draw the block diagram', 0], ['Write synthesizable RTL', 0], ['Simulate the RTL', 1], ['Write SDC constraints', 1], ['Run synthesis', 1], ['Inspect the gate-level netlist', 2], ['Analyse area / timing / power reports', 2]]
      },
      {
        id: 'calc10', type: 'calc', title: 'Project calculations', nav: 'Calculate',
        items: [
          { q: 'A path of 3.1 ns at 400 MHz: what is the slack (ns, two decimals)?', a: -0.6, tol: 0.001, abs: 0.001, h: '2.5 − 3.1.', s: '<b>−0.60 ns</b> – timing fails.' },
          { q: 'Timing-optimised effort makes the path 30 % faster: 3.1 ns → ? ns (two decimals)', a: 2.17, tol: 0.001, h: '3.1 × 0.7.', s: '<b>2.17 ns</b> → slack +0.33 ns at 400 MHz.' },
          { q: 'Area 96.4 grows by 30 % with timing effort. New area (one decimal)?', a: 125.3, tol: 0.001, h: '96.4 × 1.3.', s: '<b>125.3</b>.' },
          { q: 'A design estimated at 0.8 mW at 100 MHz runs at 400 MHz. Dynamic power (mW), same effort?', a: 3.2, tol: 0.01, h: 'Power ∝ f.', s: '<b>3.2 mW</b>.' },
          { q: 'The register file has 8 × 16 storage bits. How many flip-flops is that?', a: 128, h: '8 × 16.', s: '<b>128</b>.' }
        ]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Integrated MCQs', nav: 'MCQ',
        items: [
          { q: 'Which step comes immediately after RTL coding?', o: ['functional simulation', 'placement', 'tape-out', 'specification'], a: 0, w: '' },
          { q: 'Timing fails even at maximum effort. The next step is…', o: ['change the RTL (e.g. pipeline) or relax the target', 'ignore it', 'remove constraints', 'add latches'], a: 0, w: '' },
          { q: 'The FIFO full flag uses…', o: ['an extra wrap bit in the pointers', 'a timer', 'the clock', 'a latch'], a: 0, w: '' },
          { q: 'A while-loop GCD in always_comb is…', o: ['synthesizable', 'not synthesizable', 'a latch', 'a ROM'], a: 1, w: '' }
        ]
      },
      {
        id: 'short10', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the steps you followed in your project from specification to synthesis report.', k: ['specification', 'architecture|block diagram', 'rtl|code', 'simulat', 'synthes', 'report|area|slack'], m: 'Read and clarify the specification; choose an architecture (block diagram with datapath and control); write synthesizable RTL; check its behaviour with functional simulation; set the constraints and run synthesis; inspect the gate-level netlist; analyse the area, cell count, timing (slack, critical path) and power in the reports and iterate until the targets are met.' },
          { q: 'Your design fails timing at the target clock. List three things you could do.', k: ['effort|timing-optimi', 'pipelin', 'restructur|share|architect', 'clock|relax|frequency'], m: 'Re-run synthesis with timing-driven effort; change the RTL – pipeline the critical path, restructure logic so late signals pass fewer levels, duplicate high fan-out registers; or, if the specification allows, relax the clock frequency. Then re-check area and power.' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your MAC unit fails 400 MHz even with timing effort (path 4.8 ns).', q: 'Best RTL change?', o: [{ t: 'Pipeline: register the product before the accumulator adder', ok: true, w: 'Splits the multiply-add path.' }, { t: 'Use an initial block for acc', ok: false, w: 'Unrelated and not synthesizable.' }, { t: 'Remove the clear input', ok: false, w: 'Barely affects timing.' }] },
          { s: 'Synthesis of your UART reports "latch tx_reg inferred".', q: 'What do you do?', o: [{ t: 'Fix the RTL so tx is assigned on every path (default / else)', ok: true, w: 'Latches come from incomplete assignments.' }, { t: 'Increase the effort', ok: false, w: 'Effort does not remove latches.' }, { t: 'Waive it', ok: false, w: 'It is a real bug.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The correct order is…', o: ['spec → RTL → simulation → synthesis → netlist', 'synthesis → spec → RTL', 'netlist → RTL → spec', 'simulation → spec → synthesis'], a: 0, w: '' },
      { d: 'Easy', q: 'Synthesis produces…', o: ['a gate-level netlist and reports', 'RTL', 'a specification', 'a testbench'], a: 0, w: '' },
      { d: 'Easy', q: 'Negative slack in the report means…', o: ['timing met', 'timing failed', 'no latches', 'low power'], a: 1, w: '' },
      { d: 'Medium', q: 'A 4-bit ALU computing 5 − 3 gives…', o: ['8', '2', '15', '−2'], a: 1, w: '' },
      { d: 'Medium', q: 'UART 8N1 sends data bits…', o: ['MSB first', 'LSB first', 'in parallel', 'twice'], a: 1, w: '' },
      { d: 'Medium', q: 'GCD(12, 18) =', o: ['3', '6', '12', '2'], a: 1, w: '' },
      { d: 'Medium', q: 'A FIFO is empty when…', o: ['wptr == rptr (including the wrap bit)', 'wptr[4] != rptr[4]', 'full = 1', 'the clock stops'], a: 0, w: '' },
      { d: 'Hard', q: 'Delay 6.8 ns, 200 MHz, timing effort (×0.7): slack ≈', o: ['+0.24 ns', '−1.8 ns', '+5 ns', '0'], a: 0, w: '5 − 4.76.' },
      { d: 'Hard', q: 'Which run will use the most area?', o: ['area-optimised at 100 MHz', 'timing-optimised at 400 MHz', 'both equal', 'area-optimised at 200 MHz'], a: 1, w: '' },
      { d: 'Hard', q: 'After the report, physical design uses…', o: ['the gate-level netlist and constraints', 'only the RTL', 'only the testbench', 'the specification text'], a: 0, w: '' }
    ]
  });
})();
