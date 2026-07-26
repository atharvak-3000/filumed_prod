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

  /* ---------- ultra-fine warm film grain & amber diagonal light ---------- */
  var grainParticles = [];
  var shootingStars = [];

  function initStars() {
    grainParticles = [];
    var count = Math.round((W * H) / 110);
    count = Math.max(4000, Math.min(count, 18000));

    var warmTones = [
      "225,208,185",
      "245,230,205",
      "185,165,140",
      "145,125,102",
      "210,190,165"
    ];

    for (var i = 0; i < count; i++) {
      var x = Math.random() * W;
      var y = Math.random() * H;
      var r = 0.35 + Math.random() * 0.65;
      var alpha = 0.04 + Math.random() * 0.38;

      grainParticles.push({
        x: x,
        y: y,
        r: r,
        baseAlpha: alpha,
        color: warmTones[Math.floor(Math.random() * warmTones.length)],
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.04 - Math.random() * 0.12
      });
    }
  }

  function drawStars(now) {
    // 1. Deep warm brown-black base color
    ctx.fillStyle = "#090807";
    ctx.fillRect(0, 0, W, H);

    var mouseShiftX = (smx - W / 2) * 0.08;
    var mouseShiftY = (smy - H / 2) * 0.08;

    // 2. Soft diagonal light gradient from Upper-Right toward Lower-Left (Warm Amber / Brown)
    var beam1X = W * 0.75 + Math.sin(now * 0.00015) * W * 0.06 + mouseShiftX;
    var beam1Y = H * 0.25 + Math.cos(now * 0.0002) * H * 0.06 + mouseShiftY;
    var rad1 = Math.max(W, H) * 0.7;

    var g1 = ctx.createRadialGradient(beam1X, beam1Y, 0, beam1X, beam1Y, rad1);
    g1.addColorStop(0, "rgba(82, 60, 42, 0.44)");
    g1.addColorStop(0.35, "rgba(52, 38, 26, 0.28)");
    g1.addColorStop(0.7, "rgba(24, 18, 13, 0.14)");
    g1.addColorStop(1, "rgba(9, 8, 7, 0)");

    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // Secondary subtle warm glow
    var beam2X = W * 0.5 + Math.cos(now * 0.00018) * W * 0.05 - mouseShiftX * 0.4;
    var beam2Y = H * 0.6 + Math.sin(now * 0.00022) * H * 0.05 - mouseShiftY * 0.4;
    var rad2 = Math.max(W, H) * 0.55;

    var g2 = ctx.createRadialGradient(beam2X, beam2Y, 0, beam2X, beam2Y, rad2);
    g2.addColorStop(0, "rgba(62, 46, 32, 0.28)");
    g2.addColorStop(0.5, "rgba(32, 24, 17, 0.12)");
    g2.addColorStop(1, "rgba(9, 8, 7, 0)");

    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // 3. Render ultra-dense 1px film grain noise field
    for (var i = 0; i < grainParticles.length; i++) {
      var p = grainParticles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W; }
      if (p.x < -2) p.x = W + 2;
      if (p.x > W + 2) p.x = -2;

      var renderX = p.x + (Math.random() - 0.5) * 1.1 + mouseShiftX * 0.02;
      var renderY = p.y + (Math.random() - 0.5) * 1.1 + mouseShiftY * 0.02;

      var dx = renderX - beam1X;
      var dy = renderY - beam1Y;
      var distSq = dx * dx + dy * dy;
      var beamIntensity = Math.max(0, 1 - Math.sqrt(distSq) / (rad1 * 0.8));

      var currentAlpha = p.baseAlpha * (0.6 + 0.4 * Math.random() + beamIntensity * 0.5);

      ctx.fillStyle = "rgba(" + p.color + "," + currentAlpha.toFixed(3) + ")";
      ctx.fillRect(renderX, renderY, p.r, p.r);
    }

    // 4. Subtle Shooting Star (Meteor)
    if (Math.random() < 0.015 && shootingStars.length < 2) {
      shootingStars.push({
        x: Math.random() * W * 0.85 + W * 0.05,
        y: Math.random() * H * 0.45,
        length: 70 + Math.random() * 50,
        speed: 10 + Math.random() * 8,
        angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 24 + Math.floor(Math.random() * 16),
        size: 0.9 + Math.random() * 0.5
      });
    }

    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var s = shootingStars[j];
      s.life++;
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;

      var tailX = s.x - Math.cos(s.angle) * s.length;
      var tailY = s.y - Math.sin(s.angle) * s.length;

      var meteorAlpha = (1 - (s.life / s.maxLife)) * 0.6;
      if (meteorAlpha <= 0) {
        shootingStars.splice(j, 1);
        continue;
      }

      var grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, "rgba(255, 248, 235, " + meteorAlpha.toFixed(3) + ")");
      grad.addColorStop(0.3, "rgba(225, 210, 185, " + (meteorAlpha * 0.6).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(225, 210, 185, 0)");

      ctx.lineWidth = s.size;
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  /* ---------- static grainy gradient ---------- */
  function clampByte(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function drawGrain() {
    var w = canvas.width, h = canvas.height;
    if (!w || !h) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    var grad = ctx.createLinearGradient(w, 0, 0, h);
    grad.addColorStop(0.0, '#0a0a0a');
    grad.addColorStop(0.28, '#3a332c');
    grad.addColorStop(0.42, '#7a6b58');
    grad.addColorStop(0.55, '#4a4038');
    grad.addColorStop(0.7, '#141210');
    grad.addColorStop(1.0, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var grad2 = ctx.createLinearGradient(w * 0.9, 0, w * 0.1, h);
    grad2.addColorStop(0.3, 'rgba(120,105,85,0.35)');
    grad2.addColorStop(0.5, 'rgba(120,105,85,0.0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    var imageData = ctx.getImageData(0, 0, w, h);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      var noise = (Math.random() - 0.5) * 60;
      data[i] = clampByte(data[i] + noise);
      data[i + 1] = clampByte(data[i + 1] + noise);
      data[i + 2] = clampByte(data[i + 2] + noise);
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = Math.max(window.innerHeight, document.documentElement.scrollHeight || 0);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initDust();
    initStars();
    if (mode === "grain") {
      drawGrain();
    }
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
    if (mode === "grain") {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      return;
    }
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
    var map = {
      "Grain": "grain",
      "Film grain": "grain",
      "grain": "grain",
      "Stars": "stars",
      "Starfield": "stars",
      "Film dust": "dust",
      "Dot grid": "dots",
      "Light leak": "leak",
      "Smoke": "smoke",
      "Red glow": "crimson",
      "Crimson": "crimson",
      "None": "none"
    };
    var oldMode = mode;
    mode = map[m] || m || "stars";
    if (reduceMotion && mode !== "grain") mode = "none";
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

    if (mode === "grain") {
      drawGrain();
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      if (mode !== "none" && mode !== "smoke" && rafId === null) rafId = requestAnimationFrame(loop);
      if ((mode === "none" || mode === "smoke") && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }
  window.__setBg = setBg;

  resize();
  readColors();
  setBg("Stars");
})();

