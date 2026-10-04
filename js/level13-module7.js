/* Level 13 · Module 7 – Cache Architecture */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var LINES = 8, BLOCK = 16;
  function seq() { var t = []; for (var a = 0; a < 128; a += 4) t.push(['R', a]); return t; }
  function conflict() { var t = []; for (var i = 0; i < 16; i++) t.push(['R', i % 2 ? 0x80 : 0x00]); return t; }
  function loop() { var t = []; for (var r = 0; r < 4; r++) [0x00, 0x10, 0x20, 0x30].forEach(function (a, i) { t.push([i === 3 ? 'W' : 'R', a]); }); return t; }
  var TR = { seq: ['Sequential array walk (spatial locality)', seq()], conflict: ['Two blocks that collide (A, B, A, B…)', conflict()], loop: ['Small loop working set with writes (temporal locality)', loop()] };
  function hex(a) { return '0x' + ('0' + a.toString(16)).slice(-2).toUpperCase(); }
  function bin(v, n) { var s = v.toString(2); while (s.length < n) s = '0' + s; return n ? s : ''; }

  function simulate(cfg, trace, upto) {
    var ways = cfg.assoc, sets = LINES / ways, offB = 4, idxB = Math.round(Math.log2(sets)), c = [], st = { hit: 0, miss: 0, wb: 0, memw: 0 }, log = [];
    for (var s = 0; s < sets; s++) { c.push([]); for (var w = 0; w < ways; w++) c[s].push({ v: false, tag: 0, d: false, t: 0, ins: 0 }); }
    trace.slice(0, upto).forEach(function (acc, k) {
      var a = acc[1], blk = a >> offB, idx = blk & (sets - 1), tag = blk >> idxB, set = c[idx], wr = acc[0] === 'W';
      var line = set.filter(function (l) { return l.v && l.tag === tag; })[0], hit = !!line;
      if (hit) { st.hit++; line.t = k; if (wr) { if (cfg.wp === 'wb') line.d = true; else st.memw++; } }
      else {
        st.miss++;
        if (wr && cfg.wp === 'wt') { st.memw++; }                                        // write-through, no write-allocate
        else {
          var vic = set.filter(function (l) { return !l.v; })[0] || set.slice().sort(function (x, y) { return cfg.rep === 'lru' ? x.t - y.t : x.ins - y.ins; })[0];
          if (vic.v && vic.d) st.wb++;
          vic.v = true; vic.tag = tag; vic.d = wr && cfg.wp === 'wb'; vic.t = k; vic.ins = k;
        }
      }
      log.push({ a: a, wr: wr, hit: hit, tag: tag, idx: idx, off: a & 15 });
    });
    return { c: c, st: st, log: log, idxB: idxB, sets: sets };
  }

  /* ---------- Widget: cache simulator ---------- */
  function cacheLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Cache simulator · 8 lines × 16-byte blocks, 8-bit addresses</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cfg = { assoc: 1, rep: 'lru', wp: 'wb' }, tr = 'conflict', k = 0, seenDM0 = false, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Address trace', Object.keys(TR).map(function (x) { return [x, TR[x][0]]; }), tr, function (v) { tr = v; k = 0; draw(); });
    L.select(row, 'Mapping', [['1', 'Direct mapped'], ['2', '2-way set associative'], ['8', 'Fully associative']], '1', function (v) { cfg.assoc = +v; k = 0; draw(); });
    L.select(row, 'Replacement', [['lru', 'LRU'], ['fifo', 'FIFO']], 'lru', function (v) { cfg.rep = v; k = 0; draw(); });
    L.select(row, 'Write policy', [['wb', 'Write-back + write-allocate'], ['wt', 'Write-through, no allocate']], 'wb', function (v) { cfg.wp = v; k = 0; draw(); });
    var row2 = L.h('div', 'l7-row'); body.appendChild(row2);
    row2.appendChild(L.btn('▶ Next access', 'pri', function () { k = Math.min(TR[tr][1].length, k + 1); draw(); }));
    row2.appendChild(L.btn('⏭ Run all', 'ghost', function () { k = TR[tr][1].length; draw(); }));
    row2.appendChild(L.btn('↺ Reset', 'ghost', function () { k = 0; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var trace = TR[tr][1], r = simulate(cfg, trace, k), o = '', last = r.log[r.log.length - 1];
      if (last) {
        o += T(10, 18, (last.wr ? 'WRITE ' : 'READ ') + hex(last.a) + ' = ' + bin(last.a, 8), 't-ink t-b t-sm', 'start').replace('class="', 'font-family="JetBrains Mono,monospace" class="');
        var tb = 4 - r.idxB;
        o += R(10, 26, 30 * tb + 2, 26, 'box-vio', 4) + T(11 + 15 * tb, 44, 'tag ' + bin(last.tag, tb), 't-ink t-sm') +
          (r.idxB ? R(14 + 30 * tb, 26, 30 * r.idxB, 26, 'box-cu', 4) + T(14 + 30 * tb + 15 * r.idxB, 44, 'idx ' + bin(last.idx, r.idxB), 't-ink t-sm') : '') +
          R(18 + 120, 26, 120, 26, 'box', 4) + T(198, 44, 'offset ' + bin(last.off, 4), 't-ink t-sm') + T(280, 44, last.hit ? '→ HIT' : '→ MISS', last.hit ? 't-ok t-b' : 't-bad t-b', 'start');
      } else o += T(10, 40, 'Press "Next access" to start', 't-dim t-sm', 'start');
      for (var s = 0; s < r.sets; s++) for (var w = 0; w < cfg.assoc; w++) {
        var l = r.c[s][w], x = 10 + w * (cfg.assoc === 8 ? 72 : 140), y = 64 + (cfg.assoc === 8 ? 0 : s * 26), hl = last && last.idx === s && l.v && l.tag === last.tag;
        o += R(x, y, (cfg.assoc === 8 ? 68 : 134), 22, hl ? (last.hit ? 'box-ok' : 'box-cu') : l.v ? 'box-on' : 'box', 4) +
          T(x + (cfg.assoc === 8 ? 34 : 67), y + 15, l.v ? (cfg.assoc === 8 ? '' : 'set ' + s + ' · ') + 'tag ' + l.tag.toString(2) + (l.d ? ' D' : '') : (cfg.assoc === 8 ? 'empty' : 'set ' + s + ' · empty'), 't-ink t-sm');
      }
      pic.innerHTML = S(600, cfg.assoc === 8 ? 100 : 64 + r.sets * 26 + 6, o, 'Cache state');
      var n = r.st.hit + r.st.miss, hr = n ? 100 * r.st.hit / n : 0;
      out.innerHTML = '<span class="k">Accesses</span> ' + n + ' / ' + trace.length + ' · <span class="k">hits</span> ' + r.st.hit + ' · <span class="k">misses</span> ' + r.st.miss + ' · <span class="k">hit rate</span> <b>' + hr.toFixed(0) + ' %</b>' +
        '<br><span class="k">dirty write-backs</span> ' + r.st.wb + ' · <span class="k">write-through memory writes</span> ' + r.st.memw + ' · <span class="k">sets</span> ' + r.sets + ' × ' + cfg.assoc + ' way' + (cfg.assoc > 1 ? 's' : '');
      var full = k === trace.length;
      if (full && tr === 'conflict' && cfg.assoc === 1) seenDM0 = true;
      var ok = full && tr === 'conflict' && hr >= 80 && seenDM0;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = ok ? '✅ Conflict misses removed: ' + hr.toFixed(0) + ' % hit rate<small>In the direct-mapped cache A and B share one line and keep evicting each other (0 % hits). With associativity both fit in one set.</small>'
        : (seenDM0 ? 'Now reach ≥ 80 % hit rate on the conflict trace.' : 'First run the conflict trace on the direct-mapped cache to the end.') + '<small>Then change the mapping. Explore the other traces too: watch spatial locality (sequential) and dirty write-backs (loop).</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function locFrame(k) {
    var o = '';
    for (var i = 0; i < 16; i++) { var hl = k === 0 ? i >= 4 && i < 8 : k === 1 ? i === 5 : false; o += R(20 + i * 35, 50, 31, 30, hl ? 'box-on' : 'box', 4); }
    if (k === 1) for (var j = 0; j < 4; j++) o += P('M' + (35 + 5 * 35) + ' 46q0 -' + (15 + j * 8) + ' 1 -' + (15 + j * 8), 'w-on');
    if (k === 2) o += R(20, 50, 31 * 4 + 12, 30, 'box-cu', 4) + T(90, 100, 'one block = 16 bytes', 't-cu t-sm');
    o += T(300, 130, ['Spatial locality: neighbouring addresses are used soon after each other', 'Temporal locality: the same address is used again and again', 'Caches fetch whole blocks and keep recently used ones', ''][k] || '', 't-vio t-b t-sm');
    return S(600, 146, o, 'Locality');
  }

  L.module({
    n: 7,
    lead: 'Main memory is a hundred times slower than the processor. Caches keep recently used data close, exploiting the locality of real programs. Learn how addresses split into tag, index and offset, how mapping and replacement work, and what write policies do.',
    tags: ['locality', 'block', 'tag / index / offset', 'hit / miss', 'direct mapped', 'set associative', 'fully associative', 'LRU', 'write-through / write-back', 'write allocate', 'multi-level'],
    sections: [
      {
        id: 'st-loc', type: 'steps', title: 'Animation: locality', nav: 'Locality',
        frames: [0, 1, 2].map(function (k) { return { t: ['<b>Spatial</b>: arrays and instructions are accessed sequentially.', '<b>Temporal</b>: loop variables are reused every iteration.', 'A cache fetches a whole <b>block</b> on a miss and keeps it while it is useful.'][k], svg: locFrame(k) }; })
      },
      {
        id: 'c-addr', type: 'concept', title: 'Tag, index, offset and mapping', nav: 'Address split',
        html: '<div class="l7-eq">address = [ tag | index | offset ]   offset bits = log₂(block size)   index bits = log₂(number of sets)</div>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Direct mapped</h4><p>each block has exactly one possible line – fast, but conflicts</p></div><div class="l7-box cu"><h4>N-way set associative</h4><p>a block can go in any of N lines of its set – fewer conflicts</p></div><div class="l7-box vio"><h4>Fully associative</h4><p>any line – no conflicts, but every tag must be compared</p></div></div>'
      },
      { id: 'w-cache', type: 'widget', title: 'Cache simulator', nav: 'Cache simulator', intro: 'Run the conflict trace on a direct-mapped cache, then remove the conflict misses. Explore the other traces and policies.', build: cacheLab },
      {
        id: 'c-write', type: 'concept', title: 'Replacement, write policies and multi-level caches', nav: 'Policies',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Policy</th><th>Behaviour</th></tr><tr><td>LRU</td><td>evict the least recently used line</td></tr><tr><td>FIFO / random</td><td>simpler hardware, slightly worse</td></tr><tr><td>Write-through</td><td>every write also goes to the next level – simple, more traffic</td></tr><tr><td>Write-back</td><td>write only the cache line (dirty bit); write to memory on eviction</td></tr><tr><td>Write-allocate</td><td>a write miss brings the block into the cache</td></tr></table></div><p>Real processors use L1 (small, ~1 ns), L2 (larger) and a shared L3 (MBs) – each level catching misses of the one above.</p>'
      },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: cache insights', nav: 'Reveal',
        items: [
          { q: 'What are the three Cs of misses?', a: 'Compulsory (first access), capacity (cache too small), conflict (blocks collide in one set).' },
          { q: 'Why not always use fully associative caches?', a: 'Comparing every tag in parallel costs area, power and time; 4–16-way is the usual compromise.' },
          { q: 'Why do bigger blocks help sequential code?', a: 'One miss brings in more neighbouring bytes – but too-big blocks waste bandwidth and increase conflicts.' },
          { q: 'Why does write-back reduce memory traffic?', a: 'Repeated writes to a line cost one memory write at eviction instead of one per write.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: which kind of miss?', nav: 'Drag & drop',
        bins: ['Compulsory', 'Capacity', 'Conflict'],
        items: [['first access to a new array', 0], ['working set larger than the cache', 1], ['two hot blocks share one direct-mapped line', 2], ['program start-up', 0], ['fixed by higher associativity', 2]]
      },
      {
        id: 'calc7', type: 'calc', title: 'Cache calculations', nav: 'Calculate',
        items: [
          { q: '32 KB cache, 64-byte blocks. Number of lines?', a: 512, h: '32768 / 64.', s: '<b>512</b>.' },
          { q: 'Same cache, 4-way. Number of sets?', a: 128, h: '512 / 4.', s: '<b>128</b>.' },
          { q: '32-bit address, 64-byte blocks, 128 sets: tag bits?', a: 19, h: '32 − 6 − 7.', s: '<b>19</b>.' }
        ]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The index selects…', o: ['the set', 'the byte in the block', 'the tag', 'the cache level'], a: 0, w: '' },
          { q: 'A dirty bit is used with…', o: ['write-back caches', 'write-through caches', 'instruction caches only', 'TLBs only'], a: 0, w: '' },
          { q: 'Conflict misses are reduced by…', o: ['higher associativity', 'smaller caches', 'write-through', 'FIFO'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Two arrays whose addresses differ by exactly the cache size are accessed alternately; the hit rate is near 0 %.', q: 'Best fix?', o: [{ t: 'Higher associativity (or offset one array)', ok: true, w: 'Classic conflict misses.' }, { t: 'Bigger blocks', ok: false, w: 'Does not stop the collision.' }, { t: 'Write-through', ok: false, w: 'Unrelated.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Caches exploit…', o: ['locality', 'branch prediction', 'renaming', 'pipelining'], a: 0, w: '' },
      { d: 'Easy', q: 'A hit means…', o: ['the data is in the cache', 'the data is in memory only', 'a branch was taken', 'a stall'], a: 0, w: '' },
      { d: 'Easy', q: 'Offset bits select…', o: ['the byte within a block', 'the set', 'the way', 'the cache level'], a: 0, w: '' },
      { d: 'Medium', q: '16-byte blocks need… offset bits', o: ['4', '16', '2', '8'], a: 0, w: '' },
      { d: 'Medium', q: 'LRU evicts…', o: ['the least recently used line', 'the newest line', 'a random line', 'the dirty line'], a: 0, w: '' },
      { d: 'Medium', q: 'Write-through means…', o: ['every write also updates the next level', 'writes only at eviction', 'no writes', 'writes to the BTB'], a: 0, w: '' },
      { d: 'Medium', q: '64 hits and 16 misses → hit rate', o: ['80 %', '20 %', '64 %', '16 %'], a: 0, w: '' },
      { d: 'Hard', q: '8 KB, 32-byte blocks, 2-way → sets =', o: ['128', '256', '64', '512'], a: 0, w: '8192/32/2.' },
      { d: 'Hard', q: 'Fully associative caches have…', o: ['no index bits', 'no tag', 'no offset', 'one way'], a: 0, w: '' },
      { d: 'Hard', q: 'Write-back + write-allocate on a write miss…', o: ['fetches the block, writes it in cache, marks it dirty', 'writes memory only', 'ignores the write', 'flushes the cache'], a: 0, w: '' }
    ]
  });
})();
