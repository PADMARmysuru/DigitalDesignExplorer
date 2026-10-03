/* Level 9 · Module 4 – RTL FSM Design (with interactive FSM builder) */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path, esc = L.esc;

  var EXAMPLES = {
    seq101: { name: '"101" sequence detector (Moore)', type: 'moore', inputs: 'x', outputs: 'z',
      states: [['S0', 'z=0'], ['S1', 'z=0'], ['S10', 'z=0'], ['S101', 'z=1']],
      trans: [['S0', 'S1', 'x'], ['S0', 'S0', '!x'], ['S1', 'S1', 'x'], ['S1', 'S10', '!x'], ['S10', 'S101', 'x'], ['S10', 'S0', '!x'], ['S101', 'S1', 'x'], ['S101', 'S10', '!x']] },
    seq101m: { name: '"101" sequence detector (Mealy)', type: 'mealy', inputs: 'x', outputs: 'z',
      states: [['S0', ''], ['S1', ''], ['S10', '']],
      trans: [['S0', 'S1', 'x', 'z=0'], ['S0', 'S0', '!x', 'z=0'], ['S1', 'S1', 'x', 'z=0'], ['S1', 'S10', '!x', 'z=0'], ['S10', 'S1', 'x', 'z=1'], ['S10', 'S0', '!x', 'z=0']] },
    traffic: { name: 'Traffic-light controller (Moore)', type: 'moore', inputs: 't_done', outputs: 'red, yellow, green',
      states: [['GREEN', 'red=0 yellow=0 green=1'], ['YELLOW', 'red=0 yellow=1 green=0'], ['RED', 'red=1 yellow=0 green=0']],
      trans: [['GREEN', 'YELLOW', 't_done'], ['YELLOW', 'RED', 't_done'], ['RED', 'GREEN', 't_done']] },
    uart: { name: 'UART transmitter controller (Moore)', type: 'moore', inputs: 'start, bit_done, last_bit', outputs: 'busy, shift, tx_start, tx_stop',
      states: [['IDLE', 'busy=0 shift=0 tx_start=0 tx_stop=0'], ['START', 'busy=1 shift=0 tx_start=1 tx_stop=0'], ['DATA', 'busy=1 shift=1 tx_start=0 tx_stop=0'], ['STOP', 'busy=1 shift=0 tx_start=0 tx_stop=1']],
      trans: [['IDLE', 'START', 'start'], ['START', 'DATA', 'bit_done'], ['DATA', 'STOP', 'bit_done && last_bit'], ['STOP', 'IDLE', 'bit_done']] }
  };

  function ident(s) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s); }
  function outPairs(txt) {
    return String(txt || '').split(/[\s,;]+/).filter(Boolean).map(function (p) { var m = p.split('='); return [m[0].trim(), (m[1] || '0').trim()]; }).filter(function (p) { return ident(p[0]); });
  }

  /* ---------- Widget: FSM builder ---------- */
  function builder(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>FSM builder · states → transitions → state table → RTL</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var fsm = { type: 'moore', inputs: 'x', outputs: 'z', states: [], trans: [] }, enc = 'binary', gen = { table: false, rtl: false };

    // --- toolbar
    var tb = L.h('div', 'l7-row'); body.appendChild(tb);
    L.select(tb, 'Load example', [['', '— choose —']].concat(Object.keys(EXAMPLES).map(function (k) { return [k, EXAMPLES[k].name]; })), '', function (v) { if (v) load(EXAMPLES[v]); });
    var bMoore = L.btn('Moore', 'is-on', function () { fsm.type = 'moore'; draw(); }), bMealy = L.btn('Mealy', '', function () { fsm.type = 'mealy'; draw(); });
    tb.appendChild(bMoore); tb.appendChild(bMealy);
    tb.appendChild(L.btn('Clear', 'ghost', function () { fsm = { type: fsm.type, inputs: '', outputs: '', states: [], trans: [] }; gen = { table: false, rtl: false }; draw(); }));

    // --- 1. inputs / outputs
    var io = L.h('div', 'l7-grid2'); body.appendChild(io);
    function field(parent, label, key, ph) {
      var w = L.h('label', ''); w.style.display = 'block';
      w.appendChild(L.h('span', 'l7-lab-label', label));
      var inp = document.createElement('input'); inp.className = 'l7-input'; inp.style.width = '100%'; inp.placeholder = ph;
      inp.addEventListener('input', function () { fsm[key] = inp.value; draw(true); });
      w.appendChild(inp); parent.appendChild(w); return inp;
    }
    var inIn = field(io, '① Inputs (comma-separated)', 'inputs', 'e.g. x, start');
    var inOut = field(io, '② Outputs (comma-separated)', 'outputs', 'e.g. z, busy');

    // --- 2. states
    body.appendChild(L.h('h4', '', '③ States'));
    var stList = L.h('div', ''); body.appendChild(stList);
    var stRow = L.h('div', 'l7-row'); body.appendChild(stRow);
    var stName = document.createElement('input'); stName.className = 'l7-input'; stName.placeholder = 'state name';
    var stOut = document.createElement('input'); stOut.className = 'l7-input'; stOut.style.width = '220px'; stOut.placeholder = 'Moore outputs, e.g. z=1';
    stRow.appendChild(stName); stRow.appendChild(stOut);
    stRow.appendChild(L.btn('+ Add state', 'pri', function () {
      var n = stName.value.trim().toUpperCase();
      if (!ident(n)) { msg('bad', 'State names must be identifiers (letters, digits, _).'); return; }
      if (fsm.states.some(function (s) { return s[0] === n; })) { msg('bad', 'State ' + n + ' already exists.'); return; }
      fsm.states.push([n, stOut.value.trim()]); stName.value = ''; stOut.value = ''; draw();
    }));

    // --- 3. transitions
    body.appendChild(L.h('h4', '', '④ Transitions'));
    var trList = L.h('div', ''); body.appendChild(trList);
    var trRow = L.h('div', 'l7-row'); body.appendChild(trRow);
    var selFrom = document.createElement('select'), selTo = document.createElement('select');
    var cond = document.createElement('input'); cond.className = 'l7-input'; cond.placeholder = 'condition, e.g. x or !x';
    var tOut = document.createElement('input'); tOut.className = 'l7-input'; tOut.placeholder = 'Mealy output, e.g. z=1';
    trRow.appendChild(L.h('span', 'l7-lab-label', 'from')); trRow.appendChild(selFrom); trRow.appendChild(L.h('span', 'l7-lab-label', 'to')); trRow.appendChild(selTo); trRow.appendChild(cond); trRow.appendChild(tOut);
    trRow.appendChild(L.btn('+ Add transition', 'pri', function () {
      if (!selFrom.value || !selTo.value) { msg('bad', 'Add at least one state first.'); return; }
      if (!cond.value.trim()) { msg('bad', 'Enter the condition (an expression of the inputs), e.g. x or !x.'); return; }
      fsm.trans.push([selFrom.value, selTo.value, cond.value.trim(), tOut.value.trim()]); cond.value = ''; tOut.value = ''; draw();
    }));

    // --- 4. encoding + generate
    var genRow = L.h('div', 'l7-row'); genRow.style.marginTop = '14px'; body.appendChild(genRow);
    L.select(genRow, '⑤ State encoding', [['binary', 'Binary'], ['gray', 'Gray'], ['onehot', 'One-hot']], 'binary', function (v) { enc = v; draw(); });
    genRow.appendChild(L.btn('⑥ Generate state table', 'pri', function () { gen.table = true; draw(); check(); }));
    genRow.appendChild(L.btn('⑦ Generate RTL', 'pri', function () { gen.rtl = true; draw(); check(); }));

    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var tblBox = L.h('div', ''); body.appendChild(tblBox);
    var rtlBox = L.h('div', ''); body.appendChild(rtlBox);
    function msg(k, t) { L.fb(fb, k, t); }

    function load(ex) {
      fsm = { type: ex.type, inputs: ex.inputs, outputs: ex.outputs, states: ex.states.map(function (s) { return s.slice(); }), trans: ex.trans.map(function (t) { return t.slice(); }) };
      gen = { table: false, rtl: false }; draw(); msg('info', 'Example loaded. Change it if you like, then generate the state table and the RTL.');
    }
    function codes() {
      var n = fsm.states.length, bits = enc === 'onehot' ? n : Math.max(1, Math.ceil(Math.log2(Math.max(n, 2))));
      return { bits: bits, of: function (i) { var v = enc === 'onehot' ? (1 << i) : enc === 'gray' ? (i ^ (i >> 1)) : i; var s = v.toString(2); while (s.length < bits) s = '0' + s; return s; } };
    }
    function issues() {
      var out = [], names = fsm.states.map(function (s) { return s[0]; });
      fsm.states.forEach(function (s, i) {
        if (!fsm.trans.some(function (t) { return t[0] === s[0]; })) out.push(s[0] + ' has no outgoing transitions (it can never be left).');
        if (i > 0 && !fsm.trans.some(function (t) { return t[1] === s[0] && t[0] !== s[0]; })) out.push(s[0] + ' is unreachable from any other state.');
      });
      fsm.trans.forEach(function (t) { if (names.indexOf(t[0]) < 0 || names.indexOf(t[1]) < 0) out.push('A transition refers to a deleted state.'); });
      return out;
    }
    function rtl() {
      var c = codes(), ins = fsm.inputs.split(/[\s,]+/).filter(ident), outs = fsm.outputs.split(/[\s,]+/).filter(ident), w = c.bits;
      var t = 'module fsm (\n  input  logic clk, rst_n' + (ins.length ? ',\n  input  logic ' + ins.join(', ') : '') + (outs.length ? ',\n  output logic ' + outs.join(', ') : '') + ');\n\n';
      t += '  typedef enum logic [' + (w - 1) + ':0] {\n' + fsm.states.map(function (s, i) { return '    ' + s[0] + ' = ' + w + "'b" + c.of(i); }).join(',\n') + '\n  } state_t;\n  state_t state, next;\n\n';
      t += '  // state register\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) state <= ' + (fsm.states[0] ? fsm.states[0][0] : 'S0') + ';\n    else        state <= next;\n\n';
      t += '  // next-state' + (fsm.type === 'mealy' ? ' and Mealy output' : '') + ' logic\n  always_comb begin\n    next = state;            // default: stay\n';
      if (fsm.type === 'mealy') outs.forEach(function (o) { t += '    ' + o + " = 1'b0;\n"; });
      t += '    unique case (state)\n';
      fsm.states.forEach(function (s) {
        var tr = fsm.trans.filter(function (x) { return x[0] === s[0]; });
        t += '      ' + s[0] + ':';
        if (!tr.length) { t += ' ;                   // no transitions\n'; return; }
        t += '\n';
        tr.forEach(function (x, k) {
          var mo = fsm.type === 'mealy' ? outPairs(x[3]).filter(function (p) { return p[1] !== '0'; }).map(function (p) { return ' ' + p[0] + " = 1'b" + (p[1] === '1' ? '1' : p[1]) + ';'; }).join('') : '';
          t += '        ' + (k ? 'else if' : 'if') + ' (' + x[2] + ') begin next = ' + x[1] + ';' + mo + ' end\n';
        });
      });
      t += '      default: next = ' + (fsm.states[0] ? fsm.states[0][0] : 'S0') + ';\n    endcase\n  end\n';
      if (fsm.type === 'moore') {
        t += '\n  // Moore outputs: depend on the state only\n  always_comb begin\n' + outs.map(function (o) { return '    ' + o + " = 1'b0;\n"; }).join('') + '    unique case (state)\n';
        fsm.states.forEach(function (s) { var ps = outPairs(s[1]).filter(function (p) { return p[1] !== '0'; }); if (ps.length) t += '      ' + s[0] + ': begin' + ps.map(function (p) { return ' ' + p[0] + " = 1'b" + (p[1] === '1' ? '1' : p[1]) + ';'; }).join('') + ' end\n'; });
        t += '      default: ;\n    endcase\n  end\n';
      }
      return t + 'endmodule';
    }
    function diagram() {
      var n = fsm.states.length; if (!n) return '';
      var W = 600, H = 300, cx = 300, cy = 150, r = n === 1 ? 0 : Math.min(110, 40 + n * 18), pos = {}, o = '';
      o += '<defs><marker id="fsmArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#6e6e73"/></marker></defs>';
      fsm.states.forEach(function (s, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; pos[s[0]] = [cx + r * 1.6 * Math.cos(a), cy + r * Math.sin(a)]; });
      fsm.trans.forEach(function (t) {
        var a = pos[t[0]], b = pos[t[1]]; if (!a || !b) return;
        var lbl = t[2] + (fsm.type === 'mealy' && t[3] ? ' / ' + t[3] : '');
        if (t[0] === t[1]) { o += '<path d="M' + (a[0] - 10) + ' ' + (a[1] - 26) + 'C' + (a[0] - 40) + ' ' + (a[1] - 75) + ' ' + (a[0] + 40) + ' ' + (a[1] - 75) + ' ' + (a[0] + 10) + ' ' + (a[1] - 26) + '" class="w" fill="none" marker-end="url(#fsmArr)"/>' + T(a[0], a[1] - 68, esc(lbl), 't-cu t-sm'); return; }
        var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / d, uy = dy / d, nx = -uy * 18, ny = ux * 18;
        var x1 = a[0] + ux * 30, y1 = a[1] + uy * 30, x2 = b[0] - ux * 30, y2 = b[1] - uy * 30, mx = (x1 + x2) / 2 + nx, my = (y1 + y2) / 2 + ny;
        o += '<path d="M' + x1 + ' ' + y1 + 'Q' + mx + ' ' + my + ' ' + x2 + ' ' + y2 + '" class="w" fill="none" marker-end="url(#fsmArr)"/>' + T(mx + nx * 0.4, my + ny * 0.4, esc(lbl), 't-cu t-sm');
      });
      fsm.states.forEach(function (s, i) {
        var p = pos[s[0]];
        o += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="28" class="' + (i === 0 ? 'box-vio' : 'box-on') + '"/>' + T(p[0], p[1] + (fsm.type === 'moore' && s[1] ? -2 : 4), esc(s[0]), 't-ink t-b t-sm');
        if (fsm.type === 'moore' && s[1]) o += T(p[0], p[1] + 13, esc(outPairs(s[1]).filter(function (q) { return q[1] !== '0'; }).map(function (q) { return q[0] + '=' + q[1]; }).join(' ') || '–'), 't-dim t-sm');
      });
      o += T(10, 290, 'purple = reset state', 't-dim t-sm', 'start');
      return S(W, H, o, 'State diagram');
    }
    function draw(keepInputs) {
      bMoore.classList.toggle('is-on', fsm.type === 'moore'); bMealy.classList.toggle('is-on', fsm.type === 'mealy');
      if (!keepInputs) { inIn.value = fsm.inputs; inOut.value = fsm.outputs; }
      tOut.style.display = fsm.type === 'mealy' ? '' : 'none'; stOut.style.display = fsm.type === 'moore' ? '' : 'none';
      var opts = fsm.states.map(function (s) { return '<option>' + esc(s[0]) + '</option>'; }).join('');
      var f0 = selFrom.value, t0 = selTo.value; selFrom.innerHTML = opts; selTo.innerHTML = opts; if (f0) selFrom.value = f0; if (t0) selTo.value = t0;
      stList.innerHTML = '';
      fsm.states.forEach(function (s, i) {
        var r = L.h('div', 'l7-row'); r.style.alignItems = 'center'; r.style.margin = '4px 0';
        r.appendChild(L.h('span', 'l7-mono', '<b>' + esc(s[0]) + '</b>' + (i === 0 ? ' (reset)' : '') + (fsm.type === 'moore' ? ' · ' + esc(s[1] || 'no outputs set') : '')));
        r.appendChild(L.btn('✕', 'ghost', function () { var nm = s[0]; fsm.states.splice(i, 1); fsm.trans = fsm.trans.filter(function (t) { return t[0] !== nm && t[1] !== nm; }); draw(); }));
        stList.appendChild(r);
      });
      trList.innerHTML = '';
      fsm.trans.forEach(function (t, i) {
        var r = L.h('div', 'l7-row'); r.style.alignItems = 'center'; r.style.margin = '4px 0';
        r.appendChild(L.h('span', 'l7-mono', esc(t[0]) + ' → ' + esc(t[1]) + ' when <b>' + esc(t[2]) + '</b>' + (fsm.type === 'mealy' && t[3] ? ' / ' + esc(t[3]) : '')));
        r.appendChild(L.btn('✕', 'ghost', function () { fsm.trans.splice(i, 1); draw(); }));
        trList.appendChild(r);
      });
      pic.innerHTML = diagram() || '<p class="l7-hint" style="padding:16px">Add states (or load an example) to see the state diagram.</p>';
      var c = codes();
      if (gen.table && fsm.states.length) {
        var rows = '';
        fsm.states.forEach(function (s, i) {
          var tr = fsm.trans.filter(function (t) { return t[0] === s[0]; });
          if (!tr.length) rows += '<tr><td>' + esc(s[0]) + '</td><td>' + c.of(i) + '</td><td>–</td><td>' + esc(s[0]) + '</td><td>' + esc(fsm.type === 'moore' ? s[1] : '') + '</td></tr>';
          tr.forEach(function (t, k) { rows += '<tr><td>' + (k ? '' : esc(s[0])) + '</td><td>' + (k ? '' : c.of(i)) + '</td><td class="l7-mono">' + esc(t[2]) + '</td><td>' + esc(t[1]) + '</td><td>' + esc(fsm.type === 'moore' ? (k ? '' : s[1]) : t[3]) + '</td></tr>'; });
        });
        tblBox.innerHTML = '<h4>State table (' + (enc === 'onehot' ? 'one-hot' : enc) + ' encoding · ' + c.bits + ' flip-flop' + (c.bits > 1 ? 's' : '') + ')</h4><div class="l7-table-wrap"><table class="l7-table"><tr><th>Present state</th><th>Code</th><th>Condition</th><th>Next state</th><th>' + (fsm.type === 'moore' ? 'Output (state)' : 'Output (transition)') + '</th></tr>' + rows + '</table></div>';
      } else tblBox.innerHTML = '';
      rtlBox.innerHTML = gen.rtl && fsm.states.length ? '<h4>Generated SystemVerilog RTL</h4>' + L.code(rtl()) : '';
      var is = issues();
      if (fsm.states.length) msg(is.length ? 'bad' : 'info', is.length ? '⚠️ ' + is.join('<br>⚠️ ') : fsm.states.length + ' states, ' + fsm.trans.length + ' transitions, ' + c.bits + ' state flip-flops with ' + (enc === 'onehot' ? 'one-hot' : enc) + ' encoding. Conditions not listed keep the machine in its current state.');
    }
    function check() {
      if (gen.table && gen.rtl && fsm.states.length >= 3 && fsm.trans.length >= 3) { api.done(); msg('ok', '🎉 State table and RTL generated. Compare the encodings: one-hot uses more flip-flops but simpler next-state logic.'); }
      else if (gen.table && gen.rtl) msg('info', 'Build (or load) a machine with at least 3 states and 3 transitions to complete this lab.');
    }
    load(EXAMPLES.seq101);
  }

  /* ---------- Widget: find the FSM coding error ---------- */
  function bugDrill(root, api) {
    L.drill(root, api, {
      bar: 'Common FSM coding errors · what is wrong?', label: 'FSM code',
      items: [
        { c: 'always_comb\n  case (state)\n    IDLE: if (start) next = RUN;\n    RUN:  if (done)  next = IDLE;\n  endcase', o: ['No default for next: when start/done is 0, next must hold its value → latch', 'case needs unique', 'IDLE and RUN are not enums', 'Nothing is wrong'], a: 0, w: 'Add next = state; at the top of the block (and a default branch).' },
        { c: 'always_ff @(posedge clk)\n  state = next;\nalways_ff @(posedge clk)\n  out <= (state == RUN);', o: ['The state register uses a blocking assignment', 'out should be combinational', 'Two always_ff blocks are not allowed', 'posedge should be negedge'], a: 0, w: 'Use state <= next; non-blocking for every register.' },
        { c: 'always_ff @(posedge clk)\n  if (go) state <= RUN;\nalways_ff @(posedge clk)\n  if (stop) state <= IDLE;', o: ['state is driven by two blocks – multiple drivers', 'go and stop must be registered', 'RUN must be one-hot', 'The code is correct'], a: 0, w: 'Keep all assignments to one signal in a single block (one next-state logic).' },
        { c: 'typedef enum logic [1:0] {A, B, C, D, E} st_t;', o: ['5 states do not fit in 2 bits', 'enums cannot be used for FSMs', 'Names must be lower-case', 'Nothing is wrong'], a: 0, w: '5 states need at least 3 bits (logic [2:0]).' },
        { c: 'always_ff @(posedge clk)       // no reset\n  state <= next;', o: ['No reset: the FSM starts in an unknown state', 'It needs a negedge clock', 'state must be a wire', 'Nothing is wrong'], a: 0, w: 'Every FSM needs a reset to a known state (synchronous or asynchronous, as your methodology requires).' }
      ]
    });
  }

  function encFrame(k) {
    var names = ['IDLE', 'LOAD', 'RUN', 'DONE', 'ERR'], o = '';
    var hdr = ['Binary (3 FFs)', 'Gray (3 FFs)', 'One-hot (5 FFs)'];
    o += T(300, 22, hdr[k] + ' encoding of 5 states', 't-vio t-b');
    names.forEach(function (n, i) {
      var v = k === 2 ? (1 << i) : k === 1 ? (i ^ (i >> 1)) : i, bits = k === 2 ? 5 : 3, s = v.toString(2);
      while (s.length < bits) s = '0' + s;
      o += R(80, 36 + i * 30, 120, 24, 'box', 6) + T(140, 53 + i * 30, n, 't-ink t-b t-sm') + R(240, 36 + i * 30, 120, 24, 'box-on', 6) + T(300, 53 + i * 30, s, 't-ink t-b t-sm');
    });
    o += T(470, 80, ['fewest flip-flops', 'one bit changes', 'one FF per state'][k], 't-cu t-b t-sm') + T(470, 104, ['more decode logic', 'between neighbours', 'simplest logic, fast'][k], 't-dim t-sm');
    return S(600, 196, o, 'State encodings');
  }

  L.module({
    n: 4,
    lead: 'Controllers are FSMs, and FSMs are where RTL bugs hide. Build FSMs interactively, generate their state tables and SystemVerilog, compare encodings, and learn the coding style that synthesizes cleanly every time.',
    tags: ['FSM architecture', 'Moore', 'Mealy', 'state encoding', 'binary / one-hot', 'coding styles', 'FSM optimisation', 'common errors'],
    sections: [
      {
        id: 'c-arch', type: 'concept', title: 'FSM architecture in RTL', nav: 'FSM architecture',
        html: '<p>(You studied FSM theory in Level 2; here the focus is the RTL implementation.) Every synchronous FSM has three parts:</p>' +
          '<div class="l7-grid3"><div class="l7-box vio"><h4>State register</h4><p>always_ff, reset to the start state</p></div><div class="l7-box sig"><h4>Next-state logic</h4><p>always_comb: next = f(state, inputs)</p></div><div class="l7-box cu"><h4>Output logic</h4><p>Moore: f(state) · Mealy: f(state, inputs)</p></div></div>' +
          '<div class="l7-grid2" style="margin-top:12px"><div class="l7-box"><h4>Moore</h4><p>Outputs change only after a clock edge – glitch-free and easy to time. May need one more state.</p></div><div class="l7-box"><h4>Mealy</h4><p>Outputs react to inputs in the same cycle – fewer states, faster response, but inputs ripple straight to outputs.</p></div></div>'
      },
      { id: 'w-build', type: 'widget', title: 'Interactive FSM builder', nav: 'FSM builder', intro: 'Start from an example or build your own: add inputs, outputs, states and transitions, then generate the state table and the RTL. Try every encoding.', build: builder },
      {
        id: 'st-enc', type: 'steps', title: 'Animation: state encodings', nav: 'Encodings',
        frames: [0, 1, 2].map(function (k) { return { t: ['<b>Binary</b>: ⌈log₂N⌉ flip-flops – smallest register, more decoding logic.', '<b>Gray</b>: neighbouring states differ in one bit – useful for counters and sequential FSMs.', '<b>One-hot</b>: one flip-flop per state – next-state logic is very simple and fast; common in FPGAs and for speed-critical controllers.'][k], svg: encFrame(k) }; })
      },
      {
        id: 'c-style', type: 'concept', title: 'FSM coding styles', nav: 'Coding styles',
        html: L.code('typedef enum logic [1:0] {IDLE, RUN, DONE} st_t;\nst_t state, next;\n\nalways_ff @(posedge clk or negedge rst_n)        // 1: state register\n  if (!rst_n) state <= IDLE; else state <= next;\n\nalways_comb begin                               // 2: next state + outputs\n  next = state;  busy = 1\'b0;  done = 1\'b0;     //    defaults first!\n  unique case (state)\n    IDLE: if (start) next = RUN;\n    RUN:  begin busy = 1\'b1; if (last) next = DONE; end\n    DONE: begin done = 1\'b1; next = IDLE; end\n  endcase\nend') +
          '<div class="l7-grid2"><div class="l7-box"><h4>Two-process style</h4><p>One block for the register, one for the combinational logic (shown). Clear and widely used.</p></div><div class="l7-box"><h4>Registered outputs</h4><p>If outputs must be glitch-free or tightly timed, register them as well (a third block), or derive them directly from one-hot state bits.</p></div></div>'
      },
      { id: 'w-bug', type: 'widget', title: 'Find the FSM coding error', nav: 'Error hunt', intro: 'Each fragment has one typical FSM bug. Identify it.', build: bugDrill },
      {
        id: 'c-opt', type: 'concept', title: 'FSM optimisation', nav: 'Optimisation',
        html: '<div class="l7-grid3"><div class="l7-box"><h4>State minimisation</h4><p>Merge equivalent states (same outputs, same next states).</p></div><div class="l7-box"><h4>Encoding choice</h4><p>Let synthesis re-encode (FSM extraction) or choose one-hot for speed, binary for area.</p></div><div class="l7-box"><h4>Output timing</h4><p>Register outputs, or use Moore, when an output drives a long path or another block.</p></div></div>'
      },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: FSM insights', nav: 'Reveal',
        items: [
          { q: 'Why put next = state; at the top of the combinational block?', a: 'It gives next a value on every path, so no latch is inferred and unlisted conditions simply keep the state.' },
          { q: 'What does unique case tell the tool?', a: 'That exactly one branch matches – it may build parallel (non-priority) logic and simulators warn if no branch or several branches match.' },
          { q: 'Why can a Mealy output glitch?', a: 'It depends directly on inputs, so input glitches or changes mid-cycle pass through the combinational output logic.' },
          { q: 'Does the enum value order matter?', a: 'It sets the default binary codes. You can assign explicit codes, or let the synthesis tool re-encode the FSM.' },
          { q: 'How many flip-flops for 12 states, one-hot?', a: '12 – one per state (binary would need 4).' },
          { q: 'What happens in an illegal state (e.g. after a glitch)?', a: 'A default branch that returns to a safe state makes the FSM recover.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: which FSM part?', nav: 'Drag & drop',
        bins: ['State register', 'Next-state logic', 'Output logic'],
        items: [['always_ff with reset to IDLE', 0], ['state <= next;', 0], ['IDLE: if (start) next = RUN;', 1], ['next = state; (default)', 1], ['busy = (state == RUN);', 2], ['Mealy: z = (state == S10) && x;', 2]]
      },
      {
        id: 'calc4', type: 'calc', title: 'Encoding calculations', nav: 'Calculate',
        items: [
          { q: 'How many flip-flops does a 9-state FSM need with binary encoding?', a: 4, h: 'ceil(log2 9).', s: '<b>4</b>.' },
          { q: 'How many flip-flops does the same 9-state FSM need with one-hot encoding?', a: 9, h: 'One per state.', s: '<b>9</b>.' },
          { q: 'In Gray encoding (i XOR i>>1), what is the code of state index 6, as a decimal number?', a: 5, h: '6 = 110, 6>>1 = 011.', s: '110 XOR 011 = 101 = <b>5</b>.' },
          { q: 'A 3-bit binary-encoded FSM uses 5 states. How many codes are unused (illegal states)?', a: 3, h: '2³ − 5.', s: '<b>3</b> – handle them with a default branch.' },
          { q: 'The Moore "101" detector uses 4 states and the Mealy version 3. How many states does Mealy save?', a: 1, h: '4 − 3.', s: '<b>1</b> – the output moves onto the transition.' }
        ]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A Moore output depends on…', o: ['state only', 'state and inputs', 'inputs only', 'the clock only'], a: 0, w: '' },
          { q: 'One-hot encoding of 8 states uses…', o: ['3 FFs', '8 FFs', '4 FFs', '1 FF'], a: 1, w: '' },
          { q: 'Missing "next = state" default in always_comb causes…', o: ['a latch', 'a faster FSM', 'a multiplier', 'nothing'], a: 0, w: '' },
          { q: 'Which style is recommended?', o: ['state register + combinational next-state block', 'one block with blocking assignments for everything', 'latches for state', 'no reset'], a: 0, w: '' }
        ]
      },
      {
        id: 'short4', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Compare binary and one-hot state encoding for an RTL FSM.', k: ['log|fewer|binary', 'one-hot|one flip-flop per state', 'logic|decode|speed|fast', 'area|flip-flop'], m: 'Binary uses the minimum ⌈log₂N⌉ flip-flops but needs more decoding in the next-state and output logic. One-hot uses one flip-flop per state, so it costs more flip-flops, but its next-state logic is simple and fast and outputs often come straight from state bits.' },
          { q: 'List three common FSM coding errors and their fixes.', k: ['latch|default', 'blocking|non-blocking|<=', 'reset', 'multiple|two blocks|driver'], m: 'Missing defaults in the combinational block (latch) – assign next = state and output defaults first; blocking assignments in the state register – use <=; no reset – reset to a known state; assigning state in two blocks (multiple drivers) – keep one next-state block; too few state bits for the enum.' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A controller\'s outputs drive enable pins of a large datapath and timing on those paths is failing.', q: 'Best FSM change?', o: [{ t: 'Register the outputs (or use one-hot Moore outputs taken directly from state bits)', ok: true, w: 'Removes combinational output logic from the critical path.' }, { t: 'Convert to Mealy', ok: false, w: 'That makes outputs depend on inputs – longer paths.' }, { t: 'Remove the reset', ok: false, w: 'Unrelated and unsafe.' }] },
          { s: 'After synthesis, the report shows an "inferred latch" on signal next in the FSM.', q: 'Most likely cause?', o: [{ t: 'Some case branch or if-path does not assign next', ok: true, w: 'Add a default assignment at the top.' }, { t: 'The clock is too fast', ok: false, w: 'Latches come from code, not frequency.' }, { t: 'One-hot encoding', ok: false, w: 'Encoding does not create latches.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The three parts of an RTL FSM are…', o: ['state register, next-state logic, output logic', 'adder, mux, register', 'clock, reset, data', 'RAM, ROM, FIFO'], a: 0, w: '' },
      { d: 'Easy', q: 'Mealy outputs depend on…', o: ['state only', 'state and inputs', 'clock only', 'reset only'], a: 1, w: '' },
      { d: 'Easy', q: 'Which encoding uses one flip-flop per state?', o: ['binary', 'gray', 'one-hot', 'BCD'], a: 2, w: '' },
      { d: 'Medium', q: 'A 6-state FSM in binary needs…', o: ['2 FFs', '3 FFs', '6 FFs', '4 FFs'], a: 1, w: '' },
      { d: 'Medium', q: '<code>typedef enum logic [1:0] {A,B,C,D,E}</code> is wrong because…', o: ['5 values need 3 bits', 'enums need integers', 'names are too short', 'it is fine'], a: 0, w: '' },
      { d: 'Medium', q: 'In always_comb, "next = state;" at the top…', o: ['prevents latches', 'creates a register', 'slows the FSM', 'is illegal'], a: 0, w: '' },
      { d: 'Medium', q: 'Gray code for index 3 (binary 011) is…', o: ['011', '010', '001', '111'], a: 1, w: '3 ^ 1 = 2 = 010.' },
      { d: 'Hard', q: 'Why might a designer register FSM outputs?', o: ['to remove glitches and shorten timing paths', 'to save flip-flops', 'to remove the clock', 'it is required by enums'], a: 0, w: '' },
      { d: 'Hard', q: 'A Mealy "101" detector asserts z…', o: ['one cycle after the last 1', 'in the same cycle the last 1 arrives', 'never', 'two cycles later'], a: 1, w: '' },
      { d: 'Hard', q: 'Assigning state in two always_ff blocks causes…', o: ['a faster FSM', 'multiple drivers', 'one-hot encoding', 'a latch only'], a: 1, w: '' }
    ]
  });
})();
