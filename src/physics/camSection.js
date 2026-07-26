/* FILUMED — Scroll-pinned image reveal section */
(function () {
  "use strict";

  function initCamSection() {
    var section = document.querySelector(".create-am-section");
    if (!section) return;

    var images = section.querySelectorAll(".cam-img");
    var dots = section.querySelectorAll(".cam-dot");
    if (!images.length) return;

    var currentIndex = 0;
    var isLocked = false;
    var isTransitioning = false;
    var idleTimer = null;
    var wheelAccum = 0;
    var WHEEL_THRESHOLD = 35;

    function updateActiveImage() {
      images.forEach(function (img, i) {
        img.classList.toggle("active", i === currentIndex);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === currentIndex);
      });
    }

    function lockScroll() {
      if (isLocked) return;
      isLocked = true;
      section.classList.add("is-pinned");
    }

    function unlockScroll() {
      if (!isLocked) return;
      isLocked = false;
      section.classList.remove("is-pinned");
      clearTimeout(idleTimer);
    }

    function advance(direction) {
      if (isTransitioning) return;
      var next = currentIndex + direction;

      if (next < 0) {
        unlockScroll();
        return;
      }
      if (next >= images.length) {
        unlockScroll();
        return;
      }

      isTransitioning = true;
      currentIndex = next;
      updateActiveImage();
      resetIdleTimer();

      setTimeout(function () {
        isTransitioning = false;
        wheelAccum = 0;
      }, 550);
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      if (isLocked) {
        idleTimer = setTimeout(function () {
          var nextDir = currentIndex >= images.length - 1 ? -1 : 1;
          advance(nextDir);
        }, 3200);
      }
    }

    dots.forEach(function (dot, idx) {
      dot.addEventListener("click", function () {
        if (isTransitioning || idx === currentIndex) return;
        isTransitioning = true;
        currentIndex = idx;
        updateActiveImage();
        resetIdleTimer();
        setTimeout(function () { isTransitioning = false; }, 550);
      });
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            if (!isLocked && (currentIndex === 0 || currentIndex === images.length - 1)) {
              lockScroll();
              resetIdleTimer();
            }
          } else {
            unlockScroll();
          }
        });
      },
      { threshold: [0.5] }
    );
    observer.observe(section);

    window.addEventListener(
      "wheel",
      function (e) {
        if (!isLocked) return;
        e.preventDefault();
        if (isTransitioning) return;

        wheelAccum += e.deltaY;
        if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
          var dir = wheelAccum > 0 ? 1 : -1;
          advance(dir);
        }
      },
      { passive: false }
    );

    window.addEventListener("keydown", function (e) {
      if (!isLocked) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        advance(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        advance(-1);
      }
    });

    var touchStartY = 0;
    window.addEventListener(
      "touchstart",
      function (e) {
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      function (e) {
        if (!isLocked) return;
        var delta = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(delta) > 40) {
          advance(delta > 0 ? 1 : -1);
        }
      },
      { passive: true }
    );

    updateActiveImage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCamSection);
  } else {
    initCamSection();
  }
})();
