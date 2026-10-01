/* Level 6 – Module 5: Object-Oriented SystemVerilog */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;
  var OCOL = { 1: '#2F6BD2', 2: '#16924F', 3: '#6C4FD1', 4: '#C4860A' };

  function objBox(id, props, extra) {
    var c = OCOL[id] || '#6C7B92';
    return '<div class="l6-box' + (extra && extra.fresh ? ' is-new' : '') + '" style="text-align:left;border-color:' + c + (extra && extra.dead ? ';opacity:.35;border-style:dashed' : '') + '">' +
      '<span style="color:' + c + '">Object #' + id + '</span>' + (extra && extra.dead ? ' <small style="display:inline">(no handles left: freed automatically)</small>' : '') +
      '<small style="font-size:.85rem;color:var(--ink)">' + props + '</small></div>';
  }
  function handleBox(name, target) {
    var c = target ? OCOL[target] : 'var(--ink-3)';
    return '<div class="l6-box" style="text-align:left;border-color:' + c + '">' + name + ' <span style="color:' + c + '">→ ' + (target ? 'Object #' + target : 'null') + '</span></div>';
  }

  /* ---------- Handle visualizer ---------- */
  function initHandles() {
    var steps = [
      { code: 'Packet p1;', h: { p1: null }, o: {}, msg: 'Declaring a handle does <b>not</b> create an object. p1 is null. Using p1.addr now would be a null-handle error.' },
      { code: 'p1 = new();', h: { p1: 1 }, o: { 1: { addr: 0, data: 0 } }, fresh: 1, msg: '<code>new()</code> builds Object #1 in memory and p1 now points to it.' },
      { code: "p1.addr = 8'h05;", h: { p1: 1 }, o: { 1: { addr: '05', data: 0 } }, msg: 'Changes the addr property of the object p1 points to.' },
      { code: 'Packet p2 = p1;', h: { p1: 1, p2: 1 }, o: { 1: { addr: '05', data: 0 } }, msg: 'Handle assignment copies the <b>pointer</b>, not the object. Both handles now point to the same Object #1.' },
      { code: "p2.addr = 8'h09;", h: { p1: 1, p2: 1 }, o: { 1: { addr: '09', data: 0 } }, msg: 'Changing through p2 also changes what p1 sees: <code>p1.addr</code> is now 09. This surprises almost everyone the first time.' },
      { code: 'p2 = new p1;', h: { p1: 1, p2: 2 }, o: { 1: { addr: '09', data: 0 }, 2: { addr: '09', data: 0 } }, fresh: 2, msg: '<code>new p1</code> creates a <b>new</b> object (Object #2) with properties copied from Object #1. Now p2 points to its own object.' },
      { code: "p2.addr = 8'h03;", h: { p1: 1, p2: 2 }, o: { 1: { addr: '09', data: 0 }, 2: { addr: '03', data: 0 } }, msg: 'Only Object #2 changes. p1 still sees 09.' },
      { code: 'p1 = null;', h: { p1: null, p2: 2 }, o: { 1: { addr: '09', data: 0, dead: true }, 2: { addr: '03', data: 0 } }, msg: 'No handle points to Object #1 any more, so the simulator frees it automatically (garbage collection). There is no delete for objects.' }
    ];
    var pos = -1, rows;
    function draw() {
      rows = L6.renderLines($('hvCode'), steps.map(function (s) { return s.code; }));
      if (pos >= 0) rows[pos].classList.add('is-hl');
      var st = pos >= 0 ? steps[pos] : { h: {}, o: {} };
      var hs = Object.keys(st.h);
      $('hvHandles').innerHTML = hs.length ? hs.map(function (k) { return handleBox(k, st.h[k]); }).join('') : '<span class="l6-empty">no handles yet</span>';
      var os = Object.keys(st.o);
      $('hvObjs').innerHTML = os.length ? os.map(function (k) { var o = st.o[k]; return objBox(k, "addr = 8'h" + o.addr + ' &nbsp; data = ' + o.data, { fresh: st.fresh == k, dead: o.dead }); }).join('') : '<span class="l6-empty">memory is empty</span>';
      if (pos >= 0) L6.feedback($('hvNote'), 'info', st.msg); else $('hvNote').className = 'l6-fb';
      if (pos === steps.length - 1) L6.mark('handles');
    }
    $('hvNext').addEventListener('click', function () { if (pos < steps.length - 1) { pos++; draw(); } });
    $('hvReset').addEventListener('click', function () { pos = -1; draw(); });
    draw();
  }

  /* ---------- Static counter ---------- */
  function initStatic() {
    var objs = [];
    function draw(fresh) {
      $('stClass').innerHTML = '<div class="l6-box" style="border-color:var(--accent)">count = ' + objs.length + '<small>static: one copy</small></div>';
      $('stObjs').innerHTML = objs.length ? objs.map(function (o, i) { return objBox(i + 1, 'id = ' + o.id + ' &nbsp; addr = ' + o.addr, { fresh: fresh === i }); }).join('') : '<span class="l6-empty">no objects</span>';
    }
    $('stNew').addEventListener('click', function () {
      if (objs.length >= 4) { L6.feedback($('stNote'), 'info', 'That is enough to see the pattern. Press Restart to try again.'); return; }
      objs.push({ id: objs.length + 1, addr: L6.hex(L6.rand(0, 255), 2) });
      draw(objs.length - 1);
      L6.feedback($('stNote'), 'info', 'The constructor ran <code>count++</code> on the <b>shared</b> counter (now ' + objs.length + ') and copied it into this object\'s own <code>id</code>. Every object sees the same <code>Packet::count</code>.');
      if (objs.length >= 3) L6.mark('static');
    });
    $('stReset').addEventListener('click', function () { objs = []; draw(); $('stNote').className = 'l6-fb'; });
    draw();
  }

  /* ---------- Copy lab ---------- */
  function initCopy() {
    var st, used = {};
    function reset() { st = { p1: { id: 1, hdr: 'A' }, p2: null, hdrs: { A: 10 }, kind: null }; draw(); }
    function draw() {
      var html = '<div class="l6-grid-2">';
      ['p1', 'p2'].forEach(function (n, k) {
        var p = st[n];
        html += '<div><p class="l6-label">' + n + '</p>';
        if (!p) html += '<div class="l6-boxes"><span class="l6-empty">null</span></div>';
        else {
          var shared = st.p2 && st.p1.hdr === st.p2.hdr;
          html += '<div class="l6-box" style="text-align:left;border-color:' + OCOL[k + 1] + '">Packet &nbsp; id = ' + p.id +
            '<div class="l6-box" style="margin-top:8px;text-align:left;border-color:' + (p.hdr === 'A' ? '#C4860A' : '#6C4FD1') + '">Header ' + p.hdr + ' &nbsp; len = ' + st.hdrs[p.hdr] +
            '<small>' + (shared ? 'SHARED with the other packet' : 'own header') + '</small></div></div>';
        }
        html += '</div>';
      });
      $('cpView').innerHTML = html + '</div>';
    }
    var btns = [
      ['p2 = new p1;   // shallow', function () { st.p2 = { id: st.p1.id, hdr: st.p1.hdr }; st.kind = 'shallow'; draw(); L6.feedback($('cpNote'), 'info', 'Shallow copy: a new Packet, but its <code>hdr</code> handle was copied, so both packets point to Header A.'); }],
      ['p2 = p1.copy(); // deep', function () { st.hdrs.B = st.hdrs[st.p1.hdr]; st.p2 = { id: st.p1.id, hdr: 'B' }; st.kind = 'deep'; draw(); L6.feedback($('cpNote'), 'info', 'Deep copy: a new Packet <b>and</b> a new Header B with the same contents.'); }],
      ['p2.id = 2;', function () { if (!st.p2) return need(); st.p2.id = 2; draw(); L6.feedback($('cpNote'), 'ok', 'id is a plain value inside each Packet, so only p2 changes, whichever copy you made.'); }],
      ['p2.hdr.len = 99;', function () {
        if (!st.p2) return need();
        st.hdrs[st.p2.hdr] = 99; draw();
        if (st.p1.hdr === st.p2.hdr) L6.feedback($('cpNote'), 'bad', '<b>p1.hdr.len also became 99!</b> The shallow copy shares Header A. This is a classic testbench bug: modifying a "copy" corrupts the original transaction.');
        else L6.feedback($('cpNote'), 'ok', 'Only p2\'s Header B changed. p1.hdr.len is still ' + st.hdrs.A + '. That is what a deep copy guarantees.');
        used[st.kind] = 1; if (used.shallow && used.deep) L6.mark('copy');
      }],
      ['Restart', function () { reset(); $('cpNote').className = 'l6-fb'; }]
    ];
    function need() { L6.feedback($('cpNote'), 'bad', 'p2 is null. Make a copy first.'); }
    btns.forEach(function (b) { var el = L6.btn(esc(b[0]), 'is-mono'); el.addEventListener('click', b[1]); $('cpBtns').appendChild(el); });
    reset();
  }

  /* ---------- Inheritance tree ---------- */
  function initTree() {
    var classes = {
      Packet: { parent: null, props: ['bit [7:0] addr', 'bit [7:0] data'], methods: ['new(addr)', 'virtual display()'] },
      EthPacket: { parent: 'Packet', props: ['bit [47:0] mac'], methods: ['new(addr)  (overrides)', 'virtual display()  (overrides)'] },
      ErrPacket: { parent: 'Packet', props: ['bit bad_crc'], methods: ['virtual display()  (overrides)', 'inject_error()'] }
    };
    var seen = {};
    var v = $('treeView');
    v.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">' +
      '<button type="button" class="l6-block" data-c="Packet">Packet<small>base class</small></button>' +
      '<div style="width:60%;max-width:340px;height:22px;border:2px solid var(--line);border-bottom:0;border-radius:8px 8px 0 0"></div>' +
      '<div style="display:flex;gap:40px;flex-wrap:wrap;justify-content:center">' +
      '<button type="button" class="l6-block" data-c="EthPacket">EthPacket<small>extends Packet</small></button>' +
      '<button type="button" class="l6-block" data-c="ErrPacket">ErrPacket<small>extends Packet</small></button></div></div>';
    var btns = Array.prototype.slice.call(v.querySelectorAll('.l6-block'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        L6.setOn(btns, b);
        var c = b.dataset.c, cl = classes[c], rows = [];
        if (cl.parent) {
          var p = classes[cl.parent];
          p.props.forEach(function (x) { rows.push('<tr style="color:var(--ink-3)"><td>property</td><td><code>' + esc(x) + '</code></td><td>inherited from ' + cl.parent + '</td></tr>'); });
          p.methods.forEach(function (x) {
            var name = x.split('(')[0].replace('virtual ', '');
            var over = cl.methods.some(function (m) { return m.indexOf(name) >= 0; });
            if (!over) rows.push('<tr style="color:var(--ink-3)"><td>method</td><td><code>' + esc(x) + '</code></td><td>inherited from ' + cl.parent + '</td></tr>');
          });
        }
        cl.props.forEach(function (x) { rows.push('<tr><td>property</td><td><code>' + esc(x) + '</code></td><td>own</td></tr>'); });
        cl.methods.forEach(function (x) { rows.push('<tr><td>method</td><td><code>' + esc(x) + '</code></td><td>' + (x.indexOf('overrides') > 0 ? 'replaces the parent version' : 'own') + '</td></tr>'); });
        L6.feedback($('treeNote'), 'info', '<b>' + c + '</b> contains:<div class="l6-table-wrap"><table class="l6-table"><tbody>' + rows.join('') + '</tbody></table></div>' +
          (cl.parent ? 'An ' + c + ' object <b>is a</b> ' + cl.parent + ', so a ' + cl.parent + ' handle can point to it.' : 'Every class below inherits everything listed here.'));
        seen[c] = 1; if (Object.keys(seen).length === 3) L6.mark('inherit');
      });
    });
  }

  /* ---------- Polymorphism ---------- */
  function initPoly() {
    var obj = 'EthPacket', virt = true, seen = {};
    var outs = {
      Packet: 'addr=10 data=3C',
      EthPacket: 'addr=10 data=3C\n  mac=001122334455',
      ErrPacket: 'addr=10 data=3C\n  CRC ERROR injected'
    };
    L6.buttonGroup($('polyObj'), ['Packet', 'EthPacket', 'ErrPacket'].map(function (o) {
      return { label: 'h = new ' + o + ';', onSelect: function () { obj = o; } };
    }), { mono: true, select: 1 });
    L6.buttonGroup($('polyVirt'), [['virtual display()', true], ['display() (not virtual)', false]].map(function (o) {
      return { label: o[0], onSelect: function () { virt = o[1]; } };
    }), { mono: true, select: 0 });
    $('polyCall').addEventListener('click', function () {
      var runs = virt ? obj : 'Packet';
      var msg = '<b>Runs ' + runs + '::display()</b><pre class="l6-code"><code>' + esc(outs[runs]) + '</code></pre>';
      if (!virt && obj !== 'Packet') msg += 'Without <code>virtual</code>, the <b>handle type</b> (Packet) decides. The ' + obj + ' version is ignored even though the object is an ' + obj + '. Usually a bug.';
      else if (virt && obj !== 'Packet') msg += 'With <code>virtual</code>, the <b>object type</b> decides at run time. Same line of code, different behaviour: that is polymorphism.';
      else msg += 'The object is a plain Packet, so Packet::display() runs either way.';
      L6.feedback($('polyNote'), (!virt && obj !== 'Packet') ? 'bad' : 'ok', msg);
      seen[obj + virt] = 1; if (Object.keys(seen).length >= 3) L6.mark('poly');
    });
  }

  function initAbstract() {
    L6.choiceGame($('absList'), [
      { code: 'BaseTxn t = new();', a: 'Error', why: 'BaseTxn is a virtual (abstract) class, so it can never be constructed.' },
      { code: 'BaseTxn t;\nWriteTxn w = new();\nt = w;', a: 'Allowed', why: 'An abstract-class handle may point to an object of a concrete child class.' },
      { code: 'class ReadTxn extends BaseTxn;\n  bit [7:0] addr;\nendclass\nReadTxn r = new();', a: 'Error', why: 'ReadTxn does not implement the pure virtual convert2string(), so it is still abstract and cannot be constructed.' },
      { code: 't.convert2string();   // t points to a WriteTxn', a: 'Allowed', why: 'Calls WriteTxn::convert2string() through the base handle.' }
    ], ['Allowed', 'Error'], function () { L6.mark('abstract'); }, $('absScore'));
  }

  L6.initModule({
    module: 5,
    activities: ['handles', 'static', 'copy', 'inherit', 'poly', 'abstract', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initHandles(); initStatic(); initCopy(); initTree(); initPoly(); initAbstract(); },
    tryit: [
      { t: 'Declare a handle <code>tx</code> of class <code>Packet</code> and create the object in one line.', re: [/^Packettx=new(\(\))?;?$/], hint: 'Type, handle name, then <code>= new()</code>.', ans: 'Packet tx = new();' },
      { t: 'Write the first line of a class <code>BurstPacket</code> derived from <code>Packet</code>.', re: [/^classBurstPacketextendsPacket;?$/], hint: 'Use <code>extends</code>.', ans: 'class BurstPacket extends Packet;' },
      { t: 'Inside a derived constructor, call the parent constructor with argument <code>addr</code>.', re: [/^super\.new\(addr\);?$/], hint: 'The parent is reached with <code>super</code>.', ans: 'super.new(addr);' },
      { t: 'Inside a method, set the property <code>data</code> to the argument that is also named <code>data</code>.', re: [/^this\.data=data;?$/], hint: 'Use <code>this</code> to refer to the property.', ans: 'this.data = data;' },
      { t: 'Make <code>p2</code> a shallow copy of <code>p1</code>.', re: [/^p2=newp1;?$/], hint: '<code>new</code> followed by the handle to copy.', ans: 'p2 = new p1;' }
    ],
    debug: {
      lines: [
        'class Packet;',
        '  bit [7:0] addr;',
        '  function new(bit [7:0] addr);',
        '    addr = addr;',
        '  endfunction',
        '  virtual function void display();',
        '    $display("addr=%h", addr);',
        '  endfunction',
        'endclass',
        '',
        'class EthPacket extends Packet;',
        '  bit [47:0] mac;',
        '  function new(bit [7:0] addr);',
        "    mac = '1;",
        '  endfunction',
        'endclass',
        '',
        'module tb;',
        '  initial begin',
        '    Packet p;',
        "    p.addr = 8'h10;",
        '  end',
        'endmodule'
      ],
      bugs: {
        4: { id: 'this', t: '<b>Assigns the argument to itself.</b> Inside new(), <code>addr</code> means the argument, so the property is never set. Write <code>this.addr = addr;</code>.' },
        14: { id: 'super', t: '<b>Missing super.new().</b> The Packet constructor needs an argument, so it cannot be called automatically. The first line must be <code>super.new(addr);</code>, otherwise it is a compile error.' },
        21: { id: 'null', t: '<b>Null handle.</b> <code>p</code> was declared but never constructed. Accessing <code>p.addr</code> is a run-time null-object error. Add <code>p = new(8\'h10);</code>.' }
      },
      clean: { 6: 'display() is virtual, so child classes can override it. Good.', 11: 'Correct inheritance syntax.', 20: 'Declaring a handle is fine. The problem is using it before new().' },
      fix: "class Packet;\n  bit [7:0] addr;\n  function new(bit [7:0] addr);\n    this.addr = addr;\n  endfunction\n  virtual function void display();\n    $display(\"addr=%h\", addr);\n  endfunction\nendclass\n\nclass EthPacket extends Packet;\n  bit [47:0] mac;\n  function new(bit [7:0] addr);\n    super.new(addr);\n    mac = '1;\n  endfunction\nendclass\n\nmodule tb;\n  initial begin\n    Packet p = new(8'h10);\n    p.display();\n  end\nendmodule"
    },
    quiz: [
      { q: 'What does <code>Packet p;</code> create?', opts: ['An object', 'A null handle', 'A copy of Packet', 'A static instance'], a: 1, why: 'Only a handle. The object is created by new().' },
      { q: 'After <code>b = a;</code> (both Packet handles), how many objects exist?', opts: ['0', '1 (if a was constructed)', '2', 'It depends on addr'], a: 1, why: 'Handle assignment copies the pointer only.' },
      { q: 'What does <code>p2 = new p1;</code> do?', opts: ['Points p2 to p1\'s object', 'Makes a shallow copy', 'Makes a deep copy', 'Calls p1.new()'], a: 1, why: 'A new object with properties copied; inner handles are shared.' },
      { q: 'A static property is…', opts: ['Constant', 'Shared by all objects of the class', 'Private to one object', 'Only visible in derived classes'], a: 1, why: 'One copy belongs to the class.' },
      { q: 'In a derived class, what does <code>super.display()</code> call?', opts: ['The derived display()', 'The parent class display()', 'All display() methods', 'Nothing: syntax error'], a: 1, why: 'super refers to the parent class.' },
      { q: 'Base handle h points to an EthPacket; display() is NOT virtual. Which display runs?', opts: ['Packet::display', 'EthPacket::display', 'Both', 'Run-time error'], a: 0, why: 'Without virtual, the handle type chooses the method.' },
      { q: 'Which statement about a <code>virtual class</code> is true?', opts: ['It cannot be extended', 'It cannot be constructed with new()', 'All its methods are virtual', 'It is synthesizable'], a: 1, why: 'Abstract classes exist only to be extended.' },
      { q: 'How do you safely assign a base handle <code>h</code> to a derived handle <code>e</code>?', opts: ['<code>e = h;</code>', '<code>e = new h;</code>', '<code>$cast(e, h)</code>', '<code>e = super.h;</code>'], a: 2, why: '$cast checks at run time that h really points to the derived type.' }
    ]
  });
})();
