import type { Locale } from './i18n';

/**
 * Politika privatnosti i uslovi korištenja.
 *
 * ── Šta ovaj tekst jeste ──────────────────────────────────────────────────
 * Opis onoga što aplikacija STVARNO radi, provjeren u kodu, a ne opšti obrazac
 * prepisan s tuđeg sajta. Nabrojani su tačno oni podaci koje forma traži
 * (`api/booking/reserve`), tačno oni kolačići koji se postavljaju
 * (`treescape_jezik`, `treescape_admin`) i tačno one usluge kojima podaci
 * odlaze. Nema analitike ni pratilaca, pa se to i piše — jer je istina i jer
 * je prednost.
 *
 * ── Šta NIJE ──────────────────────────────────────────────────────────────
 * Pravni savjet. Prije objave ovo treba da pročita neko ko se time bavi, a
 * podaci o pružaocu usluge (`OPERATOR` ispod) moraju biti popunjeni. Dok su
 * na zamjenskim vrijednostima, obje stranice iznad teksta prikazuju upozorenje
 * — da se ne desi da se politika privatnosti objavi bez imena onoga na koga se
 * odnosi.
 */

/**
 * Ko stoji iza sajta.
 *
 * OVO SE MORA POPUNITI prije nego stranice odu pred goste: politika
 * privatnosti bez imena obrađivača ne znači ništa, ni pravno ni praktično.
 */
export const OPERATOR = {
  /** Puno ime vlasnika ili firme. */
  name: 'POPUNITI — puno ime vlasnika ili naziv firme',
  /** Adresa sjedišta. */
  address: 'POPUNITI — adresa',
  /** JIB/ID broj, ako je firma. Prazno ako je fizičko lice. */
  taxId: '',
  /** Zemlja po čijem se pravu sudi. */
  country: 'Bosna i Hercegovina',
};

/** Je li `OPERATOR` još na zamjenskim vrijednostima. */
export function operatorNijePopunjen(): boolean {
  return OPERATOR.name.startsWith('POPUNITI') || OPERATOR.address.startsWith('POPUNITI');
}

export interface LegalSection {
  heading: string;
  /** Odlomci. Prazan spisak znači naslov bez teksta — ne koristi se. */
  body: string[];
}

export interface LegalDoc {
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
  /** Tekst upozorenja dok podaci o pružaocu usluge nisu popunjeni. */
  incompleteWarning: string;
}

/**
 * Datum posljednje izmjene teksta.
 *
 * Upisuje se RUČNO, kad se tekst promijeni — ne `new Date()`. Automatski datum
 * bi se pomjerao pri svakom postavljanju sajta i tvrdio da je politika
 * mijenjana onda kad nije.
 */
const UPDATED = '2026-08-11';

function formatUpdated(locale: Locale): string {
  const d = new Date(`${UPDATED}T00:00:00Z`);
  const tag = locale === 'bs' ? 'bs-BA' : locale === 'ar' ? 'ar' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Podaci koji se ubacuju u tekst, da se kontakt ne prepisuje na dva mjesta. */
export interface LegalFacts {
  siteName: string;
  email: string;
  phone: string;
}

// ── Politika privatnosti ────────────────────────────────────────────────────

export function privacyDoc(locale: Locale, f: LegalFacts): LegalDoc {
  const ime = OPERATOR.name;
  const adresa = OPERATOR.address;

  if (locale === 'en') {
    return {
      title: 'Privacy policy',
      lead: `How ${f.siteName} handles the information you leave when you book.`,
      updated: `Last updated: ${formatUpdated('en')}`,
      incompleteWarning:
        'This policy is not finished: the details of the person or company responsible for the site have not been filled in yet.',
      sections: [
        {
          heading: 'Who is responsible',
          body: [
            `${ime}, ${adresa}${OPERATOR.taxId ? `, ID ${OPERATOR.taxId}` : ''}, runs this site and decides what happens with the information collected through it.`,
            `For anything in this policy, write to ${f.email} or call ${f.phone}.`,
          ],
        },
        {
          heading: 'What we collect',
          body: [
            'Only what the booking form asks for: your name, email address, phone number, the number of guests, the dates you selected, and the note you write if you write one.',
            'We do not ask for and do not store payment card details. Payment is arranged directly with the host.',
            'We do not use analytics, advertising pixels or any other tracking. There is no third-party script on this site.',
          ],
        },
        {
          heading: 'Why we need it',
          body: [
            'To hold your dates, to confirm the booking, and to reach you if something about your stay changes. Without a name and a way to contact you a booking cannot exist, so this is processing needed to enter into and perform an agreement with you.',
            'The host also receives a notification about each booking, so that the request reaches a person rather than sitting in a database.',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'This site sets one cookie for visitors: `treescape_jezik`, which remembers the language you chose. It lasts one year and contains nothing but the language code.',
            'A second cookie, `treescape_admin`, exists only for the host after signing in to the administration. Guests never receive it.',
            'There are no advertising or analytics cookies, so there is nothing to consent to and no banner asking you to.',
          ],
        },
        {
          heading: 'Who else sees the data',
          body: [
            "The database is hosted by Supabase and the site by Vercel; both store the data on our behalf. Confirmation emails are sent through the host's email provider.",
            'The map on the location page is an OpenStreetMap frame. When it loads, OpenStreetMap sees your IP address, as with any image loaded from another site.',
            'Nothing is sold, rented or handed to anyone for marketing.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: [
            "Booking records are kept while they may still be needed — for the stay itself, and afterwards for the host's accounting obligations. Once neither applies, ask us and the record will be deleted.",
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You can ask what we hold about you, correct it, or have it deleted. Write to ' +
              f.email +
              ' and say which booking it concerns; the booking reference from your confirmation email is enough.',
            'You can also cancel a booking yourself from the confirmation page, using the link sent to you.',
          ],
        },
        {
          heading: 'Security',
          body: [
            'The site is served over an encrypted connection. Access to the administration is protected by a secret code and a second factor from an authenticator app.',
            'No system is beyond reach. If something does go wrong with your data, you will be told.',
          ],
        },
      ],
    };
  }

  if (locale === 'ar') {
    return {
      title: 'سياسة الخصوصية',
      lead: `كيف يتعامل ${f.siteName} مع البيانات التي تتركها عند الحجز.`,
      updated: `آخر تحديث: ${formatUpdated('ar')}`,
      incompleteWarning: 'هذه السياسة غير مكتملة: لم تُدرج بعد بيانات المسؤول عن الموقع.',
      sections: [
        {
          heading: 'من المسؤول',
          body: [
            `${ime}، ${adresa}${OPERATOR.taxId ? `، الرقم الضريبي ${OPERATOR.taxId}` : ''}، يدير هذا الموقع ويقرّر ما يجري بالبيانات المجموعة من خلاله.`,
            `لأي سؤال يخصّ هذه السياسة، راسلنا على ${f.email} أو اتصل على ${f.phone}.`,
          ],
        },
        {
          heading: 'ما الذي نجمعه',
          body: [
            'فقط ما يطلبه نموذج الحجز: الاسم، البريد الإلكتروني، رقم الهاتف، عدد الضيوف، التواريخ المختارة، والملاحظة إن كتبتها.',
            'لا نطلب بيانات بطاقات الدفع ولا نحفظها. الدفع يُرتَّب مباشرة مع المضيف.',
            'لا نستخدم أدوات تحليل ولا بكسلات إعلانية ولا أي تتبّع آخر. لا يوجد على هذا الموقع أي سكربت لطرف ثالث.',
          ],
        },
        {
          heading: 'لماذا نحتاجها',
          body: [
            'لحجز التواريخ لك، ولتأكيد الحجز، وللتواصل معك إن تغيّر شيء يخصّ إقامتك. لا يقوم حجز دون اسم ووسيلة تواصل، فهذه معالجة لازمة لإبرام الاتفاق معك وتنفيذه.',
            'يصل المضيف كذلك إشعار بكل حجز، كي يصل الطلب إلى إنسان لا أن يبقى في قاعدة بيانات.',
          ],
        },
        {
          heading: 'ملفات تعريف الارتباط',
          body: [
            'يضع الموقع ملفًا واحدًا للزوار: `treescape_jezik` الذي يتذكّر اللغة التي اخترتها. مدّته سنة ولا يحتوي سوى رمز اللغة.',
            'وهناك ملف ثانٍ، `treescape_admin`، للمضيف وحده بعد دخوله إلى لوحة الإدارة. لا يصل الضيوف أبدًا.',
            'لا توجد ملفات إعلانية ولا تحليلية، فلا شيء تُطلب الموافقة عليه ولا لافتة تسألك عنها.',
          ],
        },
        {
          heading: 'من يطّلع على البيانات',
          body: [
            'قاعدة البيانات مستضافة لدى Supabase والموقع لدى Vercel، وكلاهما يحفظ البيانات نيابة عنّا. رسائل التأكيد تُرسَل عبر مزوّد البريد الخاص بالمضيف.',
            'الخريطة في صفحة الموقع إطار من OpenStreetMap. عند تحميلها يرى OpenStreetMap عنوان IP الخاص بك، كما هي الحال مع أي صورة تُحمَّل من موقع آخر.',
            'لا نبيع البيانات ولا نؤجّرها ولا نسلّمها لأحد لأغراض تسويقية.',
          ],
        },
        {
          heading: 'مدّة الحفظ',
          body: [
            'تُحفظ سجلّات الحجز ما دامت قد تلزم — للإقامة نفسها، ثم لالتزامات المضيف المحاسبية. وإذا لم يعد أيٌّ منهما قائمًا، راسلنا ويُحذف السجل.',
          ],
        },
        {
          heading: 'حقوقك',
          body: [
            `يمكنك أن تسأل عمّا نحتفظ به عنك، أو تصحّحه، أو تطلب حذفه. راسلنا على ${f.email} مع ذكر الحجز المعني؛ يكفي رقم الحجز الوارد في رسالة التأكيد.`,
            'ويمكنك أيضًا إلغاء الحجز بنفسك من صفحة التأكيد، عبر الرابط المُرسَل إليك.',
          ],
        },
        {
          heading: 'الأمان',
          body: [
            'يُقدَّم الموقع عبر اتصال مشفّر. والدخول إلى لوحة الإدارة محميّ برمز سرّي وبعامل ثانٍ من تطبيق مصادقة.',
            'لا يوجد نظام بمنأى عن الخطر. وإن حدث خلل يمسّ بياناتك، ستُخبَر به.',
          ],
        },
      ],
    };
  }

  return {
    title: 'Politika privatnosti',
    lead: `Kako ${f.siteName} postupa s podacima koje ostavite kad rezervišete.`,
    updated: `Posljednja izmjena: ${formatUpdated('bs')}`,
    incompleteWarning:
      'Ova politika nije dovršena: podaci o osobi ili firmi koja odgovara za sajt još nisu upisani.',
    sections: [
      {
        heading: 'Ko obrađuje podatke',
        body: [
          `${ime}, ${adresa}${OPERATOR.taxId ? `, ID ${OPERATOR.taxId}` : ''}, vodi ovaj sajt i odlučuje šta se dešava s podacima prikupljenim preko njega.`,
          `Za sve iz ove politike pišite na ${f.email} ili nazovite ${f.phone}.`,
        ],
      },
      {
        heading: 'Koje podatke prikupljamo',
        body: [
          'Samo ono što forma za rezervaciju traži: ime i prezime, email adresu, broj telefona, broj gostiju, odabrane datume i napomenu ako je napišete.',
          'Podatke o platnoj kartici ne tražimo i ne čuvamo. Plaćanje se dogovara direktno s domaćinom.',
          'Ne koristimo analitiku, reklamne piksele niti bilo kakvo praćenje. Na ovom sajtu nema nijedne tuđe skripte.',
        ],
      },
      {
        heading: 'Zašto nam trebaju',
        body: [
          'Da vam zadržimo termin, da potvrdimo rezervaciju i da vas nađemo ako se nešto oko boravka promijeni. Bez imena i načina da vas kontaktiramo rezervacija ne može ni postojati, pa je ovo obrada nužna za sklapanje i izvršenje dogovora s vama.',
          'Domaćin uz to dobija obavijest o svakoj rezervaciji, da zahtjev stigne do čovjeka, a ne da stoji u bazi.',
        ],
      },
      {
        heading: 'Kolačići',
        body: [
          'Sajt posjetiocu postavlja jedan kolačić: `treescape_jezik`, koji pamti jezik koji ste odabrali. Traje godinu dana i u njemu ne stoji ništa osim oznake jezika.',
          'Drugi kolačić, `treescape_admin`, postoji samo za domaćina nakon prijave u administraciju. Gost ga nikad ne dobije.',
          'Reklamnih i analitičkih kolačića nema, pa nema ni na šta pristati ni trake koja to pita.',
        ],
      },
      {
        heading: 'Ko još vidi podatke',
        body: [
          'Baza je kod Supabasea, a sajt na Vercelu; oboje čuvaju podatke u naše ime. Mailovi s potvrdom idu preko davaoca email usluge kojeg domaćin koristi.',
          'Karta na stranici lokacije je okvir OpenStreetMapa. Kad se učita, OpenStreetMap vidi vašu IP adresu — kao i kod svake slike koja se učitava s tuđeg sajta.',
          'Ništa se ne prodaje, ne iznajmljuje niti daje ikome za reklamiranje.',
        ],
      },
      {
        heading: 'Koliko dugo ih čuvamo',
        body: [
          'Zapis o rezervaciji čuva se dok može trebati — za sam boravak, a poslije za knjigovodstvene obaveze domaćina. Kad ni jedno ni drugo više ne stoji, javite se i zapis se briše.',
        ],
      },
      {
        heading: 'Vaša prava',
        body: [
          `Možete pitati šta o vama imamo, tražiti ispravku ili brisanje. Pišite na ${f.email} i recite na koju se rezervaciju odnosi; dovoljan je broj rezervacije iz maila s potvrdom.`,
          'Rezervaciju možete i sami otkazati sa stranice potvrde, preko linka koji vam je poslan.',
        ],
      },
      {
        heading: 'Sigurnost',
        body: [
          'Sajt se poslužuje preko šifrovane veze. Ulaz u administraciju čuva tajni kod i drugi faktor iz aplikacije za prijavu.',
          'Nijedan sistem nije nedodirljiv. Ako se s vašim podacima ipak nešto desi, bićete obaviješteni.',
        ],
      },
    ],
  };
}

// ── Uslovi korištenja ───────────────────────────────────────────────────────

export function termsDoc(locale: Locale, f: LegalFacts): LegalDoc {
  const ime = OPERATOR.name;

  if (locale === 'en') {
    return {
      title: 'Terms of use',
      lead: `The rules that apply when you book ${f.siteName} through this site.`,
      updated: `Last updated: ${formatUpdated('en')}`,
      incompleteWarning:
        'These terms are not finished: the details of the person or company providing the service have not been filled in yet.',
      sections: [
        {
          heading: 'Who provides the service',
          body: [
            `The house is let by ${ime}. This site is the way to ask for a date; it is not an intermediary and charges no commission.`,
          ],
        },
        {
          heading: 'How a booking is made',
          body: [
            'You choose the dates, fill in your details and send a request. From that moment the dates are held for you and shown to other visitors as taken.',
            'The booking is final only when the host accepts it. Until then it stands as a request, and you are told the outcome by email.',
            'A held date that is not confirmed may be released after the period set by the host, and the dates become free again.',
          ],
        },
        {
          heading: 'Prices',
          body: [
            'The price shown while you pick your dates is the price for that stay: it is calculated from the nightly rate, weekend rates and any seasonal rates, and nothing is added at the end.',
            'Prices are shown in the currency stated on the site.',
          ],
        },
        {
          heading: 'Payment',
          body: [
            'Payment is arranged directly with the host, by the method offered when you book. No card details are entered on this site.',
          ],
        },
        {
          heading: 'Cancellation',
          body: [
            'You can cancel from the confirmation page or by contacting the host. The sooner you do, the more likely the dates can be let again.',
            'Whether and how much is refunded depends on how close to arrival you cancel; the host sets those conditions and will tell you them before you pay.',
          ],
        },
        {
          heading: 'Arrival, departure and the number of guests',
          body: [
            'Check-in and check-out times are shown with your booking and in the confirmation email.',
            'The number of guests you give is the number the house is prepared for. If more people come than were agreed, the host may refuse them.',
          ],
        },
        {
          heading: 'Care of the house',
          body: [
            'The house is left in order and is expected back that way. Damage beyond ordinary use is settled with the host.',
            'Pets are welcome by prior arrangement — say so in the note when you book.',
          ],
        },
        {
          heading: 'Accuracy of the site',
          body: [
            'Photographs, descriptions and driving times are given in good faith. Availability and prices come from a live database, but a technical fault can happen; if a price shown was wrong, the host will tell you before the booking is confirmed rather than charge it.',
          ],
        },
        {
          heading: 'Applicable law',
          body: [
            `These terms are governed by the law of ${OPERATOR.country}. Anything unclear is best settled by a phone call before it becomes a dispute — the number is ${f.phone}.`,
          ],
        },
      ],
    };
  }

  if (locale === 'ar') {
    return {
      title: 'شروط الاستخدام',
      lead: `القواعد التي تسري عند حجز ${f.siteName} عبر هذا الموقع.`,
      updated: `آخر تحديث: ${formatUpdated('ar')}`,
      incompleteWarning: 'هذه الشروط غير مكتملة: لم تُدرج بعد بيانات مقدّم الخدمة.',
      sections: [
        {
          heading: 'من يقدّم الخدمة',
          body: [`يؤجّر البيت ${ime}. وهذا الموقع وسيلة لطلب موعد؛ ليس وسيطًا ولا يتقاضى عمولة.`],
        },
        {
          heading: 'كيف يتمّ الحجز',
          body: [
            'تختار التواريخ، وتملأ بياناتك، وترسل الطلب. من تلك اللحظة تُحجز التواريخ لك وتظهر لبقية الزوار على أنها مشغولة.',
            'ولا يصبح الحجز نهائيًا إلا بقبول المضيف. حتى ذلك الحين يبقى طلبًا، وتُبلَّغ بالنتيجة عبر البريد.',
            'والموعد المحجوز دون تأكيد قد يُحرَّر بعد المدّة التي يحدّدها المضيف، فتعود التواريخ متاحة.',
          ],
        },
        {
          heading: 'الأسعار',
          body: [
            'السعر الظاهر أثناء اختيار التواريخ هو سعر تلك الإقامة: يُحسب من سعر الليلة وأسعار عطلة نهاية الأسبوع والأسعار الموسمية، ولا يُضاف شيء في النهاية.',
            'وتُعرض الأسعار بالعملة المذكورة في الموقع.',
          ],
        },
        {
          heading: 'الدفع',
          body: [
            'يُرتَّب الدفع مباشرة مع المضيف بالطريقة المعروضة عند الحجز. ولا تُدخَل بيانات بطاقات على هذا الموقع.',
          ],
        },
        {
          heading: 'الإلغاء',
          body: [
            'يمكنك الإلغاء من صفحة التأكيد أو بالتواصل مع المضيف. وكلّما كان أبكر، زادت فرصة تأجير التواريخ من جديد.',
            'أمّا الاسترداد ومقداره فيعتمدان على قرب موعد الوصول؛ يحدّد المضيف تلك الشروط ويبلّغك بها قبل الدفع.',
          ],
        },
        {
          heading: 'الوصول والمغادرة وعدد الضيوف',
          body: [
            'مواعيد الدخول والخروج مذكورة مع حجزك وفي رسالة التأكيد.',
            'وعدد الضيوف الذي تذكره هو العدد الذي يُهيَّأ له البيت. وإن حضر أكثر ممّا اتُّفق عليه، فللمضيف أن يرفض.',
          ],
        },
        {
          heading: 'العناية بالبيت',
          body: [
            'يُسلَّم البيت مرتّبًا ويُنتظر أن يعود كذلك. والضرر الذي يتجاوز الاستعمال المعتاد يُسوّى مع المضيف.',
            'والحيوانات الأليفة مرحّب بها بترتيب مسبق — اذكر ذلك في الملاحظة عند الحجز.',
          ],
        },
        {
          heading: 'دقّة ما في الموقع',
          body: [
            'الصور والأوصاف وأزمنة الطريق مذكورة بحسن نيّة. والتوافر والأسعار تأتي من قاعدة بيانات حيّة، لكن العطل التقني وارد؛ وإن ظهر سعر خاطئ، يبلّغك المضيف قبل تأكيد الحجز بدل أن يُحصّله.',
          ],
        },
        {
          heading: 'القانون الواجب التطبيق',
          body: [
            `تخضع هذه الشروط لقانون ${OPERATOR.country}. وما يلتبس يُحلّ باتصال هاتفي قبل أن يصير نزاعًا — الرقم ${f.phone}.`,
          ],
        },
      ],
    };
  }

  return {
    title: 'Uslovi korištenja',
    lead: `Pravila koja važe kad preko ovog sajta rezervišete ${f.siteName}.`,
    updated: `Posljednja izmjena: ${formatUpdated('bs')}`,
    incompleteWarning:
      'Ovi uslovi nisu dovršeni: podaci o osobi ili firmi koja pruža uslugu još nisu upisani.',
    sections: [
      {
        heading: 'Ko pruža uslugu',
        body: [
          `Kuću izdaje ${ime}. Ovaj sajt je način da se zatraži termin; nije posrednik i ne naplaćuje proviziju.`,
        ],
      },
      {
        heading: 'Kako nastaje rezervacija',
        body: [
          'Odaberete datume, upišete podatke i pošaljete zahtjev. Od tog trenutka su datumi zadržani za vas i ostalim posjetiocima se prikazuju kao zauzeti.',
          'Rezervacija je konačna tek kad je domaćin prihvati. Do tada stoji kao zahtjev, a o ishodu vas obavještavamo emailom.',
          'Zadržan termin koji ne bude potvrđen može se osloboditi nakon roka koji domaćin odredi, i datumi tada ponovo postaju slobodni.',
        ],
      },
      {
        heading: 'Cijene',
        body: [
          'Cijena prikazana dok birate datume je cijena tog boravka: računa se iz osnovne, vikend i sezonskih cijena, i na kraju se ništa ne dodaje.',
          'Cijene su iskazane u valuti navedenoj na sajtu.',
        ],
      },
      {
        heading: 'Plaćanje',
        body: [
          'Plaćanje se dogovara direktno s domaćinom, načinom koji je ponuđen pri rezervaciji. Na ovom sajtu se ne unose podaci o kartici.',
        ],
      },
      {
        heading: 'Otkazivanje',
        body: [
          'Otkazati možete sa stranice potvrde ili javljanjem domaćinu. Što ranije to uradite, veća je šansa da se termin ponovo izda.',
          'Da li se i koliko novca vraća zavisi od toga koliko je ostalo do dolaska; te uslove određuje domaćin i saopštava ih prije plaćanja.',
        ],
      },
      {
        heading: 'Dolazak, odlazak i broj gostiju',
        body: [
          'Vrijeme prijave i odjave stoji uz vašu rezervaciju i u mailu s potvrdom.',
          'Broj gostiju koji navedete je broj za koji se kuća priprema. Ako dođe više ljudi nego što je dogovoreno, domaćin ih može odbiti.',
        ],
      },
      {
        heading: 'Čuvanje kuće',
        body: [
          'Kuća se predaje uredna i takva se i očekuje nazad. Šteta veća od uobičajenog korištenja rješava se s domaćinom.',
          'Kućni ljubimci su dobrodošli uz prethodnu najavu — napišite to u napomenu pri rezervaciji.',
        ],
      },
      {
        heading: 'Tačnost podataka na sajtu',
        body: [
          'Fotografije, opisi i minuti vožnje navedeni su u dobroj namjeri. Dostupnost i cijene dolaze iz žive baze, ali tehnički kvar je moguć; ako je prikazana cijena bila pogrešna, domaćin će vam to reći prije potvrde rezervacije, a ne naplatiti je.',
        ],
      },
      {
        heading: 'Mjerodavno pravo',
        body: [
          `Na ove uslove primjenjuje se pravo ${OPERATOR.country}. Ono što je nejasno najbolje je riješiti telefonskim pozivom prije nego postane spor — broj je ${f.phone}.`,
        ],
      },
    ],
  };
}
