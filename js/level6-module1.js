/* =========================================================
   Level 6 – Module 1: SystemVerilog Fundamentals
   Interactive activities. Requires js/level6-common.js
   ========================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = L6.esc;

  var ACTIVITIES = ['compare', 'categorize', 'filestruct', 'types', 'fourstate', 'netsvars', 'literals',
    'arrays', 'enum', 'struct', 'union', 'string', 'tryit', 'debug', 'quiz'];

  /* Keys used by this module (change here if your site uses a different naming scheme) */
  var KEY_ACTIVITIES = 'level6_module1_activities';
  var KEY_COMPLETED  = 'level6_module1_completed';
  var KEY_QUIZ       = 'level6_module1_quiz_best';

  function cellClass(v) { return 'l6-cell v' + String(v).toLowerCase(); }
  function mkBtn(label, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'l6-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = label;
    return b;
  }
  function setOn(group, btn) {
    group.forEach(function (b) { b.classList.remove('is-on'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('is-on');
    btn.setAttribute('aria-selected', 'true');
  }
  function setCode(preId, text) {
    var pre = $(preId);
    pre.querySelector('code').innerHTML = L6.highlight(text);
  }
  function toBin(n, w) { var s = (n >>> 0).toString(2); while (s.length < w) s = '0' + s; return s.slice(-w); }
  function toHex(n, w) { var s = (n >>> 0).toString(16).toUpperCase(); while (s.length < w) s = '0' + s; return s.slice(-w); }

  /* =====================================================
     1. Verilog vs SystemVerilog comparison
     ===================================================== */
  function initCompare() {
    var V = [
      'module counter (',
      '  input            clk,',
      '  input            rst_n,',
      '  input            en,',
      '  output reg [3:0] count',
      ');',
      '  always @(posedge clk or negedge rst_n)',
      '    if (!rst_n)   count <= 4\'d0;',
      '    else if (en)  count <= count + 1;',
      'endmodule'
    ];
    var S = [
      'module counter (',
      '  input  logic       clk,',
      '  input  logic       rst_n,',
      '  input  logic       en,',
      '  output logic [3:0] count',
      ');',
      '  always_ff @(posedge clk or negedge rst_n)',
      '    if (!rst_n)   count <= \'0;',
      '    else if (en)  count <= count + 1\'b1;',
      'endmodule'
    ];
    var notes = {
      2: '<b>logic on inputs.</b> Every port gets an explicit type. <code>logic</code> is a 4-state type, like <code>reg</code>, but it can be used almost anywhere.',
      5: '<b>logic replaces reg.</b> In Verilog you had to decide between <code>reg</code> (written in <code>always</code>) and <code>wire</code> (driven by <code>assign</code>). <code>logic</code> works for both, and the name no longer suggests a register that may not exist in hardware.',
      7: '<b>always_ff.</b> States your intent: this block describes flip-flops. The tool warns you if the code inside would not create flip-flops, and forbids other blocks from writing <code>count</code>.',
      8: '<b>\'0 fill literal.</b> Sets every bit to 0, whatever the width. If <code>count</code> grows from 4 to 16 bits later, this line still works without editing.',
      9: '<b>Sized increment.</b> <code>1\'b1</code> makes the width explicit. Plain <code>1</code> also works (it is a 32-bit value), but some lint tools warn about width mismatches.'
    };
    var tabV = $('cmpTabV'), tabS = $('cmpTabS'), note = $('cmpNote');
    var seen = {};

    function show(sv) {
      setOn([tabV, tabS], sv ? tabS : tabV);
      var rows = L6.renderLines($('cmpCode'), sv ? S : V);
      note.className = 'l6-fb';
      if (!sv) return;
      rows.forEach(function (row, i) {
        var ln = i + 1;
        if (ln === 3 || ln === 4) ln = 2; // same note for all input ports
        if (!notes[ln]) return;
        row.classList.add('is-diff');
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.addEventListener('click', function () {
          L6.feedback(note, 'info', notes[ln]);
          seen[ln] = true;
          if (Object.keys(seen).length >= 3) L6.mark('compare');
        });
      });
      L6.feedback(note, 'info', 'Highlighted lines differ from the Verilog version. Click them. (' + Object.keys(notes).length + ' changes)');
    }
    tabV.addEventListener('click', function () { show(false); });
    tabS.addEventListener('click', function () { show(true); });
    show(false);
  }

  /* =====================================================
     2. Categorise features: design / verification / both
     ===================================================== */
  function initCategorize() {
    var items = [
      { f: 'always_ff', a: 'Design', why: 'Describes flip-flops in synthesizable RTL. Testbenches use <code>initial</code> and plain <code>always</code> instead.' },
      { f: 'logic', a: 'Both', why: 'Used for RTL signals and for testbench signals that connect to the DUT.' },
      { f: 'class', a: 'Verification', why: 'Classes create objects at run time. Synthesis tools cannot turn them into hardware.' },
      { f: 'randomize()', a: 'Verification', why: 'Random stimulus generation exists only in simulation.' },
      { f: 'covergroup', a: 'Verification', why: 'Functional coverage measures what your tests exercised. It is not hardware.' },
      { f: 'typedef struct packed', a: 'Both', why: 'Packed structs are synthesizable and equally useful for building transactions in a testbench.' },
      { f: 'unique case', a: 'Design', why: 'Tells synthesis the case items are mutually exclusive, which can simplify the logic, and warns in simulation if they are not.' },
      { f: 'queue [$]', a: 'Verification', why: 'Queues change size at run time. Hardware has a fixed size.' },
      { f: 'package', a: 'Both', why: 'Packages share types, parameters and functions between RTL files and testbench files alike.' },
      { f: 'assert property', a: 'Verification', why: 'Assertions check behaviour during simulation or formal proof. They are often written inside RTL files but are not synthesized into gates.' }
    ];
    var list = $('catList'), scoreEl = $('catScore');
    var answered = 0, right = 0;
    items.forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'l6-choice';
      card.innerHTML = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><code style="font-size:1rem">' + esc(it.f) +
        '</code><div class="l6-btnrow" style="margin:0"></div></div><div class="l6-fb"></div>';
      var row = card.querySelector('.l6-btnrow'), fb = card.querySelector('.l6-fb');
      ['Design', 'Verification', 'Both'].forEach(function (opt) {
        var b = mkBtn(opt);
        b.addEventListener('click', function () {
          row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          answered++;
          if (opt === it.a) {
            right++;
            card.classList.add('is-right');
            b.classList.add('is-on');
            L6.feedback(fb, 'ok', '<span class="l6-pass">✓ ' + it.a + '.</span> ' + it.why);
          } else {
            card.classList.add('is-wrong');
            L6.feedback(fb, 'bad', '<span class="l6-fail">✗ It is ' + it.a + '.</span> ' + it.why);
          }
          scoreEl.textContent = right + ' of ' + answered + ' correct' + (answered === items.length ? ' (all sorted)' : '');
          if (answered === items.length) L6.mark('categorize');
        });
        row.appendChild(b);
      });
      list.appendChild(card);
    });
  }

  /* =====================================================
     3. File structure explorer
     ===================================================== */
  function initFileStructure() {
    var lines = [
      '// ---------- counter_pkg.sv ----------',
      'package counter_pkg;',
      '  typedef enum logic [1:0] {IDLE, COUNT, HOLD} mode_t;',
      '  parameter int WIDTH = 4;',
      'endpackage',
      '',
      '// ---------- counter.sv ----------',
      'import counter_pkg::*;',
      'module counter #(parameter int W = WIDTH) (',
      '  input  logic         clk, rst_n,',
      '  input  mode_t        mode,',
      '  output logic [W-1:0] count',
      ');',
      '  always_ff @(posedge clk or negedge rst_n)',
      '    if (!rst_n)              count <= \'0;',
      '    else if (mode == COUNT)  count <= count + 1\'b1;',
      'endmodule',
      '',
      '// ---------- tb_counter.sv ----------',
      'module tb_counter;',
      '  import counter_pkg::*;',
      '  logic       clk = 0, rst_n;',
      '  mode_t      mode;',
      '  logic [3:0] count;',
      '  counter dut (.*);',
      '  always #5 clk = ~clk;',
      '  initial begin',
      '    rst_n = 0;  mode = IDLE;',
      '    #12 rst_n = 1;  mode = COUNT;',
      '    #100 $display("count = %0d", count);',
      '    $finish;',
      '  end',
      'endmodule'
    ];
    var parts = [
      { n: 'Package', r: [2, 5], t: 'A <b>package</b> holds shared definitions: types, parameters, functions. Both the design and the testbench import it, so they agree on what <code>mode_t</code> means. It contains no hardware by itself.' },
      { n: 'Import', r: [8, 8], t: '<b>import counter_pkg::*;</b> makes every name in the package visible here. The <code>::</code> is the scope operator; you could also write <code>counter_pkg::COUNT</code> without importing.' },
      { n: 'Parameters', r: [9, 9], t: '<b>#(parameter int W = WIDTH)</b> makes the width configurable. Another design can instantiate <code>counter #(.W(8))</code> to get an 8-bit counter from the same code.' },
      { n: 'Ports', r: [10, 13], t: 'The <b>port list</b> uses ANSI style: direction, type and name together. Note the port <code>mode</code> uses the enum type from the package, which catches illegal values at compile time.' },
      { n: 'RTL body', r: [14, 16], t: 'The <b>design logic</b>. <code>always_ff</code> tells the tool this is a flip-flop block. This is the part that becomes hardware.' },
      { n: 'Testbench', r: [20, 33], t: 'The <b>testbench</b> is a module with no ports. It creates signals, a clock, and applies stimulus in an <code>initial</code> block. It is never synthesized.' },
      { n: '.* connection', r: [25, 25], t: '<b>counter dut (.*);</b> connects every port of <code>counter</code> to a signal of the same name in the testbench. It saves typing, but every name must match exactly.' }
    ];
    var rows = L6.renderLines($('fsCode'), lines);
    var box = $('fsButtons'), note = $('fsNote'), btns = [], seen = {};
    parts.forEach(function (p, i) {
      var b = mkBtn(p.n);
      b.addEventListener('click', function () {
        setOn(btns, b);
        rows.forEach(function (row, idx) {
          row.classList.toggle('is-hl', idx + 1 >= p.r[0] && idx + 1 <= p.r[1]);
        });
        rows[p.r[0] - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        L6.feedback(note, 'info', p.t);
        seen[i] = true;
        if (Object.keys(seen).length >= 4) L6.mark('filestruct');
      });
      btns.push(b);
      box.appendChild(b);
    });
  }

  /* =====================================================
     4. Data type explorer
     ===================================================== */
  var TYPES = {
    logic:    { st: 4, w: 'user (default 1)', s: 'unsigned', d: 'X', syn: 'yes', use: 'Default choice for RTL signals and anything that connects to the DUT.', code: 'logic       ready;     // 1 bit\nlogic [7:0] data;      // 8 bits, starts as 8\'bxxxx_xxxx' },
    bit:      { st: 2, w: 'user (default 1)', s: 'unsigned', d: '0', syn: 'yes', use: 'Testbench flags and data where X/Z can never happen. Simulates faster.', code: 'bit       done;\nbit [3:0] nibble;     // starts as 4\'b0000' },
    byte:     { st: 2, w: '8', s: 'signed', d: '0', syn: 'yes', use: 'Byte-sized testbench data. Careful: signed, so the range is −128 to 127.', code: 'byte b = 8\'hFF;       // b == -1, not 255!\nbyte unsigned ub = 8\'hFF;  // ub == 255' },
    shortint: { st: 2, w: '16', s: 'signed', d: '0', syn: 'yes', use: '16-bit testbench counters or data.', code: 'shortint s = -32768;  // minimum value' },
    int:      { st: 2, w: '32', s: 'signed', d: '0', syn: 'yes', use: 'Loop counters and testbench arithmetic. Replaces integer in most testbench code.', code: 'for (int i = 0; i < 8; i++)\n  $display("i = %0d", i);' },
    longint:  { st: 2, w: '64', s: 'signed', d: '0', syn: 'yes', use: 'Large counts such as transaction or cycle counters.', code: 'longint cycles;' },
    integer:  { st: 4, w: '32', s: 'signed', d: 'X', syn: 'yes', use: 'Legacy Verilog type. Same width as int but 4-state, so it starts as X.', code: 'integer i;   // i is 32\'bx until assigned' },
    reg:      { st: 4, w: 'user (default 1)', s: 'unsigned', d: 'X', syn: 'yes', use: 'Legacy Verilog name. In SystemVerilog, reg means exactly the same as logic; prefer logic.', code: 'reg [3:0] q;   // same as logic [3:0] q;' },
    wire:     { st: 4, w: 'user (default 1)', s: 'unsigned', d: 'Z', syn: 'yes', use: 'A net. Needed when a signal has multiple drivers (tri-state buses, inout ports).', code: 'wire [7:0] bus;\nassign bus = oe ? dout : \'z;' },
    time:     { st: 4, w: '64', s: 'unsigned', d: 'X', syn: 'no', use: 'Stores simulation time, e.g. from $time.', code: 'time t_start = $time;' },
    real:     { st: '—', w: '64 (double)', s: 'signed', d: '0.0', syn: 'no', use: 'Floating-point values for models and testbench maths. Not bits at all.', code: 'real vdd = 1.8;' },
    string:   { st: '—', w: 'grows as needed', s: '—', d: '"" (empty)', syn: 'no', use: 'Text for messages and file names in testbenches.', code: 'string name = "ALU test";' }
  };
  function initTypes() {
    var box = $('typeButtons'), panel = $('typePanel'), btns = [], seen = {};
    Object.keys(TYPES).forEach(function (k) {
      var b = mkBtn(k, 'is-mono');
      b.addEventListener('click', function () {
        setOn(btns, b);
        var t = TYPES[k];
        var stClass = t.st === 4 ? 'l6-chip4' : (t.st === 2 ? 'l6-chip2' : '');
        var stTxt = t.st === 4 ? '4-state (0 1 X Z)' : (t.st === 2 ? '2-state (0 1)' : 'not a bit type');
        panel.innerHTML =
          '<div class="l6-typefacts">' +
          '<div class="l6-fact"><b>States</b><span class="' + stClass + '">' + stTxt + '</span></div>' +
          '<div class="l6-fact"><b>Width (bits)</b><span>' + t.w + '</span></div>' +
          '<div class="l6-fact"><b>Signed?</b><span>' + t.s + '</span></div>' +
          '<div class="l6-fact"><b>Starts as</b><span>' + esc(t.d) + '</span></div>' +
          '</div><p><b>Use it for:</b> ' + esc(t.use) + ' <b>Synthesizable:</b> ' + t.syn + '.</p>' +
          '<pre class="l6-code"><code>' + L6.highlight(t.code) + '</code></pre>';
        seen[k] = true;
        if (Object.keys(seen).length >= 5) L6.mark('types');
      });
      btns.push(b);
      box.appendChild(b);
    });
    btns[0].click();
  }

  /* =====================================================
     5. Four-state visualizer, converter and hidden bug
     ===================================================== */
  function initFourState() {
    var states = [
      { v: '0', n: 'logic low', path: 'M0,22 L120,22', color: '#2F6BD2', t: '<b>0: logic low.</b> The signal is driven to ground (0 V). A strong, known value.' },
      { v: '1', n: 'logic high', path: 'M0,4 L120,4', color: '#16924F', t: '<b>1: logic high.</b> The signal is driven to the supply voltage. A strong, known value.' },
      { v: 'x', n: 'unknown', path: '', color: '#D23A3F', t: '<b>X: unknown.</b> The simulator cannot tell whether the value is 0 or 1. Common causes: a register that was never reset, two drivers fighting (one drives 0, the other 1), or maths on an X input. Real hardware is always 0 or 1, so X is the simulator warning you that <i>you</i> don\'t know which.' },
      { v: 'z', n: 'high impedance', path: 'M0,13 L120,13', color: '#C4860A', t: '<b>Z: high impedance.</b> Nothing is driving the wire, as if it were disconnected. Used on purpose in tri-state buses (<code>assign bus = oe ? d : \'z;</code>); by accident, it means an input was left unconnected.' }
    ];
    var box = $('stateButtons'), note = $('stateNote'), btns = [], seen = {};
    states.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'l6-state';
      b.dataset.s = s.v;
      var wave = s.v === 'x'
        ? '<rect x="1" y="4" width="118" height="18" fill="#FBE3E4" stroke="' + s.color + '" stroke-width="2"/>'
        : '<path d="' + s.path + '" stroke="' + s.color + '" stroke-width="3" fill="none"' + (s.v === 'z' ? ' stroke-dasharray="7 5"' : '') + '/>';
      b.innerHTML = '<span class="l6-state-v">' + s.v.toUpperCase() + '</span><span class="l6-state-n">' + s.n +
        '</span><svg viewBox="0 0 120 26" aria-hidden="true">' + wave + '</svg>';
      b.addEventListener('click', function () {
        setOn(btns, b);
        L6.feedback(note, 'info', s.t);
        seen[s.v] = true;
        if (Object.keys(seen).length === 4) L6.mark('fourstate');
      });
      btns.push(b);
      box.appendChild(b);
    });

    /* logic -> bit converter */
    var a = ['1', '0', 'x', '1', 'z', '0', '1', '1'];
    var cycle = { '0': '1', '1': 'x', 'x': 'z', 'z': '0' };
    var convNote = $('convNote');
    function drawConv(changed) {
      var aBox = $('convA'), bBox = $('convB');
      aBox.innerHTML = ''; bBox.innerHTML = '';
      var lost = 0;
      a.forEach(function (v, i) {
        var idx = 7 - i;
        var wa = document.createElement('div'); wa.className = 'l6-cellwrap';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = cellClass(v);
        btn.textContent = v.toUpperCase();
        btn.setAttribute('aria-label', 'a[' + idx + '] = ' + v.toUpperCase() + ', click to change');
        btn.addEventListener('click', function () { a[i] = cycle[a[i]]; drawConv(i); });
        wa.appendChild(btn);
        wa.insertAdjacentHTML('beforeend', '<span class="l6-idx">' + idx + '</span>');
        aBox.appendChild(wa);

        var bv = (v === 'x' || v === 'z') ? '0' : v;
        if (bv !== v) lost++;
        var wb = document.createElement('div'); wb.className = 'l6-cellwrap';
        wb.innerHTML = '<span class="' + cellClass(bv) + (bv !== v && changed === i ? ' is-changed' : '') + '">' + bv + '</span><span class="l6-idx">' + idx + '</span>';
        bBox.appendChild(wb);
      });
      if (lost) L6.feedback(convNote, 'bad', '<b>' + lost + ' bit' + (lost > 1 ? 's' : '') + ' silently became 0.</b> A 2-state type turns X and Z into 0 with no error or warning. The information that something was unknown or undriven is lost.');
      else L6.feedback(convNote, 'ok', 'All bits are 0 or 1, so <code>b</code> is an exact copy of <code>a</code>.');
    }
    drawConv(-1);

    /* hidden bug demo */
    var out = $('bugOut'), bugNote = $('bugNote');
    function showBug(reset) {
      setOn([$('bugResetOff'), $('bugResetOn')], reset ? $('bugResetOn') : $('bugResetOff'));
      var lv = reset ? '0000' : 'xxxx', bv = '0000';
      function row(label, val) {
        return '<div class="l6-card" style="margin:0"><p class="l6-card-title"><code>' + label + '</code></p><div class="l6-bits">' +
          val.split('').map(function (c) { return '<span class="' + cellClass(c) + '">' + c.toUpperCase() + '</span>'; }).join('') + '</div></div>';
      }
      out.innerHTML = row('logic [3:0] q_seen', lv) + row('bit [3:0] q_seen', bv);
      if (reset) L6.feedback(bugNote, 'ok', 'With reset, both variables correctly show 0000.');
      else L6.feedback(bugNote, 'bad', 'The <code>logic</code> version shows XXXX, so you immediately see the missing reset. The <code>bit</code> version shows a clean 0000 and the bug slips through. <b>Always sample DUT outputs with 4-state types.</b>');
    }
    $('bugResetOff').addEventListener('click', function () { showBug(false); });
    $('bugResetOn').addEventListener('click', function () { showBug(true); });
    showBug(false);
  }

  /* =====================================================
     6. Nets vs variables: legal or error
     ===================================================== */
  function initNetsVars() {
    var items = [
      { c: 'logic y;\nassign y = a & b;', ok: true, why: 'A variable may have <b>one</b> continuous driver. This is fine.' },
      { c: 'logic y;\nassign y = a;\nassign y = b;', ok: false, why: 'Two continuous assignments drive the same variable. Only nets can have multiple drivers. Make <code>y</code> a <code>wire</code> if you really want a resolved bus.' },
      { c: 'wire y;\nalways_comb y = a | b;', ok: false, why: 'A net cannot be written in a procedural block (<code>always</code>, <code>initial</code>). Declare <code>y</code> as <code>logic</code>.' },
      { c: 'wire [7:0] bus;\nassign bus = en1 ? d1 : \'z;\nassign bus = en2 ? d2 : \'z;', ok: true, why: 'This is exactly what nets are for: several drivers resolved together. When one driver outputs Z, the other wins.' },
      { c: 'logic q;\nalways_ff @(posedge clk) q <= d;', ok: true, why: 'A variable written by a procedural block. The standard way to model a flip-flop.' },
      { c: 'logic y;\nassign y = a;\nalways_comb y = b;', ok: false, why: 'A variable cannot mix a continuous driver with a procedural one. Pick one.' }
    ];
    var list = $('nvList'), scoreEl = $('nvScore'), answered = 0, right = 0;
    items.forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'l6-choice';
      card.innerHTML = '<pre class="l6-code"><code>' + L6.highlight(it.c) + '</code></pre><div class="l6-btnrow"></div><div class="l6-fb"></div>';
      var row = card.querySelector('.l6-btnrow'), fb = card.querySelector('.l6-fb');
      [['Legal', true], ['Compile error', false]].forEach(function (o) {
        var b = mkBtn(o[0]);
        b.addEventListener('click', function () {
          row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          answered++;
          if (o[1] === it.ok) {
            right++; card.classList.add('is-right'); b.classList.add('is-on');
            L6.feedback(fb, 'ok', '<span class="l6-pass">✓ ' + (it.ok ? 'Legal.' : 'Error.') + '</span> ' + it.why);
          } else {
            card.classList.add('is-wrong');
            L6.feedback(fb, 'bad', '<span class="l6-fail">✗ It is ' + (it.ok ? 'legal.' : 'an error.') + '</span> ' + it.why);
          }
          scoreEl.textContent = right + ' of ' + answered + ' correct';
          if (answered === items.length) L6.mark('netsvars');
        });
        row.appendChild(b);
      });
      list.appendChild(card);
    });
  }

  /* =====================================================
     7. Literal decoder
     ===================================================== */
  var BASEBITS = { b: 1, o: 3, h: 4 };
  function parseLiteral(src) {
    var s = src.trim().replace(/;$/, '');
    var m;
    if ((m = s.match(/^'([01xXzZ])$/))) {
      var c = m[1].toLowerCase();
      return { bits: new Array(8).fill(c), width: 8, fill: true, signed: false,
        note: 'Fill literal: every bit of the target takes the value ' + c.toUpperCase() + '. Shown for an 8-bit target; on a 32-bit target you would get 32 of them.' };
    }
    if ((m = s.match(/^\d+$/))) {
      var n = BigInt(s);
      if (n > 4294967295n) return { error: 'An unsized decimal is 32 bits. That number does not fit; write it with a size, e.g. 40\'d' + s + '.' };
      return { bits: n.toString(2).padStart(32, '0').split(''), width: 32, signed: true,
        note: 'An unsized decimal number with no apostrophe is a 32-bit signed value.' };
    }
    m = s.match(/^(\d+)?'([sS])?([bBoOdDhH])([0-9a-fA-FxXzZ?_]+)$/);
    if (!m) return { error: 'Not a valid literal. Use the form &lt;size&gt;\'&lt;base&gt;&lt;digits&gt;, for example 4\'b1010, 8\'hFF or 12\'d100.' };
    var size = m[1] ? parseInt(m[1], 10) : null;
    if (size === 0) return { error: 'The size must be at least 1 bit.' };
    if (size !== null && size > 64) return { error: 'This decoder shows up to 64 bits. Try a smaller size.' };
    var base = m[3].toLowerCase();
    var digits = m[4].replace(/_/g, '').toLowerCase().replace(/\?/g, 'z');
    if (!digits) return { error: 'No digits after the base.' };
    var raw = [];
    if (base === 'd') {
      if (/^[xz]$/.test(digits)) raw = [digits];
      else if (/^\d+$/.test(digits)) raw = BigInt(digits).toString(2).split('');
      else return { error: 'Decimal literals may contain only 0–9, or a single x or z.' };
    } else {
      var per = BASEBITS[base], maxd = { b: 1, o: 7, h: 15 }[base];
      for (var i = 0; i < digits.length; i++) {
        var d = digits[i];
        if (d === 'x' || d === 'z') { for (var k = 0; k < per; k++) raw.push(d); continue; }
        var v = parseInt(d, 16);
        if (isNaN(v) || v > maxd) return { error: 'Digit "' + d + '" is not allowed in base ' + base + '.' };
        raw = raw.concat(v.toString(2).padStart(per, '0').split(''));
      }
    }
    var width = size !== null ? size : Math.max(32, raw.length);
    var pad = (raw[0] === 'x' || raw[0] === 'z') ? raw[0] : '0';
    var truncated = false;
    if (raw.length > width) {
      // only a real truncation if dropped bits are not all zero
      var dropped = raw.slice(0, raw.length - width);
      truncated = dropped.some(function (b) { return b !== '0'; });
      raw = raw.slice(raw.length - width);
    }
    var padded = raw.length < width;
    while (raw.length < width) raw.unshift(pad);
    var notes = [];
    if (size === null) notes.push('No size given, so the literal is at least 32 bits wide.');
    if (padded) notes.push('Padded on the left with ' + (pad === '0' ? '0s' : pad.toUpperCase() + 's, because the leftmost digit written was ' + pad.toUpperCase()) + '.');
    if (truncated) notes.push('<b>Warning:</b> the digits need more than ' + width + ' bits. The extra high bits were thrown away; most tools warn about this.');
    return { bits: raw, width: width, signed: !!m[2], note: notes.join(' ') };
  }

  function initLiterals() {
    var chips = ["8'hA5", "4'b10xz", "8'b1x", "8'bz1", "'1", "12'o7_7", "8'sd200", "4'hFF", "'hC", "25"];
    var box = $('litChips'), input = $('litInput'), out = $('litOut'), decoded = {};
    chips.forEach(function (c) {
      var b = mkBtn(esc(c), 'is-mono');
      b.addEventListener('click', function () { input.value = c; run(); });
      box.appendChild(b);
    });
    function run() {
      var r = parseLiteral(input.value);
      if (r.error) { out.innerHTML = '<div class="l6-fb is-show is-bad">' + r.error + '</div>'; return; }
      var w = r.bits.length, html = '<div class="l6-bits">';
      // build groups aligned on LSB
      var firstLen = w % 4 || 4, pos = 0, groups = [];
      groups.push(r.bits.slice(0, firstLen)); pos = firstLen;
      while (pos < w) { groups.push(r.bits.slice(pos, pos + 4)); pos += 4; }
      var bitIdx = w - 1;
      groups.forEach(function (grp) {
        html += '<div class="l6-bitgroup">';
        grp.forEach(function (c) {
          html += '<div class="l6-cellwrap"><span class="' + cellClass(c) + '">' + c.toUpperCase() + '</span><span class="l6-idx">' + bitIdx-- + '</span></div>';
        });
        html += '</div>';
      });
      html += '</div>';
      var hasXZ = r.bits.some(function (c) { return c === 'x' || c === 'z'; });
      var info = '<p><b>Width:</b> ' + r.width + ' bits &nbsp; <b>Signed:</b> ' + (r.signed ? 'yes' : 'no');
      if (!hasXZ) {
        var u = BigInt('0b' + r.bits.join(''));
        var val = u;
        if (r.signed && r.bits[0] === '1') val = u - (1n << BigInt(r.width));
        info += ' &nbsp; <b>Value:</b> ' + val.toString() + ' &nbsp; <b>Hex:</b> ' + u.toString(16).toUpperCase();
        if (r.signed && r.bits[0] === '1') info += ' <span class="l6-fail">(negative: the MSB is 1 and the literal is signed)</span>';
      } else {
        info += ' &nbsp; <b>Value:</b> contains X/Z, so it has no single numeric value';
      }
      info += '</p>';
      out.innerHTML = html + info + (r.note ? '<div class="l6-fb is-show is-info">' + r.note + '</div>' : '');
      decoded[input.value.trim()] = true;
      if (Object.keys(decoded).length >= 3) L6.mark('literals');
    }
    $('litGo').addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    run();
    L6.parseLiteral = parseLiteral; // exposed for testing
  }

  /* =====================================================
     8. Packed / unpacked array visualizer
     ===================================================== */
  function initArrays() {
    var packed = true, sel = null, touched = 0;
    var W = $('arrW'), N = $('arrN'), view = $('arrView'), note = $('arrNote');
    var bP = $('arrModeP'), bU = $('arrModeU');
    var colors = ['#2F6BD2', '#16924F', '#6C4FD1', '#C4860A', '#0B7A83', '#D23A3F'];

    function draw() {
      var w = +W.value, n = +N.value;
      $('arrWv').textContent = w; $('arrNv').textContent = n;
      $('arrTotal').textContent = (w * n) + ' bits';
      setCode('arrDecl', packed
        ? 'logic [' + (n - 1) + ':0][' + (w - 1) + ':0] v;   // ' + n + ' groups of ' + w + ' bits, stored as ONE ' + (w * n) + '-bit vector'
        : 'logic [' + (w - 1) + ':0] v [' + n + '];   // ' + n + ' separate elements, each ' + w + ' bits (same as v [0:' + (n - 1) + '])');
      var pad = function (a, c) { return a + new Array(Math.max(1, 20 - a.length)).join(' ') + c; };
      setCode('arrMath', packed
        ? [pad('v = v + 1;', '// LEGAL: v is one ' + (w * n) + '-bit number'),
           pad('v[' + (n - 1) + '] = \'1;', '// select one group'),
           pad('v[' + (n - 1) + '][' + (w - 1) + '] = 1\'b0;', '// select one bit')].join('\n')
        : [pad('v = v + 1;', '// ERROR: no arithmetic on a whole unpacked array'),
           pad('v[0] = v[0] + 1;', '// LEGAL: one element at a time'),
           pad('v[0][' + (w - 1) + '] = 1\'b0;', '// select one bit of one element')].join('\n'));

      view.innerHTML = '';
      if (packed) {
        var strip = document.createElement('div');
        strip.className = 'l6-arr-strip is-packed';
        for (var i = n - 1; i >= 0; i--) strip.appendChild(group(i, w, true));
        var wrap = document.createElement('div');
        wrap.innerHTML = '<p class="l6-label">Memory: one continuous vector, bit ' + (w * n - 1) + ' on the left, bit 0 on the right</p>';
        wrap.appendChild(strip);
        view.appendChild(wrap);
      } else {
        var rows = document.createElement('div');
        rows.className = 'l6-arr-rows';
        rows.innerHTML = '<p class="l6-label" style="margin:0">Memory: ' + n + ' separate elements (like rows of a RAM)</p>';
        for (var j = 0; j < n; j++) {
          var r = document.createElement('div');
          r.className = 'l6-arr-row';
          r.innerHTML = '<span class="l6-arr-label">v[' + j + ']</span>';
          var strip2 = document.createElement('div'); strip2.className = 'l6-arr-strip';
          strip2.appendChild(group(j, w, false));
          r.appendChild(strip2);
          rows.appendChild(r);
        }
        view.appendChild(rows);
      }
    }

    function group(i, w, isPacked) {
      var g = document.createElement('div');
      g.className = 'l6-arr-group';
      g.style.borderColor = colors[i % colors.length];
      if (isPacked) g.insertAdjacentHTML('beforeend', '<span class="l6-grp-lbl">v[' + i + ']</span>');
      for (var b = w - 1; b >= 0; b--) {
        (function (bit) {
          var wrap = document.createElement('div'); wrap.className = 'l6-cellwrap';
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'l6-cell';
          c.style.color = colors[i % colors.length];
          c.textContent = bit;
          c.setAttribute('aria-label', 'v[' + i + '][' + bit + ']');
          if (sel && sel[0] === i && sel[1] === bit) c.classList.add('is-sel');
          c.addEventListener('click', function () {
            sel = [i, bit];
            var flat = i * w + bit;
            var msg = '<code>v[' + i + '][' + bit + ']</code> is bit ' + bit + ' of element ' + i + '.';
            if (isPacked) msg += ' Because the array is packed, it is also bit <b>' + flat + '</b> of the whole vector: <code>v[' + i + ']</code> is the same as <code>v[' + (i * w + w - 1) + ':' + (i * w) + ']</code> of the flat ' + (w * (+N.value)) + '-bit value.';
            else msg += ' Unpacked elements are stored separately, so there is no single "bit ' + flat + '" of <code>v</code>. You always select the element first: <code>v[' + i + ']</code>, then the bit.';
            L6.feedback(note, 'info', msg);
            touched++;
            if (touched >= 3) L6.mark('arrays');
            draw();
          });
          wrap.appendChild(c);
          wrap.insertAdjacentHTML('beforeend', '<span class="l6-idx">' + (isPacked ? (i * w + bit) : bit) + '</span>');
          g.appendChild(wrap);
        })(b);
      }
      return g;
    }

    bP.addEventListener('click', function () { packed = true; sel = null; setOn([bP, bU], bP); note.className = 'l6-fb'; draw(); });
    bU.addEventListener('click', function () { packed = false; sel = null; setOn([bP, bU], bU); note.className = 'l6-fb'; draw(); });
    W.addEventListener('input', function () { sel = null; draw(); });
    N.addEventListener('input', function () { sel = null; draw(); });
    L6.feedback(note, 'info', 'Click any bit to see how it is indexed. The small numbers under the packed view are positions in the single flat vector.');
    draw();
  }

  /* =====================================================
     9a. enum explorer
     ===================================================== */
  function initEnum() {
    var names = ['IDLE', 'READ', 'WRITE', 'DONE'];
    var encs = {
      Binary: { w: 2, v: ['00', '01', '10', '11'], decl: 'typedef enum logic [1:0] {IDLE, READ, WRITE, DONE} state_t;' },
      'One-hot': { w: 4, v: ['0001', '0010', '0100', '1000'], decl: 'typedef enum logic [3:0] {\n  IDLE  = 4\'b0001,\n  READ  = 4\'b0010,\n  WRITE = 4\'b0100,\n  DONE  = 4\'b1000\n} state_t;' },
      Gray: { w: 2, v: ['00', '01', '11', '10'], decl: 'typedef enum logic [1:0] {\n  IDLE  = 2\'b00,\n  READ  = 2\'b01,\n  WRITE = 2\'b11,\n  DONE  = 2\'b10\n} state_t;' }
    };
    var enc = 'Binary', cur = 0, used = {};
    var encBtns = [], stBtns = [], out = $('enumOut');

    function drawStates() {
      stBtns.forEach(function (b, i) {
        b.innerHTML = names[i] + ' <span style="opacity:.7">' + encs[enc].w + '\'b' + encs[enc].v[i] + '</span>';
        b.classList.toggle('is-on', i === cur);
      });
    }
    function say(expr, result, extra) {
      out.innerHTML = '<span style="color:var(--ink-3)">state = ' + names[cur] + ' (' + encs[enc].w + '\'b' + encs[enc].v[cur] + ')</span><br>' +
        esc(expr) + ' → <b>' + esc(result) + '</b>' + (extra ? '<br><span style="color:var(--ink-2)">' + extra + '</span>' : '');
    }
    Object.keys(encs).forEach(function (k) {
      var b = mkBtn(k);
      b.addEventListener('click', function () {
        enc = k; setOn(encBtns, b);
        setCode('enumDecl', encs[k].decl + '\n\nstate_t state = IDLE;');
        drawStates();
        say('encoding', k, k === 'One-hot' ? 'One flip-flop per state: more flops, but very simple next-state logic. Common in FPGAs.' :
          k === 'Gray' ? 'Only one bit changes between neighbouring states, which reduces glitches.' :
            'Fewest flip-flops: 4 states need only 2 bits.');
      });
      encBtns.push(b);
      $('enumEnc').appendChild(b);
    });
    names.forEach(function (nm, i) {
      var b = mkBtn(nm, 'is-mono');
      b.addEventListener('click', function () { cur = i; drawStates(); say('state = ' + nm, nm + ' = ' + encs[enc].w + '\'b' + encs[enc].v[i]); });
      stBtns.push(b);
      $('enumStates').appendChild(b);
    });
    var methods = [
      ['state.next()', function () { var o = cur; cur = (cur + 1) % 4; return [names[cur], o === 3 ? 'next() wraps around from the last value back to the first.' : '']; }],
      ['state.prev()', function () { var o = cur; cur = (cur + 3) % 4; return [names[cur], o === 0 ? 'prev() wraps from the first value to the last.' : '']; }],
      ['state.first()', function () { return ['IDLE', 'first() returns the first value declared. It does not change state.']; }],
      ['state.last()', function () { return ['DONE', 'last() returns the last value declared.']; }],
      ['state.num()', function () { return ['4', 'num() returns how many values the enum has.']; }],
      ['state.name()', function () { return ['"' + names[cur] + '"', 'name() returns the name as a string. Great for $display messages.']; }]
    ];
    methods.forEach(function (m) {
      var b = mkBtn(m[0], 'is-mono');
      b.addEventListener('click', function () {
        var before = names[cur];
        var r = m[1]();
        drawStates();
        out.innerHTML = '<span style="color:var(--ink-3)">state was ' + before + '</span><br>' + esc(m[0]) + ' → <b>' + esc(r[0]) + '</b>' +
          (m[0].indexOf('next') > 0 || m[0].indexOf('prev') > 0 ? '<br><span style="color:var(--ink-2)">(shown here as <code>state = ' + esc(m[0]) + ';</code>)</span>' : '') +
          (r[1] ? '<br><span style="color:var(--ink-2)">' + r[1] + '</span>' : '');
        used[m[0]] = true;
        if (Object.keys(used).length >= 4) L6.mark('enum');
      });
      $('enumMethods').appendChild(b);
    });
    encBtns[0].click();
  }

  /* =====================================================
     9b. struct packet builder
     ===================================================== */
  function initStruct() {
    var op = $('stOp'), ad = $('stAddr'), da = $('stData'), changes = 0;
    function clamp(el, max) { var v = parseInt(el.value, 10); if (isNaN(v) || v < 0) v = 0; if (v > max) v = max; return v; }
    function draw(user) {
      var o = clamp(op, 15), a = clamp(ad, 255), d = clamp(da, 15);
      var bits = toBin(o, 4) + toBin(a, 8) + toBin(d, 4);
      var html = '';
      for (var i = 0; i < 16; i++) {
        var f = i < 4 ? 'op' : (i < 12 ? 'addr' : 'data');
        html += '<div class="l6-cellwrap"><span class="l6-cell l6-fcell l6-field-' + f + '">' + bits[i] + '</span><span class="l6-idx">' + (15 - i) + '</span></div>';
      }
      $('stBits').innerHTML = html;
      var word = (o << 12) | (a << 4) | d;
      $('stOut').innerHTML = 'pkt = 16\'h' + toHex(word, 4) + ';<br>pkt.opcode = 4\'h' + toHex(o, 1) + ' &nbsp; pkt.addr = 8\'h' + toHex(a, 2) +
        ' &nbsp; pkt.data = 4\'h' + toHex(d, 1) + '<br><span style="color:var(--ink-2)">pkt.addr is the same bits as pkt[11:4]</span>';
      if (user) { changes++; if (changes >= 2) L6.mark('struct'); }
    }
    [op, ad, da].forEach(function (el) { el.addEventListener('input', function () { draw(true); }); });
    draw(false);
  }

  /* =====================================================
     9c. union views
     ===================================================== */
  function initUnion() {
    var w = $('unWord'), hi = $('unHi'), lo = $('unLo'), note = $('unNote'), edits = 0;
    function valid(s, n) { return new RegExp('^[0-9a-fA-F]{1,' + n + '}$').test(s); }
    function draw(val) {
      var bits = toBin(val, 16), html = '';
      for (var i = 0; i < 16; i++) {
        html += '<div class="l6-cellwrap"><span class="l6-cell l6-fcell l6-field-' + (i < 8 ? 'hi' : 'lo') + '">' + bits[i] + '</span><span class="l6-idx">' + (15 - i) + '</span></div>';
      }
      $('unBits').innerHTML = html;
    }
    function fromWord() {
      if (!valid(w.value, 4)) { L6.feedback(note, 'bad', 'Enter 1 to 4 hex digits (0–9, A–F).'); return; }
      var v = parseInt(w.value, 16);
      hi.value = toHex(v >> 8, 2); lo.value = toHex(v & 255, 2);
      draw(v); done('r.word');
    }
    function fromBytes() {
      if (!valid(hi.value, 2) || !valid(lo.value, 2)) { L6.feedback(note, 'bad', 'Each byte takes 1 or 2 hex digits.'); return; }
      var v = (parseInt(hi.value, 16) << 8) | parseInt(lo.value, 16);
      w.value = toHex(v, 4);
      draw(v); done('r.bytes');
    }
    function done(which) {
      edits++;
      L6.feedback(note, 'info', 'You wrote through <code>' + which + '</code>, and the other view changed too, because both members occupy the <b>same 16 bits</b>. A union stores one value; the members are different ways to read it.');
      if (edits >= 2) L6.mark('union');
    }
    w.addEventListener('input', fromWord);
    hi.addEventListener('input', fromBytes);
    lo.addEventListener('input', fromBytes);
    draw(0xBEEF);
  }

  /* =====================================================
     9d. string methods
     ===================================================== */
  function initString() {
    var s = 'SystemVerilog', used = {}, out = $('strOut');
    function boxes(from, to) {
      $('strBoxes').innerHTML = s.split('').map(function (ch, i) {
        var on = from !== undefined && i >= from && i <= to;
        return '<div class="l6-cellwrap"><span class="l6-cell' + (on ? ' is-sel' : '') + '">' + esc(ch) + '</span><span class="l6-idx">' + i + '</span></div>';
      }).join('');
    }
    function show(expr, result, from, to, note) {
      boxes(from, to);
      out.innerHTML = esc(expr) + ' → <b>' + esc(result) + '</b>' + (note ? '<br><span style="color:var(--ink-2);font-family:inherit">' + note + '</span>' : '');
      used[expr.split('(')[0]] = true;
      if (Object.keys(used).length >= 4) L6.mark('string');
    }
    var methods = [
      ['s.len()', function () { show('s.len()', String(s.length), undefined, undefined, 'Number of characters.'); }],
      ['s.getc(0)', function () { show('s.getc(0)', s.charCodeAt(0) + " (the byte for '" + s[0] + "')", 0, 0, 'getc() returns a byte, not a string.'); }],
      ['s.toupper()', function () { show('s.toupper()', '"' + s.toUpperCase() + '"', undefined, undefined, 'Returns a new string; s itself is unchanged.'); }],
      ['s.tolower()', function () { show('s.tolower()', '"' + s.toLowerCase() + '"', undefined, undefined, 'Returns a new string; s itself is unchanged.'); }],
      ['{s, "_tb"}', function () { show('{s, "_tb"}', '"' + s + '_tb"', undefined, undefined, 'Curly braces concatenate strings, just like bit vectors.'); }],
      ['s == "systemverilog"', function () { show('s == "systemverilog"', '0 (false)', undefined, undefined, 'Comparison is case-sensitive.'); }]
    ];
    methods.forEach(function (m) {
      var b = mkBtn(esc(m[0]), 'is-mono');
      b.addEventListener('click', m[1]);
      $('strMethods').appendChild(b);
    });
    $('strSub').addEventListener('click', function () {
      var i = parseInt($('strI').value, 10), j = parseInt($('strJ').value, 10);
      var expr = 's.substr(' + i + ', ' + j + ')';
      if (isNaN(i) || isNaN(j) || i < 0 || j >= s.length || i > j) {
        show(expr, '""', undefined, undefined, 'Out of range (valid indexes are 0 to ' + (s.length - 1) + ', and i ≤ j), so substr returns an empty string.');
      } else {
        show(expr, '"' + s.slice(i, j + 1) + '"', i, j, 'substr(i, j) includes <b>both</b> ends: characters ' + i + ' through ' + j + '.');
      }
    });
    boxes();
    out.textContent = 'Click a method to run it.';
  }

  /* =====================================================
     10. Try it yourself
     ===================================================== */
  function initTryIt() {
    var tasks = [
      { t: 'Declare an 8-bit, 4-state variable named <code>data</code>.',
        re: [/^(logic|reg)\[7:0\]data;?$/],
        hint: '4-state and general-purpose means <code>logic</code>. Put the range [7:0] before the name.',
        ans: 'logic [7:0] data;' },
      { t: 'Declare a 2-state, 32-bit signed variable named <code>count</code> using a single keyword.',
        re: [/^intcount;?$/],
        hint: 'Which 2-state type is 32 bits and signed?',
        ans: 'int count;' },
      { t: 'Declare an unpacked array <code>mem</code> of 16 elements, each a 2-state signed 8-bit value.',
        re: [/^bytemem\[(16|0:15)\];?$/],
        hint: 'The 8-bit signed 2-state type is <code>byte</code>. Unpacked dimensions go after the name.',
        ans: 'byte mem [16];' },
      { t: 'Create an enum type named <code>light_t</code> with the values RED, YELLOW and GREEN.',
        re: [/^typedefenum(logic\[\d+:0\]|bit\[\d+:0\]|int)?\{RED,YELLOW,GREEN\}light_t;?$/],
        hint: 'Start with <code>typedef enum</code>, list the names in braces, then the type name.',
        ans: 'typedef enum {RED, YELLOW, GREEN} light_t;' },
      { t: 'Set every bit of the variable <code>v</code> to 1 without writing its width (any width).',
        re: [/^(assign)?v(<)?='1;?$/],
        hint: 'SystemVerilog has a fill literal for this: apostrophe followed by the value.',
        ans: "v = '1;" }
    ];
    var solved = {};
    var root = $('tryList');
    tasks.forEach(function (tk, i) {
      var card = document.createElement('div');
      card.className = 'l6-card';
      card.innerHTML = '<p class="l6-card-title">Task ' + (i + 1) + '</p><p>' + tk.t + '</p>' +
        '<div class="l6-btnrow"><input class="l6-input" style="flex:1" aria-label="Your answer for task ' + (i + 1) + '" spellcheck="false" autocomplete="off">' +
        '<button type="button" class="l6-btn is-primary">Check</button><button type="button" class="l6-btn">Hint</button><button type="button" class="l6-btn">Show answer</button></div><div class="l6-fb"></div>';
      var inp = card.querySelector('input'), bs = card.querySelectorAll('button'), fb = card.querySelector('.l6-fb');
      function check() {
        var norm = inp.value.replace(/\s+/g, '');
        if (!norm) { L6.feedback(fb, 'bad', 'Type your answer first.'); return; }
        var ok = tk.re.some(function (r) { return r.test(norm); });
        if (ok) {
          L6.feedback(fb, 'ok', '<span class="l6-pass">PASS ✓</span> That compiles and does what the task asks.' + (norm.slice(-1) !== ';' ? ' Remember the semicolon in real code.' : ''));
          solved[i] = true;
          if (Object.keys(solved).length === tasks.length) L6.mark('tryit');
        } else {
          L6.feedback(fb, 'bad', '<span class="l6-fail">FAIL ✗</span> Not quite. Check the type, the range and the name. Use Hint if you are stuck.');
        }
      }
      bs[0].addEventListener('click', check);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      bs[1].addEventListener('click', function () { L6.feedback(fb, 'info', tk.hint); });
      bs[2].addEventListener('click', function () {
        L6.feedback(fb, 'info', 'One correct answer: <code>' + esc(tk.ans) + '</code>. Type it in and press Check to complete the task.');
      });
      root.appendChild(card);
    });
  }

  /* =====================================================
     11. Debugging challenge
     ===================================================== */
  function initDebug() {
    var lines = [
      'module traffic_ctrl (',
      '  input  logic       clk, rst_n,',
      '  output logic [1:0] light',
      ');',
      '  typedef enum logic [1:0] {RED, GREEN, YELLOW, OFF, FLASH} state_t;',
      '  state_t     state;',
      '  wire  [1:0] timer;',
      '  always_ff @(posedge clk or negedge rst_n)',
      '    if (!rst_n) timer <= \'0;',
      '    else        timer <= timer + 1\'b1;',
      '  bit   [7:0] status = 8\'bxxxx_0000;',
      '  assign light = state;',
      'endmodule'
    ];
    var bugs = {
      5: { id: 'enum', t: '<b>Bug: the enum does not fit.</b> Five values (RED to FLASH) need at least 3 bits, but the base type is <code>logic [1:0]</code>, which holds only 4 values. This is a compile error. Fix: <code>typedef enum logic [2:0] ...</code>.' },
      7: { id: 'wire', t: '<b>Bug: a wire written in always_ff.</b> <code>timer</code> is a net, but lines 9–10 assign it procedurally. Nets can only be driven by <code>assign</code> or ports. Fix: declare it <code>logic [1:0] timer;</code>.' },
      9: { id: 'wire', t: '<b>Bug: procedural assignment to a net.</b> <code>timer</code> is declared as <code>wire</code> on line 7, and nets cannot be written in <code>always_ff</code>. Fix line 7: <code>logic [1:0] timer;</code>.' },
      10: { id: 'wire', t: '<b>Bug: procedural assignment to a net.</b> Same problem as line 9: <code>timer</code> must be a variable. Fix line 7: <code>logic [1:0] timer;</code>.' },
      11: { id: 'bit', t: '<b>Bug: X stored in a 2-state type.</b> <code>bit</code> cannot hold X, so the X bits silently become 0 and <code>status</code> starts as <code>8\'b0000_0000</code>. This compiles, which makes it worse: the intended "unknown" marker is lost. Fix: <code>logic [7:0] status</code>.' }
    };
    var clean = {
      1: 'Module header. Nothing wrong here.',
      2: 'Inputs declared as logic. Correct.',
      3: 'A 2-bit logic output. Correct.',
      4: 'End of port list.',
      6: 'Declares a variable of the enum type. The problem is in the type definition itself.',
      8: 'A correct flip-flop block header with asynchronous active-low reset.',
      12: 'Assigning an enum to a logic vector is allowed (enums convert to their base type). Once the enum is fixed to 3 bits you would select state[1:0] or widen light, but this line is not one of the three bugs.',
      13: 'End of module.'
    };
    var rows = L6.renderLines($('dbgCode'), lines, { clickable: true });
    var found = {}, note = $('dbgNote');
    rows.forEach(function (row, i) {
      var ln = i + 1;
      row.addEventListener('click', function () {
        if (bugs[ln]) {
          row.classList.add('is-bug');
          found[bugs[ln].id] = true;
          if (bugs[ln].id === 'wire') { rows[6].classList.add('is-bug'); rows[8].classList.add('is-bug'); rows[9].classList.add('is-bug'); }
          L6.feedback(note, 'ok', '<span class="l6-pass">Found one.</span> ' + bugs[ln].t);
        } else {
          row.classList.add('is-clean');
          setTimeout(function () { row.classList.remove('is-clean'); }, 1200);
          L6.feedback(note, 'bad', '<span class="l6-fail">No bug on line ' + ln + '.</span> ' + clean[ln]);
        }
        var n = Object.keys(found).length;
        $('dbgScore').textContent = 'Bugs found: ' + n + ' of 3';
        if (n === 3) {
          $('dbgScore').innerHTML = 'Bugs found: 3 of 3 <span class="l6-pass">All fixed ✓</span>';
          $('dbgFixWrap').hidden = false;
          L6.mark('debug');
        }
      });
    });
  }

  /* =====================================================
     12. Quiz
     ===================================================== */
  function initQuiz() {
    var qs = [
      { q: 'Which of these types is 4-state?', opts: ['<code>bit</code>', '<code>int</code>', '<code>logic</code>', '<code>byte</code>'], a: 2,
        why: '<code>logic</code> stores 0, 1, X and Z. The other three are 2-state.' },
      { q: 'After <code>bit b; b = 1\'bx;</code> what is the value of <code>b</code>?', opts: ['X', '0', '1', 'Compile error'], a: 1,
        why: 'Assigning X or Z to a 2-state type converts it to 0 silently. It is legal, and that is why it is dangerous.' },
      { q: 'What is the initial value of an uninitialised <code>integer</code>?', opts: ['0', 'Z', 'X (all 32 bits)', '−1'], a: 2,
        why: '<code>integer</code> is a 4-state type, so it starts as X. <code>int</code> would start as 0.' },
      { q: 'What range of values can a <code>byte</code> hold?', opts: ['0 to 255', '−128 to 127', '0 to 127', '−255 to 255'], a: 1,
        why: '<code>byte</code> is 8-bit <b>signed</b>. Use <code>byte unsigned</code> or <code>bit [7:0]</code> for 0 to 255.' },
      { q: 'Which declaration can legally have two <code>assign</code> statements driving it?', opts: ['<code>logic y;</code>', '<code>bit y;</code>', '<code>wire y;</code>', '<code>int y;</code>'], a: 2,
        why: 'Only nets such as <code>wire</code> resolve multiple drivers. Variables allow a single continuous driver.' },
      { q: 'How is <code>logic [3:0][7:0] w;</code> stored?', opts: ['4 separate bytes', 'One 32-bit packed vector', 'One 12-bit vector', 'A dynamic array'], a: 1,
        why: 'Both dimensions come before the name, so both are packed: 4 × 8 = 32 contiguous bits. <code>w[0]</code> is bits [7:0].' },
      { q: 'With <code>typedef enum logic [1:0] {A, B, C, D} e_t;</code> and <code>s = D</code>, what does <code>s.next()</code> return?', opts: ['A', 'D', 'X', 'Error: out of range'], a: 0,
        why: 'Enum <code>next()</code> wraps around: after the last value it returns the first.' },
      { q: 'In <code>struct packed { logic [3:0] op; logic [7:0] addr; }</code>, which bits hold <code>op</code>?', opts: ['[3:0]', '[7:0]', '[11:8]', '[11:4]'], a: 2,
        why: 'The struct is 12 bits. The first field declared is the most significant, so <code>op</code> is [11:8] and <code>addr</code> is [7:0].' },
      { q: 'What value does <code>8\'b1x</code> represent?', opts: ['<code>xxxx_xx1x</code>', '<code>0000_001x</code>', '<code>1x00_0000</code>', '<code>1111_111x</code>'], a: 1,
        why: 'Short literals are padded on the left. The leftmost digit written is 1, so the padding is 0. If it were X or Z, the padding would be X or Z.' }
    ];
    L6.quiz($('quizRoot'), qs, {
      passMark: 6,
      onFinish: function (score) {
        var best = parseInt(L6.store.get(KEY_QUIZ, '0'), 10) || 0;
        if (score > best) L6.store.set(KEY_QUIZ, String(score));
        if (score >= 6) L6.mark('quiz');
        if (L6.refreshCompletion) L6.refreshCompletion();
      }
    });
  }

  /* =====================================================
     Completion
     ===================================================== */
  function initComplete() {
    L6.initCompletion({
      level: 6,
      module: 1,
      completedKey: KEY_COMPLETED,
      button: $('completeBtn'),
      status: $('completeStatus'),
      reqs: [
        { el: $('reqQuiz'), test: function () { return (parseInt(L6.store.get(KEY_QUIZ, '0'), 10) || 0) >= 6; } },
        { el: $('reqActs'), test: function () { return L6.doneCount() >= 10; } }
      ]
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    L6.initProgress(KEY_ACTIVITIES, ACTIVITIES);
    L6.highlightAll();
    initCompare();
    initCategorize();
    initFileStructure();
    initTypes();
    initFourState();
    initNetsVars();
    initLiterals();
    initArrays();
    initEnum();
    initStruct();
    initUnion();
    initString();
    initTryIt();
    initDebug();
    initQuiz();
    initComplete();
    L6.initToc();
  });
})();
