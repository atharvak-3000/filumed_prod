import React, { useEffect, useRef } from 'react';
import './CTASection.css';

export default function SceneSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const target = {
      mousePercentX: 50,
      mousePercentY: 50,
      relX: 0,
      relY: 0,
      opacity: 0
    };
    const current = {
      mousePercentX: 50,
      mousePercentY: 50,
      relX: 0,
      relY: 0,
      opacity: 0
    };

    let frameId = 0;
    let rect = null;
    const updateRect = () => {
      rect = section.getBoundingClientRect();
    };
    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });

    const handlePointerMove = (event) => {
      if (!rect) rect = section.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1)));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / (rect.height || 1)));

      target.mousePercentX = px * 100;
      target.mousePercentY = py * 100;
      target.relX = (px - 0.5) * 2;
      target.relY = (py - 0.5) * 2;
      target.opacity = 1;
    };

    const handlePointerLeave = () => {
      target.relX = 0;
      target.relY = 0;
      target.opacity = 0;
    };

    const animate = () => {
      const lerp = reduceMotion ? 1 : 0.12;
      current.mousePercentX += (target.mousePercentX - current.mousePercentX) * lerp;
      current.mousePercentY += (target.mousePercentY - current.mousePercentY) * lerp;
      current.relX += (target.relX - current.relX) * lerp;
      current.relY += (target.relY - current.relY) * lerp;
      current.opacity += (target.opacity - current.opacity) * lerp;

      const maxRotateX = -8;
      const maxRotateY = 10;
      const maxShiftX = 6;
      const maxShiftY = 3;

      const rx = reduceMotion ? 0 : current.relY * maxRotateX;
      const ry = reduceMotion ? 0 : current.relX * maxRotateY;
      const tx = reduceMotion ? 0 : current.relX * maxShiftX;
      const ty = reduceMotion ? 0 : current.relY * maxShiftY;

      section.style.setProperty('--mouse-x', `${current.mousePercentX.toFixed(2)}%`);
      section.style.setProperty('--mouse-y', `${current.mousePercentY.toFixed(2)}%`);
      section.style.setProperty('--spotlight-opacity', current.opacity.toFixed(3));
      section.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`);
      section.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`);
      section.style.setProperty('--tilt-tx', `${tx.toFixed(2)}px`);
      section.style.setProperty('--tilt-ty', `${ty.toFixed(2)}px`);

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
    <section ref={sectionRef} className="cta-section">
      <div className="ghost-watermark" aria-hidden="true">FLMD</div>
      <div className="cta-spotlight" aria-hidden="true" />
      <div className="cta-inner-wrap">
        <div className="cta-kicker">
          <span className="cta-kicker-dot" aria-hidden="true" />
          <span>Ready to roll?</span>
        </div>
        <h2 className="display cta-title">
          Let&apos;s make a <span className="cta-accent">scene.</span>
        </h2>
        <div className="cta-actions">
          <a className="btn btn-solid cta-btn" href="mailto:hello@filumed.com">
            Start a project <span className="arr">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
