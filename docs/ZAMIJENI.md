# Šta zamijeniti svojim

Sajt je trenutno **demo**: umjesto pravih fotografija, imena i cijene stoje
prazna mjesta. Ovaj spisak je sve što treba promijeniti da postane tvoj.
Poredano po tome koliko se vidi.

---

## 1. Fotografije

**Gdje:** `src/assets/gallery/`

Devet fajlova, `slika-01.jpg` do `slika-09.jpg`. Zamijeni ih svojim i
**zadrži ista imena** — ostatak sajta ih traži po imenu, pa ništa drugo ne
treba dirati.

Proporcije su bitne, ne veličina:

| Fajl | Gdje se vidi | Oblik |
|---|---|---|
| `slika-01.jpg` | naslovna scena, preko cijelog ekrana | **položena**, široka |
| `slika-04.jpg` | naslovna, iza teksta | **položena** |
| ostale | galerija i odjeljci | **uspravne** rade najbolje |

Najmanje 2000 px po dužoj strani. Svaki noviji telefon je dovoljan — samo
pošalji original, ne screenshot i ne kroz WhatsApp (kompresija ih smanji na
trećinu).

---

## 2. Ime kuće

**Gdje:** `src/lib/i18n/dictionaries/bs.ts`, `en.ts`, `ar.ts`

Traži `VAŠE IME` (bosanski), `YOUR NAME` (engleski), `اسمك هنا` (arapski) —
po devet mjesta u svakom. Zamijeni svojim imenom u sva tri fajla.

Isto ime ide i u naslov kartice preglednika, u mailove koje gost dobija i u
podnožje — sve to čita odavde.

---

## 3. Kontakt

**Gdje:** `src/lib/contact.ts`

Broj telefona i mail. Pazi na `phoneHref` — to je isti broj bez razmaka, ono
na šta se telefon javi kad gost pritisne broj. Ako promijeniš samo prvi, broj
će **pisati** tačno a **zvati** pogrešno.

---

## 4. Lokacija

**Gdje:** `src/lib/location.ts`

- `MAP_MARKER` — koordinate koje crta karta
- `GOOGLE_MAPS_URL` — link koji podijeliš iz aplikacije Mape
- `TRAVEL` — minute vožnje do grada, aerodroma i prodavnice

Koordinate i link **moraju pokazivati na isto mjesto**; ništa ih ne provjerava
automatski.

Naziv grada je u rječnicima, pod `places.city` — sad piše "Vaš grad".

---

## 5. Cijene

**Gdje:** u administraciji, ne u kodu. `tvoj-domen.ba/admin` → tab **Pricing**.

Osnovna cijena, vikend cijena, sezone, najduži boravak, broj gostiju, vrijeme
prijave i odjave, valuta.

Brojke koje sada vidiš su privremene i dolaze iz `src/lib/demo-data.ts` — to
je ono što se prikaže **dok baza nije podešena**. Čim postaviš Supabase i
uneseš svoje cijene u adminu, demo brojke se više nigdje ne vide.

Te brojke namjerno nisu dirane: moraju odgovarati podrazumijevanim
vrijednostima u `supabase/migrations/0001_init.sql`. Da se razlikuju, cijena
bi se sama promijenila u trenutku kad spojiš bazu — bez ijedne tvoje izmjene.
Postoji test koji to čuva.

---

## 6. Sobe i kupatila

**Gdje:** `src/lib/property.ts`

Broj gostiju NIJE ovdje — njega postavljaš u administraciji, jer se s njim
mijenja i provjera pri rezervaciji.

---

## 7. Tekstovi o kući

**Gdje:** `src/lib/i18n/dictionaries/`

Opisi, sadržaji i pitanja su ostavljeni kao **primjer koji se čita** — da vidiš
kako sajt izgleda kad je pun, a ne kao niz praznih polja. Prepiši ih svojim
riječima kad stigneš; sajt radi i dok stoje ovakvi.

Tri fajla, tri jezika. Ako ne govoriš arapski, `ar.ts` slobodno ostavi za
kraj — posjetilac koji ne bira arapski ga nikad ne vidi.

---

## Prije nego pustiš pravim gostima

- [ ] Slike zamijenjene
- [ ] Ime u sva tri rječnika
- [ ] Kontakt i `phoneHref`
- [ ] Koordinate i link na Mape
- [ ] Cijene unesene u administraciji
- [ ] `ADMIN_ACCESS_CODE` dug i jedinstven, `ADMIN_TOTP_SECRET` uključen
- [ ] Migracije pokrenute (`supabase/migrations/`, oba fajla)

Sve varijable okruženja i gdje se svaka nalazi: `docs/vercel.env`.
