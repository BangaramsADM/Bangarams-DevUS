// kira.js — Bangarams × Kira Pricing Engine & Catalog
// Vanilla JS adaptation of bangarams-kira-module (TypeScript)
// Depends on: store.js (for STORE.addDesign seeding)

const KIRA = (() => {

  /* ═══════════════════════════════════════
     PRICING CONFIGURATION  (from kira-pricing.ts)
  ═══════════════════════════════════════ */
  const BASE_MULTIPLIER    = 1.8;
  const MIN_MARGIN_PERCENT = 35;   // never go below
  const GA_SALES_TAX       = 0.089; // Alpharetta, GA 8.9%

  const METAL_ADJUSTMENTS = {
    '14k-yellow': 0,      // catalog base
    '14k-white':  0.03,
    '18k-yellow': 0.12,
    '18k-white':  0.15,
    '22k-yellow': 0.28,
    '22k-white':  0.30,
    'platinum':   0.25,
  };

  const GRADE_ADJUSTMENTS = {
    'F/VS+':  0,      // catalog default
    'E/VVS+': 0.18,
    'D/FL':   0.35,
    'G/SI':  -0.12,
    'H/SI':  -0.18,
  };

  const METAL_OPTIONS = [
    { key:'14k-yellow', label:'14K Yellow Gold',  delta:0,    note:'Catalog default (Cartier / Tiffany standard)' },
    { key:'14k-white',  label:'14K White Gold',   delta:0.03, note:'+3%' },
    { key:'18k-yellow', label:'18K Yellow Gold',  delta:0.12, note:'+12%' },
    { key:'18k-white',  label:'18K White Gold',   delta:0.15, note:'+15%' },
    { key:'22k-yellow', label:'22K Yellow Gold',  delta:0.28, note:'+28% — traditional Indian bridal' },
    { key:'22k-white',  label:'22K White Gold',   delta:0.30, note:'+30%' },
    { key:'platinum',   label:'Platinum',         delta:0.25, note:'+25%' },
  ];

  const GRADE_OPTIONS = [
    { key:'D/FL',   label:'D / Flawless',        delta:0.35,  note:'+35% — Exceptional'},
    { key:'E/VVS+', label:'E / VVS+',            delta:0.18,  note:'+18% — Excellent'  },
    { key:'F/VS+',  label:'F / VS+',             delta:0,     note:'Catalog default — IGI certified' },
    { key:'G/SI',   label:'G / SI',              delta:-0.12, note:'-12% — Great value' },
    { key:'H/SI',   label:'H / SI',              delta:-0.18, note:'-18% — Best value'  },
  ];

  const OCCASIONS = [
    'Bridal','Engagement','Mehendi','Sangeet','Reception',
    'Everyday','Fashion','Gift',
  ];

  const TIERS = {
    entry:    { label:'Entry Diamond',    range:'$630 – $2,500',  color:'rgba(168,152,128,.9)',  bg:'rgba(168,152,128,.08)', border:'rgba(168,152,128,.25)' },
    bridal:   { label:'Bridal Diamond',   range:'$2,500 – $6,500',color:'#C8973F',               bg:'rgba(200,151,63,.08)',  border:'rgba(200,151,63,.3)'   },
    prestige: { label:'Prestige Diamond', range:'$6,500+',        color:'#9B72CF',               bg:'rgba(155,114,207,.08)', border:'rgba(155,114,207,.3)'  },
  };

  /* ═══════════════════════════════════════
     PRICING ENGINE
  ═══════════════════════════════════════ */
  function roundToNearest9(price) {
    const base = Math.floor(price / 10) * 10;
    const rem  = price - base;
    return rem >= 5 ? base + 9 : (base - 1 < 0 ? 9 : base - 1);
  }

  function calculatePrice(kiraBasePrice, metalKey = '14k-yellow', gradeKey = 'F/VS+') {
    const metalDelta = METAL_ADJUSTMENTS[metalKey] ?? 0;
    const gradeDelta = GRADE_ADJUSTMENTS[gradeKey] ?? 0;

    const metalAdjusted = kiraBasePrice * (1 + metalDelta);
    const gradeAdjusted = metalAdjusted  * (1 + gradeDelta);
    const multiplied    = gradeAdjusted  * BASE_MULTIPLIER;
    const retail        = roundToNearest9(multiplied);

    const marginDollars = retail - gradeAdjusted;
    const marginPercent = (marginDollars / retail) * 100;

    return {
      kiraBasePrice,
      metalAdjustment:  Math.round(metalAdjusted - kiraBasePrice),
      gradeAdjustment:  Math.round(gradeAdjusted - metalAdjusted),
      adjustedCost:     Math.round(gradeAdjusted),
      retail,
      finalRetailPrice: retail,
      grossMarginDollars: Math.round(marginDollars),
      grossMarginPercent: Math.round(marginPercent * 10) / 10,
      meetsMinimum: marginPercent >= MIN_MARGIN_PERCENT,
      withTax: Math.round(retail * (1 + GA_SALES_TAX)),
    };
  }

  function getTier(retailPrice) {
    if (retailPrice < 2500) return 'entry';
    if (retailPrice < 6500) return 'bridal';
    return 'prestige';
  }

  /* ═══════════════════════════════════════
     KIRA CATALOG  (Jan 2026 — 20 pieces)
     Source: bangarams-kira-pricing.html
  ═══════════════════════════════════════ */
  const CATALOG = [
    /* ── NECKLACES ── */
    {
      sku:'KN-001', name:'Round Tennis Necklace', category:'Necklace / Haram',
      caratWeight:'10ct', kiraBasePrice:3049,
      description:'Timeless round brilliant tennis necklace. 10 carats of F/VS+ IGI-certified lab-grown diamonds set in 14KT yellow gold. Flows seamlessly from reception to evening.',
      descriptionHi:'टाइमलेस राउंड ब्रिलियंट टेनिस नेकलेस। 10 कैरेट F/VS+ IGI-सर्टिफाइड लैब-ग्रोन डायमंड, 14KT सोने में।',
      occasionTags:['Reception','Fashion'], isBestseller:false,
    },
    {
      sku:'KN-002', name:'Graduating Crown Necklace', category:'Necklace / Haram',
      caratWeight:'12ct', kiraBasePrice:4200,
      description:'Crown-set center stone with cascading graduating side diamonds. 12 carats in 14KT. The Indian bridal aesthetic elevated — worn at sangeet to reception.',
      descriptionHi:'क्राउन सेट सेंटर स्टोन और ग्रेजुएटिंग साइड डायमंड। 12 कैरेट।',
      occasionTags:['Bridal','Reception','Sangeet'], isBestseller:false,
    },
    {
      sku:'KN-003', name:'Emerald & Round Bridal Necklace', category:'Necklace / Haram',
      caratWeight:'25ct', kiraBasePrice:5499,
      description:'25 carats alternating emerald-cut and round brilliant lab diamonds. The Bangarams signature bridal necklace — commanding, architectural, unforgettable. IGI certified.',
      descriptionHi:'25 कैरेट एमेरल्ड-कट और राउंड ब्रिलियंट डायमंड का संयोजन। ब्राइडल हीरलूम।',
      occasionTags:['Bridal','Reception'], isBestseller:false, isFeatured:true,
    },
    {
      sku:'KN-004', name:'Oval & Emerald Statement Necklace', category:'Necklace / Haram',
      caratWeight:'33ct', kiraBasePrice:7199,
      description:'33 carats of oval and emerald-cut lab diamonds in continuous 14KT setting. An heirloom from the moment it is worn. Our most prestige necklace.',
      descriptionHi:'33 कैरेट ओवल और एमेरल्ड-कट डायमंड। अतुलनीय हीरलूम।',
      occasionTags:['Bridal'], isBestseller:false,
    },

    /* ── BRACELETS ── */
    {
      sku:'KB-001', name:'Round Diamond Tennis Bracelet', category:'Bangles / Kadas',
      caratWeight:'5ct', kiraBasePrice:1499,
      description:'Our bestselling bracelet — 5 carats of round brilliant lab diamonds in seamless 14KT. Wears alone or stacks perfectly with traditional gold bangles for the bridal wrist.',
      descriptionHi:'5 कैरेट राउंड ब्रिलियंट डायमंड ब्रेसलेट। ब्राइडल और एवरीडे दोनों के लिए परफेक्ट।',
      occasionTags:['Bridal','Reception','Gift','Everyday'], isBestseller:true,
    },
    {
      sku:'KB-002', name:'Heart-Lock Diamond Bracelet', category:'Bangles / Kadas',
      caratWeight:'5ct', kiraBasePrice:1199,
      description:'Heart-shaped diamond lock clasp with pavé diamonds throughout the band. 5 carats. Our most gifted piece for engagements, anniversaries, and milestone birthdays.',
      descriptionHi:'हार्ट-शेप्ड डायमंड लॉक क्लैस्प। 5 कैरेट। एंगेजमेंट का सबसे पसंदीदा गिफ्ट।',
      occasionTags:['Engagement','Gift','Fashion'], isBestseller:false,
    },
    {
      sku:'KB-003', name:'Oval Diamond Tennis Bracelet', category:'Bangles / Kadas',
      caratWeight:'10ct', kiraBasePrice:2499,
      description:'Oval-cut lab diamonds in a classic 14KT tennis setting. 10 carats of sophisticated sparkle — the elongated oval gives each stone maximum visual presence.',
      descriptionHi:'ओवल-कट लैब डायमंड। 10 कैरेट। सोफिस्टिकेटेड और एलीगेंट।',
      occasionTags:['Bridal','Reception'], isBestseller:false,
    },
    {
      sku:'KB-004', name:'Bezel-Set Diamond Bracelet', category:'Bangles / Kadas',
      caratWeight:'10ct', kiraBasePrice:2099,
      description:'Contemporary bezel setting cradles each lab diamond for a secure, modern silhouette. 10 carats in 14KT. Understated luxury for the minimalist bride.',
      descriptionHi:'बेज़ल सेटिंग में 10 कैरेट लैब डायमंड। मॉडर्न और मिनिमलिस्ट।',
      occasionTags:['Bridal','Everyday','Fashion'], isBestseller:false,
    },

    /* ── EARRINGS / HOOPS ── */
    {
      sku:'KE-001', name:'Solitaire Diamond Hoop', category:'Earrings',
      caratWeight:'1ct', kiraBasePrice:349,
      description:'A single brilliant lab-grown diamond drops from a sleek 14KT hoop. 1 total carat. The entry into Bangarams diamonds — equally at home at mehendi or a Monday morning meeting.',
      descriptionHi:'1 कैरेट सोलिटेयर लैब डायमंड हूप। एंट्री-लेवल डायमंड। हर अवसर के लिए।',
      occasionTags:['Everyday','Gift','Fashion'], isBestseller:false, isNewArrival:false,
    },
    {
      sku:'KE-002', name:'Inside-Out Diamond Hoop', category:'Earrings',
      caratWeight:'5ct', kiraBasePrice:1229,
      description:'Diamonds set on both the inside and outside of the hoop for 360° sparkle. 5 carats of continuous lab-grown brilliance. The sweet spot of our hoop collection.',
      descriptionHi:'360° चमक के लिए अंदर और बाहर दोनों तरफ डायमंड। 5 कैरेट। सबसे पसंदीदा हूप।',
      occasionTags:['Bridal','Sangeet','Reception','Fashion'], isBestseller:true,
    },
    {
      sku:'KE-003', name:'Emerald Inside-Out Hoop', category:'Earrings',
      caratWeight:'10ct', kiraBasePrice:1749,
      description:'Emerald-cut lab diamonds on both faces of the hoop — a statement only the most discerning bride makes. 10 carats. Pairs beautifully with a simple pendant.',
      descriptionHi:'एमेरल्ड-कट डायमंड इनसाइड-आउट हूप। 10 कैरेट। स्टेटमेंट पीस।',
      occasionTags:['Bridal','Reception'], isBestseller:false,
    },
    {
      sku:'KE-004', name:'Diamond Huggie Earrings', category:'Earrings',
      caratWeight:'3ct', kiraBasePrice:949,
      description:'Petite huggies set with 3 carats of brilliant lab-grown diamonds. The most wearable luxury earring in our collection — mehendi to office, wedding to weekend.',
      descriptionHi:'3 कैरेट डायमंड हगी। मेहंदी से ऑफिस तक, शादी से वीकेंड तक।',
      occasionTags:['Mehendi','Everyday','Gift'], isBestseller:false,
    },

    /* ── RINGS / BANDS ── */
    {
      sku:'KR-001', name:'Twisted Shank Solitaire Ring', category:'Ring',
      caratWeight:'3ct', kiraBasePrice:869,
      description:'A 3-carat round brilliant lab diamond on a delicately twisted 14KT shank. IGI certified F/VS+. Our most requested engagement ring — timeless, distinctive, deeply personal.',
      descriptionHi:'3 कैरेट राउंड ब्रिलियंट सोलिटेयर, ट्विस्टेड शैंक। IGI सर्टिफाइड। एंगेजमेंट रिंग।',
      occasionTags:['Engagement','Bridal'], isBestseller:false,
    },
    {
      sku:'KR-002', name:'Oval Bezel Solitaire Ring', category:'Ring',
      caratWeight:'2ct', kiraBasePrice:499,
      description:'An oval lab diamond in a clean bezel setting — modern, secure, and effortlessly wearable. 2 carats. Our most accessible diamond ring, under $900 retail.',
      descriptionHi:'2 कैरेट ओवल लैब डायमंड, बेज़ल सेटिंग। $900 से कम में। आसानी से पहनने योग्य।',
      occasionTags:['Engagement','Everyday','Gift'], isBestseller:false,
    },
    {
      sku:'KR-003', name:'Seven Stone Diamond Band', category:'Ring',
      caratWeight:'3ct', kiraBasePrice:709,
      description:'Seven round brilliant lab diamonds set continuously in 14KT. 3 total carats. Meaningful as a standalone gift — seven diamonds, seven lifetimes. Stacks beautifully with a solitaire.',
      descriptionHi:'सात राउंड ब्रिलियंट लैब डायमंड। 3 कैरेट। सात हीरे, सात जन्म।',
      occasionTags:['Bridal','Engagement','Gift'], isBestseller:false,
    },
    {
      sku:'KR-004', name:'Five Stone Diamond Band', category:'Ring',
      caratWeight:'1ct', kiraBasePrice:439,
      description:'Five brilliant lab diamonds in 1 total carat — our most accessible gateway ring. Under $800 retail. Often paired as a second band alongside an engagement solitaire.',
      descriptionHi:'5 लैब डायमंड, 1 कैरेट। $800 से कम। सबसे किफायती डायमंड रिंग।',
      occasionTags:['Everyday','Gift','Fashion'], isBestseller:false,
    },

    /* ── STUDS / PENDANTS ── */
    {
      sku:'KS-001', name:'Martini Diamond Studs (0.5ct)', category:'Earrings',
      caratWeight:'0.5ct', kiraBasePrice:150,
      description:'Classic three-prong martini studs in IGI-certified lab-grown diamonds. 0.5 total carat in 14KT — the most versatile piece in any jewelry wardrobe. Available in 7 sizes up to 6ct.',
      descriptionHi:'0.5 कैरेट मार्टिनी स्टड। IGI सर्टिफाइड। 7 साइज़ में उपलब्ध।',
      occasionTags:['Everyday','Gift','Mehendi'], isBestseller:false,
    },
    {
      sku:'KS-002', name:'Martini Diamond Studs (2ct)', category:'Earrings',
      caratWeight:'2ct', kiraBasePrice:449,
      description:'Martini studs in 2 total carats — the sweet spot for everyday wear with presence. IGI certified lab-grown in three-prong 14KT setting. Goes from mehendi to sangeet to boardroom.',
      descriptionHi:'2 कैरेट मार्टिनी स्टड। मेहंदी से संगीत तक हर जगह पहनें।',
      occasionTags:['Everyday','Gift','Sangeet'], isBestseller:true,
    },
    {
      sku:'KS-003', name:'Circle Diamond Pendant', category:'Pendant',
      caratWeight:'2ct', kiraBasePrice:799,
      description:'A continuous circle of lab-grown diamonds — 2 carats in 14KT. Auspicious in Hindu tradition: the circle represents eternity and wholeness. Gifted at weddings, pregnancies, and new beginnings.',
      descriptionHi:'2 कैरेट डायमंड सर्कल पेंडेंट। हिंदू परंपरा में शुभ — अनंत का प्रतीक।',
      occasionTags:['Bridal','Gift','Everyday'], isBestseller:false,
    },
    {
      sku:'KS-004', name:'Multi-Shape Diamond Pendant', category:'Pendant',
      caratWeight:'3ct', kiraBasePrice:999,
      description:'Round, oval, and marquise lab diamonds cluster in an asymmetric modern design. 3 carats in 14KT. A pendant that reads differently on every wearer — fashion-forward and deeply personal.',
      descriptionHi:'राउंड, ओवल और मार्क्विस डायमंड। 3 कैरेट। मॉडर्न असिमेट्रिक डिज़ाइन।',
      occasionTags:['Fashion','Reception','Gift'], isBestseller:false,
    },
  ];

  /* ═══════════════════════════════════════
     SEEDING — adds Kira catalog into STORE designs
  ═══════════════════════════════════════ */
  const SEED_KEY = 'bg_kira_seeded_v1';

  function seedKiraProducts() {
    if (localStorage.getItem(SEED_KEY)) return; // already seeded
    if (typeof STORE === 'undefined') return;    // STORE not loaded yet

    const now = new Date().toISOString();
    CATALOG.forEach(p => {
      const calc = calculatePrice(p.kiraBasePrice);
      STORE.addDesign({
        sku:          p.sku,
        title:        p.name,
        category:     p.category,
        description:  p.description,
        descriptionNative: p.descriptionHi || '',
        weight:       p.caratWeight + ' lab-grown diamonds (IGI certified)',
        leadTime:     '2–4 weeks (custom orders up to 6 weeks)',
        basePrice:    calc.finalRetailPrice,
        kiraBasePrice: p.kiraBasePrice,
        makingCharges: 0,
        cadFee:       0,
        metals:       ['gold_14k_yellow','gold_14k_white','gold_18k_yellow','gold_18k_white','gold_22k'],
        finishes:     ['plain','rhodium'],
        stones:       ['lab_diamond'],
        images:       [],
        videoUrl:     '',
        lineItems:    [],
        occasionTags: p.occasionTags || [],
        tier:         getTier(calc.finalRetailPrice),
        isBestseller: p.isBestseller || false,
        isFeatured:   p.isFeatured || false,
        catalogMonth: 'JAN-2026',
        published:    true,
        active:       true,
        createdAt:    now,
        updatedAt:    now,
      }, 'kira');
    });

    localStorage.setItem(SEED_KEY, '1');
  }

  /* ═══════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════ */
  return {
    BASE_MULTIPLIER, MIN_MARGIN_PERCENT, GA_SALES_TAX,
    METAL_OPTIONS, GRADE_OPTIONS, OCCASIONS, TIERS, CATALOG,
    calculatePrice, getTier, roundToNearest9,
    seedKiraProducts,
  };

})();
