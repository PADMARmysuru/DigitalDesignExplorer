/* Level 7 · Module 4 – VLSI Memory Circuits */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- 6T SRAM cell drawing ---------- */
  function cellSvg(st) {
    // st: {q, wl, bl, blb, note, flip}
    var o = '', q = st.q, wlOn = st.wl;
    o += P('M40 30H520', wlOn ? 'w-on' : 'w') + T(30, 35, 'WL', wlOn ? 't-sig t-b' : 't-dim t-b', 'end');
    // bitlines
    o += P('M80 20V250', 'w-cu') + P('M480 20V250', 'w-cu');
    o += T(80, 270, 'BL', 't-cu t-b') + T(480, 270, 'BLB', 't-cu t-b');
    // bitline voltage bars
    var bar = function (x, v) { var hh = 70 * v; return R(x - 8, 100, 16, 70, 'box', 3) + '<rect x="' + (x - 6) + '" y="' + (170 - hh) + '" width="12" height="' + hh + '" rx="2" fill="var(--l7-cu)" opacity=".8"/>' + T(x, 186, (v * 1).toFixed(2) + 'V', 't-cu t-sm'); };
    o += bar(50, st.bl) + bar(510, st.blb);
    // access transistors
    o += R(110, 110, 60, 34, wlOn ? 'box-on' : 'box', 6) + T(140, 132, 'M5', 't-ink t-sm');
    o += R(390, 110, 60, 34, wlOn ? 'box-on' : 'box', 6) + T(420, 132, 'M6', 't-ink t-sm');
    o += P('M140 30V110', wlOn ? 'w-on' : 'w-thin') + P('M420 30V110', wlOn ? 'w-on' : 'w-thin');
    o += P('M80 127H110', wlOn ? 'w-on' : 'w') + P('M450 127H480', wlOn ? 'w-on' : 'w');
    o += P('M170 127H210', 'w') + P('M350 127H390', 'w');
    // nodes
    o += L.dot(210, 127, 7, q ? 'dot-on' : 'dot') + T(210, 160, 'Q=' + q, q ? 't-sig t-b' : 't-ink t-b');
    o += L.dot(350, 127, 7, !q ? 'dot-on' : 'dot') + T(350, 160, 'QB=' + (q ? 0 : 1), !q ? 't-sig t-b' : 't-ink t-b');
    // cross coupled inverters
    o += '<path d="M240 70L300 90L240 110Z" class="box-vio"/><circle cx="305" cy="90" r="5" class="box"/>' + T(262, 64, 'INV1', 't-vio t-sm');
    o += '<path d="M320 150L260 170L320 190Z" class="box-vio"/><circle cx="255" cy="170" r="5" class="box"/>' + T(298, 206, 'INV2', 't-vio t-sm');
    o += P('M210 127V90H240', q ? 'w-on' : 'w') + P('M310 90H350V127', !q ? 'w-on' : 'w');
    o += P('M350 127V170H320', !q ? 'w-on' : 'w') + P('M250 170H210V127', q ? 'w-on' : 'w');
    if (st.flip) o += '<circle cx="280" cy="130" r="58" class="w-cu pulse"/>';
    o += T(280, 240, st.note || '', 't-ink');
    return S(560, 280, o, '6T SRAM cell');
  }

  /* ---------- Widget: SRAM cell operations ---------- */
  function sramLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>6T SRAM cell · precharge, read and write</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var st = { q: 1, wl: 0, bl: 0, blb: 0, note: 'Hold: WL = 0, the inverters keep Q by feedback.' }, did = {}, pre = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    [['Hold', hold], ['Precharge BL, BLB', precharge], ['Read', read], ['Write 0', function () { write(0); }], ['Write 1', function () { write(1); }]].forEach(function (b) { row.appendChild(L.btn(b[0], '', b[1])); });
    function draw() { pic.innerHTML = cellSvg(st); }
    function hold() { st = { q: st.q, wl: 0, bl: st.bl, blb: st.blb, note: 'Hold: WL = 0, the cross-coupled inverters keep Q by feedback.' }; pre = false; L.fb(fb, 'info', 'With the access transistors off, the cell retains its value as long as power is applied (static storage).'); draw(); }
    function precharge() { st = { q: st.q, wl: 0, bl: 1, blb: 1, note: 'Precharge: both bitlines charged to VDD.' }; pre = true; L.fb(fb, 'info', 'Before every read the bitlines are precharged (and equalised) to VDD.'); draw(); }
    function read() {
      if (!pre) { L.fb(fb, 'bad', 'Precharge the bitlines first – reads start from BL = BLB = VDD.'); return; }
      var bl = st.q ? 1 : 0.88, blb = st.q ? 0.88 : 1;
      st = { q: st.q, wl: 1, bl: bl, blb: blb, note: 'Read: WL = 1. The side storing 0 slowly discharges its bitline.' };
      did.read = 1; pre = false;
      L.fb(fb, 'ok', 'Read Q = ' + st.q + ': ' + (st.q ? 'BLB' : 'BL') + ' drops by about 120 mV through the access transistor and the pull-down nMOS. The sense amplifier detects which bitline is lower. The cell is designed so this small disturbance does not flip it (<b>read stability</b>: pull-down stronger than access transistor).');
      draw(); done();
    }
    function write(v) {
      var flip = st.q !== v;
      st = { q: v, wl: 1, bl: v ? 1 : 0, blb: v ? 0 : 1, note: 'Write ' + v + ': drivers force BL=' + v + ', BLB=' + (v ? 0 : 1) + ', WL = 1.', flip: flip };
      did['w' + v] = 1; pre = false;
      L.fb(fb, 'ok', 'The write driver pulls one bitline to 0. Through the access transistor it overpowers the cell\'s pMOS pull-up on that side and the feedback loop flips' + (flip ? '' : ' (here Q already equalled ' + v + ', so nothing changed)') + '. Requirement (<b>writability</b>): access transistor stronger than the pull-up pMOS.');
      draw(); done();
    }
    function done() { if (did.read && did.w0 && did.w1) api.done(); }
    hold();
  }

  /* ---------- Widget: array organisation ---------- */
  function arrayLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Array organiser · words, width and column multiplexing</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cfg = { w: 4096, b: 16, m: 8 }, n = 0;
    var g = L.h('div', 'l7-grid3'); body.appendChild(g);
    L.select(g, 'Words', [['1024', '1K'], ['4096', '4K'], ['16384', '16K'], ['65536', '64K']], '4096', function (v) { cfg.w = +v; upd(1); });
    L.select(g, 'Word width', [['8', '8 bits'], ['16', '16 bits'], ['32', '32 bits'], ['64', '64 bits']], '16', function (v) { cfg.b = +v; upd(1); });
    L.select(g, 'Column mux', [['1', '1:1'], ['2', '2:1'], ['4', '4:1'], ['8', '8:1'], ['16', '16:1']], '8', function (v) { cfg.m = +v; upd(1); });
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var out = L.h('div', 'l7-readout'); split.appendChild(out);
    function upd(ch) {
      if (ch) n++; if (n >= 3) api.done();
      var rows = cfg.w / cfg.m, cols = cfg.b * cfg.m, ra = Math.log2(rows), ca = Math.log2(cfg.m), bits = cfg.w * cfg.b, ar = cols / rows;
      var maxS = 220, sc = maxS / Math.max(rows, cols), wv = Math.max(8, cols * sc), hv = Math.max(8, rows * sc), o = '';
      o += R(90, 20, wv, hv, 'box-on', 4) + T(90 + wv / 2, 20 + hv / 2 + 4, rows + ' × ' + cols, 't-ink t-b t-sm');
      o += R(30, 20, 50, hv, 'box-vio', 4) + T(55, 14, 'row dec', 't-vio t-sm');
      o += R(90, 28 + hv, wv, 20, 'box-cu', 3) + T(90 + wv / 2, 42 + hv, 'col mux ' + cfg.m + ':1 + SA', 't-cu t-sm');
      o += T(90 + wv / 2, 70 + hv, cfg.b + ' data bits out', 't-dim t-sm');
      pic.innerHTML = S(340, 80 + hv + 10, o, 'Memory array organisation');
      var verdict = ar > 4 || ar < 0.25 ? '⚠ very unbalanced – long wordlines or bitlines slow the array' : (ar >= 0.5 && ar <= 2 ? '✓ close to square: balanced wordline and bitline lengths' : 'acceptable');
      out.innerHTML = '<span class="k">Capacity</span> ' + bits / 1024 + ' Kbit<br><span class="k">Rows</span> = words ÷ mux = <span class="v">' + rows + '</span><br><span class="k">Columns</span> = width × mux = <span class="v">' + cols + '</span>' +
        '<br><span class="k">Row address bits</span> <span class="c">' + ra + '</span> → ' + rows + ' wordlines<br><span class="k">Column address bits</span> <span class="c">' + ca + '</span><br><span class="k">Total address</span> ' + (ra + ca) + ' bits (log₂ ' + cfg.w + ')<br><span class="k">Aspect (cols/rows)</span> ' + L.fmt(ar, 2) + '<br>' + verdict;
    }
    upd(0);
  }

  /* ---------- Widget: NOR ROM programming ---------- */
  function romLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>NOR ROM · 4 words × 4 bits · place transistors to program</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var target = [0x9, 0x6, 0xF, 0x2], tr = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], addr = 0;
    body.appendChild(L.h('p', 'l7-hint', 'In a NOR ROM every bitline is pulled high. A transistor at a wordline/bitline crossing pulls the bitline low when that word is selected – so a transistor stores a <b>0</b> and no transistor stores a <b>1</b>. Tap the crossings to place transistors so the ROM holds the target words.'));
    var A = L.bits(body, 'Address A1 A0', 2, 0, function (v) { addr = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('Check ROM contents', 'pri', function () {
      var ok = target.every(function (t, w) { return word(w) === t; });
      if (ok) { L.fb(fb, 'ok', '✓ The ROM stores 9, 6, 15 and 2. ' + count() + ' transistors were needed – one per stored 0.'); api.done(); }
      else L.fb(fb, 'bad', '✗ Some words differ. Word ' + target.map(function (t, w) { return word(w) === t ? null : w; }).filter(function (x) { return x !== null; }).join(', ') + ' is wrong.');
    }));
    function word(w) { var v = 0; for (var b = 0; b < 4; b++) if (!tr[w][b]) v |= 1 << (3 - b); return v; }
    function count() { var c = 0; tr.forEach(function (r) { r.forEach(function (x) { c += x; }); }); return c; }
    function draw() {
      var o = '';
      for (var b = 0; b < 4; b++) { var x = 150 + b * 80; o += P('M' + x + ' 30V250', 'w-cu') + T(x, 22, 'D' + (3 - b), 't-cu t-b') + R(x - 12, 254, 24, 14, 'box', 3) + T(x, 284, 'pull-up', 't-dim t-sm'); }
      for (var w = 0; w < 4; w++) {
        var y = 60 + w * 50, sel = w === addr;
        o += R(20, y - 14, 70, 28, sel ? 'box-on' : 'box-vio', 5) + T(55, y + 4, 'WL' + w, sel ? 't-sig t-b' : 't-vio t-sm');
        o += P('M90 ' + y + 'H470', sel ? 'w-on' : 'w-thin');
        o += T(510, y + 5, 'tgt ' + L.bin(target[w], 4), word(w) === target[w] ? 't-ok t-sm' : 't-dim t-sm');
        for (var b2 = 0; b2 < 4; b2++) {
          var x2 = 150 + b2 * 80, has = tr[w][b2];
          o += '<g class="click" data-w="' + w + '" data-b="' + b2 + '" role="button" tabindex="0" aria-label="Word ' + w + ' bit D' + (3 - b2) + (has ? ' transistor' : ' empty') + '">' +
            '<rect x="' + (x2 - 22) + '" y="' + (y - 18) + '" width="44" height="36" fill="transparent"/>' +
            (has ? R(x2 - 14, y - 12, 28, 24, sel ? 'box-bad' : 'box', 5) + T(x2, y + 5, 'T', 't-ink t-b t-sm') : '<circle cx="' + x2 + '" cy="' + y + '" r="5" class="dot"/>') + '</g>';
        }
      }
      pic.innerHTML = S(600, 296, o, 'NOR ROM array');
      L.$$('g.click', pic).forEach(function (g) {
        g.addEventListener('click', function () { var w = +g.getAttribute('data-w'), b = +g.getAttribute('data-b'); tr[w][b] ^= 1; draw(); });
      });
      out.innerHTML = '<span class="k">Address</span> ' + L.bin(addr, 2) + ' → decoder raises WL' + addr + ' → <span class="k">output</span> <span class="v">' + L.bin(word(addr), 4) + '</span> (' + word(addr) + ')';
    }
    draw();
  }

  /* ---------- Widget: DRAM charge sharing ---------- */
  function dramLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>DRAM read · charge sharing between cell and bitline</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { cs: 20, cb: 100, vdd: 1.2, bit: 1 }, n = 0;
    L.slider(body, 'Cell capacitance Cs', 5, 40, 1, p.cs, function (v) { return v + ' fF'; }, function (v) { p.cs = v; upd(1); });
    L.slider(body, 'Bitline capacitance Cbl', 40, 300, 10, p.cb, function (v) { return v + ' fF'; }, function (v) { p.cb = v; upd(1); });
    var r = L.h('div', 'l7-row'); body.appendChild(r);
    var bb = L.btn('Cell stores 1', 'is-on', function () { p.bit ^= 1; bb.textContent = 'Cell stores ' + p.bit; upd(1); }); r.appendChild(bb);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd(ch) {
      if (ch) n++; if (n >= 3) api.done();
      var vpre = p.vdd / 2, vc = p.bit ? p.vdd : 0, vf = (p.cs * vc + p.cb * vpre) / (p.cs + p.cb), dv = vf - vpre, o = '';
      o += R(30, 40, 60, 140, 'box', 4) + T(60, 30, 'Cell', 't-ink t-b');
      o += '<rect x="34" y="' + (176 - 132 * vc / p.vdd) + '" width="52" height="' + (132 * vc / p.vdd) + '" fill="var(--l7-sig)" opacity=".6"/>';
      o += P('M90 110H170', 'w-on flow') + T(130, 100, 'WL on', 't-sig t-sm');
      o += R(170, 40, 60, 140, 'box', 4) + T(200, 30, 'Bitline', 't-ink t-b');
      o += '<rect x="174" y="' + (176 - 132 * vf / p.vdd) + '" width="52" height="' + (132 * vf / p.vdd) + '" fill="var(--l7-cu)" opacity=".7"/>';
      o += P('M170 ' + (176 - 132 * vpre / p.vdd) + 'H230', 'w-dash') + T(236, 180 - 132 * vpre / p.vdd, 'VDD/2', 't-dim t-sm', 'start');
      o += T(300, 70, 'after charge sharing:', 't-dim', 'start');
      o += T(300, 100, 'ΔV = ' + (dv * 1000).toFixed(0) + ' mV', Math.abs(dv) < 0.05 ? 't-bad t-b t-lg' : 't-sig t-b t-lg', 'start');
      o += T(300, 130, 'transfer ratio Cs/(Cs+Cbl) = ' + (p.cs / (p.cs + p.cb)).toFixed(3), 't-ink', 'start');
      pic.innerHTML = S(560, 196, o, 'DRAM charge sharing');
      L.fb(out, Math.abs(dv) < 0.05 ? 'bad' : 'info', 'ΔV = ±(VDD/2)·Cs/(Cs + Cbl) = ' + (dv >= 0 ? '+' : '') + (dv * 1000).toFixed(0) + ' mV. ' + (Math.abs(dv) < 0.05 ? 'This signal is too small for a reliable sense amplifier – shorten the bitline or increase Cs.' : 'The sense amplifier compares the bitline with a reference at VDD/2 and restores the full value, because the read destroyed the stored charge.'));
    }
    upd(0);
  }

  function saFrame(k) {
    var o = '';
    var vbl = [0.6, 0.6, 0.6, 1.2, 1.2][k], vblb = [0.6, 0.6, 0.48, 0, 0][k];
    var labels = ['Precharge & equalise', 'Word line rises', 'Small ΔV develops', 'SAE fires: latch regenerates', 'Full-swing output'];
    o += T(280, 22, labels[k], 't-vio t-b t-lg');
    var bar = function (x, v, l) { var hh = 120 * v / 1.2; return R(x - 20, 50, 40, 120, 'box', 4) + '<rect x="' + (x - 16) + '" y="' + (168 - hh) + '" width="32" height="' + hh + '" rx="3" fill="var(--l7-cu)" opacity=".8"/>' + T(x, 190, l + ' ' + v.toFixed(2) + ' V', 't-cu t-sm'); };
    o += bar(150, vbl, 'BL') + bar(410, vblb, 'BLB');
    o += '<path d="M240 80L320 110L240 140Z" class="' + (k >= 3 ? 'box-on' : 'box') + '"/><path d="M320 125L240 155L320 185Z" class="' + (k >= 3 ? 'box-on' : 'box') + '"/>';
    o += T(280, 210, k >= 3 ? 'SAE = 1 (cross-coupled latch on)' : 'SAE = 0', k >= 3 ? 't-sig' : 't-dim');
    return S(560, 222, o, 'Sense amplifier ' + labels[k]);
  }

  L.module({
    n: 4,
    lead: 'Memories fill most of the area of a modern chip. Learn how a 6T SRAM cell is read and written, how millions of cells are organised into arrays, and the peripheral circuits – decoders, sense amplifiers, drivers – that make them fast. Then compare DRAM and ROM.',
    tags: ['memory hierarchy', '6T SRAM', 'read / write', 'array organisation', 'decoders', 'sense amplifiers', 'DRAM', 'ROM'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-hier', type: 'concept', title: 'The memory hierarchy concept', nav: 'Hierarchy',
        html: '<p>No single memory technology is fast, dense, cheap and non-volatile at once, so systems use a hierarchy: small, fast storage close to the logic and larger, slower, denser storage further away.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Level</th><th>Circuit</th><th>Cell</th><th>Speed</th><th>Density</th><th>Volatile?</th></tr>' +
          '<tr><td>Registers / register files</td><td>flip-flops, multi-port cells</td><td>~20+ transistors</td><td>fastest</td><td>lowest</td><td>yes</td></tr>' +
          '<tr><td>On-chip SRAM</td><td>6T SRAM arrays</td><td>6 transistors</td><td>very fast</td><td>medium</td><td>yes</td></tr>' +
          '<tr><td>DRAM</td><td>1T1C arrays</td><td>1 transistor + capacitor</td><td>slower</td><td>high</td><td>yes, needs refresh</td></tr>' +
          '<tr><td>ROM / Flash</td><td>NOR/NAND arrays</td><td>1 transistor (special)</td><td>read: medium</td><td>very high</td><td>no</td></tr></table></div>' +
          '<p>This module focuses on the <b>circuits</b>. How processors organise caches is part of Level 13.</p>'
      },
      {
        id: 'c-sram', type: 'concept', title: 'The 6T SRAM cell', nav: '6T SRAM',
        html: '<p>Two cross-coupled inverters form a bistable latch with complementary nodes Q and QB. Two nMOS <b>access transistors</b>, controlled by the <b>wordline (WL)</b>, connect the nodes to the complementary <b>bitlines BL and BLB</b>.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Read</h4><p>Bitlines precharged to VDD, WL raised. The side storing 0 discharges its bitline slightly through the access and pull-down transistors. A sense amplifier detects the small difference. <b>Read stability</b> requires the pull-down nMOS to be stronger than the access nMOS (cell ratio ≈ 1.5–2) so the 0-node does not rise enough to flip the cell.</p></div>' +
          '<div class="l7-box cu"><h4>Write</h4><p>A write driver forces one bitline to 0 and the other to VDD, then WL rises. The 0-bitline pulls the 1-node down through the access transistor, overpowering the pMOS pull-up, and the latch flips. <b>Writability</b> requires the access nMOS to be stronger than the pull-up pMOS (pull-up ratio &lt; 1).</p></div></div>' +
          '<p style="margin-top:12px">These opposing sizing constraints, together with variation (Module 8), make SRAM cell design a careful balance. Advanced nodes add 8T cells with a separate read port to decouple read stability from writability.</p>'
      },
      { id: 'w-sram', type: 'widget', title: 'SRAM cell lab: read and write the cell', nav: 'SRAM lab', intro: 'Precharge, then read. Then write 0 and write 1. Watch the bitline voltages and node values.', build: sramLab },
      {
        id: 'c-array', type: 'concept', title: 'SRAM array organisation and peripheral circuits', nav: 'Array & periphery',
        html: '<p>Cells are tiled into a 2-D array: each <b>row</b> shares a wordline, each <b>column</b> shares a bitline pair. The address is split into a row address (selects one wordline) and a column address (selects which columns go to the output).</p>' +
          '<div class="l7-grid2"><div class="l7-box vio"><h4>Row decoder</h4><p>n address bits select one of 2<sup>n</sup> wordlines. Large decoders use <b>predecoding</b>: groups of 2–3 address bits are decoded first, then a final AND per row combines the predecoded lines, reducing gate fan-in. Wordline drivers are sized to drive a long, heavily loaded wordline.</p></div>' +
          '<div class="l7-box cu"><h4>Column circuitry</h4><p><b>Precharge/equalise</b> transistors, a <b>column multiplexer</b> (k:1) that lets several columns share one sense amplifier, <b>sense amplifiers</b> and <b>write drivers</b>.</p></div>' +
          '<div class="l7-box sig"><h4>Sense amplifier</h4><p>A cross-coupled latch enabled by SAE after a small differential voltage (~50–150 mV) has developed. Positive feedback amplifies it to full swing quickly, so reads do not wait for the bitline to fully discharge.</p></div>' +
          '<div class="l7-box"><h4>Timing &amp; control</h4><p>Self-timed control generates precharge, wordline enable, sense enable and write enable in the right order, often using replica bitlines that track the real array.</p></div></div>' +
          '<p style="margin-top:12px">Designers choose the column-mux ratio so the array is close to <b>square</b>: very long wordlines or bitlines add RC delay and capacitance. Large memories are split into banks/sub-arrays for the same reason.</p>'
      },
      { id: 'w-array', type: 'widget', title: 'Array organiser', nav: 'Array lab', intro: 'Change the configuration at least three times. Aim for an array that is close to square.', build: arrayLab },
      {
        id: 'st-sa', type: 'steps', title: 'Animation: latch-type sense amplifier', nav: 'Sense amp animation',
        frames: [
          { t: 'Before the read, BL and BLB are precharged and equalised to the same voltage, so the amplifier starts balanced. (Shown here at VDD/2 for clarity; SRAM usually precharges to VDD.)', svg: saFrame(0) },
          { t: 'The wordline rises; the selected cell starts to discharge one bitline.', svg: saFrame(1) },
          { t: 'After a short time a small differential (~120 mV) has developed. Waiting for full discharge would be slow.', svg: saFrame(2) },
          { t: 'Sense-amplifier enable (SAE) turns on the cross-coupled latch. Positive feedback drives the higher line up and the lower line down.', svg: saFrame(3) },
          { t: 'Within a fraction of a nanosecond the outputs reach full logic levels and the data can be latched.', svg: saFrame(4) }
        ]
      },
      {
        id: 'c-dram', type: 'concept', title: 'DRAM and ROM architectures', nav: 'DRAM & ROM',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>DRAM (1T1C)</h4><p>One access transistor and one storage capacitor per bit. A read connects the small cell capacitance C<sub>s</sub> to a much larger bitline C<sub>bl</sub> precharged to VDD/2: <b>charge sharing</b> produces only a small ΔV, and the read is <b>destructive</b>, so the sense amplifier must write the value back. Leakage drains the capacitor, so every row must be <b>refreshed</b> every few tens of milliseconds.</p><div class="l7-eq">ΔV = (VDD/2) · C<sub>s</sub> / (C<sub>s</sub> + C<sub>bl</sub>)</div></div>' +
          '<div class="l7-box vio"><h4>ROM</h4><p>Data is fixed by the presence or absence of a transistor (mask ROM) or by a programmable device (PROM, Flash). A <b>NOR ROM</b> has transistors in parallel on each bitline – fast random access. A <b>NAND ROM</b> puts transistors in series – denser but slower. ROMs store boot code, look-up tables and microcode.</p></div></div>'
      },
      { id: 'w-dram', type: 'widget', title: 'DRAM charge-sharing lab', nav: 'DRAM lab', intro: 'Change Cs, Cbl and the stored value (at least three changes). See why DRAM bitlines must stay short.', build: dramLab },
      { id: 'w-rom', type: 'widget', title: 'ROM lab: decoder + NOR array', nav: 'ROM lab', intro: 'Program the 4 × 4 NOR ROM so that it stores the target words, then step the address to read them back.', build: romLab },
      {
        id: 'rv-mem', type: 'reveal', title: 'Click to reveal: memory design questions', nav: 'Reveal',
        items: [
          { q: 'Why are SRAM bitlines differential (BL and BLB)?', a: 'A differential signal lets the sense amplifier detect a small difference quickly and rejects common-mode noise that affects both lines.' },
          { q: 'Why is a DRAM read destructive?', a: 'Charge sharing moves the cell\'s stored charge onto the bitline. The cell no longer holds its original voltage, so the sense amplifier restores it.' },
          { q: 'What does a column multiplexer save?', a: 'Sense amplifiers and write drivers: several columns share one, and the array can be reshaped closer to square.' },
          { q: 'Why use predecoding in row decoders?', a: 'A direct 8-input AND per row is slow and loads the address lines heavily. Decoding 2–3 bits at a time first reduces fan-in and the number of transistors on each address line.' },
          { q: 'Why is SRAM faster but less dense than DRAM?', a: 'SRAM actively drives the bitline with a latch (fast, no refresh), but needs 6 transistors. DRAM needs only 1 transistor and a capacitor, but sensing is slower and refresh is required.' },
          { q: 'What sets the lowest supply voltage of an SRAM?', a: 'Cell stability: below a minimum VDD (Vmin), variation makes some cells unable to read without flipping or to write at all. SRAM Vmin often limits whole-chip voltage scaling.' }
        ]
      },
      {
        id: 'dd-mem', type: 'drag', title: 'Drag & drop: match the property to the memory', nav: 'Drag & drop',
        bins: ['6T SRAM', 'DRAM (1T1C)', 'NOR ROM', 'Peripheral circuit'],
        items: [['Cross-coupled inverters', 0], ['Read stability vs writability sizing', 0], ['Destructive read', 1], ['Needs periodic refresh', 1], ['Charge sharing with the bitline', 1], ['Transistor present stores 0', 2], ['Non-volatile contents', 2], ['Sense amplifier', 3], ['Predecoder', 3], ['Write driver', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc4', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A memory has 4K words of 16 bits with an 8:1 column multiplexer. How many rows does the array have?', a: 512, tol: 0, abs: 0.01, h: 'rows = words ÷ mux ratio.', s: '4096 ÷ 8 = <b>512 rows</b> (and 16 × 8 = 128 columns).' },
          { q: 'For that memory, how many row-address bits are needed?', a: 9, tol: 0, abs: 0.01, h: 'log₂(rows).', s: 'log₂512 = <b>9</b> (plus 3 column-address bits = 12 = log₂4096).' },
          { q: 'How many transistors are in the cell array of a 16 Kbit 6T SRAM? (1 Kbit = 1024 bits)', a: 98304, tol: 0, abs: 0.5, h: '6 per bit.', s: '16 × 1024 × 6 = <b>98 304</b>.' },
          { q: 'A DRAM cell with Cs = 25 fF is read onto a bitline with Cbl = 100 fF precharged to VDD/2 = 0.6 V. The cell stores VDD = 1.2 V. What is ΔV on the bitline (in mV)?', a: 120, u: 'mV', h: 'ΔV = (VDD/2)·Cs/(Cs+Cbl).', s: '0.6 × 25/125 = 0.12 V = <b>120 mV</b>.' },
          { q: 'A cell discharges a 100 fF bitline with 20 µA. How long until the differential reaches 100 mV (in ps)?', a: 500, u: 'ps', h: 't = C·ΔV / I.', s: '100 fF × 0.1 V / 20 µA = 5×10⁻¹⁰ s = <b>500 ps</b>.' }
        ]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In a 6T SRAM, read stability requires…', o: ['access nMOS stronger than pull-down nMOS', 'pull-down nMOS stronger than access nMOS', 'pull-up pMOS stronger than access nMOS', 'equal sizes'], a: 1, w: 'The 0-node must not rise enough to flip the cell.' },
          { q: 'A 10-bit row address can select how many wordlines?', o: ['10', '100', '512', '1024'], a: 3, w: '2¹⁰ = 1024.' },
          { q: 'DRAM must be refreshed because…', o: ['the access transistor wears out', 'charge on the storage capacitor leaks away', 'the bitline is too short', 'reads are too fast'], a: 1, w: 'Leakage discharges the cell capacitor over time.' },
          { q: 'A sense amplifier mainly speeds up…', o: ['writing', 'reading, by detecting a small bitline difference', 'refresh', 'decoding'], a: 1, w: 'No need to wait for full bitline discharge.' }
        ]
      },
      {
        id: 'short4', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the conflicting sizing requirements of the 6T SRAM cell.', k: ['read|stability', 'write|writability', 'pull-down|pulldown', 'pull-up|pullup|pmos', 'access'], m: 'For read stability the pull-down nMOS must be stronger than the access nMOS, so the node storing 0 stays low while the bitline is connected. For writability the access nMOS must be stronger than the pull-up pMOS, so a bitline at 0 can pull the node storing 1 low and flip the cell. The access device must therefore be weaker than the pull-down but stronger than the pull-up.' },
          { q: 'Describe the sequence of events in an SRAM read operation.', k: ['precharge', 'wordline|wl', 'discharge|differential|δv', 'sense'], m: 'The bitlines are precharged and equalised, then the decoded wordline rises and turns on the access transistors of one row. In each column the side storing 0 discharges its bitline slightly. When enough differential voltage has developed, the sense amplifier is enabled and amplifies it to full logic levels, and the column multiplexer passes the selected data to the output.' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A 1 Mbit SRAM macro is organised as 8192 rows × 128 columns. Reads are slow and the bitlines are very long.', q: 'What is the best first fix?', o: [{ t: 'Increase the column-mux ratio so the array has fewer rows and more columns', ok: true, w: 'A squarer array (e.g. 1024 × 1024) shortens bitlines, reducing their capacitance and the read delay.' }, { t: 'Remove the sense amplifiers', ok: false, w: 'Without sensing, reads would wait for full bitline swing – much slower.' }, { t: 'Use a 6-input NAND for every row decoder', ok: false, w: 'Decoder style does not fix the long-bitline problem.' }] },
          { s: 'At low supply voltage some SRAM cells flip when they are read, although writes work.', q: 'What is the most likely cause?', o: [{ t: 'Insufficient read stability – access transistors too strong relative to pull-downs (worsened by variation)', ok: true, w: 'Right. Fixes include resizing, a higher array supply, or 8T cells with a separate read port.' }, { t: 'The DRAM refresh rate is too low', ok: false, w: 'SRAM is not refreshed.' }, { t: 'The column multiplexer ratio is too large', ok: false, w: 'The mux ratio does not cause cells to flip during reads.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'A 6T SRAM cell contains…', o: ['one transistor and a capacitor', 'two cross-coupled inverters and two access transistors', 'six capacitors', 'a flip-flop with a clock'], a: 1, w: '4 transistors in the latch + 2 access transistors.' },
      { q: 'Before an SRAM read, the bitlines are…', o: ['grounded', 'precharged (and equalised)', 'left floating at random', 'driven by the write driver'], a: 1, w: 'Precharge sets a known balanced starting point.' },
      { q: 'During a write, the bitline driven to 0 must overpower the cell\'s…', o: ['pull-down nMOS', 'pull-up pMOS', 'sense amplifier', 'wordline driver'], a: 1, w: 'Writability: access stronger than pull-up.' },
      { q: 'A memory of 2K words × 32 bits with a 4:1 column mux has how many columns?', o: ['32', '64', '128', '512'], a: 2, w: '32 × 4 = 128 columns (and 512 rows).' },
      { q: 'Predecoding in a row decoder…', o: ['adds an extra clock cycle', 'reduces gate fan-in and address-line loading', 'removes the need for wordline drivers', 'stores data'], a: 1, w: 'Decode small groups of bits first.' },
      { q: 'DRAM reads are destructive because of…', o: ['hot carriers', 'charge sharing with the bitline', 'the sense amplifier', 'the column mux'], a: 1, w: 'The stored charge spreads onto the bitline.' },
      { q: 'Increasing the DRAM bitline capacitance makes the read signal ΔV…', o: ['larger', 'smaller', 'unchanged', 'negative'], a: 1, w: 'ΔV ∝ Cs/(Cs + Cbl).' },
      { q: 'In a NOR ROM, a stored 0 corresponds to…', o: ['no transistor at the crossing', 'a transistor at the crossing', 'a capacitor', 'a fuse'], a: 1, w: 'The transistor pulls the bitline low when its word is selected.' },
      { q: 'NAND ROMs compared with NOR ROMs are…', o: ['faster and less dense', 'denser but slower', 'volatile', 'identical'], a: 1, w: 'Series transistors: dense, slower.' },
      { q: 'Which circuit amplifies a ~100 mV bitline difference to full swing?', o: ['row decoder', 'sense amplifier', 'precharge transistor', 'column mux'], a: 1, w: 'A latch-type sense amplifier with positive feedback.' }
    ]
  });
})();
