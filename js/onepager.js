const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/\D/g,'');
const propAmt = qs.get('amt') || '';

async function loadChunk(prefix){
  const r = await fetch(`data/chunks/${prefix}.json`, {cache:'no-store'});
  if (!r.ok) throw new Error(`Chunk not found: data/chunks/${prefix}.json`);
  return r.json();
}

function pos(x){
  const n = Number(String(x ?? '').replace(/,/g,'').trim());
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function fmtIN(x){
  return pos(x).toLocaleString('en-IN', {maximumFractionDigits: 2});
}

function set(id, v){
  const el = document.getElementById(id);
  if (el) el.textContent = v ?? '';
}

function pick(rec, keys){
  for (const k of keys){
    const v = rec?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

window.addEventListener('DOMContentLoaded', async ()=>{
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', ()=> window.print());

  if (!acct){ alert('No account provided'); return; }

  const prefix = acct.slice(0,3);
  const chunk = await loadChunk(prefix);
  const r = chunk[acct];
  if (!r){ alert('Account not found'); return; }

  // RO / Branch
  set('pRO', pick(r, ['Region','RO','Region Name']));
  set('pBranch', pick(r, ['Branch','Branch Name']));

  // Core
  set('pName', pick(r, ['Acct Name','Account Name','NAME']));
  set('pMobile', pick(r, ['Mobile Num','Mobile','Mob No']));
  set('pScheme', pick(r, ['Scheme Code','Scheme']));
  set('pAccount', acct);

  // ✅ Your confirmed headers
  set('pSanctionDate', pick(r, ['Acct Opn Date']));
  set('pSanctionAmt', fmtIN(pick(r, ['Sanct Lim Amount'])));

  // Outstanding / NPA date / Asset
  set('pOutstanding', fmtIN(pick(r, ['O/S Bal','OS Bal','Outstanding'])));
  set('pNpaDate', pick(r, ['NPA Date','NPA Dt','Npa Date','CIF NPA date']));
  set('pAsset', String(pick(r, ['Asset Code 30.09.25','Asset Code'])));

  set('pProvision', fmtIN(pick(r, ['Provision'])));
  set('pUci', fmtIN(pick(r, ['UCI'])));
  set('pUri', fmtIN(pick(r, ['URI'])));

  // Proposed OTS from querystring
  set('pOts', fmtIN(propAmt));

  // ===== Derived (NO NEGATIVE DISPLAY) =====
  const D11 = pos(pick(r, ['O/S Bal','OS Bal','Outstanding']));
  const D17 = pos(propAmt);
  const D14 = pos(pick(r, ['Provision']));
  const D16 = pos(pick(r, ['PL Impact','P/L Impact'])) || 0;

  const otsPct = D11 > 0 ? Math.abs(D17 * 100 / D11) : 0;
  const woAmt = Math.abs(D11 - D17);
  const plImpact = Math.abs(D17 - (D11 - D16 - D14));
  const totalSacrifice = Math.abs(D11 + woAmt - D17);

  set('pOtsPct', otsPct.toFixed(2));
  set('pWO', fmtIN(woAmt));
  set('pPLImpact', fmtIN(plImpact));
  set('pTotalSacrifice', fmtIN(totalSacrifice));
});
