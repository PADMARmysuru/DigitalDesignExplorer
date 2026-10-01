/* Level 6 – Module 3: Arrays and Data Structures */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  function boxes(el, arr, opts) {
    opts = opts || {};
    if (!arr.length) { el.innerHTML = '<span class="l6-empty">' + (opts.empty || 'empty (size 0)') + '</span>'; return; }
    el.innerHTML = arr.map(function (v, i) {
      var cls = 'l6-box' + (opts.fresh && opts.fresh.indexOf(i) >= 0 ? ' is-new' : '') + (opts.hit && opts.hit.indexOf(i) >= 0 ? ' is-hit' : '');
      var lbl = opts.labels ? opts.labels(i) : '[' + i + ']';
      return '<div class="' + cls + '">' + esc(String(v)) + '<small>' + lbl + '</small></div>';
    }).join('');
  }
  function log(el, code, comment, kind) {
    if (el.dataset.started !== '1') { el.innerHTML = ''; el.dataset.started = '1'; }
    el.insertAdjacentHTML('beforeend', '<div>' + L6.highlight(code) + (comment ? '  <span class="' + (kind || 'dim') + '">// ' + esc(comment) + '</span>' : '') + '</div>');
    el.scrollTop = 1e6;
  }
  function fmt(a) { return "'{" + a.join(', ') + '}'; }

  /* ---------- Multidim ---------- */
  function initMulti() {
    L6.choiceGame($('mdList'), [
      { q: 'For <code>logic [3:0] m [2][3];</code> how many 4-bit elements are there?', a: '6', choices: ['3', '5', '6', '24'], why: '2 × 3 unpacked elements = 6, each 4 bits wide (24 bits of storage).' },
      { q: 'What does <code>m[1][2]</code> select?', a: 'A 4-bit element', choices: ['A single bit', 'A 4-bit element', 'A row of 3 elements', 'Illegal'], why: 'Both unpacked indexes are given, so you get one whole element: <code>logic [3:0]</code>.' },
      { q: 'What does <code>m[1][2][0]</code> select?', a: 'Bit 0 of element [1][2]', choices: ['Bit 0 of element [1][2]', 'Element [1][2][0]', 'Row 0', 'Illegal'], why: 'After the unpacked indexes, the next index selects into the packed dimension.' },
      { q: 'For <code>int grid [4][8];</code> what is <code>$size(grid, 2)</code>?', a: '8', choices: ['4', '8', '32', '1024'], why: 'Dimension 2 is the second unpacked dimension, [8].' }
    ], null, function () { L6.mark('multidim'); }, $('mdScore'));
  }

  /* ---------- Dynamic array ---------- */
  function initDyn() {
    var d = [], used = {};
    function show(fresh) { boxes($('dynBoxes'), d, { fresh: fresh, empty: 'not allocated: size 0' }); }
    function use(k) { used[k] = 1; if (Object.keys(used).length >= 4) L6.mark('dynarr'); }
    var ops = [
      ['d = new[4];', function () { d = [0, 0, 0, 0]; show([0, 1, 2, 3]); log($('dynLog'), 'd = new[4];', 'allocates 4 elements, all 0'); }],
      ['d[i] = random', function () {
        if (!d.length) { log($('dynLog'), 'd[0] = 42;', 'ERROR: index out of bounds, d has size 0. Allocate first!', 'bad'); return; }
        var i = L6.rand(0, d.length - 1), v = L6.rand(1, 99); d[i] = v; show([i]); log($('dynLog'), 'd[' + i + '] = ' + v + ';', 'd = ' + fmt(d));
      }],
      ['d = new[6](d);', function () { var old = d.length; d = d.concat(new Array(Math.max(0, 6 - d.length)).fill(0)).slice(0, 6); var f = []; for (var i = old; i < 6; i++) f.push(i); show(f); log($('dynLog'), 'd = new[6](d);', 'resized to 6, old values copied: ' + fmt(d)); }],
      ['d = new[3];', function () { d = [0, 0, 0]; show([0, 1, 2]); log($('dynLog'), 'd = new[3];', 'fresh allocation: old contents are LOST', 'bad'); }],
      ['d.size()', function () { show(); log($('dynLog'), '$display(d.size());', 'prints ' + d.length); }],
      ['d.delete();', function () { d = []; show(); log($('dynLog'), 'd.delete();', 'frees everything, size is 0'); }]
    ];
    ops.forEach(function (o) {
      var b = L6.btn(esc(o[0]), 'is-mono');
      b.addEventListener('click', function () { o[1](); use(o[0]); });
      $('dynBtns').appendChild(b);
    });
    show();
    $('dynLog').innerHTML = '<span class="dim">// Click an operation</span>';
  }

  /* ---------- Queue ---------- */
  function initQueue() {
    var q = [3, 5], used = {};
    function val() { return parseInt($('qVal').value, 10) || 0; }
    function idx() { return parseInt($('qIdx').value, 10) || 0; }
    function bounded() { return $('qBound').checked; }
    function show(fresh) {
      boxes($('qBoxes'), q, { fresh: fresh, labels: function (i) { return i === 0 && q.length > 1 ? '[0] front' : (i === q.length - 1 ? '[$] back' : '[' + i + ']'); } });
    }
    function done(k) { used[k] = 1; if (Object.keys(used).length >= 6) L6.mark('queue'); }
    function full(code) {
      if (bounded() && q.length >= 5) { log($('qLog'), code, 'bounded queue [$:4] holds at most 5 items: the new item is DROPPED with a warning', 'bad'); return true; }
      return false;
    }
    var ops = [
      ['push_back', function () { var c = 'q.push_back(' + val() + ');'; if (full(c)) return; q.push(val()); show([q.length - 1]); log($('qLog'), c, 'q = ' + fmt(q)); }],
      ['push_front', function () { var c = 'q.push_front(' + val() + ');'; if (full(c)) return; q.unshift(val()); show([0]); log($('qLog'), c, 'q = ' + fmt(q)); }],
      ['pop_back', function () { if (!q.length) { log($('qLog'), 'x = q.pop_back();', 'queue empty: returns 0 and warns', 'bad'); return; } var v = q.pop(); show(); log($('qLog'), 'x = q.pop_back();', 'x = ' + v + ', q = ' + fmt(q)); }],
      ['pop_front', function () { if (!q.length) { log($('qLog'), 'x = q.pop_front();', 'queue empty: returns 0 and warns', 'bad'); return; } var v = q.shift(); show(); log($('qLog'), 'x = q.pop_front();', 'x = ' + v + ', q = ' + fmt(q)); }],
      ['insert', function () { var i = idx(), c = 'q.insert(' + i + ', ' + val() + ');'; if (i < 0 || i > q.length) { log($('qLog'), c, 'index out of range 0..' + q.length + ': ignored with a warning', 'bad'); return; } if (full(c)) return; q.splice(i, 0, val()); show([i]); log($('qLog'), c, 'q = ' + fmt(q)); }],
      ['delete(i)', function () { var i = idx(), c = 'q.delete(' + i + ');'; if (i < 0 || i >= q.length) { log($('qLog'), c, 'no element ' + i + ': warning, nothing removed', 'bad'); return; } q.splice(i, 1); show(); log($('qLog'), c, 'q = ' + fmt(q)); }],
      ['delete()', function () { q = []; show(); log($('qLog'), 'q.delete();', 'removes everything'); }],
      ['size()', function () { show(); log($('qLog'), '$display(q.size());', 'prints ' + q.length); }],
      ['q[$]', function () { show(q.length ? [q.length - 1] : []); log($('qLog'), '$display(q[$]);', q.length ? 'prints ' + q[q.length - 1] + ' (the last element)' : 'empty queue: returns 0', q.length ? 'dim' : 'bad'); }]
    ];
    ops.forEach(function (o) {
      var b = L6.btn(esc(o[0]), 'is-mono');
      b.addEventListener('click', function () { o[1](); done(o[0]); });
      $('qBtns').appendChild(b);
    });
    show();
    $('qLog').innerHTML = '<span class="dim">// q = \'{3, 5}. Click an operation. Use six different ones to finish the activity.</span>';
  }

  /* ---------- Methods ---------- */
  function initMethods() {
    var base = [7, 2, 9, 4, 2, 8], arr = base.slice(), used = {};
    function N() { return parseInt($('mN').value, 10) || 0; }
    function show(hit) { boxes($('mBoxes'), arr, { hit: hit }); }
    function out(code, res, note) {
      $('mOut').innerHTML = L6.highlight(code) + '<br>→ <b>' + esc(res) + '</b>' + (note ? '<br><span style="color:var(--ink-2)">' + note + '</span>' : '');
    }
    function idxWhere(f) { var r = []; arr.forEach(function (v, i) { if (f(v)) r.push(i); }); return r; }
    var ops = [
      ['find', function () { var n = N(), h = idxWhere(function (v) { return v > n; }); show(h); out('r = arr.find(x) with (x > ' + n + ');', fmt(h.map(function (i) { return arr[i]; })), 'Returns the matching values as a queue.'); }],
      ['find_index', function () { var n = N(), h = idxWhere(function (v) { return v > n; }); show(h); out('r = arr.find_index(x) with (x > ' + n + ');', fmt(h), 'Returns the positions, not the values.'); }],
      ['find_first', function () { var n = N(), h = idxWhere(function (v) { return v > n; }).slice(0, 1); show(h); out('r = arr.find_first(x) with (x > ' + n + ');', fmt(h.map(function (i) { return arr[i]; })), 'Still a queue: empty if nothing matches.'); }],
      ['min / max', function () { var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr); show(idxWhere(function (v) { return v === mn || v === mx; })); out('lo = arr.min();  hi = arr.max();', "'{" + mn + "}  '{" + mx + '}', 'min() and max() also return queues.'); }],
      ['unique', function () { var u = arr.filter(function (v, i) { return arr.indexOf(v) === i; }); show(); out('r = arr.unique();', fmt(u), 'One copy of each distinct value.'); }],
      ['sum', function () { show(); out('s = arr.sum();', String(arr.reduce(function (a, b) { return a + b; }, 0)), 'A reduction returns a single value.'); }],
      ['sort', function () { arr.sort(function (a, b) { return a - b; }); show(); out('arr.sort();', fmt(arr), 'Changes arr in place, smallest first.'); }],
      ['rsort', function () { arr.sort(function (a, b) { return b - a; }); show(); out('arr.rsort();', fmt(arr), 'Largest first.'); }],
      ['reverse', function () { arr.reverse(); show(); out('arr.reverse();', fmt(arr), 'Reverses the current order (it does not sort).'); }],
      ['shuffle', function () { for (var i = arr.length - 1; i > 0; i--) { var j = L6.rand(0, i), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } show(); out('arr.shuffle();', fmt(arr), 'Random order.'); }],
      ['reset', function () { arr = base.slice(); show(); out("arr = '{7, 2, 9, 4, 2, 8};", fmt(arr)); }]
    ];
    ops.forEach(function (o) {
      var b = L6.btn(esc(o[0]), 'is-mono');
      b.addEventListener('click', function () { o[1](); if (o[0] !== 'reset') { used[o[0]] = 1; if (Object.keys(used).length >= 5) L6.mark('methods'); } });
      $('mBtns').appendChild(b);
    });
    show();
    $('mOut').textContent = 'Click a method. Try find with different values of N.';
  }

  /* ---------- Associative ---------- */
  function initAssoc() {
    var mem = {}, iter = null, used = {};
    function key() { var s = $('aAddr').value.replace(/_/g, '').trim(); return /^[0-9a-fA-F]{1,8}$/.test(s) ? parseInt(s, 16) >>> 0 : null; }
    function data() { var s = $('aData').value.replace(/_/g, '').trim(); return /^[0-9a-fA-F]{1,8}$/.test(s) ? parseInt(s, 16) >>> 0 : null; }
    function keys() { return Object.keys(mem).map(Number).sort(function (a, b) { return a - b; }); }
    function h(n) { return "32'h" + L6.hex(n, 8).replace(/(....)(....)/, '$1_$2'); }
    function draw(hl) {
      var ks = keys();
      var t = '<p class="l6-label">Stored entries: ' + ks.length + ' &nbsp; Memory used: about ' + (ks.length * 8) + ' bytes (a fixed array for all 2³² addresses would need 16 GB)</p>';
      if (!ks.length) t += '<div class="l6-boxes"><span class="l6-empty">nothing stored yet</span></div>';
      else t += '<div class="l6-table-wrap"><table class="l6-table"><thead><tr><th>key (address)</th><th>value</th></tr></thead><tbody>' +
        ks.map(function (k) { return '<tr' + (k === hl ? ' style="background:var(--warn-soft)"' : '') + '><td><code>' + h(k) + '</code></td><td><code>' + h(mem[k]) + '</code></td></tr>'; }).join('') + '</tbody></table></div>';
      $('aTable').innerHTML = t;
    }
    function done(k) { used[k] = 1; if (Object.keys(used).length >= 4) L6.mark('assoc'); }
    var ops = [
      ['write', function () { var k = key(), d = data(); if (k === null || d === null) { log($('aLog'), '// invalid hex', 'use up to 8 hex digits', 'bad'); return; } mem[k] = d; draw(k); log($('aLog'), 'mem[' + h(k) + '] = ' + h(d) + ';', 'stored. num() = ' + keys().length); }],
      ['read', function () { var k = key(); if (k === null) return; if (k in mem) { draw(k); log($('aLog'), 'x = mem[' + h(k) + '];', 'x = ' + h(mem[k])); } else { draw(); log($('aLog'), 'x = mem[' + h(k) + '];', 'no such entry: returns 0 and warns. Use exists() first!', 'bad'); } }],
      ['exists()', function () { var k = key(); if (k === null) return; draw(k in mem ? k : undefined); log($('aLog'), 'mem.exists(' + h(k) + ')', 'returns ' + (k in mem ? 1 : 0)); }],
      ['num()', function () { draw(); log($('aLog'), 'mem.num()', 'returns ' + keys().length); }],
      ['first / next', function () {
        var ks = keys(); if (!ks.length) { log($('aLog'), 'mem.first(k)', 'returns 0: array is empty', 'bad'); return; }
        if (iter === null || ks.indexOf(iter) === ks.length - 1 || ks.indexOf(iter) < 0) { iter = ks[0]; draw(iter); log($('aLog'), 'mem.first(k);', 'k = ' + h(iter) + ' (smallest key)'); }
        else { iter = ks[ks.indexOf(iter) + 1]; draw(iter); log($('aLog'), 'mem.next(k);', 'k = ' + h(iter) + (ks.indexOf(iter) === ks.length - 1 ? ' (last key: the next call returns 0)' : '')); }
      }],
      ['delete(key)', function () { var k = key(); if (k === null) return; var had = k in mem; delete mem[k]; draw(); log($('aLog'), 'mem.delete(' + h(k) + ');', had ? 'entry removed' : 'nothing to remove'); }]
    ];
    ops.forEach(function (o) {
      var b = L6.btn(esc(o[0]), 'is-mono');
      b.addEventListener('click', function () { o[1](); done(o[0]); });
      $('aBtns').appendChild(b);
    });
    draw();
    $('aLog').innerHTML = '<span class="dim">// Write a few addresses far apart, e.g. 0, 1000_0000, FFFF_FFF0</span>';
  }

  function initChoose() {
    var C = ['Fixed array', 'Dynamic array', 'Queue', 'Associative array'];
    L6.choiceGame($('chList'), [
      { q: 'A scoreboard stores expected packets and removes the oldest one each time the DUT outputs a packet.', a: 'Queue', why: 'push_back when you predict, pop_front when the DUT responds: first in, first out.' },
      { q: 'A model of a 64-bit address space where a test writes only about 1000 locations.', a: 'Associative array', why: 'Only written addresses take memory.' },
      { q: 'A packet payload whose length is chosen randomly at the start of each transaction, then stays the same.', a: 'Dynamic array', why: 'Allocate once with new[len]; no need to grow at the ends afterwards.' },
      { q: 'A synthesizable 16 × 8-bit register file.', a: 'Fixed array', why: 'Hardware has a fixed size; only fixed arrays are synthesizable.' },
      { q: 'Counting how many times each opcode name was seen: <code>count["ADD"]++</code>.', a: 'Associative array', why: 'Indexed by a string key.' }
    ], C, function () { L6.mark('choose'); }, $('chScore'));
  }

  L6.initModule({
    module: 3,
    activities: ['multidim', 'dynarr', 'queue', 'methods', 'assoc', 'choose', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initMulti(); initDyn(); initQueue(); initMethods(); initAssoc(); initChoose(); },
    tryit: [
      { t: 'Declare a queue of <code>int</code> named <code>exp_q</code>.', re: [/^intexp_q\[\$\];?$/], hint: 'A queue uses <code>[$]</code> after the name.', ans: 'int exp_q[$];' },
      { t: 'Allocate 10 elements for the dynamic array <code>payload</code>.', re: [/^payload=new\[10\];?$/], hint: 'Use <code>new[n]</code>.', ans: 'payload = new[10];' },
      { t: 'Remove the oldest item from <code>exp_q</code> and store it in <code>t</code>.', re: [/^t=exp_q\.pop_front\(\);?$/], hint: 'The oldest item is at the front.', ans: 't = exp_q.pop_front();' },
      { t: 'Declare an associative array <code>mem</code> of <code>byte</code>, indexed by <code>int</code>.', re: [/^bytemem\[int\];?$/], hint: 'Put the index type inside the brackets.', ans: 'byte mem[int];' },
      { t: 'Put every element of <code>arr</code> that is less than 0 into the queue <code>neg</code>.', re: [/^neg=arr\.find\((\w+)\)with\(\1<0\);?$/, /^neg=arr\.findwith\(item<0\);?$/], hint: 'Use <code>find(x) with (...)</code>.', ans: 'neg = arr.find(x) with (x < 0);' }
    ],
    debug: {
      lines: [
        'module tb;',
        '  int q[$];',
        '  int d[];',
        '  int score[string];',
        '  initial begin',
        '    d[0] = 5;',
        '    q.push_back(3);',
        '    q.push_back(9);',
        '    $display("%0d", q.pop_front());',
        '    score["alice"] = 90;',
        '    if (score["bob"] > 50)',
        '      $display("bob passed");',
        '    foreach (q[i]) q.delete(i);',
        '  end',
        'endmodule'
      ],
      bugs: {
        6: { id: 'alloc', t: '<b>Writing to an unallocated dynamic array.</b> <code>d</code> has size 0, so <code>d[0]</code> is out of bounds: the write is lost with a run-time error. Call <code>d = new[1];</code> (or larger) first.' },
        11: { id: 'exists', t: '<b>Reading a key that was never written.</b> <code>score["bob"]</code> does not exist: the read returns 0 with a warning, hiding the real problem. Use <code>if (score.exists("bob") && score["bob"] > 50)</code>.' },
        13: { id: 'iter', t: '<b>Deleting while iterating.</b> Removing elements inside <code>foreach</code> shifts the remaining indexes, so elements are skipped or indexes go out of range. To empty a queue, call <code>q.delete();</code>.' }
      },
      clean: { 2: 'Correct queue declaration.', 3: 'Correct dynamic array declaration. The problem comes later.', 4: 'Correct associative array with a string key.', 9: 'pop_front on a non-empty queue: fine, prints 3.', 10: 'Writing a new key is always allowed.' },
      fix: 'module tb;\n  int q[$];\n  int d[];\n  int score[string];\n  initial begin\n    d = new[1];\n    d[0] = 5;\n    q.push_back(3);\n    q.push_back(9);\n    $display("%0d", q.pop_front());\n    score["alice"] = 90;\n    if (score.exists("bob") && score["bob"] > 50)\n      $display("bob passed");\n    q.delete();\n  end\nendmodule'
    },
    quiz: [
      { q: 'For <code>int q[$] = \'{1, 2, 3};</code> what does <code>q.pop_back()</code> return?', opts: ['1', '3', '\'{1, 2}', '0'], a: 1, why: 'pop_back removes and returns the last element.' },
      { q: 'After <code>q.push_front(0);</code> on <code>\'{1, 2, 3}</code>, what is <code>q[1]</code>?', opts: ['0', '1', '2', '3'], a: 1, why: 'q becomes \'{0, 1, 2, 3}; index 1 holds 1.' },
      { q: 'What happens to existing data with <code>d = new[8];</code>?', opts: ['It is kept', 'It is lost', 'Only the first 8 are kept', 'Compile error'], a: 1, why: 'Plain new[] allocates fresh storage. Use <code>new[8](d)</code> to copy.' },
      { q: 'What type does <code>arr.find(x) with (x &gt; 3)</code> return?', opts: ['int', 'bit', 'A queue', 'A dynamic array index'], a: 2, why: 'Locator methods return a queue because there can be any number of matches.' },
      { q: 'Which structure is best for a sparse memory model?', opts: ['Fixed array', 'Dynamic array', 'Queue', 'Associative array'], a: 3, why: 'Only written entries take storage.' },
      { q: 'Which method tells you whether an associative array has a key?', opts: ['<code>num()</code>', '<code>exists()</code>', '<code>find()</code>', '<code>size()</code>'], a: 1, why: '<code>exists(key)</code> returns 1 if the entry is present.' },
      { q: 'Which of these is synthesizable?', opts: ['<code>int q[$];</code>', '<code>logic [7:0] m[16];</code>', '<code>int d[];</code>', '<code>int a[string];</code>'], a: 1, why: 'Only fixed-size arrays map to hardware.' },
      { q: 'What does <code>arr.reverse()</code> do to <code>\'{3, 1, 2}</code>?', opts: ['\'{1, 2, 3}', '\'{3, 2, 1}', '\'{2, 1, 3}', 'Returns a new queue and leaves arr unchanged'], a: 2, why: 'reverse() flips the current order in place; it does not sort.' }
    ]
  });
})();
