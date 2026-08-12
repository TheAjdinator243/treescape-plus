import Link from 'next/link';

import type { LegalDoc } from '@/lib/legal';
import { operatorNijePopunjen } from '@/lib/legal';

/**
 * Prikaz pravnog teksta — isti okvir za politiku privatnosti i uslove.
 *
 * Namjerno bez ijedne animacije i bez fotografija: ovo je stranica koju gost
 * otvara kad hoće nešto provjeriti, a ne kad hoće da mu se sviđa. Mjera reda
 * je oko 70 znakova, jer se ovo zaista čita, a ne preleti.
 *
 * Boje idu preko istih promjenljivih kao ostatak sajta, pa i ova stranica
 * prati `data-skin`.
 *
 * ── Upozorenje na vrhu ────────────────────────────────────────────────────
 * Dok podaci o pružaocu usluge stoje na zamjenskim vrijednostima, iznad teksta
 * stoji vidljiva traka. Politika privatnosti bez imena onoga na koga se odnosi
 * je papir bez potpisa, a najlakše ju je objaviti upravo takvu — pa neka smeta
 * dok se ne popuni.
 */
export function PlusLegal({
  doc,
  backLabel,
  backHref,
}: {
  doc: LegalDoc;
  backLabel: string;
  /** Početna NA ISTOM JEZIKU — '/en', a ne '/'. */
  backHref: string;
}) {
  return (
    <main className="plus-surface">
      <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-8 sm:py-28">
        <h1 className="plus-ink text-4xl leading-tight sm:text-5xl">{doc.title}</h1>

        <p className="plus-dim mt-5 text-lg leading-relaxed">{doc.lead}</p>
        <p className="plus-dimmer mt-2 text-sm">{doc.updated}</p>

        {operatorNijePopunjen() && (
          <p role="alert" className="plus-alert mt-8 px-5 py-4 text-sm leading-relaxed">
            {doc.incompleteWarning}
          </p>
        )}

        <div className="mt-14 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="plus-ink text-2xl">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="plus-dim mt-3 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <Link href={backHref} className="plus-btn-ghost mt-16 inline-flex">
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
