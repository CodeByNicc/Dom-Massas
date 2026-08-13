function checkAccess(){
  return sessionStorage.getItem('painelOk') === '1';
}

function showGate(){
  document.getElementById('gateView').hidden = false;
  document.getElementById('panelView').hidden = true;
}
function showPanel(){
  document.getElementById('gateView').hidden = true;
  document.getElementById('panelView').hidden = false;
  document.getElementById('dateFilter').value = todayInputValue();
  loadOrders();
  startAutoRefresh();
}

function tryUnlock(){
  const val = document.getElementById('gatePin').value.trim();
  const errorEl = document.getElementById('gateError');

  if (!CONFIG.painelPin){
    errorEl.textContent = 'Defina um código em CONFIG.painelPin (arquivo config.js) antes de usar o painel.';
    return;
  }
  if (val === CONFIG.painelPin){
    sessionStorage.setItem('painelOk', '1');
    showPanel();
  } else {
    errorEl.textContent = 'Código incorreto.';
  }
}

function todayInputValue(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateInputToBR(value){
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

let autoRefreshTimer = null;
function startAutoRefresh(){
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(loadOrders, 30000);
}

async function loadOrders(){
  const listEl = document.getElementById('ordersList');
  const summaryEl = document.getElementById('panelSummary');
  const inputVal = document.getElementById('dateFilter').value || todayInputValue();
  const dataBR = dateInputToBR(inputVal);

  if (!CONFIG.orderCounterEndpoint){
    listEl.innerHTML = `<div class="empty">Configure a URL da planilha em CONFIG.orderCounterEndpoint (config.js) primeiro.</div>`;
    summaryEl.textContent = '';
    return;
  }

  try{
    const url = `${CONFIG.orderCounterEndpoint}?listar=1&data=${encodeURIComponent(dataBR)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok){
      listEl.innerHTML = `<div class="empty">Não foi possível carregar os pedidos agora.</div>`;
      summaryEl.textContent = '';
      return;
    }
    renderOrders(data.pedidos || [], dataBR);
  }catch(err){
    console.error('Erro ao carregar pedidos:', err);
    listEl.innerHTML = `<div class="empty">Erro de conexão. Verifique a internet e tente atualizar de novo.</div>`;
    summaryEl.textContent = '';
  }
}

function renderOrders(pedidos, dataBR){
  const listEl = document.getElementById('ordersList');
  const summaryEl = document.getElementById('panelSummary');

  if (pedidos.length === 0){
    listEl.innerHTML = `<div class="empty">Nenhum pedido em ${dataBR} ainda.</div>`;
    summaryEl.textContent = `${dataBR} · 0 pedidos`;
    return;
  }

  const totalDia = pedidos.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  const totalFmt = totalDia.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  summaryEl.textContent = `${dataBR} · ${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} · total ${totalFmt}`;

  listEl.innerHTML = pedidos.slice().reverse().map(p => {
    const totalFmtItem = (parseFloat(p.total) || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    return `
    <div class="order-card">
      <div class="order-num">Nº ${String(p.numero).padStart(3, '0')}</div>
      <div class="order-info">
        <div class="order-cliente">${p.cliente || 'Sem nome'}</div>
        <div class="order-meta">${p.hora} · ${p.pagamento} · ${totalFmtItem}</div>
      </div>
      <a class="order-print" href="comanda.html?pedido=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Imprimir →</a>
    </div>`;
  }).join('');
}

document.getElementById('gateBtn').addEventListener('click', tryUnlock);
document.getElementById('gatePin').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryUnlock();
});
document.getElementById('refreshBtn').addEventListener('click', loadOrders);
document.getElementById('dateFilter').addEventListener('change', loadOrders);

if (checkAccess()){
  showPanel();
} else {
  showGate();
}