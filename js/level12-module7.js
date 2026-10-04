/* Level 12 · Module 7 – Advanced Test Access (IEEE 1149.1 advanced, IEEE 1687 IJTAG) */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var NET = [
    { id: 'A', kids: [{ id: 'A1', inst: 'MBIST controller', len: 12 }, { id: 'A2', inst: 'BIST status register', len: 6 }] },
    { id: 'B', kids: [{ id: 'B1', inst: 'Thermal sensor', len: 8 }, { id: 'B2', inst: 'PLL configuration', len: 16 }] }
  ];
  var TASKS = [['Thermal sensor', 12], ['MBIST controller', 16], ['PLL configuration', 20]];

  /* ---------- Widget: IJTAG network explorer ---------- */
  function ijtagLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>IJTAG network · open Segment Insertion Bits (SIBs) to reach an instrument</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var open = {}, task = 0, solved = {};
    var tb = L.h('div', 'l7-row'); body.appendChild(tb);
    var ctrl = L.h('div', 'l7-row'); body.appendChild(ctrl);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function path() {
      var segs = [], len = 0, reach = {};
      NET.forEach(function (s) {
        segs.push(['SIB ' + s.id, 1]); len++;
        if (open[s.id]) s.kids.forEach(function (k) { segs.push(['SIB ' + k.id, 1]); len++; if (open[k.id]) { segs.push([k.inst, k.len]); len += k.len; reach[k.inst] = 1; } });
      });
      return { segs: segs, len: len, reach: reach };
    }
    function draw() {
      tb.innerHTML = '';
      TASKS.forEach(function (t, i) { tb.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Task ' + (i + 1) + ': access ' + t[0], i === task ? 'is-on' : '', function () { task = i; open = {}; draw(); })); });
      ctrl.innerHTML = '';
      NET.forEach(function (s) {
        ctrl.appendChild(L.btn('SIB ' + s.id + (open[s.id] ? ' open' : ' closed'), open[s.id] ? 'is-on' : '', function () { open[s.id] = !open[s.id]; if (!open[s.id]) s.kids.forEach(function (k) { open[k.id] = false; }); draw(); }));
        if (open[s.id]) s.kids.forEach(function (k) { ctrl.appendChild(L.btn('SIB ' + k.id + (open[k.id] ? ' open' : ' closed'), open[k.id] ? 'is-on' : '', function () { open[k.id] = !open[k.id]; draw(); })); });
      });
      var p = path(), o = '', x = 60, y = 50;
      o += R(4, 34, 44, 32, 'box-cu', 6) + T(26, 55, 'TDI', 't-ink t-b t-sm');
      p.segs.forEach(function (sg) {
        var w = sg[1] === 1 ? 54 : Math.min(150, 40 + sg[1] * 6);
        if (x + w > 590) { x = 60; y += 56; }
        o += P('M' + (x - 12) + ' ' + (y + 16) + 'H' + x, 'w-on') + R(x, y, w, 32, sg[1] === 1 ? 'box' : 'box-on', 6) + T(x + w / 2, y + 15, sg[0], 't-ink t-b t-sm') + T(x + w / 2, y + 28, sg[1] + ' bit' + (sg[1] > 1 ? 's' : ''), 't-dim t-sm');
        x += w + 12;
      });
      o += R(x, y, 44, 32, 'box-cu', 6) + T(x + 22, y + 21, 'TDO', 't-ink t-b t-sm');
      pic.innerHTML = S(640, y + 50, o, 'Active scan path');
      var t = TASKS[task], ok = p.reach[t[0]] && p.len === t[1];
      if (ok) solved[task] = 1;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : p.reach[t[0]] ? 'warn' : 'bad');
      verdict.innerHTML = 'Active scan path: <b>' + p.len + ' bits</b>' + (ok ? ' – minimal path to the ' + t[0] : p.reach[t[0]] ? ' – the ' + t[0] + ' is reachable, but extra segments make the path longer than necessary' : ' – the ' + t[0] + ' is not on the path yet') +
        '<small>' + (Object.keys(solved).length === 3 ? '🎉 All three instruments reached with minimal paths. SIBs let one JTAG port reach hundreds of instruments while keeping each access short.' : 'Only open the SIBs that lead to the target – every extra segment is shifted in every access.') + '</small>';
      if (Object.keys(solved).length === 3) api.done();
      tb.innerHTML = ''; TASKS.forEach(function (tt, i) { tb.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Task ' + (i + 1) + ': access ' + tt[0], i === task ? 'is-on' : '', function () { task = i; open = {}; draw(); })); });
    }
    draw();
  }

  /* ---------- Widget: boundary-scan interconnect test ---------- */
  function bsDrill(root, api) {
    L.drill(root, api, {
      bar: 'Board interconnect test with EXTEST · what does the result show?', label: 'Result',
      items: [
        { q: 'Chip A drives 1 on net N3; chip B\'s boundary cell captures 0 for every pattern.', o: ['N3 open or stuck-at-0 between the chips', 'N3 shorted to N4', 'Chip B\'s core is faulty', 'TAP failure'], a: 0, w: 'The value never arrives: an open (solder joint) or a short to ground.' },
        { q: 'Driving N5 = 1, N6 = 0 captures N5 = 0, N6 = 0; driving N5 = 0, N6 = 1 captures 0, 0.', o: ['N5 and N6 shorted (wired-AND)', 'Both nets open', 'N5 stuck-at-1', 'No fault'], a: 0, w: 'Complementary patterns on neighbouring nets reveal bridges.' },
        { q: 'Why use "walking ones" or counting patterns on all nets?', o: ['every net gets a unique code, so any short between two nets is detectable', 'to test the core logic', 'to measure timing', 'to program flash'], a: 0, w: 'Unique per-net codes distinguish every pair of nets.' },
        { q: 'Which file describes a chip\'s boundary-scan register for the test software?', o: ['BSDL', 'SDC', 'LEF', 'VCD'], a: 0, w: 'The Boundary-Scan Description Language file lists cells, instructions and pin mapping.' }
      ]
    });
  }

  function accFrame(k) {
    var o = R(20, 30, 110, 50, 'box-cu', 8) + T(75, 60, 'JTAG TAP', 't-ink t-b t-sm');
    o += P('M130 55H170', 'w-on');
    if (k === 0) { o += R(170, 30, 380, 50, 'box', 8) + T(360, 60, 'one long chain through every instrument', 't-ink t-sm'); }
    else {
      o += R(170, 30, 60, 50, 'box-on', 6) + T(200, 60, 'SIB', 't-ink t-b t-sm') + R(260, 30, 60, 50, 'box-on', 6) + T(290, 60, 'SIB', 't-ink t-b t-sm') + P('M230 55H260M320 55H350', 'w-on');
      if (k >= 2) o += P('M200 80V110H230', 'w-cu') + R(230, 98, 90, 26, 'box-vio', 6) + T(275, 115, 'MBIST', 't-ink t-sm') + P('M290 80V140H320', 'w-cu') + R(320, 128, 100, 26, 'box-vio', 6) + T(370, 145, 'sensor', 't-ink t-sm');
    }
    o += T(300, 178, ['1149.1 alone: every instrument in a fixed chain – long and inflexible', 'IEEE 1687: Segment Insertion Bits (SIBs) open and close sub-networks', 'Instruments are included only when needed; ICL/PDL describe them', ''][k] || '', 't-vio t-b t-sm');
    return S(600, 190, o, 'Test access evolution');
  }

  L.module({
    n: 7,
    lead: 'Level 5 explained the TAP controller and basic JTAG instructions. Modern chips contain hundreds of embedded instruments – MBIST controllers, sensors, PLL controls – reached through hierarchical access networks. Explore IEEE 1687 (IJTAG) and advanced uses of boundary scan.',
    tags: ['IEEE 1149.1 advanced', 'boundary-scan interconnect test', 'BSDL', 'IEEE 1687 / IJTAG', 'SIBs', 'embedded instruments', 'hierarchical access'],
    sections: [
      {
        id: 'st-acc', type: 'steps', title: 'Animation: from fixed chains to IJTAG networks', nav: 'Access evolution',
        frames: [0, 1, 2].map(function (k) { return { t: ['With plain 1149.1, adding instruments makes one ever-longer data register.', 'IJTAG (IEEE 1687) inserts SIBs: one bit that includes or bypasses a whole sub-network.', 'The access path is reconfigured on the fly; ICL (Instrument Connectivity Language) and PDL (Procedure Description Language) let tools retarget instrument procedures automatically.'][k], svg: accFrame(k) }; })
      },
      { id: 'w-ijtag', type: 'widget', title: 'IJTAG network explorer', nav: 'IJTAG lab', intro: 'For each task, open only the SIBs needed to reach the instrument with the shortest scan path.', build: ijtagLab },
      {
        id: 'c-1149', type: 'concept', title: 'Advanced boundary scan', nav: 'Advanced 1149.1',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Board interconnect test</h4><p>EXTEST drives values from one chip\'s boundary cells and captures them in the next chip: opens and shorts on the board are found without probes.</p></div><div class="l7-box cu"><h4>Beyond the board</h4><p>In-system programming of flash and FPGAs, BSDL-based automatic test generation, and 1149.6 for AC-coupled high-speed links.</p></div></div>'
      },
      { id: 'w-bs', type: 'widget', title: 'Interconnect test results', nav: 'EXTEST drill', intro: 'Interpret each boundary-scan interconnect test result.', build: bsDrill },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: test access insights', nav: 'Reveal',
        items: [
          { q: 'Why not chain all instruments directly into one JTAG register?', a: 'Every access would shift through all of them – thousands of bits – and adding an instrument changes every procedure.' },
          { q: 'What is an embedded instrument?', a: 'Any on-chip block used for test, debug or monitoring: MBIST controller, temperature/voltage sensor, PLL tuning, eye monitor.' },
          { q: 'What does retargeting mean in IJTAG?', a: 'A procedure written for an instrument at its own interface is translated automatically into the TAP sequence needed to reach it in the full chip.' },
          { q: 'Is boundary scan still used on modern boards?', a: 'Yes – fine-pitch BGAs make physical probing impossible, so interconnect test relies on boundary scan.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: which standard?', nav: 'Drag & drop',
        bins: ['IEEE 1149.1', 'IEEE 1687 (IJTAG)', 'IEEE 1500'],
        items: [['TAP controller and boundary-scan register', 0], ['EXTEST interconnect test', 0], ['Segment Insertion Bits', 1], ['ICL / PDL descriptions', 1], ['core test wrapper', 2], ['wrapper boundary register around an IP core', 2]]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A SIB…', o: ['includes or bypasses a scan segment', 'is a memory cell', 'generates clocks', 'repairs faults'], a: 0, w: '' },
          { q: 'EXTEST is used for…', o: ['testing interconnects between chips', 'core logic test', 'memory repair', 'clock tuning'], a: 0, w: '' },
          { q: 'BSDL describes…', o: ['a chip\'s boundary-scan implementation', 'timing constraints', 'layout', 'RTL'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A chip has 300 sensors and BIST controllers. Reading one temperature sensor currently requires shifting 9,000 bits.', q: 'What is the better architecture?', o: [{ t: 'An IJTAG network with SIBs so only the needed segment is in the path', ok: true, w: 'Short, flexible access.' }, { t: 'A second JTAG port per sensor', ok: false, w: 'Too many pins.' }, { t: 'Faster TCK only', ok: false, w: 'Still 9,000 bits.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'IEEE 1687 is known as…', o: ['IJTAG', 'EDT', 'LBIST', 'UVM'], a: 0, w: '' },
      { d: 'Easy', q: 'Embedded instruments include…', o: ['MBIST controllers and sensors', 'scan flip-flops only', 'pads', 'masks'], a: 0, w: '' },
      { d: 'Easy', q: 'Interconnect tests between chips use…', o: ['boundary scan (EXTEST)', 'MBIST', 'LBIST', 'EDT'], a: 0, w: '' },
      { d: 'Medium', q: 'An open SIB…', o: ['adds its segment to the scan path', 'removes the TAP', 'repairs memory', 'stops the clock'], a: 0, w: '' },
      { d: 'Medium', q: 'Complementary values on two nets reveal…', o: ['shorts between them', 'timing faults', 'memory faults', 'IR drop'], a: 0, w: '' },
      { d: 'Medium', q: 'ICL describes…', o: ['instrument connectivity in an IJTAG network', 'clocks', 'layouts', 'netlists'], a: 0, w: '' },
      { d: 'Medium', q: 'PDL describes…', o: ['procedures to operate instruments', 'pin delays', 'power domains', 'placement'], a: 0, w: '' },
      { d: 'Hard', q: 'Two top SIBs, sub-SIBs B1/B2 opened under B, B1 open with an 8-bit instrument: path length =', o: ['12', '8', '10', '28'], a: 0, w: '2 + 2 + 8.' },
      { d: 'Hard', q: 'Retargeting in IJTAG means…', o: ['translating instrument-level procedures into full-chip TAP operations', 'changing the target technology', 'resizing chains', 'repairing faults'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is boundary scan essential for BGA boards?', o: ['solder joints cannot be probed physically', 'BGAs have no pins', 'it tests memories', 'it measures power'], a: 0, w: '' }
    ]
  });
})();
