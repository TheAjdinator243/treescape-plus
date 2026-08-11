/** English — for guests who do not speak Bosnian. */

import type { Dictionary } from '../dictionary';
import { count, plural } from '../plural';

export const en: Dictionary = {
  site: {
    name: 'TreeScape',
    tagline: 'A villa in the arms of the forest',
    description:
      'TreeScape is a villa surrounded by forest — quiet, nature and all the comfort of home. Check the free dates and book online.',
    keywords: [
      'TreeScape',
      'villa',
      'holiday home',
      'accommodation',
      'house rental',
      'nature retreat',
      'booking',
      'Bosnia and Herzegovina',
    ],
  },

  language: {
    label: 'Language',
    names: { bs: 'Bosanski', en: 'English', ar: 'العربية' },
    gateTitle: 'Choose your language',
    gateLead: 'Which language would you like to browse in?',
    gateAria: 'Choose your language: Bosanski, English, العربية',
  },

  nav: {
    about: 'The house',
    gallery: 'Gallery',
    amenities: 'Amenities',
    location: 'Location',
    faq: 'FAQ',
    book: 'Book now',
    menu: 'Menu',
    close: 'Close',
    skipToBooking: 'Skip to booking',
    mainNav: 'Main navigation',
  },

  hero: {
    eyebrow: 'Private holiday villa',
    title: 'TreeScape',
    subtitle: 'Wake up to the sound of the forest, not the sound of the city.',
    cta: 'Check availability',
    secondaryCta: 'See the house',
    scroll: 'Find out more',
    imageAlt: 'TreeScape villa',
    freeFrom: (date) => `First free date: ${date}`,
    freeToday: 'Free from today',
  },

  steps: {
    eyebrow: 'How it works',
    heading: 'From dates to keys, in three steps',
    lead: 'No phone calls, and no waiting for a reply just to see what is free.',
    items: [
      {
        title: 'Pick your dates',
        body: 'The calendar shows what is free as it happens, and the price is worked out while you choose — base, weekend and seasonal, with nothing hidden.',
      },
      {
        title: 'Send the request',
        body: 'The dates are held for you straight away and other guests already see them as taken. Nobody can take them from you in the meantime.',
      },
      {
        title: 'The host confirms',
        body: 'The decision arrives by email and your booking page refreshes itself.',
      },
    ],
  },

  finalCta: {
    heading: 'The forest is just as good on a Tuesday',
    lead: 'Check the free dates and book in a couple of minutes. If anything is unclear, get in touch — we answer the same day.',
    contact: 'Ask us anything',
  },

  about: {
    heading: 'Welcome to TreeScape',
    lead: 'A house hidden among the trees — close enough to reach easily, far enough to finally rest.',
    body: [
      'TreeScape is a family villa surrounded by tall forest, with a large terrace facing the valley. Inside there is everything you need for a longer stay — a fully equipped kitchen, a warm living room with a fireplace and bedrooms you actually sleep in.',
      'Ideal for a family holiday, a weekend escape with friends or a quiet week of working from nature. Barbecue and long evenings on the terrace in summer, snow and a lit fireplace in winter.',
    ],
    imageAlt: 'TreeScape villa from outside',
    stats: {
      guests: 'guests',
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
    },
  },

  gallery: {
    heading: 'Gallery',
    lead: 'See what your next holiday looks like.',
    open: 'Open photo',
    prev: 'Previous photo',
    next: 'Next photo',
    close: 'Close gallery',
    counter: (index, total) => `${index} / ${total}`,
    /**
     * Opis svake fotografije, po njenom rednom broju (vidi `lib/gallery.ts`).
     * `alt` čita čitač ekrana i Google; natpis se vidi pri prelasku mišem i
     * ispod uvećane slike.
     */
    itemAlt: (n) =>
      (
        ({
          2: 'The pool and terrace on a summer afternoon',
          3: 'Covered terrace looking out over the valley',
          4: 'The pool and loungers under the evening lights',
          5: 'Sunset above the pool',
          6: 'Hot tub on the terrace, facing the forest',
          7: 'Brick barbecue and fireplace under the timber roof',
          8: 'Attic bedroom with exposed timber beams',
          9: 'A celebration set up in the yard',
        }) as Record<number, string>
      )[n] ?? 'A photo of the house',
    itemCaption: (n) =>
      (
        ({
          2: 'Pool and terrace',
          3: 'Terrace with a view',
          4: 'The pool at night',
          5: 'Sunset over the pool',
          6: 'Hot tub',
          7: 'Barbecue and fireplace',
          8: 'Attic bedroom',
          9: 'Celebrations in the yard',
        }) as Record<number, string>
      )[n] ?? 'A photo of the house',
  },

  amenities: {
    heading: 'What is waiting for you',
    lead: 'Everything is already here — just bring your bag.',
    items: {
      pool: { label: 'Swimming pool', note: 'Heated by a heat pump' },
      // A šadrvan is an Ottoman courtyard fountain, not a garden ornament —
      // plain "Fountain" loses the thing entirely, so the label names what it
      // is and the note keeps the local word.
      fountain: {
        label: 'Ottoman fountain',
        note: 'A traditional šadrvan in the yard, by the seating',
      },
      wifi: { label: 'Internet', note: 'Wi-Fi throughout the house' },
      kitchen: { label: 'Equipped kitchen', note: 'All cookware and appliances' },
      fire: { label: 'Fireplace', note: 'Firewood provided' },
      grill: { label: 'Barbecue and garden furniture', note: 'For long summer evenings' },
      car: { label: 'Free parking', note: 'Up to three cars in the yard' },
      heat: { label: 'Central heating', note: 'Warm in the middle of winter' },
      washer: { label: 'Washing machine', note: 'Tumble dryer as well' },
      tv: { label: 'Smart TV', note: 'Netflix and local channels' },
      pet: { label: 'Pets welcome', note: 'Please tell us in advance' },
      tree: { label: 'Large garden', note: '2000 m² of fenced grounds' },
      coffee: { label: 'Coffee machine', note: 'Turkish coffee and espresso' },
      towel: { label: 'Bed linen and towels', note: 'Included in the price' },
    },
  },


  showcase: {
    eyebrow: 'What is waiting for you',
    heading: 'The house, part by part',
    lead: 'What the photo at the top does not show — from the pool to the attic.',
    item: (n) =>
      (
        {
          2: {
            title: 'The pool',
            body: 'Heated by a heat pump, 7.5 × 3 m — big enough to swim in, gentle enough for children. Around it a paved terrace with loungers and garden seating.',
          },
          3: {
            title: 'Covered terrace',
            body: 'Long benches and tables under a timber roof, facing the valley. Breakfast happens here, and so does everything up until dark.',
          },
          4: {
            title: 'Evenings by the pool',
            body: 'When it gets dark the yard lights up. Lights along the fence, loungers by the water, and a quiet broken only by the forest.',
          },
          5: {
            title: 'Sunset over the valley',
            body: 'Early evening by the pool, looking out over the treetops. This is the part of the day that makes guests stay longer than they planned.',
          },
          6: {
            title: 'Hot tub',
            body: 'On the terrace, facing the forest. Warm even when it is cold outside — it gets used in spring and autumn too.',
          },
          7: {
            title: 'Barbecue and fireplace',
            body: 'A brick barbecue under the timber roof, with an open hearth and stacked firewood. The wood is provided, and the seating is right by the fire.',
          },
          8: {
            title: 'Bedrooms',
            body: 'An attic under exposed timber beams. The house has two bedrooms and room for eight guests, with bed linen and towels included in the price.',
          },
          9: {
            title: 'Celebrations',
            body: 'The yard turns into a place for a celebration easily — a birthday, a gathering, a small party. For a larger group, get in touch before booking.',
          },
        } as Record<number, { title: string; body: string }>
      )[n] ?? { title: '', body: '' },
    extraTitle: 'Also included',
    extraLead: 'The things you take for granted, and miss the moment they are not there.',
  },
  location: {
    heading: 'Where we are',
    lead: 'Close enough to reach easily, far enough to hear nothing but the forest.',
    mapTitle: 'Map of the TreeScape villa location',
    openInMaps: 'Open in Google Maps',
    opensInNewTab: 'opens in a new tab',
    driveTime: (minutes) => `${minutes} min drive`,
    places: {
      city: 'Sarajevo',
      airport: 'Airport',
      shop: 'Nearest shop',
    },
  },

  faq: {
    heading: 'Frequently asked questions',
    lead: 'If anything is unclear, feel free to get in touch.',
    items: ({ checkinTime, checkoutTime, maxGuests }) => [
      {
        q: 'When can I arrive and when do I have to leave?',
        a: `Check-in is from ${checkinTime} and check-out is by ${checkoutTime}. If you need an earlier arrival or a later departure, let us know — it can usually be arranged.`,
      },
      {
        q: 'How does booking work?',
        a: 'You pick your dates and send the booking. We hold the dates for you straight away and other guests already see them as taken. The booking is final only once the host accepts it — we let you know by email.',
      },
      {
        q: 'Can I cancel my booking?',
        a: 'Please contact us as soon as possible, by the email or phone number in the page footer. Refund terms depend on how much time is left before arrival.',
      },
      {
        q: 'Are pets allowed?',
        a: 'Yes, if you tell us in advance — please mention it in the note when booking so we can prepare the house.',
      },
      {
        q: 'Is bed linen included?',
        a: 'It is. Bed linen, towels and basic toiletries are included in the price — there are no extra fees.',
      },
      {
        q: 'How many people can stay in the house?',
        a: `The house sleeps up to ${maxGuests} people. For larger groups, please contact us before booking.`,
      },
      {
        q: 'Is there internet and mobile coverage?',
        a: 'There is — Wi-Fi covers the whole house and the mobile signal is stable.',
      },
      {
        q: 'How do I get the address and the key?',
        a: 'Once your booking is confirmed we email you the exact address, directions and the host’s phone number. The host meets you and hands over the key.',
      },
    ],
  },

  booking: {
    heading: 'Book your dates',
    lead: 'Click one date for a day stay without an overnight, or two for a longer stay. Booked dates are shown in grey and cannot be selected.',

    pickDates: 'Pick your dates',
    checkIn: 'Arrival',
    checkOut: 'Departure',
    notSelected: 'Not selected',
    clearDates: 'Clear selection',

    legendFree: 'Available',
    legendTaken: 'Booked',
    legendSelected: 'Your selection',

    guests: 'Number of guests',
    name: 'Full name',
    namePlaceholder: 'Your full name',
    email: 'Email address',
    emailPlaceholder: 'you@email.com',
    phone: 'Phone number',
    phonePlaceholder: '+387 6x xxx xxx',
    note: 'Note for the host',
    notePlaceholder: 'Bringing a pet? Arriving late? Tell us here.',
    optional: 'optional',

    summaryTitle: 'Booking summary',
    daysLabel: (n) => count('en', n, plural.en.days),
    total: 'Total',
    seasonalNote: 'The daily rate depends on the season.',
    weekendNote: 'Saturdays and Sundays are charged at the weekend rate.',
    singleDayNote: 'A single-day booking, without an overnight stay.',
    timesNote: (checkIn, checkOut) =>
      `Check-in from ${checkIn} on the day of arrival, check-out by ${checkOut} on the day of departure.`,

    payMethodTitle: 'Payment method',

    payTransfer: 'Bank transfer',
    payTransferHint:
      'You receive the account number and a payment reference. We hold the dates for you until the payment arrives.',

    payCash: 'Cash payment',
    payCashHint:
      'You send a request to the host. We hold the dates for you until the host confirms — usually the same day.',

    payTest: 'TEST booking',
    payTestHint:
      'For trying things out only — confirms the booking without any payment. Guests never see this.',

    reserve: 'Book now',
    submitting: 'One moment…',

    selectDatesFirst: 'Please pick a date in the calendar first.',
    singleDayHint: 'Click one date for a day stay, or another one for a longer stay.',
    unavailableRange:
      'The selected range contains dates that are already booked. Please pick a range without them.',

    wizard: {
      dates: 'Dates',
      details: 'Your details',
      review: 'Review',
      next: 'Next',
      back: 'Back',
      stepOf: (step, total) => `Step ${step} of ${total}`,
      reviewLead: 'Check everything before you send it.',
    },
  },

  confirmation: {
    pageTitle: 'Your booking',

    confirmedTitle: 'Your booking is confirmed',
    confirmedLead:
      'The host has confirmed your booking. The dates are yours and other guests now see them as taken.',

    pendingTitle: 'The dates are held for you',
    pendingLead:
      'We are holding the dates for you and other guests already see them as taken. The booking is final only once the host accepts it — we will email you as soon as possible.',

    transferTitle: 'The dates are held for you',
    transferLead:
      'Only the payment is left. We hold the dates for you until the deadline below. The booking is final once the payment has been checked.',

    inactiveTitle: 'This booking is no longer active',
    inactiveLead: 'These dates have been released and are available to other guests again.',

    transferHeading: 'Payment details',
    transferRecipient: 'Recipient',
    transferBank: 'Bank',
    transferIban: 'Account number (IBAN)',
    transferReference: 'Payment reference',
    transferAmount: 'Amount to pay',
    transferDeadline: 'Pay by',
    transferNote:
      'Please include the payment reference — it is how the host recognises your payment. If the payment does not arrive by the deadline, the dates are released.',
    copy: 'Copy',
    copied: 'Copied',

    pendingBadge: 'Held — awaiting confirmation',
    awaitingTransfer: 'Held — awaiting payment',
    confirmedBadge: 'Confirmed',
    heldNote: 'The dates are already held for you — nobody else can take them in the meantime.',
    reference: 'Booking number',
    stay: 'Your stay',
    guestsLabel: 'Guests',
    totalLabel: 'Total amount',
    payOnArrival: 'The amount is paid in cash on arrival.',
    paid: 'Your payment has been received.',
    testBooking: 'This is a TEST booking — no money has been charged.',
    whatNext: 'What happens next?',
    whatNextBody:
      'We have emailed you the details. You will receive the exact address, directions and the host’s contact before arrival.',
    backHome: 'Back to the home page',
    cancelBooking: 'Cancel booking',
    cancelReasonLabel: 'Reason for cancelling',
    cancelReasonPlaceholder: 'Tell us briefly why you are cancelling.',
    cancelReasonRequired: 'Please write a reason for cancelling.',
    cancelSubmit: 'Confirm cancellation',
    cancelSubmitting: 'Cancelling…',
    cancelAbort: 'Never mind',
  },

  errors: {
    DATES_TAKEN: 'These dates have just been booked. Please choose others.',
    INVALID_RANGE: 'The departure date must be after the arrival date.',
    PAST_DATE: 'You cannot book a date in the past.',
    MAX_DAYS: (n) => `The maximum stay is ${count('en', n, plural.en.days)}.`,
    TOO_MANY_GUESTS: (n) => `The maximum is ${count('en', n, plural.en.guests)}.`,
    INVALID_INPUT: 'Please check the details you entered and try again.',
    REQUIRED_NAME: 'Please enter your full name.',
    REQUIRED_EMAIL: 'Please enter a valid email address.',
    REQUIRED_PHONE: 'Please enter a phone number.',
    REQUIRED_METHOD: 'Please choose a payment method.',
    METHOD_UNAVAILABLE: 'The selected payment method is not available right now.',
    SERVER_ERROR: 'Something went wrong. Please try again in a moment.',
    NOT_ALLOWED: 'Not allowed.',
    MAX_BELOW_MIN: 'The maximum number of days cannot be lower than the minimum.',
    ALREADY_RESOLVED: 'This request has already been handled. Please refresh the page.',
    DATABASE_MISSING:
      'The database is not configured. Add the Supabase keys to .env.local (or to Vercel → Environment Variables) and run the migrations from supabase/migrations.',
    TOO_MANY_REQUESTS: 'Too many attempts in a short time. Please wait a minute and try again.',
    ADMIN_CODE_WEAK: (min) =>
      `ADMIN_ACCESS_CODE is too short — it must be at least ${min} characters. ` +
      'Sign-in stays disabled until it is longer. Generate one with: openssl rand -base64 24',
    ADMIN_MISSING:
      'The admin area is not configured — ADMIN_ACCESS_CODE and ADMIN_SESSION_SECRET are missing.',
  },

  admin: {
    gateTitle: 'TreeScape admin',
    gateLead: 'Enter the access code.',
    gateCode: 'Access code',
    gateTotp: 'Code from your phone',
    gateTotpHint: 'Six digits from your authenticator app.',
    gateSubmit: 'Unlock',
    gateWrong: 'Wrong code.',
    gateLocked: 'Too many attempts. Wait a minute and try again.',
    gateNotConfigured:
      'The admin area is not configured. Set ADMIN_ACCESS_CODE and ADMIN_SESSION_SECRET in .env.local.',
    databaseNotConfigured:
      'The database is not configured, so there is nothing to show. Add the Supabase keys to .env.local and run the migrations from supabase/migrations.',

    logout: 'Sign out',
    title: 'Administration',

    tabRequests: 'Requests',
    tabBookings: 'Bookings',
    tabCalendar: 'Calendar',
    tabPricing: 'Pricing',

    requestsHeading: 'Cash payment requests',
    requestsEmpty: 'There are no requests waiting for approval.',
    testNotification: 'Send a test notification',
    testGuestEmail: 'Send a test guest email',
    testNotificationSending: 'Sending…',
    approve: 'Approve',
    reject: 'Reject',
    approveConfirm: 'Confirm this booking?',
    rejectConfirm: 'Reject this request? The dates will be released.',
    rejectReasonPrompt:
      'Reason for declining — the guest receives it by email. Leave empty to give no reason.',
    cancelReasonPrompt:
      'Reason for cancelling — the guest receives it by email. Leave empty to give no reason.',
    receivedAt: (when) => `Received ${when}`,
    byCash: 'cash',
    byTransfer: 'bank transfer',

    bookingsHeading: 'All bookings',
    bookingsEmpty: 'There are no bookings yet.',
    searchLabel: 'Search bookings',
    searchPlaceholder: 'Name, booking number, email, phone…',
    searchClear: 'Clear search',
    searchCount: (found: number, total: number) => `Showing ${found} of ${total} bookings.`,
    searchNothing: 'No booking matches your search.',
    colStay: 'Dates',
    colGuest: 'Guest',
    colMethod: 'Method',
    colStatus: 'Status',
    colAmount: 'Amount',
    cancel: 'Cancel',
    cancelConfirm: 'Cancel this booking?',

    calendarHeading: 'Blocking dates',
    calendarLead:
      'Pick the range of dates you want to close for guests (maintenance, personal stay…).',
    blockReason: 'Reason (internal)',
    blockReasonPlaceholder: 'e.g. painting',
    blockSubmit: 'Block dates',
    blockedHeading: 'Blocked dates',
    blockedEmpty: 'There are no blocked dates.',
    unblock: 'Release',
    unblockConfirm: 'Release these dates?',

    pricingHeading: 'Base pricing',
    pricingLead: 'Applies to every date that does not fall into a season.',
    defaultNightly: 'Base rate per day',
    weekendPrice: 'Saturday and Sunday rate',
    weekendPriceHint:
      'Enter 0 to charge the base rate at weekends too. A season, where set, still takes precedence.',
    maxNights: 'Maximum number of days',
    maxGuests: 'Maximum number of guests',
    holdMinutes: 'How long dates are held during payment (min)',
    checkinFrom: 'Check-in from',
    checkoutBy: 'Check-out by',
    currency: 'Currency (EUR, BAM…)',
    currencySymbol: 'Symbol (€, KM…)',
    save: 'Save',
    saved: 'Saved.',

    seasonsHeading: 'Seasonal pricing',
    seasonsLead:
      'If two seasons overlap, the one with the higher priority wins. The departure day is not charged.',
    seasonName: 'Season name',
    seasonNamePlaceholder: 'e.g. Summer season 2027',
    seasonFrom: 'From',
    seasonTo: 'To',
    seasonToHint: 'not included',
    seasonPeriod: 'Period',
    seasonPrice: 'Rate per day',
    seasonPriority: 'Priority',
    seasonAdd: 'Add season',
    seasonDelete: 'Delete',
    seasonDeleteConfirm: 'Delete this season?',
    seasonsEmpty: 'No seasons defined — the base rate applies everywhere.',

    statusLabels: {
      pending_payment: 'Awaiting payment',
      pending_cash: 'Awaiting approval',
      pending_transfer: 'Awaiting bank transfer',
      confirmed: 'Confirmed',
      expired: 'Expired',
      cancelled: 'Cancelled',
      blocked: 'Blocked',
    },

    methodLabels: {
      card: 'Card',
      cash: 'Cash',
      bank_transfer: 'Bank transfer',
      test: 'TEST',
      none: '—',
    },

    markPaid: 'Payment received',
    markPaidConfirm: 'Confirm that the payment has landed in the account?',
    transfersHeading: 'Bank transfers being awaited',
    transfersEmpty: 'No bookings are waiting for a payment.',
    transferRef: 'Payment reference',
    deadlineAt: 'Deadline',

    bankHeading: 'Bank transfer details',
    bankLead:
      'This is what the guest sees when they choose a bank transfer. While the IBAN is empty, that option is not offered at all.',
    bankAccountName: 'Recipient name',
    bankAccountNamePlaceholder: 'Full name or company name',
    bankName: 'Bank name',
    bankNamePlaceholder: 'e.g. Raiffeisen Bank d.d. BiH',
    bankIban: 'IBAN / account number',
    bankIbanPlaceholder: 'BA39 1234 5678 9012 3456',
    bankIbanHint: 'Leave empty so bank transfer is not offered to guests at all.',
    transferDays: 'Payment deadline (days)',
  },

  common: {
    from: 'from',
    day: 'day',
    loading: 'Loading…',
    tryAgain: 'Try again',
    days: plural.en.days,
    guests: plural.en.guests,
  },

  footer: {
    contact: 'Contact',
    quickLinks: 'Quick links',
    rights: 'All rights reserved.',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    address: 'Bosnia and Herzegovina',
  },

  email: {
    greeting: (name) => (name ? `Dear ${name},` : 'Hello,'),
    rowStay: 'Dates',
    rowGuests: 'Guests',
    rowAmount: 'Amount',
    rowReference: 'Booking number',
    rowGuest: 'Guest',
    rowEmail: 'Email',
    rowPhone: 'Phone',
    rowNote: 'Guest note',

    addressLater:
      'We will send the exact address, directions and the host’s contact before your arrival.',
    payOnArrival: 'The amount is paid in cash on arrival.',

    confirmedSubject: 'Booking confirmed',
    confirmedTitle: 'Your booking is confirmed',
    confirmedBody: 'thank you for your booking. The dates are locked in and paid.',

    transferSubject: 'Payment details',
    transferTitle: 'Dates held — the payment is still needed',
    transferBody:
      'we are holding the dates for you. Please transfer the amount using the details below — as soon as the payment arrives, your booking is confirmed.',
    transferHeading: 'Payment details',
    transferRecipient: 'Recipient',
    transferBank: 'Bank',
    transferIban: 'IBAN',
    transferReference: 'Payment reference',
    transferAmount: 'Amount',
    transferDeadline: 'Pay by',
    transferWarning:
      'Please include the payment reference — it is how the host recognises your payment. If the payment does not arrive by the deadline, the dates are released.',

    cashRequestSubject: 'Request received',
    cashRequestTitle: 'Your booking request has been received',
    cashRequestBody:
      'we have received your request. We are holding the dates for you until the host confirms — we will be in touch shortly.',

    cashApprovedSubject: 'Booking confirmed',
    cashApprovedTitle: 'The host has confirmed your booking',
    cashApprovedBody: 'the dates are yours. See you soon!',

    cancelledSubject: 'Booking cancelled',
    cancelledTitle: 'Your booking has been cancelled',
    cancelledBody:
      'unfortunately we have to cancel your confirmed booking. The dates have been released, and we are sorry for the inconvenience.',
    reasonLabel: 'Reason',
    openBooking: 'Open your booking',
    ownerGuestCancelledTitle: 'A guest cancelled their booking',

    cashRejectedSubject: 'Booking not confirmed',
    cashRejectedTitle: 'Unfortunately these dates are not available',
    cashRejectedBody:
      'the host was not able to confirm the dates you asked for. They have been released, so feel free to pick others.',

    ownerCashTitle: 'New cash payment request',
    ownerTransferTitle: 'New booking — awaiting bank transfer',
    ownerCardTitle: 'New paid booking',
    ownerCashHint: 'The dates are held and invisible to other guests until you decide.',
    ownerTransferHint:
      'The dates are held. Once the payment lands in the account, confirm it in the admin area.',
    ownerOpenAdmin: 'Open the admin area',
  },
};
