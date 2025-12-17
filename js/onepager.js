const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/\D/g,'');
const propAmtRaw = qs.get('amt') || '';

async function loadChunk(prefix){
  const r = await fetch(`data/chunks/${prefix}.json`, {cache:'no-store'});
  if (!r.ok) throw new Error(`Chunk not found: data/chunks/${prefix}.json`);
  return r.json();
}

function normStr(x){
  return (x === undefined || x === null) ? '' : String(x).trim();
}

function toNum(x){
  const s = normStr(x).replace(/,/g,'');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function absNum(x){
  const n = toNum(x);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function fmtIN(x){
  const n = absNum(x);
  return n.toLocaleString('en-IN', {maximumFractionDigits: 2});
}

function pick(rec, keys){
  for (const k of keys){
    const v = rec?.[k];
    if (v !== undefined && v !== null && normStr(v) !== '') return v;
  }
  return '';
}

function excelSerialToDMY(v){
  const n = toNum(v);
  if (!Number.isFinite(n)) {
    const s = normStr(v);
    return s ? s : '-';
  }
  // Excel serial range guard
  if (n > 20000 && n < 60000){
    const ms = Math.round((n - 25569) * 86400 * 1000);
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const yy = d.getUTCFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  return String(v);
}

function setText(id, v, fallback='-'){
  const el = document.getElementById(id);
  if (!el) return;
  const s = normStr(v);
  el.textContent = s ? s : fallback;
}

window.addEventListener('DOMContentLoaded', async ()=>{
  // print
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', ()=> window.print());

  // header: if fails, don't show alt text
  const hdr = document.getElementById('hdrImg');
  if (hdr){
    hdr.addEventListener('error', ()=> { hdr.style.display='none'; });
  }

  if (!acct){ alert('No account provided'); return; }

  const prefix = acct.slice(0,3);
  const chunk = await loadChunk(prefix);
  const rec = chunk[acct];
  if (!rec){ alert('Account not found'); return; }

  // Top line (RO/Branch)
  setText('pRO', pick(rec, ['Region','RO','Region Name']), '-');
  setText('pBranch', pick(rec, ['Branch','Branch Name']), '-');

  // POINT SOURCES (as per your mapping)
  const P1  = pick(rec, ['Acct Name','Account Name','NAME']);
  const P2  = pick(rec, ['Mobile Num','Mobile','Mob No']);
  const P3  = pick(rec, ['Scheme Code','Scheme']);
  const P4  = acct;
  const P5  = excelSerialToDMY(pick(rec, ['Acct Opn Date']));
  const P6  = absNum(pick(rec, ['Sanct Lim Amount']));
  const P7  = absNum(pick(rec, ['O/S Bal','OS Bal','Outstanding']));
  const P8  = excelSerialToDMY(pick(rec, ['CIF NPA date','NPA Date','NPA Dt','Npa Date']));
  const P9  = pick(rec, ['Asset Code 30.09.25','Asset Code']);
  const P10 = absNum(pick(rec, ['Provision']));
  const P11 = absNum(pick(rec, ['UCI']));
  const P12 = absNum(pick(rec, ['URI']));
  const P13 = absNum(propAmtRaw);

  // POINT FORMULAS (exactly as you wrote)
  const P14 = (P11 > 0) ? (P13 * 100 / P11) : 0;                    // 13*100/11
  const P15 = (P7 - P11);                                          // 7 - 11 (can be negative)
  const P16 = (P13 - (P7 - P12 - P10));                             // 13 - (7 - 12 - 10)
  const P17 = (P7 + P11 - P13);                                     // 7 + 11 - 13

  // Fill table (1-17 never blank; numbers formatted; negatives allowed where formula says)
  setText('p1',  P1, '-');
  setText('p2',  P2, '-');
  setText('p3',  P3, '-');
  setText('p4',  P4, '-');
  setText('p5',  P5, '-');

  setText('p6',  P6.toLocaleString('en-IN', {maximumFractionDigits:2}), '0');
  setText('p7',  fmtIN(P7), '0');
  setText('p8',  P8, '-');
  setText('p9',  P9, '-');
  setText('p10', fmtIN(P10), '0');
  setText('p11', fmtIN(P11), '0');
  setText('p12', fmtIN(P12), '0');
  setText('p13', fmtIN(P13), '0');

  // 14 percentage (no negative display needed)
  setText('p14', Math.abs(P14).toFixed(2), '0.00');

  // 15,16,17 can be negative/positive as per your rule.
  // If you want display WITHOUT minus anywhere, tell me and I’ll wrap Math.abs.
  setText('p15', (Number(P15)).toLocaleString('en-IN', {maximumFractionDigits:2}), '0');
  setText('p16', (Number(P16)).toLocaleString('en-IN', {maximumFractionDigits:2}), '0');
  setText('p17', (Number(P17)).toLocaleString('en-IN', {maximumFractionDigits:2}), '0');

  // subtitle line (optional)
  const sub = `Account: ${acct} • Branch: ${pick(rec,['Branch']) || ''} • SOL: ${pick(rec,['Sol']) || ''}`;
  setText('opSub', sub, '');
});
