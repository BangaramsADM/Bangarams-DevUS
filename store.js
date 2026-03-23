// store.js — Bangarams Design Catalog & Booking Data Layer
// Depends on: auth.js  |  Pattern: IIFE module, same as AUTH

const STORE = (() => {

  const K = {
    designs:   'bg_designs_v1',
    avail:     'bg_avail_v1',
    inquiries: 'bg_inquiries_v1',
    profiles:  'bg_profiles_v1',
  };

  /* ════════════════════════════════════════
     CONSTANTS
  ════════════════════════════════════════ */
  const METALS = {
    gold_22k: { label:'22K Gold (BIS Hallmark)', short:'22K Gold',  color:'#C8973F', tier:'gold' },
    gold_18k: { label:'18K Gold',                short:'18K Gold',  color:'#B8832E', tier:'gold' },
    gold_14k: { label:'14K Gold',                short:'14K Gold',  color:'#A87328', tier:'gold' },
    silver:   { label:'Sterling Silver (925)',    short:'Silver',    color:'#A8B4BC', tier:'silver' },
  };

  const FINISHES = {
    plain:    'Plain High Polish',
    rhodium:  'Rhodium / White Gold Finish',
    antique:  'Antique / Temple Finish',
    matte:    'Matte / Sand Blast',
    two_tone: 'Two-Tone (Gold + Rhodium)',
    rose:     'Rose Gold Finish',
  };

  const STONES = {
    none:            'No Stone',
    cz:              'Cubic Zirconia (CZ)',
    moissanite:      'Moissanite',
    lab_diamond:     'Lab-Grown Diamond (IGI Certified)',
    natural_diamond: 'Natural Diamond (GIA / IGI Certified)',
    colored:         'Colored Gemstone (Emerald, Ruby, etc.)',
  };

  const CATEGORIES = [
    'Necklace / Haram','Choker','Earrings','Maang Tikka',
    'Bangles / Kadas','Waist Belt / Vaddanam',
    'Nose Ring / Nath','Ring','Anklet / Payal',
    'Full Bridal Set','Hair Ornament','Pendant','Other',
  ];

  const BUDGET_RANGES = [
    'Under $500','$500 – $1,500','$1,500 – $3,000',
    '$3,000 – $6,000','$6,000 – $15,000','$15,000+',
    'Flexible — guide me',
  ];

  const TIME_SLOTS = [
    '9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM',
    '2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM',
  ];

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  /* ════════════════════════════════════════
     INDEXEDDB (image blob storage)
  ════════════════════════════════════════ */
  const idb = (() => {
    let _db = null;
    function open() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        const req = indexedDB.open('bg_media', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('blobs');
        req.onsuccess = e => { _db = e.target.result; res(_db); };
        req.onerror   = e => rej(e);
      });
    }
    async function save(blob) {
      const db  = await open();
      const key = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
      return new Promise((res, rej) => {
        const tx = db.transaction('blobs','readwrite');
        tx.objectStore('blobs').put(blob, key);
        tx.oncomplete = () => res(key);
        tx.onerror    = e => rej(e);
      });
    }
    async function get(key) {
      const db = await open();
      return new Promise((res, rej) => {
        const req = db.transaction('blobs').objectStore('blobs').get(key);
        req.onsuccess = e => res(e.target.result || null);
        req.onerror   = e => rej(e);
      });
    }
    async function remove(key) {
      const db = await open();
      return new Promise((res, rej) => {
        const tx = db.transaction('blobs','readwrite');
        tx.objectStore('blobs').delete(key);
        tx.oncomplete = () => res();
        tx.onerror    = e => rej(e);
      });
    }
    async function getURL(key) {
      const blob = await get(key);
      return blob ? URL.createObjectURL(blob) : null;
    }
    async function compressAndSave(file, maxW = 900) {
      const blob = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const s      = Math.min(1, maxW / img.width);
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(img.width  * s);
            canvas.height = Math.round(img.height * s);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(b => res(b), 'image/jpeg', 0.82);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
      return save(blob);
    }
    return { save, get, remove, getURL, compressAndSave };
  })();

  /* ════════════════════════════════════════
     MEDIA HELPERS
  ════════════════════════════════════════ */
  function gdriveSrc(url) {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
  }

  function ytEmbedUrl(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
  }

  function ytThumb(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
  }

  function resolveImgSrc(img) {
    // img: { type:'url'|'gdrive'|'idb', src:string }
    if (!img) return null;
    if (img.type === 'gdrive') return gdriveSrc(img.src);
    return img.src; // 'url' or base64
  }

  async function resolveImgSrcAsync(img) {
    if (!img) return null;
    if (img.type === 'idb') return idb.getURL(img.src);
    return resolveImgSrc(img);
  }

  /* ════════════════════════════════════════
     SUPPLIER PROFILES
  ════════════════════════════════════════ */
  const DEFAULTS = {
    ramouji: { name:'Ramouji', tagline:'Master Goldsmith · Custom Gold & Silver', whatsapp:'14045550101', bio:'30+ years crafting heirloom gold and silver jewelry from Hyderabad.', active:true },
    kira:    { name:'Kira',    tagline:'Certified Diamond Specialist',             whatsapp:'14045550102', bio:'GIA-trained diamond specialist. Lab-grown and natural, IGI/GIA certified.', active:true },
  };

  function getProfiles() { return JSON.parse(localStorage.getItem(K.profiles) || '{}'); }
  function saveProfiles(p) { localStorage.setItem(K.profiles, JSON.stringify(p)); }

  function getProfile(sid) {
    return { ...(DEFAULTS[sid] || { name:sid, tagline:'', whatsapp:'', bio:'', active:true }),
             ...getProfiles()[sid] };
  }
  function saveProfile(sid, data) {
    const p = getProfiles(); p[sid] = { ...getProfile(sid), ...data };
    saveProfiles(p);
  }

  /* ════════════════════════════════════════
     DESIGNS
  ════════════════════════════════════════ */
  function _rawDesigns() { return JSON.parse(localStorage.getItem(K.designs) || 'null'); }
  function _saveDesigns(d) { localStorage.setItem(K.designs, JSON.stringify(d)); }

  function getDesigns(filters = {}) {
    let list = _rawDesigns() || [];
    if (filters.supplierId) list = list.filter(d => d.supplierId === filters.supplierId);
    if (filters.status)     list = list.filter(d => d.active === (filters.status === 'active'));
    if (filters.category)   list = list.filter(d => d.category === filters.category);
    if (filters.metal)      list = list.filter(d => d.metals && d.metals.includes(filters.metal));
    return list;
  }

  function getPublicDesigns() { return (_rawDesigns() || []).filter(d => d.active); }
  function getDesignById(id)   { return (_rawDesigns() || []).find(d => d.id === id) || null; }
  function getDesignsBySupplier(sid) { return (_rawDesigns() || []).filter(d => d.supplierId === sid); }

  function addDesign(data, sid) {
    const list = _rawDesigns() || [];
    const id   = 'DES-' + Date.now();
    const d    = { id, supplierId:sid, ...data, active:true, featured:false,
                   createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    list.unshift(d);
    _saveDesigns(list);
    return id;
  }

  function updateDesign(id, data, sid) {
    const list = _rawDesigns() || [];
    const idx  = list.findIndex(d => d.id === id && d.supplierId === sid);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], ...data, updatedAt:new Date().toISOString() };
    _saveDesigns(list);
    return true;
  }

  function deleteDesign(id, sid) {
    const list = (_rawDesigns() || []);
    const d    = list.find(d => d.id === id);
    if (!d || d.supplierId !== sid) return false;
    _saveDesigns(list.filter(d => d.id !== id));
    // Clean up IDB blobs
    if (d.images) d.images.filter(i => i.type === 'idb').forEach(i => idb.remove(i.src));
    return true;
  }

  /* ════════════════════════════════════════
     SEED DATA
  ════════════════════════════════════════ */
  function seedIfEmpty() {
    if (_rawDesigns() !== null) return;
    const now = new Date().toISOString();
    _saveDesigns([
      {
        id:'DES-SEED-1', supplierId:'ramouji',
        title:'Lakshmi Temple Haram', category:'Necklace / Haram',
        description:'Intricately hand-crafted South Indian temple necklace featuring Goddess Lakshmi motifs, dancing peacocks, and traditional lotus chain. Each piece is individually cast and finished. Perfect for the main bridal ceremony.\n\nAvailable in 22K gold or gold-look sterling silver. Kundan stone-setting available on request.',
        weight:'32–38g approx', leadTime:'5–7 weeks',
        videoUrl:'', images:[],
        metals:['gold_22k','silver'], finishes:['plain','antique'],
        stones:['none','cz','moissanite'],
        basePrice:2800, cadFee:75,
        active:true, featured:true, createdAt:now, updatedAt:now
      },
      {
        id:'DES-SEED-2', supplierId:'ramouji',
        title:'Kundan Maang Tikka', category:'Maang Tikka',
        description:'Classic Kundan-set maang tikka with hand-painted meenakari reverse work. Adjustable chain. Perfect for North or South Indian bridal looks. Available with coloured stones or all-white CZ / Moissanite setting.',
        weight:'10–14g approx', leadTime:'3–4 weeks',
        videoUrl:'', images:[],
        metals:['gold_22k','gold_18k'], finishes:['antique','plain'],
        stones:['cz','moissanite'],
        basePrice:480, cadFee:50,
        active:true, featured:false, createdAt:now, updatedAt:now
      },
      {
        id:'DES-SEED-3', supplierId:'kira',
        title:'Solitaire Drop Earrings', category:'Earrings',
        description:'Timeless solitaire drop earrings in 4-prong or bezel setting. Available with lab-grown or natural diamonds, sourced directly from GIA-certified dealers. Choose your carat weight (0.50ct–2.00ct per side) and metal.',
        weight:'4–7g approx', leadTime:'2–4 weeks',
        videoUrl:'', images:[],
        metals:['gold_18k','gold_14k'], finishes:['plain','rhodium'],
        stones:['lab_diamond','natural_diamond','moissanite'],
        basePrice:1200, cadFee:0,
        active:true, featured:true, createdAt:now, updatedAt:now
      },
      {
        id:'DES-SEED-4', supplierId:'kira',
        title:'Full Pavé Diamond Bangle', category:'Bangles / Kadas',
        description:'Breathtaking full pavé bangle with 200+ individually set diamonds. Lab-grown (economical) or natural (investment-grade). Internal diameter customised to your wrist. Pairs beautifully with a plain gold stack.',
        weight:'14–18g approx', leadTime:'6–8 weeks',
        videoUrl:'', images:[],
        metals:['gold_18k','gold_14k'], finishes:['plain','rhodium'],
        stones:['lab_diamond','natural_diamond'],
        basePrice:2800, cadFee:100,
        active:true, featured:false, createdAt:now, updatedAt:now
      },
    ]);
  }

  /* ════════════════════════════════════════
     AVAILABILITY
  ════════════════════════════════════════ */
  function getAvailability(sid) {
    const all = JSON.parse(localStorage.getItem(K.avail) || '{}');
    if (all[sid]) return all[sid];
    // Sensible default: Tue-Sat 10am-5pm
    const slots = {};
    ['Tue','Wed','Thu','Fri','Sat'].forEach(d =>
      ['10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM']
        .forEach(t => { slots[`${d}-${t}`] = true; })
    );
    return { slots, blocked:[], accepting:true, pauseMsg:'' };
  }

  function saveAvailability(sid, data) {
    const all = JSON.parse(localStorage.getItem(K.avail) || '{}');
    all[sid]  = data;
    localStorage.setItem(K.avail, JSON.stringify(all));
  }

  function getOpenSlots(sid, days = 21) {
    const avail   = getAvailability(sid);
    const booked  = getInquiries(sid).filter(i => i.requestedDate && ['pending','confirmed'].includes(i.status));
    const result  = [];
    for (let i = 1; i <= days; i++) {
      const date    = new Date(); date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (avail.blocked && avail.blocked.includes(dateStr)) continue;
      const dow = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
      TIME_SLOTS.forEach(t => {
        if (avail.slots[`${dow}-${t}`]) {
          const taken = booked.some(b => b.requestedDate === dateStr && b.requestedTime === t);
          if (!taken) result.push({ date:dateStr, day:dow, time:t });
        }
      });
    }
    return result;
  }

  /* ════════════════════════════════════════
     INQUIRIES
  ════════════════════════════════════════ */
  function getInquiries(sid) {
    const all = JSON.parse(localStorage.getItem(K.inquiries) || '[]');
    return sid ? all.filter(i => i.supplierId === sid) : all;
  }
  function _saveInquiries(list) { localStorage.setItem(K.inquiries, JSON.stringify(list)); }

  function createInquiry(data) {
    const list = JSON.parse(localStorage.getItem(K.inquiries) || '[]');
    const id   = 'INQ-' + Date.now();
    const inq  = { id, ...data, status:'pending', createdAt:new Date().toISOString() };
    list.unshift(inq);
    _saveInquiries(list);
    return id;
  }

  function updateInquiry(id, data, sid) {
    const list = JSON.parse(localStorage.getItem(K.inquiries) || '[]');
    const idx  = list.findIndex(i => i.id === id && (!sid || i.supplierId === sid));
    if (idx < 0) return false;
    list[idx] = { ...list[idx], ...data };
    _saveInquiries(list);
    return true;
  }

  /* ════════════════════════════════════════
     WHATSAPP BUILDER
  ════════════════════════════════════════ */
  function buildWAMessage(design, opts) {
    const prof    = getProfile(design.supplierId);
    const metal   = METALS[opts.metal]?.label   || opts.metal   || '—';
    const finish  = FINISHES[opts.finish]        || opts.finish  || '—';
    const stone   = STONES[opts.stone]           || opts.stone   || '—';
    const lines   = [
      `Hi ${prof.name}! I found your work on Bangarams. 🙏`,
      ``,
      `I'm interested in: *${design.title}*`,
      ``,
      `*My Customization Request:*`,
      `• Metal: ${metal}`,
      `• Finish: ${finish}`,
      `• Stone: ${stone}`,
    ];
    if (opts.notes)  lines.push(`• Notes: ${opts.notes.slice(0,300)}`);
    if (opts.budget) lines.push(`• Budget: ${opts.budget}`);
    if (opts.requestedDate) {
      lines.push(``, `*Preferred Consultation:*`, `${opts.requestedDate} at ${opts.requestedTime}`);
    }
    if (opts.customerName)  lines.push(``, `*My Contact:*`, `Name: ${opts.customerName}`);
    if (opts.customerPhone) lines.push(`Phone / WA: ${opts.customerPhone}`);
    if (opts.customerEmail) lines.push(`Email: ${opts.customerEmail}`);
    lines.push(``, `Looking forward to hearing from you!`);
    return lines.join('\n');
  }

  function waUrl(phone, message) {
    const n = (phone || '').replace(/[^\d]/g, '');
    return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
  }

  function buildWAUrl(design, opts) {
    const prof = getProfile(design.supplierId);
    return waUrl(prof.whatsapp, buildWAMessage(design, opts));
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  seedIfEmpty();

  return {
    METALS, FINISHES, STONES, CATEGORIES, BUDGET_RANGES, TIME_SLOTS, DAYS,
    getProfile, saveProfile,
    getDesigns, getPublicDesigns, getDesignById, getDesignsBySupplier,
    addDesign, updateDesign, deleteDesign,
    getAvailability, saveAvailability, getOpenSlots,
    getInquiries, createInquiry, updateInquiry,
    buildWAMessage, buildWAUrl, waUrl,
    gdriveSrc, ytEmbedUrl, ytThumb, resolveImgSrc, resolveImgSrcAsync,
    idb,
  };
})();
