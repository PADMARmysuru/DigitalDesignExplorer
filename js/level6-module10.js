/* Level 6 – Module 10: Verification Components */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;
  function logTo(el, html) { if (el.dataset.started !== '1') { el.innerHTML = ''; el.dataset.started = '1'; } el.insertAdjacentHTML('beforeend', '<div>' + html + '</div>'); el.scrollTop = 1e6; }

  /* ---------- Architecture builder ---------- */
  function initBuilder() {
    var comps = ['Generator', 'Driver', 'Monitor', 'Scoreboard', 'Coverage', 'DUT'], sel = null, palBtns = [];
    var slots = [];
    comps.forEach(function (c) {
      var b = L6.btn(c);
      b.addEventListener('click', function () { sel = c; L6.setOn(palBtns, b); });
      palBtns.push(b); $('abPalette').appendChild(b);
    });
    function mkSlot(root, group, label) {
      var s = document.createElement('button');
      s.type = 'button'; s.className = 'l6-slot';
      s.innerHTML = '<b>' + label + '</b><span>empty</span>';
      s.dataset.group = group; s.dataset.val = '';
      s.addEventListener('click', function () {
        if (!sel) { L6.feedback($('abNote'), 'info', 'First click a component above, then click a slot.'); return; }
        s.dataset.val = sel; s.querySelector('span').textContent = sel; s.classList.remove('is-right', 'is-wrong');
      });
      root.appendChild(s); slots.push(s);
    }
    for (var i = 1; i <= 3; i++) mkSlot($('abAgent'), 'agent', 'agent slot ' + i);
    mkSlot($('abEnv'), 'env', 'env slot 1'); mkSlot($('abEnv'), 'env', 'env slot 2');
    $('abCheck').addEventListener('click', function () {
      var ok = true, msgs = [], seenAgent = {}, seenEnv = {};
      slots.forEach(function (s) {
        var v = s.dataset.val, good;
        if (s.dataset.group === 'agent') { good = ['Generator', 'Driver', 'Monitor'].indexOf(v) >= 0 && !seenAgent[v]; seenAgent[v] = 1; }
        else { good = ['Scoreboard', 'Coverage'].indexOf(v) >= 0 && !seenEnv[v]; seenEnv[v] = 1; }
        s.classList.toggle('is-right', good); s.classList.toggle('is-wrong', !good);
        if (!good) {
          ok = false;
          if (!v) msgs.push('A slot is still empty.');
          else if (v === 'DUT') msgs.push('The DUT is not a testbench class: it is a module instantiated in the top-level module and reached through the interface.');
          else if (s.dataset.group === 'agent' && (v === 'Scoreboard' || v === 'Coverage')) msgs.push(v + ' is not tied to one interface; it belongs to the environment, where it can collect from several agents.');
          else if (s.dataset.group === 'env' && ['Generator', 'Driver', 'Monitor'].indexOf(v) >= 0) msgs.push(v + ' works with one specific interface, so it belongs inside the agent.');
          else msgs.push(v + ' is used twice in the same place.');
        }
      });
      if (ok) { L6.feedback($('abNote'), 'ok', '<span class="l6-pass">Correct architecture ✓</span> The agent owns everything for one interface; the environment adds checking and coverage; the test configures it all. This is exactly the structure UVM uses.'); L6.mark('builder'); }
      else L6.feedback($('abNote'), 'bad', msgs.filter(function (m, i) { return msgs.indexOf(m) === i; }).join('<br>'));
    });
    $('abClear').addEventListener('click', function () { slots.forEach(function (s) { s.dataset.val = ''; s.querySelector('span').textContent = 'empty'; s.classList.remove('is-right', 'is-wrong'); }); $('abNote').className = 'l6-fb'; });
  }

  /* ---------- Mailbox ---------- */
  function initMailbox() {
    var q = [], cap = 2, n = 0, genBlocked = null, drvBlocked = false, seen = {};
    var log = $('mbLog');
    function draw() {
      $('mbBox').innerHTML = q.length ? q.map(function (t, i) { return '<div class="l6-box">' + t + '<small>' + (i === 0 ? 'next out' : '') + '</small></div>'; }).join('') + (q.length === cap ? '<span class="l6-empty">full (' + cap + '/' + cap + ')</span>' : '') : '<span class="l6-empty">empty</span>';
      $('mbGenState').innerHTML = genBlocked ? '<span class="l6-fail">BLOCKED in put(' + genBlocked + '): waiting for space</span>' : 'running';
      $('mbDrvState').innerHTML = drvBlocked ? '<span class="l6-fail">BLOCKED in get(): waiting for an item</span>' : 'running';
      if (seen.gb && seen.db && seen.tf) L6.mark('mailbox');
    }
    function deliver(t, how) { drvBlocked = false; logTo(log, '<span class="ok">driver was waiting: get() returns ' + t + ' immediately</span>' + (how ? ' ' + how : '')); }
    function put(tryIt) {
      if (genBlocked) { logTo(log, '<span class="bad">The generator is stuck inside put(' + genBlocked + ') and cannot run anything else until the driver makes room.</span>'); return; }
      var t = 'T' + (++n), call = tryIt ? 'ok = mbx.try_put(' + t + ');' : 'mbx.put(' + t + ');';
      logTo(log, L6.highlight(call));
      if (drvBlocked) { deliver(t); if (tryIt) logTo(log, 'try_put returns 1'); }
      else if (q.length < cap) { q.push(t); logTo(log, '<span class="dim">' + t + ' stored (' + q.length + '/' + cap + ')</span>' + (tryIt ? ' try_put returns 1' : '')); }
      else if (tryIt) { n--; logTo(log, '<span class="bad">mailbox full: try_put returns 0 and does NOT wait. Your code must handle the failure.</span>'); seen.tf = 1; }
      else { genBlocked = t; seen.gb = 1; logTo(log, '<span class="bad">mailbox full: the generator BLOCKS until space is available</span>'); }
      draw();
    }
    function get(tryIt) {
      if (drvBlocked) { logTo(log, '<span class="bad">The driver is already stuck inside get(), waiting for the generator.</span>'); return; }
      logTo(log, L6.highlight(tryIt ? 'ok = mbx.try_get(t);' : 'mbx.get(t);'));
      if (q.length) {
        var t = q.shift();
        logTo(log, '<span class="ok">t = ' + t + '</span>' + (tryIt ? ' (try_get returns 1)' : ''));
        if (genBlocked) { q.push(genBlocked); logTo(log, '<span class="ok">space freed: the generator unblocks and ' + genBlocked + ' enters the mailbox</span>'); genBlocked = null; }
      } else if (tryIt) { logTo(log, '<span class="bad">mailbox empty: try_get returns 0 immediately; t is unchanged</span>'); seen.tf = 1; }
      else { drvBlocked = true; seen.db = 1; logTo(log, '<span class="bad">mailbox empty: the driver BLOCKS until the generator puts something</span>'); }
      draw();
    }
    [['put(txn)', function () { put(false); }], ['try_put(txn)', function () { put(true); }]].forEach(function (o) { var b = L6.btn(o[0], 'is-mono'); b.addEventListener('click', o[1]); $('mbGen').appendChild(b); });
    [['get(t)', function () { get(false); }], ['try_get(t)', function () { get(true); }], ['num()', function () { logTo(log, L6.highlight('mbx.num()') + ' <span class="dim">returns ' + q.length + '</span>'); }]].forEach(function (o) { var b = L6.btn(o[0], 'is-mono'); b.addEventListener('click', o[1]); $('mbDrv').appendChild(b); });
    log.innerHTML = '<span class="dim">// Goal: make the generator block, make the driver block, and see a try_ call fail.</span>';
    draw();
  }

  /* ---------- Semaphore + event ---------- */
  function initSync() {
    var keys = 1, owner = null, waiting = null, seen = {};
    function draw() {
      $('smKeys').textContent = keys; $('smOwner').textContent = owner ? 'Driver ' + owner : 'nobody'; $('smWait').textContent = waiting ? 'Driver ' + waiting : '–';
      if (seen.resolved && seen.at && seen.wt) L6.mark('sync');
    }
    function get(who) {
      if (owner === who) { L6.feedback($('smNote'), 'info', 'Driver ' + who + ' already holds the key.'); return; }
      if (waiting === who) { L6.feedback($('smNote'), 'info', 'Driver ' + who + ' is already waiting.'); return; }
      if (keys > 0) { keys--; owner = who; L6.feedback($('smNote'), 'ok', 'Driver ' + who + ': <code>bus_key.get(1)</code> took the only key and now owns the bus.'); }
      else { waiting = who; L6.feedback($('smNote'), 'bad', 'Driver ' + who + ': <code>bus_key.get(1)</code> BLOCKS: no key left. It waits until Driver ' + owner + ' returns the key, so the two drivers never drive the bus at the same time.'); }
      draw();
    }
    function put(who) {
      if (owner !== who) { L6.feedback($('smNote'), 'bad', 'Driver ' + who + ' does not hold a key. Calling put() anyway is legal, and it would add an extra key, so two drivers could use the bus together. A classic bug.'); return; }
      keys++; owner = null;
      var msg = 'Driver ' + who + ': <code>bus_key.put(1)</code> returned the key.';
      if (waiting) { keys--; owner = waiting; msg += ' Driver ' + waiting + ' was waiting, so it wakes up, takes the key and uses the bus.'; waiting = null; seen.resolved = 1; }
      L6.feedback($('smNote'), 'ok', msg); draw();
    }
    ['A', 'B'].forEach(function (w) {
      var g = L6.btn('get(1)', 'is-mono'), p = L6.btn('put(1)', 'is-mono');
      g.addEventListener('click', function () { get(w); }); p.addEventListener('click', function () { put(w); });
      $('sm' + w).appendChild(g); $('sm' + w).appendChild(p);
    });
    L6.buttonGroup($('evMode'), [['B uses @(done)', 'at'], ['B uses wait(done.triggered)', 'wt']].map(function (o) {
      return {
        label: o[0], onSelect: function () {
          if (o[1] === 'at') L6.feedback($('evNote'), 'bad', '<code>@(done)</code> waits for a trigger that happens <b>after</b> B starts waiting. A already triggered at time 10, so B misses it and waits forever. The test hangs.');
          else L6.feedback($('evNote'), 'ok', '<code>wait(done.triggered)</code> checks whether the event was triggered <b>at any point in the current time step</b>. It was, so B continues immediately. Use this form when the order of threads is not guaranteed.');
          seen[o[1]] = 1; draw();
        }
      };
    }));
    draw();
  }

  /* ---------- fork ---------- */
  function initFork() {
    var seen = {};
    L6.buttonGroup($('fkMode'), [['join', 30], ['join_any', 10], ['join_none', 0]].map(function (o) {
      return {
        label: o[0], onSelect: function () {
          var t = o[1];
          var bar = function (name, d) { return '<div style="display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center;margin:4px 0"><span>' + name + '</span><div style="position:relative;height:18px;background:var(--paper);border-radius:4px"><div style="position:absolute;left:0;top:0;bottom:0;width:' + (d / 40 * 100) + '%;background:#9BB4DF;border-radius:4px"></div><span style="position:absolute;left:' + (d / 40 * 100) + '%;top:-2px;font-size:.75rem;padding-left:4px">' + d + '</span></div></div>'; };
          $('fkView').innerHTML = '<div style="position:relative;margin:12px 0">' + bar('thread A', 10) + bar('thread B', 20) + bar('thread C', 30) +
            '<div style="display:grid;grid-template-columns:70px 1fr;gap:8px;margin-top:6px"><span><b>parent</b></span><div style="position:relative;height:22px"><div style="position:absolute;left:' + (t / 40 * 100) + '%;top:0;bottom:0;border-left:3px solid var(--accent)"></div><span style="position:absolute;' + (t > 20 ? 'right:' + (100 - t / 40 * 100) + '%;padding-right:6px' : 'left:' + (t / 40 * 100) + '%;padding-left:6px') + ';font-size:.8rem;color:var(--accent);white-space:nowrap">continues at ' + t + '</span></div></div></div>';
          var msg = { join: 'The parent waits for all three threads: it continues at time 30.', join_any: 'The parent continues as soon as thread A finishes (time 10). B and C are still running in the background and print later.', join_none: 'The parent continues immediately at time 0. All three threads run in the background.' }[o[0]];
          L6.feedback($('fkNote'), 'info', msg);
          seen[o[0]] = 1; if (Object.keys(seen).length === 3) L6.mark('fork');
        }
      };
    }), { mono: true, select: 0 });
  }

  L6.initModule({
    module: 10,
    activities: ['builder', 'mailbox', 'sync', 'fork', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 5,
    init: function () { initBuilder(); initMailbox(); initSync(); initFork(); },
    tryit: [
      { t: 'Create a bounded mailbox <code>mbx</code> of <code>txn</code> that holds at most 1 item (declaration and construction in one line).', re: [/^mailbox#\(txn\)mbx=new\(1\);?$/], hint: '<code>mailbox #(type) name = new(size);</code>', ans: 'mailbox #(txn) mbx = new(1);' },
      { t: 'Try to get an item from <code>mbx</code> into <code>t</code> without waiting, saving the result in <code>ok</code>.', re: [/^ok=mbx\.try_get\(t\);?$/], hint: 'The non-blocking version starts with <code>try_</code>.', ans: 'ok = mbx.try_get(t);' },
      { t: 'Trigger the event <code>done</code>.', re: [/^->done;?$/], hint: 'Events are triggered with an arrow.', ans: '-> done;' },
      { t: 'Create a semaphore <code>key</code> with one key.', re: [/^semaphorekey=new\(1\);?$/], hint: '<code>semaphore name = new(count);</code>', ans: 'semaphore key = new(1);' },
      { t: 'Start <code>drv.run()</code> and <code>mon.run()</code> in parallel and continue immediately.', multi: 3, re: [/^fork(begin)?drv\.run\(\);(end)?(begin)?mon\.run\(\);(end)?join_none;?$/, /^fork(begin)?mon\.run\(\);(end)?(begin)?drv\.run\(\);(end)?join_none;?$/], hint: 'Use <code>fork ... join_none</code>.', ans: 'fork\n  drv.run();\n  mon.run();\njoin_none' }
    ],
    debug: {
      lines: [
        'class driver;',
        '  virtual adder_if vif;',
        '  mailbox #(txn) gen2drv;',
        '  task run();',
        '    forever begin',
        '      txn t;',
        '      gen2drv.get(t);',
        '      @(posedge vif.clk);',
        '      vif.a <= t.a;  vif.b <= t.b;  vif.valid <= 1;',
        '    end',
        '  endtask',
        'endclass',
        '',
        'class env;',
        '  generator gen;  driver drv;',
        '  mailbox #(txn) m;',
        '  function new();',
        '    gen = new();  drv = new();',
        '    gen.gen2drv = m;',
        '    drv.gen2drv = new();',
        '  endfunction',
        '  task run();',
        '    fork gen.run(); drv.run(); join',
        '    $display("all transactions sent");',
        '  endtask',
        'endclass'
      ],
      bugs: {
        19: { id: 'null', t: '<b>Null mailbox.</b> <code>m</code> was declared but never constructed, so the generator\'s put() hits a null handle. Write <code>m = new();</code> before using it.' },
        20: { id: 'diff', t: '<b>Different mailboxes.</b> The driver gets a brand-new mailbox, not the one the generator fills, so it waits forever. Both must share <code>m</code>: <code>drv.gen2drv = m;</code>.' },
        23: { id: 'join', t: '<b>join on a forever thread.</b> <code>drv.run()</code> never ends, so <code>join</code> never returns and the message never prints. Use <code>join_any</code> (continue when the generator finishes) or <code>join_none</code>.' }
      },
      clean: { 7: 'A blocking get() is correct in a driver.', 8: 'Synchronising to the clock before driving is correct.', 16: 'Declaring the mailbox handle is fine. The problem is that it is never constructed.' },
      fix: 'class env;\n  generator gen;  driver drv;\n  mailbox #(txn) m;\n  function new();\n    m   = new();\n    gen = new();  drv = new();\n    gen.gen2drv = m;\n    drv.gen2drv = m;\n  endfunction\n  task run();\n    fork\n      gen.run();\n      drv.run();\n    join_any          // continue when the generator is done\n    $display("all transactions generated");\n  endtask\nendclass'
    },
    quiz: [
      { q: 'What happens when a thread calls <code>get()</code> on an empty mailbox?', opts: ['Returns null', 'Blocks until an item arrives', 'Returns 0', 'Simulation error'], a: 1, why: 'get() is blocking.' },
      { q: 'What does <code>try_put()</code> return if a bounded mailbox is full?', opts: ['1', '0', 'It waits', '-1'], a: 1, why: 'try_ methods never wait; they return 0 on failure.' },
      { q: 'Which component belongs inside an agent?', opts: ['Scoreboard', 'Coverage collector', 'Monitor', 'Test'], a: 2, why: 'Agents contain the interface-specific parts: generator/sequencer, driver, monitor.' },
      { q: 'With <code>fork ... join_any</code>, when does the parent continue?', opts: ['Immediately', 'When the first thread finishes', 'When all threads finish', 'Never'], a: 1, why: 'join_any waits for any one thread.' },
      { q: 'What does <code>disable fork;</code> do?', opts: ['Prevents future forks', 'Kills the child threads still running', 'Waits for all threads', 'Restarts the fork'], a: 1, why: 'It terminates outstanding threads started by this process.' },
      { q: 'What is a semaphore with one key used for?', opts: ['Counting transactions', 'Mutual exclusion: one user of a resource at a time', 'Triggering events', 'Randomization'], a: 1, why: 'Whoever holds the key has exclusive access.' },
      { q: 'Thread A does <code>-&gt; ev;</code> at time 5. Thread B reaches <code>@(ev);</code> later in time 5. What happens to B?', opts: ['It continues', 'It waits for the next trigger', 'Error', 'It restarts A'], a: 1, why: '@ only sees future triggers. wait(ev.triggered) would continue.' },
      { q: 'Why do generator and driver not share a global queue variable instead of a mailbox?', opts: ['Queues are slower', 'A mailbox adds blocking synchronisation between the threads', 'Queues cannot hold handles', 'No reason'], a: 1, why: 'The mailbox makes the consumer wait for data and can limit the producer.' }
    ]
  });
})();
