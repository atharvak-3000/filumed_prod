/* FILUMED — theme pull-rope (Verlet physics simulated) */
(function () {
  "use strict";

  var rope = document.querySelector(".pull-rope");
  if (!rope) return;
  var grab = rope.querySelector(".rope-grab");
  var canvas = rope.querySelector(".rope-canvas");
  var ctx = canvas.getContext("2d");

  // Handle High-DPI screens
  function setupCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 360 * dpr;
    ctx.scale(dpr, dpr);
  }
  setupCanvas();
  window.addEventListener("resize", setupCanvas);

  // Physics settings
  var numNodes = 8;
  var restLength = 12; // 12 * 7 = 84px total rest length
  var gravity = 0.5;
  var damping = 0.88;
  var stiffness = 0.28;
  
  // Limits
  var BASE = 84;
  var MAX = 170;
  var THRESH = 42;

  // Nodes initialization
  var nodes = [];
  for (var i = 0; i < numNodes; i++) {
    nodes.push({
      x: 0,
      y: i * restLength,
      vx: 0,
      vy: 0,
      fixed: i === 0
    });
  }

  // Interactivity state
  var dragging = false;
  var clickTime = 0;
  var clickY = 0;
  var dragMouseX = 0;
  var dragMouseY = 0;
  var mouseX = -9999;
  var mouseY = -9999;
  var transitionInProgress = false;

  function toggleTheme() {
    if (window.__toggleTheme) { window.__toggleTheme(); return; }
    document.body.dataset.theme =
      document.body.dataset.theme === "dark" ? "light" : "dark";
  }

  // Perform screen wipe transition
  function triggerThemeTransition() {
    if (transitionInProgress) return;
    transitionInProgress = true;

    var currentTheme = document.body.dataset.theme || "light";
    var targetTheme = currentTheme === "dark" ? "light" : "dark";

    // Get knob screen coordinate as origin
    var rect = grab.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var overlay = document.createElement("div");
    overlay.className = "theme-transition-overlay";
    
    // Choose correct background for the sweep overlay
    var targetBg = targetTheme === "dark" ? "#0f0e0d" : "#faf9f7";
    overlay.style.backgroundColor = targetBg;
    overlay.style.setProperty("--x", cx + "px");
    overlay.style.setProperty("--y", cy + "px");

    document.body.appendChild(overlay);

    // Force reflow
    overlay.offsetHeight;

    // Trigger circular animation
    overlay.classList.add("active");

    // Toggle theme in the middle of the transition
    setTimeout(function () {
      toggleTheme();
    }, 320);

    // Tear down
    setTimeout(function () {
      overlay.remove();
      transitionInProgress = false;
    }, 750);
  }

  // Inject velocity impulse to simulate clicking the cord
  function triggerClickPull() {
    if (transitionInProgress) return;

    for (var i = 3; i < numNodes; i++) {
      nodes[i].vy = 26; // downward force
      nodes[i].vx = (Math.random() - 0.5) * 8; // subtle side sway
    }

    setTimeout(function () {
      triggerThemeTransition();
    }, 120);
  }

  // Physics simulation loop
  function updatePhysics() {
    // 1. Gravity and velocity
    for (var i = 1; i < numNodes; i++) {
      var node = nodes[i];
      node.vy += gravity;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }

    // 2. Spring constraint forces
    for (var i = 1; i < numNodes; i++) {
      var n1 = nodes[i - 1];
      var n2 = nodes[i];
      var dx = n2.x - n1.x;
      var dy = n2.y - n1.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var diff = dist - restLength;
      var fx = (dx / dist) * diff * stiffness;
      var fy = (dy / dist) * diff * stiffness;

      if (!n1.fixed) {
        n1.vx += fx;
        n1.vy += fy;
      }
      n2.vx -= fx;
      n2.vy -= fy;
    }

    // 3. Mouse proximity repulsion (brush-past sway)
    var rect = rope.getBoundingClientRect();
    if (rect.width > 0) {
      var anchorX = rect.left + rect.width / 2;
      var anchorY = rect.top;
      
      for (var i = 1; i < numNodes; i++) {
        var node = nodes[i];
        var screenX = anchorX + node.x;
        var screenY = anchorY + node.y;

        var dx = screenX - mouseX;
        var dy = screenY - mouseY;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;

        if (d < 80) {
          var force = (1 - d / 80) * 0.8;
          node.vx += (dx / d) * force;
          node.vy += (dy / d) * force * 0.35;
        }
      }
    }

    // 4. Handle drag state overrides
    if (dragging && rect.width > 0) {
      var last = nodes[numNodes - 1];
      var localX = dragMouseX - (rect.left + rect.width / 2);
      var localY = dragMouseY - rect.top;

      // Limit absolute distance
      var pullDist = Math.sqrt(localX * localX + localY * localY) || 1;
      if (pullDist > MAX) {
        localX = (localX / pullDist) * MAX;
        localY = (localY / pullDist) * MAX;
      }

      // Hard leash constraints
      if (localX < -70) localX = -70;
      if (localX > 70) localX = 70;
      if (localY < 15) localY = 15;

      last.x = localX;
      last.y = localY;
      last.vx = 0;
      last.vy = 0;

      // Check threshold and add visual cue
      var pulledDist = last.y - BASE;
      if (pulledDist > THRESH) {
        rope.classList.add("ready");
      } else {
        rope.classList.remove("ready");
      }
    } else {
      rope.classList.remove("ready");
    }

    // Lock anchor node
    nodes[0].x = 0;
    nodes[0].y = 0;
  }

  // Animation frame loop
  function tick() {
    updatePhysics();

    // Draw the braided rope on canvas
    ctx.clearRect(0, 0, 160, 360);

    var anchorX = 80;
    var anchorY = 0;

    // Draw shadow
    ctx.beginPath();
    ctx.moveTo(anchorX + 2, anchorY + 2);
    for (var i = 1; i < numNodes; i++) {
      ctx.lineTo(anchorX + nodes[i].x + 2, anchorY + nodes[i].y + 2);
    }
    var isDark = document.body.dataset.theme === "dark";
    ctx.strokeStyle = isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw main rope path
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    for (var i = 1; i < numNodes; i++) {
      ctx.lineTo(anchorX + nodes[i].x, anchorY + nodes[i].y);
    }
    
    var style = getComputedStyle(document.documentElement);
    var inkColor = (style.getPropertyValue("--ink") || "").trim() || "#0d0d0c";
    var bgColor = (style.getPropertyValue("--bg") || "").trim() || "#faf9f7";
    var accentColor = (style.getPropertyValue("--accent") || "").trim() || "#e0181b";

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw secondary spiral/braid dashes (accent color)
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    for (var i = 1; i < numNodes; i++) {
      ctx.lineTo(anchorX + nodes[i].x, anchorY + nodes[i].y);
    }
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();

    // Draw light stitching spiral dashes (bg color)
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    for (var i = 1; i < numNodes; i++) {
      ctx.lineTo(anchorX + nodes[i].x, anchorY + nodes[i].y);
    }
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 8]);
    ctx.lineDashOffset = 3;
    ctx.stroke();

    // Reset dash settings for canvas safety
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Position the tassel knob
    var last = nodes[numNodes - 1];
    grab.style.transform = "translate(calc(-50% + " + last.x.toFixed(1) + "px), " + last.y.toFixed(1) + "px)";

    requestAnimationFrame(tick);
  }

  // Setup event listeners
  rope.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (transitionInProgress) return;
    
    dragging = true;
    clickTime = Date.now();
    clickY = e.clientY;
    dragMouseX = e.clientX;
    dragMouseY = e.clientY;

    rope.classList.add("active");
    rope.setPointerCapture(e.pointerId);
  });

  window.addEventListener("pointermove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    if (dragging) {
      dragMouseX = e.clientX;
      dragMouseY = e.clientY;
    }
  }, { passive: true });

  function release(e) {
    if (!dragging) return;
    dragging = false;
    rope.classList.remove("active");
    rope.classList.remove("ready");

    var lastNode = nodes[numNodes - 1];
    var pulled = lastNode.y - BASE;
    var isClick = (Date.now() - clickTime < 240) && (Math.abs(e.clientY - clickY) < 8);

    if (isClick) {
      triggerClickPull();
    } else if (pulled > THRESH) {
      triggerThemeTransition();
    }
  }

  rope.addEventListener("pointerup", release);
  rope.addEventListener("pointercancel", release);

  rope.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerClickPull();
    }
  });

  // Start loop
  requestAnimationFrame(tick);
})();
