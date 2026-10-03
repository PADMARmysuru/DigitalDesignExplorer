/* Level 10 · Module 8 – Physical Verification */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var TYPES = ['DRC', 'LVS', 'ERC', 'Antenna'];
  var ISSUES = [
    { x: 150, y: 58, type: 0, title: 'Two metal-2 wires 0.03 µm apart', why: ['The spacing is below the minimum spacing rule for metal 2 – a manufacturing short risk', 'The wires belong to the wrong nets in the schematic', 'The wires carry too much current'], a: 0 },
    { x: 330, y: 150, type: 1, title: 'Net n42 is split in two pieces', why: ['A missing via between metal 2 and metal 3 leaves the net OPEN – the layout no longer matches the netlist', 'The wire is too narrow', 'The wire is too long for an antenna rule'], a: 0 },
    { x: 470, y: 70, type: 1, title: 'Nets clk_en and rst_n touch', why: ['A stray metal patch connects two different nets – a SHORT that does not exist in the schematic', 'They are closer than the spacing rule but not touching', 'The clock is unbalanced'], a: 0 },
    { x: 250, y: 205, type: 0, title: 'A metal-1 segment only 0.04 µm wide', why: ['It is below the minimum width rule – it may break or not print', 'It is a different net from the netlist', 'It collects plasma charge'], a: 0 },
    { x: 95, y: 175, type: 2, title: 'Input pin A of U7 is connected to nothing', why: ['A floating gate input: no driver on the net – an electrical rule violation', 'Metal spacing is too small', 'The cell is placed off its row'], a: 0 },
    { x: 545, y: 190, type: 3, title: '420 µm metal-1 wire attached only to a gate', why: ['During etching it collects charge that can only discharge through the gate oxide', 'It overlaps another net', 'It is narrower than the width rule'], a: 0 }
  ];

  /* ---------- Widget: find and classify the violations ---------- */
  function verLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Physical verification · 6 problems are hidden in this layout</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = -1, st = {}, order = {};
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var panel = L.h('div', ''); body.appendChild(panel);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function layout() {
      var o = R(10, 10, 580, 230, 'box', 8);
      for (var r = 0; r < 7; r++) o += '<rect x="20" y="' + (22 + r * 31) + '" width="560" height="24" fill="#f5f5f7"/>';
      [[40, 22], [120, 53], [210, 84], [300, 22], [380, 115], [460, 146], [90, 146], [520, 53], [240, 177], [400, 177]].forEach(function (c, i) { o += '<rect x="' + c[0] + '" y="' + c[1] + '" width="44" height="24" rx="3" fill="#34c759" opacity=".55"/>' + T(c[0] + 22, c[1] + 16, 'U' + (i + 1), 't-dim t-sm'); });
      o += '<rect x="60" y="54" width="180" height="4" fill="#0071e3"/><rect x="60" y="59.5" width="180" height="4" fill="#0071e3"/>';
      o += '<rect x="290" y="148" width="40" height="4" fill="#0071e3"/><rect x="334" y="120" width="4" height="60" fill="#ff9500"/>';
      o += '<rect x="420" y="66" width="80" height="4" fill="#0071e3"/><rect x="420" y="76" width="80" height="4" fill="#ff2d55"/><rect x="466" y="68" width="8" height="10" fill="#af52de"/>';
      o += '<rect x="200" y="205" width="110" height="1.4" fill="#9ec5ff"/><rect x="200" y="210" width="110" height="5" fill="#9ec5ff" opacity=".0"/>';
      o += '<rect x="92" y="168" width="6" height="6" fill="#1d1d1f"/>';
      o += '<rect x="470" y="194" width="100" height="4" fill="#9ec5ff"/><rect x="560" y="182" width="16" height="18" fill="#34c759" opacity=".7"/>';
      return o;
    }
    function draw() {
      var o = layout();
      ISSUES.forEach(function (it, i) {
        var s = st[i] || 0;
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0" aria-label="Problem ' + (i + 1) + '"><circle cx="' + it.x + '" cy="' + it.y + '" r="15" fill="' + (s === 2 ? 'rgba(52,199,89,.35)' : i === cur ? 'rgba(0,113,227,.35)' : 'rgba(255,59,48,.25)') + '" stroke="' + (s === 2 ? '#34c759' : i === cur ? '#0071e3' : '#ff3b30') + '" stroke-width="2" class="' + (s === 2 ? '' : 'pulse') + '"/>' + T(it.x, it.y + 5, s === 2 ? '✓' : String(i + 1), 't-b t-sm') + '</g>';
      });
      pic.innerHTML = S(600, 250, o, 'Layout with violations');
      L.$$('g.click', pic).forEach(function (g) { var go = function () { cur = +g.getAttribute('data-i'); draw(); }; g.addEventListener('click', go); g.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
      panel.innerHTML = '';
      if (cur >= 0) {
        var it = ISSUES[cur], s = st[cur] || 0;
        panel.appendChild(L.h('h4', '', 'Problem ' + (cur + 1) + ': ' + it.title));
        if (s === 0) {
          panel.appendChild(L.h('p', '', '<b>Which check reports it?</b>'));
          var ch = L.h('div', 'l7-choice'); panel.appendChild(ch);
          TYPES.forEach(function (t, k) {
            var b = L.h('button', '', t); b.type = 'button';
            b.addEventListener('click', function () {
              if (k === it.type) { st[cur] = 1; draw(); }
              else { b.classList.add('is-wrong'); L.fb(fb, 'bad', '✗ ' + t + ' checks ' + ['geometry rules (width, spacing, enclosure)', 'that the layout connectivity matches the netlist', 'electrical sanity (floating inputs, shorted outputs, missing taps)', 'charge collected on gate-connected wires during manufacturing'][k] + '. Look again at what is wrong here.'); }
            });
            ch.appendChild(b);
          });
        } else if (s === 1) {
          panel.appendChild(L.h('p', '', '✓ <b>' + TYPES[it.type] + '</b>. Now: <b>why did it occur?</b>'));
          var ch2 = L.h('div', 'l7-choice'); ch2.style.gridTemplateColumns = '1fr'; panel.appendChild(ch2);
          if (!order[cur]) order[cur] = it.why.map(function (w, k) { return k; }).sort(function () { return Math.random() - 0.5; });
          order[cur].forEach(function (k) {
            var b = L.h('button', '', it.why[k]); b.type = 'button';
            b.addEventListener('click', function () { if (k === it.a) { st[cur] = 2; L.fb(fb, 'ok', '✓ ' + TYPES[it.type] + ' – ' + it.why[it.a] + '.'); draw(); } else { b.classList.add('is-wrong'); L.fb(fb, 'bad', '✗ That would be a different kind of violation.'); } });
            ch2.appendChild(b);
          });
        } else panel.appendChild(L.h('p', 'l7-fb ok', '✓ Identified: <b>' + TYPES[it.type] + '</b> – ' + it.why[it.a] + '.'));
      }
      var n = Object.keys(st).filter(function (k) { return st[k] === 2; }).length;
      if (n === ISSUES.length) { L.fb(fb, 'ok', '🎉 All 6 problems identified and explained: 2 DRC, 2 LVS (open and short), 1 ERC and 1 antenna violation. Each must be fixed and re-checked before tape-out.'); api.done(); }
      else if (cur < 0) L.fb(fb, 'info', 'Tap a red marker. Problems solved: ' + n + ' of 6.');
    }
    draw();
  }

  /* ---------- Widget: fix the reported violation ---------- */
  function fixDrill(root, api) {
    L.drill(root, api, {
      bar: 'Violation fixing · choose the right repair', label: 'Report line',
      items: [
        { c: 'DRC  M2.S.1  Metal2 spacing < 0.07 um   at (412.3, 88.1)', o: ['Re-route one wire to legal spacing', 'Add an antenna diode', 'Add a via', 'Increase core utilisation'], a: 0, w: 'Spacing rules are fixed by moving wires apart (re-routing).' },
        { c: 'LVS  Net mismatch: layout net n42 has 2 pieces; schematic has 1  (OPEN)', o: ['Add the missing via / wire so the net is connected', 'Increase metal spacing', 'Insert metal fill', 'Shield the net'], a: 0, w: 'An open is repaired by completing the connection.' },
        { c: 'LVS  Short between nets clk_en and rst_n', o: ['Remove the metal that joins the two nets', 'Add a via between them', 'Add a diode', 'Ignore – nets are close anyway'], a: 0, w: 'A short is removed by deleting or re-routing the offending metal.' },
        { c: 'ERC  Floating input: U7/A has no driver', o: ['Connect the pin to its intended net (or tie it to VDD/VSS if unused)', 'Widen the wire', 'Move the cell to another row', 'Add metal fill'], a: 0, w: 'Every input must be driven; unused inputs are tied off with tie cells.' },
        { c: 'ANT  Gate area 0.8 um², metal1 area 420 um², ratio 525 > 400', o: ['Jump to an upper layer near the gate or add an antenna diode', 'Increase the spacing', 'Add a second via elsewhere', 'Make the wire longer'], a: 0, w: 'Shorten the lower-metal antenna or give the charge a diode path.' },
        { c: 'DRC  M1.A.1  Metal1 area < minimum (0.02 um²)', o: ['Enlarge the small metal shape (or merge it)', 'Add an LVS label', 'Add a clock buffer', 'Remove the power ring'], a: 0, w: 'Minimum-area rules: tiny shapes may not print or may peel off.' }
      ]
    });
  }

  function verFrame(k) {
    var o = '', b = ['Layout (GDS)', 'Rule deck', 'Netlist'], c = ['DRC', 'LVS', 'ERC / Antenna', 'Clean? → sign-off'];
    o += R(30, 30, 140, 44, 'box-on', 8) + T(100, 57, 'Layout (GDS)', 't-ink t-b t-sm');
    if (k === 0) o += R(30, 100, 140, 44, 'box', 8) + T(100, 127, 'DRC rule deck', 't-ink t-sm') + P('M170 52H260M170 122H260', 'w-on') + R(260, 64, 120, 44, 'box-cu', 8) + T(320, 91, 'DRC', 't-ink t-b');
    if (k === 1) o += R(30, 100, 140, 44, 'box', 8) + T(100, 127, 'Netlist (from P&R)', 't-ink t-sm') + P('M170 52H260M170 122H260', 'w-on') + R(260, 64, 120, 44, 'box-cu', 8) + T(320, 91, 'LVS', 't-ink t-b') + T(320, 128, 'extract devices + nets, compare', 't-dim t-sm');
    if (k === 2) o += P('M170 52H260', 'w-on') + R(260, 30, 120, 44, 'box-cu', 8) + T(320, 57, 'ERC', 't-ink t-b') + R(260, 90, 120, 44, 'box-cu', 8) + T(320, 117, 'Antenna', 't-ink t-b') + P('M215 52V112H260', 'w-on');
    if (k === 3) o += P('M170 52H260', 'w-on') + R(260, 30, 160, 44, 'box-ok', 8) + T(340, 57, '0 violations', 't-ink t-b') + P('M420 52H470', 'w-on') + R(470, 30, 110, 44, 'box-vio', 8) + T(525, 57, 'GDSII ✓', 't-ink t-b');
    o += T(300, 172, ['DRC: does every shape obey the foundry\'s geometry rules?', 'LVS: does the layout contain exactly the netlist\'s devices and connections?', 'ERC and antenna checks: electrical sanity and manufacturing-charge safety.', 'Only a clean layout goes to tape-out.'][k], 't-vio t-b t-sm');
    return S(600, 186, o, 'Verification flow');
  }

  L.module({
    n: 8,
    lead: 'Before a layout is sent to the foundry it must pass physical verification: every shape must obey the manufacturing rules, the layout must be exactly the circuit in the netlist, and nothing may be electrically unsafe. Find, classify and fix the violations.',
    tags: ['DRC', 'LVS', 'ERC', 'antenna checking', 'connectivity', 'geometry', 'common errors', 'violation fixing'],
    sections: [
      {
        id: 'st-ver', type: 'steps', title: 'Animation: the verification checks', nav: 'Verification checks',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>Design Rule Check</b> measures every polygon against the foundry\'s rules.', '<b>Layout Versus Schematic</b> extracts transistors/cells and connectivity from the layout and compares them with the netlist.', '<b>Electrical Rule Check</b> and <b>antenna</b> checks look for electrically dangerous situations.', 'Fix, re-run, repeat – until every check reports zero violations.'][k], svg: verFrame(k) }; })
      },
      {
        id: 'c-checks', type: 'concept', title: 'DRC, LVS, ERC and antenna checks', nav: 'The checks',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Check</th><th>Question</th><th>Typical violations</th></tr>' +
          '<tr><td><b>DRC</b> – Design Rule Check</td><td>Can it be manufactured? (geometry)</td><td>min width, min spacing, enclosure, min area, density</td></tr>' +
          '<tr><td><b>LVS</b> – Layout Versus Schematic</td><td>Is it the right circuit? (connectivity)</td><td>opens, shorts, missing/extra devices, wrong pin</td></tr>' +
          '<tr><td><b>ERC</b> – Electrical Rule Check</td><td>Is it electrically sane?</td><td>floating inputs, outputs shorted together, missing well/substrate taps</td></tr>' +
          '<tr><td><b>Antenna</b></td><td>Is it safe during manufacturing?</td><td>metal-to-gate area ratio above the limit</td></tr></table></div>'
      },
      { id: 'w-ver', type: 'widget', title: 'Find the violations', nav: 'Verification lab', intro: 'Tap each red marker. Decide which check reports it, then why it occurred.', build: verLab },
      {
        id: 'c-fix', type: 'concept', title: 'Common errors and how they are fixed', nav: 'Fixing',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Geometry (DRC)</h4><p>Usually created by manual edits, ECOs or congested routing. Fixed by re-routing, widening, enlarging shapes, adding fill.</p></div><div class="l7-box vio"><h4>Connectivity (LVS)</h4><p>Opens (missing via/wire), shorts (stray metal, overlapping nets), unconnected power pins. Fixed by repairing the connection, then re-running LVS.</p></div><div class="l7-box sig"><h4>Electrical (ERC)</h4><p>Unused inputs left floating – tie them with tie-high/tie-low cells; add missing well taps.</p></div><div class="l7-box"><h4>Antenna</h4><p>Layer jumping or diodes, usually done automatically by the router.</p></div></div>'
      },
      { id: 'w-fix', type: 'widget', title: 'Fix the reported violation', nav: 'Fix drill', intro: 'Each line comes from a verification report. Choose the correct repair.', build: fixDrill },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: verification insights', nav: 'Reveal',
        items: [
          { q: 'Can a layout be DRC clean but LVS dirty?', a: 'Yes – perfectly legal geometry can still be the wrong circuit, e.g. a legally drawn wire connecting the wrong nets.' },
          { q: 'Why is LVS done on the final GDS, not the router database?', a: 'To check exactly what will be manufactured, including all merged cells, fill and edits.' },
          { q: 'Who writes the DRC rules?', a: 'The foundry, in a rule deck for each technology node; thousands of rules for advanced nodes.' },
          { q: 'What is a tie cell?', a: 'A small cell that provides a constant 0 or 1 to unused inputs, so no gate is connected directly to a power rail or left floating.' },
          { q: 'What is a "waiver"?', a: 'An approved exception for a known, harmless rule violation – rare and documented.' },
          { q: 'Why re-run all checks after every fix?', a: 'A fix for one violation can create another, e.g. moving a wire may break spacing elsewhere.' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: which check finds it?', nav: 'Drag & drop',
        bins: ['DRC', 'LVS', 'ERC', 'Antenna'],
        items: [['Wire narrower than the minimum width', 0], ['Two shapes closer than the spacing rule', 0], ['A net broken into two pieces', 1], ['Two different nets connected', 1], ['Input pin with no driver', 2], ['Two outputs driving the same net', 2], ['Long metal-1 wire on a gate', 3]]
      },
      {
        id: 'calc8', type: 'calc', title: 'Verification calculations', nav: 'Calculate',
        items: [
          { q: 'Minimum spacing is 0.07 µm; two wires are 0.045 µm apart. By how much (µm) must the gap grow?', a: 0.025, tol: 0.01, h: '0.07 − 0.045.', s: '<b>0.025 µm</b>.' },
          { q: 'The schematic has 1,245 nets; LVS extracts 1,247 from the layout. If the extra nets come from opens (each open splits a net in two), how many opens?', a: 2, h: 'Each open adds one net.', s: '<b>2</b>.' },
          { q: 'The schematic has 1,245 nets; the layout has 1,243 and no opens. How many shorts (each merges two nets)?', a: 2, h: 'Each short removes one net.', s: '<b>2</b>.' },
          { q: 'A rule needs metal width ≥ 0.05 µm. A wire is 0.032 µm. What percentage of the minimum is it?', a: 64, h: '0.032 / 0.05.', s: '<b>64 %</b>.' },
          { q: 'A DRC run reports 120 violations; each repair loop fixes 70 % of the remaining ones. Violations left after two loops?', a: 10.8, tol: 0.01, h: '120 × 0.3 × 0.3.', s: '<b>10.8 ≈ 11</b>.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'LVS compares…', o: ['layout connectivity with the netlist', 'layout with design rules', 'timing with the SDC', 'power with the budget'], a: 0, w: '' },
          { q: 'A minimum-spacing violation is found by…', o: ['DRC', 'LVS', 'ERC', 'STA'], a: 0, w: '' },
          { q: 'A floating gate input is an…', o: ['ERC violation', 'antenna violation', 'DRC spacing error', 'LVS short'], a: 0, w: '' },
          { q: 'A missing via typically causes…', o: ['an LVS open', 'a DRC spacing error', 'a timing pass', 'nothing'], a: 0, w: '' }
        ]
      },
      {
        id: 'short8', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the difference between DRC and LVS.', k: ['geometr|rule|spacing|width', 'manufactur', 'netlist|schematic|connectivity', 'open|short|device'], m: 'DRC checks the geometry of every shape against the foundry\'s manufacturing rules (width, spacing, enclosure, area, density) – can it be built? LVS extracts the devices and connectivity from the layout and compares them with the netlist – is it the intended circuit? It finds opens, shorts and missing or extra devices.' },
          { q: 'Why can a layout pass DRC and still fail LVS?', k: ['legal|rules|geometry', 'connect|wrong net|short|open', 'circuit|netlist'], m: 'DRC only checks that shapes are legal to manufacture; it does not know what they should connect. A wire can be perfectly legal yet connect the wrong nets (a short) or miss a via (an open), so the circuit differs from the netlist – only LVS detects that.' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'The week before tape-out, an engineer moves one wire by hand to fix a timing issue.', q: 'What must happen next?', o: [{ t: 'Re-run DRC, LVS, ERC and antenna checks (and timing) on the final layout', ok: true, w: 'Any change can break any check.' }, { t: 'Nothing – one wire is harmless', ok: false, w: 'Risky.' }, { t: 'Only re-run synthesis', ok: false, w: 'Wrong stage.' }] },
          { s: 'LVS reports the layout has one fewer net than the schematic.', q: 'Most likely cause?', o: [{ t: 'A short has merged two nets', ok: true, w: 'Shorts reduce the net count.' }, { t: 'An open split a net', ok: false, w: 'That adds a net.' }, { t: 'A spacing rule violation', ok: false, w: 'DRC, not LVS.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'DRC checks…', o: ['manufacturing geometry rules', 'logic function', 'timing', 'power'], a: 0, w: '' },
      { d: 'Easy', q: 'LVS stands for…', o: ['Layout Versus Schematic', 'Logic Value Simulation', 'Layer Via Spacing', 'Low Voltage Supply'], a: 0, w: '' },
      { d: 'Easy', q: 'ERC finds…', o: ['electrical problems such as floating inputs', 'spacing violations', 'clock skew', 'routing overflow'], a: 0, w: '' },
      { d: 'Medium', q: 'Two nets accidentally joined by metal is an…', o: ['LVS short', 'LVS open', 'antenna error', 'ERC only'], a: 0, w: '' },
      { d: 'Medium', q: 'A metal shape smaller than the minimum area is a…', o: ['DRC violation', 'LVS violation', 'timing violation', 'CTS issue'], a: 0, w: '' },
      { d: 'Medium', q: 'Unused cell inputs should be…', o: ['tied with tie cells', 'left floating', 'connected to the clock', 'removed from LVS'], a: 0, w: '' },
      { d: 'Medium', q: 'Antenna rules limit…', o: ['metal area connected to a gate during manufacturing', 'wire spacing', 'pin count', 'clock frequency'], a: 0, w: '' },
      { d: 'Hard', q: 'Layout has 2 more nets than the schematic and no shorts. Number of opens =', o: ['1', '2', '4', '0'], a: 1, w: '' },
      { d: 'Hard', q: 'A layout can be DRC clean and LVS dirty because…', o: ['legal shapes can still connect the wrong nets', 'DRC includes LVS', 'LVS ignores nets', 'it cannot'], a: 0, w: '' },
      { d: 'Hard', q: 'After any late layout edit you must…', o: ['re-run all physical verification checks', 'only re-run DRC', 'only re-run LVS', 'nothing'], a: 0, w: '' }
    ]
  });
})();
