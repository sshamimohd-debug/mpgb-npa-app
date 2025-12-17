const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/\D/g,'');
const propAmtRaw = qs.get('amt') || '';

async function loadChunk(prefix){
  const r = await fetch(`data/chunks/${prefix}.json`, {cache:'no-store'});
  if (!r.ok) throw new Error(`Chunk not found: data/chunks/${prefix}.json`);
  return r.json();
}

function toNum(x){
  const n = Number(String(x ?? '').replace(/,/g,'').trim());
  return Number.isFinite(n) ? n : NaN;
}
function posNum(x){
  const n = toNum(x);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
function fmtIN(x){
  return posNum(x).toLocaleString('en-IN', {maximumFractionDigits: 2});
}
function pick(rec, keys){
  for (const k of keys){
    const v = rec?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}
function excelSerialToDMY(v){
  // Excel serial (e.g., 43190) -> DD-MM-YYYY
  const n = toNum(v);
  if (!Number.isFinite(n)) return '';
  if (n > 20000 && n < 60000){
    const ms = Math.round((n - 25569) * 86400 * 1000); // Excel->Unix
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
  const s = (v === undefined || v === null) ? '' : String(v).trim();
  el.textContent = s ? s : fallback;
}

window.addEventListener('DOMContentLoaded', async ()=>{
  // Print button
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', ()=> window.print());

  // Header image fallback: if image fails, hide alt-text box and show nothing
  const hdr = document.getElementById('hdrImg');
  if (hdr){
    hdr.addEventListener('error', ()=> {
      hdr.style.display = 'none'; // prevents "MPGB Header" alt text printing
    });
  }

  if (!acct){ alert('No account provided'); return; }

  const prefix = acct.slice(0,3);
  const chunk = await loadChunk(prefix);
  const r = chunk[acct];
  if (!r){ alert('Account not found'); return; }

  // RO / Branch (never blank)
  setText('pRO', pick(r, ['Region','RO','Region Name']), '-');
  setText('pBranch', pick(r, ['Branch','Branch Name']), '-');

  // 1-17 (never blank)
  setText('pName', pick(r, ['Acct Name','Account Name','NAME']), '-');
  setText('pMobile', pick(r, ['Mobile Num','Mobile','Mob No']), '-');
  setText('pScheme', pick(r, ['Scheme Code','Scheme']), '-');
  setText('pAccount', acct, acct);

  // 5,6 (your confirmed headers) + Excel serial date to DMY
  const sancDate = pick(r, ['Acct Opn Date']);
  setText('pSanctionDate', excelSerialToDMY(sancDate), '-');

  const sancAmt = pick(r, ['Sanct Lim Amount']);
  setText('pSanctionAmt', fmtIN(sancAmt), '0');

  // 7 O/S
  const osBal = pick(r, ['O/S Bal','OS Bal','Outstanding']);
  setText('pOutstanding', fmtIN(osBal), '0');

  // 8 NPA date (try multiple keys + Excel serial)
  const npaDate = pick(r, ['NPA Date','NPA Dt','Npa Date','CIF NPA date']);
  setText('pNpaDate', excelSerialToDMY(npaDate), '-');

  // 9-12
  setText('pAsset', pick(r, ['Asset Code 30.09.25','Asset Code']), '-');
  setText('pProvision', fmtIN(pick(r, ['Provision'])), '0');
  setText('pUci', fmtIN(pick(r, ['UCI'])), '0');
  setText('pUri', fmtIN(pick(r, ['URI'])), '0');
  // 13 Proposed OTS from query
  setText('pOts', fmtIN(propAmtRaw), '0');

  // ===== Derived (Excel formulas; NO negative display) =====
  const D11 = posNum(osBal);                         // Outstanding (O/S)
  const D17 = posNum(propAmtRaw);                    // Proposed OTS
  const D14 = posNum(pick(r, ['Provision']));        // Provision

  // (Optional) D16 mapping: agar aapke data me "D16" wala field nahi hai to 0 rahega
  // Aap chahe to yahan key add kar dena (e.g. 'Something Column Name')
  const D16 = posNum(pick(r, ['D16', 'PL Base', 'Recovery Base'])) || 0;

  // 14 = D17*100/D11
  const otsPct = D11 > 0 ? Math.abs((D17 * 100) / D11) : 0;

  // 15 = D11 - D17   (display positive)
  const D15 = Math.abs(D11 - D17);

  // 16 = D17-(D11-D16-D14)
  const plImpact = Math.abs(D17 - (D11 - D16 - D14));

  // 17 = D11 + D15 - D17
  const totalSacrifice = Math.abs(D11 + D15 - D17);

  setText('pOtsPct', otsPct.toFixed(2), '0.00');
  setText('pWO', fmtIN(D15), '0');
  setText('pPLImpact', fmtIN(plImpact), '0');
  setText('pTotalSacrifice', fmtIN(totalSacrifice), '0');
});
