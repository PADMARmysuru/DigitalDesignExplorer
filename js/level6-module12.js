/* Level 6 – Module 12: Verification Projects */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;
  var R = L6.rand, H = function (n) { return L6.hex(n, 2); };
  function chance(p) { return Math.random() < p; }
  function ok(s) { return '<span class="ok">' + s + '</span>'; }
  function bad(s) { return '<span class="bad">' + s + '</span>'; }
  function corner8() { var r = Math.random(); return r < 0.12 ? 0 : (r < 0.24 ? 255 : R(1, 254)); }

  var STAGES = ['1. RTL', '2. Testbench', '3. Assertions', '4. Randomization', '5. Coverage'];
  var STAGE_NOTES = [
    'The design under test, exactly as a designer would write it.',
    'Driver, monitor and scoreboard with a reference model. Only the key parts are shown.',
    'Rules checked every clock cycle, independent of the scoreboard.',
    'The transaction class and constraints the generator uses.',
    'The covergroup that tells us what the 20 transactions really exercised.'
  ];

  /* ============ Project definitions ============ */
  var P = [
    {
      id: 'p_fifo', name: 'FIFO (depth 4)',
      spec: 'A synchronous FIFO with 4 entries of 8 bits. <code>push</code> writes <code>din</code> unless full; <code>pop</code> advances the read pointer unless empty. <code>full</code> must be high exactly when 4 entries are stored.',
      bug: 'full asserted at 3 entries',
      code: [
        "module fifo4 (input  logic clk, rst_n, push, pop,\n              input  logic [7:0] din,\n              output logic [7:0] dout,\n              output logic full, empty);\n  logic [7:0] mem [4];\n  logic [1:0] wp, rp;\n  logic [2:0] count;\n  assign full  = (count == 4);\n  assign empty = (count == 0);\n  assign dout  = mem[rp];\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) begin wp <= '0; rp <= '0; count <= '0; end\n    else begin\n      if (push && !full)  begin mem[wp] <= din; wp <= wp + 1'b1; end\n      if (pop  && !empty) rp <= rp + 1'b1;\n      count <= count + (push && !full) - (pop && !empty);\n    end\nendmodule",
        "// scoreboard: a queue is the perfect reference model for a FIFO\nbit [7:0] model_q[$];\n\ntask check(fifo_txn t);\n  if (t.pop && model_q.size() > 0) begin\n    bit [7:0] exp = model_q.pop_front();\n    if (t.dout !== exp) begin errors++; $error(\"pop: got %h exp %h\", t.dout, exp); end\n  end\n  if (t.push && model_q.size() < 4) model_q.push_back(t.din);\nendtask",
        "a_full:  assert property (@(posedge clk) disable iff (!rst_n)\n                          full == (count == 4));\na_empty: assert property (@(posedge clk) disable iff (!rst_n)\n                          empty == (count == 0));\nc_full:  cover  property (@(posedge clk) full && push);   // write attempted when full",
        "class fifo_txn;\n  rand bit       push, pop;\n  rand bit [7:0] din;\n  constraint c_mix {\n    push dist {1 := 6, 0 := 4};   // slightly more pushes: the FIFO fills up\n    pop  dist {1 := 4, 0 := 6};\n  }\nendclass",
        "covergroup cg_fifo @(posedge clk);\n  cp_state: coverpoint {full, empty} { bins empty = {2'b01}; bins mid = {2'b00}; bins full = {2'b10}; }\n  cp_ops:   coverpoint {push, pop}   { bins both = {2'b11}; }\n  cx_push_full: cross cp_state, push { bins push_full = binsof(cp_state.full) && binsof(push) intersect {1}; }\n  cx_pop_empty: cross cp_state, pop  { bins pop_empty = binsof(cp_state.empty) && binsof(pop) intersect {1}; }\nendgroup"
      ],
      run: function (bug) {
        var dq = [], mq = [], cap = bug ? 3 : 4, log = [], sb = [0, 0], as = [0, 0];
        var cov = { 'empty': 0, 'full': 0, 'push when full': 0, 'pop when empty': 0, 'push + pop together': 0 };
        for (var c = 0; c < 20; c++) {
          var push = chance(c < 11 ? 0.8 : 0.3), pop = chance(c < 11 ? 0.25 : 0.7), din = R(0, 255);
          var count = dq.length, full = count >= cap, empty = count === 0;
          var mcount0 = mq.length;  // the model also decides on start-of-cycle state, like the RTL
          if (empty) cov.empty++; if (full) cov.full++;
          if (push && full) cov['push when full']++; if (pop && empty) cov['pop when empty']++; if (push && pop) cov['push + pop together']++;
          var aOk = full === (count === 4);
          if (aOk) as[0]++; else as[1]++;
          var line = 'cyc ' + c + ': count=' + count + (full ? ' FULL' : '') + (empty ? ' EMPTY' : '');
          if (!aOk) line += ' ' + bad('a_full FAILED: full=1 but count=' + count);
          if (pop && !empty) {
            var got = dq.shift(), exp = mq.length ? mq.shift() : null;
            if (got === exp) { sb[0]++; line += ' | pop ' + H(got) + ' ' + ok('✓'); }
            else { sb[1]++; line += ' | pop ' + bad('got ' + H(got) + ', expected ' + (exp === null ? 'nothing' : H(exp)) + ' ✗'); }
          } else if (pop && empty && mq.length) { var lost = mq.shift(); sb[1]++; line += ' | ' + bad('DUT empty but model still holds ' + H(lost) + ' ✗'); }
          if (push) {
            if (!full) { dq.push(din); line += ' | push ' + H(din); } else line += ' | push ' + H(din) + ' refused (full)';
            if (mcount0 < 4) mq.push(din);
          }
          log.push(line);
        }
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'The DUT raises <code>full</code> with only 3 entries. <b>a_full</b> fires the first time count reaches 3. The scoreboard only notices if a write is refused and data goes missing, which depends on the random stimulus. This is why flags deserve assertions.' : '' };
      }
    },
    {
      id: 'p_alu', name: 'ALU',
      spec: 'An 8-bit ALU with operations ADD, SUB, AND, OR and XOR. The result <code>y</code> is registered: it appears one cycle after <code>valid</code>, together with <code>done</code>.',
      bug: 'SUB computes b − a',
      code: [
        "typedef enum logic [2:0] {ADD, SUB, AND_, OR_, XOR_} op_t;\n\nmodule alu (input  logic clk, valid, input op_t op,\n            input  logic [7:0] a, b,\n            output logic [7:0] y, output logic done);\n  always_ff @(posedge clk) begin\n    done <= valid;\n    if (valid)\n      unique case (op)\n        ADD:  y <= a + b;\n        SUB:  y <= a - b;\n        AND_: y <= a & b;\n        OR_:  y <= a | b;\n        XOR_: y <= a ^ b;\n      endcase\n  end\nendmodule",
        "function automatic bit [7:0] ref_alu(op_t op, bit [7:0] a, b);\n  case (op)\n    ADD: return a + b;   SUB: return a - b;\n    AND_: return a & b;  OR_: return a | b;  default: return a ^ b;\n  endcase\nendfunction\n\n// scoreboard\nif (t.y !== ref_alu(t.op, t.a, t.b)) begin\n  errors++;  $error(\"%s %h %h: got %h\", t.op.name(), t.a, t.b, t.y);\nend",
        "a_done:  assert property (@(posedge clk) valid |=> done);\na_no_x:  assert property (@(posedge clk) done |-> !$isunknown(y));",
        "class alu_txn;\n  rand op_t      op;\n  rand bit [7:0] a, b;\n  constraint c_corner {\n    a dist {0 := 12, 255 := 12, [1:254] :/ 76};\n    b dist {0 := 12, 255 := 12, [1:254] :/ 76};\n  }\nendclass",
        "covergroup cg_alu @(posedge clk iff valid);\n  cp_op: coverpoint op;                       // 5 automatic bins\n  cp_a:  coverpoint a { bins zero = {0}; bins max = {255}; bins mid = {[1:254]}; }\nendgroup"
      ],
      run: function (bug) {
        var ops = ['ADD', 'SUB', 'AND', 'OR', 'XOR'], log = [], sb = [0, 0], as = [20, 0];
        var cov = { ADD: 0, SUB: 0, AND: 0, OR: 0, XOR: 0, 'a = 0': 0, 'a = 255': 0, 'a mid': 0 };
        for (var i = 0; i < 20; i++) {
          var op = ops[i < 5 ? i : R(0, 4)], a = corner8(), b = corner8();
          var f = { ADD: function () { return a + b; }, SUB: function () { return a - b; }, AND: function () { return a & b; }, OR: function () { return a | b; }, XOR: function () { return a ^ b; } };
          var exp = f[op]() & 255, y = (bug && op === 'SUB') ? (b - a) & 255 : exp;
          cov[op]++; cov[a === 0 ? 'a = 0' : (a === 255 ? 'a = 255' : 'a mid')]++;
          if (y === exp) { sb[0]++; log.push('#' + (i + 1) + ' ' + op + ' ' + H(a) + ', ' + H(b) + ' → ' + H(y) + ' ' + ok('✓')); }
          else { sb[1]++; log.push('#' + (i + 1) + ' ' + op + ' ' + H(a) + ', ' + H(b) + ' → ' + bad(H(y) + ', expected ' + H(exp) + ' ✗')); }
        }
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'Every SUB with a ≠ b gives the wrong result. The timing assertions pass (the result still arrives on time); only the scoreboard\'s reference model notices the value is wrong.' : '' };
      }
    },
    {
      id: 'p_uart', name: 'UART transmitter',
      spec: 'Sends each byte as a 10-bit frame: start bit 0, eight data bits <b>LSB first</b>, stop bit 1. The monitor samples the <code>tx</code> line and rebuilds the byte.',
      bug: 'data sent MSB first',
      code: [
        "module uart_tx (input  logic clk, rst_n, start, input logic [7:0] data,\n                output logic tx, busy);\n  logic [9:0] shreg;  logic [3:0] n;\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) begin tx <= 1; busy <= 0; end\n    else if (start && !busy) begin\n      shreg <= {1'b1, data, 1'b0};     // stop, data, start\n      busy <= 1;  n <= 0;\n    end else if (busy) begin\n      tx    <= shreg[0];              // LSB first\n      shreg <= shreg >> 1;\n      n     <= n + 1;\n      if (n == 9) busy <= 0;\n    end\nendmodule",
        "// monitor: wait for the start bit, then sample 8 data bits and the stop bit\ntask sample_frame(output bit [7:0] d);\n  @(negedge vif.tx);              // start bit begins\n  repeat (BIT_TIME) @(posedge vif.clk);\n  for (int i = 0; i < 8; i++) begin\n    repeat (BIT_TIME) @(posedge vif.clk);\n    d[i] = vif.tx;                // LSB first\n  end\nendtask\n\n// scoreboard compares d with the byte the driver sent",
        "a_start: assert property (@(posedge clk) $rose(busy) |=> tx == 0);          // start bit\na_stop:  assert property (@(posedge clk) $fell(busy) |-> $past(tx) == 1);   // stop bit\na_idle:  assert property (@(posedge clk) !busy |-> tx == 1);                // line idles high",
        "class uart_txn;\n  rand bit [7:0] data;\n  constraint c_patterns {\n    data dist {8'h00 := 10, 8'hFF := 10, 8'h55 := 10, 8'hAA := 10, [8'h01:8'hFE] :/ 60};\n  }\nendclass",
        "covergroup cg_uart;\n  cp_data: coverpoint data {\n    bins zeros = {8'h00};  bins ones = {8'hFF};\n    bins alt01 = {8'h55};  bins alt10 = {8'hAA};\n    bins other = default;\n  }\nendgroup"
      ],
      run: function (bug) {
        var log = [], sb = [0, 0], as = [0, 0], cov = { '00': 0, 'FF': 0, '55': 0, 'AA': 0, other: 0 };
        for (var i = 0; i < 20; i++) {
          var r = Math.random(), d = r < 0.1 ? 0 : (r < 0.2 ? 255 : (r < 0.3 ? 0x55 : (r < 0.4 ? 0xAA : R(1, 254))));
          var bits = []; for (var k = 0; k < 8; k++) bits.push((d >> (bug ? 7 - k : k)) & 1);
          var frame = [0].concat(bits, [1]);
          var rx = 0; for (var j = 0; j < 8; j++) rx |= frame[1 + j] << j;
          as[0] += 3;
          cov[{ 0: '00', 255: 'FF', 85: '55', 170: 'AA' }[d] || 'other']++;
          var fs = frame[0] + ' ' + bits.join('') + ' ' + frame[9];
          if (rx === d) { sb[0]++; log.push('#' + (i + 1) + ' sent ' + H(d) + '  frame ' + fs + '  rx ' + H(rx) + ' ' + ok('✓')); }
          else { sb[1]++; log.push('#' + (i + 1) + ' sent ' + H(d) + '  frame ' + fs + '  rx ' + bad(H(rx) + ' ✗')); }
        }
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'The start, stop and idle bits are all correct, so every assertion passes. The data bits are reversed, which only the scoreboard sees. Notice that 00, FF (and any bit-palindrome such as 81 or 3C) still match even with the bug: the reason coverage of varied data patterns matters.' : '' };
      }
    },
    {
      id: 'p_fsm', name: 'FSM: 1011 detector',
      spec: 'A Mealy FSM that raises <code>detect</code> when the last four input bits are 1011. Overlapping sequences count: in 1011011, the pattern is found twice.',
      bug: 'non-overlapping (restarts after a detection)',
      code: [
        "typedef enum logic [1:0] {S0, S1, S10, S101} st_t;\n\nmodule det1011 (input logic clk, rst_n, in, output logic detect);\n  st_t s, ns;\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) s <= S0; else s <= ns;\n  always_comb begin\n    ns = s;  detect = 0;\n    unique case (s)\n      S0:   ns = in ? S1   : S0;\n      S1:   ns = in ? S1   : S10;\n      S10:  ns = in ? S101 : S0;\n      S101: if (in) begin detect = 1; ns = S1; end   // overlap: last 1 starts a new match\n            else ns = S10;\n    endcase\n  end\nendmodule",
        "// reference model: keep the last 4 bits in a shift register\nbit [3:0] hist;\nalways @(posedge clk) begin\n  hist = {hist[2:0], vif.in};\n  if (vif.detect !== (hist == 4'b1011)) begin\n    errors++;  $error(\"detect=%b, history=%b\", vif.detect, hist);\n  end\nend",
        "a_last1: assert property (@(posedge clk) detect |-> in);                   // detection needs a final 1\na_hist:  assert property (@(posedge clk) detect |-> $past(in,1) && !$past(in,2) && $past(in,3));\nc_overlap: cover property (@(posedge clk) detect ##3 detect);             // overlapping case seen?",
        "class bitstream;\n  rand bit bits[];\n  constraint c_len { bits.size() == 20; }\n  // plus a directed chunk: the generator also inserts \"1011011\" patterns\nendclass",
        "covergroup cg_fsm @(posedge clk);\n  cp_state: coverpoint s;                           // S0, S1, S10, S101\n  cp_det:   coverpoint detect { bins hit = {1}; }\n  cp_ovl:   coverpoint (detect && $past(detect, 3)) { bins overlap = {1}; }\nendgroup"
      ],
      run: function (bug) {
        var chunks = ['1011011', '1011', '0', '1', '10', '110'], bits = '';
        while (bits.length < 20) bits += chunks[R(0, chunks.length - 1)];
        bits = bits.slice(0, 20);
        if (bits.indexOf('1011011') < 0) bits = '1011011' + bits.slice(7);
        var s = 0, names = ['S0', 'S1', 'S10', 'S101'], log = [], sb = [0, 0], as = [0, 0], hist = '', lastDet = -10;
        var cov = { S0: 0, S1: 0, S10: 0, S101: 0, detect: 0, overlap: 0 };
        for (var i = 0; i < 20; i++) {
          var inb = +bits[i], det = 0, ns;
          cov[names[s]]++;
          if (s === 0) ns = inb ? 1 : 0;
          else if (s === 1) ns = inb ? 1 : 2;
          else if (s === 2) ns = inb ? 3 : 0;
          else { if (inb) { det = 1; ns = bug ? 0 : 1; } else ns = 2; }
          hist = (hist + inb).slice(-4);
          var exp = hist === '1011' ? 1 : 0;
          if (det) { cov.detect++; if (i - lastDet === 3) cov.overlap++; lastDet = i; as[0]++; }
          var line = 'cyc ' + i + ': in=' + inb + ' state=' + names[s] + ' detect=' + det;
          if (det === exp) { sb[0]++; line += exp ? ' ' + ok('✓ pattern found') : ''; }
          else { sb[1]++; line += ' ' + bad('✗ expected detect=' + exp + ' (last 4 bits ' + hist + ')'); }
          log.push(line);
          s = ns;
        }
        log.unshift('<span class="dim">input stream: ' + bits + '</span>');
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'After a detection the buggy FSM returns to S0 and throws away the final 1, so in 1011011 the second match is missed. Its assertions still pass (every detection it does make is valid). The scoreboard\'s independent history check catches the missing detection. Without the overlap coverage bin, you might never generate this case.' : '' };
      }
    },
    {
      id: 'p_ram', name: 'RAM 16×8',
      spec: 'A single-port synchronous RAM with 16 locations of 8 bits. A write stores <code>wdata</code> at <code>addr</code>; a read returns the last value written to that address (0 if never written).',
      bug: 'address bit 3 ignored',
      code: [
        "module ram16x8 (input  logic clk, we, input logic [3:0] addr,\n                input  logic [7:0] wdata, output logic [7:0] rdata);\n  logic [7:0] mem [16];\n  initial foreach (mem[i]) mem[i] = '0;\n  always_ff @(posedge clk) begin\n    if (we) mem[addr] <= wdata;\n    rdata <= mem[addr];\n  end\nendmodule",
        "// reference model: an associative array holds only written addresses\nbit [7:0] model[bit [3:0]];\n\nfunction void check(ram_txn t);\n  if (t.we) model[t.addr] = t.wdata;\n  else begin\n    bit [7:0] exp = model.exists(t.addr) ? model[t.addr] : 8'h00;\n    if (t.rdata !== exp) begin errors++; $error(\"addr %0d: got %h exp %h\", t.addr, t.rdata, exp); end\n  end\nendfunction",
        "a_no_x: assert property (@(posedge clk) !we |=> !$isunknown(rdata));",
        "class ram_txn;\n  rand bit       we;\n  rand bit [3:0] addr;\n  rand bit [7:0] wdata;\n  // phase 1: writes, phase 2: reads (set by the test)\n  constraint c_phase { we == write_phase; }\nendclass",
        "covergroup cg_ram @(posedge clk);\n  cp_half: coverpoint addr[3] { bins low = {0}; bins high = {1}; }\n  cx_op:   cross cp_half, we;\n  cp_raw:  coverpoint read_after_write { bins hit = {1}; }\nendgroup"
      ],
      run: function (bug) {
        var dut = new Array(16).fill(0), model = {}, log = [], sb = [0, 0], as = [0, 0], written = [];
        var cov = { 'write low': 0, 'write high': 0, 'read low': 0, 'read high': 0, 'read after write': 0 };
        var waddr = []; for (var i = 0; i < 10; i++) waddr.push(R(0, 15));
        waddr[9] = waddr[8] ^ 8;   // the test plan includes an address pair from both halves
        for (var w = 0; w < 10; w++) {
          var a = waddr[w], d = R(1, 255);
          dut[bug ? a & 7 : a] = d; model[a] = d; written.push(a);
          cov[a < 8 ? 'write low' : 'write high']++;
          log.push('#' + (w + 1) + ' WRITE mem[' + a + '] = ' + H(d));
        }
        for (var r = 0; r < 10; r++) {
          var ra = r === 0 ? waddr[8] : (r < 7 ? written[R(0, written.length - 1)] : R(0, 15));
          var got = dut[bug ? ra & 7 : ra], exp = model.hasOwnProperty(ra) ? model[ra] : 0;
          as[0]++;
          cov[ra < 8 ? 'read low' : 'read high']++;
          if (model.hasOwnProperty(ra)) cov['read after write']++;
          if (got === exp) { sb[0]++; log.push('#' + (11 + r) + ' READ  mem[' + ra + '] → ' + H(got) + ' ' + ok('✓')); }
          else { sb[1]++; log.push('#' + (11 + r) + ' READ  mem[' + ra + '] → ' + bad(H(got) + ', expected ' + H(exp) + ' ✗ (overwritten via address ' + (ra ^ 8) + ')')); }
        }
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'Addresses a and a+8 map to the same cell, so a later write to one overwrites the other. The data is never X, so the assertion passes; only reading back and comparing with an independent model reveals the aliasing.' : '' };
      }
    },
    {
      id: 'p_bus', name: 'Valid/ready bus',
      spec: 'A master sends numbered data words to a slave. A word is transferred on a clock edge where <code>valid &amp;&amp; ready</code>. While <code>valid</code> is high and <code>ready</code> is low, the master must hold <code>data</code> stable.',
      bug: 'master changes data during a stall',
      code: [
        "module master (input  logic clk, rst_n, ready,\n               output logic valid, output logic [7:0] data);\n  logic [7:0] next_word;\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) begin valid <= 0; next_word <= 1; end\n    else if (!valid || ready) begin   // only move on after a transfer\n      valid     <= 1;\n      data      <= next_word;\n      next_word <= next_word + 1;\n    end\nendmodule",
        "// monitor: record every completed transfer\nalways @(posedge vif.clk)\n  if (vif.valid && vif.ready) received.push_back(vif.data);\n\n// scoreboard: words must arrive in order 1, 2, 3, ... with none missing\nforeach (received[i])\n  if (received[i] != i + 1) begin errors++; $error(\"word %0d: got %0d\", i, received[i]); end",
        "a_stable: assert property (@(posedge clk) disable iff (!rst_n)\n                           valid && !ready |=> valid && $stable(data));",
        "class slave_cfg;\n  rand int ready_pct;\n  constraint c_ready { ready_pct inside {[40:70]}; }   // random back-pressure\nendclass\n// each cycle: ready = ($urandom_range(99) < ready_pct);",
        "covergroup cg_bus @(posedge clk);\n  cp_hs: coverpoint {valid, ready} { bins xfer = {2'b11}; bins stall = {2'b10}; }\n  cp_b2b:   coverpoint (xfer && $past(xfer))   { bins hit = {1}; }\n  cp_long:  coverpoint (stall && $past(stall)) { bins hit = {1}; }\nendgroup"
      ],
      run: function (bug) {
        var word = 1, log = [], sb = [0, 0], as = [0, 0], rec = [], prevStall = false, prevX = false, prevData = null;
        var cov = { transfer: 0, stall: 0, 'back-to-back': 0, 'long stall': 0 };
        for (var c = 0; c < 20; c++) {
          var ready = chance(0.55), data = word, line, aFail = false;
          if (prevStall) { if (prevData === data) as[0]++; else { as[1]++; aFail = true; } }
          if (ready) {
            rec.push(data); cov.transfer++; if (prevX) cov['back-to-back']++;
            var exp = rec.length;
            if (data === exp) { sb[0]++; line = 'cyc ' + c + ': transfer word ' + data + ' ' + ok('✓'); }
            else { sb[1]++; line = 'cyc ' + c + ': transfer word ' + data + ' ' + bad('✗ expected word ' + exp); }
            word++; prevX = true; prevStall = false;
          } else {
            cov.stall++; if (prevStall) cov['long stall']++;
            line = 'cyc ' + c + ': stall, data = word ' + data;
            if (bug) { word++; line += ' ' + bad('(master will move on to word ' + word + ')'); }
            prevX = false; prevStall = true;
          }
          if (aFail) line += ' ' + bad('a_stable FAILED: data changed during the stall');
          prevData = data;
          log.push(line);
        }
        return { log: log, sb: sb, as: as, cov: cov, why: bug ? 'During each stall the master changes <code>data</code>, so the stalled word is never delivered. <b>a_stable</b> fires on the very next edge after the stall; the scoreboard notices later, when a word number is missing. Assertions pinpoint <i>when</i>, the scoreboard shows the <i>effect</i>.' : '' };
      }
    }
  ];

  function initProjects() {
    var cur = null, stage = 0, stagesSeen = {}, results = {};
    var stageBtns = STAGES.map(function (s, i) {
      var b = L6.btn(s);
      b.addEventListener('click', function () { showStage(i); });
      $('pjStages').appendChild(b); return b;
    });
    function showStage(i) {
      stage = i; L6.setOn(stageBtns, stageBtns[i]);
      L6.setCode('pjCode', cur.code[i]);
      $('pjStageNote').textContent = STAGE_NOTES[i];
      stagesSeen[cur.id] = stagesSeen[cur.id] || {};
      stagesSeen[cur.id][i] = 1;
      if (Object.keys(stagesSeen[cur.id]).length === 5) L6.mark('stages');
    }
    L6.buttonGroup($('pjTabs'), P.map(function (p) {
      return {
        label: p.name, onSelect: function () {
          cur = p;
          $('pjSpec').innerHTML = p.spec;
          $('pjBugDesc').textContent = p.bug;
          $('pjBug').checked = false;
          ['pjTx', 'pjSb', 'pjAs', 'pjCv'].forEach(function (id) { $(id).textContent = id === 'pjTx' ? '0' : '–'; });
          $('pjCovBins').innerHTML = ''; $('pjVerdict').innerHTML = ''; $('pjExplain').innerHTML = '';
          $('pjLog').innerHTML = '<span class="dim">// Press Run</span>';
          showStage(0);
        }
      };
    }), { select: 0 });
    $('pjRun').addEventListener('click', function () {
      var bug = $('pjBug').checked, r = cur.run(bug);
      var bins = Object.keys(r.cov), hit = bins.filter(function (k) { return r.cov[k] > 0; }).length, pct = Math.round(100 * hit / bins.length);
      var fail = r.sb[1] > 0 || r.as[1] > 0;
      $('pjTx').textContent = '20';
      $('pjSb').innerHTML = '<span style="color:var(--ok)">' + r.sb[0] + '</span> / <span style="color:' + (r.sb[1] ? 'var(--bad)' : 'inherit') + '">' + r.sb[1] + '</span>';
      $('pjAs').textContent = r.as[1]; $('pjAs').style.color = r.as[1] ? 'var(--bad)' : 'var(--ok)';
      $('pjCv').textContent = pct + '%';
      $('pjCovBins').innerHTML = L6.meter('coverage', pct) + '<div class="l6-boxes" style="min-height:0">' + bins.map(function (k) {
        return '<div class="l6-box" style="border-color:' + (r.cov[k] ? 'var(--ok)' : 'var(--bad)') + '">' + esc(k) + '<small>' + (r.cov[k] ? r.cov[k] + ' hits' : 'HOLE') + '</small></div>';
      }).join('') + '</div>';
      $('pjVerdict').innerHTML = '<div class="l6-verdict ' + (fail ? 'fail' : 'pass') + '">' + (fail ? 'TEST FAILED ✗' : 'TEST PASSED ✓') +
        '<span style="font-size:.9rem;font-weight:500;display:block">' + (fail ? (r.sb[1] ? r.sb[1] + ' scoreboard error' + (r.sb[1] > 1 ? 's' : '') : 'scoreboard clean') + ', ' + (r.as[1] ? r.as[1] + ' assertion failure' + (r.as[1] > 1 ? 's' : '') : 'no assertion failures') : 'All checks passed' + (pct < 100 ? ', but coverage is ' + pct + '%: run more transactions or seeds before sign-off.' : ' and coverage is complete.')) + '</span></div>';
      $('pjLog').innerHTML = r.log.map(function (l) { return '<div>' + l + '</div>'; }).join('');
      $('pjLog').scrollTop = 0;
      $('pjExplain').innerHTML = bug ? '<div class="l6-fb is-show ' + (fail ? 'is-ok' : 'is-bad') + '">' + (fail ? '<b>Bug caught.</b> ' : '<b>The bug slipped through this run!</b> The random stimulus did not reach the situation that exposes it. Run again, and think about which coverage bin would guarantee it. ') + r.why + '</div>' : '';
      results[cur.id] = results[cur.id] || {};
      if (!bug && !fail) results[cur.id].pass = 1;
      if (bug && fail) results[cur.id].caught = 1;
      if (results[cur.id].pass && results[cur.id].caught) L6.mark(cur.id);
    });
  }

  L6.initModule({
    module: 12,
    activities: ['stages', 'p_fifo', 'p_alu', 'p_uart', 'p_fsm', 'p_ram', 'p_bus', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initProjects(); },
    tryit: [
      { t: 'Write an assertion for the FIFO: whenever <code>full</code> is high, <code>count</code> must be 4.', re: [/^assertproperty\(@\(posedgeclk\)full\|->count==4\);?$/, /^assertproperty\(@\(posedgeclk\)full\|->\(count==4\)\);?$/], hint: 'Overlapping implication from full.', ans: 'assert property (@(posedge clk) full |-> count == 4);' },
      { t: 'Constrain the UART byte <code>data</code> so 8\'h00 and 8\'hFF each have weight 10 and every other value weight 1, using dist.', re: [/^datadist\{8'h00:=10,8'hff:=10,\[8'h01:8'hfe\]:=1\};?$/i, /^datadist\{0:=10,255:=10,\[1:254\]:=1\};?$/], hint: 'Use <code>:=</code> for each item.', ans: "data dist {8'h00 := 10, 8'hFF := 10, [8'h01:8'hFE] := 1};" },
      { t: 'Write a cover property that checks the FSM saw two detections exactly 3 cycles apart (an overlap).', re: [/^coverproperty\(@\(posedgeclk\)detect##3detect\);?$/], hint: '<code>cover property (@(posedge clk) a ##n b);</code>', ans: 'cover property (@(posedge clk) detect ##3 detect);' },
      { t: 'In the RAM scoreboard, compute <code>exp</code>: <code>model[addr]</code> if the entry exists, otherwise 0 (one line using the conditional operator).', re: [/^exp=model\.exists\(addr\)\?model\[addr\]:(0|8'h00|'0);?$/], hint: '<code>exp = cond ? a : b;</code> with <code>model.exists(addr)</code>.', ans: 'exp = model.exists(addr) ? model[addr] : 0;' },
      { t: 'Write a coverpoint <code>cp_half</code> on <code>addr[3]</code> with bins <code>low</code> = {0} and <code>high</code> = {1}.', re: [/^cp_half:coverpointaddr\[3\]\{binslow=\{0\};binshigh=\{1\};?\}$/], hint: '<code>label: coverpoint expr { bins a = {..}; bins b = {..}; }</code>', ans: 'cp_half: coverpoint addr[3] { bins low = {0}; bins high = {1}; }' }
    ],
    debug: {
      lines: [
        'class test;',
        '  env e;',
        '  function new(virtual alu_if vif);',
        '    e = new(vif);',
        '  endfunction',
        '  task run();',
        '    e.gen.count = 100;',
        '    fork e.run(); join_none',
        '    $display("TEST PASSED");',
        '  endtask',
        'endclass',
        '',
        'module tb_top;',
        '  logic clk;',
        '  alu_if vif (clk);',
        '  alu    dut (.bus(vif));',
        '  initial begin',
        '    test t = new(vif);',
        '    t.run();',
        '  end',
        'endmodule'
      ],
      bugs: {
        9: { id: 'pass', t: '<b>PASS printed immediately.</b> Because of <code>join_none</code>, run() continues at time 0, before a single transaction was sent, and the result is never checked. Wait for the generator to finish and the scoreboard to drain, then print PASS only if <code>e.sb.errors == 0</code>.' },
        14: { id: 'clk', t: '<b>The clock never toggles.</b> <code>clk</code> is declared but has no initial value and no generator, so it stays X. Add <code>initial clk = 0; always #5 clk = ~clk;</code>.' },
        19: { id: 'end', t: '<b>No end of test.</b> Nothing waits for completion or calls <code>$finish</code>, while the forever loops in the driver and monitor keep the simulation alive. After the checks, call <code>$finish</code>.' }
      },
      clean: { 7: 'Configuring the number of transactions from the test is good practice.', 15: 'Connecting the interface to the clock is right.', 16: 'Connecting the DUT through the interface is right.' },
      fix: 'class test;\n  env e;\n  function new(virtual alu_if vif);\n    e = new(vif);\n  endfunction\n  task run();\n    e.gen.count = 100;\n    fork e.run(); join_none\n    wait (e.gen.done && e.sb.checked == e.gen.count);\n    if (e.sb.errors == 0) $display("TEST PASSED");\n    else                  $display("TEST FAILED: %0d errors", e.sb.errors);\n  endtask\nendclass\n\nmodule tb_top;\n  logic clk = 0;\n  always #5 clk = ~clk;\n  alu_if vif (clk);\n  alu    dut (.bus(vif));\n  initial begin\n    test t = new(vif);\n    t.run();\n    $finish;\n  end\nendmodule'
    },
    quiz: [
      { q: 'The FIFO full flag rises one entry early, but no data is lost in this run. What catches the bug?', opts: ['The scoreboard', 'An assertion comparing full with the count', 'Coverage', 'Nothing can'], a: 1, why: 'The assertion checks the flag directly every cycle.' },
      { q: 'The ALU\'s SUB swaps its operands. Which checker catches it?', opts: ['Timing assertion', 'Scoreboard with reference model', 'Code coverage', 'The clocking block'], a: 1, why: 'Only a value comparison against a model sees wrong arithmetic.' },
      { q: 'A UART sends 8\'h81 MSB first. What does an LSB-first monitor receive?', opts: ['8\'h18', '8\'h81', '8\'h7E', '8\'hFF'], a: 1, why: '1000_0001 reversed is still 1000_0001: this value hides the bug.' },
      { q: 'Why add a cover property for overlapping 1011 detections?', opts: ['To speed up simulation', 'To prove the tricky overlap case was actually exercised', 'To replace the scoreboard', 'Because assertions need it'], a: 1, why: 'If it never happened, no checker could have caught an overlap bug.' },
      { q: 'A bus master changes data during a stall. Which check fires first?', opts: ['The scoreboard at the end', 'The $stable assertion on the next edge', 'Coverage', 'None'], a: 1, why: 'The assertion checks the rule the cycle after the stall.' },
      { q: 'All tests pass and coverage is 60%. Ready for sign-off?', opts: ['Yes', 'No: coverage goals are not met', 'Yes, if there are no assertions', 'Only for small designs'], a: 1, why: 'Untested features may still hide bugs.' },
      { q: 'Which reference model suits a RAM best?', opts: ['A queue', 'An associative array indexed by address', 'A semaphore', 'A covergroup'], a: 1, why: 'Stores only written addresses, returns defaults for others.' },
      { q: 'What is the correct order of the verification flow used in this module?', opts: ['Coverage → RTL → Testbench', 'RTL → Testbench → Assertions → Randomization → Coverage → Verdict', 'Assertions → RTL → Verdict', 'Randomization → RTL → Coverage'], a: 1, why: 'Each stage builds on the previous one.' }
    ]
  });
})();
