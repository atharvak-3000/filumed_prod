/* FILUMED — loader, reveals, cursor, filters, carousel */
import portfolioData from './data/portfolio.json';

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var categoryTitles = {
    "events": "Events",
    "brand-content": "Brand Content",
    "concert": "Concerts",
    "podcast": "Podcasts",
    "short-film": "Short Films",
    "products": "Products",
    "hospitality-real-estate": "Hospitality & Real Estate",
    "documentary-travel": "Documentary & Travel"
  };

  function renderPortfolio() {
    var featuredContainer = document.getElementById("featured-showreel-container");
    var filtersContainer = document.getElementById("filters-container");
    var gridContainer = document.getElementById("work-grid-container");

    if (!portfolioData) return;

    if (featuredContainer && portfolioData.featured) {
      var feat = portfolioData.featured;
      featuredContainer.innerHTML =
        '<a class="feature-frame rv" href="#contact" data-youtube="' + feat.youtube + '">' +
        '<div class="ph ' + feat.ratio + '">' +
        '<div class="zoom"></div>' +
        '<div class="play"></div>' +
        '</div>' +
        '</a>';
    }

    if (filtersContainer && portfolioData.items) {
      var categories = {};
      portfolioData.items.forEach(function (item) {
        if (item.category) categories[item.category] = true;
      });

      var filterHtml = '<button class="chip on" data-filter="all">All</button>';
      Object.keys(categories).forEach(function (cat) {
        var label = categoryTitles[cat] || cat.replace(/-/g, ' ');
        filterHtml += '<button class="chip" data-filter="' + cat + '">' + label + '</button>';
      });
      filtersContainer.innerHTML = filterHtml;
    }

    if (gridContainer && portfolioData.items) {
      var itemsHtml = '';
      portfolioData.items.forEach(function (item) {
        var cardClass = 'card rv';
        var styleAttr = '';
        if (item.size === 'wide') {
          cardClass += ' wide';
        } else if (item.size === 'narrow') {
          cardClass += ' narrow';
        } else if (item.size === 'full') {
          cardClass += ' wide';
          styleAttr = ' style="grid-column: span 12;"';
        }

        var ratioLabel = item.ratio === 'r219' ? '21:9' : '16:9';
        var labelCat = categoryTitles[item.category] || item.category;

        itemsHtml +=
          '<a class="' + cardClass + '" href="#contact" data-cat="' + item.category + '" data-youtube="' + item.youtube + '"' + styleAttr + '>' +
          '<div class="ph ' + item.ratio + '">' +
          '<div class="zoom"></div>' +
          '<div class="play"></div>' +
          '<div class="ph-label">' + labelCat + ' &mdash; ' + ratioLabel + '</div>' +
          '</div>' +
          '<div class="meta">' +
          '<span class="mono client">' + item.client + '</span>' +
          '<div class="title display">' + item.title + '</div>' +
          '</div>' +
          '</a>';
      });
      gridContainer.innerHTML = itemsHtml;
    }
  }

  // Render before selecting DOM components
  renderPortfolio();

  /* ---------- camera shutter audio player (mixkit-camera-shutter-hard-click-1430) ---------- */
  var cameraClickAudio = null;
  try {
    cameraClickAudio = document.getElementById("shutter-audio-element");
    if (!cameraClickAudio) {
      cameraClickAudio = new Audio("/camera-click.mp3");
      cameraClickAudio.preload = "auto";
    }
  } catch (e) {}

  var globalAudioCtx = null;
  function getAudioContext() {
    if (!globalAudioCtx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(function(){});
    }
    return globalAudioCtx;
  }

  function autoPrewarmAudio() {
    getAudioContext();
    if (cameraClickAudio) {
      try {
        cameraClickAudio.load();
      } catch (e) {}
    }
  }

  // Fire pre-warmer automatically immediately on load, DOMContentLoaded, and first pointer/scroll
  autoPrewarmAudio();
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(autoPrewarmAudio, 5);
  } else {
    document.addEventListener("DOMContentLoaded", autoPrewarmAudio);
    window.addEventListener("load", autoPrewarmAudio);
  }
  window.addEventListener("mousemove", autoPrewarmAudio, { passive: true });
  window.addEventListener("pointerdown", autoPrewarmAudio, { passive: true });
  window.addEventListener("touchstart", autoPrewarmAudio, { passive: true });
  window.addEventListener("scroll", autoPrewarmAudio, { passive: true });

  function playCameraShutterSound() {
    autoPrewarmAudio();
    if (cameraClickAudio) {
      try {
        var snd = cameraClickAudio.cloneNode();
        snd.volume = 0.95;
        var p = snd.play();
        if (p !== undefined) {
          p.catch(function() {
            synthShutter();
          });
        }
      } catch (e) {
        synthShutter();
      }
    } else {
      synthShutter();
    }
  }

  function synthShutter() {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(function() { doSynth(ctx); }).catch(function(){});
      } else {
        doSynth(ctx);
      }
    } catch (e) {}
  }

  function doSynth(ctx) {
    try {
      var now = ctx.currentTime;
      var bufSize = Math.floor(ctx.sampleRate * 0.045);
      var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.12));
      }
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, now);

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.045);

      var buf2Size = Math.floor(ctx.sampleRate * 0.035);
      var buf2 = ctx.createBuffer(1, buf2Size, ctx.sampleRate);
      var data2 = buf2.getChannelData(0);
      for (var j = 0; j < buf2Size; j++) {
        data2[j] = (Math.random() * 2 - 1) * Math.exp(-j / (buf2Size * 0.1));
      }
      var noise2 = ctx.createBufferSource();
      noise2.buffer = buf2;

      var filter2 = ctx.createBiquadFilter();
      filter2.type = 'highpass';
      filter2.frequency.setValueAtTime(2800, now + 0.04);

      var gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.6, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      noise2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);
      noise2.start(now + 0.04);
      noise2.stop(now + 0.075);
    } catch (e) {}
  }

  /* ---------- loader: kinetic typography & logo reveal ---------- */
  var loader = document.getElementById("loader");
  function dismissLoader() {
    if (!loader || loader.classList.contains("gone")) return;
    loader.classList.add("gone");
    setTimeout(function () { loader.remove(); loader = null; }, 800);
    startHeroReveal();
  }

  function runLoader() {
    if (!loader) { startHeroReveal(); return; }
    if (reduceMotion || document.body.dataset.loader === "off") { dismissLoader(); return; }

    var stage = document.getElementById("word-stage");
    var WORDS = ["WE", "MAKE", "BRANDS", "TALK"];
    var OUTLINE_LAST_N = 2;

    var counterEl = document.getElementById("loader-counter");
    var counterVal = 1;
    var counterTimer = setInterval(function () {
      if (!loader || counterVal > 100) {
        clearInterval(counterTimer);
        return;
      }
      if (counterEl) {
        counterEl.textContent = (counterVal < 10 ? '0' : '') + counterVal;
      }
      counterVal += 1;
    }, 16);

    var LETTER_STAGGER = 18;
    var HOLD_TIME = 180;
    var EXIT_STAGGER = 12;
    var LETTER_IN_DUR = 180;
    var LETTER_OUT_DUR = 120;

    var IN_KEYFRAMES = [
      { transform: 'translateY(16px)', opacity: 0 },
      { transform: 'translateY(0px)', opacity: 1 }
    ];

    var OUT_KEYFRAMES = [
      { transform: 'translateY(0px)', opacity: 1 },
      { transform: 'translateY(-16px)', opacity: 0 }
    ];

    loader.addEventListener("click", dismissLoader);

    function buildWord(word) {
      if (!stage) return [];
      stage.innerHTML = '';
      var letters = word.split('');
      var spans = [];
      letters.forEach(function (ch, idx) {
        var span = document.createElement('span');
        span.textContent = (ch === ' ') ? '\u00A0\u00A0' : ch;
        if (idx >= letters.length - OUTLINE_LAST_N && ch !== ' ') {
          span.classList.add('outline');
        }
        stage.appendChild(span);
        spans.push(span);
      });
      return spans;
    }

    function animateIn(spans) {
      return new Promise(function (resolve) {
        var maxEnd = 0;
        spans.forEach(function (el, idx) {
          var delay = idx * LETTER_STAGGER;
          el.style.opacity = '0';
          try {
            el.animate(IN_KEYFRAMES, {
              duration: LETTER_IN_DUR,
              delay: delay,
              easing: 'cubic-bezier(.2,.8,.3,1)',
              fill: 'forwards'
            });
          } catch (e) {
            el.style.opacity = '1';
          }
          maxEnd = Math.max(maxEnd, delay + LETTER_IN_DUR);
        });
        setTimeout(resolve, maxEnd);
      });
    }

    function animateOut(spans) {
      return new Promise(function (resolve) {
        var maxEnd = 0;
        spans.forEach(function (el, idx) {
          var delay = idx * EXIT_STAGGER;
          try {
            el.animate(OUT_KEYFRAMES, {
              duration: LETTER_OUT_DUR,
              delay: delay,
              easing: 'cubic-bezier(.6,0,.9,.3)',
              fill: 'forwards'
            });
          } catch (e) {
            el.style.opacity = '0';
          }
          maxEnd = Math.max(maxEnd, delay + LETTER_OUT_DUR);
        });
        setTimeout(resolve, maxEnd);
      });
    }

    function wait(ms) {
      return new Promise(function (r) { setTimeout(r, ms); });
    }

    var chain = Promise.resolve();
    WORDS.forEach(function (word) {
      chain = chain.then(function () {
        if (!loader) return;
        if (word === "TALK") {
          playCameraShutterSound();
        }
        var spans = buildWord(word);
        return animateIn(spans).then(function () {
          return wait(HOLD_TIME);
        }).then(function () {
          return animateOut(spans);
        });
      });
    });

    chain.then(function () {
      if (!loader) return;
      clearInterval(counterTimer);
      if (counterEl) counterEl.textContent = "100";
      if (stage) stage.style.opacity = '0';
      loader.classList.add("reveal-active");
      playCameraShutterSound();
      return wait(900);
    }).then(function () {
      dismissLoader();
    });
  }

  /* ---------- scroll reveals ---------- */
  var heroBits = [];
  function startHeroReveal() {
    heroBits.forEach(function (el, n) {
      el.style.setProperty("--rv-i", n);
      requestAnimationFrame(function () { el.classList.add("in"); });
    });
  }

  function initReveals() {
    var hero = document.querySelector(".hero");
    document.querySelectorAll(".rv, .mask-line, .hero-rule").forEach(function (el) {
      if (hero && hero.contains(el)) { heroBits.push(el); return; }
      observer.observe(el);
    });
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

  var wipeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); wipeObserver.unobserve(e.target); }
    });
  }, { threshold: 0.25 });

  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      statObserver.unobserve(e.target);
      var node = e.target.firstChild; // text node "120"
      var target = parseInt(node.textContent, 10);
      if (isNaN(target) || reduceMotion) return;
      var start = performance.now(), durMs = 1400;
      (function tick(now) {
        var t = Math.min(1, (now - start) / durMs);
        var eased = 1 - Math.pow(1 - t, 3);
        node.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    });
  }, { threshold: 0.5 });

  /* stagger indices inside groups */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, n) {
      child.style.setProperty("--rv-i", n);
    });
  });

  /* ---------- custom cursor ---------- */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  var mx = -100, my = -100, rx = -100, ry = -100, cursorOn = false, rafId = null;

  function cursorLoop() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    if (dot) dot.style.transform = "translate(" + (mx - 4) + "px," + (my - 4) + "px)";
    if (ring) ring.style.transform = "translate(" + (rx - 19) + "px," + (ry - 19) + "px)";
    rafId = requestAnimationFrame(cursorLoop);
  }
  function setCursor(on) {
    cursorOn = on && !reduceMotion;
    document.body.classList.toggle("has-cursor", cursorOn);
    if (dot) dot.style.display = cursorOn ? "block" : "none";
    if (ring) ring.style.display = cursorOn ? "block" : "none";

    // Also toggle cursor-tag visibility based on cursor setting
    var tag = document.querySelector(".cursor-tag");
    if (tag) {
      if (!cursorOn) {
        tag.classList.remove("show");
        tag.style.display = "none";
      } else {
        tag.style.display = "";
      }
    }

    if (cursorOn && rafId === null) rafId = requestAnimationFrame(cursorLoop);
    if (!cursorOn && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
  document.addEventListener("mouseover", function (e) {
    if (!ring) return;
    ring.classList.toggle("hov", !!e.target.closest("a, button, .chip, .reel"));
  });
  window.__setCursor = setCursor;

  /* ---------- google sheets csv parser & cms integration ---------- */
  function parseCSV(csvText) {
    var lines = [];
    var row = [""];
    var inQuotes = false;

    for (var i = 0; i < csvText.length; i++) {
      var c = csvText[i];
      var next = csvText[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',') {
        if (inQuotes) {
          row[row.length - 1] += c;
        } else {
          row.push("");
        }
      } else if (c === '\r' || c === '\n') {
        if (inQuotes) {
          row[row.length - 1] += c;
        } else {
          if (c === '\r' && next === '\n') {
            i++;
          }
          lines.push(row);
          row = [""];
        }
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  }

  function convertCSVToPortfolio(rows) {
    if (rows.length < 2) return null;

    var headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });

    var typeIndex = headers.indexOf("type");
    var titleIndex = headers.indexOf("title");
    var clientIndex = headers.indexOf("client");
    var categoryIndex = headers.indexOf("category");
    var sizeIndex = headers.indexOf("size");
    var ratioIndex = headers.indexOf("ratio");
    var youtubeIndex = headers.indexOf("youtube");

    var data = {
      featured: null,
      items: []
    };

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (row.length < headers.length) continue;

      var type = typeIndex !== -1 ? row[typeIndex].trim().toLowerCase() : "";
      var title = titleIndex !== -1 ? row[titleIndex].trim() : "";
      var client = clientIndex !== -1 ? row[clientIndex].trim() : "";
      var category = categoryIndex !== -1 ? row[categoryIndex].trim() : "";
      var size = sizeIndex !== -1 ? row[sizeIndex].trim().toLowerCase() : "narrow";
      var ratio = ratioIndex !== -1 ? row[ratioIndex].trim().toLowerCase() : "r169";
      var youtube = youtubeIndex !== -1 ? row[youtubeIndex].trim() : "";

      if (!title && !youtube) continue;

      var item = {
        title: title,
        client: client,
        category: category,
        size: size,
        ratio: ratio,
        youtube: youtube
      };

      if (type === "featured" || type === "showreel") {
        item.tag = item.title;
        data.featured = item;
      } else {
        data.items.push(item);
      }
    }

    if (!data.featured && portfolioData) {
      data.featured = portfolioData.featured;
    }

    return data;
  }

  function initDynamicInteractiveElements() {
    var workSection = document.getElementById("work");
    if (workSection) {
      workSection.querySelectorAll(".rv").forEach(function (el) {
        observer.observe(el);
      });

      var gridContainer = document.getElementById("work-grid-container");
      if (gridContainer) {
        Array.prototype.forEach.call(gridContainer.children, function (child, n) {
          child.style.setProperty("--rv-i", n);
        });
      }
    }

    document.querySelectorAll(".ph").forEach(function (ph) {
      if (ph.closest(".svc-preview")) return;
      if (ph.querySelector(".wipe")) return;
      var wipe = document.createElement("div");
      wipe.className = "wipe";
      ph.appendChild(wipe);
      wipeObserver.observe(ph);
    });

    document.querySelectorAll("[data-youtube]").forEach(function (card) {
      var youtubeId = card.getAttribute("data-youtube");
      var ph = card.querySelector(".ph");
      if (youtubeId && ph && !ph.querySelector(".ph-thumb")) {
        var img = document.createElement("img");
        img.src = "https://img.youtube.com/vi/" + youtubeId + "/hqdefault.jpg";
        img.className = "ph-thumb";
        img.alt = card.querySelector(".title") ? card.querySelector(".title").textContent : "Video thumbnail";
        ph.insertBefore(img, ph.firstChild);
      }
    });

    var chips = document.querySelectorAll(".chip");
    var cards = document.querySelectorAll(".work-grid .card");
    chips.forEach(function (chip) {
      var newChip = chip.cloneNode(true);
      chip.parentNode.replaceChild(newChip, chip);

      newChip.addEventListener("click", function () {
        document.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
        newChip.classList.add("on");
        var f = newChip.dataset.filter;
        cards.forEach(function (card) {
          var show = f === "all" || card.dataset.cat === f;
          card.classList.toggle("hidden", !show);
          if (show) {
            card.classList.remove("in");
            card.style.setProperty("--rv-i", 0);
            requestAnimationFrame(function () {
              requestAnimationFrame(function () { card.classList.add("in"); });
            });
          }
        });
      });
    });
  }

  // Load Google Sheet asynchronously if URL configured
  if (portfolioData && portfolioData.googleSheetUrl) {
    fetch(portfolioData.googleSheetUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("Google Sheets CSV request failed");
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        var dynamicData = convertCSVToPortfolio(rows);
        if (dynamicData && dynamicData.items && dynamicData.items.length > 0) {
          renderPortfolio(dynamicData);
          initDynamicInteractiveElements();
        }
      })
      .catch(function (err) {
        console.warn("Failed to load Google Sheet, loaded local cache.", err);
      });
  }

  /* ---------- social cuts carousel ---------- */
  var row = document.querySelector(".reel-row");
  var prev = document.querySelector(".cuts-nav .prev");
  var next = document.querySelector(".cuts-nav .next");
  function reelStep() {
    var reel = row ? row.querySelector(".reel") : null;
    return reel ? reel.getBoundingClientRect().width + 24 : 320;
  }
  if (prev) prev.addEventListener("click", function () { row.scrollBy({ left: -reelStep(), behavior: "smooth" }); });
  if (next) next.addEventListener("click", function () { row.scrollBy({ left: reelStep(), behavior: "smooth" }); });

  /* ---------- nav active section ---------- */
  var navLinks = document.querySelectorAll(".nav-links a.navlink");
  var sections = [];
  navLinks.forEach(function (a) {
    var id = a.getAttribute("href");
    if (id && id.startsWith("#")) {
      var s = document.querySelector(id);
      if (s) sections.push({ a: a, s: s });
    }
  });
  var secObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        sections.forEach(function (x) {
          var active = x.s === e.target;
          x.a.style.color = active ? "var(--accent)" : "";
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(function (x) { secObserver.observe(x.s); });

  /* ---------- frame wipe reveals (bound in initDynamicInteractiveElements) ---------- */

  /* ---------- stat count-up ---------- */
  document.querySelectorAll(".stat .num").forEach(function (num) {
    statObserver.observe(num);
  });

  /* ---------- CTA ghost parallax ---------- */
  var ghost = document.querySelector(".cta .ghost");
  if (ghost && !reduceMotion) {
    window.addEventListener("scroll", function () {
      var r = ghost.parentElement.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        var p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        ghost.style.transform = "translateY(" + ((p - 0.5) * -120).toFixed(1) + "px)";
      }
    }, { passive: true });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduceMotion) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + dx * 0.18 + "px," + dy * 0.3 + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }


  /* ---------- scroll progress ---------- */
  var progressBar = document.querySelector(".progress-bar");
  window.addEventListener("scroll", function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar && max > 0) {
      progressBar.style.transform = "scaleX(" + (window.scrollY / max).toFixed(4) + ")";
    }
  }, { passive: true });

  /* ---------- cursor media tag (PLAY / DRAG) ---------- */
  var tag = document.querySelector(".cursor-tag");
  if (tag) {
    window.addEventListener("mousemove", function (e) {
      tag.style.left = e.clientX + "px";
      tag.style.top = (e.clientY - 28) + "px";
    }, { passive: true });
    document.addEventListener("mouseover", function (e) {
      var overReel = e.target.closest(".reel-row");
      var overFrame = e.target.closest(".ph");
      if (overReel) { tag.textContent = "Drag"; tag.classList.add("show"); }
      else if (overFrame && !overFrame.closest(".svc-preview")) { tag.textContent = "\u25cf Play"; tag.classList.add("show"); }
      else { tag.classList.remove("show"); }
    });
  }

  /* ---------- reels: drag to scroll ---------- */
  if (row) {
    var dragging = false, dragStartX = 0, dragStartScroll = 0;
    row.addEventListener("pointerdown", function (e) {
      dragging = true; dragStartX = e.clientX; dragStartScroll = row.scrollLeft;
      row.classList.add("dragging");
      row.setPointerCapture(e.pointerId);
    });
    row.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      row.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      row.addEventListener(ev, function () {
        dragging = false; row.classList.remove("dragging");
      });
    });
  }

  /* ---------- video modal lightbox ---------- */
  var videoModal = document.getElementById("video-modal");
  var videoModalOverlay = videoModal ? videoModal.querySelector(".video-modal-overlay") : null;
  var videoModalClose = videoModal ? videoModal.querySelector(".video-modal-close") : null;
  var videoRatioBox = videoModal ? videoModal.querySelector(".video-ratio-box") : null;
  var videoIframe = null;

  function openVideo(youtubeId) {
    if (!videoModal || !videoRatioBox) return;

    videoRatioBox.innerHTML = "";

    videoIframe = document.createElement("iframe");
    videoIframe.src = "https://www.youtube.com/embed/" + youtubeId + "?autoplay=1&rel=0&modestbranding=1&enablejsapi=1";
    videoIframe.setAttribute("allow", "autoplay; encrypted-media");
    videoIframe.setAttribute("allowfullscreen", "true");

    videoRatioBox.appendChild(videoIframe);

    videoModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeVideo() {
    if (!videoModal) return;

    videoModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    setTimeout(function () {
      if (videoRatioBox) {
        videoRatioBox.innerHTML = "";
      }
      videoIframe = null;
    }, 400);
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-youtube]");
    if (trigger) {
      e.preventDefault();
      var youtubeId = trigger.getAttribute("data-youtube");
      if (youtubeId) {
        openVideo(youtubeId);
      }
    }
  });

  if (videoModalOverlay) videoModalOverlay.addEventListener("click", closeVideo);
  if (videoModalClose) videoModalClose.addEventListener("click", closeVideo);

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && videoModal && videoModal.getAttribute("aria-hidden") === "false") {
      closeVideo();
    }
  });

  /* ---------- nav hide/show on scroll ---------- */
  var navHeader = document.querySelector("header.nav");
  if (navHeader) {
    var lastScrollY = window.scrollY;
    var scrollThreshold = 10;

    window.addEventListener("scroll", function () {
      var currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        navHeader.classList.remove("nav-hidden");
      } else if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
        navHeader.classList.add("nav-hidden");
      } else if (currentScrollY < lastScrollY) {
        navHeader.classList.remove("nav-hidden");
      }

      lastScrollY = currentScrollY;
    }, { passive: true });
  }


  /* ---------- boot ---------- */
  initDynamicInteractiveElements();
  initReveals();
  runLoader();
})();
