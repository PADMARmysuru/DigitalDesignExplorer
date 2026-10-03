/* Level 7 · Module 3 – Datapath Circuit Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function aluCalc(op, a, b) {
    var r, c = 0, v = 0, sa = a > 127 ? a - 256 : a, sb = b > 127 ? b - 256 : b;
    switch (op) {
      case 'ADD': r = a + b; c = r > 255 ? 1 : 0; r &= 255; v = ((a ^ r) & (b ^ r) & 0x80) ? 1 : 0; break;
      case 'SUB': r = a + ((~b) & 255) + 1; c = r > 255 ? 1 : 0; r &= 255; v = ((a ^ b) & (a ^ r) & 0x80) ? 1 : 0; break;
      case 'AND': r = a & b; break;
      case 'OR': r = a | b; break;
      case 'XOR': r = a ^ b; break;
      case 'SLT': r = sa < sb ? 1 : 0; break;
      case 'SHL': r = (a << 1) & 255; c = (a >> 7) & 1; break;
      case 'SHR': r = a >> 1; c = a & 1; break;
    }
    return { r: r, z: r === 0 ? 1 : 0, n: (r >> 7) & 1, c: c, v: v };
  }
  var UNIT = { ADD: 'arith', SUB: 'arith', SLT: 'arith', AND: 'logic', OR: 'logic', XOR: 'logic', SHL: 'shift', SHR: 'shift' };

  /* ---------- Widget: ALU explorer ---------- */
  function aluLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>ALU explorer · 8-bit, with Z N C V flags</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var op = 'ADD', ops = {};
    var A = L.bits(body, 'A', 8, 0x7F, upd), B = L.bits(body, 'B', 8, 0x01, upd);
    var row = L.h('div', 'l7-row'); body.appendChild(row); row.appendChild(L.h('span', 'l7-lab-label', 'Operation'));
    var bs = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT', 'SHL', 'SHR'].map(function (o) {
      var b = L.btn(o, o === op ? 'is-on' : '', function () { op = o; bs.forEach(function (x) { x.classList.toggle('is-on', x === b); }); upd(); });
      row.appendChild(b); return b;
    });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function upd() {
      ops[op] = 1; if (Object.keys(ops).length >= 5) api.done();
      var a = A.get(), b = B.get(), x = aluCalc(op, a, b), u = UNIT[op], o = '';
      o += R(20, 30, 70, 40, 'box', 6) + T(55, 55, 'A', 't-ink t-b') + R(20, 150, 70, 40, 'box', 6) + T(55, 175, 'B', 't-ink t-b');
      var units = [['arith', 'Adder / subtractor', 40], ['logic', 'Logic unit', 100], ['shift', 'Shifter', 160]];
      units.forEach(function (un, i) {
        var on = un[0] === u, y = un[2];
        o += P('M90 50C130 50 130 ' + (y + 15) + ' 170 ' + (y + 15), on ? 'w-on' : 'w-thin');
        if (un[0] !== 'shift') o += P('M90 170C130 170 130 ' + (y + 25) + ' 170 ' + (y + 25), on ? 'w-on' : 'w-thin');
        o += R(170, y, 150, 40, on ? 'box-on' : 'box', 8) + T(245, y + 25, un[1], on ? 't-sig t-b' : 't-dim');
        o += P('M320 ' + (y + 20) + 'H380', on ? 'w-on' : 'w-thin');
      });
      o += '<path d="M380 30L420 50V170L380 190Z" class="box-cu"/>' + T(400, 115, 'MUX', 't-cu t-b t-sm');
      o += T(400, 212, 'sel=' + u, 't-dim t-sm');
      o += P('M420 110H470', 'w-on') + R(470, 90, 120, 40, 'box-on', 8) + T(530, 115, 'Y = ' + L.bin(x.r, 8), 't-sig t-b t-sm');
      o += T(530, 160, 'Z' + x.z + ' N' + x.n + ' C' + x.c + ' V' + x.v, 't-cu t-b');
      pic.innerHTML = S(610, 220, o, 'ALU datapath');
      var sa = a > 127 ? a - 256 : a, sb = b > 127 ? b - 256 : b, sr = x.r > 127 ? x.r - 256 : x.r;
      out.innerHTML = '<span class="k">' + op + '</span>  A=' + L.bin(a, 8) + ' (' + a + ' / ' + sa + ')  B=' + L.bin(b, 8) + ' (' + b + ' / ' + sb + ')' +
        '<br><span class="k">Y</span> = <span class="v">' + L.bin(x.r, 8) + '</span> (unsigned ' + x.r + ', signed ' + sr + ')' +
        '<br><span class="k">Flags</span> Z=' + x.z + ' (zero) · N=' + x.n + ' (sign bit) · <span class="c">C=' + x.c + '</span> (carry out) · <span class="c">V=' + x.v + '</span> (signed overflow)' +
        (op === 'ADD' && x.v ? '<br>⚠ Two positive numbers gave a negative result: signed overflow.' : '');
    }
    upd();
  }

  /* ---------- Widget: logarithmic barrel shifter ---------- */
  function barrel(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Barrel shifter · three mux stages: shift by 1, 2 and 4</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var mode = 'rotr', amt = 3, seen = {};
    var D = L.bits(body, 'Data', 8, 0xB4, upd);
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var ms = [['sll', 'Logical left'], ['srl', 'Logical right'], ['sra', 'Arithmetic right'], ['rotr', 'Rotate right']].map(function (m) {
      var b = L.btn(m[1], m[0] === mode ? 'is-on' : '', function () { mode = m[0]; ms.forEach(function (x) { x.classList.toggle('is-on', x === b); }); upd(); });
      row.appendChild(b); return b;
    });
    var A = L.bits(body, 'Shift amount s2 s1 s0', 3, amt, upd);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function stage(v, k) {
      var s = 1 << k;
      if (mode === 'sll') return (v << s) & 255;
      if (mode === 'srl') return v >> s;
      if (mode === 'sra') { var x = v >> s; if (v & 0x80) x |= (0xFF << (8 - s)) & 255; return x; }
      return ((v >> s) | (v << (8 - s))) & 255;
    }
    function upd() {
      var v = D.get(), a = A.get(); seen[mode + a] = 1; if (Object.keys(seen).length >= 6) api.done();
      var vals = [v], o = '', dx = 60, X = function (i) { return 60 + (7 - i) * dx; };
      for (var k = 0; k < 3; k++) vals.push((a >> k) & 1 ? stage(vals[k], k) : vals[k]);
      vals.forEach(function (val, r) {
        var y = 20 + r * 62, en = r > 0 && ((a >> (r - 1)) & 1);
        o += T(14, y + 20, r === 0 ? 'in' : 'S' + (r - 1), r === 0 ? 't-dim t-b' : en ? 't-sig t-b' : 't-dim', 'start');
        if (r > 0) o += T(14, y + 34, en ? 'shift ' + (1 << (r - 1)) : 'pass', en ? 't-sig t-sm' : 't-dim t-sm', 'start');
        for (var i = 0; i < 8; i++) {
          var bit = (val >> i) & 1;
          o += R(X(i) - 18, y, 36, 28, bit ? 'box-on' : 'box', 5) + T(X(i), y + 19, bit, bit ? 't-sig t-b' : 't-dim');
          if (r < 3) {
            var en2 = (a >> r) & 1, s = 1 << r, src = i, dst;
            if (en2) {
              dst = mode === 'sll' ? i + s : i - s;
              if (mode === 'rotr') dst = (i - s + 8) % 8;
              if (dst >= 0 && dst < 8) o += P('M' + X(i) + ' ' + (y + 28) + 'L' + X(dst) + ' ' + (y + 62), 'w-cu');
            } else o += P('M' + X(src) + ' ' + (y + 28) + 'V' + (y + 62), 'w-thin');
          }
        }
      });
      pic.innerHTML = S(560, 270, o, 'Logarithmic barrel shifter stages');
      out.innerHTML = '<span class="k">' + { sll: 'Logical left', srl: 'Logical right', sra: 'Arithmetic right', rotr: 'Rotate right' }[mode] + ' by ' + a + '</span>: ' + L.bin(v, 8) + ' → <span class="v">' + L.bin(vals[3], 8) + '</span>' +
        '<br><span class="k">Hardware</span> 3 stages × 8 muxes = <span class="c">24 two-input muxes</span> (N·log₂N); each stage is controlled by one bit of the shift amount.' +
        (mode === 'sra' ? '<br>Arithmetic right shift copies the sign bit into the vacated positions.' : mode === 'rotr' ? '<br>Rotation wraps the bits shifted out back into the other end.' : '<br>Vacated positions are filled with 0.');
    }
    upd();
  }

  /* ---------- Widget: control-word puzzle (mux-based datapath) ---------- */
  function puzzle(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Datapath puzzle · set the control word to compute the target</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var Rg = { R0: 12, R1: 10, R2: 3, '1': 1 };
    var tasks = [['Y = R0 + R1', 22], ['Y = (R1 − R2) × 2', 14], ['Y = R0 OR R2', 15], ['Y = (R2 + 1) ÷ 2', 2]];
    var ti = 0, solved = {};
    var head = L.h('div', 'l7-readout'); body.appendChild(head);
    var c = L.h('div', 'l7-grid2'); body.appendChild(c);
    var cw = { a: 'R0', b: 'R0', op: 'ADD', sh: 'none' };
    var s1 = L.select(c, 'Mux A', [['R0', 'R0 = 12'], ['R1', 'R1 = 10'], ['R2', 'R2 = 3']], 'R0', function (v) { cw.a = v; upd(); });
    var s2 = L.select(c, 'Mux B', [['R0', 'R0 = 12'], ['R1', 'R1 = 10'], ['R2', 'R2 = 3'], ['1', 'constant 1']], 'R0', function (v) { cw.b = v; upd(); });
    var s3 = L.select(c, 'ALU op', [['ADD', 'ADD'], ['SUB', 'SUB'], ['AND', 'AND'], ['OR', 'OR']], 'ADD', function (v) { cw.op = v; upd(); });
    var s4 = L.select(c, 'Shifter', [['none', 'pass'], ['shl', '<< 1'], ['shr', '>> 1']], 'none', function (v) { cw.sh = v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var check = L.btn('Check', 'pri', function () {
      if (val() === tasks[ti][1]) {
        solved[ti] = 1; L.fb(fb, 'ok', '✓ Correct control word: muxA=' + cw.a + ', muxB=' + cw.b + ', ALU=' + cw.op + ', shift=' + cw.sh + '.');
        if (Object.keys(solved).length === tasks.length) { api.done(); L.fb(fb, 'ok', '🎉 All four tasks solved – you programmed a datapath purely with multiplexer selects and an ALU opcode.'); }
        else { ti = (ti + 1) % tasks.length; while (solved[ti]) ti = (ti + 1) % tasks.length; setTimeout(upd, 900); }
      } else L.fb(fb, 'bad', '✗ Y = ' + val() + ', target ' + tasks[ti][1] + '. Change the selects.');
    });
    row.appendChild(check);
    function val() {
      var a = Rg[cw.a], b = Rg[cw.b], r = { ADD: a + b, SUB: a - b, AND: a & b, OR: a | b }[cw.op];
      r &= 255; if (cw.sh === 'shl') r = (r << 1) & 255; if (cw.sh === 'shr') r >>= 1; return r;
    }
    function upd() {
      head.innerHTML = '<span class="k">Task ' + (ti + 1) + ' of ' + tasks.length + ':</span> <span class="v">' + tasks[ti][0] + '</span>  (target ' + tasks[ti][1] + ') · solved ' + Object.keys(solved).length + '/4';
      var o = '';
      ['R0', 'R1', 'R2'].forEach(function (r, i) { o += R(10, 20 + i * 50, 70, 34, 'box', 6) + T(45, 42 + i * 50, r + '=' + Rg[r], 't-ink t-sm'); });
      o += '<path d="M130 20L160 35V105L130 120Z" class="' + 'box-cu"/>' + T(145, 140, 'A:' + cw.a, 't-cu t-sm');
      o += '<path d="M130 110L160 125V185L130 200Z" class="box-cu"/>' + T(145, 218, 'B:' + cw.b, 't-cu t-sm');
      ['R0', 'R1', 'R2'].forEach(function (r, i) {
        o += P('M80 ' + (37 + i * 50) + 'L130 ' + (40 + i * 25), cw.a === r ? 'w-on' : 'w-thin');
        o += P('M80 ' + (37 + i * 50) + 'L130 ' + (125 + i * 20), cw.b === r ? 'w-on' : 'w-thin');
      });
      o += P('M160 70L210 95', 'w-on') + P('M160 155L210 130', 'w-on');
      o += '<path d="M210 75L280 100V125L210 150L210 125L225 112L210 100Z" class="box-on"/>' + T(250, 116, cw.op, 't-sig t-b t-sm');
      o += P('M280 112H320', 'w-on') + R(320, 92, 80, 40, 'box-vio', 6) + T(360, 116, cw.sh === 'none' ? 'pass' : cw.sh === 'shl' ? '<<1' : '>>1', 't-vio t-b');
      o += P('M400 112H440', 'w-on') + T(450, 117, 'Y = ' + val(), 't-ink t-b t-lg', 'start');
      pic.innerHTML = S(560, 228, o, 'Multiplexer-based datapath');
      L.fb(fb, '', '');
    }
    upd();
  }

  function accFrame(k) {
    var xs = [7, 5, 9, 4], acc = [0, 7, 12, 21, 25], o = '';
    o += R(20, 60, 90, 40, 'box', 6) + T(65, 85, 'X = ' + (k < 4 ? xs[k] : '—'), 't-ink t-b');
    o += P('M110 80H170', k < 4 ? 'w-on' : 'w');
    o += '<path d="M170 50L230 80V110L170 140L170 110L185 95L170 80Z" class="' + (k < 4 ? 'box-on' : 'box') + '"/>' + T(205, 100, '+', 't-sig t-b t-lg');
    o += P('M230 95H280', k < 4 ? 'w-on' : 'w');
    o += R(280, 70, 110, 50, 'box-cu', 6) + T(335, 92, 'ACC', 't-cu t-b') + T(335, 110, String(acc[k]), 't-ink t-b');
    o += P('M335 120V170H140V125H170', 'w-cu') + T(240, 186, 'feedback: ACC → adder', 't-dim t-sm');
    o += P('M390 95H450', 'w') + T(460, 100, 'out', 't-dim', 'start');
    o += T(335, 52, k === 0 ? 'reset: ACC = 0' : 'after clock ' + k, 't-vio');
    return S(520, 200, o, 'Accumulator datapath, step ' + k);
  }

  L.module({
    n: 3,
    lead: 'A datapath is where the data actually flows: registers, multiplexers, shifters and arithmetic units arranged as regular bit-slices. Learn how these blocks are organised and steered by control signals.',
    tags: ['datapath vs control', 'bit-slice', 'multiplexers', 'shifters', 'barrel shifter', 'ALU', 'flags'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-dp', type: 'concept', title: 'The datapath concept', nav: 'Datapath',
        html: '<p>A digital system is split into a <b>datapath</b>, which stores and transforms data words, and a <b>control unit</b>, which decides what the datapath does in each clock cycle by driving its select and enable signals. The datapath is wide (8–512 bits) and regular; control is narrow and irregular.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Storage</h4><p>Registers and register files hold operands and results.</p></div><div class="l7-box cu"><h4>Steering</h4><p>Multiplexers and buses choose which operands reach which unit.</p></div><div class="l7-box vio"><h4>Operators</h4><p>Adders, logic units, shifters, comparators and multipliers transform data.</p></div></div>' +
          '<p style="margin-top:12px">Because every bit of a word is processed the same way, datapaths are designed as <b>bit-slices</b>: one cell row per bit, stacked N times. This gives dense layout, predictable wiring, and lets data run in one direction (e.g. horizontally on lower metal) while control signals cross every slice in the other direction.</p>'
      },
      {
        id: 'c-mux', type: 'concept', title: 'Multiplexer-based datapaths and shifters', nav: 'Muxes & shifters',
        html: '<p>Multiplexers are the switches of a datapath. An N-bit k:1 mux is N copies of a 1-bit mux sharing the same ⌈log₂k⌉ select lines. In CMOS they are built from AOI/OAI gates, transmission gates or tri-state drivers onto a shared bus.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Shift</th><th>Operation</th><th>Fill</th><th>Typical use</th></tr>' +
          '<tr><td>Logical left</td><td>bits move to higher positions</td><td>0 into LSB</td><td>× 2<sup>k</sup> (unsigned)</td></tr>' +
          '<tr><td>Logical right</td><td>bits move to lower positions</td><td>0 into MSB</td><td>÷ 2<sup>k</sup> unsigned</td></tr>' +
          '<tr><td>Arithmetic right</td><td>bits move to lower positions</td><td>copy of sign bit</td><td>÷ 2<sup>k</sup> signed</td></tr>' +
          '<tr><td>Rotate</td><td>bits wrap around</td><td>bits shifted out</td><td>crypto, CRC, bit manipulation</td></tr></table></div>' +
          '<p>A <b>barrel shifter</b> shifts by any amount in one cycle. The <b>logarithmic</b> version uses log₂N stages; stage k shifts by 2<sup>k</sup> when bit k of the shift amount is 1: N·log₂N muxes. An array (crossbar) shifter connects every input to every output through N² switches – one switch delay, but large area and long wires.</p>'
      },
      { id: 'w-barrel', type: 'widget', title: 'Barrel shifter lab', nav: 'Barrel shifter', intro: 'Choose a mode and shift amount and watch the data pass through the 1-, 2- and 4-bit stages. Try at least six mode/amount combinations.', build: barrel },
      {
        id: 'c-alu', type: 'concept', title: 'Arithmetic units and ALU architecture', nav: 'ALU',
        html: '<p>An <b>ALU</b> places several functional units in parallel on the same operands and selects one result with an output multiplexer driven by the opcode. Only the selected unit\'s result matters, but all units switch – so wide ALUs sometimes gate the inputs of unused units to save power.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Typical units</h4><ul><li>Adder/subtractor (shared, with B inversion and carry-in)</li><li>Logic unit (AND, OR, XOR, NOT – often one 4:1 mux per bit using the inputs as selects)</li><li>Shifter</li><li>Set-less-than: sign of A − B, corrected for overflow</li></ul></div>' +
          '<div class="l7-box cu"><h4>Status flags</h4><ul><li><b>Z</b> – result is zero (NOR of all result bits)</li><li><b>N</b> – result MSB (sign)</li><li><b>C</b> – carry out of the MSB (unsigned overflow / no-borrow)</li><li><b>V</b> – signed overflow: carry into MSB ≠ carry out of MSB</li></ul></div></div>'
      },
      { id: 'w-alu', type: 'widget', title: 'ALU explorer', nav: 'ALU lab', intro: 'Try at least five operations. Start with ADD of 0x7F + 0x01 and watch the V flag.', build: aluLab },
      { id: 'w-puzzle', type: 'widget', title: 'Datapath puzzle: program it with a control word', nav: 'Puzzle', intro: 'Every operation in a datapath is just a combination of mux selects and function codes. Solve all four tasks.', build: puzzle },
      {
        id: 'st-acc', type: 'steps', title: 'Animation: a datapath example – accumulating four numbers', nav: 'Datapath example',
        frames: [
          { t: 'An <b>accumulator datapath</b>: an adder whose output is stored in register ACC and fed back to its input. Control resets ACC to 0.', svg: accFrame(0) },
          { t: 'Clock 1: X = 7 is added. ACC ← 0 + 7 = 7.', svg: accFrame(1) },
          { t: 'Clock 2: X = 5. ACC ← 7 + 5 = 12.', svg: accFrame(2) },
          { t: 'Clock 3: X = 9. ACC ← 12 + 9 = 21.', svg: accFrame(3) },
          { t: 'Clock 4: X = 4. ACC ← 21 + 4 = 25. The same small datapath computed a 4-term sum by reusing one adder over time – a <b>time-multiplexed</b> datapath. Adding a multiplier in front turns it into a multiply-accumulate (MAC) unit, the core of DSP filters and AI accelerators.', svg: accFrame(4) }
        ]
      },
      {
        id: 'c-org', type: 'concept', title: 'Datapath organisation and design examples', nav: 'Organisation',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Bit-sliced floorplan</h4><p>Functional units are placed as columns, bits as rows. Data buses run along the slices; control and clock lines cross them. Operand order is chosen to keep the most-used connections short.</p></div>' +
          '<div class="l7-box"><h4>Regularity</h4><p>A datapath is designed once for one bit and replicated, so hand-optimised or tiled layouts are common for high-performance designs.</p></div>' +
          '<div class="l7-box"><h4>Examples</h4><ul><li>MAC unit for DSP / ML</li><li>Address-generation datapath (base + offset)</li><li>Checksum/CRC datapath using XOR and shift</li><li>Fixed-point filter tap</li></ul></div>' +
          '<div class="l7-box"><h4>Choosing operators</h4><p>The same function can be built many ways (Module 2). The datapath designer picks each operator\'s architecture to meet the cycle-time target with minimum area and energy.</p></div></div>'
      },
      {
        id: 'rv-dp', type: 'reveal', title: 'Click to reveal: datapath design questions', nav: 'Reveal',
        items: [
          { q: 'Why is a 4:1 logic-unit mux a neat way to build AND/OR/XOR?', a: 'Feed a<sub>i</sub>, b<sub>i</sub> into the mux select lines and the 4-bit opcode into the data inputs: the mux becomes a look-up table that can produce any of the 16 two-input functions.' },
          { q: 'When is a crossbar shifter better than a logarithmic one?', a: 'For small widths where one switch delay matters most. For wide words its N² switches and wiring become too large.' },
          { q: 'How is signed overflow V detected cheaply?', a: 'V = c<sub>N</sub> ⊕ c<sub>N−1</sub>: XOR of the carry into and the carry out of the most significant bit.' },
          { q: 'Why separate datapath and control?', a: 'The datapath can be designed and optimised as a regular structure, while control logic (often an FSM) can change without redesigning the datapath.' },
          { q: 'What is a tri-state bus and why is it used less today?', a: 'Several drivers share one wire, only one enabled at a time. It saves wires but risks contention and floating buses, so modern designs prefer multiplexers.' },
          { q: 'How many 2:1 muxes form a 1-bit 8:1 mux?', a: 'Seven, arranged as a tree of 4 + 2 + 1, controlled by 3 select bits.' }
        ]
      },
      {
        id: 'dd-dp', type: 'drag', title: 'Drag & drop: classify the datapath elements', nav: 'Drag & drop',
        bins: ['Storage', 'Steering', 'Operator', 'Control / status'],
        items: [['Register file', 0], ['Accumulator register', 0], ['Operand register', 0], ['4:1 multiplexer', 1], ['Shared bus with drivers', 1], ['Result select mux', 1], ['Barrel shifter', 2], ['Adder / subtractor', 2], ['Logic unit', 2], ['ALU opcode', 3], ['Zero flag Z', 3], ['Overflow flag V', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc3', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'How many 2:1 multiplexers does a 32-bit logarithmic barrel shifter need?', a: 160, tol: 0, abs: 0.01, h: 'N·log₂N.', s: '32 × log₂32 = 32 × 5 = <b>160</b>.' },
          { q: 'How many switches are in a 32 × 32 crossbar (array) shifter?', a: 1024, tol: 0, abs: 0.01, h: 'Every input to every output: N².', s: '32² = <b>1024</b> switches.' },
          { q: 'How many select lines does a 16-input multiplexer need?', a: 4, tol: 0, abs: 0.01, h: '⌈log₂k⌉.', s: 'log₂16 = <b>4</b>.' },
          { q: 'An 8-bit ALU adds 0x60 + 0x50 (96 + 80) as signed numbers. What is the signed overflow flag V? (0 or 1)', a: 1, tol: 0, abs: 0.01, h: 'Signed 8-bit range is −128…127.', s: '96 + 80 = 176 > 127. The result 0xB0 has its sign bit set although both operands are positive → <b>V = 1</b>.' },
          { q: 'How many 2:1 muxes are needed for a 16-bit wide 4:1 multiplexer built as a mux tree?', a: 48, tol: 0, abs: 0.01, h: 'A 1-bit 4:1 mux = 3 two-input muxes.', s: '3 × 16 = <b>48</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Arithmetic right shift of 1110 0000 by 2 gives…', o: ['0011 1000', '1111 1000', '1000 0011', '0000 0000'], a: 1, w: 'The sign bit (1) is copied into the vacated positions.' },
          { q: 'In a logarithmic barrel shifter, stage k shifts by…', o: ['k bits', '2<sup>k</sup> bits', 'k² bits', 'N − k bits'], a: 1, w: 'Stages shift by 1, 2, 4, … under control of bit k of the amount.' },
          { q: 'The carry flag C after an unsigned subtraction A − B (A + B̄ + 1) is 1 when…', o: ['A < B', 'A ≥ B', 'A = 0', 'the result is negative'], a: 1, w: 'C = 1 means no borrow.' },
          { q: 'Bit-sliced datapath layout mainly gives…', o: ['irregular wiring', 'regular, dense layout and short data wires', 'fewer registers', 'faster control logic'], a: 1, w: 'The same slice is tiled for every bit.' }
        ]
      },
      {
        id: 'short3', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the organisation of a simple ALU that supports ADD, SUB, AND, OR and shift.', k: ['adder|subtract', 'logic', 'shift', 'mux|multiplexer|select', 'opcode|control'], m: 'Operands A and B feed several functional units in parallel: an adder/subtractor (B inverted and carry-in set for SUB), a logic unit for AND/OR and a shifter. An output multiplexer controlled by the opcode selects which unit\'s result becomes Y, and flag logic produces Z, N, C and V.' },
          { q: 'Compare logarithmic and crossbar barrel shifters.', k: ['log|stages', 'n²|n^2|square|crossbar', 'area|switch', 'delay|speed'], m: 'A logarithmic shifter uses log₂N stages of N muxes (N·log₂N in total), each controlled by one shift-amount bit; it is compact but has log₂N mux delays. A crossbar uses N² switches with one switch delay, but its area and wiring grow quadratically, so it suits only small widths.' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your ALU\'s logic unit, shifter and adder all toggle on every cycle, though only one result is used. The chip runs hot.', q: 'What is a simple datapath-level fix?', o: [{ t: 'Gate (hold) the inputs of the unused units so they do not switch', ok: true, w: 'Operand isolation stops useless switching in unselected units.' }, { t: 'Add more output multiplexers', ok: false, w: 'That adds hardware without stopping the switching.' }, { t: 'Use a crossbar shifter', ok: false, w: 'A larger shifter would switch even more capacitance.' }] },
          { s: 'A signal-processing block divides signed samples by 4.', q: 'Which datapath operation implements this most cheaply?', o: [{ t: 'Logical right shift by 2', ok: false, w: 'Logical shift fills with 0, so negative numbers become large positive ones.' }, { t: 'Arithmetic right shift by 2', ok: true, w: 'It preserves the sign bit (note: it rounds toward −∞).' }, { t: 'Rotate right by 2', ok: false, w: 'Rotation moves low bits into the top: not a division.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'The datapath of a digital system…', o: ['decides what happens each cycle', 'stores and transforms data words', 'generates the clock', 'only contains registers'], a: 1, w: 'Control decides; the datapath stores and operates on data.' },
      { q: 'A 1-bit 8:1 mux needs how many select lines?', o: ['2', '3', '8', '7'], a: 1, w: 'log₂8 = 3.' },
      { q: 'Logical right shift fills the vacated MSBs with…', o: ['the sign bit', '0', '1', 'the bits shifted out'], a: 1, w: 'Zero fill.' },
      { q: 'Rotate right by 1 of 1000 0001 gives…', o: ['0100 0000', '1100 0000', '0000 0011', '1000 0000'], a: 1, w: 'The LSB (1) wraps into the MSB: 1100 0000.' },
      { q: 'A 64-bit logarithmic barrel shifter has how many stages?', o: ['4', '6', '8', '64'], a: 1, w: 'log₂64 = 6.' },
      { q: 'The overflow flag V of a signed addition equals…', o: ['carry out of MSB', 'carry into MSB XOR carry out of MSB', 'NOR of all result bits', 'result MSB'], a: 1, w: 'V = c<sub>N</sub> ⊕ c<sub>N−1</sub>.' },
      { q: 'The zero flag Z is produced by…', o: ['an AND of the result bits', 'a NOR of the result bits', 'the carry out', 'an XOR of A and B'], a: 1, w: 'Z = 1 only when every result bit is 0.' },
      { q: 'Bit-slicing means…', o: ['cutting the wafer', 'designing one bit cell and replicating it for every bit', 'dividing the clock', 'removing unused bits'], a: 1, w: 'Regular tiling of identical bit cells.' },
      { q: 'An accumulator datapath computes a sum over several cycles by…', o: ['using many adders in parallel', 'feeding the register output back into one adder', 'shifting the data', 'using a crossbar'], a: 1, w: 'Time-multiplexing one adder.' },
      { q: 'Which control signal chooses the ALU result among its units?', o: ['the clock', 'the opcode driving the output mux', 'the carry-in', 'the reset'], a: 1, w: 'The opcode selects the unit\'s output.' }
    ]
  });
})();
