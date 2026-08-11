/**
 * Oblik jednog prevoda.
 *
 * Tip je pisan ručno, a ne izveden iz bosanskog rječnika, i to namjerno: ovako
 * TypeScript prijavi grešku čim engleskom ili arapskom fali makar jedan ključ.
 * Da je tip izveden iz `bs`, nedostajući prevod bi se vidio tek na ekranu.
 */

import type { Locale } from './config';

/**
 * Oblici jednine i množine, po CLDR kategorijama.
 *
 * Bosanski koristi `one` / `few` / `other` (1 dan, 2 dana, 5 dana), engleski
 * `one` / `other`, a arapski svih šest. `other` je jedini obavezan jer je
 * ujedno i posljednja odbrana kad `Intl.PluralRules` vrati kategoriju koju
 * jezik inače ne koristi.
 */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Sadržaji kuće — ključ vezuje tekst za ikonu u `Amenities.tsx`. */
export type AmenityKey =
  | 'pool'
  | 'fountain'
  | 'wifi'
  | 'kitchen'
  | 'fire'
  | 'grill'
  | 'car'
  | 'heat'
  | 'washer'
  | 'tv'
  | 'pet'
  | 'tree'
  | 'coffee'
  | 'towel';

/** Odredišta u blizini — vremena vožnje stoje u `Location.tsx`. */
export type PlaceKey = 'city' | 'airport' | 'shop';

export interface QuestionAnswer {
  q: string;
  a: string;
}

/** Jedan korak u objašnjenju kako rezervacija teče. */
export interface Step {
  title: string;
  body: string;
}

/** Podaci iz postavki bez kojih se česta pitanja ne mogu napisati do kraja. */
export interface FaqFacts {
  checkinTime: string;
  checkoutTime: string;
  maxGuests: number;
}

export interface Dictionary {
  site: {
    name: string;
    tagline: string;
    description: string;
    keywords: string[];
  };

  language: {
    /** Opis polja za čitače ekrana. */
    label: string;
    /** Naziv svakog jezika — uvijek na tom jeziku, da ga prepozna i onaj ko sajt ne razumije. */
    names: Record<Locale, string>;
    /** Pitanje na ulaznom ekranu, prije nego se sajt uopće vidi. */
    gateTitle: string;
    gateLead: string;
    /**
     * Nepromjenjiv opis za čitače ekrana. Naslov na ulazu se smjenjuje kroz
     * jezike, a čitač ekrana ne smije to čitati u krug.
     */
    gateAria: string;
  };

  nav: {
    about: string;
    gallery: string;
    amenities: string;
    location: string;
    faq: string;
    book: string;
    menu: string;
    close: string;
    skipToBooking: string;
    mainNav: string;
  };

  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    /** Drugo, tiše dugme uz glavno — vodi na galeriju umjesto na kalendar. */
    secondaryCta: string;
    scroll: string;
    imageAlt: string;
    /**
     * Prvi slobodan datum, izračunat iz istih termina koje crta kalendar
     * (`firstFreeDate` u `lib/pricing.ts`). Datum stiže već ispisan na jeziku
     * gosta, pa rječnik oko njega samo sastavi rečenicu.
     */
    freeFrom: (date: string) => string;
    /** Kad je slobodno već danas — "od danas" bi zvučalo kao da nije. */
    freeToday: string;
  };

  /**
   * Kako rezervacija teče, u tri koraka.
   *
   * Nije ukras nego odgovor na pitanje koje gost inače postavi telefonom:
   * "jesam li ja ovo sad rezervisao ili nisam?". Isto piše i u čestim
   * pitanjima, ali tamo ga pročita tek onaj ko dotle dođe.
   */
  steps: {
    eyebrow: string;
    heading: string;
    lead: string;
    /** Tačno tri — raspored ih slaže u tri kolone i broji od 01 do 03. */
    items: [Step, Step, Step];
  };

  /** Posljednji poziv na rezervaciju, prije podnožja. */
  finalCta: {
    heading: string;
    lead: string;
    /** Za one koji radije pitaju nego kliknu. */
    contact: string;
  };

  about: {
    heading: string;
    lead: string;
    body: string[];
    imageAlt: string;
    stats: {
      guests: string;
      bedrooms: string;
      bathrooms: string;
    };
  };

  gallery: {
    heading: string;
    lead: string;
    open: string;
    prev: string;
    next: string;
    close: string;
    counter: (index: number, total: number) => string;
    /** Privremeni opis dok stoje označene prazne slike (vidi `lib/gallery.ts`). */
    itemAlt: (n: number) => string;
    itemCaption: (n: number) => string;
  };

  amenities: {
    heading: string;
    lead: string;
    items: Record<AmenityKey, { label: string; note: string }>;
  };

  /**
   * Ono što kuća ima, ispričano fotografijom.
   *
   * Koristi ga samo "plus" izgled: umjesto mreže sličica i kartica s ikonama,
   * svaka stavka je jedan red — fotografija s jedne strane, naslov i opis s
   * druge. Tekst NIKAD ne ide preko slike.
   *
   * `item` se traži po rednom broju fotografije (isti onaj iz `lib/gallery.ts`),
   * a ne po položaju u nizu: tako se raspored slika može mijenjati, a tekst
   * ostaje vezan za svoju sliku.
   */
  showcase: {
    eyebrow: string;
    heading: string;
    lead: string;
    item: (n: number) => Step;
    /** Sve ostalo — ono što nema svoju fotografiju. */
    extraTitle: string;
    extraLead: string;
  };

  location: {
    heading: string;
    lead: string;
    mapTitle: string;
    /** Tekst dugmeta koje otvara Google Mape u novoj kartici. */
    openInMaps: string;
    /** Dodaje se čitačima ekrana — link napušta sajt. */
    opensInNewTab: string;
    driveTime: (minutes: number) => string;
    places: Record<PlaceKey, string>;
  };

  faq: {
    heading: string;
    lead: string;
    items: (facts: FaqFacts) => QuestionAnswer[];
  };

  booking: {
    heading: string;
    lead: string;

    pickDates: string;
    checkIn: string;
    checkOut: string;
    notSelected: string;
    clearDates: string;

    legendFree: string;
    legendTaken: string;
    legendSelected: string;

    guests: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    note: string;
    notePlaceholder: string;
    optional: string;

    summaryTitle: string;
    daysLabel: (n: number) => string;
    total: string;
    seasonalNote: string;
    weekendNote: string;
    singleDayNote: string;
    /**
     * Vrijeme prijave i odjave iz postavki — isti tekst na sajtu, na potvrdi i
     * u mailu, da se ne mogu razići kad vlasnik promijeni sate.
     */
    timesNote: (checkIn: string, checkOut: string) => string;

    payMethodTitle: string;
    payTransfer: string;
    payTransferHint: string;
    payCash: string;
    payCashHint: string;
    payTest: string;
    payTestHint: string;

    reserve: string;
    submitting: string;

    selectDatesFirst: string;
    singleDayHint: string;
    unavailableRange: string;

    /**
     * Forma u koracima — koristi je samo "plus" izgled.
     *
     * Oznake su kratke jer stoje u traci napretka, gdje na telefonu tri
     * natpisa dijele širinu ekrana.
     */
    wizard: {
      dates: string;
      details: string;
      review: string;
      next: string;
      back: string;
      /** Za čitače ekrana: "Korak 2 od 3". */
      stepOf: (step: number, total: number) => string;
      /** Naslov iznad pregleda na posljednjem koraku. */
      reviewLead: string;
    };
  };

  confirmation: {
    pageTitle: string;

    confirmedTitle: string;
    confirmedLead: string;
    pendingTitle: string;
    pendingLead: string;
    transferTitle: string;
    transferLead: string;
    inactiveTitle: string;
    inactiveLead: string;

    transferHeading: string;
    transferRecipient: string;
    transferBank: string;
    transferIban: string;
    transferReference: string;
    transferAmount: string;
    transferDeadline: string;
    transferNote: string;
    copy: string;
    copied: string;

    pendingBadge: string;
    awaitingTransfer: string;
    confirmedBadge: string;
    heldNote: string;
    reference: string;
    stay: string;
    guestsLabel: string;
    totalLabel: string;
    payOnArrival: string;
    paid: string;
    testBooking: string;
    whatNext: string;
    whatNextBody: string;
    backHome: string;

    /** Gost sam otkazuje svoju rezervaciju, sa stranice s potvrdom. */
    cancelBooking: string;
    cancelReasonLabel: string;
    cancelReasonPlaceholder: string;
    cancelReasonRequired: string;
    cancelSubmit: string;
    cancelSubmitting: string;
    cancelAbort: string;
  };

  errors: {
    DATES_TAKEN: string;
    INVALID_RANGE: string;
    PAST_DATE: string;
    MAX_DAYS: (n: number) => string;
    TOO_MANY_GUESTS: (n: number) => string;
    INVALID_INPUT: string;
    REQUIRED_NAME: string;
    REQUIRED_EMAIL: string;
    REQUIRED_PHONE: string;
    REQUIRED_METHOD: string;
    METHOD_UNAVAILABLE: string;
    SERVER_ERROR: string;
    NOT_ALLOWED: string;
    MAX_BELOW_MIN: string;
    ALREADY_RESOLVED: string;
    DATABASE_MISSING: string;
    ADMIN_MISSING: string;
    ADMIN_CODE_WEAK: (min: number) => string;
    TOO_MANY_REQUESTS: string;
  };

  admin: {
    gateTitle: string;
    gateLead: string;
    gateCode: string;
    gateTotp: string;
    gateTotpHint: string;
    gateSubmit: string;
    gateWrong: string;
    gateLocked: string;
    gateNotConfigured: string;
    databaseNotConfigured: string;

    logout: string;
    title: string;

    tabRequests: string;
    tabBookings: string;
    tabCalendar: string;
    tabPricing: string;

    requestsHeading: string;
    requestsEmpty: string;
    /** Provjera kanala obavijesti — šalje probnu poruku na Telegram. */
    testNotification: string;
    /** Šalje gostov mail na vlasnikovu adresu, radi provjere. */
    testGuestEmail: string;
    testNotificationSending: string;
    approve: string;
    reject: string;
    approveConfirm: string;
    rejectConfirm: string;
    /** Pitanje za razlog — gost ga dobija u mailu. */
    rejectReasonPrompt: string;
    cancelReasonPrompt: string;
    receivedAt: (when: string) => string;
    byCash: string;
    byTransfer: string;

    bookingsHeading: string;
    bookingsEmpty: string;

    /** Pretraga u spisku svih rezervacija. */
    searchLabel: string;
    searchPlaceholder: string;
    searchClear: string;
    searchCount: (found: number, total: number) => string;
    searchNothing: string;
    colStay: string;
    colGuest: string;
    colMethod: string;
    colStatus: string;
    colAmount: string;
    cancel: string;
    cancelConfirm: string;

    calendarHeading: string;
    calendarLead: string;
    blockReason: string;
    blockReasonPlaceholder: string;
    blockSubmit: string;
    blockedHeading: string;
    blockedEmpty: string;
    unblock: string;
    unblockConfirm: string;

    pricingHeading: string;
    pricingLead: string;
    defaultNightly: string;
    weekendPrice: string;
    weekendPriceHint: string;
    maxNights: string;
    maxGuests: string;
    holdMinutes: string;
    checkinFrom: string;
    checkoutBy: string;
    currency: string;
    currencySymbol: string;
    save: string;
    saved: string;

    seasonsHeading: string;
    seasonsLead: string;
    seasonName: string;
    seasonNamePlaceholder: string;
    seasonFrom: string;
    seasonTo: string;
    seasonToHint: string;
    seasonPeriod: string;
    seasonPrice: string;
    seasonPriority: string;
    seasonAdd: string;
    seasonDelete: string;
    seasonDeleteConfirm: string;
    seasonsEmpty: string;

    statusLabels: Record<string, string>;
    methodLabels: Record<string, string>;

    markPaid: string;
    markPaidConfirm: string;
    transfersHeading: string;
    transfersEmpty: string;
    transferRef: string;
    deadlineAt: string;

    bankHeading: string;
    bankLead: string;
    bankAccountName: string;
    bankAccountNamePlaceholder: string;
    bankName: string;
    bankNamePlaceholder: string;
    bankIban: string;
    bankIbanPlaceholder: string;
    bankIbanHint: string;
    transferDays: string;
  };

  common: {
    from: string;
    day: string;
    loading: string;
    tryAgain: string;
    days: PluralForms;
    guests: PluralForms;
  };

  footer: {
    contact: string;
    quickLinks: string;
    rights: string;
    /** Gruba adresa uz kontakt — tačnu gost dobija tek nakon potvrde. */
    address: string;
    /** Linkovi u dnu — pravni tekstovi. */
    privacy: string;
    terms: string;
  };

  email: {
    greeting: (name: string) => string;
    rowStay: string;
    rowGuests: string;
    rowAmount: string;
    rowReference: string;
    rowGuest: string;
    rowEmail: string;
    rowPhone: string;
    rowNote: string;

    addressLater: string;
    payOnArrival: string;

    confirmedSubject: string;
    confirmedTitle: string;
    confirmedBody: string;

    transferSubject: string;
    transferTitle: string;
    transferBody: string;
    transferHeading: string;
    transferRecipient: string;
    transferBank: string;
    transferIban: string;
    transferReference: string;
    transferAmount: string;
    transferDeadline: string;
    transferWarning: string;

    cashRequestSubject: string;
    cashRequestTitle: string;
    cashRequestBody: string;

    cashApprovedSubject: string;
    cashApprovedTitle: string;
    cashApprovedBody: string;

    /** Otkazana POTVRĐENA rezervacija — nije isto što i odbijen zahtjev. */
    cancelledSubject: string;
    cancelledTitle: string;
    cancelledBody: string;
    /** Naslov iznad razloga koji je domaćin upisao. */
    reasonLabel: string;
    /** Dugme u mailu koje vodi na stranicu s rezervacijom. */
    openBooking: string;
    /** Vlasniku — gost je sam otkazao. */
    ownerGuestCancelledTitle: string;

    cashRejectedSubject: string;
    cashRejectedTitle: string;
    cashRejectedBody: string;

    ownerCashTitle: string;
    ownerTransferTitle: string;
    ownerCardTitle: string;
    ownerCashHint: string;
    ownerTransferHint: string;
    ownerOpenAdmin: string;
  };
}
