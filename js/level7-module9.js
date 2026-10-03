/* Level 7 · Module 9 – Emerging Digital VLSI Technologies */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function devSvg(kind) {
    var o = '';
    o += R(40, 200, 420, 40, 'box', 2) + T(250, 225, kind === 'planar' ? 'bulk silicon' : 'substrate', 't-dim t-sm');
    if (kind === 'planar') {
      o += R(60, 170, 380, 30, 'box-vio', 2) + T(250, 190, 'channel (top surface only)', 't-vio t-sm');
      o += R(150, 150, 200, 20, 'box-on', 2) + R(150, 110, 200, 40, 'box-cu', 4) + T(250, 135, 'GATE', 't-ink t-b');
      o += T(250, 90, 'gate controls the channel from one side', 't-dim t-sm');
    } else if (kind === 'finfet') {
      [130, 220, 310].forEach(function (x) { o += R(x, 90, 26, 110, 'box-vio', 2); });
      o += '<path d="M100 200V80H370V200" class="box-cu" style="fill-opacity:.35"/>';
      [130, 220, 310].forEach(function (x) { o += R(x - 6, 84, 38, 116, 'box-on', 3) + R(x, 90, 26, 110, 'box-vio', 2); });
      o += T(235, 66, 'GATE wraps 3 sides of each fin', 't-ink t-b');
      o += P('M380 90V200', 'w-dash') + T(388, 150, 'H_fin', 't-sig t-sm', 'start') + T(143, 215, 'T_fin', 't-sig t-sm');
    } else {
      o += '<path d="M90 200V60H410V200" class="box-cu" style="fill-opacity:.35"/>';
      [80, 120, 160].forEach(function (y) { o += R(140, y - 4, 220, 26, 'box-on', 6) + R(146, y, 208, 18, 'box-vio', 4); });
      o += T(250, 46, 'GATE surrounds every nanosheet (4 sides)', 't-ink t-b');
      o += P('M146 192H354', 'w-dash') + T(250, 195, 'sheet width W (continuous)', 't-sig t-sm');
    }
    return S(500, 250, o, kind + ' transistor cross-section');
  }

  var DEV = {
    planar: ['Planar MOSFET', 'Gate on top of a flat channel. Below ~28 nm the drain field reaches under the gate: short-channel effects, poor subthreshold slope and high leakage.', 'Weak (1 side)', 'Continuous W', '≥ 28 nm era'],
    finfet: ['FinFET (tri-gate)', 'The channel is a thin vertical fin; the gate wraps three sides, giving strong electrostatic control and low leakage. Width is quantised: you can only use whole fins.', 'Strong (3 sides)', 'W = n<sub>fin</sub>·(2H<sub>fin</sub> + T<sub>fin</sub>)', '22/16 nm → 3 nm'],
    gaa: ['Gate-all-around (nanosheet)', 'Stacked horizontal sheets fully surrounded by the gate: best control, so the gate length can shrink further. Sheet width can be chosen continuously, restoring design flexibility.', 'Strongest (4 sides)', 'W = n<sub>sheet</sub>·2(W<sub>sheet</sub> + T<sub>sheet</sub>)', '3/2 nm and beyond']
  };

  /* ---------- Widget: device viewer ---------- */
  function devLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Transistor architecture viewer</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 'planar', seen = {};
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bs = [['planar', 'Planar'], ['finfet', 'FinFET'], ['gaa', 'GAA nanosheet']].map(function (d) {
      var b = L.btn(d[1], d[0] === cur ? 'is-on' : '', function () { cur = d[0]; bs.forEach(function (x) { x.classList.toggle('is-on', x === b); }); upd(); });
      row.appendChild(b); return b;
    });
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var info = L.h('div', 'l7-readout'); split.appendChild(info);
    function upd() {
      seen[cur] = 1; if (Object.keys(seen).length === 3) api.done();
      var d = DEV[cur];
      pic.innerHTML = devSvg(cur);
      info.innerHTML = '<span class="v">' + d[0] + '</span><br>' + d[1] + '<br><br><span class="k">Gate control</span> ' + d[2] + '<br><span class="k">Effective width</span> ' + d[3] + '<br><span class="k">Used at</span> ' + d[4];
    }
    upd();
  }

  /* ---------- Widget: effective width calculator ---------- */
  function weffLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Effective width · FinFET vs nanosheet</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { nf: 3, h: 50, t: 7, ns: 3, ws: 30, ts: 5 }, n = 0;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var a = L.h('div', 'l7-box cu', '<h4>FinFET</h4>'), b = L.h('div', 'l7-box sig', '<h4>Nanosheet</h4>'); g.appendChild(a); g.appendChild(b);
    L.slider(a, 'Fins', 1, 6, 1, p.nf, null, function (v) { p.nf = v; upd(); });
    L.slider(a, 'Fin height', 30, 70, 1, p.h, function (v) { return v + ' nm'; }, function (v) { p.h = v; upd(); });
    L.slider(a, 'Fin thickness', 5, 10, 1, p.t, function (v) { return v + ' nm'; }, function (v) { p.t = v; upd(); });
    var oa = L.h('div', 'l7-readout'); a.appendChild(oa);
    L.slider(b, 'Sheets', 2, 4, 1, p.ns, null, function (v) { p.ns = v; upd(); });
    L.slider(b, 'Sheet width', 10, 60, 1, p.ws, function (v) { return v + ' nm'; }, function (v) { p.ws = v; upd(); });
    L.slider(b, 'Sheet thickness', 4, 7, 1, p.ts, function (v) { return v + ' nm'; }, function (v) { p.ts = v; upd(); });
    var ob = L.h('div', 'l7-readout'); b.appendChild(ob);
    function upd() {
      n++; if (n >= 4) api.done();
      var wf = p.nf * (2 * p.h + p.t), wn = p.ns * 2 * (p.ws + p.ts);
      oa.innerHTML = '<span class="k">W<sub>eff</sub></span> = ' + p.nf + ' × (2·' + p.h + ' + ' + p.t + ') = <span class="v">' + wf + ' nm</span><br><span class="k">Steps</span> only in units of one fin (' + (2 * p.h + p.t) + ' nm)';
      ob.innerHTML = '<span class="k">W<sub>eff</sub></span> = ' + p.ns + ' × 2 × (' + p.ws + ' + ' + p.ts + ') = <span class="v">' + wn + ' nm</span><br><span class="k">Steps</span> 1 nm of sheet width → ' + 2 * p.ns + ' nm';
    }
    n = -1; upd();
  }

  /* ---------- Widget: chiplet yield ---------- */
  function yieldLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Yield lab · monolithic die vs chiplets (Poisson model)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { A: 600, D: 0.1, k: 4 }, n = 0;
    L.slider(body, 'Total logic area', 100, 800, 25, p.A, function (v) { return v + ' mm²'; }, function (v) { p.A = v; upd(1); });
    L.slider(body, 'Defect density D', 0.05, 0.5, 0.01, p.D, function (v) { return v.toFixed(2) + ' /cm²'; }, function (v) { p.D = v; upd(1); });
    L.slider(body, 'Number of chiplets', 2, 8, 1, p.k, null, function (v) { p.k = v; upd(1); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd(ch) {
      if (ch) n++; if (n >= 3) api.done();
      var ym = Math.exp(-p.D * p.A / 100), ac = p.A / p.k, yc = Math.exp(-p.D * ac / 100), o = '';
      // silicon needed per good product (mm²): monolithic A/ym ; chiplets with known-good-die test: A / yc
      var sm = p.A / ym, sc = p.A / yc, mx = Math.max(sm, sc);
      o += T(10, 26, 'Monolithic ' + p.A + ' mm²', 't-ink t-b', 'start') + T(10, 44, 'yield ' + (ym * 100).toFixed(1) + ' %', 't-cu t-sm', 'start');
      o += '<rect x="200" y="14" width="' + (330 * sm / mx).toFixed(1) + '" height="30" rx="4" fill="var(--l7-cu)" opacity=".85"/>' + T(208 + 330 * sm / mx, 34, Math.round(sm) + ' mm²', 't-ink t-b t-sm', 'start');
      o += T(10, 86, p.k + ' chiplets × ' + ac.toFixed(0) + ' mm²', 't-ink t-b', 'start') + T(10, 104, 'yield each ' + (yc * 100).toFixed(1) + ' %', 't-sig t-sm', 'start');
      o += '<rect x="200" y="74" width="' + (330 * sc / mx).toFixed(1) + '" height="30" rx="4" fill="var(--l7-sig)" opacity=".85"/>' + T(208 + 330 * sc / mx, 94, Math.round(sc) + ' mm²', 't-ink t-b t-sm', 'start');
      o += T(10, 136, 'Bars: silicon area that must be manufactured per good product', 't-dim t-sm', 'start');
      pic.innerHTML = S(600, 146, o, 'Monolithic versus chiplet yield');
      L.fb(out, 'info', 'Die yield Y = e<sup>−D·A</sup> (A in cm²). Small dies are far more likely to be defect-free, and chiplets can be tested before assembly (“known good die”), so less silicon is wasted: <b>' + Math.round((1 - sc / sm) * 100) + ' % less silicon</b> here. The cost is extra die-to-die interfaces, packaging and assembly yield.');
    }
    upd(0);
  }

  function integFrame(k) {
    var o = '', titles = ['2D: everything on one large die', '2.5D: dies side by side on a silicon interposer', '3D: dies stacked and connected vertically', 'Chiplets + heterogeneous integration'];
    o += T(300, 22, titles[k], 't-vio t-b t-lg');
    o += R(60, 210, 480, 18, 'box', 3) + T(300, 223, 'package substrate', 't-dim t-sm');
    if (k === 0) { o += R(150, 120, 300, 80, 'box-on', 6) + T(300, 165, 'monolithic SoC', 't-ink t-b'); for (var i = 0; i < 12; i++) o += L.dot(165 + i * 25, 205, 3, 'dot-cu'); }
    if (k === 1) {
      o += R(110, 175, 380, 22, 'box-vio', 3) + T(300, 190, 'silicon interposer (fine wiring, TSVs)', 't-vio t-sm');
      o += R(120, 110, 150, 60, 'box-on', 6) + T(195, 145, 'logic die', 't-ink t-b');
      [300, 360, 420].forEach(function (x, i) { o += R(x, 80 - i * 0, 50, 90, 'box-cu', 4) + T(x + 25, 130, 'HBM', 't-ink t-sm'); });
      o += P('M270 150H300', 'w-on flow');
    }
    if (k === 2) {
      ['logic die', 'memory die', 'memory die', 'memory die'].forEach(function (n, i) { var y = 170 - i * 34; o += R(190, y, 220, 30, i === 0 ? 'box-on' : 'box-cu', 4) + T(300, y + 20, n, 't-ink t-sm'); });
      [230, 300, 370].forEach(function (x) { o += P('M' + x + ' 72V200', 'w-on'); });
      o += T(470, 120, 'TSVs / hybrid', 't-sig t-sm', 'start') + T(470, 136, 'bonding', 't-sig t-sm', 'start');
    }
    if (k === 3) {
      [['CPU 3 nm', 110, 'box-on'], ['GPU 3 nm', 240, 'box-on'], ['I/O 6 nm', 370, 'box-vio']].forEach(function (c) { o += R(c[1], 120, 110, 70, c[2], 6) + T(c[1] + 55, 160, c[0], 't-ink t-b t-sm'); });
      o += P('M220 155H240M350 155H370', 'w-on flow') + T(300, 100, 'die-to-die links (e.g. UCIe)', 't-sig t-sm');
      o += T(300, 252, 'each function in the best process; mix and match', 't-dim t-sm');
    }
    return S(600, 262, o, titles[k]);
  }

  L.module({
    n: 9,
    lead: 'Classic scaling has slowed, so the industry is innovating in three directions at once: new transistor structures (FinFET, gate-all-around), new ways to stack and connect silicon (2.5D, 3D, chiplets), and advanced packaging. See what each brings and what problems they solve.',
    tags: ['FinFET', 'GAA / nanosheet', '3D ICs', '2.5D integration', 'chiplets', 'heterogeneous integration', 'advanced packaging', 'scaling challenges'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-scal', type: 'concept', title: 'Technology scaling challenges', nav: 'Scaling',
        html: '<p>For decades, shrinking transistors (Moore\'s law) brought more devices, higher speed and lower energy per operation together (Dennard scaling). Today these benefits no longer come for free:</p>' +
          '<div class="l7-grid2"><div class="l7-box cu"><h4>Device limits</h4><ul><li>Short-channel effects and leakage in planar transistors</li><li>Supply voltage stuck near 0.7–0.9 V → power density rises</li><li>Variation grows as devices shrink to a few atoms wide</li></ul></div>' +
          '<div class="l7-box sig"><h4>System limits</h4><ul><li>Wire resistance rises (Module 5)</li><li>Very large dies have low yield and hit the lithography reticle limit (~800 mm²)</li><li>Mask and design costs soar at each node</li><li>Memory bandwidth cannot keep up with compute</li></ul></div></div>' +
          '<p style="margin-top:12px">The responses: better transistor <b>electrostatics</b> (FinFET → GAA), going <b>vertical</b> (3D stacking), and splitting systems into <b>chiplets</b> connected by <b>advanced packaging</b>.</p>'
      },
      {
        id: 'c-fin', type: 'concept', title: 'FinFET and gate-all-around transistors', nav: 'FinFET & GAA',
        html: '<p>The key to scaling the gate length is <b>gate control</b>: the more of the channel the gate surrounds, the less the drain can influence it, so leakage and short-channel effects drop.</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Planar</h4><p>Gate on one side. Leaky below ~28 nm.</p></div><div class="l7-box cu"><h4>FinFET</h4><p>Gate on three sides of a vertical fin. Mainstream from 22/16 nm to 3 nm. Width is quantised in whole fins, so cell libraries are described by fin counts.</p></div><div class="l7-box sig"><h4>GAA nanosheet</h4><p>Gate on all four sides of stacked sheets. Used from the 3/2 nm generation. Sheet width is a design variable again. Next: forksheet and stacked complementary FET (CFET), placing nMOS on top of pMOS.</p></div></div>' +
          '<p style="margin-top:12px">Related innovations include <b>backside power delivery</b>, which moves the power grid under the transistors to free front-side routing and reduce IR drop.</p>'
      },
      { id: 'w-dev', type: 'widget', title: 'Transistor architecture viewer', nav: 'Device viewer', intro: 'Compare all three structures.', build: devLab },
      { id: 'w-weff', type: 'widget', title: 'Effective-width calculator', nav: 'Width lab', intro: 'Change the parameters a few times. Notice the coarse steps of FinFET width compared with nanosheets.', build: weffLab },
      {
        id: 'c-3d', type: 'concept', title: '2.5D and 3D integration', nav: '2.5D & 3D',
        html: '<div class="l7-grid2"><div class="l7-box vio"><h4>2.5D integration</h4><p>Several dies placed side by side on a <b>silicon interposer</b> (or a bridge embedded in the substrate) with very fine wiring between them. Example: GPU or AI accelerator next to stacks of High-Bandwidth Memory (HBM) – thousands of short connections give enormous bandwidth.</p></div>' +
          '<div class="l7-box sig"><h4>3D integration</h4><p>Dies stacked vertically and connected by <b>through-silicon vias (TSVs)</b> or direct <b>hybrid (Cu–Cu) bonding</b> with micron pitch. Vertical wires are extremely short, cutting delay and energy. Examples: HBM DRAM stacks, cache dies stacked on processors, image sensors bonded to logic.</p></div></div>' +
          '<div class="l7-table-wrap" style="margin-top:12px"><table class="l7-table"><tr><th>Challenge</th><th>Why</th></tr><tr><td>Heat</td><td>stacked dies trap heat; the hottest die should be near the heat sink</td></tr><tr><td>Power delivery</td><td>current must pass through lower dies</td></tr><tr><td>Test</td><td>each die must be tested before stacking (known good die)</td></tr><tr><td>Design tools</td><td>co-design of several dies and their interfaces</td></tr></table></div>'
      },
      {
        id: 'st-int', type: 'steps', title: 'Animation: from 2D SoC to heterogeneous integration', nav: 'Integration animation',
        frames: [
          { t: 'A <b>2D monolithic SoC</b>: all functions on one die in one process. Simple to package, but large dies yield poorly and every block must use the same (expensive) process.', svg: integFrame(0) },
          { t: '<b>2.5D</b>: a logic die and HBM memory stacks sit side by side on a silicon interposer that provides thousands of short, dense connections.', svg: integFrame(1) },
          { t: '<b>3D</b>: dies are stacked and connected vertically through TSVs or hybrid bonds – the shortest possible inter-die wires.', svg: integFrame(2) },
          { t: '<b>Chiplets + heterogeneous integration</b>: a system is built from smaller dies, each in the most suitable process (leading-edge logic, older-node I/O or analog), linked by standard die-to-die interfaces such as UCIe.', svg: integFrame(3) }
        ]
      },
      {
        id: 'c-chip', type: 'concept', title: 'Chiplets, heterogeneous integration and advanced packaging', nav: 'Chiplets',
        html: '<p>A <b>chiplet</b> is a small die designed to be combined with others in one package. Benefits: higher yield (small dies), reuse of the same chiplet across products, mixing process nodes, and systems larger than the reticle limit. Costs: die-to-die interface area, latency and power, more complex packaging, test and thermal design.</p>' +
          '<p><b>Heterogeneous integration</b> combines dies of different technologies – logic, DRAM, analog/RF, photonics, sensors – into one system-in-package. <b>Advanced packaging</b> technologies make this possible: fan-out wafer-level packaging, silicon bridges, interposers, micro-bumps and hybrid bonding, each offering higher interconnect density than traditional flip-chip.</p>'
      },
      { id: 'w-yield', type: 'widget', title: 'Yield lab: why chiplets?', nav: 'Yield lab', intro: 'Vary area, defect density and the number of chiplets at least three times.', build: yieldLab },
      {
        id: 'rv-em', type: 'reveal', title: 'Click to reveal: emerging technology insights', nav: 'Reveal',
        items: [
          { q: 'Why does wrapping the gate around the channel reduce leakage?', a: 'The gate field controls the whole channel, so the drain field cannot lower the source barrier (less drain-induced barrier lowering), giving a steeper subthreshold slope and lower off-current.' },
          { q: 'What is “width quantisation” in FinFETs?', a: 'Transistor width can only be a whole number of fins, so cells use 1, 2, 3 … fins. Fine sizing (e.g. 1.5×) is impossible, which affects SRAM ratios and cell design.' },
          { q: 'Why place HBM next to the processor rather than on the board?', a: 'An interposer supports a 1024-bit interface per stack with short wires, giving hundreds of GB/s at much lower energy per bit than board-level DRAM interfaces.' },
          { q: 'What is the reticle limit?', a: 'The maximum area a lithography scanner can expose in one shot (about 26 mm × 33 mm). Monolithic dies cannot be larger; chiplets and interposers go beyond it.' },
          { q: 'What is UCIe?', a: 'Universal Chiplet Interconnect Express – an open die-to-die interface standard so chiplets from different vendors can work together.' },
          { q: 'What limits 3D stacking of logic on logic?', a: 'Heat removal and power delivery: the inner dies are far from the heat sink and supply currents must pass through other dies.' }
        ]
      },
      {
        id: 'dd-em', type: 'drag', title: 'Drag & drop: match the feature to the technology', nav: 'Drag & drop',
        bins: ['FinFET', 'GAA nanosheet', '2.5D integration', '3D integration', 'Chiplets'],
        items: [['Gate on three sides of a fin', 0], ['Width in whole fins', 0], ['Stacked sheets fully surrounded by the gate', 1], ['Variable sheet width', 1], ['Silicon interposer', 2], ['Logic beside HBM stacks', 2], ['Through-silicon vias', 3], ['Hybrid Cu–Cu bonding', 3], ['Known-good-die testing improves yield', 4], ['Mix 3 nm compute with 6 nm I/O', 4]]
      },
      { part: 'Practice' },
      {
        id: 'calc9', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A FinFET has 3 fins with H<sub>fin</sub> = 50 nm and T<sub>fin</sub> = 7 nm. What is W<sub>eff</sub> (nm)?', a: 321, u: 'nm', h: 'W = n·(2H + T).', s: '3 × (100 + 7) = <b>321 nm</b>.' },
          { q: 'A nanosheet device has 3 sheets, each 30 nm wide and 5 nm thick. What is W<sub>eff</sub> (nm)?', a: 210, u: 'nm', h: 'W = n·2(W + T).', s: '3 × 2 × 35 = <b>210 nm</b>.' },
          { q: 'Using Y = e<sup>−D·A</sup>, what is the yield (%) of a 600 mm² die at D = 0.1 defects/cm²?', a: 54.9, u: '%', h: '600 mm² = 6 cm².', s: 'e<sup>−0.6</sup> = 0.549 → <b>54.9 %</b>.' },
          { q: 'Same defect density, but a 150 mm² chiplet. Yield (%)?', a: 86.1, u: '%', h: '1.5 cm².', s: 'e<sup>−0.15</sup> = 0.861 → <b>86.1 %</b>.' },
          { q: 'An HBM stack has a 1024-bit interface at 2 Gb/s per pin. What is its bandwidth in GB/s?', a: 256, u: 'GB/s', h: 'bits × rate ÷ 8.', s: '1024 × 2 Gb/s = 2048 Gb/s = <b>256 GB/s</b>.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which transistor gives the gate control on all four sides of the channel?', o: ['planar', 'FinFET', 'gate-all-around nanosheet', 'SOI planar'], a: 2, w: 'GAA surrounds each sheet.' },
          { q: 'Through-silicon vias are mainly used in…', o: ['planar CMOS', '3D stacked ICs', 'standard cells', 'SRAM bitlines'], a: 1, w: 'Vertical connections through a thinned die.' },
          { q: 'A main reason for chiplets is…', o: ['larger single dies', 'better yield and mixing process nodes', 'fewer interfaces', 'no packaging needed'], a: 1, w: 'Small dies yield better; each chiplet uses its best process.' },
          { q: 'In 2.5D integration, dies are connected through…', o: ['bond wires only', 'a silicon interposer or bridge', 'TSVs through the logic die only', 'the PCB'], a: 1, w: 'Dense interposer wiring.' }
        ]
      },
      {
        id: 'short9', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain why the industry moved from planar transistors to FinFETs and then to gate-all-around devices.', k: ['gate control|electrostatic', 'leakage|short-channel', 'three|3 sides|fin', 'all|four|4 sides|nanosheet', 'width'], m: 'As gate length shrank, planar transistors lost gate control: short-channel effects and leakage rose. FinFETs wrap the gate around three sides of a thin fin, restoring control. At the 3/2 nm generation even fins are not enough, so GAA nanosheets surround the channel on all four sides; they also allow continuous width selection instead of whole fins.' },
          { q: 'Compare 2.5D and 3D integration.', k: ['interposer|side by side', 'stack|vertical', 'tsv|hybrid|bond', 'heat|thermal', 'bandwidth|short'], m: '2.5D places dies side by side on a silicon interposer or bridge, giving dense, short lateral connections (e.g. GPU + HBM) with manageable heat. 3D stacks dies vertically using TSVs or hybrid bonding, giving the shortest connections and highest density, but heat removal, power delivery and testing are harder.' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your AI accelerator would need an 850 mm² monolithic die in a 3 nm process plus high-speed SerDes I/O.', q: 'What is the most sensible architecture?', o: [{ t: 'Split it into compute chiplets in 3 nm and an I/O chiplet in an older node, on an interposer with HBM', ok: true, w: 'This beats the reticle limit, improves yield and keeps analog-heavy I/O in a cheaper, mature node.' }, { t: 'Make one 850 mm² die anyway', ok: false, w: 'It exceeds the reticle limit and would have very low yield.' }, { t: 'Move to a planar process', ok: false, w: 'That would make density and leakage far worse.' }] },
          { s: 'Stacking a cache die directly on top of a hot CPU die improves performance but the chip throttles under load.', q: 'What is the main issue?', o: [{ t: 'Thermal: the stacked die impedes heat flow from the CPU to the heat sink', ok: true, w: '3D stacking makes cooling harder; designers place the hottest die nearest the heat sink and limit stacked power.' }, { t: 'TSV crosstalk', ok: false, w: 'Possible, but throttling under load points to heat.' }, { t: 'FinFET width quantisation', ok: false, w: 'Unrelated to throttling.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'In a FinFET, the gate wraps around…', o: ['one side', 'three sides of a fin', 'all four sides', 'no sides'], a: 1, w: 'Tri-gate.' },
      { q: 'A key advantage of GAA nanosheets over FinFETs is…', o: ['larger gate length', 'stronger gate control and adjustable width', 'no need for a gate', 'planar layout'], a: 1, w: 'Four-side control; sheet width is a design variable.' },
      { q: 'FinFET effective width is quantised because…', o: ['you can only use whole fins', 'fins are random', 'the gate is planar', 'of TSVs'], a: 0, w: 'Width = number of fins × fin perimeter.' },
      { q: 'HBM is usually integrated using…', o: ['2.5D on an interposer', 'bond wires on a PCB', 'standard cells', 'ROM'], a: 0, w: 'Interposer-based 2.5D.' },
      { q: 'TSV stands for…', o: ['Through-Silicon Via', 'Transistor Supply Voltage', 'Timing Slack Value', 'Top Signal Via'], a: 0, w: 'Vertical via through the silicon.' },
      { q: 'Hybrid bonding connects stacked dies with…', o: ['solder balls of 100 µm', 'direct Cu–Cu pads at micron pitch', 'wire bonds', 'optical fibres'], a: 1, w: 'Very fine-pitch direct bonding.' },
      { q: 'Smaller dies give higher yield because…', o: ['they are faster', 'each die is less likely to contain a defect', 'they use less power', 'they have more metal layers'], a: 1, w: 'Y = e<sup>−D·A</sup>.' },
      { q: 'Heterogeneous integration means…', o: ['all dies in one process', 'combining dies of different technologies in one package', 'only memory dies', 'a single transistor type'], a: 1, w: 'Logic, memory, analog, photonics… together.' },
      { q: 'Which is a major challenge of 3D logic stacking?', o: ['too little bandwidth', 'heat removal', 'too few transistors', 'reticle limit'], a: 1, w: 'Inner dies are far from the heat sink.' },
      { q: 'Backside power delivery…', o: ['puts the power grid below the transistors', 'removes the need for power', 'is a packaging type', 'is a test method'], a: 0, w: 'Frees front-side metal for signals and reduces IR drop.' }
    ]
  });
})();
