/* Digital Design Explorer – Final Capstone: shared stage and rubric definitions
   Used by capstone.html (students), capstone-certificate.html and the Faculty Dashboard.
   Field types: text, area (min = minimum characters), select (o = options), check (o = items, min = minimum ticked).
   Stages are saved through dde_capstone_save as level 15, module = stage number. */
(function () {
  'use strict';
  var TYPES = ['Small RISC Processor', '8/16-bit Processor', 'ALU', 'UART', 'FIFO', 'Register File', 'DSP Block', 'Simple SoC Subsystem'];
  window.DDE_CAPSTONE = {
    TYPES: TYPES,
    STAGES: [
      { n: 1, t: 'Project Selection', icon: '🎯', lv: 'Start', intro: 'Choose your project. For advanced students, a Small RISC Processor or SoC Subsystem integrates Levels 7–14 most naturally.',
        f: [{ k: 'type', l: 'Project type', type: 'select', o: TYPES, req: true }, { k: 'title', l: 'Project title', type: 'text', min: 5, req: true },
            { k: 'topic', l: 'Selected topic / focus', type: 'text', min: 3, req: true }, { k: 'objective', l: 'Project objective', type: 'area', min: 30, req: true },
            { k: 'team', l: 'Individual or team', type: 'select', o: ['Individual', 'Team'], req: true }, { k: 'members', l: 'Team members (name – USN), if a team', type: 'text' },
            { k: 'tools', l: 'Preferred technology / tools (if any)', type: 'text' }] },
      { n: 2, t: 'Specification', icon: '📋', lv: 'Spec', intro: 'Write down exactly what the design must do – the reference for every later stage.',
        f: [{ k: 'problem', l: 'Problem statement', type: 'area', min: 40, req: true }, { k: 'requirements', l: 'Requirements', type: 'area', min: 40, req: true },
            { k: 'inputs', l: 'Inputs', type: 'area', min: 10, req: true }, { k: 'outputs', l: 'Outputs', type: 'area', min: 10, req: true },
            { k: 'functional', l: 'Functional requirements', type: 'area', min: 40, req: true }, { k: 'performance', l: 'Performance requirements (frequency, latency, throughput, power, area)', type: 'area', min: 20, req: true }] },
      { n: 3, t: 'Architecture', icon: '🏗️', lv: 'Architecture', intro: 'Split the design into blocks and decide how they connect.',
        f: [{ k: 'blocks', l: 'Block diagram (describe each block and the connections)', type: 'area', min: 40, req: true }, { k: 'datapath', l: 'Datapath', type: 'area', min: 30, req: true },
            { k: 'control', l: 'Control (FSM / decoder)', type: 'area', min: 30, req: true }, { k: 'interfaces', l: 'Interfaces', type: 'area', min: 20, req: true },
            { k: 'memory', l: 'Memory requirements', type: 'area', min: 10, req: true }, { k: 'decisions', l: 'Key architecture decisions and why', type: 'area', min: 40, req: true }] },
      { n: 4, t: 'VLSI Design', icon: '🔬', lv: 'Level 7', intro: 'Apply Digital VLSI Design: which circuit-level choices matter for your design?',
        f: [{ k: 'aspects', l: 'Aspects you considered (choose at least 3)', type: 'check', min: 3, req: true, o: ['CMOS / logic style', 'Arithmetic / datapath circuits', 'Interconnect', 'Memory', 'Standard cells', 'Reliability'] },
            { k: 'notes', l: 'Your VLSI design considerations', type: 'area', min: 60, req: true }] },
      { n: 5, t: 'Timing & Power', icon: '⏱️', lv: 'Level 8', intro: 'Apply VLSI Timing & Power to your architecture.',
        f: [{ k: 'critical', l: 'Critical path (which path and why)', type: 'area', min: 30, req: true }, { k: 'clocking', l: 'Clocking, setup and hold considerations', type: 'area', min: 30, req: true },
            { k: 'delay', l: 'Delay estimate / target frequency', type: 'area', min: 20, req: true }, { k: 'power', l: 'Power estimate and main contributors', type: 'area', min: 20, req: true },
            { k: 'optimisation', l: 'Timing / power optimisation ideas', type: 'area', min: 30, req: true }] },
      { n: 6, t: 'RTL & Synthesis', icon: '💻', lv: 'Level 9', intro: 'Describe your synthesizable RTL and the synthesis results.',
        f: [{ k: 'rtl', l: 'RTL design summary (modules and their roles)', type: 'area', min: 40, req: true }, { k: 'fsm', l: 'FSM / datapath implementation', type: 'area', min: 30, req: true },
            { k: 'synthesis', l: 'Synthesis results: area, timing, warnings (real or estimated)', type: 'area', min: 30, req: true }, { k: 'code', l: 'Link to your code (e.g. GitHub), if any', type: 'text' }] },
      { n: 7, t: 'Physical Design', icon: '🗺️', lv: 'Level 10', intro: 'Plan the physical implementation. Simulated/educational work is fine if real EDA tools are not available.',
        f: [{ k: 'mode', l: 'How was physical design done?', type: 'select', o: ['Educational / simulated plan', 'Open-source tools (e.g. OpenLane)', 'Commercial EDA tools'], req: true },
            { k: 'steps', l: 'Steps covered (choose at least 4)', type: 'check', min: 4, req: true, o: ['Floorplan', 'Power planning', 'Placement', 'Clock tree synthesis', 'Routing', 'Physical verification', 'GDSII / tape-out concepts'] },
            { k: 'notes', l: 'Physical design decisions and results', type: 'area', min: 60, req: true }] },
      { n: 8, t: 'Design Verification', icon: '✅', lv: 'Level 11', intro: 'Show how you proved the design correct.',
        f: [{ k: 'plan', l: 'Verification plan', type: 'area', min: 40, req: true }, { k: 'testbench', l: 'Testbench architecture', type: 'area', min: 30, req: true },
            { k: 'assertions', l: 'Assertions', type: 'area', min: 20, req: true }, { k: 'fcov', l: 'Functional coverage', type: 'area', min: 20, req: true },
            { k: 'ccov', l: 'Code coverage', type: 'area', min: 15, req: true }, { k: 'closure', l: 'Regression and verification closure', type: 'area', min: 30, req: true }] },
      { n: 9, t: 'DFT & Silicon Test', icon: '🧪', lv: 'Level 12', intro: 'Make the design testable after manufacturing.',
        f: [{ k: 'methods', l: 'Test methods considered (choose at least 3)', type: 'check', min: 3, req: true, o: ['Scan', 'ATPG', 'Fault coverage', 'MBIST', 'LBIST', 'Test access (JTAG / IJTAG)', 'Silicon test / yield analysis'] },
            { k: 'notes', l: 'Your DFT and test strategy', type: 'area', min: 60, req: true }] },
      { n: 10, t: 'Processor / Architecture', icon: '🖥️', lv: 'Level 13', intro: 'Apply processor architecture where relevant. For non-processor projects, explain which concepts apply and why.',
        f: [{ k: 'relevance', l: 'Relevance to your project', type: 'select', o: ['Core of the project (processor)', 'Partly relevant', 'Not directly relevant – explained below'], req: true },
            { k: 'concepts', l: 'Concepts applied or discussed', type: 'check', min: 1, req: true, o: ['Pipeline', 'Branch prediction', 'Cache', 'Superscalar concepts', 'Out-of-order concepts', 'Processor performance (CPI, IPC)'] },
            { k: 'explanation', l: 'Explanation', type: 'area', min: 60, req: true }] },
      { n: 11, t: 'AI/ML Enhancement', icon: '🤖', lv: 'Level 14', intro: 'Choose an AI/ML enhancement that fits your project – or explain why none is appropriate. Implementing ML is not required.',
        f: [{ k: 'choice', l: 'AI/ML enhancement', type: 'select', o: ['Timing prediction', 'Congestion prediction', 'Fault classification', 'Verification prioritisation', 'Yield prediction', 'Branch prediction', 'Design-space exploration', 'Not applicable – justified below'], req: true },
            { k: 'description', l: 'Description (what, how, expected benefit – or justification)', type: 'area', min: 40, req: true }] },
      { n: 12, t: 'Final Report & Submission', icon: '📑', lv: 'Report', intro: 'Summarise results and submit the whole project for faculty evaluation. All earlier stages must be complete.',
        f: [{ k: 'results', l: 'Results', type: 'area', min: 40, req: true }, { k: 'limitations', l: 'Limitations', type: 'area', min: 30, req: true },
            { k: 'future', l: 'Future work', type: 'area', min: 30, req: true }, { k: 'conclusion', l: 'Conclusion', type: 'area', min: 40, req: true }] }
    ],
    RUBRIC: [
      ['problem', 'Problem Definition', 5], ['architecture', 'Architecture', 10], ['vlsi', 'VLSI Design', 10], ['rtl', 'RTL / Synthesis', 10],
      ['timing', 'Timing & Power', 10], ['physical', 'Physical Design', 10], ['verification', 'Verification', 10], ['dft', 'DFT / Testing', 10],
      ['performance', 'Architecture / Performance', 10], ['aiml', 'AI/ML / Application', 5], ['documentation', 'Documentation & Presentation', 10]
    ],
    /* Is a stage's data complete enough to mark it done? → [] or list of problems */
    check: function (stage, d) {
      var probs = [];
      stage.f.forEach(function (f) {
        if (!f.req) return;
        var v = d[f.k];
        if (f.type === 'check') { if (!Array.isArray(v) || v.length < (f.min || 1)) probs.push(f.l + ': choose at least ' + (f.min || 1)); }
        else if (f.type === 'select') { if (!v) probs.push(f.l + ': choose an option'); }
        else if (String(v || '').trim().length < (f.min || 1)) probs.push(f.l + ': at least ' + (f.min || 1) + ' characters');
      });
      if (stage.n === 1 && d.team === 'Team' && String(d.members || '').trim().length < 5) probs.push('Team members: list your team');
      return probs;
    }
  };
})();
