/**
 * Bosanski — jezik kuće i mjerilo za sve ostale prevode.
 *
 * Kad se dodaje novi tekst, prvo ide ovdje, pa u `dictionary.ts`, pa u `en` i
 * `ar` — obrnutim redom TypeScript ne bi imao šta prijaviti.
 */

import type { Dictionary } from '../dictionary';
import { count, plural } from '../plural';

export const bs: Dictionary = {
  site: {
    name: 'TreeScape',
    tagline: 'Vila u zagrljaju šume',
    description:
      'TreeScape je vila okružena šumom — mir, priroda i sva udobnost doma. Provjerite slobodne termine i rezervišite online.',
    keywords: [
      'TreeScape',
      'vila',
      'apartman',
      'smještaj',
      'najam kuće',
      'odmor u prirodi',
      'rezervacija',
      'Bosna i Hercegovina',
    ],
  },

  language: {
    label: 'Jezik',
    names: { bs: 'Bosanski', en: 'English', ar: 'العربية' },
    gateTitle: 'Odaberite jezik',
    gateLead: 'Na kojem jeziku želite pregledati sajt?',
    gateAria: 'Odaberite jezik: Bosanski, English, العربية',
  },

  nav: {
    about: 'O kući',
    gallery: 'Galerija',
    amenities: 'Sadržaji',
    location: 'Lokacija',
    faq: 'Pitanja',
    book: 'Rezerviši',
    menu: 'Meni',
    close: 'Zatvori',
    skipToBooking: 'Preskoči na rezervaciju',
    mainNav: 'Glavna navigacija',
  },

  hero: {
    eyebrow: 'Privatna vila za odmor',
    title: 'TreeScape',
    subtitle: 'Probudite se uz zvuk šume, a ne uz zvuk grada.',
    cta: 'Provjeri dostupnost',
    secondaryCta: 'Pogledaj kuću',
    scroll: 'Saznaj više',
    imageAlt: 'Vila TreeScape',
    freeFrom: (date) => `Prvi slobodan termin: ${date}`,
    freeToday: 'Slobodno već danas',
  },

  steps: {
    eyebrow: 'Kako to ide',
    heading: 'Od datuma do ključa, u tri koraka',
    lead: 'Bez poziva, bez čekanja na odgovor da biste uopće vidjeli šta je slobodno.',
    items: [
      {
        title: 'Odaberite datume',
        body: 'Kalendar uživo pokazuje šta je slobodno, a cijena se računa dok birate — osnovna, vikend i sezonska, bez skrivenih stavki.',
      },
      {
        title: 'Pošaljite zahtjev',
        body: 'Termin se odmah zaključava za vas i ostalim gostima se prikazuje kao zauzet. Niko vam ga u međuvremenu ne može uzeti.',
      },
      {
        title: 'Domaćin potvrdi',
        body: 'Odluka stiže na vaš mail, a stranica s potvrdom se osvježi sama.',
      },
    ],
  },

  finalCta: {
    heading: 'Šuma je ista i u utorak',
    lead: 'Provjerite slobodne termine i rezervišite za koji minut. Ako vam nešto nije jasno, javite se — odgovaramo isti dan.',
    contact: 'Pitajte nas',
  },

  about: {
    heading: 'Dobrodošli u TreeScape',
    lead: 'Kuća skrivena među stablima, dovoljno blizu da se lako dođe, a dovoljno daleko da se konačno odmorite.',
    body: [
      'TreeScape je porodična vila okružena visokom šumom, sa velikom terasom okrenutom prema dolini. Unutra je sve što treba za duži boravak — potpuno opremljena kuhinja, topla dnevna soba s kaminom i sobe u kojima se stvarno naspavate.',
      'Idealno za porodični odmor, bijeg s prijateljima na vikend ili mirnu sedmicu rada iz prirode. Ljeti roštilj i duge večeri na terasi, zimi snijeg i vatra u kaminu.',
    ],
    imageAlt: 'Vila TreeScape izvana',
    stats: {
      guests: 'gostiju',
      bedrooms: 'spavaće sobe',
      bathrooms: 'kupatila',
    },
  },

  gallery: {
    heading: 'Galerija',
    lead: 'Pogledajte kako izgleda vaš sljedeći odmor.',
    open: 'Otvori sliku',
    prev: 'Prethodna slika',
    next: 'Sljedeća slika',
    close: 'Zatvori galeriju',
    counter: (index, total) => `${index} / ${total}`,
    /**
     * Opis svake fotografije, po njenom rednom broju (vidi `lib/gallery.ts`).
     * `alt` čita čitač ekrana i Google; natpis se vidi pri prelasku mišem i
     * ispod uvećane slike.
     */
    itemAlt: (n) =>
      (
        ({
          2: 'Bazen i terasa u ljetno popodne',
          3: 'Natkrivena terasa s pogledom na dolinu',
          4: 'Bazen i ležaljke pod noćnim svjetlima',
          5: 'Zalazak sunca iznad bazena',
          6: 'Jacuzzi na terasi, okrenut prema šumi',
          7: 'Zidani roštilj i kamin pod drvenom nadstrešnicom',
          8: 'Spavaća soba u potkrovlju s drvenim gredama',
          9: 'Proslava postavljena u dvorištu',
        }) as Record<number, string>
      )[n] ?? 'Fotografija kuće',
    itemCaption: (n) =>
      (
        ({
          2: 'Bazen i terasa',
          3: 'Terasa s pogledom',
          4: 'Bazen noću',
          5: 'Zalazak nad bazenom',
          6: 'Jacuzzi',
          7: 'Roštilj i kamin',
          8: 'Soba u potkrovlju',
          9: 'Proslave u dvorištu',
        }) as Record<number, string>
      )[n] ?? 'Fotografija kuće',
  },

  amenities: {
    heading: 'Šta vas čeka',
    lead: 'Sve je već tu — vi ponesite samo torbu.',
    items: {
      pool: { label: 'Bazen', note: 'Grijan toplotnom pumpom' },
      fountain: { label: 'Šadrvan', note: 'U dvorištu, uz sjedeću garnituru' },
      wifi: { label: 'Internet', note: 'Bežični, u cijeloj kući' },
      kitchen: { label: 'Opremljena kuhinja', note: 'Sve posuđe i aparati' },
      fire: { label: 'Kamin', note: 'Drva su obezbijeđena' },
      grill: { label: 'Roštilj i vrtna garnitura', note: 'Za duge ljetne večeri' },
      car: { label: 'Besplatan parking', note: 'Do tri vozila u dvorištu' },
      heat: { label: 'Centralno grijanje', note: 'Toplo i usred zime' },
      washer: { label: 'Mašina za veš', note: 'I sušilica za rublje' },
      tv: { label: 'Smart TV', note: 'Netflix i lokalni kanali' },
      pet: { label: 'Ljubimci dobrodošli', note: 'Uz prethodnu najavu' },
      tree: { label: 'Velika bašta', note: '2000 m² ograđenog placa' },
      coffee: { label: 'Aparat za kafu', note: 'Domaća kafa i espresso' },
      towel: { label: 'Posteljina i peškiri', note: 'Uključeno u cijenu' },
    },
  },


  showcase: {
    eyebrow: 'Šta vas čeka',
    heading: 'Kuća, dio po dio',
    lead: 'Ono što se ne vidi s fotografije na vrhu — od bazena do potkrovlja.',
    item: (n) =>
      (
        {
          2: {
            title: 'Bazen',
            body: 'Grijan toplotnom pumpom, veličine 7,5 × 3 m — dovoljno velik za plivanje, a ugodan i djeci. Oko njega popločana terasa s ležaljkama i sjedećom garniturom.',
          },
          3: {
            title: 'Natkrivena terasa',
            body: 'Duge klupe i stolovi pod drvenom nadstrešnicom, okrenuti prema dolini. Ovdje se doručkuje, i ovdje se obično ostane do mraka.',
          },
          4: {
            title: 'Večeri uz bazen',
            body: 'Kad padne mrak, dvorište se upali. Svjetla uz ogradu, ležaljke uz vodu i tišina koju prekida samo šuma.',
          },
          5: {
            title: 'Zalazak nad dolinom',
            body: 'Predvečerje uz bazen, s pogledom preko krošanja. Ovo je onaj dio dana zbog kojeg gosti ostanu duže nego što su planirali.',
          },
          6: {
            title: 'Jacuzzi',
            body: 'Na terasi, okrenut prema šumi. Topao i onda kad je vani hladno — koristi se i u proljeće i u jesen.',
          },
          7: {
            title: 'Roštilj i kamin',
            body: 'Zidani roštilj pod drvenom nadstrešnicom, s ognjištem i složenim drvima. Drva su obezbijeđena, sjedi se odmah uz vatru.',
          },
          8: {
            title: 'Spavaće sobe',
            body: 'Potkrovlje pod drvenim gredama. U kući su dvije spavaće sobe i mjesta za osam gostiju, s posteljinom i peškirima uključenim u cijenu.',
          },
          9: {
            title: 'Proslave',
            body: 'Dvorište se lako pretvori u prostor za proslavu — rođendan, okupljanje, manje slavlje. Za veće društvo javite se prije rezervacije.',
          },
        } as Record<number, { title: string; body: string }>
      )[n] ?? { title: '', body: '' },
    extraTitle: 'Dodatno',
    extraLead: 'Sitnice koje se podrazumijevaju, a bez kojih boravak nije isti.',
  },
  location: {
    heading: 'Gdje se nalazimo',
    lead: 'Dovoljno blizu da se lako stigne, dovoljno daleko da se čuje samo šuma.',
    mapTitle: 'Karta lokacije vile TreeScape',
    openInMaps: 'Otvori u Google Mapama',
    opensInNewTab: 'otvara se u novoj kartici',
    driveTime: (minutes) => `${minutes} min vožnje`,
    places: {
      city: 'Sarajevo',
      airport: 'Aerodrom',
      shop: 'Najbliža prodavnica',
    },
  },

  faq: {
    heading: 'Česta pitanja',
    lead: 'Ako nešto nije jasno, slobodno nas kontaktirajte.',
    items: ({ checkinTime, checkoutTime, maxGuests }) => [
      {
        q: 'Kada mogu doći i do kada moram otići?',
        a: `Prijava je od ${checkinTime}, a odjava do ${checkoutTime}. Ako vam treba raniji dolazak ili kasniji odlazak, javite se — obično se može dogovoriti.`,
      },
      {
        q: 'Kako funkcionira rezervacija?',
        a: 'Odaberete termin i pošaljete rezervaciju. Termin odmah držimo za vas i drugim gostima je prikazan kao zauzet. Rezervacija je konačno potvrđena tek kad je domaćin prihvati — o tome vas obavještavamo emailom.',
      },
      {
        q: 'Mogu li otkazati rezervaciju?',
        a: 'Za otkazivanje nas kontaktirajte što prije, na email ili telefon iz podnožja stranice. Uslovi povrata novca zavise od toga koliko je ostalo do dolaska.',
      },
      {
        q: 'Jesu li kućni ljubimci dozvoljeni?',
        a: 'Jesu, uz prethodnu najavu — molimo da to upišete u napomenu prilikom rezervacije kako bismo pripremili kuću.',
      },
      {
        q: 'Je li posteljina uključena?',
        a: 'Jeste. Posteljina, peškiri i osnovna sredstva za higijenu uključeni su u cijenu — nema dodatnih naknada.',
      },
      {
        q: 'Koliko osoba može boraviti u kući?',
        a: `Kuća prima do ${maxGuests} osoba. Za veće grupe javite nam se prije rezervacije.`,
      },
      {
        q: 'Ima li interneta i mobilnog signala?',
        a: 'Ima — bežični internet pokriva cijelu kuću, a mobilni signal je stabilan.',
      },
      {
        q: 'Kako dobijam adresu i ključ?',
        a: 'Nakon potvrde rezervacije šaljemo vam email sa tačnom adresom, uputstvima za dolazak i kontakt brojem domaćina, koji vas dočekuje i predaje ključ.',
      },
    ],
  },

  booking: {
    heading: 'Rezervišite svoj termin',
    lead: 'Kliknite jedan datum za boravak bez noćenja, ili dva za duži boravak. Zauzeti termini prikazani su sivo i ne mogu se odabrati.',

    pickDates: 'Odaberite datume',
    checkIn: 'Dolazak',
    checkOut: 'Odlazak',
    notSelected: 'Nije odabrano',
    clearDates: 'Poništi odabir',

    legendFree: 'Slobodno',
    legendTaken: 'Zauzeto',
    legendSelected: 'Vaš odabir',

    guests: 'Broj gostiju',
    name: 'Ime i prezime',
    namePlaceholder: 'Vaše ime i prezime',
    email: 'Email adresa',
    emailPlaceholder: 'vas@email.com',
    phone: 'Broj telefona',
    phonePlaceholder: '+387 6x xxx xxx',
    note: 'Napomena za domaćina',
    notePlaceholder: 'Dolazite s kućnim ljubimcem? Kasni dolazak? Recite nam ovdje.',
    optional: 'opcionalno',

    summaryTitle: 'Pregled rezervacije',
    daysLabel: (n) => count('bs', n, plural.bs.days),
    total: 'Ukupno',
    seasonalNote: 'Cijena po danu zavisi od sezone.',
    weekendNote: 'Subota i nedjelja se naplaćuju po vikend cijeni.',
    singleDayNote: 'Rezervacija za jedan dan, bez noćenja.',
    timesNote: (checkIn, checkOut) =>
      `Prijava na dan dolaska od ${checkIn}, odjava na dan odlaska do ${checkOut}.`,

    payMethodTitle: 'Način plaćanja',

    payTransfer: 'Plaćanje na račun',
    payTransferHint:
      'Dobijate broj računa i poziv na broj. Termin držimo za vas dok uplata ne stigne.',

    payCash: 'Plaćanje u gotovini',
    payCashHint:
      'Šaljete zahtjev domaćinu. Termin držimo za vas dok ga domaćin ne potvrdi — obično isti dan.',

    payTest: 'TEST rezervacija',
    payTestHint:
      'Samo za isprobavanje — potvrđuje rezervaciju bez ikakvog plaćanja. Ne prikazuje se gostima.',

    reserve: 'Rezerviši',
    submitting: 'Trenutak…',

    selectDatesFirst: 'Prvo odaberite datum u kalendaru.',
    singleDayHint: 'Kliknite jedan datum za boravak bez noćenja, ili još jedan za duži boravak.',
    unavailableRange:
      'U odabranom rasponu ima već rezervisanih dana. Odaberite termin bez zauzetih datuma.',

    wizard: {
      dates: 'Datumi',
      details: 'Vaši podaci',
      review: 'Potvrda',
      next: 'Dalje',
      back: 'Nazad',
      stepOf: (step, total) => `Korak ${step} od ${total}`,
      reviewLead: 'Provjerite podatke prije slanja.',
    },
  },

  confirmation: {
    pageTitle: 'Vaša rezervacija',

    // "Uspješna" se kaže SAMO kad je rezervacija stvarno prihvaćena.
    // Dok se čeka, termin jeste zauzet, ali gost ne smije misliti da je gotovo.
    confirmedTitle: 'Rezervacija je uspješna',
    confirmedLead:
      'Domaćin je potvrdio vašu rezervaciju. Termin je vaš i drugim gostima je prikazan kao zauzet.',

    pendingTitle: 'Termin je rezervisan za vas',
    pendingLead:
      'Termin držimo za vas i drugim gostima je već prikazan kao zauzet. Rezervacija je konačna tek kad je domaćin prihvati — javljamo vam se emailom u najkraćem roku.',

    transferTitle: 'Termin je rezervisan za vas',
    transferLead:
      'Preostaje još uplata. Termin držimo za vas do isteka roka ispod. Rezervacija je konačna tek kad uplata bude provjerena.',

    inactiveTitle: 'Rezervacija više nije aktivna',
    inactiveLead: 'Ovaj termin je oslobođen i ponovo je dostupan drugim gostima.',

    transferHeading: 'Podaci za uplatu',
    transferRecipient: 'Primalac',
    transferBank: 'Banka',
    transferIban: 'Broj računa (IBAN)',
    transferReference: 'Poziv na broj',
    transferAmount: 'Iznos za uplatu',
    transferDeadline: 'Uplatiti do',
    transferNote:
      'Obavezno upišite poziv na broj — po njemu domaćin prepoznaje vašu uplatu. Ako uplata ne stigne do navedenog roka, termin se oslobađa.',
    copy: 'Kopiraj',
    copied: 'Kopirano',

    pendingBadge: 'Rezervisano — čeka potvrdu',
    awaitingTransfer: 'Rezervisano — čeka uplatu',
    confirmedBadge: 'Potvrđeno',
    heldNote: 'Termin je već zauzet za vas — niko drugi ga ne može uzeti u međuvremenu.',
    reference: 'Broj rezervacije',
    stay: 'Vaš boravak',
    guestsLabel: 'Gostiju',
    totalLabel: 'Ukupan iznos',
    payOnArrival: 'Iznos se plaća u gotovini po dolasku.',
    paid: 'Uplata je zaprimljena.',
    testBooking: 'Ovo je TEST rezervacija — nikakav novac nije naplaćen.',
    whatNext: 'Šta dalje?',
    whatNextBody:
      'Poslali smo vam email s detaljima. Tačnu adresu, uputstva za dolazak i kontakt domaćina dobijate prije dolaska.',
    backHome: 'Nazad na početnu',
    cancelBooking: 'Otkaži rezervaciju',
    cancelReasonLabel: 'Razlog otkazivanja',
    cancelReasonPlaceholder: 'Recite nam ukratko zašto otkazujete.',
    cancelReasonRequired: 'Molimo upišite razlog otkazivanja.',
    cancelSubmit: 'Potvrdi otkazivanje',
    cancelSubmitting: 'Otkazujem…',
    cancelAbort: 'Odustani',
  },

  errors: {
    DATES_TAKEN: 'Ovi datumi su upravo rezervisani. Molimo odaberite druge.',
    INVALID_RANGE: 'Datum odlaska mora biti nakon datuma dolaska.',
    PAST_DATE: 'Ne možete rezervisati datum u prošlosti.',
    MAX_DAYS: (n) => `Maksimalan boravak je ${count('bs', n, plural.bs.days)}.`,
    TOO_MANY_GUESTS: (n) => `Maksimalan broj gostiju je ${count('bs', n, plural.bs.guests)}.`,
    INVALID_INPUT: 'Provjerite unesene podatke i pokušajte ponovo.',
    REQUIRED_NAME: 'Unesite ime i prezime.',
    REQUIRED_EMAIL: 'Unesite ispravnu email adresu.',
    REQUIRED_PHONE: 'Unesite broj telefona.',
    REQUIRED_METHOD: 'Odaberite način plaćanja.',
    METHOD_UNAVAILABLE: 'Odabrani način plaćanja trenutno nije dostupan.',
    SERVER_ERROR: 'Došlo je do greške. Pokušajte ponovo za koji trenutak.',
    NOT_ALLOWED: 'Nije dozvoljeno.',
    MAX_BELOW_MIN: 'Maksimalan broj dana ne može biti manji od minimalnog.',
    ALREADY_RESOLVED: 'Ovaj zahtjev je već riješen. Osvježite stranicu.',
    DATABASE_MISSING:
      'Baza nije podešena. Dodaj Supabase ključeve u .env.local (ili u Vercel → Environment Variables) i pokreni migracije iz supabase/migrations.',
    TOO_MANY_REQUESTS:
      'Previše pokušaja u kratkom vremenu. Sačekajte koji minut pa probajte ponovo.',
    ADMIN_CODE_WEAK: (min) =>
      `ADMIN_ACCESS_CODE je prekratak — mora imati najmanje ${min} znakova. ` +
      'Prijava je onemogućena dok se ne produži. Novi kod: openssl rand -base64 24',
    ADMIN_MISSING:
      'Administracija nije podešena — nedostaju ADMIN_ACCESS_CODE i ADMIN_SESSION_SECRET.',
  },

  admin: {
    gateTitle: 'TreeScape administracija',
    gateLead: 'Unesite pristupni kod.',
    gateCode: 'Pristupni kod',
    gateTotp: 'Kod s telefona',
    gateTotpHint: 'Šest cifara iz aplikacije za provjeru.',
    gateSubmit: 'Otključaj',
    gateWrong: 'Pogrešan kod.',
    gateLocked: 'Previše pokušaja. Sačekajte minutu pa probajte ponovo.',
    gateNotConfigured:
      'Administracija nije podešena. Postavi ADMIN_ACCESS_CODE i ADMIN_SESSION_SECRET u .env.local.',
    databaseNotConfigured:
      'Baza nije podešena, pa nema šta prikazati. Dodaj Supabase ključeve u .env.local i pokreni migracije iz supabase/migrations.',

    logout: 'Odjava',
    title: 'Administracija',

    tabRequests: 'Zahtjevi',
    tabBookings: 'Rezervacije',
    tabCalendar: 'Kalendar',
    tabPricing: 'Cijene',

    requestsHeading: 'Zahtjevi za plaćanje u gotovini',
    requestsEmpty: 'Trenutno nema zahtjeva koji čekaju odobrenje.',
    testNotification: 'Pošalji probnu obavijest',
    testGuestEmail: 'Pošalji probni mail gostu',
    testNotificationSending: 'Šaljem…',
    approve: 'Odobri',
    reject: 'Odbij',
    approveConfirm: 'Potvrditi ovu rezervaciju?',
    rejectConfirm: 'Odbiti ovaj zahtjev? Termin će se osloboditi.',
    rejectReasonPrompt:
      'Razlog odbijanja — gost ga dobija u mailu. Ostavite prazno ako ne želite navesti razlog.',
    cancelReasonPrompt:
      'Razlog otkazivanja — gost ga dobija u mailu. Ostavite prazno ako ne želite navesti razlog.',
    receivedAt: (when) => `Zaprimljeno ${when}`,
    byCash: 'gotovina',
    byTransfer: 'na račun',

    bookingsHeading: 'Sve rezervacije',
    bookingsEmpty: 'Još nema nijedne rezervacije.',
    searchLabel: 'Pretraži rezervacije',
    searchPlaceholder: 'Ime, broj rezervacije, email, telefon…',
    searchClear: 'Poništi pretragu',
    searchCount: (nadjeno: number, ukupno: number) =>
      `Prikazano ${nadjeno} od ${ukupno} rezervacija.`,
    searchNothing: 'Nijedna rezervacija ne odgovara pretrazi.',
    colStay: 'Termin',
    colGuest: 'Gost',
    colMethod: 'Način',
    colStatus: 'Status',
    colAmount: 'Iznos',
    cancel: 'Otkaži',
    cancelConfirm: 'Otkazati ovu rezervaciju?',

    calendarHeading: 'Blokiranje termina',
    calendarLead:
      'Odaberite raspon datuma koje želite zatvoriti za goste (održavanje, lični boravak…).',
    blockReason: 'Razlog (interno)',
    blockReasonPlaceholder: 'npr. krečenje',
    blockSubmit: 'Blokiraj termin',
    blockedHeading: 'Blokirani termini',
    blockedEmpty: 'Nema blokiranih termina.',
    unblock: 'Oslobodi',
    unblockConfirm: 'Osloboditi ovaj termin?',

    pricingHeading: 'Osnovne cijene',
    pricingLead: 'Vrijede za svaki datum koji ne pripada nijednoj sezoni.',
    defaultNightly: 'Osnovna cijena po danu',
    weekendPrice: 'Cijena za subotu i nedjelju',
    weekendPriceHint:
      'Upiši 0 da vikend ide po osnovnoj cijeni. Sezona, ako je postavljena, i dalje ima prednost.',
    maxNights: 'Maksimalan broj dana',
    maxGuests: 'Maksimalan broj gostiju',
    holdMinutes: 'Trajanje rezervacije termina tokom plaćanja (min)',
    checkinFrom: 'Prijava od',
    checkoutBy: 'Odjava do',
    currency: 'Valuta (EUR, BAM…)',
    currencySymbol: 'Oznaka (€, KM…)',
    save: 'Sačuvaj',
    saved: 'Sačuvano.',

    seasonsHeading: 'Sezonske cijene',
    seasonsLead:
      'Ako se dvije sezone preklapaju, vrijedi ona s većim prioritetom. Dan odlaska se ne naplaćuje.',
    seasonName: 'Naziv sezone',
    seasonNamePlaceholder: 'npr. Ljetna sezona 2027',
    seasonFrom: 'Od',
    seasonTo: 'Do',
    seasonToHint: 'ne uključuje se',
    seasonPeriod: 'Period',
    seasonPrice: 'Cijena po danu',
    seasonPriority: 'Prioritet',
    seasonAdd: 'Dodaj sezonu',
    seasonDelete: 'Obriši',
    seasonDeleteConfirm: 'Obrisati ovu sezonu?',
    seasonsEmpty: 'Nema definisanih sezona — svugdje vrijedi osnovna cijena.',

    statusLabels: {
      pending_payment: 'Čeka uplatu',
      pending_cash: 'Čeka odobrenje',
      pending_transfer: 'Čeka uplatu na račun',
      confirmed: 'Potvrđeno',
      expired: 'Isteklo',
      cancelled: 'Otkazano',
      blocked: 'Blokirano',
    },

    methodLabels: {
      card: 'Kartica',
      cash: 'Gotovina',
      bank_transfer: 'Uplata na račun',
      test: 'TEST',
      none: '—',
    },

    markPaid: 'Uplata stigla',
    markPaidConfirm: 'Potvrditi da je uplata legla na račun?',
    transfersHeading: 'Uplate na račun koje se čekaju',
    transfersEmpty: 'Nema rezervacija koje čekaju uplatu.',
    transferRef: 'Poziv na broj',
    deadlineAt: 'Rok',

    bankHeading: 'Podaci za uplatu na račun',
    bankLead:
      'Ovo gost vidi kad odabere plaćanje na račun. Dok je IBAN prazan, ta opcija se uopće ne nudi.',
    bankAccountName: 'Naziv primaoca',
    bankAccountNamePlaceholder: 'Ime i prezime ili naziv firme',
    bankName: 'Naziv banke',
    bankNamePlaceholder: 'npr. Raiffeisen Bank d.d. BiH',
    bankIban: 'IBAN / broj računa',
    bankIbanPlaceholder: 'BA39 1234 5678 9012 3456',
    bankIbanHint: 'Ostavi prazno da se plaćanje na račun uopće ne nudi gostima.',
    transferDays: 'Rok za uplatu (dana)',
  },

  common: {
    from: 'od',
    day: 'dan',
    loading: 'Učitavanje…',
    tryAgain: 'Pokušaj ponovo',
    days: plural.bs.days,
    guests: plural.bs.guests,
  },

  footer: {
    contact: 'Kontakt',
    quickLinks: 'Brzi linkovi',
    rights: 'Sva prava zadržana.',
    address: 'Bosna i Hercegovina',
  },

  email: {
    // Bez imena bi "Poštovani/a ," ostavilo zarez koji visi u zraku.
    greeting: (name) => (name ? `Poštovani/a ${name},` : 'Poštovani/a,'),
    rowStay: 'Termin',
    rowGuests: 'Gostiju',
    rowAmount: 'Iznos',
    rowReference: 'Broj rezervacije',
    rowGuest: 'Gost',
    rowEmail: 'Email',
    rowPhone: 'Telefon',
    rowNote: 'Napomena gosta',

    addressLater: 'Tačnu adresu, uputstva za dolazak i kontakt domaćina šaljemo prije dolaska.',
    payOnArrival: 'Iznos se plaća u gotovini po dolasku.',

    confirmedSubject: 'Rezervacija potvrđena',
    confirmedTitle: 'Vaša rezervacija je potvrđena',
    confirmedBody: 'hvala vam na rezervaciji. Termin je zaključan i plaćen.',

    transferSubject: 'Podaci za uplatu',
    transferTitle: 'Termin je rezervisan — preostaje uplata',
    transferBody:
      'termin držimo za vas. Molimo uplatite iznos po podacima ispod — čim uplata stigne, rezervacija je potvrđena.',
    transferHeading: 'Podaci za uplatu',
    transferRecipient: 'Primalac',
    transferBank: 'Banka',
    transferIban: 'IBAN',
    transferReference: 'Poziv na broj',
    transferAmount: 'Iznos',
    transferDeadline: 'Uplatiti do',
    transferWarning:
      'Obavezno upišite poziv na broj — po njemu domaćin prepoznaje vašu uplatu. Ako uplata ne stigne do navedenog roka, termin se oslobađa.',

    cashRequestSubject: 'Zahtjev zaprimljen',
    cashRequestTitle: 'Zahtjev za rezervaciju je zaprimljen',
    cashRequestBody:
      'primili smo vaš zahtjev. Termin držimo za vas dok ga domaćin ne potvrdi — javljamo se u najkraćem roku.',

    cashApprovedSubject: 'Rezervacija potvrđena',
    cashApprovedTitle: 'Domaćin je potvrdio vašu rezervaciju',
    cashApprovedBody: 'termin je vaš. Vidimo se!',

    cancelledSubject: 'Rezervacija je otkazana',
    cancelledTitle: 'Vaša rezervacija je otkazana',
    cancelledBody:
      'nažalost, moramo otkazati vašu već potvrđenu rezervaciju. Termin je oslobođen, a mi se izvinjavamo zbog neprilike.',
    reasonLabel: 'Razlog',
    openBooking: 'Otvori rezervaciju',
    ownerGuestCancelledTitle: 'Gost je otkazao rezervaciju',

    cashRejectedSubject: 'Rezervacija nije potvrđena',
    cashRejectedTitle: 'Nažalost, termin nije dostupan',
    cashRejectedBody:
      'domaćin nije bio u mogućnosti potvrditi traženi termin. Termin je oslobođen, pa slobodno odaberite drugi.',

    ownerCashTitle: 'Novi zahtjev za plaćanje gotovinom',
    ownerTransferTitle: 'Nova rezervacija — čeka uplatu na račun',
    ownerCardTitle: 'Nova plaćena rezervacija',
    ownerCashHint: 'Termin je rezervisan i nevidljiv drugim gostima dok ne odlučite.',
    ownerTransferHint:
      'Termin je rezervisan. Kad uplata legne na račun, potvrdite je u administraciji.',
    ownerOpenAdmin: 'Otvori administraciju',
  },
};
