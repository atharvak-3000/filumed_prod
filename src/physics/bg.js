/* FILUMED — animated canvas backgrounds: dust / dots / leak / none */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  var ctx = canvas.getContext("2d");

  var vantaBg = document.createElement("div");
  vantaBg.id = "vanta-bg";
  vantaBg.className = "bg-canvas";
  vantaBg.style.display = "none";
  vantaBg.style.pointerEvents = "none";
  
  // Prepend vanta-bg inside the .hero element if present to confine it to the hero page
  var hero = document.querySelector(".hero");
  if (hero) {
    hero.prepend(vantaBg);
  } else {
    document.body.insertBefore(vantaBg, canvas);
  }

  var vantaInstance = null;

  var mode = "dust";
  var W = 0, H = 0, DPR = 1;
  var mx = -9999, my = -9999, smx = -9999, smy = -9999;
  var frame = 0, rafId = null;
  var ink = "13,13,12", accent = "224,24,27";

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initDust();
  }

  function readColors() {
    var cs = getComputedStyle(document.body);
    var probe = document.createElement("div");
    probe.style.color = cs.getPropertyValue("--accent").trim();
    document.body.appendChild(probe);
    var rgb = getComputedStyle(probe).color.match(/\d+/g);
    if (rgb) accent = rgb.slice(0, 3).join(",");
    probe.style.color = cs.getPropertyValue("--ink").trim();
    var rgb2 = getComputedStyle(probe).color.match(/\d+/g);
    if (rgb2) ink = rgb2.slice(0, 3).join(",");
    document.body.removeChild(probe);
  }

  window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener("resize", resize);

  /* ---------- film dust ---------- */
  var dust = [];
  function initDust() {
    dust = [];
    var n = Math.round((W * H) / 26000);
    for (var i = 0; i < n; i++) {
      dust.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.08 - Math.random() * 0.3,
        o: 0.05 + Math.random() * 0.12,
        tw: Math.random() * Math.PI * 2
      });
    }
  }
  var scratch = { x: 0, life: 0 };
  function drawDust() {
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i];
      p.x += p.vx; p.y += p.vy; p.tw += 0.02;
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;
      var o = p.o * (0.7 + 0.3 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + ink + "," + o.toFixed(3) + ")";
      ctx.fill();
    }
    /* occasional vertical scratch */
    if (scratch.life <= 0 && Math.random() < 0.004) {
      scratch.x = Math.random() * W;
      scratch.life = 14 + Math.random() * 20;
    }
    if (scratch.life > 0) {
      scratch.life--;
      var so = 0.05 * Math.random();
      ctx.fillStyle = "rgba(" + ink + "," + so.toFixed(3) + ")";
      ctx.fillRect(scratch.x + (Math.random() - 0.5) * 2, 0, 1, H);
    }
  }

  /* ---------- reactive dot grid ---------- */
  function drawDots() {
    var gap = 52;
    var t = frame * 0.012;
    var offX = (W % gap) / 2, offY = (H % gap) / 2;
    for (var x = offX; x < W; x += gap) {
      for (var y = offY; y < H; y += gap) {
        var dx = x - smx, dy = y - smy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var near = Math.max(0, 1 - d / 200);
        var wave = 0.5 + 0.5 * Math.sin(t + x * 0.015 + y * 0.02);
        var r = 1.1 + wave * 0.5 + near * 2.4;
        var o = 0.07 + wave * 0.04 + near * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = near > 0.05
          ? "rgba(" + accent + "," + o.toFixed(3) + ")"
          : "rgba(" + ink + "," + o.toFixed(3) + ")";
        ctx.fill();
      }
    }
  }

  /* ---------- light leak ---------- */
  var blobs = [
    { sx: 0.2, sy: 0.3, rx: 0.32, ry: 0.22, sp: 0.00016, ph: 0, col: function () { return accent; }, o: 0.05 },
    { sx: 0.75, sy: 0.6, rx: 0.25, ry: 0.3, sp: 0.00011, ph: 2.1, col: function () { return ink; }, o: 0.04 },
    { sx: 0.55, sy: 0.15, rx: 0.3, ry: 0.18, sp: 0.00021, ph: 4.4, col: function () { return accent; }, o: 0.03 }
  ];
  function drawLeak(now) {
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var x = (b.sx + Math.cos(now * b.sp + b.ph) * b.rx) * W;
      var y = (b.sy + Math.sin(now * b.sp * 1.3 + b.ph) * b.ry) * H;
      var rad = Math.max(W, H) * 0.42;
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(" + b.col() + "," + b.o + ")");
      g.addColorStop(1, "rgba(" + b.col() + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- crimson textured glow ---------- */
  var crimsonImg = new Image();
  crimsonImg.src = "/bg-crimson.webp";
  var crimsonLoaded = false;
  crimsonImg.onload = function () { crimsonLoaded = true; };

  function drawCrimson(now) {
    if (crimsonLoaded && crimsonImg.width) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      var imgRatio = crimsonImg.width / crimsonImg.height;
      var canvasRatio = W / H;
      var dw, dh, dx, dy;
      if (canvasRatio > imgRatio) {
        dw = W;
        dh = W / imgRatio;
        dx = 0;
        dy = (H - dh) / 2;
      } else {
        dh = H;
        dw = H * imgRatio;
        dx = (W - dw) / 2;
        dy = 0;
      }
      ctx.drawImage(crimsonImg, dx, dy, dw, dh);
    } else {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#7a0505");
      g.addColorStop(0.35, "#ba160c");
      g.addColorStop(0.7, "#4a0202");
      g.addColorStop(1, "#1c0000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    /* Subtle light enhancement without washing out fine texture */
    var lx = (0.65 + Math.sin(now * 0.0003) * 0.15) * W + (smx - W / 2) * 0.12;
    var ly = (0.35 + Math.cos(now * 0.0004) * 0.12) * H + (smy - H / 2) * 0.12;
    var rad = Math.max(W, H) * 0.55;
    var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, rad);
    lg.addColorStop(0, "rgba(255, 140, 50, 0.1)");
    lg.addColorStop(0.5, "rgba(224, 24, 27, 0.03)");
    lg.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- starfield / starry night ---------- */
  var stars = [];
  var shootingStars = [];

  function initStars() {
    stars = [];
    var count = Math.round((W * H) / 1400);
    count = Math.max(500, Math.min(count, 1350));

    var starColors = [
      "255,255,255",
      "255,255,255",
      "255,255,255",
      "220,240,255",
      "255,248,235",
      "240,245,255"
    ];

    for (var i = 0; i < count; i++) {
      var depth = Math.random();
      var r, vx, vy, baseAlpha, zLayer;

      if (depth < 0.55) {
        zLayer = 1;
        r = 0.4 + Math.random() * 0.8;
        vy = -0.04 - Math.random() * 0.09;
        vx = (Math.random() - 0.5) * 0.05;
        baseAlpha = 0.3 + Math.random() * 0.5;
      } else if (depth < 0.88) {
        zLayer = 2;
        r = 1.0 + Math.random() * 1.2;
        vy = -0.09 - Math.random() * 0.16;
        vx = (Math.random() - 0.5) * 0.09;
        baseAlpha = 0.5 + Math.random() * 0.45;
      } else {
        zLayer = 3;
        r = 1.9 + Math.random() * 1.8;
        vy = -0.16 - Math.random() * 0.28;
        vx = (Math.random() - 0.5) * 0.14;
        baseAlpha = 0.7 + Math.random() * 0.3;
      }

      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: r,
        z: zLayer,
        vx: vx,
        vy: vy,
        baseAlpha: baseAlpha,
        twinkleSpeed: 0.009 + Math.random() * 0.035,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        hasGlow: zLayer === 3 || (zLayer === 2 && Math.random() < 0.45)
      });
    }
  }

  function drawStars(now) {
    // 1. Deep Space Cosmic Background
    ctx.fillStyle = "#030306";
    ctx.fillRect(0, 0, W, H);

    // Subtle atmospheric nebula shifts
    var nebX1 = (0.3 + Math.sin(now * 0.00015) * 0.1) * W;
    var nebY1 = (0.4 + Math.cos(now * 0.00012) * 0.1) * H;
    var rad1 = Math.max(W, H) * 0.5;
    var g1 = ctx.createRadialGradient(nebX1, nebY1, 0, nebX1, nebY1, rad1);
    g1.addColorStop(0, "rgba(25, 20, 50, 0.28)");
    g1.addColorStop(0.6, "rgba(10, 8, 25, 0.1)");
    g1.addColorStop(1, "rgba(3, 3, 6, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var nebX2 = (0.7 + Math.cos(now * 0.00018) * 0.12) * W;
    var nebY2 = (0.6 + Math.sin(now * 0.00014) * 0.12) * H;
    var rad2 = Math.max(W, H) * 0.45;
    var g2 = ctx.createRadialGradient(nebX2, nebY2, 0, nebX2, nebY2, rad2);
    g2.addColorStop(0, "rgba(45, 15, 35, 0.18)");
    g2.addColorStop(0.7, "rgba(15, 5, 20, 0.05)");
    g2.addColorStop(1, "rgba(3, 3, 6, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Mouse offset for 3D depth parallax
    var mouseOffsetX = (smx - W / 2) * 0.02;
    var mouseOffsetY = (smy - H / 2) * 0.02;

    // 2. Render & Update Stars
    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      p.twinklePhase += p.twinkleSpeed;
      var twinkle = 0.55 + 0.45 * Math.sin(p.twinklePhase);
      var alpha = Math.min(1, Math.max(0.08, p.baseAlpha * twinkle));

      var renderX = p.x + mouseOffsetX * p.z;
      var renderY = p.y + mouseOffsetY * p.z;

      var dx = renderX - smx;
      var dy = renderY - smy;
      var distSq = dx * dx + dy * dy;
      if (distSq < 22500) {
        var near = 1 - Math.sqrt(distSq) / 150;
        alpha = Math.min(1, alpha + near * 0.4);
      }

      if (p.hasGlow && alpha > 0.22) {
        var glowRad = p.r * 4.0;
        var starGlow = ctx.createRadialGradient(renderX, renderY, p.r * 0.4, renderX, renderY, glowRad);
        starGlow.addColorStop(0, "rgba(" + p.color + "," + (alpha * 0.65).toFixed(3) + ")");
        starGlow.addColorStop(0.5, "rgba(" + p.color + "," + (alpha * 0.18).toFixed(3) + ")");
        starGlow.addColorStop(1, "rgba(" + p.color + ",0)");
        ctx.fillStyle = starGlow;
        ctx.beginPath();
        ctx.arc(renderX, renderY, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(renderX, renderY, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.color + "," + alpha.toFixed(3) + ")";
      ctx.fill();
    }

    // 3. Occasional Shooting Star (Meteor)
    if (Math.random() < 0.038 && shootingStars.length < 4) {
      shootingStars.push({
        x: Math.random() * W * 0.9,
        y: Math.random() * H * 0.5,
        length: 100 + Math.random() * 110,
        speed: 14 + Math.random() * 14,
        angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.35,
        life: 0,
        maxLife: 28 + Math.floor(Math.random() * 22),
        size: 1.3 + Math.random() * 1.4
      });
    }

    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var s = shootingStars[j];
      s.life++;
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;

      var tailX = s.x - Math.cos(s.angle) * s.length;
      var tailY = s.y - Math.sin(s.angle) * s.length;

      var meteorAlpha = 1 - (s.life / s.maxLife);
      if (meteorAlpha <= 0) {
        shootingStars.splice(j, 1);
        continue;
      }

      var grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, "rgba(255, 255, 255, " + meteorAlpha.toFixed(3) + ")");
      grad.addColorStop(0.2, "rgba(200, 225, 255, " + (meteorAlpha * 0.7).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.lineWidth = s.size;
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initDust();
    initStars();
  }

  function readColors() {
    var cs = getComputedStyle(document.body);
    var probe = document.createElement("div");
    probe.style.color = cs.getPropertyValue("--accent").trim();
    document.body.appendChild(probe);
    var rgb = getComputedStyle(probe).color.match(/\d+/g);
    if (rgb) accent = rgb.slice(0, 3).join(",");
    probe.style.color = cs.getPropertyValue("--ink").trim();
    var rgb2 = getComputedStyle(probe).color.match(/\d+/g);
    if (rgb2) ink = rgb2.slice(0, 3).join(",");
    document.body.removeChild(probe);
  }

  window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener("resize", resize);

  function initVanta() {
    if (vantaInstance) return;
    if (typeof window.VANTA === "undefined" || typeof window.VANTA.FOG === "undefined") {
      setTimeout(initVanta, 100);
      return;
    }
    var isDark = document.body.dataset.theme === "dark";
    var baseColorStr = isDark ? 0x0d0d0c : 0xf5f5f2;
    var highlightColorStr = isDark ? 0x222222 : 0xffffff;
    var midtoneColorStr = isDark ? 0x111111 : 0x808080;
    var lowlightColorStr = isDark ? 0x000000 : 0x000000;

    try {
      vantaInstance = window.VANTA.FOG({
        el: "#vanta-bg",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        highlightColor: highlightColorStr,
        midtoneColor: midtoneColorStr,
        lowlightColor: lowlightColorStr,
        baseColor: baseColorStr,
        blurFactor: 0.60,
        speed: 1.20,
        zoom: 1.00
      });
    } catch (e) {
      console.warn("Vanta FOG error:", e);
    }
  }

  function destroyVanta() {
    if (vantaInstance) {
      vantaInstance.destroy();
      vantaInstance = null;
    }
  }

  /* ---------- loop ---------- */
  function loop(now) {
    frame++;
    smx += (mx - smx) * 0.08;
    smy += (my - smy) * 0.08;
    if (frame % 60 === 0) readColors();
    ctx.clearRect(0, 0, W, H);
    if (mode === "stars") drawStars(now);
    else if (mode === "dust") drawDust();
    else if (mode === "dots") drawDots();
    else if (mode === "leak") drawLeak(now);
    else if (mode === "crimson") drawCrimson(now);
    rafId = requestAnimationFrame(loop);
  }

  function setBg(m) {
    var map = { "Stars": "stars", "Starfield": "stars", "Film dust": "dust", "Dot grid": "dots", "Light leak": "leak", "Smoke": "smoke", "Red glow": "crimson", "Crimson": "crimson", "None": "none" };
    var oldMode = mode;
    mode = map[m] || m || "stars";
    if (reduceMotion) mode = "none";
    document.body.dataset.bg = mode;

    if (mode === "smoke") {
      canvas.style.display = "none";
      vantaBg.style.display = "block";
      destroyVanta();
      initVanta();
    } else {
      vantaBg.style.display = "none";
      destroyVanta();
      canvas.style.display = mode === "none" ? "none" : "block";
    }

    if (mode !== "none" && mode !== "smoke" && rafId === null) rafId = requestAnimationFrame(loop);
    if ((mode === "none" || mode === "smoke") && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  window.__setBg = setBg;

  resize();
  readColors();
  setBg("Stars");
})();

