const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/\D/g,'');
const propAmtRaw = qs.get('amt') || '';   // Point 13 (query amt)

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

function fmtSigned(n){
  // keeps sign if negative/positive (for Point 15/16)
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('en-IN', {maximumFractionDigits: 2});
}

function fmtAbs(n){
  // always positive display
  const x = Math.abs(Number(n) || 0);
  return x.toLocaleString('en-IN', {maximumFractionDigits: 2});
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
  // Print button
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', ()=> window.print());

  // Header image: if fails, hide image so alt text doesn't print
  const hdr = document.getElementById('hdrImg');
  if (hdr){
    hdr.addEventListener('error', ()=> { hdr.style.display = 'none'; });
  }

  if (!acct){ alert('No account provided'); return; }

  const prefix = acct.slice(0,3);
  const chunk = await loadChunk(prefix);
  const rec = chunk[acct];
  if (!rec){ alert('Account not found'); return; }

  // RO / Branch (never blank)
  setText('pRO', pick(rec, ['Region','RO','Region Name']), '-');
  setText('pBranch', pick(rec, ['Branch','Branch Name']), '-');

  // ===== POINT SOURCES =====
  const P1  = pick(rec, ['Acct Name','Account Name','NAME']);
  const P2  = pick(rec, ['Mobile Num','Mobile','Mob No']);
  const P3  = pick(rec, ['Scheme Code','Scheme']);
  const P4  = acct;
  const P5  = excelSerialToDMY(pick(rec, ['Acct Opn Date']));
  const P6  = absNum(pick(rec, ['Sanct Lim Amount']));

  // Point 7/10/11/12/13 must display POSITIVE
  const P7  = absNum(pick(rec, ['O/S Bal','OS Bal','Outstanding','O/S Bal ']));
  const P8  = excelSerialToDMY(pick(rec, ['CIF NPA date','NPA Date','NPA Dt','Npa Date']));
  const P9  = pick(rec, ['Asset Code 30.09.25','Asset Code']);
  const P10 = absNum(pick(rec, ['Provision','Provision ']));  // positive display
  const P11 = absNum(pick(rec, ['UCI','UCI ']));              // positive display
  const P12 = absNum(pick(rec, ['URI','URI ']));              // positive display
  const P13 = absNum(propAmtRaw);                             // positive display

  // ===== POINT FORMULAS (as you defined) =====
  // Point 14 = Point 13*100/Point 11  (always positive)
  const P14 = (P11 > 0) ? (P13 * 100 / P11) : 0;

  // Point 15 = Point 7 - Point 11  (negative allowed)
  const P15 = (P7 - P13);

  // Point 16 = Point 13 - (Point 7 - Point 12 - Point 10) (negative allowed)
  const P16 = (P13 - (P7 - P12 - P10));

  // Point 17 = Point 7 + Point 11 - Point 13 (display always positive)
  const P17 = Math.abs(P7 + P11 - P13);

  // ===== FILL TABLE (1–17 never blank) =====
  setText('p1', P1, '-');
  setText('p2', P2, '-');
  setText('p3', P3, '-');
  setText('p4', P4, '-');
  setText('p5', P5, '-');

  setText('p6', fmtAbs(P6), '0');
  setText('p7', fmtAbs(P7), '0');
  setText('p8', P8, '-');
  setText('p9', P9, '-');
  setText('p10', fmtAbs(P10), '0');
  setText('p11', fmtAbs(P11), '0');
  setText('p12', fmtAbs(P12), '0');
  setText('p13', fmtAbs(P13), '0');

  // % always positive and correct
  setText('p14', Math.abs(P14).toFixed(2), '0.00');

  // Negative allowed where required
  setText('p15', fmtSigned(P15), '0');
  setText('p16', fmtSigned(P16), '0');

  // Always positive
  setText('p17', fmtAbs(P17), '0');

  // Optional subtitle
  const sub = `Account: ${acct} • Branch: ${pick(rec,['Branch']) || ''} • SOL: ${pick(rec,['Sol']) || ''}`;
  setText('opSub', sub, '');
});
