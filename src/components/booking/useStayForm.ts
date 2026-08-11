'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { addDaysStr, toDateStr } from '@/lib/dates';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { quoteStay, rangeHasConflict, validateStay } from '@/lib/pricing';
import type { BookingContext, PaymentMethod, PriceBreakdown } from '@/lib/types';

import { useAvailability } from './useAvailability';

/**
 * Cijela pamet rezervacije na jednom mjestu — bez ijednog piksela izgleda.
 *
 * Sajt ima dva izgleda (osnovni i `pro`), a rezervacija u oba mora raditi
 * ISTO. Da je forma prepisana dvaput, prva razlika bi se pojavila tiho: neko
 * bi popravio provjeru na jednoj strani, druga bi ostala kakva je bila, i tek
 * bi gost otkrio da jedna verzija prima ono što druga odbija.
 *
 * Zato ovdje stoje stanje, računanje cijene i provjere, a komponente odlučuju
 * samo kako to izgleda.
 */

export interface StayForm {
  slots: ReturnType<typeof useAvailability>;

  range: DateRange | undefined;
  setRange: (next: DateRange | undefined) => void;
  clearRange: () => void;

  guests: number;
  setGuests: (n: number) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  method: PaymentMethod | null;
  setMethod: (m: PaymentMethod) => void;

  /** Prvi dan boravka, ili `null` dok nije odabran. */
  start: string | null;
  /** Dan odlaska — ISKLJUČIV, kao `daterange(..., '[)')` u bazi. */
  end: string | null;
  /** Gost je odabrao jedan jedini dan, bez noćenja. */
  singleDay: boolean;
  complete: boolean;

  quote: PriceBreakdown | null;
  /** Razlog zbog kojeg odabrani termin ne prolazi, na jeziku gosta. */
  stayError: string | null;
  error: string | null;
  busy: boolean;

  submit: () => Promise<void>;
}

/**
 * Šta fali u podacima gosta — ime, mail, telefon, način plaćanja.
 *
 * Izdvojeno iz `formError` jer treba na DVA mjesta: ovdje, pri slanju, i u
 * "plus" izgledu, gdje se forma popunjava u koracima pa se mora znati smije
 * li se s podataka preći na potvrdu. Da su pravila prepisana na oba mjesta,
 * prva ispravka bi se desila samo na jednom — a to je tačno ono što ovaj
 * fajl inače sprečava.
 *
 * Redoslijed provjera je i redoslijed polja u formi, pa gost uvijek dobije
 * prigovor na prvo polje koje treba popraviti, a ne na neko pri dnu.
 */
export function guestDetailsError(
  fields: { name: string; email: string; phone: string; method: PaymentMethod | null },
  t: Dictionary
): string | null {
  if (!isName(fields.name)) return t.errors.REQUIRED_NAME;
  if (!isEmail(fields.email)) return t.errors.REQUIRED_EMAIL;
  if (!isPhone(fields.phone)) return t.errors.REQUIRED_PHONE;
  if (!fields.method) return t.errors.REQUIRED_METHOD;
  return null;
}

/**
 * Pravilo po polju — jedno po jedno.
 *
 * `guestDetailsError` javlja SAMO prvu grešku, jer je to sve što treba onome
 * ko šalje formu. Ali "plus" izgled pali kvačicu na svakom polju čim ono
 * postane ispravno, dok se još kuca, pa mu treba odgovor za svako posebno.
 *
 * Zato su pravila ovdje, a `guestDetailsError` ih zove — inače bi ista
 * provjera postojala na dva mjesta i prvi ispravak bi zahvatio samo jedno.
 */
export const isName = (value: string): boolean => value.trim().length >= 2;
export const isEmail = (value: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
export const isPhone = (value: string): boolean => value.trim().length >= 6;

export function useStayForm(context: BookingContext): StayForm {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { periods, settings, paymentMethods } = context;

  const slots = useAvailability(context.slots);

  const [range, setRangeState] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethodState] = useState<PaymentMethod | null>(paymentMethods[0] ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = range?.from ? toDateStr(range.from) : null;

  /**
   * Kraj boravka je uvijek ISKLJUČIV — baš kao `daterange(..., '[)')` u bazi.
   *
   * Zato se za odabir jednog jedinog dana (od = do) kraj pomjeri za jedan dan
   * naprijed: tako taj dan stvarno bude zauzet, a rezervacija bez noćenja
   * postane moguća. Za višednevni boravak kraj ostaje kakav je odabran, pa
   * dan odlaska ostaje slobodan sljedećem gostu (odjava u 09:00, prijava u 11:00).
   */
  const lastSelected = range?.to ? toDateStr(range.to) : null;
  const singleDay = Boolean(start && lastSelected && start === lastSelected);
  const end = lastSelected ? (singleDay ? addDaysStr(lastSelected, 1) : lastSelected) : null;

  const complete = Boolean(start && end);

  const quote = useMemo(
    () => (complete && start && end ? quoteStay(start, end, periods, settings) : null),
    [complete, start, end, periods, settings]
  );

  const stayError = useMemo(() => {
    if (!complete || !start || !end) return null;
    if (rangeHasConflict(start, end, slots)) return t.booking.unavailableRange;
    const result = validateStay(start, end, guests, periods, settings, locale);
    return result.ok ? null : result.message;
  }, [complete, start, end, guests, periods, settings, slots, locale, t]);

  function formError(): string | null {
    if (!complete) return t.booking.selectDatesFirst;
    return guestDetailsError({ name, email, phone, method }, t) ?? stayError;
  }

  async function submit() {
    const problem = formError();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          guests,
          // Cijena se NE šalje — server je računa sam iz baze.
          guest_name: name.trim(),
          guest_email: email.trim(),
          guest_phone: phone.trim(),
          note: note.trim() || null,
          payment_method: method,
        }),
      });

      const data = (await res.json()) as { token?: string; error?: string };

      if (!res.ok || !data.token) {
        setError(data.error ?? t.errors.SERVER_ERROR);
        setSubmitting(false);
        return;
      }

      // Spinner namjerno ostaje upaljen — stranica odlazi na potvrdu.
      router.push(`/rezervacija/${data.token}`);
    } catch {
      setError(t.errors.SERVER_ERROR);
      setSubmitting(false);
    }
  }

  /**
   * Čišćenje adrese za one koji su `#pregled` već sačuvali u prečici na
   * početnom ekranu ili u zabilješkama — inače bi im stranica zauvijek
   * otvarala na pregledu.
   */
  useEffect(() => {
    if (window.location.hash !== '#pregled') return;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return {
    slots,
    range,
    setRange: (next) => {
      setRangeState(next);
      setError(null);
    },
    clearRange: () => setRangeState(undefined),
    guests,
    setGuests,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    note,
    setNote,
    method,
    setMethod: (m) => {
      setMethodState(m);
      setError(null);
    },
    start,
    end,
    singleDay,
    complete,
    quote,
    stayError,
    error,
    busy: submitting,
    submit,
  };
}

/**
 * Skrol do pregleda BEZ diranja adrese.
 *
 * Ranije je ovo bio `<a href="#pregled">`, pa je nakon klika u adresi ostajao
 * `#pregled`. Preglednik onda pri svakom sljedećem otvaranju ili osvježavanju
 * skoči pravo na pregled umjesto na vrh stranice — a to je gost primijetio.
 */
export function scrollToSummary(): void {
  document.getElementById('pregled')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
