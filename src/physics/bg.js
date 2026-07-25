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

  /* ---------- reference texture & warm ambient grain engine ---------- */
  var warmGrainImg = new Image();
  warmGrainImg.src = "/bg-warm-grain.png";
  var warmGrainLoaded = false;
  warmGrainImg.onload = function () { warmGrainLoaded = true; };

  var grainParticles = [];

  function initStars() {
    grainParticles = [];
    var count = Math.round((W * H) / 320);
    count = Math.max(2500, Math.min(count, 8000));

    var warmTones = [
      "225,208,185",
      "245,230,205",
      "185,165,140",
      "145,125,102",
      "210,190,165"
    ];

    for (var i = 0; i < count; i++) {
      grainParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.35 + Math.random() * 0.55,
        baseAlpha: 0.03 + Math.random() * 0.25,
        color: warmTones[Math.floor(Math.random() * warmTones.length)],
        vx: (Math.random() - 0.5) * 0.04,
        vy: -0.03 - Math.random() * 0.09
      });
    }
  }

  function drawStars(now) {
    var mouseShiftX = (smx - W / 2) * 0.06;
    var mouseShiftY = (smy - H / 2) * 0.06;

    if (warmGrainLoaded && warmGrainImg.width && warmGrainImg.height) {
      // 1. Draw Reference Grain Image (cropping top & bottom UI overlay elements)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Crop inner 78% height of the image to remove UI arrows/buttons
      var sx = warmGrainImg.width * 0.02;
      var sy = warmGrainImg.height * 0.11;
      var sw = warmGrainImg.width * 0.96;
      var sh = warmGrainImg.height * 0.77;

      var imgRatio = sw / sh;
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

      ctx.drawImage(warmGrainImg, sx, sy, sw, sh, dx + mouseShiftX * 0.2, dy + mouseShiftY * 0.2, dw, dh);
    } else {
      // Fallback base
      ctx.fillStyle = "#090807";
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Soft Upper-Right Warm Amber Light Beam Overlay (matches reference composition)
    var beam1X = W * 0.75 + Math.sin(now * 0.00015) * W * 0.05 + mouseShiftX;
    var beam1Y = H * 0.25 + Math.cos(now * 0.0002) * H * 0.05 + mouseShiftY;
    var rad1 = Math.max(W, H) * 0.7;

    var g1 = ctx.createRadialGradient(beam1X, beam1Y, 0, beam1X, beam1Y, rad1);
    g1.addColorStop(0, "rgba(95, 68, 48, 0.28)");
    g1.addColorStop(0.4, "rgba(55, 40, 28, 0.16)");
    g1.addColorStop(0.8, "rgba(20, 16, 12, 0.06)");
    g1.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // 3. Dynamic Micro-Grain Overlay (gives organic motion to the texture)
    for (var i = 0; i < grainParticles.length; i++) {
      var p = grainParticles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W; }
      if (p.x < -2) p.x = W + 2;
      if (p.x > W + 2) p.x = -2;

      var renderX = p.x + (Math.random() - 0.5) * 1.0 + mouseShiftX * 0.02;
      var renderY = p.y + (Math.random() - 0.5) * 1.0 + mouseShiftY * 0.02;

      var currentAlpha = p.baseAlpha * (0.7 + 0.3 * Math.random());

      ctx.fillStyle = "rgba(" + p.color + "," + currentAlpha.toFixed(3) + ")";
      ctx.fillRect(renderX, renderY, p.r, p.r);
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

