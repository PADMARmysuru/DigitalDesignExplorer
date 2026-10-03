/* Level 7 · Module 7 – IP-Based VLSI Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var IPS = [
    { k: 'cpu', n: 'CPU core', bus: 'axi', role: 'master', type: 'Soft or hard', g: 150 },
    { k: 'dma', n: 'DMA engine', bus: 'axi', role: 'master', type: 'Soft', g: 40 },
    { k: 'sram', n: 'On-chip SRAM + controller', bus: 'axi', role: 'slave', type: 'Hard (compiled macro)', g: 0, mem: 1 },
    { k: 'ddr', n: 'DDR controller + PHY', bus: 'axi', role: 'slave', type: 'Soft ctrl + hard PHY', g: 90 },
    { k: 'bridge', n: 'AXI→APB bridge', bus: 'axi', role: 'bridge', type: 'Soft', g: 5 },
    { k: 'uart', n: 'UART', bus: 'apb', role: 'slave', type: 'Soft', g: 6 },
    { k: 'gpio', n: 'GPIO', bus: 'apb', role: 'slave', type: 'Soft', g: 3 },
    { k: 'spi', n: 'SPI', bus: 'apb', role: 'slave', type: 'Soft', g: 5 },
    { k: 'timer', n: 'Timer', bus: 'apb', role: 'slave', type: 'Soft', g: 4 },
    { k: 'usb', n: 'USB 2.0 PHY', bus: 'axi', role: 'slave', type: 'Hard (analog)', g: 0 }
  ];

  /* ---------- Widget: SoC builder ---------- */
  function socBuilder(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>SoC builder · assemble a microcontroller from IP blocks</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {};
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Goal</span> <span class="v">Build a minimal microcontroller SoC</span>: a processor, on-chip memory, a UART and GPIO – correctly connected to the high-speed AXI bus or the low-power APB bus.'));
    var pal = L.h('div', 'l7-row'); body.appendChild(pal);
    IPS.forEach(function (ip) {
      var b = L.btn('+ ' + ip.n, '', function () { on[ip.k] = !on[ip.k]; b.classList.toggle('is-on', !!on[ip.k]); b.textContent = (on[ip.k] ? '✓ ' : '+ ') + ip.n; draw(); });
      pal.appendChild(b);
    });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      var axi = IPS.filter(function (i) { return on[i.k] && i.bus === 'axi' && i.role !== 'bridge'; }), apb = IPS.filter(function (i) { return on[i.k] && i.bus === 'apb'; });
      var o = '', W = 680;
      o += R(20, 110, W - 40, 22, 'box-on', 4) + T(W / 2, 126, 'AXI interconnect (high bandwidth)', 't-sig t-b t-sm');
      axi.forEach(function (ip, i) {
        var up = i % 2 === 0, x = 30 + Math.floor(i / 2) * 150 + (up ? 0 : 75), y = up ? 30 : 160;
        o += R(x, y, 130, 46, ip.role === 'master' ? 'box-cu' : 'box', 6) + T(x + 65, y + 20, ip.n.length > 18 ? ip.n.slice(0, 17) + '…' : ip.n, 't-ink t-sm') + T(x + 65, y + 36, ip.role + ' · ' + ip.type.split(' ')[0], 't-dim t-sm');
        o += P('M' + (x + 65) + ' ' + (up ? y + 46 : y) + 'V' + (up ? 110 : 132), 'w-on');
      });
      if (on.bridge) {
        o += R(W - 170, 160, 130, 40, 'box-vio', 6) + T(W - 105, 184, 'AXI→APB bridge', 't-vio t-sm');
        o += P('M' + (W - 105) + ' 132V160', 'w-on') + P('M' + (W - 105) + ' 200V230', 'w-vio');
      }
      o += R(20, 230, W - 40, 20, apb.length ? 'box-vio' : 'box', 4) + T(W / 2, 245, 'APB peripheral bus (simple, low power)', 't-vio t-sm');
      apb.forEach(function (ip, i) {
        var x = 30 + i * 125;
        o += R(x, 270, 110, 36, 'box', 6) + T(x + 55, 292, ip.n, 't-ink t-sm');
        o += P('M' + (x + 55) + ' 250V270', on.bridge ? 'w-vio' : 'w-bad');
      });
      pic.innerHTML = S(W, 320, o, 'SoC block diagram');
      var issues = [];
      if (!on.cpu) issues.push('No processor: something must act as a bus master and run the software.');
      if (!on.sram && !on.ddr) issues.push('No memory for code and data.');
      if (apb.length && !on.bridge) issues.push('APB peripherals are not reachable – the APB bus needs an AXI→APB bridge (protocol conversion).');
      if (!on.uart) issues.push('The goal needs a UART.');
      if (!on.gpio) issues.push('The goal needs GPIO.');
      var gates = IPS.reduce(function (a, i) { return a + (on[i.k] ? i.g : 0); }, 0);
      if (!issues.length) {
        L.fb(fb, 'ok', '✓ Valid microcontroller SoC. Soft logic ≈ ' + gates + 'k gates, plus hard macros. Every block was <b>reused</b> IP: the integration work is connecting interfaces, clocks, resets and the address map – then verifying the integrated system.' + (on.usb || on.ddr ? ' Hard PHYs (USB, DDR) bring analog content you could not easily design yourself – a key reason to buy IP.' : ''));
        api.done();
      } else L.fb(fb, 'bad', issues.join('<br>'));
    }
    draw();
  }

  /* ---------- Widget: valid/ready handshake ---------- */
  function handshake(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Interface lab · VALID / READY handshake</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var v = 1, r = 0, hist = [], data = 0, xfers = 0, stalls = 0;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bv = L.btn('VALID = 1 (source has data)', 'is-on', function () { v ^= 1; paint(); });
    var br = L.btn('READY = 0 (sink busy)', '', function () { r ^= 1; paint(); });
    var bc = L.btn('⏱ Clock edge', 'pri', tick);
    row.appendChild(bv); row.appendChild(br); row.appendChild(bc);
    row.appendChild(L.btn('Reset', 'ghost', function () { hist = []; data = 0; xfers = 0; stalls = 0; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function paint() {
      bv.textContent = 'VALID = ' + v + (v ? ' (source has data)' : ' (no data)'); bv.classList.toggle('is-on', !!v);
      br.textContent = 'READY = ' + r + (r ? ' (sink can accept)' : ' (sink busy)'); br.classList.toggle('is-on', !!r);
    }
    function tick() {
      var x = v && r; hist.push({ v: v, r: r, x: x, d: data });
      if (x) { xfers++; data++; } else if (v) stalls++;
      if (hist.length > 12) hist.shift();
      L.fb(fb, x ? 'ok' : (v ? 'bad' : 'info'), x ? '✓ Transfer of D' + (data - 1) + ': VALID and READY were both 1 at the clock edge.' : v ? '⏸ Stall: the source holds D' + data + ' stable (it must not change data while VALID is high) until READY is 1.' : 'Idle: no data offered.');
      if (xfers >= 3 && stalls >= 1) api.done();
      draw();
    }
    function draw() {
      var o = '', x0 = 80, dx = 46;
      ['CLK', 'VALID', 'READY', 'DATA'].forEach(function (s, i) { o += T(10, 32 + i * 40, s, 't-ink t-b t-sm', 'start'); });
      hist.forEach(function (h, i) {
        var x = x0 + i * dx;
        o += P('M' + x + ' 38V22H' + (x + dx / 2) + 'V38H' + (x + dx), 'w-thin');
        o += P('M' + x + ' ' + (h.v ? 62 : 78) + 'H' + (x + dx), h.v ? 'w-cu' : 'w');
        o += P('M' + x + ' ' + (h.r ? 102 : 118) + 'H' + (x + dx), h.r ? 'w-vio' : 'w');
        o += R(x + 2, 136, dx - 4, 22, h.x ? 'box-ok' : h.v ? 'box-cu' : 'box', 3) + T(x + dx / 2, 151, h.v ? 'D' + h.d : '–', 't-ink t-sm');
        if (h.x) o += '<path d="M' + (x + dx / 2) + ' 170l-5 8h10z" class="dot-on"/>';
      });
      o += T(x0, 196, 'Transfers: ' + xfers + '   Stalls: ' + stalls + '   (▲ = data accepted)', 't-sig t-sm', 'start');
      pic.innerHTML = S(x0 + 12 * dx + 10, 206, o, 'Handshake waveform');
    }
    paint(); draw();
    L.fb(fb, 'info', 'Set VALID and READY, then press Clock edge. Make at least three transfers and see at least one stall.');
  }

  L.module({
    n: 7,
    lead: 'No modern SoC is designed from scratch. Learn how reusable Intellectual Property (IP) cores – soft, firm and hard – are selected, configured, connected through standard interfaces and verified as a system.',
    tags: ['soft IP', 'firm IP', 'hard IP', 'design reuse', 'IP integration', 'bus interfaces', 'SoC', 'IP verification'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-ip', type: 'concept', title: 'Intellectual Property cores and design reuse', nav: 'IP cores',
        html: '<p>An <b>IP core</b> is a pre-designed, pre-verified functional block – a processor, memory, interface controller, PHY, accelerator – that can be licensed or reused across many chips. A modern SoC may contain hundreds of IP blocks, most of them reused; the design team concentrates its effort on the few blocks that differentiate the product.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Why reuse?</h4><ul><li>Shorter design time and time-to-market</li><li>Lower risk: silicon-proven blocks</li><li>Access to expertise you do not have (e.g. high-speed analog PHYs)</li><li>Engineers focus on differentiation</li></ul></div>' +
          '<div class="l7-box cu"><h4>What makes IP reusable?</h4><ul><li>Standard interfaces (e.g. AMBA AXI/AHB/APB)</li><li>Parameterisation (widths, depths, features)</li><li>Clean clocking and reset design</li><li>Complete deliverables: documentation, testbench, constraints, integration guide</li></ul></div></div>'
      },
      {
        id: 'c-types', type: 'concept', title: 'Soft, firm and hard IP', nav: 'Soft / firm / hard',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Type</th><th>Delivered as</th><th>Flexibility</th><th>Predictability</th><th>Portability</th><th>Examples</th></tr>' +
          '<tr><td>Soft</td><td>synthesizable RTL (Verilog/VHDL)</td><td>highest: configurable, retargetable</td><td>lowest: timing/area depend on your synthesis and layout</td><td>any process</td><td>UART, DMA, many CPU cores</td></tr>' +
          '<tr><td>Firm</td><td>gate-level netlist, sometimes with placement guidance</td><td>medium</td><td>medium</td><td>tied to a library</td><td>pre-optimised datapaths, encrypted cores</td></tr>' +
          '<tr><td>Hard</td><td>layout (GDS) + abstract and timing models</td><td>lowest: fixed function and shape</td><td>highest: silicon-proven timing and power</td><td>one specific process</td><td>SRAM macros, PLLs, SerDes, USB/DDR PHYs</td></tr></table></div>' +
          '<p>Analog and mixed-signal blocks are almost always hard IP. Digital IP is usually soft, so the integrator can tune it – but must then close timing on it.</p>'
      },
      {
        id: 'rv-ip', type: 'reveal', title: 'Click to reveal: choosing IP', nav: 'Reveal',
        items: [
          { q: 'Why is a PLL nearly always hard IP?', a: 'It is an analog circuit whose performance depends on exact transistor sizes and layout; it cannot be synthesized from RTL.' },
          { q: 'What risk comes with soft IP?', a: 'Its final timing, area and power depend on your synthesis, library and layout. A core that met 1 GHz for the vendor may not in your flow.' },
          { q: 'What deliverables should an IP package contain?', a: 'RTL or netlist/layout, documentation and integration guide, timing constraints, verification environment or VIP, models for simulation, and for hard IP the abstract/timing views and DRC/LVS results.' },
          { q: 'What is a memory compiler?', a: 'A tool from the foundry or IP vendor that generates hard SRAM/ROM macros of the size and options you request, with their layout and models.' },
          { q: 'Why might a company encrypt soft IP?', a: 'To protect its design while still letting customers simulate and synthesize it.' },
          { q: 'What does “silicon-proven” mean?', a: 'The IP has been manufactured in a real chip in that process and measured to work, which greatly reduces integration risk.' }
        ]
      },
      {
        id: 'dd-ip', type: 'drag', title: 'Drag & drop: soft, firm or hard IP?', nav: 'Drag & drop',
        bins: ['Soft IP', 'Firm IP', 'Hard IP'],
        items: [['Parameterisable Verilog RTL', 0], ['Retargetable to any process', 0], ['Timing depends on your synthesis', 0], ['Gate-level netlist for one library', 1], ['Pre-optimised but not laid out', 1], ['GDS layout macro', 2], ['PLL or SerDes PHY', 2], ['Compiled SRAM macro', 2], ['Fixed shape and pin positions', 2]]
      },
      {
        id: 'c-int', type: 'concept', title: 'IP integration and interface considerations', nav: 'Integration',
        html: '<p>Integrating IP is mostly about its <b>boundaries</b>:</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Bus protocol</h4><p>On-chip buses such as AMBA AXI (high-bandwidth, multiple outstanding transfers), AHB, and APB (simple, low-power peripherals) define signals and timing. Mismatched protocols need <b>bridges</b>; mismatched widths need converters.</p></div>' +
          '<div class="l7-box cu"><h4>Handshakes</h4><p>Most streaming and bus interfaces use a VALID/READY handshake: data moves only on a clock edge where both are high. Flow control lets each side stall the other safely.</p></div>' +
          '<div class="l7-box vio"><h4>Clocks and resets</h4><p>IP blocks often run on different clocks. Signals crossing <b>clock domains</b> need synchronizers or asynchronous FIFOs; resets must be asserted and released correctly in each domain.</p></div>' +
          '<div class="l7-box"><h4>System-level items</h4><p>Address map and register interfaces, interrupts, data width and endianness, power domains and isolation, test access, and physical aspects such as macro placement and pin locations.</p></div></div>'
      },
      { id: 'w-hs', type: 'widget', title: 'Interface lab: the VALID/READY handshake', nav: 'Handshake lab', intro: 'Drive VALID and READY and clock the interface. Achieve three transfers and observe a stall.', build: handshake },
      {
        id: 'c-soc', type: 'concept', title: 'SoC building blocks', nav: 'SoC blocks',
        html: '<div class="l7-grid3"><div class="l7-box cu"><h4>Compute</h4><p>CPU clusters, DSPs, GPUs, AI/ML accelerators.</p></div><div class="l7-box sig"><h4>Memory</h4><p>SRAM macros, caches, ROM, DDR/LPDDR controllers and PHYs.</p></div><div class="l7-box vio"><h4>Interconnect</h4><p>AXI crossbars, network-on-chip (NoC), bridges, DMA.</p></div>' +
          '<div class="l7-box"><h4>Peripherals &amp; I/O</h4><p>UART, SPI, I²C, GPIO, timers, USB, PCIe, Ethernet, MIPI.</p></div><div class="l7-box"><h4>Infrastructure</h4><p>PLLs, clock and reset controllers, power management, security, debug.</p></div><div class="l7-box"><h4>Analog / mixed signal</h4><p>ADC, DAC, sensors, voltage regulators.</p></div></div>'
      },
      { id: 'w-soc', type: 'widget', title: 'SoC builder', nav: 'SoC builder', intro: 'Add and remove IP blocks until the SoC is valid. Try leaving out the bridge to see what goes wrong.', build: socBuilder },
      {
        id: 'st-flow', type: 'steps', title: 'Animation: the IP integration flow', nav: 'Integration flow',
        frames: [1, 2, 3, 4, 5, 6].map(function (k) {
          var names = ['Select', 'Evaluate', 'Configure', 'Integrate', 'Verify', 'Sign-off'];
          var txt = ['<b>Select</b>: compare candidate IP on function, performance, area, power, process support, licence cost and vendor support.', '<b>Evaluate</b>: check deliverables and maturity – silicon-proven? documentation, test results, known errata.', '<b>Configure</b>: set parameters (bus widths, FIFO depths, optional features) and generate the instance.', '<b>Integrate</b>: connect interfaces through bridges, map addresses and interrupts, wire clocks and resets, add synchronizers for clock-domain crossings.', '<b>Verify</b>: the vendor verified the IP alone; you verify the <i>integration</i> – connectivity, register access, system scenarios, using vendor VIP where available.', '<b>Sign-off</b>: timing, power and physical checks of the complete SoC, including hard-macro placement and pin access.'][k - 1];
          var o = '';
          names.forEach(function (n, i) { var x = 20 + i * 95; o += R(x, 50, 84, 44, i < k - 1 ? 'box-ok' : i === k - 1 ? 'box-on' : 'box', 8) + T(x + 42, 77, n, i === k - 1 ? 't-sig t-b t-sm' : 't-ink t-sm'); if (i < 5) o += P('M' + (x + 84) + ' 72H' + (x + 95), 'w'); });
          return { t: txt, svg: S(600, 130, o, 'IP integration flow') };
        })
      },
      {
        id: 'c-ver', type: 'concept', title: 'IP verification overview', nav: 'IP verification',
        html: '<p>Verification responsibility is split. The <b>IP provider</b> verifies the block thoroughly in isolation, against its specification, and ideally in silicon. The <b>integrator</b> verifies that the IP is correctly configured and connected and works in system scenarios: every register reachable at the right address, interrupts and DMA working, clock-domain crossings safe, and software drivers functioning.</p>' +
          '<p>Vendors often supply <b>verification IP (VIP)</b> – models and checkers for standard protocols – and the integrator reuses the same Level 6 SystemVerilog techniques at SoC level. Advanced methodologies are covered in Level 11.</p>'
      },
      { part: 'Practice' },
      {
        id: 'calc7', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'An SoC contains 40 IP blocks; 34 are reused from earlier projects or vendors. What is the reuse ratio (in %)?', a: 85, u: '%', h: 'reused ÷ total × 100.', s: '34/40 = <b>85 %</b>.' },
          { q: 'A 64-bit AXI data channel at 500 MHz transfers one beat per cycle. What is its peak bandwidth in GB/s?', a: 4, u: 'GB/s', h: '8 bytes per cycle.', s: '8 B × 500×10⁶ /s = <b>4 GB/s</b>.' },
          { q: 'Over six clock edges VALID = 1 1 1 0 1 1 and READY = 0 1 1 1 0 1. How many transfers occur?', a: 3, tol: 0, abs: 0.01, h: 'A transfer needs VALID = READY = 1 on the same edge.', s: 'Edges 2, 3 and 6 → <b>3</b> transfers.' },
          { q: 'A soft IP synthesizes to 40 000 NAND2-equivalent gates. A NAND2 occupies 0.5 µm² and the block is placed at 70 % utilisation. Estimate its area in mm².', a: 0.0286, u: 'mm²', h: 'Cell area ÷ utilisation; 1 mm² = 10⁶ µm².', s: '40 000 × 0.5 / 0.7 = 28 571 µm² ≈ <b>0.0286 mm²</b>.' },
          { q: 'Eight independent single-bit control signals cross from one clock domain to another, each through a two-flip-flop synchronizer. How many flip-flops are added?', a: 16, tol: 0, abs: 0.01, h: 'Two per signal.', s: '8 × 2 = <b>16</b>. (Multi-bit buses need FIFOs or handshakes instead of independent synchronizers.)' }
        ]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which IP type is delivered as synthesizable RTL?', o: ['Hard IP', 'Firm IP', 'Soft IP', 'Analog IP'], a: 2, w: 'Soft IP = RTL.' },
          { q: 'The most predictable timing and power come from…', o: ['soft IP', 'firm IP', 'hard IP', 'in-house RTL'], a: 2, w: 'Hard IP is laid out and silicon-characterised.' },
          { q: 'Simple low-speed peripherals are typically connected via…', o: ['AXI crossbar directly', 'APB through a bridge', 'TSVs', 'a DDR PHY'], a: 1, w: 'APB is simple and low power.' },
          { q: 'In a VALID/READY interface, while VALID is high and READY is low the source must…', o: ['change the data', 'hold the data stable', 'drop VALID immediately', 'raise READY'], a: 1, w: 'Data stays stable until accepted.' }
        ]
      },
      {
        id: 'short7', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Compare soft and hard IP in terms of flexibility, predictability and portability.', k: ['rtl|synthesiz', 'layout|gds', 'flexib|configur', 'predict|timing', 'portab|process'], m: 'Soft IP is synthesizable RTL: highly flexible and configurable and portable to any process, but its timing, area and power are not guaranteed until you synthesize and lay it out. Hard IP is a finished layout for one process: inflexible and not portable, but its timing and power are predictable and often silicon-proven. Analog blocks are hard IP.' },
          { q: 'What must an integrator check when connecting a third-party IP block into an SoC?', k: ['interface|protocol|bus', 'clock', 'reset', 'address|register', 'verif'], m: 'The integrator must check that the bus/interface protocols and widths match (adding bridges or converters), that clocks are correct and clock-domain crossings are synchronized, that resets are applied and released properly, that the address map, registers and interrupts are connected, and then verify the integrated system with tests and VIP.' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your start-up must tape out a USB-connected sensor hub in six months with a team of five digital engineers.', q: 'How should you obtain the USB PHY?', o: [{ t: 'License a silicon-proven hard PHY for your process', ok: true, w: 'Analog PHYs need specialist skills and silicon iterations – buy it.' }, { t: 'Write the PHY in Verilog and synthesize it', ok: false, w: 'A PHY contains analog transceivers that cannot be synthesized.' }, { t: 'Leave USB out and add it in a later chip', ok: false, w: 'That drops a product requirement.' }] },
          { s: 'After integration, a soft DMA IP works in simulation, but the SoC fails timing on paths inside it.', q: 'What is the most reasonable explanation?', o: [{ t: 'Soft IP timing depends on your synthesis, library and placement – it must be constrained and closed like your own RTL', ok: true, w: 'Right: soft IP gives no timing guarantee in your flow.' }, { t: 'The IP vendor\'s RTL is functionally wrong', ok: false, w: 'Simulation passes; this is a timing issue.' }, { t: 'Hard IP is always slower', ok: false, w: 'The DMA is soft IP.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'An IP core is…', o: ['a manufacturing defect', 'a reusable pre-designed functional block', 'a type of transistor', 'a test pattern'], a: 1, w: 'Reusable design blocks.' },
      { q: 'Soft IP is delivered as…', o: ['GDS layout', 'synthesizable RTL', 'a packaged chip', 'a SPICE model only'], a: 1, w: 'RTL source.' },
      { q: 'Hard IP is…', o: ['portable to any process', 'a fixed layout for a specific process', 'unverified', 'always digital'], a: 1, w: 'Fixed layout, one process.' },
      { q: 'Firm IP is typically a…', o: ['gate-level netlist', 'behavioural model', 'board design', 'software driver'], a: 0, w: 'Between soft and hard.' },
      { q: 'A PLL is usually supplied as…', o: ['soft IP', 'hard IP', 'firm IP', 'software'], a: 1, w: 'Analog circuits are hard IP.' },
      { q: 'To connect an APB peripheral to an AXI system you need…', o: ['a TSV', 'an AXI-to-APB bridge', 'a sense amplifier', 'a PHY'], a: 1, w: 'Protocol conversion.' },
      { q: 'In a VALID/READY handshake, a transfer occurs when…', o: ['VALID rises', 'READY rises', 'VALID and READY are both high at a clock edge', 'either is high'], a: 2, w: 'Both high on the same edge.' },
      { q: 'Signals crossing between unrelated clock domains need…', o: ['wider wires', 'synchronizers or asynchronous FIFOs', 'a larger PLL', 'nothing'], a: 1, w: 'To avoid metastability problems.' },
      { q: 'Who is responsible for integration verification of an IP in an SoC?', o: ['only the IP vendor', 'the SoC integrator', 'the foundry', 'nobody'], a: 1, w: 'The vendor verifies the IP; the integrator verifies its use.' },
      { q: 'A main benefit of design reuse is…', o: ['larger die size', 'shorter time-to-market and lower risk', 'more design effort', 'fewer interfaces'], a: 1, w: 'Proven blocks shorten and de-risk projects.' }
    ]
  });
})();
