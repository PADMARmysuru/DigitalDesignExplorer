/* Module 3 shared engine – Digital Design Explorer, Level 4
   Provides: access guard, progress flags, large MOSFET symbols (mos),
   conduction-path helper (through). Later sections add the circuit checker here. */
var M3 = (function () {

  var COL = { on: "#1b8a3a", off: "#5b6b8a", neutral: "#243b64", pmos: "#b3261e" };

  function guard() {
    /* Level access is now checked centrally in access-control.js */
  }

  function flag(key, value) {
    if (value === undefined) return localStorage.getItem(key) === "true";
    localStorage.setItem(key, value ? "true" : "false");
    if (typeof M3 !== "undefined" && M3.onSet) M3.onSet();
  }

  function pins(x, y, scale, flip) {
    var s = scale || 1, k = flip ? -1 : 1;
    return { top: [x + 40 * s * k, y - 60 * s], bottom: [x + 40 * s * k, y + 60 * s], gate: [x - 70 * s * k, y] };
  }

  /* Large enhancement-mode MOSFET symbol (broken channel, body arrow).
     type: "n" | "p".  opt: state ("on"|"off"|undefined), pins, label, badge, scale, flip.
     flip = mirror left/right (gate on the right) so two inputs can enter from both sides.
     PMOS: source on top, bubble on gate.  NMOS: source at the bottom. */
  function mos(type, x, y, opt) {
    opt = opt || {};
    var p = type === "p", st = opt.state, s = opt.scale || 1, k = opt.flip ? -1 : 1;
    var col = st === "on" ? COL.on : (st === "off" ? COL.off : COL.neutral);
    var w = st === "on" ? 4.5 : 3.5, srcY = p ? -24 : 24;

    var g = '<g transform="translate(' + x + ',' + y + ') scale(' + (s * k) + ',' + s + ')">';
    g += '<g fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round">';
    g += p ? '<line x1="-70" y1="0" x2="-21" y2="0"/><circle cx="-15" cy="0" r="6" fill="#fff"/>'
           : '<line x1="-70" y1="0" x2="-10" y2="0"/>';
    g += '<line x1="-10" y1="-32" x2="-10" y2="32"/>';
    g += '<line x1="4" y1="-32" x2="4" y2="-16"/><line x1="4" y1="-8" x2="4" y2="8"/><line x1="4" y1="16" x2="4" y2="32"/>';
    g += '<polyline points="4,-24 40,-24 40,-60"/><polyline points="4,24 40,24 40,60"/>';
    g += '<polyline points="4,0 26,0 26,' + srcY + '"/></g>';
    g += p ? '<polygon points="20,0 12,-5 12,5" fill="' + col + '"/>'
           : '<polygon points="10,0 18,-5 18,5" fill="' + col + '"/>';
    g += '</g>';

    /* text is drawn outside the mirrored group so it is never reversed */
    var anc = k === 1 ? "start" : "end", t = "";
    if (opt.pins) {
      t += '<g font-family="Arial,sans-serif" font-size="' + 15 * s + '" font-weight="bold" fill="#c62828" text-anchor="' + anc + '">' +
           '<text x="' + (x - 68 * s * k) + '" y="' + (y - 8 * s) + '">G</text>' +
           '<text x="' + (x + 48 * s * k) + '" y="' + (y - 50 * s) + '">' + (p ? "S" : "D") + '</text>' +
           '<text x="' + (x + 48 * s * k) + '" y="' + (y + 58 * s) + '">' + (p ? "D" : "S") + '</text></g>';
    }
    if (opt.label) {
      t += '<text x="' + (x + 56 * s * k) + '" y="' + (y + 4 * s) + '" text-anchor="' + anc +
           '" font-family="Arial,sans-serif" font-size="' + 16 * s + '" font-weight="bold" fill="' + (p ? COL.pmos : COL.neutral) + '">' + opt.label + '</text>';
    }
    if (opt.badge && st) {
      t += '<text x="' + (x + 56 * s * k) + '" y="' + (y + 26 * s) + '" text-anchor="' + anc +
           '" font-family="Arial,sans-serif" font-size="' + 15 * s + '" font-weight="bold" fill="' + col + '">' + (st === "on" ? "ON" : "OFF") + '</text>';
    }
    return g + t;
  }

  /* Points of the conduction path through a transistor: top pin -> channel -> bottom pin */
  function through(x, y, scale, flip) {
    var s = scale || 1, k = flip ? -1 : 1, r = function (a, b) { return (x + a * s * k) + "," + (y + b * s); };
    return [r(40, -60), r(40, -24), r(4, -24), r(4, 24), r(40, 24), r(40, 60)].join(" ");
  }

  function logout() {
    localStorage.removeItem("studentLoggedIn");
    window.location.href = "login.html";
  }

  return { COL: COL, guard: guard, flag: flag, pins: pins, mos: mos, through: through, logout: logout };
})();
