// orders.js — Bangarams Order Management, Invoicing, Payments & Metal Prices
// Depends on: auth.js, store.js

const ORDERS = (() => {

  const K = {
    orders:    'bg_orders_v1',
    invoices:  'bg_invoices_v1',
    payments:  'bg_payments_v1',
    revisions: 'bg_revisions_v1',
    prices:    'bg_metal_prices',
    manual:    'bg_manual_prices',
  };

  /* ════════════════════════════════════════
     CONSTANTS
  ════════════════════════════════════════ */
  const ORDER_STATUS = {
    quoted:        { label:'Quoted',        color:'#9B72CF', bg:'rgba(155,114,207,.12)', next:'confirmed' },
    confirmed:     { label:'Confirmed',     color:'#C8973F', bg:'rgba(200,151,63,.12)',  next:'in_production' },
    in_production: { label:'In Production', color:'#E8C97A', bg:'rgba(232,201,122,.12)', next:'quality_check' },
    quality_check: { label:'Quality Check', color:'#B8C8D8', bg:'rgba(184,200,216,.12)', next:'ready_to_ship' },
    ready_to_ship: { label:'Ready to Ship', color:'#7FB069', bg:'rgba(127,176,105,.12)', next:'shipped' },
    shipped:       { label:'Shipped',       color:'#4A90D9', bg:'rgba(74,144,217,.12)',  next:'delivered' },
    delivered:     { label:'Delivered',     color:'#7FB069', bg:'rgba(127,176,105,.12)', next:'completed' },
    completed:     { label:'Completed',     color:'rgba(168,152,128,.7)', bg:'rgba(168,152,128,.08)', next:null },
    cancelled:     { label:'Cancelled',     color:'rgba(220,80,80,.6)',   bg:'rgba(220,80,80,.06)',   next:null },
  };

  const INVOICE_STATUS = {
    draft:        { label:'Draft',         color:'rgba(168,152,128,.5)',  bg:'rgba(168,152,128,.06)' },
    submitted:    { label:'Submitted',     color:'#C8973F',               bg:'rgba(200,151,63,.10)'  },
    under_review: { label:'Under Review',  color:'#E8C97A',               bg:'rgba(232,201,122,.10)' },
    approved:     { label:'Approved',      color:'#7FB069',               bg:'rgba(127,176,105,.10)' },
    paid:         { label:'Paid',          color:'rgba(127,176,105,.9)',  bg:'rgba(127,176,105,.12)' },
    disputed:     { label:'Disputed',      color:'rgba(220,80,80,.7)',    bg:'rgba(220,80,80,.08)'   },
  };

  const PAYMENT_STATUS = {
    pending:  { label:'Pending',  color:'rgba(168,152,128,.5)' },
    deposit:  { label:'Deposit',  color:'#C8973F' },
    paid:     { label:'Paid',     color:'#7FB069' },
    refunded: { label:'Refunded', color:'rgba(220,80,80,.6)' },
  };

  const REVISION_STATUS = {
    pending:  { label:'Pending Admin Review', color:'#C8973F',             bg:'rgba(200,151,63,.10)' },
    approved: { label:'Approved',             color:'#7FB069',             bg:'rgba(127,176,105,.10)' },
    rejected: { label:'Rejected',             color:'rgba(220,80,80,.6)',  bg:'rgba(220,80,80,.08)'  },
  };

  /* ════════════════════════════════════════
     METAL PRICES
  ════════════════════════════════════════ */
  const FALLBACK_PRICES = {
    goldUSDPerOz: 2415, silverUSDPerOz: 31.80,
    goldINRPer10g: 65200, silverINRPer10g: 858,
    usdToInr: 83.70, source:'fallback',
    updatedAt: new Date().toISOString(),
  };

  async function fetchLivePrices() {
    const cached = JSON.parse(localStorage.getItem(K.prices) || 'null');
    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < 3600000) return cached;
    try {
      const [fxRes, metalRes] = await Promise.all([
        fetch('https://api.frankfurter.app/latest?from=USD&to=INR'),
        fetch('https://api.metals.live/v1/spot/gold,silver'),
      ]);
      const fxData    = await fxRes.json();
      const metalData = await metalRes.json();
      const usdToInr  = fxData.rates?.INR || FALLBACK_PRICES.usdToInr;
      const goldUSD   = metalData[0]?.gold    || FALLBACK_PRICES.goldUSDPerOz;
      const silverUSD = metalData[1]?.silver  || FALLBACK_PRICES.silverUSDPerOz;
      const prices = {
        goldUSDPerOz:   goldUSD,
        silverUSDPerOz: silverUSD,
        goldINRPer10g:   Math.round(goldUSD   / 31.1035 * 10 * usdToInr),
        silverINRPer10g: Math.round(silverUSD / 31.1035 * 10 * usdToInr),
        usdToInr, source:'live',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(K.prices, JSON.stringify(prices));
      return prices;
    } catch {
      return cached || getManualPrices();
    }
  }

  function getManualPrices() {
    return JSON.parse(localStorage.getItem(K.manual) || 'null') || FALLBACK_PRICES;
  }

  function setManualPrices(data) {
    const p = { ...data, source:'manual', updatedAt:new Date().toISOString() };
    localStorage.setItem(K.manual, JSON.stringify(p));
    localStorage.setItem(K.prices, JSON.stringify(p));
    return p;
  }

  function getCachedPrices() {
    return JSON.parse(localStorage.getItem(K.prices) || 'null') || getManualPrices();
  }

  /* ════════════════════════════════════════
     ORDERS
  ════════════════════════════════════════ */
  function _raw(key)     { return JSON.parse(localStorage.getItem(key) || '[]'); }
  function _save(key, d) { localStorage.setItem(key, JSON.stringify(d)); }

  function getOrders(sid)  { const all = _raw(K.orders); return sid ? all.filter(o=>o.supplierId===sid) : all; }
  function getOrderById(id){ return _raw(K.orders).find(o=>o.id===id) || null; }

  function addOrder(data) {
    const list = _raw(K.orders);
    const id   = 'ORD-' + String(Date.now()).slice(-6);
    const o    = { id, ...data, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    list.unshift(o); _save(K.orders, list);
    return id;
  }

  function updateOrder(id, data, sid) {
    const list = _raw(K.orders);
    const idx  = list.findIndex(o => o.id===id && (!sid || o.supplierId===sid));
    if (idx<0) return false;
    list[idx] = { ...list[idx], ...data, updatedAt:new Date().toISOString() };
    _save(K.orders, list); return true;
  }

  function advanceStatus(id, sid) {
    const o    = getOrderById(id);
    if (!o || (sid && o.supplierId!==sid)) return false;
    const next = ORDER_STATUS[o.status]?.next;
    if (!next) return false;
    const ts   = {};
    if (next==='shipped')   ts.shippedDate   = new Date().toISOString();
    if (next==='delivered') ts.deliveredDate = new Date().toISOString();
    if (next==='completed') ts.completedAt   = new Date().toISOString();
    return updateOrder(id, { status:next, ...ts }, sid);
  }

  /* ════════════════════════════════════════
     INVOICES
  ════════════════════════════════════════ */
  function getInvoices(sid) { const all=_raw(K.invoices); return sid?all.filter(i=>i.supplierId===sid):all; }
  function getInvoiceById(id){ return _raw(K.invoices).find(i=>i.id===id)||null; }
  function getInvoiceForOrder(oid){ return _raw(K.invoices).find(i=>i.orderId===oid)||null; }

  function addInvoice(data) {
    const list = _raw(K.invoices);
    const id   = 'INV-' + String(Date.now()).slice(-6);
    const inv  = { id, ...data, status:'draft', createdAt:new Date().toISOString() };
    list.unshift(inv); _save(K.invoices, list); return id;
  }

  function updateInvoice(id, data, sid) {
    const list = _raw(K.invoices);
    const idx  = list.findIndex(i=>i.id===id && (!sid||i.supplierId===sid));
    if (idx<0) return false;
    list[idx] = { ...list[idx], ...data }; _save(K.invoices, list); return true;
  }

  function submitInvoice(id, sid) {
    return updateInvoice(id, { status:'submitted', submittedAt:new Date().toISOString() }, sid);
  }
  function approveInvoice(id, note) {
    return updateInvoice(id, { status:'approved', approvedAt:new Date().toISOString(), adminNote:note||'' });
  }
  function markInvoicePaid(id, note) {
    return updateInvoice(id, { status:'paid', paidAt:new Date().toISOString(), adminNote:note||'' });
  }
  function disputeInvoice(id, note) {
    return updateInvoice(id, { status:'disputed', adminNote:note||'' });
  }

  /* ════════════════════════════════════════
     PAYMENTS (customer-side)
  ════════════════════════════════════════ */
  function getPayments(sid)   { const all=_raw(K.payments); return sid?all.filter(p=>p.supplierId===sid):all; }
  function getPaymentForOrder(oid){ return _raw(K.payments).find(p=>p.orderId===oid)||null; }

  function addPayment(data) {
    const list=_raw(K.payments);
    const id='PAY-'+String(Date.now()).slice(-6);
    list.unshift({ id, ...data, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
    _save(K.payments,list); return id;
  }
  function updatePayment(id, data) {
    const list=_raw(K.payments);
    const idx=list.findIndex(p=>p.id===id);
    if(idx<0)return false;
    list[idx]={...list[idx],...data,updatedAt:new Date().toISOString()};
    _save(K.payments,list); return true;
  }

  /* ════════════════════════════════════════
     PRICING REVISIONS
  ════════════════════════════════════════ */
  function getRevisions(sid)  { const all=_raw(K.revisions); return sid?all.filter(r=>r.supplierId===sid):all; }

  function requestRevision(data) {
    const list=_raw(K.revisions);
    const id='REV-'+String(Date.now()).slice(-6);
    list.unshift({ id, ...data, status:'pending', createdAt:new Date().toISOString() });
    _save(K.revisions,list); return id;
  }
  function resolveRevision(id, status, adminNote, newPriceUSD) {
    const list=_raw(K.revisions);
    const idx=list.findIndex(r=>r.id===id);
    if(idx<0)return false;
    list[idx]={ ...list[idx], status, adminNote:adminNote||'', resolvedAt:new Date().toISOString() };
    _save(K.revisions,list);
    if(status==='approved' && newPriceUSD) updateOrder(list[idx].orderId, { quotedPriceUSD:newPriceUSD, quotedPriceINR:Math.round(newPriceUSD*getCachedPrices().usdToInr) });
    return true;
  }

  /* ════════════════════════════════════════
     SEED DATA
  ════════════════════════════════════════ */
  function seedIfEmpty() {
    if (_raw(K.orders).length) return;
    const now   = new Date().toISOString();
    const days  = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };

    const orders = [
      { id:'ORD-100', supplierId:'ramouji', inquiryId:'', designId:'DES-SEED-1',
        designTitle:'Lakshmi Temple Haram', customerName:'Priya Sharma',
        customerPhone:'+14045551001', customerEmail:'priya@email.com',
        metal:'gold_22k', finish:'antique', stone:'none', estimatedWeight:'36g',
        specifications:'Full temple haram, 18" length, Lakshmi centre motif, lotus chain',
        quotedPriceUSD:3200, quotedPriceINR:267840, goldPriceUSD_atBooking:2340,
        goldINRPer10g_atBooking:62180, usdToInr_atBooking:83.70,
        status:'in_production', paymentStatus:'deposit',
        depositPaidUSD:1600, balanceDueUSD:1600,
        shippingAddress:'123 Peachtree Rd, Alpharetta GA 30004', shippingInstructions:'Signature required. Insure for full value.',
        bookedAt:days(14), confirmedAt:days(12), createdAt:days(14), updatedAt:days(2) },

      { id:'ORD-101', supplierId:'kira', inquiryId:'', designId:'DES-SEED-3',
        designTitle:'Solitaire Drop Earrings', customerName:'Anita Patel',
        customerPhone:'+14045551002', customerEmail:'anita@email.com',
        metal:'gold_18k', finish:'plain', stone:'lab_diamond', estimatedWeight:'6g',
        specifications:'1.0ct each side, VS1 clarity, G colour, IGI certified',
        quotedPriceUSD:2100, quotedPriceINR:175770, goldPriceUSD_atBooking:2360,
        goldINRPer10g_atBooking:63100, usdToInr_atBooking:83.70,
        status:'ready_to_ship', paymentStatus:'paid',
        depositPaidUSD:2100, balanceDueUSD:0,
        trackingNumber:'', shippingAddress:'45 Windward Pkwy, Alpharetta GA 30005',
        shippingInstructions:'FedEx Priority Overnight, fully insured. Adult signature.',
        bookedAt:days(21), confirmedAt:days(19), createdAt:days(21), updatedAt:days(1) },

      { id:'ORD-102', supplierId:'ramouji', inquiryId:'', designId:'DES-SEED-2',
        designTitle:'Kundan Maang Tikka', customerName:'Deepa Reddy',
        customerPhone:'+14045551003', customerEmail:'deepa@email.com',
        metal:'gold_22k', finish:'antique', stone:'cz', estimatedWeight:'12g',
        specifications:'Large Kundan centre, meenakari back, adjustable 10-14" chain',
        quotedPriceUSD:680, quotedPriceINR:56916, goldPriceUSD_atBooking:2290,
        goldINRPer10g_atBooking:60900, usdToInr_atBooking:83.70,
        status:'shipped', paymentStatus:'paid',
        depositPaidUSD:680, balanceDueUSD:0,
        trackingNumber:'FX789456123US', shippedDate:days(3),
        shippingAddress:'89 Old Milton Pkwy, Alpharetta GA 30009',
        shippingInstructions:'FedEx 2-Day, insured $700.',
        bookedAt:days(35), confirmedAt:days(33), createdAt:days(35), updatedAt:days(3) },

      { id:'ORD-103', supplierId:'kira', inquiryId:'', designId:'DES-SEED-4',
        designTitle:'Full Pavé Diamond Bangle', customerName:'Sunita Mehta',
        customerPhone:'+14045551004', customerEmail:'sunita@email.com',
        metal:'gold_18k', finish:'plain', stone:'lab_diamond', estimatedWeight:'16g',
        specifications:'Full pavé, 2.5 internal dia, 220 stones ~1.80ct total, IGI',
        quotedPriceUSD:4200, quotedPriceINR:351540, goldPriceUSD_atBooking:2400,
        goldINRPer10g_atBooking:64200, usdToInr_atBooking:83.70,
        status:'confirmed', paymentStatus:'deposit',
        depositPaidUSD:2100, balanceDueUSD:2100,
        shippingAddress:'200 Mansell Ct, Roswell GA 30076', shippingInstructions:'',
        bookedAt:days(5), confirmedAt:days(4), createdAt:days(5), updatedAt:days(4) },

      { id:'ORD-104', supplierId:'ramouji', inquiryId:'', designId:'DES-SEED-1',
        designTitle:'Custom Chandbali Earrings', customerName:'Kavitha Nair',
        customerPhone:'+14045551005', customerEmail:'kavitha@email.com',
        metal:'silver', finish:'rhodium', stone:'moissanite', estimatedWeight:'18g',
        specifications:'Large chandbali, 3" drop, moissanite cluster, rhodium dipped',
        quotedPriceUSD:340, quotedPriceINR:28458, goldPriceUSD_atBooking:2310,
        goldINRPer10g_atBooking:61500, usdToInr_atBooking:83.70,
        status:'completed', paymentStatus:'paid',
        depositPaidUSD:340, balanceDueUSD:0,
        trackingNumber:'FX456789012US', shippedDate:days(18), deliveredDate:days(15), completedAt:days(15),
        shippingAddress:'301 N Main St, Alpharetta GA 30009', shippingInstructions:'',
        bookedAt:days(45), confirmedAt:days(43), createdAt:days(45), updatedAt:days(15) },
    ];

    const invoices = [
      { id:'INV-100', supplierId:'ramouji', orderId:'ORD-100',
        goldWeightG:36, goldPriceINRPer10g:62180, makingChargesINR:8500, stoneChargesINR:0,
        amountINR:230848, amountUSD:Math.round(230848/83.70),
        status:'submitted', submittedAt:days(5), createdAt:days(5), notes:'' },

      { id:'INV-101', supplierId:'kira', orderId:'ORD-101',
        goldWeightG:6, goldPriceINRPer10g:63100, makingChargesINR:3200, stoneChargesINR:48000,
        amountINR:89060, amountUSD:Math.round(89060/83.70),
        status:'approved', submittedAt:days(8), approvedAt:days(6), createdAt:days(8), adminNote:'Approved. Diamond cert verified.', notes:'' },

      { id:'INV-102', supplierId:'ramouji', orderId:'ORD-102',
        goldWeightG:12, goldPriceINRPer10g:60900, makingChargesINR:4200, stoneChargesINR:1800,
        amountINR:47880, amountUSD:Math.round(47880/83.70),
        status:'paid', submittedAt:days(20), approvedAt:days(18), paidAt:days(10), createdAt:days(20), notes:'' },

      { id:'INV-103', supplierId:'kira', orderId:'ORD-103',
        goldWeightG:16, goldPriceINRPer10g:64200, makingChargesINR:5200, stoneChargesINR:85000,
        amountINR:193520, amountUSD:Math.round(193520/83.70),
        status:'draft', createdAt:days(2), notes:'' },
    ];

    const payments = [
      { id:'PAY-100', orderId:'ORD-100', supplierId:'ramouji', customerAmountUSD:3200, depositPaidUSD:1600, balanceDueUSD:1600, status:'deposit', notes:'Deposit via Zelle', createdAt:days(14), updatedAt:days(14) },
      { id:'PAY-101', orderId:'ORD-101', supplierId:'kira',    customerAmountUSD:2100, depositPaidUSD:2100, balanceDueUSD:0,    status:'paid',    notes:'Full payment via Zelle', createdAt:days(21), updatedAt:days(19) },
      { id:'PAY-102', orderId:'ORD-102', supplierId:'ramouji', customerAmountUSD:680,  depositPaidUSD:680,  balanceDueUSD:0,    status:'paid',    notes:'Cash on delivery', createdAt:days(35), updatedAt:days(25) },
      { id:'PAY-103', orderId:'ORD-103', supplierId:'kira',    customerAmountUSD:4200, depositPaidUSD:2100, balanceDueUSD:2100, status:'deposit', notes:'50% deposit via bank transfer', createdAt:days(5), updatedAt:days(4) },
      { id:'PAY-104', orderId:'ORD-104', supplierId:'ramouji', customerAmountUSD:340,  depositPaidUSD:340,  balanceDueUSD:0,    status:'paid',    notes:'Full payment via Zelle', createdAt:days(45), updatedAt:days(40) },
    ];

    _save(K.orders, orders);
    _save(K.invoices, invoices);
    _save(K.payments, payments);
    _save(K.revisions, []);
  }

  /* ════════════════════════════════════════
     FORMATTERS
  ════════════════════════════════════════ */
  function fmt(usd, inr, toggle) {
    return toggle === 'inr'
      ? `₹${Math.round(inr||0).toLocaleString('en-IN')}`
      : `$${Math.round(usd||0).toLocaleString()}`;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  /* ── INIT ── */
  seedIfEmpty();

  return {
    ORDER_STATUS, INVOICE_STATUS, PAYMENT_STATUS, REVISION_STATUS,
    fetchLivePrices, getCachedPrices, setManualPrices,
    getOrders, getOrderById, addOrder, updateOrder, advanceStatus,
    getInvoices, getInvoiceById, getInvoiceForOrder, addInvoice, updateInvoice,
    submitInvoice, approveInvoice, markInvoicePaid, disputeInvoice,
    getPayments, getPaymentForOrder, addPayment, updatePayment,
    getRevisions, requestRevision, resolveRevision,
    fmt, fmtDate,
  };
})();
