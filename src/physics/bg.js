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
    if (!canvas.width || !canvas.height) return;
    grainCanvas.width = canvas.width;
    grainCanvas.height = canvas.height;

    var gCtx = grainCanvas.getContext("2d");
    gCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var w = W;
    var h = H;

    // Darker warm gradient stops (30-40% reduced brightness on lighter stops)
    var grad = gCtx.createLinearGradient(w, 0, 0, h);
    grad.addColorStop(0.0, '#070707');
    grad.addColorStop(0.28, '#26221c');
    grad.addColorStop(0.42, '#504639');
    grad.addColorStop(0.55, '#312a24');
    grad.addColorStop(0.7, '#0d0b0a');
    grad.addColorStop(1.0, '#000000');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, w, h);

    // Soft secondary diagonal highlight band
    var grad2 = gCtx.createLinearGradient(w * 0.9, 0, w * 0.1, h);
    grad2.addColorStop(0.3, 'rgba(80,70,55,0.22)');
    grad2.addColorStop(0.5, 'rgba(80,70,55,0.0)');
    gCtx.fillStyle = grad2;
    gCtx.fillRect(0, 0, w, h);

    // Film grain noise overlay (generated once and cached)
    try {
      var imageData = gCtx.getImageData(0, 0, grainCanvas.width, grainCanvas.height);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var noise = (Math.random() - 0.5) * 55;
        var r = data[i] + noise;
        var g = data[i + 1] + noise;
        var b = data[i + 2] + noise;
        data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
      gCtx.putImageData(imageData, 0, 0);
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
