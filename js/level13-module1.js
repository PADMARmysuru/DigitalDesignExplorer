/* Level 13 · Module 1 – Processor Architecture Fundamentals */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var SLOTS = [
    { id: 'pc', x: 10, y: 120, w: 70, n: 'PC', why: 'holds the address of the current instruction' },
    { id: 'add', x: 10, y: 30, w: 70, n: 'PC + 4 adder', why: 'computes the address of the next sequential instruction' },
    { id: 'im', x: 110, y: 110, w: 100, n: 'Instruction memory', why: 'returns the instruction stored at the PC address' },
    { id: 'ctl', x: 240, y: 20, w: 110, n: 'Control unit', why: 'decodes the opcode and sets every mux, enable and ALU operation' },
    { id: 'rf', x: 240, y: 110, w: 110, n: 'Register file', why: 'reads two source registers and writes one result' },
    { id: 'alu', x: 380, y: 110, w: 80, n: 'ALU', why: 'performs arithmetic/logic, computes addresses and compares for branches' },
    { id: 'dm', x: 490, y: 110, w: 100, n: 'Data memory', why: 'is read by loads and written by stores' },
    { id: 'mux', x: 490, y: 210, w: 100, n: 'Write-back mux', why: 'chooses ALU result or loaded data to write back to the register file' }
  ];

  /* ---------- Widget: build a processor ---------- */
  function buildLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Build a processor · tap a component, then its place in the datapath</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var placed = {}, sel = null, done = false, order = SLOTS.map(function (s) { return s.id; }).sort(function () { return Math.random() - 0.5; });
    var tray = L.h('div', 'l7-row'); body.appendChild(tray);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      tray.innerHTML = '';
      order.forEach(function (id) { if (placed[id]) return; var s = SLOTS.filter(function (q) { return q.id === id; })[0]; tray.appendChild(L.btn(s.n, sel === id ? 'is-on' : 'pri', function () { sel = id; draw(); })); });
      var o = P('M80 145H110M210 140H240M350 135H380M460 135H490M590 135V230M540 210V170M490 235H230V165M45 120V80M45 55H45', 'w-on') + P('M295 70V110M295 45H350', 'w-thin');
      SLOTS.forEach(function (s) {
        var f = placed[s.id];
        o += '<g class="click" data-id="' + s.id + '" role="button" tabindex="0">' + R(s.x, s.y, s.w, 50, f ? 'box-ok' : 'box', 10) + T(s.x + s.w / 2, s.y + 30, f ? s.n : '?', f ? 't-ink t-b t-sm' : 't-dim t-b') + '</g>';
      });
      pic.innerHTML = S(600, 280, o, 'Single-cycle datapath');
      L.$$('g.click', pic).forEach(function (g) {
        g.addEventListener('click', function () {
          var id = g.getAttribute('data-id'); if (placed[id]) return;
          if (!sel) { L.fb(fb, 'info', 'First tap a component above.'); return; }
          var s = SLOTS.filter(function (q) { return q.id === id; })[0], w = SLOTS.filter(function (q) { return q.id === sel; })[0];
          if (sel === id) { placed[id] = 1; sel = null; L.fb(fb, 'ok', '✓ ' + s.n + ' – it ' + s.why + '.'); draw(); }
          else L.fb(fb, 'bad', '✗ The ' + w.n + ' ' + w.why + ' – it does not belong here.');
        });
      });
      if (Object.keys(placed).length === SLOTS.length && !done) { done = true; api.done(); L.fb(fb, 'ok', '🎉 Complete single-cycle datapath: PC → instruction memory → register file → ALU → data memory → write-back, steered by the control unit.'); }
    }
    draw();
  }

  /* ---------- Widget: walk an instruction through the five steps ---------- */
  var INS = {
    add: { n: 'add r3, r1, r2', st: [['pc', 'im', 'add'], ['ctl', 'rf'], ['alu'], [], ['mux', 'rf']], d: ['Fetch the instruction at PC; PC ← PC + 4', 'Decode: control sees ADD; read r1 and r2', 'Execute: ALU computes r1 + r2', 'Memory: nothing to do for an ALU instruction', 'Write-back: ALU result → r3'] },
    lw: { n: 'lw r4, 8(r1)', st: [['pc', 'im', 'add'], ['ctl', 'rf'], ['alu'], ['dm'], ['mux', 'rf']], d: ['Fetch the instruction; PC ← PC + 4', 'Decode: control sees LOAD; read base register r1', 'Execute: ALU computes the address r1 + 8', 'Memory: read data memory at that address', 'Write-back: loaded data → r4 (mux selects memory)'] },
    beq: { n: 'beq r1, r2, label', st: [['pc', 'im', 'add'], ['ctl', 'rf'], ['alu', 'pc'], [], []], d: ['Fetch the instruction; PC ← PC + 4', 'Decode: control sees BRANCH; read r1 and r2', 'Execute: ALU compares r1 and r2; if equal, PC ← branch target', 'Memory: not used', 'Write-back: no register is written'] }
  };
  function walkLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Instruction walk · fetch → decode → execute → memory → write-back</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var ins = 'add', step = 0, seen = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bt = {}; Object.keys(INS).forEach(function (k) { bt[k] = L.btn(INS[k].n, '', function () { ins = k; step = 0; draw(); }); row.appendChild(bt[k]); });
    var row2 = L.h('div', 'l7-row'); body.appendChild(row2);
    row2.appendChild(L.btn('◀ Previous step', 'ghost', function () { step = Math.max(0, step - 1); draw(); }));
    row2.appendChild(L.btn('Next step ▶', 'pri', function () { step = Math.min(4, step + 1); draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      Object.keys(bt).forEach(function (k) { bt[k].classList.toggle('is-on', k === ins); });
      var I = INS[ins], act = I.st[step], o = '';
      ['IF', 'ID', 'EX', 'MEM', 'WB'].forEach(function (s, i) { o += R(10 + i * 118, 6, 108, 26, i === step ? 'box-on' : i < step ? 'box-ok' : 'box', 8) + T(64 + i * 118, 24, s, 't-ink t-b t-sm'); });
      SLOTS.forEach(function (s) { var on = act.indexOf(s.id) >= 0; o += R(s.x, s.y + 30, s.w, 46, on ? 'box-cu' : 'box', 8) + T(s.x + s.w / 2, s.y + 58, s.n, on ? 't-ink t-b t-sm' : 't-dim t-sm'); });
      pic.innerHTML = S(600, 300, o, 'Active units');
      seen[ins + step] = 1;
      var all = Object.keys(INS).every(function (k) { return [0, 1, 2, 3, 4].every(function (i) { return seen[k + i]; }); });
      L.fb(fb, all ? 'ok' : 'info', '<b>' + ['Fetch', 'Decode', 'Execute', 'Memory', 'Write-back'][step] + ':</b> ' + I.d[step] + (all ? ' 🎉 All three instructions walked through.' : ''));
      if (all && !done) { done = true; api.done(); }
    }
    draw();
  }

  function cpuFrame(k) {
    var o = '', items = [['Datapath', 'registers, ALU, memories, buses – where data flows'], ['Control', 'decodes instructions and steers the datapath'], ['Memory interface', 'instruction and data memory access'], ['Clock', 'one instruction per (long) cycle in a single-cycle CPU']];
    items.forEach(function (it, i) { o += R(30, 14 + i * 40, 540, 32, i === k ? 'box-on' : 'box', 8) + T(46, 35 + i * 40, it[0] + ' – ' + it[1], i === k ? 't-ink t-b t-sm' : 't-dim t-sm', 'start'); });
    return S(600, 180, o, 'CPU organisation');
  }

  L.module({
    n: 1,
    lead: 'Every processor – from a tiny microcontroller to a server CPU – is built from the same ideas: a datapath that moves and transforms data, and a control unit that steers it, one instruction at a time. Build one and watch instructions flow through it.',
    tags: ['CPU organisation', 'datapath', 'control', 'PC', 'register file', 'ALU', 'memories', 'fetch–decode–execute–memory–write-back'],
    sections: [
      {
        id: 'st-cpu', type: 'steps', title: 'Animation: the parts of a CPU', nav: 'CPU organisation',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['The <b>datapath</b> holds and transforms data.', 'The <b>control unit</b> turns each opcode into control signals.', 'The <b>memory interface</b> fetches instructions and loads/stores data.', 'In a <b>single-cycle</b> CPU every instruction completes in one clock cycle – so the clock must be as slow as the slowest instruction.'][k], svg: cpuFrame(k) }; })
      },
      { id: 'w-build', type: 'widget', title: 'Build a processor', nav: 'Build a processor', intro: 'Place all eight components of a single-cycle RISC datapath.', build: buildLab },
      {
        id: 'c-steps', type: 'concept', title: 'The five steps of every instruction', nav: 'Five steps',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Step</th><th>What happens</th><th>Units used</th></tr><tr><td>Fetch (IF)</td><td>read instruction at PC, PC ← PC + 4</td><td>PC, instruction memory, adder</td></tr><tr><td>Decode (ID)</td><td>decode opcode, read registers</td><td>control, register file</td></tr><tr><td>Execute (EX)</td><td>compute result / address / comparison</td><td>ALU</td></tr><tr><td>Memory (MEM)</td><td>load or store</td><td>data memory</td></tr><tr><td>Write-back (WB)</td><td>write result to a register</td><td>mux, register file</td></tr></table></div>'
      },
      { id: 'w-walk', type: 'widget', title: 'Instruction walk', nav: 'Instruction walk', intro: 'Step each of the three instructions through all five steps and watch which units work.', build: walkLab },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: processor insights', nav: 'Reveal',
        items: [
          { q: 'Why separate instruction and data memory?', a: 'So an instruction can be fetched and data accessed in the same cycle (Harvard style; real CPUs use separate L1 caches).' },
          { q: 'Why is a single-cycle CPU slow?', a: 'The clock period must fit the slowest instruction (a load uses every unit), so fast instructions waste time – pipelining fixes this (Module 2).' },
          { q: 'What does the control unit really produce?', a: 'Mux selects, register/memory write enables and the ALU operation – a few bits decoded from the opcode.' },
          { q: 'How does this connect to Level 9?', a: 'Each block is written in RTL and synthesised; the control unit is an FSM or combinational decoder.' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: which step?', nav: 'Drag & drop',
        bins: ['Fetch', 'Decode', 'Execute', 'Memory', 'Write-back'],
        items: [['PC ← PC + 4', 0], ['read source registers', 1], ['ALU adds base + offset', 2], ['load reads data memory', 3], ['result written to rd', 4]]
      },
      {
        id: 'calc1', type: 'calc', title: 'Datapath timing', nav: 'Calculate',
        items: [
          { q: 'Delays: IM 200, RF 100, ALU 150, DM 200, WB mux+RF 100 ps. Single-cycle clock period for a load (ps)?', a: 750, h: 'Sum all.', s: '<b>750 ps</b>.' },
          { q: 'What is the maximum clock frequency (MHz, nearest integer)?', a: 1333, tol: 0.01, h: '1 / 750 ps.', s: '≈ <b>1333 MHz</b>.' },
          { q: 'An add skips data memory. How long would it need (ps)?', a: 550, h: '750 − 200.', s: '<b>550 ps</b> – but it still gets the full 750 ps cycle.' }
        ]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The PC holds…', o: ['the address of the current instruction', 'the ALU result', 'data memory', 'the opcode'], a: 0, w: '' },
          { q: 'Which unit computes a load address?', o: ['ALU', 'data memory', 'control unit', 'PC adder'], a: 0, w: '' },
          { q: 'A branch instruction normally writes…', o: ['no register (it may change the PC)', 'two registers', 'data memory', 'the opcode'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A single-cycle CPU must run at 1.3 GHz, but loads need 750 ps.', q: 'What is the architectural fix?', o: [{ t: 'Pipeline the datapath so each stage is short', ok: true, w: 'Module 2.' }, { t: 'Remove the register file', ok: false, w: 'Impossible.' }, { t: 'Delete load instructions', ok: false, w: 'Programs need loads.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The control unit…', o: ['decodes instructions and steers the datapath', 'stores data', 'adds numbers', 'holds the PC'], a: 0, w: '' },
      { d: 'Easy', q: 'The register file usually reads… registers per cycle', o: ['two', 'one', 'eight', 'zero'], a: 0, w: '' },
      { d: 'Easy', q: 'The five steps are…', o: ['IF, ID, EX, MEM, WB', 'IF, EX, ID, WB, MEM', 'ID, IF, EX, WB, MEM', 'EX, MEM, WB, IF, ID'], a: 0, w: '' },
      { d: 'Medium', q: 'A load uses data memory in…', o: ['MEM', 'EX', 'ID', 'IF'], a: 0, w: '' },
      { d: 'Medium', q: 'The write-back mux selects between…', o: ['ALU result and loaded data', 'two PCs', 'two opcodes', 'clock and reset'], a: 0, w: '' },
      { d: 'Medium', q: 'Single-cycle period = 800 ps → frequency =', o: ['1.25 GHz', '800 MHz', '1.8 GHz', '125 MHz'], a: 0, w: '' },
      { d: 'Medium', q: 'Which instruction uses every stage?', o: ['load', 'add', 'branch', 'nop'], a: 0, w: '' },
      { d: 'Hard', q: 'Why does a single-cycle CPU waste time?', o: ['every instruction gets the slowest instruction\'s cycle', 'it has no ALU', 'it uses two memories', 'it has no control'], a: 0, w: '' },
      { d: 'Hard', q: 'For beq, the ALU…', o: ['compares the two registers', 'reads memory', 'writes a register', 'is unused'], a: 0, w: '' },
      { d: 'Hard', q: 'PC + 4 assumes…', o: ['4-byte instructions', '4 registers', '4 stages', '4 GHz'], a: 0, w: '' }
    ]
  });
})();
