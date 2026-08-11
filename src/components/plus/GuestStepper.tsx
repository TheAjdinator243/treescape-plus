'use client';

import { useRef, useState } from 'react';

import { PlusButton } from './PlusButton';

/**
 * Broj gostiju: dva dugmeta i broj koji se PREVRNE pri svakoj promjeni.
 *
 * Bio je padajući spisak. On radi, ali se ne dešava ništa: gost ga otvori,
 * odabere red i spisak se zatvori — pokret je preuzeo sistem, ne stranica.
 * Ovdje svaki dodir ima svoj odgovor: dugme pusti val, stari broj ode gore,
 * novi dođe odozdo, a figurice ispod se pale i gase jedna po jedna, pa se
 * količina vidi i bez čitanja brojke.
 *
 * ── Pristupačnost ─────────────────────────────────────────────────────────
 * Za čitač ekrana ovo ostaje jedno polje s brojem (`spinbutton`), s gornjom
 * i donjom granicom i tekstom koji se čita pri svakoj promjeni. Dugmad su
 * dodatak za oko i za prst, a ne jedini put do vrijednosti — strelice gore i
 * dolje rade isto.
 */
export function GuestStepper({
  value,
  max,
  onChange,
  label,
  text,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
  /** Ispisani oblik, npr. "2 gosta" — s ispravnim oblikom množine. */
  text: string;
  disabled?: boolean;
}) {
  /** Smjer posljednje promjene — po njemu broj zna ide li gore ili dolje. */
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const last = useRef(value);

  function set(next: number) {
    const clamped = Math.min(Math.max(next, 1), max);
    if (clamped === value) return;
    setDir(clamped > last.current ? 'up' : 'down');
    last.current = clamped;
    onChange(clamped);
  }

  return (
    <div className="plus-live">
      <p className="plus-label">{label}</p>

      <div className="plus-guest-box flex items-center gap-4 px-3 py-2.5" data-dir={dir}>
        <PlusButton
          onClick={() => set(value - 1)}
          disabled={disabled || value <= 1}
          aria-label={label}
          className="plus-step-btn"
        >
          <Minus />
        </PlusButton>

        <div
          role="spinbutton"
          tabIndex={0}
          aria-valuenow={value}
          aria-valuemin={1}
          aria-valuemax={max}
          aria-valuetext={text}
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault();
              set(value + 1);
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault();
              set(value - 1);
            }
          }}
          className="plus-guest-value flex-1 text-center focus-visible:outline-none"
        >
          {/* `key` je sama vrijednost: React pri promjeni pravi NOVI element,
              pa se animacija upali iznova. Bez njega bi se broj tiho prepisao. */}
          <span key={value} className="plus-roll plus-ink block text-lg font-medium">
            {text}
          </span>
        </div>

        <PlusButton
          onClick={() => set(value + 1)}
          disabled={disabled || value >= max}
          aria-label={label}
          className="plus-step-btn"
        >
          <Plus />
        </PlusButton>
      </div>

      {/* Figurice: onoliko upaljenih koliko je gostiju. Ne pišu ništa što
          brojka već ne kaže, pa ih čitač ekrana preskače. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className="plus-guest-dot"
            data-on={i < value}
            style={{ transitionDelay: `${Math.min(i, value) * 28}ms` }}
          >
            <Person />
          </span>
        ))}
      </div>
    </div>
  );
}

function Person() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Minus() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Plus() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
