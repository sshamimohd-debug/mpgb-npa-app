const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/\D/g,'');
const propAmt = qs.get('amt') || '';

async function loadChunk(prefix){
  const r = await fetch(`data/chunks/${prefix}.json`);
  if (!r.ok) throw new Error('Chunk not found');
  return r.json();
}

const pos = x => Math.abs(Number(x) || 0);
const fmt = x => pos(x).toLocaleString('en-IN', {maximumFractionDigits:2});

window.addEventListener('DOMContentLoaded', async ()=>{
  const prefix = acct.slice(0,3);
  const data = await loadChunk(prefix);
  const r = data[acct];
  if (!r) return alert('Account not found');

  document.getElementById('pRO').textContent = r['Region'] || '';
  document.getElementById('pBranch').textContent = r['Branch'] || '';
  document.getElementById('pName').textContent = r['Acct Name'] || '';
  document.getElementById('pMobile').textContent = r['Mobile Num'] || '';
  document.getElementById('pScheme').textContent = r['Scheme Code'] || '';
  document.getElementById('pAccount').textContent = acct;
  document.getElementById('pSanctionDate').textContent = r['Acct Opn Date'] || '';
  document.getElementById('pSanctionAmt').textContent = fmt(r['Sanct Lim Amount']);
  document.getElementById('pOutstanding').textContent = fmt(r['O/S Bal']);
  document.getElementById('pNpaDate').textContent = r['NPA Date'] || '';
  document.getElementById('pAsset').textContent = r['Asset Code 30.09.25'] || r['Asset Code'] || '';
  document.getElementById('pProvision').textContent = fmt(r['Provision']);
  document.getElementById('pUci').textContent = fmt(r['UCI']);
  document.getElementById('pUri').textContent = fmt(r['URI']);
  document.getElementById('pOts').textContent = fmt(propAmt);

  const D11 = pos(r['O/S Bal']);
  const D17 = pos(propAmt);
  const D14 = pos(r['Provision']);

  document.getElementById('pOtsPct').textContent =
    D11 ? (D17*100/D11).toFixed(2) : '0.00';

  document.getElementById('pWO').textContent = fmt(D11-D17);
  document.getElementById('pPLImpact').textContent = fmt(D17-(D11-D14));
  document.getElementById('pTotalSacrifice').textContent = fmt(D11+(D11-D17)-D17);
});
