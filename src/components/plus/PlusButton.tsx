'use client';

import { useRef } from 'react';

/**
 * Dugme koje odgovara na dodir.
 *
 * Iz tačke u kojoj je prst ili pokazivač pao širi se val do ivica dugmeta.
 * Val kreće TAMO GDJE je dodir, a ne iz sredine: to je jedina razlika između
 * "dugme se upalilo" i "ja sam ga upalio".
 *
 * ── Zašto val nije React stanje ───────────────────────────────────────────
 * Jer bi svaki klik iscrtavao cijelu formu — kalendar, sva polja, načine
 * plaćanja — samo da bi se jedan krug proširio i nestao. Ovako je `<span>`
 * stalno u JSX-u, React ga nikad ne mijenja, a dodir mu preko ref-a upiše
 * dvije koordinate i upali animaciju.
 *
 * Animacija se ponovo pokreće tako što se prvo skine oznaka pa vrati u
 * sljedećem kadru. Bez tog razmaka bi drugi brzi klik zatekao animaciju koja
 * već traje i ne bi se desilo ništa.
 */
export function PlusButton({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}) {
  const ripple = useRef<HTMLSpanElement>(null);

  function spread(event: React.PointerEvent<HTMLButtonElement>) {
    const node = ripple.current;
    if (!node) return;

    const box = event.currentTarget.getBoundingClientRect();
    node.style.setProperty('--rx', `${event.clientX - box.left}px`);
    node.style.setProperty('--ry', `${event.clientY - box.top}px`);

    node.removeAttribute('data-on');
    requestAnimationFrame(() => node.setAttribute('data-on', 'true'));
  }

  return (
    <button
      type={type}
      onClick={onClick}
      onPointerDown={spread}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`plus-press relative isolate overflow-hidden ${className}`}
    >
      <span ref={ripple} className="plus-ripple" aria-hidden="true" />
      {children}
    </button>
  );
}
