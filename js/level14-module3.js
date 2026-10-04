/* Level 14 · Module 3 – ML for Physical Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var C = 8, RW = 6;
  /* true overflow (tracks short) after routing, and the ML model's predicted hotspot probability */
  var TRUE = [[0, 0, 1, 0, 0, 0, 0, 0], [0, 2, 6, 3, 0, 0, 1, 0], [0, 1, 5, 2, 0, 0, 7, 2], [0, 0, 1, 0, 0, 1, 3, 0], [0, 0, 0, 0, 4, 1, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0]];
  var PRED = [[.05, .1, .2, .1, .05, .05, .1, .05], [.1, .45, .9, .55, .1, .1, .2, .1], [.05, .35, .85, .4, .1, .7, .9, .35], [.05, .1, .2, .1, .1, .15, .5, .1], [.05, .05, .1, .1, .25, .2, .1, .05], [.05, .05, .05, .05, .15, .05, .05, .05]];

  function route(sp) {                       // spreading a tile removes 70 % of its overflow and pushes 30 % of it to neighbours
    var g = TRUE.map(function (r) { return r.slice(); });
    Object.keys(sp).forEach(function (k) {
      var x = +k.split(',')[0], y = +k.split(',')[1], v = TRUE[y][x], move = v * 0.3;
      g[y][x] = Math.max(0, g[y][x] - v * 0.7 - move);
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { var nx = x + d[0], ny = y + d[1]; return nx >= 0 && ny >= 0 && nx < C && ny < RW && !sp[nx + ',' + ny]; });
      nb.forEach(function (d) { g[y + d[1]][x + d[0]] += move / Math.max(1, nb.length) * 0.5; });
    });
    var tot = 0; g.forEach(function (r) { r.forEach(function (v) { tot += v; }); });
    return { g: g, tot: tot };
  }

  /* ---------- Widget: AI placement explorer ---------- */
  function placeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>AI placement explorer · use predicted congestion to fix the placement before routing</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var sp = {}, routed = false, done = false, base = route({}).tot;
    body.appendChild(L.h('p', 'l7-hint', 'The heat map is the ML model\'s prediction (probability that a tile will overflow). Tap up to 4 tiles to spread cells there, then run the (slow) router to see the real result.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('▶ Run global router (ground truth)', 'pri', function () { routed = true; draw(); }));
    row.appendChild(L.btn('↺ Reset', 'ghost', function () { sp = {}; routed = false; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function col(p) { return 'rgba(' + Math.round(52 + 203 * p) + ',' + Math.round(199 - 150 * p) + ',' + Math.round(89 - 50 * p) + ',' + (0.25 + 0.6 * p) + ')'; }
    function draw() {
      var r = route(sp), o = '', W = 64, H = 40;
      [['ML prediction', 10], ['Actual after routing', 330]].forEach(function (t, side) {
        o += T(t[1] + C * W / 4, 14, t[0], 't-ink t-b t-sm');
        for (var y = 0; y < RW; y++) for (var x = 0; x < C; x++) {
          var k = x + ',' + y, X = t[1] + x * (W / 2), Y = 22 + y * (H / 1.4);
          if (side === 0) o += '<rect class="ml-tile" data-k="' + k + '" x="' + X + '" y="' + Y + '" width="' + (W / 2 - 2) + '" height="' + (H / 1.4 - 2) + '" rx="3" fill="' + col(PRED[y][x]) + '" stroke="' + (sp[k] ? '#1d1d1f' : 'none') + '" stroke-width="2.5" style="cursor:pointer"/>' + (sp[k] ? T(X + W / 4 - 1, Y + 18, '⇔', 't-ink t-b t-sm') : '');
          else { var v = routed ? r.g[y][x] : null; o += '<rect x="' + X + '" y="' + Y + '" width="' + (W / 2 - 2) + '" height="' + (H / 1.4 - 2) + '" rx="3" fill="' + (v === null ? '#f2f2f7' : col(Math.min(1, v / 7))) + '"/>' + (v ? T(X + W / 4 - 1, Y + 18, v.toFixed(1).replace('.0', ''), 't-ink t-sm') : ''); }
        }
      });
      pic.innerHTML = S(600, 200, o, 'Predicted and actual congestion');
      L.$$('rect.ml-tile', pic).forEach(function (t) { t.addEventListener('click', function () { var k = t.getAttribute('data-k'); if (sp[k]) delete sp[k]; else if (Object.keys(sp).length < 4) sp[k] = 1; routed = false; draw(); }); });
      var red = 100 * (1 - r.tot / base);
      out.innerHTML = '<span class="k">Tiles spread</span> ' + Object.keys(sp).length + ' / 4 · ' + (routed ? '<span class="k">total overflow</span> ' + r.tot.toFixed(1) + ' (without changes ' + base + ') → <span class="' + (red >= 40 ? 'v' : 'c') + '">' + red.toFixed(0) + ' % reduction</span>' : 'run the router to see the real overflow');
      var ok = routed && red >= 40;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : routed ? 'bad' : 'warn');
      verdict.innerHTML = ok ? '✅ Overflow cut by ' + red.toFixed(0) + ' % before a single routing iteration was wasted<small>Notice the model was not perfect: it predicted a hotspot at (5,2) that turned out small, and under-estimated the one at (4,4). ML guides the engineer; the router still confirms.</small>' : routed ? '❌ Only ' + red.toFixed(0) + ' % reduction<small>Compare the prediction with the actual map: did the model flag a tile that turned out fine, or miss one? Adjust your choice and route again.</small>' : '🗺️ Choose up to 4 tiles to spread, then run the router.';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function dseFrame(k) {
    var o = '', st = ['Placement candidate', 'Fast ML estimate', 'Keep best few', 'Slow exact tool', 'Final placement'];
    st.forEach(function (s, i) { var x = 10 + i * 118; o += R(x, 50, 106, 46, i <= k ? 'box-on' : 'box', 8) + T(x + 53, 78, s, 't-ink t-b t-sm'); if (i < 4) o += P('M' + (x + 106) + ' 73H' + (x + 118), 'w'); });
    o += T(300, 26, ['Thousands of possible placements / settings', 'A model scores each in milliseconds', 'Only promising candidates survive', 'The real router / STA checks a handful', 'Hours saved, quality kept'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'ML-guided physical design');
  }

  L.module({
    n: 3,
    lead: 'Physical design (Level 10) is full of slow feedback loops: you only know whether a placement is routable after routing it. ML models trained on past layouts predict congestion, routability and timing early, so the tools – and the engineer – can fix problems before spending hours.',
    tags: ['placement optimisation', 'routing prediction', 'congestion prediction', 'timing estimation', 'design-space exploration'],
    sections: [
      {
        id: 'st-dse', type: 'steps', title: 'Animation: ML-guided physical design', nav: 'ML-guided flow',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['Many candidate placements or tool settings.', 'An ML model estimates congestion/timing for each almost instantly.', 'Only the most promising candidates are kept.', 'The exact (slow) router and STA run on a few.', 'The result: similar quality in a fraction of the time.'][k], svg: dseFrame(k) }; })
      },
      {
        id: 'c-uses', type: 'concept', title: 'Where ML helps in physical design', nav: 'Applications',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Task</th><th>Typical model input</th><th>Output</th></tr><tr><td>Congestion prediction</td><td>placement density maps, pin maps (image-like)</td><td>overflow heat map</td></tr><tr><td>Routability / DRC prediction</td><td>local layout features</td><td>DRC-hotspot probability</td></tr><tr><td>Timing estimation</td><td>placed netlist features</td><td>post-route path delay</td></tr><tr><td>Placement optimisation</td><td>candidate placements</td><td>score used to guide the placer</td></tr><tr><td>Design-space exploration</td><td>tool settings (utilisation, effort…)</td><td>predicted PPA per setting</td></tr></table></div>'
      },
      { id: 'w-place', type: 'widget', title: 'AI placement explorer', nav: 'Placement explorer', intro: 'Use the predicted hotspots to spread at most 4 tiles and cut the real routing overflow by at least 40 %. The model is good – but not perfect.', build: placeLab },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: physical-design ML insights', nav: 'Reveal',
        items: [
          { q: 'Why are congestion maps treated like images?', a: 'They are 2-D grids of numbers – the same structure image models (CNNs, Module 7) handle well.' },
          { q: 'What if the model misses a hotspot?', a: 'The router still finds it later; ML reduces iterations, it does not remove verification.' },
          { q: 'Why not route every candidate exactly?', a: 'One routing run can take hours on a large block; thousands of candidates are impossible.' },
          { q: 'Where does training data come from?', a: 'From earlier placements and routings of many designs – each run produces labelled examples.' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: fast ML estimate or exact tool?', nav: 'Drag & drop',
        bins: ['Fast ML estimate', 'Exact EDA tool'],
        items: [['ranking 2,000 placement candidates', 0], ['early congestion heat map', 0], ['choosing promising tool settings', 0], ['final DRC sign-off', 1], ['sign-off STA', 1], ['final detailed routing', 1]]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Congestion prediction lets designers…', o: ['fix placement before routing', 'skip routing forever', 'remove DRC', 'avoid synthesis'], a: 0, w: '' },
          { q: 'A congestion map is naturally handled by…', o: ['image-like (CNN) models', 'only tables', 'SDC files', 'GDSII writers'], a: 0, w: '' },
          { q: 'ML-guided design-space exploration evaluates…', o: ['many settings quickly with a model', 'one setting exactly', 'only RTL', 'test patterns'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An ML congestion predictor says a block is clean, but routing later shows a hotspot near a new macro type never seen in training.', q: 'What does this show?', o: [{ t: 'Models fail on situations outside their training data – keep the real router in the loop and add such cases to training', ok: true, w: 'Classic limitation.' }, { t: 'The router is wrong', ok: false, w: 'Ground truth wins.' }, { t: 'ML is useless', ok: false, w: 'It still saved many iterations.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'ML congestion prediction happens…', o: ['before or during placement', 'after tape-out', 'during wafer test', 'in RTL simulation'], a: 0, w: '' },
      { d: 'Easy', q: 'The final routing result is confirmed by…', o: ['the exact router', 'the model alone', 'the placer\'s guess', 'nobody'], a: 0, w: '' },
      { d: 'Easy', q: 'Design-space exploration searches…', o: ['many tool/design settings', 'one setting', 'masks', 'packages'], a: 0, w: '' },
      { d: 'Medium', q: 'Training labels for congestion models come from…', o: ['past routing results', 'RTL comments', 'test patterns', 'random numbers'], a: 0, w: '' },
      { d: 'Medium', q: 'A false-positive hotspot means…', o: ['predicted congested but actually fine', 'actually congested and predicted', 'missed hotspot', 'a DRC'], a: 0, w: '' },
      { d: 'Medium', q: 'Why use ML to rank placements?', o: ['exact evaluation of each is too slow', 'ML is exact', 'routers are inaccurate', 'it reduces area'], a: 0, w: '' },
      { d: 'Medium', q: 'Timing estimation models predict…', o: ['post-route delay from placement features', 'mask cost', 'test coverage', 'pin count'], a: 0, w: '' },
      { d: 'Hard', q: 'A model trained on one technology node may fail on another because of…', o: ['distribution shift', 'too much data', 'over-routing', 'clock skew'], a: 0, w: '' },
      { d: 'Hard', q: 'Spreading cells in a predicted hotspot mainly trades…', o: ['slightly longer wires for less congestion', 'area for masks', 'power for test time', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'ML in physical design should be seen as…', o: ['guidance that reduces iterations', 'a replacement for sign-off', 'a DRC deck', 'a verification tool only'], a: 0, w: '' }
    ]
  });
})();
