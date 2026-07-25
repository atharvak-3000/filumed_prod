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
