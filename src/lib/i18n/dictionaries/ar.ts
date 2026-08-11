/**
 * العربية — arapski.
 *
 * Piše se zdesna nalijevo; smjer stranice postavlja `directionOf` iz
 * `config.ts`, a ne pojedina komponenta.
 */

import type { Dictionary } from '../dictionary';
import { count, plural } from '../plural';

export const ar: Dictionary = {
  site: {
    name: 'TreeScape',
    tagline: 'فيلا في أحضان الغابة',
    description:
      'TreeScape فيلا تحيط بها الغابة — هدوء وطبيعة وكل وسائل الراحة المنزلية. تحقّق من المواعيد المتاحة واحجز عبر الإنترنت.',
    keywords: [
      'TreeScape',
      'فيلا',
      'بيت عطلات',
      'إقامة',
      'تأجير منزل',
      'عطلة في الطبيعة',
      'حجز',
      'البوسنة والهرسك',
    ],
  },

  language: {
    label: 'اللغة',
    names: { bs: 'Bosanski', en: 'English', ar: 'العربية' },
    gateTitle: 'اختر لغتك',
    gateLead: 'بأي لغة تريد تصفّح الموقع؟',
    gateAria: 'اختر لغتك: Bosanski، English، العربية',
  },

  nav: {
    about: 'عن المنزل',
    gallery: 'الصور',
    amenities: 'المرافق',
    location: 'الموقع',
    faq: 'الأسئلة',
    book: 'احجز الآن',
    menu: 'القائمة',
    close: 'إغلاق',
    skipToBooking: 'تخطَّ إلى الحجز',
    mainNav: 'القائمة الرئيسية',
  },

  hero: {
    eyebrow: 'فيلا خاصة للعطلات',
    title: 'TreeScape',
    subtitle: 'استيقظ على صوت الغابة، لا على صوت المدينة.',
    cta: 'تحقّق من التوفر',
    secondaryCta: 'شاهد المنزل',
    scroll: 'اعرف المزيد',
    imageAlt: 'فيلا TreeScape',
    freeFrom: (date) => `أول موعد متاح: ${date}`,
    freeToday: 'متاح من اليوم',
  },

  steps: {
    eyebrow: 'كيف يتم الحجز',
    heading: 'من التواريخ إلى المفتاح، في ثلاث خطوات',
    lead: 'بلا مكالمات، وبلا انتظار ردّ لمجرد معرفة المواعيد المتاحة.',
    items: [
      {
        title: 'اختر التواريخ',
        body: 'يعرض التقويم المواعيد المتاحة أولًا بأول، ويُحسب السعر أثناء اختيارك — الأساسي ونهاية الأسبوع والموسمي، دون أي بند خفيّ.',
      },
      {
        title: 'أرسل الطلب',
        body: 'تُحجز التواريخ لك فورًا، ويراها بقية الضيوف محجوزة. لا يستطيع أحد أخذها منك في هذه الأثناء.',
      },
      {
        title: 'يؤكّد المضيف',
        body: 'يصلك القرار بالبريد الإلكتروني، وصفحة الحجز تُحدّث نفسها.',
      },
    ],
  },

  finalCta: {
    heading: 'الغابة جميلة يوم الثلاثاء أيضًا',
    lead: 'تحقّق من المواعيد المتاحة واحجز في دقائق. وإن كان أي شيء غير واضح، تواصل معنا — نردّ في اليوم نفسه.',
    contact: 'اسألنا',
  },

  about: {
    heading: 'أهلًا بك في TreeScape',
    lead: 'منزل مختبئ بين الأشجار، قريب بما يكفي للوصول إليه بسهولة، وبعيد بما يكفي لترتاح أخيرًا.',
    body: [
      'TreeScape فيلا عائلية تحيط بها أشجار الغابة العالية، ولها شرفة واسعة تطل على الوادي. في الداخل كل ما تحتاجه لإقامة طويلة — مطبخ مجهّز بالكامل، وغرفة معيشة دافئة بمدفأة، وغرف نوم تنام فيها فعلًا.',
      'مثالية لعطلة عائلية، أو هروب مع الأصدقاء في نهاية الأسبوع، أو أسبوع هادئ من العمل وسط الطبيعة. في الصيف شواء وأمسيات طويلة على الشرفة، وفي الشتاء ثلج ونار في المدفأة.',
    ],
    imageAlt: 'فيلا TreeScape من الخارج',
    stats: {
      guests: 'ضيوف',
      bedrooms: 'غرفتا نوم',
      bathrooms: 'حمّامان',
    },
  },

  gallery: {
    heading: 'معرض الصور',
    lead: 'شاهد كيف تبدو عطلتك القادمة.',
    open: 'افتح الصورة',
    prev: 'الصورة السابقة',
    next: 'الصورة التالية',
    close: 'أغلق المعرض',
    counter: (index, total) => `${index} / ${total}`,
    /**
     * Opis svake fotografije, po njenom rednom broju (vidi `lib/gallery.ts`).
     * `alt` čita čitač ekrana i Google; natpis se vidi pri prelasku mišem i
     * ispod uvećane slike.
     */
    itemAlt: (n) =>
      (
        ({
          2: 'المسبح والشرفة في أصيل الصيف',
          3: 'شرفة مسقوفة تطل على الوادي',
          4: 'المسبح وكراسي الاستلقاء تحت أضواء المساء',
          5: 'غروب الشمس فوق المسبح',
          6: 'جاكوزي على الشرفة يطل على الغابة',
          7: 'شواية ومدفأة من الطوب تحت سقف خشبي',
          8: 'غرفة نوم في العلية بعوارض خشبية ظاهرة',
          9: 'احتفال مُعدّ في الفناء',
        }) as Record<number, string>
      )[n] ?? 'صورة للمنزل',
    itemCaption: (n) =>
      (
        ({
          2: 'المسبح والشرفة',
          3: 'شرفة بإطلالة',
          4: 'المسبح ليلًا',
          5: 'الغروب فوق المسبح',
          6: 'جاكوزي',
          7: 'الشواية والمدفأة',
          8: 'غرفة العلية',
          9: 'احتفالات في الفناء',
        }) as Record<number, string>
      )[n] ?? 'صورة للمنزل',
  },

  amenities: {
    heading: 'ما ينتظرك',
    lead: 'كل شيء موجود بالفعل — لا تحمل معك سوى حقيبتك.',
    items: {
      pool: { label: 'مسبح', note: 'مُدفّأ بمضخة حرارية' },
      // Isti razlog kao u engleskom: نافورة je bilo koja fontana, pa se u
      // opisu kaže da je osmanska. Riječ شاذروان jeste tačna, ali je danas
      // mnogi ne bi prepoznali, pa ostaje kao objašnjenje uz nju.
      fountain: {
        label: 'نافورة عثمانية',
        note: 'شاذروان تقليدي في الفناء، بجوار مكان الجلوس',
      },
      wifi: { label: 'إنترنت', note: 'واي فاي في المنزل كله' },
      kitchen: { label: 'مطبخ مجهّز', note: 'كل الأواني والأجهزة' },
      fire: { label: 'مدفأة حطب', note: 'الحطب متوفر' },
      grill: { label: 'شواية وأثاث حديقة', note: 'لأمسيات الصيف الطويلة' },
      car: { label: 'موقف مجاني', note: 'يتسع لثلاث سيارات في الفناء' },
      heat: { label: 'تدفئة مركزية', note: 'دفء في عزّ الشتاء' },
      washer: { label: 'غسالة ملابس', note: 'ومجفّف أيضًا' },
      tv: { label: 'تلفزيون ذكي', note: 'نتفليكس وقنوات محلية' },
      pet: { label: 'الحيوانات الأليفة مرحّب بها', note: 'بإخطار مسبق' },
      tree: { label: 'حديقة واسعة', note: '2000 م² من الأرض المسوّرة' },
      coffee: { label: 'آلة قهوة', note: 'قهوة تركية وإسبريسو' },
      towel: { label: 'مفارش ومناشف', note: 'مشمولة في السعر' },
    },
  },


  showcase: {
    eyebrow: 'ما ينتظرك',
    heading: 'المنزل، جزءًا جزءًا',
    lead: 'ما لا تُظهره الصورة في الأعلى — من المسبح إلى العلية.',
    item: (n) =>
      (
        {
          2: {
            title: 'المسبح',
            body: 'مُدفّأ بمضخة حرارية، بمقاس 7٫5 × 3 م — واسع بما يكفي للسباحة، ولطيف للأطفال. حوله شرفة مرصوفة بكراسي استلقاء وأثاث جلوس.',
          },
          3: {
            title: 'الشرفة المسقوفة',
            body: 'مقاعد وطاولات طويلة تحت سقف خشبي، تطل على الوادي. هنا يكون الفطور، وهنا يبقى الجميع حتى حلول الظلام.',
          },
          4: {
            title: 'أمسيات عند المسبح',
            body: 'حين يحلّ الظلام يضاء الفناء. أضواء على طول السياج، وكراسي استلقاء عند الماء، وهدوء لا يقطعه سوى الغابة.',
          },
          5: {
            title: 'الغروب فوق الوادي',
            body: 'أصيل عند المسبح بإطلالة فوق قمم الأشجار. هذا هو وقت اليوم الذي يجعل الضيوف يبقون أطول مما خططوا.',
          },
          6: {
            title: 'الجاكوزي',
            body: 'على الشرفة، يطل على الغابة. دافئ حتى حين يكون الجو باردًا — يُستخدم في الربيع والخريف أيضًا.',
          },
          7: {
            title: 'الشواية والمدفأة',
            body: 'شواية من الطوب تحت السقف الخشبي، مع موقد مفتوح وحطب مرصوص. الحطب متوفر، ومكان الجلوس بجوار النار مباشرة.',
          },
          8: {
            title: 'غرف النوم',
            body: 'علّية بعوارض خشبية ظاهرة. في المنزل غرفتا نوم ومتّسع لثمانية ضيوف، والمفارش والمناشف مشمولة في السعر.',
          },
          9: {
            title: 'المناسبات',
            body: 'يتحوّل الفناء بسهولة إلى مكان للاحتفال — عيد ميلاد، لقاء، حفل صغير. للمجموعات الأكبر تواصل معنا قبل الحجز.',
          },
        } as Record<number, { title: string; body: string }>
      )[n] ?? { title: '', body: '' },
    extraTitle: 'إضافات',
    extraLead: 'تفاصيل تبدو بديهية، ولا تُلاحظ إلا حين تغيب.',
  },
  location: {
    heading: 'أين نحن',
    lead: 'قريب بما يكفي للوصول بسهولة، وبعيد بما يكفي لئلا تسمع سوى الغابة.',
    mapTitle: 'خريطة موقع فيلا TreeScape',
    openInMaps: 'افتح في خرائط جوجل',
    opensInNewTab: 'يُفتح في تبويب جديد',
    driveTime: (minutes) => `${minutes} دقيقة بالسيارة`,
    places: {
      city: 'سراييفو',
      airport: 'المطار',
      shop: 'أقرب متجر',
    },
  },

  faq: {
    heading: 'الأسئلة الشائعة',
    lead: 'إن كان أي شيء غير واضح، لا تتردد في التواصل معنا.',
    items: ({ checkinTime, checkoutTime, maxGuests }) => [
      {
        q: 'متى يمكنني الوصول ومتى يجب أن أغادر؟',
        a: `تسجيل الدخول من الساعة ${checkinTime}، وتسجيل المغادرة حتى الساعة ${checkoutTime}. إن كنت تحتاج وصولًا أبكر أو مغادرة متأخّرة، أخبرنا — يمكن الاتفاق على ذلك عادةً.`,
      },
      {
        q: 'كيف يتم الحجز؟',
        a: 'تختار المواعيد وترسل الحجز. نحجز لك المواعيد فورًا وتظهر للضيوف الآخرين على أنها محجوزة. لا يصبح الحجز نهائيًا إلا بعد موافقة المضيف — ونخبرك بذلك عبر البريد الإلكتروني.',
      },
      {
        q: 'هل يمكنني إلغاء الحجز؟',
        a: 'تواصل معنا في أسرع وقت عبر البريد الإلكتروني أو الهاتف الموجود في أسفل الصفحة. تعتمد شروط الاسترداد على المدة المتبقية حتى موعد الوصول.',
      },
      {
        q: 'هل الحيوانات الأليفة مسموح بها؟',
        a: 'نعم، بإخطار مسبق — يرجى ذكر ذلك في خانة الملاحظات عند الحجز حتى نهيّئ المنزل.',
      },
      {
        q: 'هل المفارش مشمولة؟',
        a: 'نعم. المفارش والمناشف ومستلزمات النظافة الأساسية مشمولة في السعر — من دون أي رسوم إضافية.',
      },
      {
        q: 'كم شخصًا يتسع المنزل؟',
        a: `يتسع المنزل حتى ${maxGuests} أشخاص. للمجموعات الأكبر، تواصل معنا قبل الحجز.`,
      },
      {
        q: 'هل يوجد إنترنت وتغطية للهاتف المحمول؟',
        a: 'نعم — الواي فاي يغطي المنزل كله، وإشارة الهاتف المحمول مستقرة.',
      },
      {
        q: 'كيف أحصل على العنوان والمفتاح؟',
        a: 'بعد تأكيد الحجز نرسل لك بريدًا إلكترونيًا يتضمن العنوان الدقيق وإرشادات الوصول ورقم هاتف المضيف، وهو من يستقبلك ويسلّمك المفتاح.',
      },
    ],
  },

  booking: {
    heading: 'احجز موعدك',
    lead: 'انقر على تاريخ واحد لإقامة نهارية بلا مبيت، أو على تاريخين لإقامة أطول. المواعيد المحجوزة تظهر بالرمادي ولا يمكن اختيارها.',

    pickDates: 'اختر التواريخ',
    checkIn: 'الوصول',
    checkOut: 'المغادرة',
    notSelected: 'لم يُحدَّد',
    clearDates: 'إلغاء الاختيار',

    legendFree: 'متاح',
    legendTaken: 'محجوز',
    legendSelected: 'اختيارك',

    guests: 'عدد الضيوف',
    name: 'الاسم الكامل',
    namePlaceholder: 'اسمك الكامل',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'you@email.com',
    phone: 'رقم الهاتف',
    phonePlaceholder: '+387 6x xxx xxx',
    note: 'ملاحظة للمضيف',
    notePlaceholder: 'هل تصطحب حيوانًا أليفًا؟ هل ستصل متأخرًا؟ أخبرنا هنا.',
    optional: 'اختياري',

    summaryTitle: 'ملخّص الحجز',
    daysLabel: (n) => count('ar', n, plural.ar.days),
    total: 'الإجمالي',
    seasonalNote: 'السعر اليومي يتغيّر حسب الموسم.',
    weekendNote: 'يُحتسب يوما السبت والأحد بسعر عطلة نهاية الأسبوع.',
    singleDayNote: 'حجز ليوم واحد، من دون مبيت.',
    timesNote: (checkIn, checkOut) =>
      `تسجيل الدخول من ${checkIn} يوم الوصول، وتسجيل المغادرة حتى ${checkOut} يوم المغادرة.`,

    payMethodTitle: 'طريقة الدفع',

    payTransfer: 'تحويل بنكي',
    payTransferHint: 'تصلك بيانات الحساب ورقم مرجع الدفع. نحتفظ لك بالموعد حتى وصول التحويل.',

    payCash: 'الدفع نقدًا',
    payCashHint: 'ترسل طلبًا إلى المضيف. نحتفظ لك بالموعد حتى يؤكّده المضيف — عادةً في اليوم نفسه.',

    payTest: 'حجز تجريبي',
    payTestHint: 'للتجربة فقط — يؤكّد الحجز من دون أي دفع. لا يظهر هذا الخيار للضيوف.',

    reserve: 'احجز',
    submitting: 'لحظة من فضلك…',

    selectDatesFirst: 'اختر تاريخًا في التقويم أولًا.',
    singleDayHint: 'انقر على تاريخ واحد لإقامة نهارية، أو على تاريخ آخر لإقامة أطول.',
    unavailableRange:
      'المدة المختارة تتضمّن أيامًا محجوزة مسبقًا. اختر مدة خالية من التواريخ المحجوزة.',

    wizard: {
      dates: 'التواريخ',
      details: 'بياناتك',
      review: 'التأكيد',
      next: 'التالي',
      back: 'رجوع',
      stepOf: (step, total) => `الخطوة ${step} من ${total}`,
      reviewLead: 'راجع البيانات قبل الإرسال.',
    },
  },

  confirmation: {
    pageTitle: 'حجزك',

    confirmedTitle: 'تم تأكيد حجزك',
    confirmedLead: 'أكّد المضيف حجزك. الموعد لك، ويظهر للضيوف الآخرين على أنه محجوز.',

    pendingTitle: 'الموعد محجوز لك',
    pendingLead:
      'نحتفظ لك بالموعد، وهو يظهر للضيوف الآخرين على أنه محجوز. لا يصبح الحجز نهائيًا إلا بعد موافقة المضيف — سنراسلك عبر البريد الإلكتروني في أقرب وقت.',

    transferTitle: 'الموعد محجوز لك',
    transferLead:
      'بقي الدفع فقط. نحتفظ لك بالموعد حتى انتهاء المهلة أدناه. لا يصبح الحجز نهائيًا إلا بعد التحقق من التحويل.',

    inactiveTitle: 'هذا الحجز لم يعد ساريًا',
    inactiveLead: 'تم تحرير هذا الموعد وأصبح متاحًا للضيوف الآخرين من جديد.',

    transferHeading: 'بيانات التحويل',
    transferRecipient: 'المستفيد',
    transferBank: 'البنك',
    transferIban: 'رقم الحساب (IBAN)',
    transferReference: 'مرجع الدفع',
    transferAmount: 'المبلغ المطلوب',
    transferDeadline: 'الدفع قبل',
    transferNote:
      'يرجى كتابة مرجع الدفع — به يتعرّف المضيف على تحويلك. إن لم يصل المبلغ قبل الموعد المحدد، يُحرَّر الحجز.',
    copy: 'نسخ',
    copied: 'تم النسخ',

    pendingBadge: 'محجوز — بانتظار التأكيد',
    awaitingTransfer: 'محجوز — بانتظار الدفع',
    confirmedBadge: 'مؤكَّد',
    heldNote: 'الموعد محجوز لك بالفعل — لا يمكن لأحد آخر أخذه في هذه الأثناء.',
    reference: 'رقم الحجز',
    stay: 'إقامتك',
    guestsLabel: 'الضيوف',
    totalLabel: 'المبلغ الإجمالي',
    payOnArrival: 'يُدفع المبلغ نقدًا عند الوصول.',
    paid: 'تم استلام الدفعة.',
    testBooking: 'هذا حجز تجريبي — لم يُخصم أي مبلغ.',
    whatNext: 'ماذا بعد؟',
    whatNextBody:
      'أرسلنا إليك بريدًا إلكترونيًا بالتفاصيل. ستصلك قبل الوصول العنوان الدقيق وإرشادات الوصول وبيانات التواصل مع المضيف.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    cancelBooking: 'إلغاء الحجز',
    cancelReasonLabel: 'سبب الإلغاء',
    cancelReasonPlaceholder: 'أخبرنا باختصار لماذا تلغي الحجز.',
    cancelReasonRequired: 'يرجى كتابة سبب الإلغاء.',
    cancelSubmit: 'تأكيد الإلغاء',
    cancelSubmitting: 'جارٍ الإلغاء…',
    cancelAbort: 'تراجع',
  },

  errors: {
    DATES_TAKEN: 'حُجزت هذه التواريخ للتو. يرجى اختيار غيرها.',
    INVALID_RANGE: 'يجب أن يكون تاريخ المغادرة بعد تاريخ الوصول.',
    PAST_DATE: 'لا يمكنك الحجز في تاريخ مضى.',
    MAX_DAYS: (n) => `أقصى مدة إقامة هي ${count('ar', n, plural.ar.days)}.`,
    TOO_MANY_GUESTS: (n) => `الحد الأقصى هو ${count('ar', n, plural.ar.guests)}.`,
    INVALID_INPUT: 'تحقّق من البيانات المُدخلة وحاول مرة أخرى.',
    REQUIRED_NAME: 'أدخل اسمك الكامل.',
    REQUIRED_EMAIL: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    REQUIRED_PHONE: 'أدخل رقم هاتف.',
    REQUIRED_METHOD: 'اختر طريقة الدفع.',
    METHOD_UNAVAILABLE: 'طريقة الدفع المختارة غير متاحة حاليًا.',
    SERVER_ERROR: 'حدث خطأ ما. حاول مرة أخرى بعد قليل.',
    NOT_ALLOWED: 'غير مسموح.',
    MAX_BELOW_MIN: 'لا يمكن أن يكون الحد الأقصى للأيام أقل من الحد الأدنى.',
    ALREADY_RESOLVED: 'تمت معالجة هذا الطلب مسبقًا. حدّث الصفحة.',
    DATABASE_MISSING:
      'قاعدة البيانات غير مهيّأة. أضف مفاتيح Supabase إلى ‎.env.local‎ (أو إلى Vercel → Environment Variables) وشغّل الترحيلات من supabase/migrations.',
    TOO_MANY_REQUESTS: 'محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مجددًا.',
    ADMIN_CODE_WEAK: (min) =>
      `‎ADMIN_ACCESS_CODE‎ قصير جدًا — يجب أن يتكوّن من ${min} رمزًا على الأقل. ` +
      'تسجيل الدخول معطّل إلى أن يُطوَّل. أنشئ رمزًا بالأمر: openssl rand -base64 24',
    ADMIN_MISSING: 'لوحة الإدارة غير مهيّأة — ‎ADMIN_ACCESS_CODE‎ و‎ADMIN_SESSION_SECRET‎ مفقودان.',
  },

  admin: {
    gateTitle: 'إدارة TreeScape',
    gateLead: 'أدخل رمز الدخول.',
    gateCode: 'رمز الدخول',
    gateTotp: 'الرمز من هاتفك',
    gateTotpHint: 'ستة أرقام من تطبيق المصادقة.',
    gateSubmit: 'فتح',
    gateWrong: 'رمز خاطئ.',
    gateLocked: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.',
    gateNotConfigured:
      'لوحة الإدارة غير مهيّأة. اضبط ‎ADMIN_ACCESS_CODE‎ و‎ADMIN_SESSION_SECRET‎ في ‎.env.local‎.',
    databaseNotConfigured:
      'قاعدة البيانات غير مهيّأة، فلا يوجد ما يُعرض. أضف مفاتيح Supabase إلى ‎.env.local‎ وشغّل الترحيلات من supabase/migrations.',

    logout: 'تسجيل الخروج',
    title: 'الإدارة',

    tabRequests: 'الطلبات',
    tabBookings: 'الحجوزات',
    tabCalendar: 'التقويم',
    tabPricing: 'الأسعار',

    requestsHeading: 'طلبات الدفع نقدًا',
    requestsEmpty: 'لا توجد طلبات تنتظر الموافقة حاليًا.',
    testNotification: 'إرسال إشعار تجريبي',
    testGuestEmail: 'إرسال بريد تجريبي للضيف',
    testNotificationSending: 'جارٍ الإرسال…',
    approve: 'موافقة',
    reject: 'رفض',
    approveConfirm: 'تأكيد هذا الحجز؟',
    rejectConfirm: 'رفض هذا الطلب؟ سيُحرَّر الموعد.',
    rejectReasonPrompt:
      'سبب الرفض — يصل الضيف عبر البريد الإلكتروني. اتركه فارغًا إن لم ترغب في ذكر سبب.',
    cancelReasonPrompt:
      'سبب الإلغاء — يصل الضيف عبر البريد الإلكتروني. اتركه فارغًا إن لم ترغب في ذكر سبب.',
    receivedAt: (when) => `ورد بتاريخ ${when}`,
    byCash: 'نقدًا',
    byTransfer: 'تحويل بنكي',

    bookingsHeading: 'كل الحجوزات',
    bookingsEmpty: 'لا توجد أي حجوزات بعد.',
    searchLabel: 'البحث في الحجوزات',
    searchPlaceholder: 'الاسم أو رقم الحجز أو البريد أو الهاتف…',
    searchClear: 'مسح البحث',
    searchCount: (found: number, total: number) => `عرض ${found} من ${total} حجزًا.`,
    searchNothing: 'لا يوجد حجز يطابق بحثك.',
    colStay: 'الموعد',
    colGuest: 'الضيف',
    colMethod: 'الطريقة',
    colStatus: 'الحالة',
    colAmount: 'المبلغ',
    cancel: 'إلغاء',
    cancelConfirm: 'إلغاء هذا الحجز؟',

    calendarHeading: 'حجب المواعيد',
    calendarLead: 'اختر مدة التواريخ التي تريد إغلاقها أمام الضيوف (صيانة، إقامة شخصية…).',
    blockReason: 'السبب (داخلي)',
    blockReasonPlaceholder: 'مثلًا: دهان',
    blockSubmit: 'احجب الموعد',
    blockedHeading: 'المواعيد المحجوبة',
    blockedEmpty: 'لا توجد مواعيد محجوبة.',
    unblock: 'تحرير',
    unblockConfirm: 'تحرير هذا الموعد؟',

    pricingHeading: 'الأسعار الأساسية',
    pricingLead: 'تسري على كل تاريخ لا ينتمي إلى أي موسم.',
    defaultNightly: 'السعر الأساسي لليوم',
    weekendPrice: 'سعر السبت والأحد',
    weekendPriceHint:
      'أدخل 0 ليُحتسب السعر الأساسي في عطلة نهاية الأسبوع أيضًا. الموسم، إن كان محدَّدًا، تبقى له الأولوية.',
    maxNights: 'الحد الأقصى لعدد الأيام',
    maxGuests: 'الحد الأقصى لعدد الضيوف',
    holdMinutes: 'مدة حجز الموعد أثناء الدفع (دقيقة)',
    checkinFrom: 'تسجيل الدخول من',
    checkoutBy: 'تسجيل المغادرة حتى',
    currency: 'العملة (EUR، BAM…)',
    currencySymbol: 'الرمز (€، KM…)',
    save: 'حفظ',
    saved: 'تم الحفظ.',

    seasonsHeading: 'أسعار المواسم',
    seasonsLead: 'إذا تداخل موسمان، يسري الموسم صاحب الأولوية الأعلى. يوم المغادرة لا يُحتسب.',
    seasonName: 'اسم الموسم',
    seasonNamePlaceholder: 'مثلًا: موسم صيف 2027',
    seasonFrom: 'من',
    seasonTo: 'إلى',
    seasonToHint: 'غير مشمول',
    seasonPeriod: 'المدة',
    seasonPrice: 'السعر لليوم',
    seasonPriority: 'الأولوية',
    seasonAdd: 'أضف موسمًا',
    seasonDelete: 'حذف',
    seasonDeleteConfirm: 'حذف هذا الموسم؟',
    seasonsEmpty: 'لا مواسم معرَّفة — يسري السعر الأساسي في كل مكان.',

    statusLabels: {
      pending_payment: 'بانتظار الدفع',
      pending_cash: 'بانتظار الموافقة',
      pending_transfer: 'بانتظار التحويل البنكي',
      confirmed: 'مؤكَّد',
      expired: 'منتهٍ',
      cancelled: 'ملغى',
      blocked: 'محجوب',
    },

    methodLabels: {
      card: 'بطاقة',
      cash: 'نقدًا',
      bank_transfer: 'تحويل بنكي',
      test: 'تجريبي',
      none: '—',
    },

    markPaid: 'وصلت الدفعة',
    markPaidConfirm: 'تأكيد وصول المبلغ إلى الحساب؟',
    transfersHeading: 'تحويلات بنكية قيد الانتظار',
    transfersEmpty: 'لا توجد حجوزات تنتظر تحويلًا.',
    transferRef: 'مرجع الدفع',
    deadlineAt: 'المهلة',

    bankHeading: 'بيانات التحويل البنكي',
    bankLead:
      'هذا ما يراه الضيف عند اختياره التحويل البنكي. ما دام حقل IBAN فارغًا، لا يُعرض هذا الخيار إطلاقًا.',
    bankAccountName: 'اسم المستفيد',
    bankAccountNamePlaceholder: 'الاسم الكامل أو اسم الشركة',
    bankName: 'اسم البنك',
    bankNamePlaceholder: 'مثلًا: Raiffeisen Bank d.d. BiH',
    bankIban: 'IBAN / رقم الحساب',
    bankIbanPlaceholder: 'BA39 1234 5678 9012 3456',
    bankIbanHint: 'اتركه فارغًا كي لا يُعرض التحويل البنكي للضيوف إطلاقًا.',
    transferDays: 'مهلة الدفع (أيام)',
  },

  common: {
    from: 'من',
    day: 'يوم',
    loading: 'جارٍ التحميل…',
    tryAgain: 'حاول مرة أخرى',
    days: plural.ar.days,
    guests: plural.ar.guests,
  },

  footer: {
    contact: 'اتصل بنا',
    quickLinks: 'روابط سريعة',
    rights: 'جميع الحقوق محفوظة.',
    address: 'البوسنة والهرسك',
  },

  email: {
    greeting: (name) => (name ? `عزيزي/عزيزتي ${name}،` : 'مرحبًا،'),
    rowStay: 'الموعد',
    rowGuests: 'الضيوف',
    rowAmount: 'المبلغ',
    rowReference: 'رقم الحجز',
    rowGuest: 'الضيف',
    rowEmail: 'البريد الإلكتروني',
    rowPhone: 'الهاتف',
    rowNote: 'ملاحظة الضيف',

    addressLater: 'سنرسل قبل وصولك العنوان الدقيق وإرشادات الوصول وبيانات التواصل مع المضيف.',
    payOnArrival: 'يُدفع المبلغ نقدًا عند الوصول.',

    confirmedSubject: 'تم تأكيد الحجز',
    confirmedTitle: 'تم تأكيد حجزك',
    confirmedBody: 'شكرًا لحجزك. الموعد مثبَّت ومدفوع.',

    transferSubject: 'بيانات التحويل',
    transferTitle: 'الموعد محجوز — بقي الدفع',
    transferBody:
      'نحتفظ لك بالموعد. يرجى تحويل المبلغ وفق البيانات أدناه — وبمجرد وصول التحويل يصبح الحجز مؤكَّدًا.',
    transferHeading: 'بيانات التحويل',
    transferRecipient: 'المستفيد',
    transferBank: 'البنك',
    transferIban: 'IBAN',
    transferReference: 'مرجع الدفع',
    transferAmount: 'المبلغ',
    transferDeadline: 'الدفع قبل',
    transferWarning:
      'يرجى كتابة مرجع الدفع — به يتعرّف المضيف على تحويلك. إن لم يصل المبلغ قبل الموعد المحدد، يُحرَّر الحجز.',

    cashRequestSubject: 'تم استلام الطلب',
    cashRequestTitle: 'تم استلام طلب الحجز',
    cashRequestBody: 'استلمنا طلبك. نحتفظ لك بالموعد حتى يؤكّده المضيف — وسنتواصل معك في أقرب وقت.',

    cashApprovedSubject: 'تم تأكيد الحجز',
    cashApprovedTitle: 'أكّد المضيف حجزك',
    cashApprovedBody: 'الموعد لك. نراك قريبًا!',

    cancelledSubject: 'إلغاء الحجز',
    cancelledTitle: 'تم إلغاء حجزك',
    cancelledBody: 'نأسف لاضطرارنا إلى إلغاء حجزك المؤكَّد. تم تحرير المواعيد، ونعتذر عن الإزعاج.',
    reasonLabel: 'السبب',
    openBooking: 'افتح حجزك',
    ownerGuestCancelledTitle: 'ألغى ضيف حجزه',

    cashRejectedSubject: 'لم يتم تأكيد الحجز',
    cashRejectedTitle: 'للأسف، الموعد غير متاح',
    cashRejectedBody:
      'لم يتمكّن المضيف من تأكيد الموعد المطلوب. تم تحرير الموعد، فلا تتردد في اختيار موعد آخر.',

    ownerCashTitle: 'طلب جديد للدفع نقدًا',
    ownerTransferTitle: 'حجز جديد — بانتظار التحويل البنكي',
    ownerCardTitle: 'حجز مدفوع جديد',
    ownerCashHint: 'الموعد محجوز وغير ظاهر للضيوف الآخرين حتى تتخذ قرارك.',
    ownerTransferHint: 'الموعد محجوز. عند وصول المبلغ إلى الحساب، أكّده في لوحة الإدارة.',
    ownerOpenAdmin: 'افتح لوحة الإدارة',
  },
};
