/* Level 14 · Module 6 – Reinforcement Learning for VLSI */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var N = 5, PINS = [[0, 0], [4, 1], [2, 4]];
  function cost(a) { var x = a % N, y = Math.floor(a / N); return PINS.reduce(function (s, p) { return s + Math.abs(x - p[0]) + Math.abs(y - p[1]); }, 0); }
  var BEST = (function () { var b = 0; for (var a = 1; a < N * N; a++) if (cost(a) < cost(b)) b = a; return b; })();

  /* ---------- Widget: RL placement game ---------- */
  function rlLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>RL placement game · an agent learns where to place a cell</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var Q, cnt, ep, hist, eps = 0.3, tried0 = false, triedE = false, done = false, manual = null;
    function reset() { Q = []; cnt = []; for (var a = 0; a < N * N; a++) { Q.push(-20); cnt.push(0); } ep = 0; hist = []; }
    reset();
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Environment</span> 5 × 5 placement grid, one movable cell connected to three fixed pins · <span class="k">state</span> empty grid · <span class="k">action</span> choose a site · <span class="k">reward</span> − wire length (Manhattan) · <span class="k">policy</span> ε-greedy over learned values Q'));
    L.slider(body, 'Exploration ε (probability of trying a random site)', 0, 1, 0.05, eps, function (v) { return v.toFixed(2); }, function (v) { eps = v; });
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('▶ Train 50 episodes', 'pri', function () { train(50); }));
    row.appendChild(L.btn('↺ Reset agent', 'ghost', function () { reset(); draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function greedy() { var b = 0; for (var a = 1; a < N * N; a++) if (Q[a] > Q[b]) b = a; return b; }
    function train(n) {
      if (eps === 0) tried0 = true; else triedE = true;
      for (var i = 0; i < n; i++) {
        var a = Math.random() < eps ? Math.floor(Math.random() * N * N) : greedy();
        var r = -cost(a); cnt[a]++; Q[a] += (r - Q[a]) / cnt[a]; ep++; hist.push(r);   // sample-average value estimate
      }
      draw();
    }
    function draw() {
      var o = '', W = 46, g = greedy();
      for (var a = 0; a < N * N; a++) {
        var x = a % N, y = Math.floor(a / N), v = Q[a], t = Math.max(0, Math.min(1, (v + 20) / 12));
        o += '<rect class="rl-site" data-a="' + a + '" x="' + (20 + x * W) + '" y="' + (30 + y * W) + '" width="' + (W - 3) + '" height="' + (W - 3) + '" rx="5" fill="rgba(52,199,89,' + (0.08 + 0.7 * t) + ')" stroke="' + (a === g && ep ? '#0071e3' : '#d2d2d7') + '" stroke-width="' + (a === g && ep ? 3 : 1) + '" style="cursor:pointer"/>';
        o += T(20 + x * W + W / 2 - 1, 30 + y * W + W / 2 + 4, v > -20 ? v.toFixed(0) : '?', 't-dim t-sm');
      }
      PINS.forEach(function (p) { o += '<circle cx="' + (20 + p[0] * W + 10) + '" cy="' + (30 + p[1] * W + 10) + '" r="7" fill="#ff9500"/>'; });
      if (manual !== null) o += '<rect x="' + (20 + (manual % N) * W + 8) + '" y="' + (30 + Math.floor(manual / N) * W + 8) + '" width="27" height="27" rx="4" fill="#5856d6" opacity=".8" pointer-events="none"/>';
      o += T(20, 18, 'Q value per site (blue frame = agent\'s current choice, orange = fixed pins)', 't-dim t-sm', 'start');
      var cx = 290, cw = 300, ch = 180, cy = 40;
      o += R(cx, cy, cw, ch, 'box', 6) + T(cx + cw / 2, cy - 8, 'learning curve: average reward per 10 episodes', 't-dim t-sm');
      var pts = [];
      for (var i = 0; i + 10 <= hist.length; i += 10) { var m = hist.slice(i, i + 10).reduce(function (s, v) { return s + v; }, 0) / 10; pts.push(m); }
      if (pts.length > 1) { var d = pts.map(function (m, k) { return (k ? 'L' : 'M') + (cx + 8 + k * (cw - 16) / (pts.length - 1)) + ' ' + (cy + ch - 10 - (m + 20) / 13 * (ch - 20)); }).join(''); o += '<path d="' + d + '" fill="none" stroke="#0071e3" stroke-width="2.5"/>'; }
      o += T(cx + cw / 2, cy + ch + 16, ep + ' episodes · best possible reward ' + (-cost(BEST)), 't-dim t-sm');
      pic.innerHTML = S(600, 262, o, 'RL placement');
      L.$$('rect.rl-site', pic).forEach(function (r) { r.addEventListener('click', function () { manual = +r.getAttribute('data-a'); draw(); }); });
      var found = ep > 0 && g === BEST, ok = found && tried0 && triedE && eps > 0;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : found ? 'warn' : 'bad');
      verdict.innerHTML = (manual !== null ? 'Your manual placement: reward ' + (-cost(manual)) + (manual === BEST ? ' (optimal!)' : '') + '. ' : '') +
        (found ? 'The agent\'s policy now picks the optimal site (reward ' + (-cost(BEST)) + ').' : ep ? 'The agent currently prefers a site with reward ' + (-cost(g)) + ' (optimum ' + (-cost(BEST)) + ').' : 'Train the agent.') +
        '<small>' + (ok ? '✅ With ε = 0 the agent exploits its first guess forever; with exploration it discovers better sites and converges. Real RL placers (e.g. for macro placement) face the same trade-off on far larger state spaces.' : !tried0 ? 'Reset, set ε = 0 and train: what happens?' : !triedE ? 'Now reset, use ε > 0 and train again.' : 'Keep training with exploration until the policy reaches the optimum.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function rlFrame(k) {
    var o = R(40, 50, 140, 60, 'box-on', 10) + T(110, 85, 'Agent (policy)', 't-ink t-b t-sm') + R(400, 50, 160, 60, 'box-cu', 10) + T(480, 85, 'Environment (layout)', 't-ink t-b t-sm');
    if (k >= 1) o += P('M180 66H400', 'w-on') + T(290, 58, 'action: place / move a block', 't-sig t-sm');
    if (k >= 2) o += P('M400 96H180', 'w-cu') + T(290, 116, 'new state + reward (−wire length, −congestion)', 't-cu t-sm');
    o += T(300, 150, ['The agent observes the state of the layout', 'It takes an action according to its policy', 'The environment returns a reward and a new state', 'Repeated over many episodes, the policy improves'][k], 't-vio t-b t-sm');
    return S(600, 166, o, 'RL loop');
  }

  L.module({
    n: 6,
    lead: 'Some design problems are sequences of decisions – placing one macro after another, choosing routing or optimisation moves. Reinforcement learning learns such decision policies by trial and reward. Learn the vocabulary and the central trade-off between exploring and exploiting.',
    tags: ['agent', 'environment', 'state', 'action', 'reward', 'policy', 'exploration', 'exploitation', 'placement', 'design-space exploration'],
    sections: [
      {
        id: 'st-rl', type: 'steps', title: 'Animation: the reinforcement-learning loop', nav: 'RL loop',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>State</b>: what the agent observes (e.g. current partial placement).', '<b>Action</b>: a decision (place the next macro at a location).', '<b>Reward</b>: feedback (shorter wires, less congestion → higher reward).', 'Over many <b>episodes</b> the <b>policy</b> learns which actions lead to high total reward.'][k], svg: rlFrame(k) }; })
      },
      {
        id: 'c-terms', type: 'concept', title: 'RL vocabulary with VLSI examples', nav: 'Vocabulary',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Term</th><th>Placement example</th></tr><tr><td>Agent</td><td>the learning placer</td></tr><tr><td>Environment</td><td>the chip canvas + evaluation (wire length, congestion, density)</td></tr><tr><td>State</td><td>macros placed so far</td></tr><tr><td>Action</td><td>location for the next macro</td></tr><tr><td>Reward</td><td>− (wire length + congestion penalty) at the end</td></tr><tr><td>Policy</td><td>the agent\'s strategy: state → action</td></tr><tr><td>Exploration / exploitation</td><td>try new placements vs repeat the best known one</td></tr></table></div><p>Other applications: routing order, logic-optimisation recipe selection, design-space exploration of architecture parameters.</p>'
      },
      { id: 'w-rl', type: 'widget', title: 'RL placement game', nav: 'RL game', intro: 'Train the agent once without exploration (ε = 0) and once with exploration, until its policy finds the optimal site. You can also place the cell yourself by tapping a site.', build: rlLab },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: RL insights', nav: 'Reveal',
        items: [
          { q: 'Why did the ε = 0 agent get stuck?', a: 'It only ever chose the best-known action; since its first try already looked better than the untried (pessimistic) estimates, it never discovered anything better.' },
          { q: 'Why not explore all the time?', a: 'Then it never uses what it learned. Practical agents explore a lot early and less later.' },
          { q: 'Why is real chip placement much harder?', a: 'Hundreds of macros, millions of cells: the state space is astronomically large, so the policy is a neural network, not a table.' },
          { q: 'How is the reward computed in practice?', a: 'With fast proxies (wire length, density, congestion estimate) – full routing per step would be too slow.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: match the RL term', nav: 'Drag & drop',
        bins: ['State', 'Action', 'Reward'],
        items: [['macros already placed', 0], ['current congestion map', 0], ['put macro 7 at (120, 40)', 1], ['swap two cells', 1], ['− total wire length', 2], ['penalty for overlaps', 2]]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In RL, the policy maps…', o: ['states to actions', 'actions to labels', 'features to masks', 'rewards to states'], a: 0, w: '' },
          { q: 'Exploration means…', o: ['trying actions not known to be best', 'repeating the best action', 'stopping training', 'removing rewards'], a: 0, w: '' },
          { q: 'A placement reward is typically based on…', o: ['wire length and congestion', 'file size', 'number of designers', 'RTL lines'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An RL macro placer always produces nearly the same placement and never improves after the first hours of training.', q: 'What should be tuned first?', o: [{ t: 'Increase exploration (it is exploiting too early)', ok: true, w: 'Classic exploitation trap.' }, { t: 'Remove the reward', ok: false, w: 'Then it cannot learn.' }, { t: 'Lower the clock frequency', ok: false, w: 'Unrelated.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The RL agent receives…', o: ['rewards from the environment', 'labels for every example', 'masks', 'RTL'], a: 0, w: '' },
      { d: 'Easy', q: 'Placing a macro is an RL…', o: ['action', 'reward', 'state', 'label'], a: 0, w: '' },
      { d: 'Easy', q: 'Exploitation means…', o: ['using the best-known action', 'trying random actions', 'resetting', 'changing rewards'], a: 0, w: '' },
      { d: 'Medium', q: 'ε = 0.2 in ε-greedy means…', o: ['20 % random actions', '20 % rewards', 'learning rate 0.2', '20 episodes'], a: 0, w: '' },
      { d: 'Medium', q: 'An episode in placement RL could be…', o: ['placing all macros once and scoring the result', 'one clock cycle', 'one test pattern', 'one mask'], a: 0, w: '' },
      { d: 'Medium', q: 'Why use proxy rewards (wire length) instead of full routing?', o: ['full routing per step is too slow', 'routing is inaccurate', 'proxies are exact', 'routing is illegal'], a: 0, w: '' },
      { d: 'Medium', q: 'The optimum single-cell position for Manhattan wire length to several pins is at the…', o: ['median of the pin coordinates', 'mean of distances', 'farthest pin', 'chip corner'], a: 0, w: '' },
      { d: 'Hard', q: 'An agent that never explores risks…', o: ['being stuck at a sub-optimal policy', 'learning too fast', 'random behaviour', 'zero reward always'], a: 0, w: '' },
      { d: 'Hard', q: 'For huge state spaces, the policy is usually…', o: ['a neural network', 'a 5×5 table', 'a single number', 'a netlist'], a: 0, w: '' },
      { d: 'Hard', q: 'Design-space exploration with RL means…', o: ['learning which parameter choices give good PPA', 'routing only', 'test-pattern generation only', 'mask writing'], a: 0, w: '' }
    ]
  });
})();
