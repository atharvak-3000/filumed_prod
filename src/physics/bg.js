/* FILUMED — tactile film grain canvas background */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  var ctx = canvas.getContext("2d");

  var mode = "grain";
  var W = 0, H = 0, DPR = 1;
  var rafId = null;

  var grainCanvas = document.createElement("canvas");

  function generateGrainTexture() {
    var gW = canvas.width, gH = canvas.height;
    if (!gW || !gH) return;
    grainCanvas.width = gW;
    grainCanvas.height = gH;
    var gctx = grainCanvas.getContext("2d");

    // Pure near-black base — no warm/red tint
    gctx.fillStyle = "#050504";
    gctx.fillRect(0, 0, gW, gH);

    // Cool warm-beige/taupe radial glow from upper-right, strictly neutral (no red channel dominance)
    var cx = gW * 0.80, cy = gH * 0.15;
    var radius = Math.max(gW, gH) * 1.0;
    var glow = gctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0.0, "#4a453d");
    glow.addColorStop(0.22, "#332f29");
    glow.addColorStop(0.5, "#17140f");
    glow.addColorStop(0.8, "#080706");
    glow.addColorStop(1.0, "#000000");
    gctx.fillStyle = glow;
    gctx.fillRect(0, 0, gW, gH);

    // Neutral gray-beige film grain noise (equal RGB offset, no color-channel bias toward red)
    try {
      var imageData = gctx.getImageData(0, 0, gW, gH);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 40;
        data[i]   = Math.max(0, Math.min(255, data[i]   + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
      }
      gctx.putImageData(imageData, 0, 0);
    } catch (e) {
      // Fallback
    }
  }

  function drawGrain() {
    if (grainCanvas.width) {
      ctx.drawImage(grainCanvas, 0, 0, W, H);
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    generateGrainTexture();
  }

  window.addEventListener("resize", resize);

  /* ---------- loop ---------- */
  function loop() {
    ctx.clearRect(0, 0, W, H);
    if (mode === "grain") drawGrain();
    rafId = requestAnimationFrame(loop);
  }

  function setBg(m) {
    mode = (m === "none" || m === false) ? "none" : "grain";
    if (reduceMotion) mode = "none";
    document.body.dataset.bg = mode;

    canvas.style.display = mode === "none" ? "none" : "block";

    if (mode !== "none" && rafId === null) rafId = requestAnimationFrame(loop);
    if (mode === "none" && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  window.__setBg = setBg;

  resize();
  setBg("grain");
})();
