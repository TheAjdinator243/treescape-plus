'use client';

import { useId, useState } from 'react';

/**
 * Polje koje reaguje dok se u njega kuca.
 *
 * Četiri stvari se dešavaju same, bez ijednog dugmeta:
 *
 *  1. Natpis se podigne iznad polja čim se u njemu nešto nađe ili čim se u
 *     njega uđe. Dok je polje prazno, natpis stoji U njemu — pa se ne troši
 *     red iznad svakog polja, a i dalje se zna šta se traži.
 *  2. Linija ispod polja se razvuče iz sredine kad polje dobije fokus.
 *  3. Kvačica se NACRTA čim ono što je upisano postane ispravno. Ne pojavi
 *     se gotova — nacrta se, potezom, jer je to jedino što se na ekranu vidi
 *     kao "primljeno".
 *  4. Ako se iz polja izađe s neispravnim sadržajem, polje se strese i
 *     linija pocrveni. Strese se pri IZLASKU, ne dok se kuca: crvenilo koje
 *     upada nakon prvog slova je prigovor na nešto što gost još piše.
 *
 * Prazno polje iz kojeg se izašlo bez ijednog slova ne prigovara. Gost koji
 * je samo prošao kroz formu nije ništa pogriješio.
 *
 * ── Šta ovdje NIJE ────────────────────────────────────────────────────────
 * Pravilo ispravnosti. Ono dolazi izvana (`valid`), iz istih funkcija koje
 * provjeravaju i slanje, pa polje ne može reći "u redu" za nešto što bi
 * server odbio.
 */
export function LiveField({
  label,
  value,
  onChange,
  valid,
  placeholder,
  type = 'text',
  autoComplete,
  disabled,
  rows,
  maxLength,
  optionalNote,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Je li ono što je upisano ispravno. `undefined` = polje se ne provjerava. */
  valid?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** Ako je zadano, umjesto jednog reda se crta okvir s više redova. */
  rows?: number;
  maxLength?: number;
  /** Dodatak uz natpis, npr. "(opcionalno)". */
  optionalNote?: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const filled = value.length > 0;
  const ok = valid === true && filled;
  // Prigovara se tek nakon izlaska iz polja, i samo ako je u njemu nešto.
  const bad = valid === false && filled && touched && !focused;
  const lifted = focused || filled;

  const shared = {
    id,
    value,
    disabled,
    placeholder: focused ? placeholder : ' ',
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setTouched(true);
    },
    'aria-invalid': bad || undefined,
    className: `plus-live-input ${rows ? 'resize-none pt-7' : ''}`,
  };

  return (
    <div className="plus-live" data-ok={ok} data-bad={bad} data-lifted={lifted}>
      <div className="plus-live-box">
        {rows ? (
          <textarea {...shared} rows={rows} />
        ) : (
          // `autoComplete` ide samo na jednorednо polje: bez njega preglednik
          // ne nudi već sačuvano ime, mail ni broj telefona, a to je na
          // telefonu razlika od pola minute kucanja.
          <input {...shared} type={type} autoComplete={autoComplete} />
        )}

        <label htmlFor={id} className="plus-live-label">
          {label}
          {optionalNote && <span className="plus-dimmer font-normal"> {optionalNote}</span>}
        </label>

        {/* Linija se razvlači iz sredine na obje strane — bez obzira na to
            teče li pismo slijeva ili zdesna, kreće odande gdje je i pogled. */}
        <span className="plus-live-underline" aria-hidden="true" />

        {valid !== undefined && (
          <svg className="plus-live-tick" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m5 13 4.2 4.2L19 7.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Brojač se pali tek na posljednjoj petini — ranije je to podatak
            koji niko ne traži, a zauzima ugao polja. */}
        {maxLength && rows && value.length > maxLength * 0.8 && (
          <span className="plus-live-count" aria-hidden="true">
            {maxLength - value.length}
          </span>
        )}
      </div>
    </div>
  );
}
