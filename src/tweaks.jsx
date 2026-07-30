import React from 'react';
import ReactDOM from 'react-dom/client';
import FilumedTweaks from './components/Tweaks';
import SceneSection from './components/SceneSection';

(function mountTweaks() {
  const host = document.createElement("div");
  host.id = "tweaks-root";
  document.body.appendChild(host);
  ReactDOM.createRoot(host).render(
    <React.StrictMode>
      <FilumedTweaks />
    </React.StrictMode>
  );

  // Toggle tweaks panel via 'T' key when running standalone
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "t" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      const panel = document.querySelector(".twk-panel");
      if (panel) {
        window.postMessage({ type: "__deactivate_edit_mode" }, "*");
      } else {
        window.postMessage({ type: "__activate_edit_mode" }, "*");
      }
    }
  });
})();

(function mountScene() {
  const contactContainer = document.getElementById("contact");
  if (contactContainer) {
    // Completely replace/render the section component
    ReactDOM.createRoot(contactContainer).render(
      <React.StrictMode>
        <SceneSection />
      </React.StrictMode>
    );
  }
})();

