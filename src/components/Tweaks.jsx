import React, { useEffect } from 'react';
import {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRadio,
  TweakColor,
  TweakSelect,
  TweakSlider,
  TweakToggle
} from './TweaksPanel';

export const FILUMED_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "Brutalist",
  "theme": "Dark",
  "accent": "#e0181b",
  "motion": 1,
  "cursor": true,
  "grain": true,
  "background": "Grain"
}/*EDITMODE-END*/;

export default function FilumedTweaks() {
  const [t, setTweak] = useTweaks(FILUMED_TWEAK_DEFAULTS);

  useEffect(() => {
    document.body.dataset.dir = String(t.direction).toLowerCase();
  }, [t.direction]);

  useEffect(() => {
    document.body.dataset.theme = String(t.theme).toLowerCase();
  }, [t.theme]);

  useEffect(() => {
    window.__toggleTheme = () => {
      setTweak("theme", String(t.theme).toLowerCase() === "dark" ? "Light" : "Dark");
    };
  }, [t.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.accent]);

  useEffect(() => {
    document.documentElement.style.setProperty("--dur", t.motion);
  }, [t.motion]);

  useEffect(() => {
    if (window.__setCursor) window.__setCursor(t.cursor);
  }, [t.cursor]);

  useEffect(() => {
    document.body.dataset.grain = t.grain ? "on" : "off";
  }, [t.grain]);

  useEffect(() => {
    if (window.__setBg) window.__setBg(t.background);
  }, [t.background, t.accent, t.direction, t.theme]);



  return (
    <TweaksPanel>
      <TweakSection label="Direction" />
      <TweakRadio
        label="Style"
        value={t.direction}
        options={["Brutalist", "Editorial", "Swiss"]}
        onChange={(v) => setTweak("direction", v)}
      />
      <TweakRadio
        label="Theme"
        value={t.theme}
        options={["Light", "Dark"]}
        onChange={(v) => setTweak("theme", v)}
      />
      <TweakColor
        label="Accent"
        value={t.accent}
        options={["#e0181b", "#0d0d0c", "#1644d9", "#c97b12"]}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakSection label="Background" />
      <TweakSelect
        label="Motion layer"
        value={t.background}
        options={["Grain", "Stars", "Red glow", "Film dust", "Dot grid", "Light leak", "Smoke", "None"]}
        onChange={(v) => setTweak("background", v)}
      />
      <TweakSection label="Motion" />
      <TweakSlider
        label="Speed"
        value={t.motion}
        min={0.5}
        max={2}
        step={0.1}
        unit="x"
        onChange={(v) => setTweak("motion", v)}
      />
      <TweakToggle
        label="Film cursor"
        value={t.cursor}
        onChange={(v) => setTweak("cursor", v)}
      />
      <TweakToggle
        label="Film grain"
        value={t.grain}
        onChange={(v) => setTweak("grain", v)}
      />

    </TweaksPanel>
  );
}
