import React, { useEffect, useRef } from 'react';
import './CTASection.css';

export default function SceneSection() {
  const sectionRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const target = {
      x: 0,
      y: 0,
      glowX: 50,
      glowY: 50,
      dustX: 50,
      dustY: 50,
      dustTrailX: 0,
      dustTrailY: 0,
      dustAlpha: 0.2
    };
    const current = {
      x: 0,
      y: 0,
      glowX: 50,
      glowY: 50,
      dustX: 50,
      dustY: 50,
      dustTrailX: 0,
      dustTrailY: 0,
      dustAlpha: 0.2
    };
    let frameId = 0;
    let rect = null;
    const updateRect = () => {
      rect = section.getBoundingClientRect();
    };
    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });

    const setTargetFromPoint = (clientX, clientY) => {
      if (!rect) rect = section.getBoundingClientRect();
      const px = (clientX - rect.left) / (rect.width || 1);
      const py = (clientY - rect.top) / (rect.height || 1);
      if (pointerRef.current.x === 0 && pointerRef.current.y === 0) {
        pointerRef.current.x = clientX;
        pointerRef.current.y = clientY;
      }
      const dx = clientX - pointerRef.current.x;
      const dy = clientY - pointerRef.current.y;
      const speed = Math.min(1, Math.hypot(dx, dy) / 36);

      target.x = (px - 0.5) * 40;
      target.y = (py - 0.5) * 28;
      target.glowX = px * 100;
      target.glowY = py * 100;
      target.dustX = px * 100;
      target.dustY = py * 100;
      target.dustTrailX = dx * -0.85;
      target.dustTrailY = dy * -0.85;
      target.dustAlpha = 0.18 + speed * 0.4;

      pointerRef.current.x = clientX;
      pointerRef.current.y = clientY;
    };

    const handlePointerMove = (event) => {
      setTargetFromPoint(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      target.x = 0;
      target.y = 0;
      target.glowX = 50;
      target.glowY = 50;
      target.dustX = 50;
      target.dustY = 50;
      target.dustTrailX = 0;
      target.dustTrailY = 0;
      target.dustAlpha = 0.18;
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      current.glowX += (target.glowX - current.glowX) * 0.08;
      current.glowY += (target.glowY - current.glowY) * 0.08;
      current.dustX += (target.dustX - current.dustX) * 0.16;
      current.dustY += (target.dustY - current.dustY) * 0.16;
      current.dustTrailX += (target.dustTrailX - current.dustTrailX) * 0.12;
      current.dustTrailY += (target.dustTrailY - current.dustTrailY) * 0.12;
      current.dustAlpha += (target.dustAlpha - current.dustAlpha) * 0.12;

      target.dustTrailX *= 0.92;
      target.dustTrailY *= 0.92;

      section.style.setProperty('--pointer-shift-x', `${current.x.toFixed(2)}px`);
      section.style.setProperty('--pointer-shift-y', `${current.y.toFixed(2)}px`);
      section.style.setProperty('--pointer-glow-x', `${current.glowX.toFixed(2)}%`);
      section.style.setProperty('--pointer-glow-y', `${current.glowY.toFixed(2)}%`);
      section.style.setProperty('--dust-x', `${current.dustX.toFixed(2)}%`);
      section.style.setProperty('--dust-y', `${current.dustY.toFixed(2)}%`);
      section.style.setProperty('--dust-trail-x', `${current.dustTrailX.toFixed(2)}px`);
      section.style.setProperty('--dust-trail-y', `${current.dustTrailY.toFixed(2)}px`);
      section.style.setProperty('--dust-alpha', current.dustAlpha.toFixed(3));

      frameId = window.requestAnimationFrame(animate);
    };

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', updateRect);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="cta-section"
    >
      <div className="ghost-watermark" aria-hidden="true">FILUMED</div>
      <div className="wonder-bg-ambient" aria-hidden="true" />
      <div className="wonder-field" aria-hidden="true" />
      <div className="wonder-vignette" aria-hidden="true" />
      <div className="wonder-blob wonder-blob--1" aria-hidden="true" />
      <div className="wonder-blob wonder-blob--2" aria-hidden="true" />
      <div className="wonder-dust" aria-hidden="true" />
      <div className="wonder-grain" aria-hidden="true" />

      <div className="cta-inner-wrap">
        <div className="cta-kicker">Ready to roll?</div>
        <h2 className="cta-title">
          Let&apos;s make a <span className="cta-accent">scene.</span>
        </h2>
        <p className="cta-sub">
          Cinematic storytelling, sharper brand visuals, and production that feels as polished as the final frame.
        </p>
        <div className="cta-actions">
          <a className="cta-btn" href="mailto:hello@filumed.com">
            Start a project <span className="arr">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
