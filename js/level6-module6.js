/* Level 6 – Module 6: Interfaces and Advanced SystemVerilog */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  /* ---------- Interface connection diagram (SVG) ---------- */
  var SIG_COL = ['#2F6BD2', '#8A5CF6', '#16924F', '#0B7A83', '#D9467A', '#C2570C', '#C4860A'];
  function chipSVG(x, y, w, h, title, sub, pins, side) {
    var s = '<rect x="' + (x + 3) + '" y="' + (y + 5) + '" width="' + w + '" height="' + h + '" rx="14" fill="rgba(18,35,63,.12)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14" fill="#12233F"/>' +
      '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (w - 16) + '" height="' + (h - 16) + '" rx="9" fill="none" stroke="rgba(255,255,255,.12)"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 - 2) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-weight="700" font-size="17" fill="#fff">' + title + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 18) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="11" fill="#9FE3E8">' + sub + '</text>';
    pins.forEach(function (py) {
      var px = side === 'r' ? x + w : x - 10;
      s += '<rect x="' + px + '" y="' + (py - 3) + '" width="10" height="6" rx="2" fill="#C9A227"/>';
    });
    return s;
  }
  function initIfConn() {
    var withIf = false, added = false, seen = {};
    var base = ['clk', 'rst_n', 'valid', 'ready', 'addr[7:0]', 'data[31:0]'];
    function draw() {
      var list = base.concat(added ? ['prot[2:0]'] : []), n = list.length;
      var H = 70 + n * 34, top = 46, mid = top + (n - 1) * 34 / 2 + 0;
      var ys = list.map(function (_, i) { return top + 20 + i * 34; });
      var chipH = n * 34 + 20;
      var svg = '<svg viewBox="0 0 680 ' + (H + 40) + '" role="img" aria-label="' + (withIf ? 'Master and slave connected by one interface bundle' : 'Master and slave connected by ' + n + ' separate wires') + '">';
      if (!withIf) {
        svg += chipSVG(30, top, 130, chipH, 'master', n + ' ports', ys, 'r') + chipSVG(520, top, 130, chipH, 'slave', n + ' ports', ys, 'l');
        list.forEach(function (sig, i) {
          var y = ys[i], c = SIG_COL[i % SIG_COL.length], isNew = sig.indexOf('prot') === 0;
          svg += '<path d="M170 ' + y + ' C 260 ' + y + ', 260 ' + y + ', 340 ' + y + ' S 420 ' + y + ', 510 ' + y + '" stroke="' + c + '" stroke-width="3" fill="none"' + (isNew ? ' class="l6-flowline"' : '') + '/>' +
            '<rect x="' + (340 - 52) + '" y="' + (y - 11) + '" width="104" height="22" rx="11" fill="#fff" stroke="' + c + '" stroke-width="1.5"/>' +
            '<text x="340" y="' + (y + 4) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="11.5" font-weight="600" fill="' + c + '">' + sig + '</text>';
        });
        svg += '<text x="340" y="' + (top - 16) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-size="13" fill="#7A8698">' + n + ' separate wires, each listed in both port lists and in top</text>';
      } else {
        var cy = top + chipH / 2;
        svg += chipSVG(30, top, 130, chipH, 'master', 'bus_if.master', [cy], 'r') + chipSVG(520, top, 130, chipH, 'slave', 'bus_if.slave', [cy], 'l');
        var bh = 26 + n * 9, by = cy - bh / 2;
        svg += '<rect x="170" y="' + (by + 4) + '" width="340" height="' + bh + '" rx="' + bh / 2 + '" fill="rgba(18,35,63,.15)"/>' +
          '<rect x="170" y="' + by + '" width="340" height="' + bh + '" rx="' + bh / 2 + '" fill="#10283F" stroke="#3FC1C9" stroke-width="3"/>';
        list.forEach(function (sig, i) {
          var y = by + 13 + i * 9;
          svg += '<line x1="196" y1="' + y + '" x2="484" y2="' + y + '" stroke="' + SIG_COL[i % SIG_COL.length] + '" stroke-width="4" stroke-linecap="round" opacity=".95"/>';
        });
        svg += '<rect x="282" y="' + (by - 30) + '" width="116" height="24" rx="12" fill="#C9A227"/><text x="340" y="' + (by - 13) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="12.5" font-weight="700" fill="#12233F">bus_if b</text>' +
          '<text x="340" y="' + (by + bh + 24) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-size="13" fill="#7A8698">' + n + ' signals travel inside ONE bundle: one port on each module</text>';
      }
      svg += '</svg>';
      var edits = added ? (withIf ? 1 : 5) : null;
      $('icView').innerHTML = '<div class="l6-svgbox l6-fadein">' + svg + '</div>' +
        '<div class="l6-stats"><div class="l6-stat"><b>' + n + '</b><span>signals on the bus</span></div><div class="l6-stat"><b>' + (withIf ? 1 : n) + '</b><span>port' + (withIf ? '' : 's') + ' per module</span></div>' +
        '<div class="l6-stat"><b>' + (withIf ? 1 : n * 2) + '</b><span>connections in top</span></div><div class="l6-stat"><b style="color:' + (edits === null ? 'inherit' : (edits > 1 ? 'var(--bad)' : 'var(--ok)')) + '">' + (edits === null ? '–' : edits) + '</b><span>edits to add <code>prot</code></span></div></div>';
    }
    L6.buttonGroup($('icMode'), [['Without interface', false], ['With interface', true]].map(function (m) {
      return { label: m[0], onSelect: function () { withIf = m[1]; seen[m[0]] = 1; draw(); report(); } };
    }), { select: 0 });
    function report() {
      if (!added) { L6.feedback($('icNote'), 'info', withIf ? 'One port per module, one connection per instance. Now press <b>Add a new signal</b>.' : 'Every signal is a separate port on both modules and a separate connection in <code>top</code>. Press <b>Add a new signal</b> to see the cost.'); return; }
      L6.feedback($('icNote'), withIf ? 'ok' : 'bad', withIf
        ? 'With an interface, adding <code>prot</code> is <b>1 edit</b>: declare it inside <code>bus_if</code> (and list it in the modports). No module port list or instantiation changes.'
        : 'Without an interface, adding <code>prot</code> means <b>5 edits</b>: the master port list, the slave port list, a new wire in top, and the master and slave instantiations. Miss one and it will not compile or, worse, connect wrongly.');
      if (seen['Without interface'] && seen['With interface']) L6.mark('ifconn');
    }
    $('icAdd').addEventListener('click', function () { added = !added; $('icAdd').innerHTML = added ? 'Remove signal <code>prot</code>' : 'Add a new signal <code>prot</code> to the bus'; draw(); report(); });
    draw(); report();
  }

  /* ---------- Modport direction visualizer (SVG) ---------- */
  function initModport() {
    var mp = {
      master: { clk: 'in', valid: 'out', ready: 'in', addr: 'out', data: 'out' },
      slave: { clk: 'in', valid: 'in', ready: 'out', addr: 'in', data: 'in' },
      monitor: { clk: 'in', valid: 'in', ready: 'in', addr: 'in', data: 'in' }
    };
    var ROLE = { master: '#2F6BD2', slave: '#8A5CF6', monitor: '#0B7A83' };
    var seen = {};
    function draw(k) {
      var m = mp[k], sigs = Object.keys(m), rowH = 46, top = 40, H = top + sigs.length * rowH + 30;
      var svg = '<svg viewBox="0 0 680 ' + H + '" role="img" aria-label="Directions of each signal for the ' + k + ' modport"><defs>' +
        '<marker id="mpOut" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#16924F"/></marker>' +
        '<marker id="mpIn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2F6BD2"/></marker></defs>';
      svg += '<rect x="20" y="' + (top - 14) + '" width="170" height="' + (sigs.length * rowH + 8) + '" rx="16" fill="' + ROLE[k] + '"/>' +
        '<text x="105" y="' + (top - 22 + (sigs.length * rowH) / 2) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="#fff">' + k + '</text>' +
        '<text x="105" y="' + (top - 2 + (sigs.length * rowH) / 2) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="11.5" fill="rgba(255,255,255,.85)">module</text>' +
        '<rect x="490" y="' + (top - 14) + '" width="170" height="' + (sigs.length * rowH + 8) + '" rx="16" fill="#12233F"/>' +
        '<text x="575" y="' + (top - 22 + (sigs.length * rowH) / 2) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="#fff">bus_if</text>' +
        '<text x="575" y="' + (top - 2 + (sigs.length * rowH) / 2) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="11.5" fill="#9FE3E8">interface</text>';
      sigs.forEach(function (sg, i) {
        var y = top + 8 + i * rowH, out = m[sg] === 'out', c = out ? '#16924F' : '#2F6BD2';
        svg += '<line x1="' + (out ? 196 : 484) + '" y1="' + y + '" x2="' + (out ? 482 : 198) + '" y2="' + y + '" stroke="' + c + '" stroke-width="3" class="l6-flowline" marker-end="url(#' + (out ? 'mpOut' : 'mpIn') + ')"/>' +
          '<rect x="285" y="' + (y - 13) + '" width="110" height="26" rx="13" fill="#fff" stroke="' + c + '" stroke-width="1.5"/>' +
          '<text x="340" y="' + (y + 4.5) + '" text-anchor="middle" font-family="IBM Plex Mono,Consolas,monospace" font-size="12.5" font-weight="700" fill="' + c + '">' + sg + '</text>' +
          '<text x="' + (out ? 236 : 444) + '" y="' + (y - 8) + '" text-anchor="middle" font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif" font-size="10.5" font-weight="600" fill="' + c + '">' + (out ? 'output' : 'input') + '</text>';
      });
      svg += '</svg>';
      var outs = sigs.filter(function (s) { return m[s] === 'out'; });
      $('mpView').innerHTML = '<div class="l6-svgbox l6-fadein">' + svg + '<div class="l6-legend"><span><b style="background:#16924F"></b>output: this module drives it</span><span><b style="background:#2F6BD2"></b>input: read only</span></div></div>' +
        '<p style="margin:6px 0 0;font-size:.95rem"><code>modport ' + k + ' (input ' + sigs.filter(function (s) { return m[s] === 'in'; }).join(', ') + (outs.length ? ', output ' + outs.join(', ') : '') + ');</code></p>';
      var bad = sigs.filter(function (s) { return m[s] === 'in' && s !== 'clk'; })[0];
      L6.feedback($('mpNote'), 'info', k === 'monitor'
        ? 'A monitor only observes: every arrow points <b>into</b> it. Any attempt to drive the bus from a monitor is a compile error, so it can never disturb the DUT.'
        : 'If code in a <code>' + k + '</code> module writes <code>bus.' + bad + ' &lt;= 1;</code> the compiler reports an error, because <code>' + bad + '</code> is an input in this modport.');
      seen[k] = 1; if (Object.keys(seen).length === 3) L6.mark('modport');
    }
    L6.buttonGroup($('mpSel'), Object.keys(mp).map(function (k) {
      return { label: 'bus_if.' + k, onSelect: function () { draw(k); } };
    }), { mono: true, select: 0 });
  }

  /* ---------- Clocking race demo ---------- */
  function initClocking() {
    var ready = [0, 0, 1, 1, 0, 0], seen = {};
    function draw(mode) {
      L6.wave($('ckWave'), { cycles: 6, hl: [2, 2], signals: [{ name: 'clk', kind: 'clk' }, { name: 'ready', kind: 'bit', vals: ready }] });
      if (mode === 'race') L6.feedback($('ckNote'), 'bad', 'At the edge of cycle 2, the DUT sets ready to 1 and the testbench reads ready <b>in the same time step</b>. If the testbench runs first it reads <b>0</b>; if the DUT runs first it reads <b>1</b>. Both orders are legal, so different simulators (or even different runs after a small code change) can give different results.');
      else L6.feedback($('ckNote'), 'ok', 'Through <code>bus.cb.ready</code>, the value is sampled with <code>#1step</code>, i.e. at the end of the previous time step, just before the edge. The testbench always reads <b>0</b> at cycle 2 and sees the 1 at cycle 3, exactly like a real flip-flop would. No race.');
      seen[mode] = 1; if (seen.race && seen.cb) L6.mark('clocking');
    }
    L6.buttonGroup($('ckMode'), [['Read ready directly at @(posedge clk)', 'race'], ['Read bus.cb.ready (clocking block)', 'cb']].map(function (m) {
      return { label: m[0], onSelect: function () { draw(m[1]); } };
    }), { select: 0 });
  }

  /* ---------- Virtual interface tour ---------- */
  function initVif() {
    var lines = [
      'interface bus_if (input logic clk);',
      '  logic valid;  logic [7:0] data;',
      'endinterface',
      '',
      'class driver;',
      '  virtual bus_if vif;',
      '  function new(virtual bus_if vif);',
      '    this.vif = vif;',
      '  endfunction',
      '  task drive(byte d);',
      '    @(posedge vif.clk);',
      '    vif.valid <= 1;  vif.data <= d;',
      '  endtask',
      'endclass',
      '',
      'module top;',
      '  logic clk = 0;',
      '  always #5 clk = ~clk;',
      '  bus_if bif (clk);',
      '  dut    u_dut (.bus(bif));',
      '  initial begin',
      '    driver drv = new(bif);',
      "    drv.drive(8'hA5);",
      '  end',
      'endmodule'
    ];
    L6.codeTour($('vifBtns'), $('vifCode'), $('vifNote'), lines, [
      { n: '1. Interface', r: [1, 3], t: 'The interface type: a bundle of signals.' },
      { n: '2. Real instance', r: [19, 20], t: '<code>bif</code> is a real interface instance in the module hierarchy, connected to the DUT.' },
      { n: '3. Virtual handle', r: [6, 6], t: 'The class stores a <b>virtual interface</b>: a handle, null until someone assigns it.' },
      { n: '4. Hand it over', r: [22, 22], t: 'The top module passes the real instance into the class constructor. (In UVM this is done with the configuration database.)' },
      { n: '5. Store it', r: [7, 9], t: 'The constructor keeps the handle in <code>this.vif</code>.' },
      { n: '6. Drive pins', r: [10, 13], t: 'Now class code reaches real pins through <code>vif.valid</code> and <code>vif.data</code>, and waits on <code>vif.clk</code>.' }
    ], 6, function () { L6.mark('vif'); });
  }

  /* ---------- Package quiz ---------- */
  function initPkg() {
    var pre = 'package a; parameter int W = 8;  endpackage\npackage b; parameter int W = 16; endpackage\n\n';
    L6.choiceGame($('pkgList'), [
      { code: pre + 'import a::*;\nimport b::*;\nlogic [W-1:0] x;', a: 'Error', choices: ['8', '16', 'Error'], why: 'Both wildcard imports provide W, so the reference is ambiguous. The compiler cannot choose.' },
      { code: pre + 'import a::*;\nimport b::W;\nlogic [W-1:0] x;', a: '16', choices: ['8', '16', 'Error'], why: 'An explicit import beats a wildcard import.' },
      { code: pre + 'import a::*;\nparameter int W = 4;\nlogic [W-1:0] x;', a: '4', choices: ['4', '8', 'Error'], why: 'A local declaration hides names from a wildcard import (as long as W was not used before the declaration).' },
      { code: pre + 'logic [a::W-1:0] x;', a: '8', choices: ['8', '16', 'Error'], why: 'The scope operator <code>::</code> needs no import at all.' }
    ], null, function () { L6.mark('pkg'); }, $('pkgScore'));
  }

  /* ---------- Parameter explorer ---------- */
  function initParam() {
    var types = [['logic [7:0]', 8], ['int', 32], ['packet_t', 16], ['logic [63:0]', 64]], T = types[0], moves = 0;
    function draw(user) {
      var d = +$('prD').value, aw = Math.max(1, Math.ceil(Math.log2(d)));
      $('prDv').textContent = d;
      L6.setCode('prCode', 'fifo #(.T(' + T[0] + '), .DEPTH(' + d + ')) u_fifo (...);\n\n// inside, after elaboration:\n' + T[0] + ' mem [' + d + '];\nlocalparam int AW = $clog2(' + d + ');   // = ' + aw + '\nlogic [' + (aw - 1) + ':0] wr_ptr, rd_ptr;');
      $('prStats').innerHTML = '<div class="l6-stat"><b>' + T[1] + '</b><span>bits per entry</span></div><div class="l6-stat"><b>' + d + '</b><span>entries</span></div>' +
        '<div class="l6-stat"><b>' + (T[1] * d) + '</b><span>bits of storage</span></div><div class="l6-stat"><b>' + aw + '</b><span>pointer bits ($clog2)</span></div>';
      var grid = $('prMem');
      if (!grid) { grid = document.createElement('div'); grid.id = 'prMem'; $('prStats').insertAdjacentElement('afterend', grid); }
      var cols = Math.min(16, d);
      grid.innerHTML = '<p class="l6-label" style="margin:14px 0 0">mem[' + d + '], each bar is one entry of ' + T[1] + ' bits</p><div class="l6-memgrid" style="grid-template-columns:repeat(' + cols + ',1fr)">' +
        new Array(d + 1).join('x').split('').map(function () { return '<div style="width:' + (25 + 75 * T[1] / 64) + '%"></div>'; }).join('') + '</div>';
      if (user) { moves++; if (moves >= 3) L6.mark('param'); }
    }
    L6.buttonGroup($('prT'), types.map(function (t) { return { label: 'T = ' + t[0], onSelect: function () { T = t; draw(true); } }; }), { mono: true });
    $('prT').querySelector('button').classList.add('is-on');
    $('prD').addEventListener('input', function () { draw(true); });
    draw(false);
  }

  L6.initModule({
    module: 6,
    activities: ['ifconn', 'modport', 'clocking', 'vif', 'pkg', 'param', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initIfConn(); initModport(); initClocking(); initVif(); initPkg(); initParam(); },
    tryit: [
      { t: 'Write the first line of an interface <code>mem_if</code> with one input port <code>clk</code> of type logic.', re: [/^interfacemem_if\(inputlogicclk\);?$/], hint: 'Like a module header, but with the keyword <code>interface</code>.', ans: 'interface mem_if (input logic clk);' },
      { t: 'Declare a modport <code>slave</code> where <code>addr</code> and <code>wdata</code> are inputs and <code>rdata</code> is an output.', re: [/^modportslave\(inputaddr,wdata,outputrdata\);?$/, /^modportslave\(outputrdata,inputaddr,wdata\);?$/], hint: '<code>modport name (input a, b, output c);</code>', ans: 'modport slave (input addr, wdata, output rdata);' },
      { t: 'Inside a class, declare a virtual interface handle <code>vif</code> of type <code>mem_if</code>.', re: [/^virtualmem_ifvif;?$/, /^virtualinterfacemem_ifvif;?$/], hint: 'Put <code>virtual</code> before the interface type.', ans: 'virtual mem_if vif;' },
      { t: 'Import every name from the package <code>cfg_pkg</code>.', re: [/^importcfg_pkg::\*;?$/], hint: 'Use the wildcard <code>*</code>.', ans: 'import cfg_pkg::*;' },
      { t: 'Instantiate module <code>fifo</code> as <code>u0</code> with type parameter <code>T</code> set to <code>int</code> and <code>DEPTH</code> set to 32 (use <code>(.*)</code> for the ports).', re: [/^fifo#\(\.T\(int\),\.DEPTH\(32\)\)u0\(\.\*\);?$/, /^fifo#\(\.DEPTH\(32\),\.T\(int\)\)u0\(\.\*\);?$/], hint: '<code>module #(.P(value), ...) instance (...);</code>', ans: 'fifo #(.T(int), .DEPTH(32)) u0 (.*);' }
    ],
    debug: {
      lines: [
        'interface bus_if (input logic clk);',
        '  logic       valid, ready;',
        '  logic [7:0] data;',
        '  modport master (input clk, ready, output valid, data);',
        '  modport slave  (input clk, valid, data, output ready);',
        'endinterface',
        '',
        'module producer (bus_if.master bus);',
        '  always_ff @(posedge bus.clk)',
        "    bus.ready <= 1'b1;",
        'endmodule',
        '',
        'class driver;',
        '  bus_if bus;',
        'endclass',
        '',
        'module top;',
        '  logic clk;',
        '  bus_if b ();',
        '  producer p (.bus(b));',
        'endmodule'
      ],
      bugs: {
        10: { id: 'dir', t: '<b>Driving an input.</b> In the master modport <code>ready</code> is an input, so the producer may not drive it. The producer should drive <code>valid</code> and <code>data</code>.' },
        14: { id: 'vif', t: '<b>Interface inside a class.</b> A class cannot contain a real interface. Declare <code>virtual bus_if bus;</code>.' },
        19: { id: 'port', t: '<b>Missing interface port connection.</b> <code>bus_if</code> has a <code>clk</code> port, so the instance must connect it: <code>bus_if b (clk);</code>.' }
      },
      clean: { 4: 'The master drives valid and data and reads ready: correct.', 5: 'The slave view is the mirror image: correct.', 8: 'Using the modport in the port list is exactly right.', 20: 'Connecting the interface instance to the port is correct.' },
      fix: "interface bus_if (input logic clk);\n  logic       valid, ready;\n  logic [7:0] data;\n  modport master (input clk, ready, output valid, data);\n  modport slave  (input clk, valid, data, output ready);\nendinterface\n\nmodule producer (bus_if.master bus);\n  always_ff @(posedge bus.clk)\n    bus.valid <= 1'b1;\nendmodule\n\nclass driver;\n  virtual bus_if bus;\nendclass\n\nmodule top;\n  logic clk;\n  bus_if b (clk);\n  producer p (.bus(b));\nendmodule"
    },
    quiz: [
      { q: 'What is the main benefit of an interface?', opts: ['Faster simulation', 'Signals are declared once and connected as one port', 'It replaces the clock', 'It makes code synthesizable'], a: 1, why: 'Adding or changing a signal touches only the interface.' },
      { q: 'What does a modport define?', opts: ['The clock period', 'The direction of each signal for one kind of user', 'A new module', 'A package'], a: 1, why: 'Each modport is a view with its own directions.' },
      { q: 'Why do testbenches use clocking blocks?', opts: ['To generate the clock', 'To avoid races by sampling before and driving after the edge', 'To make the DUT faster', 'To replace modports'], a: 1, why: 'Clocking blocks give well-defined sample and drive times.' },
      { q: 'With <code>default input #1step</code>, when is an input sampled?', opts: ['1 ns after the edge', 'Just before the clock edge', 'At the falling edge', 'Whenever it changes'], a: 1, why: '#1step means the end of the previous time step.' },
      { q: 'How does a class access DUT signals?', opts: ['Through module ports', 'Through a virtual interface handle', 'With `include', 'It cannot'], a: 1, why: 'Classes hold virtual interfaces that point to real interface instances.' },
      { q: 'Two wildcard-imported packages define the same name, which you then use. What happens?', opts: ['The first import wins', 'The last import wins', 'Compile error: ambiguous', 'Both are merged'], a: 2, why: 'The reference is ambiguous. Use pkg::name or an explicit import.' },
      { q: 'What does <code>`include "file.sv"</code> do?', opts: ['Imports a package', 'Pastes the file\'s text at that point', 'Links a compiled library', 'Instantiates a module'], a: 1, why: '`include is a preprocessor text substitution.' },
      { q: 'What does <code>parameter type T = int</code> allow?', opts: ['Changing a signal\'s width only', 'Choosing the data type when the module is instantiated', 'Casting at run time', 'Nothing in synthesis'], a: 1, why: 'Type parameters make modules generic over data types.' }
    ]
  });
})();
