/* FILUMED — Interactive Cinematic Creation Showcase ("We create; stories that stay") */
(function () {
  "use strict";

  function initCamSection() {
    var section = document.querySelector(".create-am-section");
    if (!section) return;

    var images = section.querySelectorAll(".cam-img");
    if (!images.length) return;

    var currentIndex = 0;
    var isTransitioning = false;
    var autoplayTimer = null;
    var idleTimer = null;
    var isVisible = false;
    var touchStartY = 0;

    function setActive(index) {
      if (index === currentIndex && images[index].classList.contains("active")) return;
      
      images.forEach(function (img, idx) {
        if (idx === index) {
          img.classList.add("active");
        } else {
          img.classList.remove("active");
        }
      });
      currentIndex = index;
    }

    function step(dir) {
      if (isTransitioning) return;
      isTransitioning = true;

      var nextIndex = (currentIndex + dir + images.length) % images.length;
      setActive(nextIndex);

      setTimeout(function () {
        isTransitioning = false;
      }, 550);
    }

    function resetAutoplayTimer() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      if (idleTimer) clearTimeout(idleTimer);

      // Pause for 3 seconds after user interaction before resuming autoplay
      idleTimer = setTimeout(function () {
        startAutoplay();
      }, 3000);
    }

    function startAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = setInterval(function () {
        if (isVisible && !isTransitioning) {
          step(1);
        }
      }, 3500);
    }

    // 1. Wheel Navigation (Debounced scroll steps)
    section.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) < 15) return;
      resetAutoplayTimer();
      var dir = e.deltaY > 0 ? 1 : -1;
      step(dir);
    }, { passive: true });

    // 2. Keyboard Navigation (Arrow Keys when section is visible)
    window.addEventListener("keydown", function (e) {
      if (!isVisible) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        resetAutoplayTimer();
        step(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        resetAutoplayTimer();
        step(-1);
      }
    });

    // 3. Touch Navigation
    section.addEventListener("touchstart", function (e) {
      if (e.touches && e.touches.length) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    section.addEventListener("touchend", function (e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      var touchEndY = e.changedTouches[0].clientY;
      var deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaY) > 40) {
        resetAutoplayTimer();
        step(deltaY > 0 ? 1 : -1);
      }
    }, { passive: true });

    // 4. Intersection Observer for Visiblity & Autoplay Lifecycle
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            startAutoplay();
          } else {
            if (autoplayTimer) clearInterval(autoplayTimer);
            if (idleTimer) clearTimeout(idleTimer);
          }
        });
      }, { threshold: 0.3 });

      observer.observe(section);
    } else {
      isVisible = true;
      startAutoplay();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCamSection);
  } else {
    initCamSection();
  }
})();
