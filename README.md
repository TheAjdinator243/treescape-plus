# TreeScape Plus

Tamna verzija sajta za iznajmljivanje vile **TreeScape** — sa kalendarom
slobodnih termina i online rezervacijom.

> Ovo je zaseban sajt, ali **ne i zasebni podaci**. Baza, API rute i
> administracija su iste kao kod osnovnog sajta (isti Supabase projekat), pa
> termin zauzet ovdje istog trena postane zauzet i tamo. Razlikuje se samo
> izgled: tamna ploha, mesingani naglasci i rezervacija u tri koraka.

Čim neko rezerviše, ti datumi **odmah** postanu sivi u kalendaru svih ostalih
posjetilaca, bez osvježavanja stranice.

Sajt govori **bosanski, engleski i arapski** — uključujući i mailove koje gost
dobija.

---

## Sadržaj

- [Šta sve radi](#šta-sve-radi)
- [Brzi start](#brzi-start)
- [Jezici](#jezici)
- [Kako se računa cijena](#kako-se-računa-cijena)
- [Podešavanje Supabase baze](#podešavanje-supabase-baze)
- [Načini plaćanja](#načini-plaćanja)
- [Objava na Vercel](#objava-na-vercel)
- [Drugi i treći izgled](#drugi-i-treći-izgled-treescapepro-i-treescapeproplus)
- [Obavijesti o novim zahtjevima](#obavijesti-o-novim-zahtjevima)
- [Zamjena fotografija i teksta](#zamjena-fotografija-i-teksta)
- [Administracija](#administracija)
- [Kako je spriječen dvostruki booking](#kako-je-spriječen-dvostruki-booking)
- [Testovi](#testovi)
- [Struktura projekta](#struktura-projekta)

---

## Šta sve radi

**Za goste**

- Jednostrana prezentacija: naslovna slika, galerija sa uvećavanjem, sadržaji,
  lokacija, česta pitanja
- Kalendar sa dva mjeseca — zauzeti datumi su prekriženi i ne mogu se kliknuti
- **Rezervacija i za jedan jedini dan**, bez noćenja
- Cijena se računa uživo dok se biraju datumi — osnovna, vikend i sezonska
- Stranica s potvrdom i email obavijest
- **Tri jezika** — bosanski, engleski i arapski, s ispravnim smjerom pisanja

**Za vlasnika** (`/admin`, iza tajnog koda)

- **Obavijest čim stigne zahtjev** — na Telegram (na telefon, za koju sekundu)
  i/ili na mail; lista zahtjeva se osvježava sama, bez pritiska na F5
- Odobravanje i odbijanje zahtjeva
- Pregled svih rezervacija
- Ručno blokiranje termina (održavanje, lični boravak)
- Uređivanje cijena: osnovna, vikend (subota i nedjelja) i sezonski cjenovnik
- Uređivanje bankovnih podataka
- Administracija govori isti jezik koji vlasnik odabere na sajtu

---

## Brzi start

Treba ti [Node.js](https://nodejs.org) verzije 20 ili novije.

```bash
npm install
```

```bash
npm run dev
```

Otvori <http://localhost:3000>.

**Sajt radi odmah, bez ijednog naloga.** Dok Supabase nije podešen, kalendar
koristi demo podatke da možeš vidjeti kako sve izgleda. Čim upišeš prave
ključeve, demo podaci nestaju.

### Dvije komande koje ti pomažu

```bash
npm run setup
```

Pita te ključ po ključ i sam napiše `.env.local`. Tajne za administraciju i cron
generiše sam — dovoljno je pritisnuti Enter. Sve ostaje na tvom računaru.

```bash
npm run doctor
```

Provjeri da li je **sve** ispravno i javi tačno šta fali. Najvažnije — stvarno
pokuša upisati dva preklapajuća termina u tvoju bazu i provjeri da ih odbije, pa
počisti za sobom. Nijedan ključ se ne ispisuje, samo maskirano, pa izlaz te
komande možeš slobodno nekome pokazati kad zatreba pomoć.

---

## Jezici

Sajt govori tri jezika:

| Jezik | Oznaka | Smjer |
|---|---|---|
| Bosanski | `bs` | slijeva nadesno |
| English | `en` | slijeva nadesno |
| العربية (arapski) | `ar` | **zdesna nalijevo** |

**Kako se bira.** Prvi put gost dobija ulazni ekran s pitanjem o jeziku, prije
nego se sajt uopće vidi. Pitanje na tom ekranu **kruži kroz sva tri jezika** dok
se ne odabere — ekran koji piše samo „Odaberite jezik" pomaže jedino onome ko
već razumije bosanski. Nazivi jezika na dugmadima stalno stoje u svom pismu
(Bosanski / English / العربية), pa se dugme može pogoditi i prije nego pitanje
dođe na red. Kruženje počinje od jezika koji je preglednik nagovijestio.

Izbor se pamti u kolačiću `treescape_jezik` godinu dana i **ekran se više nikada
ne pojavljuje**. Ko se poslije predomisli, mijenja jezik u navigaciji.

Izričit izbor uvijek pobjeđuje preglednik. Ko je jednom kliknuo „English", ne
želi da mu se sajt vrati na bosanski samo zato što mu je Windows na tom jeziku.

> Ulazni ekran je sloj **preko** sajta, a ne umjesto njega: sadržaj se iscrtava
> normalno i ostaje u HTML-u, pa ga pretraživači i dalje vide. Bez JavaScripta
> se ekran preskače (vidi `<noscript>` u `layout.tsx`) — inače bi zauvijek
> stajao, jer se izbor bez JavaScripta ne može ni napraviti ni zapamtiti.

**Šta se sve prevodi.** Cijela stranica, administracija, poruke o greškama iz
API-ja i mailovi. Jezik na kojem je gost rezervisao upisuje se uz rezervaciju
(kolona `bookings.locale`) — jer potvrda ili odbijanje zahtjeva
za gotovinu stižu danima kasnije, iz administracije, kad od gosta više nema ni
kolačića ni zaglavlja. Mailovi vlasniku idu na bosanskom, ali nose podatak o
tome kojim jezikom gost govori.

**Arapski.** Cijela stranica se okreće preko `dir="rtl"` na `<html>`; komponente
nigdje ne provjeravaju koji je jezik u pitanju, nego koriste logičke Tailwind
klase (`ms-`, `pe-`, `text-start`), koje se same okrenu. Za arapsko pismo se
učitava Noto Sans Arabic, a razmicanje slova i velika slova se isključuju — u
arapskom prvo lomi riječi, a drugo ne postoji. Cifre ostaju latinične, da iznos
od 345 KM i datum 5.8.2026. ne budu pisani dvjema vrstama cifara na istom
ekranu.

**Jedna adresa, ne tri.** Jezik se bira kolačićem, pa sve tri verzije žive na
istoj adresi — nema `/en/` ni `/ar/`. Za goste je to najjednostavnije: link
podijeljen na WhatsAppu radi svakome na njegovom jeziku.

Cijena toga je SEO: Google indeksira samo bosansku verziju, jer njegov robot
nema kolačić. Ako jednog dana bude važno da se sajt nalazi i po arapskim
upitima, jezici moraju dobiti svoje adrese (`/en`, `/ar`) i `hreflang` oznake.
Rječnici i sve ostalo ovdje ostaju isti — mijenja se samo gdje se jezik čita.

**Kako dodati četvrti jezik.**

1. Dodaj oznaku u `LOCALES` i smjer u `DIRECTIONS`
   ([`src/lib/i18n/config.ts`](src/lib/i18n/config.ts)) — ulazni ekran sam
   dobija novo dugme i novi jezik u kruženju
2. Napravi `src/lib/i18n/dictionaries/<oznaka>.ts` po uzoru na `bs.ts`
3. Upiši ga u `DICTIONARIES` ([`src/lib/i18n/index.ts`](src/lib/i18n/index.ts))
4. Dodaj oblike množine u `plural` ([`src/lib/i18n/plural.ts`](src/lib/i18n/plural.ts))
   i obrasce datuma u `PATTERNS` ([`src/lib/dates.ts`](src/lib/dates.ts))
5. Proširi `bookings_locale_check` u [`0001_init.sql`](supabase/migrations/0001_init.sql)

Ako nešto zaboraviš, TypeScript prijavi grešku prije nego što se sajt uopće
pokrene — tip `Dictionary` traži svaki ključ.

---

## Podešavanje Supabase baze

Supabase je besplatna hostovana Postgres baza. Ovdje čuva rezervacije i emituje
promjene uživo u sve otvorene preglednike.

**1.** Otvori nalog na [supabase.com](https://supabase.com) i napravi novi projekat.

**2.** U Supabase-u idi na **SQL Editor** i pokreni **jednu jedinu** datoteku:

[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)

Kopiraj cijeli sadržaj, zalijepi i klikni **Run**. Očekivani odgovor je
_"Success. No rows returned"_ — to je uspjeh, migracije ne vraćaju redove.

> Bezbjedno je pokrenuti i više puta: ništa se ne briše i postojeće rezervacije
> ostaju netaknute. Ako ti se ikad učini da je baza u čudnom stanju, samo je
> pokreni ponovo.

**3.** Idi na **Project Settings → API** i prepiši tri vrijednosti u `.env.local`
(ili pokreni `npm run setup`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tvoj-projekat.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> `SUPABASE_SERVICE_ROLE_KEY` je **tajni** ključ i koristi se samo na serveru.
> Nikada ga ne stavljaj u varijablu koja počinje sa `NEXT_PUBLIC_` — to bi ga
> poslalo u preglednik svakom posjetiocu.

**4.** Restartuj `npm run dev`, pa pokreni `npm run doctor` da potvrdiš da je sve na mjestu.

### Zašto preglednik ne vidi podatke gostiju

Tabela `bookings` (imena, mailovi, telefoni) je zaključana pravilima pristupa —
`anon` ključ iz preglednika iz nje **ne može pročitati nijedan red**. Kalendar
umjesto toga čita tabelu `availability_slots`, u kojoj su samo datumi i ništa
drugo. `npm run doctor` to provjerava svaki put.

---

## Kako se računa cijena

Za svaki dan boravka vrijedi prvo pravilo koje ga pokrije, ovim redom:

| Red | Pravilo | Gdje se postavlja |
|---|---|---|
| 1. | **Sezona** s najvećim prioritetom koja pokriva taj datum | `/admin` → Cijene → Sezonske cijene |
| 2. | **Vikend** — subota i nedjelja | `/admin` → Cijene → Cijena za subotu i nedjelju |
| 3. | **Osnovna cijena** | `/admin` → Cijene → Osnovna cijena po danu |

Sezona je iznad vikenda namjerno. Vlasnik je sezonu upisao za tačno te datume i
za tu cijenu; da je vikend nadglasa, ljetna subota bi se najednom naplaćivala
jeftinije od ljetnog utorka.

Vikend je zasebna postavka, a ne još jedna sezona, jer se sezone zadaju kao
rasponi datuma, a vikend se ponavlja svake sedmice — pedeset i dva reda
godišnje koje bi neko morao dopisivati svakog decembra. **0 znači isključeno**:
tada i vikend ide po osnovnoj cijeni.

Dan odlaska se ne naplaćuje, pa boravak `[dolazak, odlazak)` od petka do
ponedjeljka plaća petak, subotu i nedjelju.

Račun se radi **dva puta**: u pregledniku, da gost odmah vidi iznos dok pomjera
datume, i ponovo na serveru prije upisa u bazu. Iznos koji stigne od klijenta se
nikada ne vjeruje.

---

## Načini plaćanja

Svi načini žive u [`src/lib/payments/`](src/lib/payments/index.ts). Ostatak
aplikacije ne poznaje nijednog konkretnog procesora.

| Način | Kako radi | Šta traži |
|---|---|---|
| **Gotovina** | Gost pošalje zahtjev, vlasnik ga odobri. Termin se drži dok vlasnik ne odluči. | ništa |
| **Uplata na račun** | Gost dobije IBAN, iznos i poziv na broj. Novac ide **direktno** vlasniku, bez posrednika i provizije. Termin se drži zadanim brojem dana; vlasnik potvrdi uplatu kad je vidi na izvodu. | IBAN unesen u `/admin → Cijene` |
| **TEST** | Odmah potvrdi rezervaciju, bez ijednog centa. Služi samo za isprobavanje toka. | `ENABLE_TEST_PAYMENTS=true` |

> **TEST način na pravom sajtu znači besplatne rezervacije za svakoga.**
> Zato `npm run doctor` javlja **grešku** (ne upozorenje) ako je uključen uz
> adresu koja nije `localhost`.

Poziv na broj se izvodi iz tokena rezervacije, pa je jedinstven za svakog gosta —
po njemu vlasnik na bankovnom izvodu prepoznaje ko je uplatio.

### Naplata karticom preko banke

Naplata karticom u BiH traži potpisan ugovor s bankom ili procesorom (Monri,
WSPay, PaySpot); pristupne podatke dobiješ tek nakon toga. Kad ih dobiješ, dodaje
se **jedan unos** u `src/lib/payments/index.ts` i jedna datoteka pored njega.
Baza, kalendar i administracija se ne diraju.

Rezervacija tada ostaje u stanju „rezervisano" dok se uplata ne provjeri, isto
kao i sada — zato taj korak i ne traži izmjene drugdje.

---

## Objava na Vercel

**1.** Postavi projekat na GitHub:

```bash
git init && git add -A && git commit -m "TreeScape" && git branch -M main
```

```bash
git remote add origin https://github.com/KORISNIK/treescape.git && git push -u origin main
```

**2.** Na [vercel.com](https://vercel.com) klikni **Add New → Project** i odaberi
taj repozitorij. Vercel sam prepozna Next.js — Root Directory ostaje `./`.

**3.** U **Environment Variables** dodaj sve iz `.env.example`, s tim da:

- `NEXT_PUBLIC_SITE_URL` bude prava adresa sajta, **bez kose crte na kraju**
- `ENABLE_TEST_PAYMENTS` bude **`false`**

**4.** Cron posao iz `vercel.json` se uključi sam. Jednom dnevno oslobađa termine
kojima je istekao rok za uplatu.

> Zašto samo jednom dnevno: cron je rezervna mreža, ne glavna odbrana. Iste
> termine oslobađa i svako učitavanje kalendara i svaka nova rezervacija, pa
> zastoj crona ne može zaključati termin. Besplatni Vercel plan ionako dozvoljava
> samo dnevni cron.

Od tada Vercel objavljuje svaku izmjenu automatski, čim je pošalješ na GitHub.

---

## Drugi i treći izgled: `/treescapepro` i `/treescapeproplus`

Isti sajt, druga i treća koža. Otvori `/treescapepro` ili `/treescapeproplus` —
dobiješ istu kuću, isti tekst, iste cijene i istu rezervaciju, samo u drugom
izgledu.

**Šta je zajedničko (i mora ostati zajedničko):**

| | Gdje živi |
|---|---|
| Tekst na tri jezika | `src/lib/i18n/dictionaries/` |
| Cijene, sezone, provjere | `src/lib/pricing.ts` |
| Cijela pamet rezervacije | `src/components/booking/useStayForm.ts` |
| Kalendar | `src/components/booking/StayCalendar.tsx` |
| Uvećane slike | `src/components/site/Lightbox.tsx` |
| Koordinate i karta | `src/lib/location.ts` |
| Kontakt telefon i mail | `src/components/site/Footer.tsx` (`CONTACT`) |

Sva tri izgleda gađaju **istu bazu i iste API rute**. Termin zauzet na jednoj
verziji istog trena je zauzet i na ostalima — nema tri kopije podataka, pa se
ne mogu razići.

**Šta se razlikuje — `/treescapepro`:** izgled u `src/components/pro/` i u
`.pro` dijelu `src/app/globals.css`. Druga pisma (Cormorant Garamond i Jost),
druga paleta (noć, slonovača, mesing), oštre ivice umjesto zaobljenih, više
praznog prostora.

**Šta se razlikuje — `/treescapeproplus`:** izgled u `src/components/plus/` i u
`.plus` dijelu `src/app/globals.css`. Treća pisma (Instrument Serif i Manrope),
treća paleta (papir, zimzelena, glina), velika zaobljenja i sjene u tri sloja.
Ovo je jedina verzija koja ima i **animacije vezane za skrol** — sve su u
`src/components/motion/` i sve su čist `opacity`/`transform`, bez ijedne
animacijske biblioteke.

Ta verzija ima i dva odjeljka kojih druge dvije nemaju: „Od datuma do ključa"
(kako rezervacija teče, u tri koraka) i završni poziv prije podnožja. Oba
odgovaraju na pitanja koja gost inače postavi telefonom, i oba opisuju tačno
ono što kod stvarno radi.

**Šta se tu tačno kreće:**

| | Gdje živi |
|---|---|
| Naslovna scena kroz koju se ulazi | `motion/Scene.tsx` + `.plus-scene`/`.scene-*` u globals.css |
| Silueta šume (prednji plan scene) | `plus/Treeline.tsx` |
| Glatki skrol s inercijom | `motion/SmoothScroll.tsx` (Lenis) |
| Slojevi na različitim brzinama | `motion/Parallax.tsx` |
| Naslovi red po red | `motion/LineReveal.tsx` + `.line-reveal` u globals.css |
| Pojavljivanje pri skrolanju | `motion/Reveal.tsx` |
| Brojevi koji se odbroje | `motion/Counter.tsx` |
| Traka napretka i oznaka odjeljka | `motion/ScrollProgress.tsx`, `use-active-section.ts` |

Sve što se kreće uz skrol dijeli JEDAN `requestAnimationFrame`
(`motion/scroll-ticker.ts`). Nije sitnica: skrol vodi Lenis iz svog rAF-a, pa
bi sloj koji sluša `scroll` događaj crtao kadar kasnije i vidljivo „plivao" za
sadržajem.

**Naslovna scena** radi tako što je odjeljak visok dva i po ekrana, a njegov
sadržaj je `position: sticky` — stranica naizgled stane, a kamera krene
naprijed. JavaScript pritom postavlja SAMO `--p` (koliko je scene prošlo, od 0
do 1); koji sloj koliko naraste i kad se šta pojavi računa CSS iz te jedne
brojke. Prednji plan (krošnja i četinari) je vektorski crtež, jer sloj kroz
koji kamera prolazi mora biti izrezan od pozadine — fotografija kuće je jedna
ravna slika i takva se ne može rastaviti.

Lenis je jedina biblioteka na cijelom sajtu (oko 4 KB) i uključuje se samo na
ovoj stranici. Ko u sistemu ima „smanji animacije", ne dobija ništa od ovoga —
ni glatki skrol, ni paralaksu, ni odbrojavanje; naslovi mu se pokažu odmah, bez
čekanja da doskrola do njih.

Pisma se preuzimaju **samo** kad neko otvori tu stranicu — posjetilac glavnog
sajta ih nikad ne dobije (`preload: false` u oba `layout.tsx`).

Obje stranice su označene s `noindex`: pokazuju se kupcu, a ne gostima, i ne
treba da se u Googleu takmiče s pravim sajtom za iste riječi.

> Ako ti se neki od ovih izgleda više svidi, prebacivanje je zamjena komponenti
> u `src/app/page.tsx` — logika ispod je već ista.

---

## Obavijesti o novim zahtjevima

Kad gost pošalje zahtjev za plaćanje gotovinom, termin se odmah zauzme — ali
samo privremeno. Ako vlasnik ne odluči na vrijeme, zahtjev istekne i termin se
oslobodi. Zato je bitno da obavijest stigne **odmah**, a ne kad se neko sjeti
otvoriti `/admin`.

Postoje dva kanala. Mogu se uključiti oba, ili samo jedan — šalje se na sve što
je podešeno, a svaki ide nezavisno (ako mail padne, Telegram svejedno stigne).

### Telegram (preporučeno)

Stiže kao poruka na telefon, za koju sekundu. Besplatno je i ne traži domen.

1. U Telegramu potraži **@BotFather** → pošalji `/newbot` → dobiješ **token**
2. **Napiši svom novom botu bilo šta** (npr. „zdravo"). Dok mu ne napišeš prvi,
   Telegram mu ne dozvoljava da tebi šalje poruke — ovaj korak se najčešće
   preskoči, pa onda ništa ne stiže.
3. Otvori `https://api.telegram.org/bot<TOKEN>/getUpdates` i prepiši broj iz
   `"chat":{"id": ... }`

U Vercel → Settings → Environment Variables dodaj:

```
TELEGRAM_BOT_TOKEN=123456789:AA...
TELEGRAM_CHAT_ID=987654321
```

### Email

Mail ide i vlasniku i **gostu** (potvrda zahtjeva, odobrenje, odbijanje). Za
slanje postoje dva načina — dovoljan je jedan. Ako su podešena oba, prednost
ima Gmail.

**Gmail — najlakši, ne traži vlastiti domen.** Šalje s tvoje Google adrese,
bilo kome, odmah:

```
GMAIL_USER=tvoja.adresa@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
OWNER_EMAIL=vlasnik@primjer.ba
```

`GMAIL_APP_PASSWORD` **nije** lozinka kojom se prijavljuješ na Google. To je
zasebna *lozinka za aplikacije* od 16 znakova:

1. Uključi dvostruku provjeru na Google nalogu — bez nje se ova opcija ne
   pojavljuje
2. [myaccount.google.com](https://myaccount.google.com) → Security →
   App passwords → napravi novu
3. Prepiši 16 znakova (razmaci nisu bitni)

Može se poništiti kad god, bez diranja same lozinke naloga. Google dozvoljava
oko 500 poruka dnevno s obične adrese — za jednu kuću je to daleko iznad
potrebe.

**Resend — za kasnije, kad kuća dobije svoj domen.** Tada mailovi idu s
`rezervacije@treescape.ba` umjesto s lične Gmail adrese:

```
RESEND_API_KEY=re_...
EMAIL_FROM=TreeScape <rezervacije@treescape.ba>
```

> Zamka: dok domen nije potvrđen u Resend-u, on prima **samo adresu s kojom je
> nalog otvoren**. Proba na vlastitu adresu prođe i djeluje kao da sve radi, a
> prvom pravom gostu mail nikad ne stigne. Zato je Gmail prvi izbor sve dok
> domena nema. `npm run doctor` posebno upozori na ovaj slučaj.

> Nakon dodavanja varijabli **obavezno pokreni novu objavu** (Vercel → Redeploy).
> Varijable se čitaju pri gradnji, pa ih stari build ne vidi.

Ako nijedan kanal nije podešen, sajt i dalje radi normalno i zahtjev se uredno
upiše — ali o njemu niko nije obaviješten. Tada se u dnevniku (Vercel → Logs)
pojavi jasna poruka `NEMA OBAVIJESTI VLASNIKU` s uputom šta podesiti.

Bez obzira na kanale, otvorena `/admin` stranica se **osvježava sama** čim
stigne novi zahtjev — brojka uz karticu „Zahtjevi" poraste bez pritiska na F5.

### Provjera, bez pravljenja lažnih rezervacija

`/admin` → **Zahtjevi** ima dva dugmeta:

- **Pošalji probnu obavijest** — provjerava Telegram
- **Pošalji probni mail gostu** — šalje TAČNO onaj mail koji gost dobije nakon
  zahtjeva za gotovinu, na `OWNER_EMAIL`

Oba vraćaju pravi razlog neuspjeha na ekran (pogrešan ključ, nepotvrđen domen,
`chat not found`…), a ne samo „došlo je do greške".

---

## Zamjena fotografija i teksta

Sve slike su trenutno prazni okviri s natpisom **SLIKA 1 … SLIKA 14**.

1. Nazovi svoju sliku isto kao onu koju mijenjaš — npr. `slika-01.jpg`
2. Prebaci je u `src/assets/gallery/` i prepiši postojeću
3. U rječnicima (`src/lib/i18n/dictionaries/`) promijeni `gallery.itemAlt` i
   `gallery.itemCaption` da opisuju šta se stvarno vidi — na sva tri jezika

**SLIKA 1** je naslovna, preko cijelog ekrana — neka bude široka i najljepša.
**SLIKA 3** i **SLIKA 6** su uspravne, ostale položene.

Next.js sam pravi WebP/AVIF verzije, računa dimenzije i prikazuje zamućeni
pregled dok se slika učitava. Ne treba ništa ručno smanjivati.

`alt` je opis za slijepe osobe i za Google — nikad ga ne ostavljaj prazan i
nemoj u njega pisati „slika", nego šta se na slici vidi.

**Ostalo što treba zamijeniti prije nego pustiš link gostima:**

| Šta | Gdje |
|---|---|
| Sav tekst sajta, na sva tri jezika | [`src/lib/i18n/dictionaries/`](src/lib/i18n/dictionaries/) |
| Telefon i email | [`src/components/site/Footer.tsx`](src/components/site/Footer.tsx) |
| Koordinate karte | [`src/components/site/Location.tsx`](src/components/site/Location.tsx) |
| Koji sadržaji se prikazuju i kojim redom | [`src/components/site/Amenities.tsx`](src/components/site/Amenities.tsx) |
| Minuti vožnje do okoline | [`src/components/site/Location.tsx`](src/components/site/Location.tsx) |

Nazivi sadržaja, pitanja i odgovori i sve ostale riječi stoje u rječnicima —
komponente drže samo ono što ne zavisi od jezika (ikone, redoslijed, brojeve).

---

## Administracija

Otvori `/admin`. Nigdje na javnom sajtu **ne postoji link** ka administraciji,
niti forma za prijavu — samo polje za tajni kod.

```bash
openssl rand -base64 24   # ADMIN_ACCESS_CODE
openssl rand -base64 32   # ADMIN_SESSION_SECRET
```

- `ADMIN_ACCESS_CODE` — kod koji vlasnik unosi. **Najmanje 12 znakova**; kraći se
  ne prihvata nego prijava vraća poruku da ga treba produžiti. Ovaj jedan kod je
  jedina brava između interneta i imena, mailova i telefona svih gostiju.
- `ADMIN_SESSION_SECRET` — najmanje 32 znaka, potpisuje kolačić sesije

Sesija traje 12 sati. Kolačić je `httpOnly` (JavaScript na stranici ne može do
njega), kod se poredi u konstantnom vremenu, a nakon 5 pogrešnih pokušaja u
minuti slijedi kratka pauza.

> `npm run doctor` odbija kodove koji su primjeri iz uputstva i upozorava na
> kodove oblika „Ime1234" — takve pogađa svako ko te poznaje.

### Dvofaktorska zaštita

Uz pristupni kod, prijava može tražiti i šestocifreni broj iz aplikacije na
telefonu (TOTP — Google Authenticator, Authy, 1Password, iOS Lozinke, bilo koja).
Time ukraden ili pogođen pristupni kod više nije dovoljan.

```bash
npm run totp
```

Skripta napravi tajnu, pokaže je u obliku koji aplikacija razumije i **odmah
provjeri da se poklapa** — pa je tek onda upisuješ u `ADMIN_TOTP_SECRET`. Bez te
provjere bi se greška vidjela tek pri prvoj prijavi na živom sajtu, kada je već
kasno.

Dok je `ADMIN_TOTP_SECRET` prazan, prijava radi kao i prije — samo pristupni kod.
Čim se postavi:

- prijava traži oba podatka, na **istom ekranu**. Namjerno: da drugi ekran iskače
  tek kad je pristupni kod tačan, napadaču koji pogađa bi to potvrdilo da je
  pogodio prvi faktor;
- **sve otvorene sesije prestaju vrijediti**, jer žeton nosi zapis kojim se
  faktorima korisnik dokazao. Bez toga bi kartica otvorena prije uključivanja
  zaštite narednih 12 sati radila bez nje;
- isti kod se ne može upotrijebiti dvaput, pa onaj ko ga vidi preko ramena ne
  stigne za tobom.

> **Izgubljen telefon.** Obriši `ADMIN_TOTP_SECRET` iz Vercela i pokreni Redeploy
> — prijava se vraća na sam pristupni kod, pa pokreni `npm run totp` s novim
> telefonom. To je namjerno jedini rezervni izlaz: pristup hosting nalogu čuvaj
> barem koliko i sam pristupni kod.

Račun je pisan u [`src/lib/totp.ts`](src/lib/totp.ts) umjesto uzet kao gotov
paket — kratak je, a provjeren **službenim test vektorima iz RFC-a 6238**
([`src/lib/totp.test.ts`](src/lib/totp.test.ts)). Zaseban test pazi i da skripta
za podešavanje računa isto što i sajt; da se raziđu, skripta bi rekla „poklapa
se", a prijava bi isti kod odbijala.

### Čime je administracija zatvorena

Ne jednom bravom nego s više njih, jer podaci iza nje su tuđi:

| Sloj | Gdje | Šta hvata |
|---|---|---|
| Drugi faktor (kod s telefona) | [`src/lib/totp.ts`](src/lib/totp.ts) | ukraden ili pogođen pristupni kod |
| Čuvar ispred svega pod `/admin` i `/api/admin` | [`src/proxy.ts`](src/proxy.ts) | zahtjev bez sesije |
| Ista provjera **u svakoj ruti posebno** | [`src/lib/admin-guard.ts`](src/lib/admin-guard.ts) | rutu koja ispadne iz `matcher`-a ili se premjesti |
| Provjera porijekla zahtjeva | [`src/lib/csrf.ts`](src/lib/csrf.ts) | tuđu stranicu koja se vozi na vlasnikovoj otvorenoj sesiji |
| Ograničenje pokušaja po adresi | [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts) | skriptu koja gađa pristupni kod |
| Pravila o sadržaju (CSP s jednokratnim potpisom) | [`src/proxy.ts`](src/proxy.ts) | ubačenu skriptu i otvaranje sajta u tuđem okviru |
| Zabrana čitanja tabele `bookings` iz preglednika | [`supabase/schema.sql`](supabase/schema.sql) | pokušaj da se podaci gostiju izvuku javnim ključem |

Dupliranje prve dvije stavke je namjerno. Čuvar na jednom mjestu pada zajedno s
jednom omaškom u `matcher`-u, a ono što bi tada ispalo su imena, mailovi i
telefoni gostiju — bez ijedne greške u logu. Test
[`src/lib/admin-routes.test.ts`](src/lib/admin-routes.test.ts) čita sam izvorni
kod i pukne ako se doda admin ruta koja je zaboravila `requireAdmin`.

`CRON_SECRET` je **obavezan**: bez njega `/api/cron/expire-holds` vraća 401
umjesto da se izvrši. Zaključana cron ruta ništa ne lomi — istekle termine
oslobađa i svako čitanje dostupnosti.

---

## Kako je spriječen dvostruki booking

Ovo je najvažniji dio sistema.

Dvoje ljudi može istovremeno rezervisati isti termin. Provjera u kodu tipa „je li
slobodno?" pa onda upis **gubi tu utrku** — oba upita vide slobodan termin prije
nego iko upiše.

Zato odluku donosi sama baza:

```sql
constraint bookings_no_overlap
  exclude using gist (stay with &&)
  where (status in ('pending_payment', 'pending_cash', 'pending_transfer',
                    'confirmed', 'blocked'))
```

Postgres fizički **ne dozvoljava** da dva reda koja se preklapaju istovremeno
budu aktivna. Drugi upis pada s greškom `23P01`, koju aplikacija hvata i pretvara
u poruku „ovi datumi su upravo rezervisani".

Uz to:

- **Termin se drži od trenutka rezervacije**, ne od potvrde. Neplaćena uplata na
  račun se oslobodi nakon isteka roka — i preko cron posla i pri svakom čitanju
  dostupnosti, pa zastoj crona ne može zaključati termin zauvijek.
- **Dan odlaska je slobodan.** Boravak 1.–5. avgusta zauzima 4 dana, a 5. avgust
  je slobodan sljedećem gostu. To se poklapa s odjavom u 09:00 i prijavom u 11:00
  istog dana, a u bazi to radi `daterange(start, end, '[)')`.
- **Jedan dan bez noćenja** se upisuje kao `[dan, dan+1)`, pa taj dan stvarno
  bude zauzet i isto ograničenje radi nepromijenjeno.
- **Cijenu uvijek računa server**, iz baze. Iznos poslan iz preglednika se ignoriše.

Sve navedeno je pokriveno testovima.

---

## Testovi

```bash
npm test
```

101 test, u tri grupe:

- **`src/lib/pricing.test.ts`** — sezonske cijene, preklapanje sezona, vikend
  cijena i njen odnos prema sezoni, rezervacija jednog dana, granični slučajevi
  oko dana odlaska
- **`src/lib/i18n/i18n.test.ts`** — prepoznavanje jezika iz kolačića i zaglavlja,
  množina na sva tri jezika (uključujući arapsku dvojinu), obrasci datuma i novca,
  i provjera da nijedan prevod nije ostao prazan
- **`src/lib/schema.test.ts`** — pokreće shemu na **pravom Postgresu**
  (PGlite, Postgres preveden u WebAssembly) i provjerava da je dvostruki booking
  zaista nemoguć, da otkazivanje oslobađa termin, da okidač održava kalendar i da
  isteklo držanje termina propada kako treba

Za ovo ne treba nikakav nalog ni internet — pokreće se lokalno za par sekundi.

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run build
```

---

## Struktura projekta

```
src/
├── app/
│   ├── page.tsx                  početna stranica
│   ├── layout.tsx                fontovi, meta podaci
│   ├── globals.css               dizajn sistem (boje, tipografija, kalendar)
│   ├── admin/                    administracija
│   ├── treescapepro/             drugi izgled
│   ├── treescapeproplus/         treći izgled
│   ├── rezervacija/[token]/      stranica s potvrdom
│   └── api/
│       ├── availability/         javni spisak zauzetih datuma
│       ├── booking/reserve       rezervacija (svi načini plaćanja)
│       ├── admin/                zaštićene rute administracije
│       └── cron/expire-holds     oslobađanje termina s isteklim rokom
├── components/
│   ├── site/                     naslovna, galerija, sadržaji, lokacija, pitanja
│   ├── pro/                      isti sadržaj, izgled /treescapepro
│   ├── plus/                     isti sadržaj, izgled /treescapeproplus
│   ├── motion/                   animacije uz skrol (koristi ih samo `plus`)
│   ├── booking/                  kalendar, cijena, forma, podaci za uplatu
│   ├── i18n/                     birač jezika i rječnik za klijentske komponente
│   └── admin/                    ulaz i nadzorna ploča
├── lib/
│   ├── pricing.ts                obračun cijene (isti kod na klijentu i serveru)
│   ├── dates.ts                  datumi kao 'YYYY-MM-DD' — bez pomaka zona
│   ├── booking-service.ts        pravljenje rezervacija, hvatanje sudara
│   ├── payments/                 načini plaćanja
│   ├── i18n/                     jezici: rječnici, množina, prepoznavanje
│   ├── gallery.ts                spisak fotografija
│   └── supabase/                 klijenti za preglednik i server
├── proxy.ts                      čuvar administracije
└── assets/gallery/               fotografije

supabase/migrations/              shema baze — jedna datoteka, pokreni je jednom
scripts/                          npm run setup i npm run doctor
```

---

## Napomene

- **Datumi** se svuda prenose kao `'YYYY-MM-DD'` stringovi. `new Date('2026-08-05')`
  JavaScript tumači kao ponoć po UTC-u, pa bi u Sarajevu ispalo 4. avgusta —
  za rezervacije neprihvatljivo.
- **Cijene** su u bazi u centima (`25000` = 250,00 KM) da se izbjegne
  zaokruživanje decimalnih brojeva.
- **Jedinica je dan, ne noćenje** — jer se kuća može uzeti i samo za jedan dan.
- **Valuta** se mijenja u administraciji pod „Cijene".
