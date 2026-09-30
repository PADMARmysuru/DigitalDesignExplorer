/* Shared engine for Level 4 Modules 6-8 (needs m3-engine.js for M3.flag / M3.guard) */
var L4 = { inits: [], reg: {}, goals: {} };
function $(i) { return document.getElementById(i); }
L4.ld = function (k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
L4.sv = function (k, l) { localStorage.setItem(k, JSON.stringify(l)); };
L4.fb = function (id, cls, html) { var f = $(id); f.className = "fb " + cls; f.innerHTML = html; };
L4.shuf = function (o) { var x = o.slice(); x.sort(function () { return Math.random() - .5; }); return x; };
L4.ck = function (pre, items, key) {
  $(pre + "_ck").innerHTML = items.map(function (x) { return "<li>" + (x[0] ? "✅" : "⬜") + " " + x[1] + "</li>"; }).join("");
  if (items.every(function (x) { return x[0]; })) M3.flag(key, true);
  $(pre + "_dn").style.display = M3.flag(key) ? "block" : "none";
};
L4.ckCard = function (pre, msg) { return '<section class="card"><h3>Lesson checklist</h3><ul class="check" style="padding-left:0" id="' + pre + '_ck"></ul><div class="done" id="' + pre + '_dn">✅ ' + (msg || "Lesson completed.") + "</div></section>"; };

/* ---------- tabs ---------- */
L4.tabs = function (names) {
  var t = $("tabs"), p = $("panels");
  names.forEach(function (n, i) {
    var b = document.createElement("button"); b.id = "b" + (i + 1); b.textContent = n; b.onclick = function () { L4.show(i + 1); }; t.appendChild(b);
    var d = document.createElement("div"); d.id = "p" + (i + 1); d.style.display = i ? "none" : "block"; p.appendChild(d);
  });
  L4.n = names.length; $("b1").className = "cur";
};
L4.show = function (n) { for (var i = 1; i <= L4.n; i++) { $("p" + i).style.display = i === n ? "block" : "none"; $("b" + i).className = i === n ? "cur" : ""; } window.scrollTo(0, 0); };

/* ---------- goal checklist for interactive lessons ---------- */
L4.goal = function (pre, flag, items) {
  L4.goals[pre] = { flag: flag, items: items, done: L4.ld(flag + "_g") };
  L4.inits.push(function () { L4.goalRef(pre); });
  return L4.ckCard(pre);
};
L4.hit = function (pre, i) { var g = L4.goals[pre]; if (g.done.indexOf(i) < 0) { g.done.push(i); L4.sv(g.flag + "_g", g.done); } L4.goalRef(pre); };
L4.goalRef = function (pre) { var g = L4.goals[pre]; L4.ck(pre, g.items.map(function (t, i) { return [g.done.indexOf(i) > -1, t]; }), g.flag); };

/* ---------- graph ---------- */
L4.chart = function (o) {
  var W = o.w || 600, H = o.h || 340, m = { l: 58, r: 18, t: 22, b: 50 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  var X = function (x) { return m.l + (x - o.x0) / (o.x1 - o.x0) * pw; };
  var Y = function (y) { y = Math.max(o.y0, Math.min(o.y1, y)); return m.t + ph - (y - o.y0) / (o.y1 - o.y0) * ph; };
  var s = '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto;background:#fff;border:1px solid #d9dee7;border-radius:10px" role="img" aria-label="' + (o.aria || "graph") + '"><g font-family="Arial,sans-serif" font-size="12" fill="#333">', i, v, nx = o.nx || 5, ny = o.ny || 5;
  for (i = 0; i <= nx; i++) { v = o.x0 + (o.x1 - o.x0) * i / nx; s += '<line x1="' + X(v) + '" y1="' + m.t + '" x2="' + X(v) + '" y2="' + (m.t + ph) + '" stroke="#e5e9f0"/><text x="' + X(v) + '" y="' + (m.t + ph + 16) + '" text-anchor="middle">' + (+v.toFixed(2)) + "</text>"; }
  for (i = 0; i <= ny; i++) { v = o.y0 + (o.y1 - o.y0) * i / ny; s += '<line x1="' + m.l + '" y1="' + Y(v) + '" x2="' + (m.l + pw) + '" y2="' + Y(v) + '" stroke="#e5e9f0"/><text x="' + (m.l - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (+v.toFixed(2)) + "</text>"; }
  s += '<rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#243b64" stroke-width="1.5"/>';
  s += '<text x="' + (m.l + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="14" font-weight="bold">' + (o.xl || "") + '</text><text transform="translate(16,' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="14" font-weight="bold">' + (o.yl || "") + "</text>";
  (o.series || []).forEach(function (se) {
    if (!se.pts.length) return;
    s += '<polyline fill="none" stroke="' + se.c + '" stroke-width="' + (se.w || 3) + '"' + (se.d ? ' stroke-dasharray="' + se.d + '"' : "") + ' points="' + se.pts.map(function (p) { return X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" ") + '"/>';
  });
  (o.marks || []).forEach(function (mk) { s += '<circle cx="' + X(mk.x) + '" cy="' + Y(mk.y) + '" r="' + (mk.r || 7) + '" fill="' + (mk.c || "#e08a00") + '" stroke="#fff" stroke-width="2"/>' + (mk.l ? '<text x="' + (X(mk.x) + 10) + '" y="' + (Y(mk.y) - 8) + '" font-weight="bold" fill="' + (mk.c || "#e08a00") + '">' + mk.l + "</text>" : ""); });
  var ly = m.t + 30; (o.series || []).forEach(function (se) { if (!se.label) return; s += '<line x1="' + (m.l + pw - 215) + '" y1="' + ly + '" x2="' + (m.l + pw - 190) + '" y2="' + ly + '" stroke="' + se.c + '" stroke-width="3"' + (se.d ? ' stroke-dasharray="5 3"' : "") + '/><text x="' + (m.l + pw - 185) + '" y="' + (ly + 4) + '">' + se.label + "</text>"; ly += 18; });
  return s + "</g></svg>";
};

/* ---------- slider ---------- */
L4.sld = function (id, label, min, max, step, val, unit, fn) {
  return '<div class="ctl"><b>' + label + ' = <span id="' + id + '_v">' + val + "</span> " + unit + '</b><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" oninput="' + fn + '(true)"></div>';
};
L4.eq = function (id, html) { return '<div class="btns"><button class="alt" onclick="$(\'' + id + '\').style.display=\'block\';L4.eqHit(\'' + id + '\')">SHOW THE EQUATION</button></div><div class="eqb" id="' + id + '" style="display:none">' + html + "</div>"; };
L4.eqHit = function () {};

/* ---------- layered animated stepper ---------- */
L4.layered = function (pre, c) {
  L4.reg[pre] = { c: c, p: 0, s: 0 };
  L4.inits.push(function () {
    var st = L4.reg[pre];
    if (c.progs.length > 1) { c.progs.forEach(function (p, i) { var b = document.createElement("button"); b.textContent = p.name; b.onclick = function () { L4.lay(pre, i); }; $(pre + "_ch").appendChild(b); }); }
    L4.lay(pre, 0);
  });
  return '<div class="chips" id="' + pre + '_ch"></div><div class="diagram" id="' + pre + '_svg"></div><div class="info" id="' + pre + '_tx"></div><div class="btns"><button class="alt" onclick="L4.layGo(\'' + pre + '\',-1)">← BACK</button><button onclick="L4.layGo(\'' + pre + '\',1)">NEXT STEP →</button><button class="alt" onclick="L4.layGo(\'' + pre + '\',0)">RESTART</button></div>';
};
L4.lay = function (pre, p) { var st = L4.reg[pre]; st.p = p; st.s = 0; $(pre + "_svg").innerHTML = st.c.progs[p].svg; L4.layApply(pre); if ($(pre + "_ch").children) [].forEach.call($(pre + "_ch").children, function (b, i) { b.className = i === p ? "on" : ""; }); };
L4.layGo = function (pre, d) {
  var st = L4.reg[pre], pr = st.c.progs[st.p], n = pr.texts.length;
  st.s = d === 0 ? 0 : Math.max(0, Math.min(n - 1, st.s + d)); L4.layApply(pre);
  if (st.c.onStep) st.c.onStep(st.p, st.s, st.s === n - 1);
};
L4.layApply = function (pre) {
  var st = L4.reg[pre], pr = st.c.progs[st.p], root = $(pre + "_svg"), els = root.querySelectorAll ? root.querySelectorAll("[data-s]") : [];
  [].forEach.call(els, function (el) {
    var s = +el.getAttribute("data-s"), e = el.getAttribute("data-e"), vis = st.s >= s && (e === null || st.s < +e), dy = el.getAttribute("data-dy");
    el.style.opacity = vis ? 1 : 0; if (dy) el.style.transform = "translateY(" + (vis ? 0 : dy) + "px)";
  });
  $(pre + "_tx").innerHTML = pr.texts[st.s] + "<br><small>Step " + (st.s + 1) + " of " + pr.texts.length + "</small>";
};

/* ---------- practice set (one problem at a time) ---------- */
L4.mcq = function (pre, c) {
  L4.reg[pre] = { c: c, cur: 0, sh: {}, L: L4.ld(c.key + "_l"), ord: [] };
  L4.inits.push(function () {
    c.problems.forEach(function (p, i) { var b = document.createElement("button"); b.onclick = function () { L4.mq(pre, i); }; $(pre + "_ch").appendChild(b); });
    L4.mq(pre, 0); L4.mProg(pre);
  });
  var R = "L4.reg['" + pre + "']";
  return '<section class="card"><h3>' + c.title + '</h3><p class="lead">' + c.intro + '</p><div class="chips" id="' + pre + '_ch"></div><p class="lead"><b id="' + pre + '_cat"></b></p><p class="lead" id="' + pre + '_q"></p><div class="diagram" id="' + pre + '_d"></div><div id="' + pre + '_o"></div>' +
    '<div class="btns"><button onclick="L4.mChk(\'' + pre + '\')">CHECK ANSWER</button><button class="alt" onclick="L4.mHint(\'' + pre + '\')">GET HINT</button><button class="alt" onclick="L4.mq(\'' + pre + "'," + R + '.cur)">TRY AGAIN</button><button class="alt" onclick="L4.mSol(\'' + pre + '\')">SHOW SOLUTION</button></div><div class="fb" id="' + pre + '_f"></div></section>' + L4.ckCard(pre);
};
L4.mq = function (pre, i) {
  var st = L4.reg[pre], p = st.c.problems[i]; st.cur = i; st.ord = L4.shuf(p.o.map(function (x, j) { return j; }));
  $(pre + "_cat").textContent = "Problem " + (i + 1) + (p.cat ? " · " + p.cat : ""); $(pre + "_q").innerHTML = p.q;
  var d = p.d ? p.d() : ""; $(pre + "_d").innerHTML = d; $(pre + "_d").style.display = d ? "block" : "none";
  $(pre + "_o").innerHTML = st.ord.map(function (j) { return '<label class="opt2"><input type="radio" name="' + pre + '_r" value="' + j + '"> ' + p.o[j] + "</label>"; }).join("");
  $(pre + "_f").className = "fb"; $(pre + "_f").innerHTML = ""; L4.mProg(pre);
};
L4.mChk = function (pre) {
  var st = L4.reg[pre], p = st.c.problems[st.cur], r = document.querySelector('input[name="' + pre + '_r"]:checked');
  if (!r) return L4.fb(pre + "_f", "hint", "Select an answer first.");
  if (+r.value === p.a) { L4.fb(pre + "_f", "ok", "✓ <b>Correct.</b> " + p.w); if (!st.sh[st.cur] && st.L.indexOf(st.cur) < 0) { st.L.push(st.cur); L4.sv(st.c.key + "_l", st.L); } L4.mProg(pre); }
  else L4.fb(pre + "_f", "no", "✗ <b>Incorrect.</b> Use GET HINT, or press TRY AGAIN.");
};
L4.mHint = function (pre) { var st = L4.reg[pre]; L4.fb(pre + "_f", "hint", "💡 <b>Hint:</b> " + (st.c.problems[st.cur].h || st.c.hint || "Think about the physical cause, then eliminate the options that do not fit.")); };
L4.mSol = function (pre) { var st = L4.reg[pre], p = st.c.problems[st.cur]; st.sh[st.cur] = true; L4.fb(pre + "_f", "sol", "<b>Solution:</b> " + p.o[p.a] + ". " + p.w + " This problem gives no credit now."); };
L4.mProg = function (pre) {
  var st = L4.reg[pre], c = st.c;
  L4.ck(pre, [[st.L.length >= c.need, "Answer " + c.need + " of the " + c.problems.length + " problems correctly (" + Math.min(st.L.length, c.need) + " / " + c.need + ")"]], c.flag);
  [].forEach.call($(pre + "_ch").children, function (b, i) { b.className = i === st.cur ? "on" : ""; b.textContent = (st.L.indexOf(i) > -1 ? "✅ " : "") + (i + 1); });
};

/* ---------- quiz (all questions, answers after submit) ---------- */
L4.quiz = function (pre, c) {
  L4.reg[pre] = { c: c, best: +(localStorage.getItem(c.key + "_best") || 0), ord: [] };
  L4.inits.push(function () { L4.qBuild(pre); L4.qProg(pre); });
  return '<section class="card"><h3>' + c.title + '</h3><p class="lead">' + c.q.length + " questions. You need <b>" + c.need + '</b> correct. Answers appear only after you submit.</p><div id="' + pre + '_qz"></div><div class="btns"><button onclick="L4.qGrade(\'' + pre + '\')">SUBMIT QUIZ</button><button class="alt" onclick="L4.qBuild(\'' + pre + '\')">TRY AGAIN</button></div><div id="' + pre + '_qr"></div></section>' + L4.ckCard(pre);
};
L4.qBuild = function (pre) {
  var st = L4.reg[pre], Q = st.c.q; st.ord = Q.map(function (q) { return L4.shuf(q.o.map(function (x, j) { return j; })); });
  $(pre + "_qz").innerHTML = Q.map(function (q, i) { var d = q.d ? q.d() : ""; return '<div class="qcard" id="' + pre + "_c" + i + '"><p class="lead"><b>Q' + (i + 1) + ".</b> " + q.q + "</p>" + (d ? '<div class="diagram">' + d + "</div>" : "") + st.ord[i].map(function (j) { return '<label class="opt2"><input type="radio" name="' + pre + "_z" + i + '" value="' + j + '"> ' + q.o[j] + "</label>"; }).join("") + '<div id="' + pre + "_e" + i + '"></div></div>'; }).join("");
  $(pre + "_qr").innerHTML = ""; window.scrollTo(0, 0);
};
L4.qGrade = function (pre) {
  var st = L4.reg[pre], c = st.c, sc = 0, un = 0;
  c.q.forEach(function (q, i) { if (!document.querySelector('input[name="' + pre + "_z" + i + '"]:checked')) un++; });
  if (un) return ($(pre + "_qr").innerHTML = '<div class="fb hint">Please answer all questions. ' + un + " unanswered.</div>");
  c.q.forEach(function (q, i) {
    var r = document.querySelector('input[name="' + pre + "_z" + i + '"]:checked'), ok = +r.value === q.a; if (ok) sc++;
    $(pre + "_c" + i).className = "qcard " + (ok ? "good" : "bad");
    $(pre + "_e" + i).innerHTML = '<div class="fb ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct. " : "✗ Incorrect. Correct answer: <b>" + q.o[q.a] + "</b>. ") + q.w + "</div>";
  });
  if (sc > st.best) { st.best = sc; localStorage.setItem(c.key + "_best", sc); }
  var pass = sc >= c.need;
  $(pre + "_qr").innerHTML = '<div class="fb ' + (pass ? "ok" : "no") + '"><b>Score: ' + sc + " / " + c.q.length + ".</b> " + (pass ? "🎉 Passed!" : "You need " + c.need + ". Review the marked questions and press TRY AGAIN.") + "</div>";
  if (pass) M3.flag(c.flag, true); L4.qProg(pre);
};
L4.qProg = function (pre) { var st = L4.reg[pre], c = st.c; L4.ck(pre, [[M3.flag(c.flag), "Score at least " + c.need + " / " + c.q.length + " (best so far: " + st.best + ")"]], c.flag); };

/* ---------- module progress card ---------- */
L4.prog = function (cfg) {
  var f = function () {
    var tot = 0, dn = 0, h = "";
    cfg.groups.forEach(function (g) { h += '<div class="mgrp"><b>' + g[0] + ":</b> "; g[1].forEach(function (x) { tot++; var d = M3.flag(x[1]); if (d) dn++; h += '<span class="' + (d ? "d" : "") + '">' + (d ? "✅ " : "") + x[0] + "</span>"; }); h += "</div>"; });
    if (dn === tot && !M3.flag(cfg.done)) M3.flag(cfg.done, true);
    var pct = Math.round(dn / tot * 100);
    $("mprog").innerHTML = "<h3 style='margin:0 0 6px'>" + cfg.name + " progress: " + dn + " / " + tot + " sections (" + pct + "%)</h3><div class='mbar'><div style='width:" + pct + "%'></div></div>" + h + (M3.flag(cfg.done) ? "<div class='done' style='display:block'>🎉 " + cfg.name + " completed.</div>" : "");
  };
  M3.onSet = f; L4.inits.push(f);
};
L4.start = function () { L4.inits.forEach(function (f) { f(); }); };
