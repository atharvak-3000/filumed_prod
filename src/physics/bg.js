/* FILUMED — tactile interactive canvas background simulator */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  // Create full-screen background canvas
  var canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  var ctx = canvas.getContext("2d");

  var mode = "grain"; // Normalized background mode: grain, stars, red-glow, film-dust, dot-grid, light-leak, smoke, liquid-flow, none
  var W = 0, H = 0, DPR = 1;
  var rafId = null;

  // Mouse tracking with inertia
  var mouse = {
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    active: false,
    radius: 200,
    speed: 0 // speed of mouse movement
  };

  var lastMouseX = -1000;
  var lastMouseY = -1000;

  window.addEventListener("mousemove", function (e) {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    if (!mouse.active) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
  });

  window.addEventListener("mouseleave", function () {
    mouse.active = false;
  });

  // Keep a cached grain texture for performance fallback / overlay
  var grainCanvas = document.createElement("canvas");
  var grainNeedsUpdate = true;

  function generateGrainTexture() {
    if (!canvas.width || !canvas.height) return;
    grainCanvas.width = canvas.width;
    grainCanvas.height = canvas.height;

    var gCtx = grainCanvas.getContext("2d");
    gCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var w = W;
    var h = H;

    // High-contrast, deeper dark warm gradient stops
    var grad = gCtx.createLinearGradient(w * 0.9, 0, w * 0.1, h);
    grad.addColorStop(0.0, '#030303');
    grad.addColorStop(0.25, '#16130f');
    grad.addColorStop(0.40, '#2e261e');
    grad.addColorStop(0.55, '#181410');
    grad.addColorStop(0.75, '#060505');
    grad.addColorStop(1.0, '#000000');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, w, h);

    // Subtle secondary diagonal highlight for rich contrast depth
    var grad2 = gCtx.createLinearGradient(w * 0.85, 0, w * 0.15, h);
    grad2.addColorStop(0.32, 'rgba(55,45,34,0.18)');
    grad2.addColorStop(0.52, 'rgba(0,0,0,0.0)');
    gCtx.fillStyle = grad2;
    gCtx.fillRect(0, 0, w, h);

    // Film grain noise overlay (high-contrast crisp noise)
    try {
      var imageData = gCtx.getImageData(0, 0, grainCanvas.width, grainCanvas.height);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 42;
        var r = data[i] + noise;
        var g = data[i + 1] + noise;
        var b = data[i + 2] + noise;
        data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
      gCtx.putImageData(imageData, 0, 0);
    } catch (e) {
      // Fallback if getImageData fails
    }
    grainNeedsUpdate = false;
  }

  // Particle systems state
  var particles = [];
  var scratches = [];
  var smokes = [];
  var lightLeaks = [];
  var fluidBlobs = [];

  function initFluidBlobs() {
    fluidBlobs = [];
    var count = 7;
    for (var i = 0; i < count; i++) {
      fluidBlobs.push({
        x: Math.random() * W,
        y: Math.random() * H,
        baseRadius: Math.random() * (W * 0.35) + (W * 0.2),
        radius: 0,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.18,
        color: i % 2 === 0 ? "#ffffff" : "#0d0d0c", // High contrast white/black
        opacity: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.0008 + Math.random() * 0.001,
        offsetX: 0,
        offsetY: 0
      });
    }
  }

  function initParticles() {
    particles = [];
    scratches = [];
    smokes = [];
    lightLeaks = [];
    fluidBlobs = [];

    if (mode === "liquid-flow") {
      initFluidBlobs();
      return;
    }

    var count = mode === "stars" ? 180 : 80; // more stars for galaxy look
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 1.5 + 0.1, // depth factor
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.7 + 0.2,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        color: "#ffffff",
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.005,
        pulseSpeed: 0.005 + Math.random() * 0.015,
        pulseOffset: Math.random() * Math.PI * 2,
        // Interactive offsets
        offsetX: 0,
        offsetY: 0
      });
    }

    // Initialize smoke clouds
    if (mode === "smoke") {
      for (var j = 0; j < 12; j++) {
        smokes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: Math.random() * 300 + 200,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.15,
          alpha: Math.random() * 0.08 + 0.02,
          hue: 200 + Math.random() * 40 // blueish smoke
        });
      }
    }

    // Initialize light leaks
    if (mode === "light-leak") {
      for (var k = 0; k < 4; k++) {
        lightLeaks.push({
          x: Math.random() * W,
          y: Math.random() * H,
          radiusX: Math.random() * 400 + 300,
          radiusY: Math.random() * 300 + 200,
          color: k % 2 === 0 ? "rgba(224, 24, 27, 0.07)" : "rgba(201, 123, 18, 0.05)", // Red/Orange cinema glow
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.002 + Math.random() * 0.002
        });
      }
    }
  }

  function drawDarkBase() {
    ctx.fillStyle = "#050504";
    ctx.fillRect(0, 0, W, H);
  }

  function drawAmbientGlow() {
    // Elegant radial glow from top right corner
    var cx = W * 0.85, cy = H * 0.15;
    var radius = Math.max(W, H) * 0.9;
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    
    if (mode === "red-glow") {
      // Crimson/red-curtain cinema glow
      glow.addColorStop(0.0, "rgba(224, 24, 27, 0.22)");
      glow.addColorStop(0.3, "rgba(100, 10, 15, 0.12)");
      glow.addColorStop(0.7, "rgba(20, 2, 4, 0.05)");
      glow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    } else {
      // Neutral warm-taupe glow
      glow.addColorStop(0.0, "rgba(74, 69, 61, 0.35)");
      glow.addColorStop(0.3, "rgba(43, 39, 34, 0.2)");
      glow.addColorStop(0.7, "rgba(23, 20, 15, 0.08)");
      glow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    }
    
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawInteractiveCursorGlow() {
    if (!mouse.active) return;
    
    // Smoothly draw a subtle interactive glow centered at mouse
    var glowRadius = 320;
    var mouseGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowRadius);
    
    if (mode === "red-glow") {
      mouseGlow.addColorStop(0.0, "rgba(224, 24, 27, 0.16)");
      mouseGlow.addColorStop(0.5, "rgba(224, 24, 27, 0.04)");
      mouseGlow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    } else if (mode === "stars") {
      // Celestial blue-white galaxy glow
      mouseGlow.addColorStop(0.0, "rgba(100, 150, 255, 0.08)");
      mouseGlow.addColorStop(0.6, "rgba(100, 150, 255, 0.02)");
      mouseGlow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    } else {
      // Warm white subtle light
      mouseGlow.addColorStop(0.0, "rgba(250, 249, 246, 0.05)");
      mouseGlow.addColorStop(0.6, "rgba(250, 249, 246, 0.01)");
      mouseGlow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    }
    
    ctx.fillStyle = mouseGlow;
    ctx.fillRect(0, 0, W, H);
  }

  function updateAndDrawStars() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      
      // Drift movement
      p.x += p.speedX * p.z;
      p.y += p.speedY * p.z;

      // Wrap around bounds
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      // Galaxy / Star Pulsing
      var pulse = Math.sin(performance.now() * p.pulseSpeed + p.pulseOffset) * 0.25 + 0.75;
      var drawX = p.x;
      var drawY = p.y;

      // Interactive gravitational lensing/repulsion effect
      if (mouse.active) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 220) {
          var force = (220 - dist) / 220;
          // Stars pull in (gravity effect of black hole / galaxy core)
          var angle = Math.atan2(dy, dx);
          p.offsetX += Math.cos(angle) * force * 1.5 * p.z;
          p.offsetY += Math.sin(angle) * force * 1.5 * p.z;
        }
      }

      // Smoothly decay offsets
      p.offsetX *= 0.95;
      p.offsetY *= 0.95;

      drawX += p.offsetX;
      drawY += p.offsetY;

      // Draw star
      var radius = p.size * p.z;
      var opacity = p.alpha * pulse;
      
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
      ctx.fill();

      // Star glow for larger foreground stars
      if (p.z > 1.2 && radius > 1.2) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (opacity * 0.15) + ")";
        ctx.fill();
      }
    }
  }

  function updateAndDrawFilmDust() {
    // 1. Draw dynamic cinema noise / particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      
      // Fast kinetic flicker/movement typical of old movies
      p.y += (p.z * 1.8) + (Math.random() - 0.5) * 0.8;
      p.x += (Math.random() - 0.5) * 0.5;

      // Wrap around bounds
      if (p.y > H) {
        p.y = 0;
        p.x = Math.random() * W;
      }

      // Mouse interactive repelling force (like blowing wind)
      if (mouse.active) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          var force = (150 - dist) / 150;
          p.offsetX += (dx / dist) * force * 4;
          p.offsetY += (dy / dist) * force * 4;
        }
      }
      p.offsetX *= 0.9;
      p.offsetY *= 0.9;

      var drawX = p.x + p.offsetX;
      var drawY = p.y + p.offsetY;

      // Randomly hide a few to create flicker
      if (Math.random() > 0.08) {
        ctx.fillStyle = Math.random() > 0.4 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.15)";
        ctx.fillRect(drawX, drawY, p.size * 0.8, p.size * 1.4);
      }
    }

    // 2. Draw vertical scratches (classic old cinema negative scratches)
    if (Math.random() < 0.18) {
      scratches.push({
        x: Math.random() * W,
        y: Math.random() * (H / 2),
        len: Math.random() * 220 + 80,
        opacity: Math.random() * 0.15 + 0.05,
        width: Math.random() * 0.8 + 0.2,
        life: Math.random() * 4 + 2 // lives for few frames
      });
    }

    for (var s = scratches.length - 1; s >= 0; s--) {
      var scr = scratches[s];
      ctx.beginPath();
      ctx.moveTo(scr.x, scr.y);
      ctx.lineTo(scr.x + (Math.random() - 0.5) * 2, scr.y + scr.len);
      ctx.strokeStyle = "rgba(255, 255, 255, " + scr.opacity + ")";
      ctx.lineWidth = scr.width;
      ctx.stroke();

      scr.life--;
      if (scr.life <= 0) {
        scratches.splice(s, 1);
      }
    }
  }

  function updateAndDrawDotGrid() {
    var gridSize = 50;
    var cols = Math.floor(W / gridSize) + 2;
    var rows = Math.floor(H / gridSize) + 2;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var gridX = c * gridSize;
        var gridY = r * gridSize;

        var drawX = gridX;
        var drawY = gridY;
        var scale = 1;
        var opacity = 0.12;

        if (mouse.active) {
          var dx = mouse.x - gridX;
          var dy = mouse.y - gridY;
          var dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            var force = (180 - dist) / 180;
            // Magnetic scale/warp effect
            scale = 1 + force * 2.5;
            opacity = 0.12 + force * 0.45;
            
            // Subtle warping towards mouse
            drawX -= (dx / dist) * force * 15;
            drawY -= (dy / dist) * force * 15;
          }
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, 1.2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
        ctx.fill();
      }
    }
  }

  function updateAndDrawSmoke() {
    ctx.save();
    for (var i = 0; i < smokes.length; i++) {
      var s = smokes[i];

      // Swirl towards/around mouse cursor
      if (mouse.active) {
        var dx = mouse.x - s.x;
        var dy = mouse.y - s.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 350) {
          var angle = Math.atan2(dy, dx) + Math.PI / 2; // curl vector
          var pull = (350 - dist) / 350 * 0.05;
          s.vx += Math.cos(angle) * pull;
          s.vy += Math.sin(angle) * pull;
        }
      }

      s.x += s.vx;
      s.y += s.vy;
      
      // friction
      s.vx *= 0.98;
      s.vy *= 0.98;

      // Wrap
      if (s.x < -s.size) s.x = W + s.size;
      if (s.x > W + s.size) s.x = -s.size;
      if (s.y < -s.size) s.y = H + s.size;
      if (s.y > H + s.size) s.y = -s.size;

      // Draw smoke blob
      var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
      grad.addColorStop(0, "hsla(" + s.hue + ", 15%, 85%, " + s.alpha + ")");
      grad.addColorStop(0.5, "hsla(" + s.hue + ", 10%, 60%, " + (s.alpha * 0.4) + ")");
      grad.addColorStop(1, "hsla(" + s.hue + ", 10%, 40%, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function updateAndDrawLightLeaks() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < lightLeaks.length; i++) {
      var leak = lightLeaks[i];
      
      // Shifting paths
      leak.x += leak.vx;
      leak.y += leak.vy;

      // Bounce/Wrap
      if (leak.x < -leak.radiusX) { leak.x = W + leak.radiusX; }
      if (leak.x > W + leak.radiusX) { leak.x = -leak.radiusX; }
      if (leak.y < -leak.radiusY) { leak.y = H + leak.radiusY; }
      if (leak.y > H + leak.radiusY) { leak.y = -leak.radiusY; }

      leak.phase += leak.phaseSpeed;
      var dynamicRadiusX = leak.radiusX * (1 + Math.sin(leak.phase) * 0.15);
      var dynamicRadiusY = leak.radiusY * (1 + Math.cos(leak.phase) * 0.15);

      // Mouse warp effect
      var drawX = leak.x;
      var drawY = leak.y;
      if (mouse.active) {
        var dx = mouse.x - leak.x;
        var dy = mouse.y - leak.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          var shift = (400 - dist) * 0.12;
          drawX += (dx / dist) * shift;
          drawY += (dy / dist) * shift;
        }
      }

      var grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, Math.max(dynamicRadiusX, dynamicRadiusY));
      grad.addColorStop(0, leak.color);
      grad.addColorStop(0.5, leak.color.replace(/[\d\.]+\)$/, "0.02)"));
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(drawX, drawY, Math.max(dynamicRadiusX, dynamicRadiusY), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function updateAndDrawLiquidFlow() {
    // Fill background with black base
    ctx.fillStyle = "#070707";
    ctx.fillRect(0, 0, W, H);

    // Draw background ambient dark blobs
    for (var i = 0; i < fluidBlobs.length; i++) {
      var b = fluidBlobs[i];

      // Slow drift
      b.x += b.vx;
      b.y += b.vy;

      // Wrap around bounds
      var padding = b.baseRadius;
      if (b.x < -padding) b.x = W + padding;
      if (b.x > W + padding) b.x = -padding;
      if (b.y < -padding) b.y = H + padding;
      if (b.y > H + padding) b.y = -padding;

      // Pulse size
      b.phase += b.phaseSpeed;
      b.radius = b.baseRadius * (1 + Math.sin(b.phase) * 0.15);

      // Mouse interactive warp
      if (mouse.active) {
        var dx = mouse.x - b.x;
        var dy = mouse.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 380) {
          var force = (380 - dist) / 380;
          // Warp blob position away from mouse (creates fluid ripple push)
          var angle = Math.atan2(dy, dx);
          b.offsetX += -Math.cos(angle) * force * 5.0;
          b.offsetY += -Math.sin(angle) * force * 5.0;
        }
      }

      b.offsetX *= 0.95;
      b.offsetY *= 0.95;

      var drawX = b.x + b.offsetX;
      var drawY = b.y + b.offsetY;

      // Draw large radial soft gradient for liquid look
      var grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, b.radius);
      if (b.color === "#ffffff") {
        // Soft white/silver metallic glow
        grad.addColorStop(0, "rgba(240, 240, 235, " + b.opacity + ")");
        grad.addColorStop(0.35, "rgba(180, 180, 180, " + (b.opacity * 0.5) + ")");
        grad.addColorStop(0.7, "rgba(80, 80, 80, " + (b.opacity * 0.15) + ")");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        // High contrast dark absorption pools
        grad.addColorStop(0, "rgba(3, 3, 2, 0.95)");
        grad.addColorStop(0.4, "rgba(3, 3, 2, 0.7)");
        grad.addColorStop(0.8, "rgba(3, 3, 2, 0.25)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(drawX, drawY, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add a sharp monochrome metallic overlay to enhance high contrast curves
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1.8;
    var time = performance.now() * 0.0003;
    for (var j = 0; j < 3; j++) {
      ctx.beginPath();
      var segmentCount = 6;
      for (var s = 0; s <= segmentCount; s++) {
        var x = (s / segmentCount) * W;
        // Wave math
        var yNoise = Math.sin(time + s + j * 2) * 110 + Math.cos(time * 0.5 - s + j) * 70;
        var y = H * (0.3 + j * 0.2) + yNoise;

        if (mouse.active) {
          var mdx = mouse.x - x;
          var mdy = mouse.y - y;
          var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 220) {
            var mforce = (220 - mdist) / 220;
            y += (mdy / mdist) * mforce * -35; // curve repelled by mouse
          }
        }

        if (s === 0) {
          ctx.moveTo(x, y);
        } else {
          var prevX = ((s - 1) / segmentCount) * W;
          var prevYNoise = Math.sin(time + (s - 1) + j * 2) * 110 + Math.cos(time * 0.5 - (s - 1) + j) * 70;
          var prevY = H * (0.3 + j * 0.2) + prevYNoise;
          
          if (mouse.active) {
            var pmdx = mouse.x - prevX;
            var pmdy = mouse.y - prevY;
            var pmdist = Math.sqrt(pmdx * pmdx + pmdy * pmdy);
            if (pmdist < 220) {
              var pmforce = (220 - pmdist) / 220;
              prevY += (pmdy / pmdist) * pmforce * -35;
            }
          }

          var xc = (x + prevX) / 2;
          var yc = (y + prevY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, xc, yc);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGrainOverlay() {
    if (grainCanvas.width === 0 || grainNeedsUpdate) {
      generateGrainTexture();
    }

    // Draw the tiled grain pattern over the background
    ctx.save();
    // Heavy tactile noise for liquid flow mode to match user reference image, subtle otherwise
    ctx.globalAlpha = mode === "liquid-flow" ? 0.22 : 0.08;
    ctx.globalCompositeOperation = "source-over";
    
    // Draw pattern
    var pattern = ctx.createPattern(grainCanvas, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    
    grainNeedsUpdate = true;
    initParticles();
  }

  window.addEventListener("resize", resize);

  /* ---------- loop ---------- */
  function loop() {
    if (mode === "none") {
      ctx.clearRect(0, 0, W, H);
      rafId = requestAnimationFrame(loop);
      return;
    }

    // Update mouse inertia
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    // Render loop per mode
    if (mode === "grain") {
      if (grainCanvas.width === 0 || grainNeedsUpdate) {
        generateGrainTexture();
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(grainCanvas, 0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
      
      if (mode === "liquid-flow") {
        updateAndDrawLiquidFlow();
      } else {
        drawDarkBase();
        drawAmbientGlow();
        drawInteractiveCursorGlow();

        if (mode === "stars") {
          updateAndDrawStars();
        } else if (mode === "film-dust") {
          updateAndDrawFilmDust();
        } else if (mode === "dot-grid") {
          updateAndDrawDotGrid();
        } else if (mode === "smoke") {
          updateAndDrawSmoke();
        } else if (mode === "light-leak") {
          updateAndDrawLightLeaks();
        }
      }

      // Add a touch of organic film grain on top of everything
      drawGrainOverlay();
    }

    rafId = requestAnimationFrame(loop);
  }

  function setBg(m) {
    var rawMode = String(m).toLowerCase().replace(/\s+/g, '-');
    
    // Valid values: grain, stars, red-glow, film-dust, dot-grid, light-leak, smoke, liquid-flow, none
    var allowedModes = ["grain", "stars", "red-glow", "film-dust", "dot-grid", "light-leak", "smoke", "liquid-flow", "none"];
    if (allowedModes.indexOf(rawMode) === -1) {
      mode = "grain";
    } else {
      mode = rawMode;
    }

    if (reduceMotion) mode = "none";

    // Update document dataset for CSS selection (white text rules apply for non-light layers)
    if (mode === "none" || mode === "dot-grid" || mode === "light-leak") {
      // Map to default theme or lighter modes depending on active theme settings
      document.body.dataset.bg = "none";
    } else if (mode === "grain") {
      document.body.dataset.bg = "grain";
    } else {
      // stars, film-dust, smoke, red-glow, liquid-flow use dark theme layouts
      document.body.dataset.bg = "stars";
    }

    canvas.style.display = mode === "none" ? "none" : "block";

    initParticles();

    if (mode !== "none" && rafId === null) rafId = requestAnimationFrame(loop);
  }
  window.__setBg = setBg;

  // Initialize
  resize();
  setBg("grain");
})();
