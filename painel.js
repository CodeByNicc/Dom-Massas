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

  iniciarAudio();
  atualizarAvisoSom();

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

    iniciarAudio();

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

async function excluirPedidoRemoto(id){
  const url = `${CONFIG.orderCounterEndpoint}?excluir=${encodeURIComponent(id)}`;
  const res = await fetch(url);
  return res.json();
}

async function restaurarPedidoRemoto(id){
  const url = `${CONFIG.orderCounterEndpoint}?restaurar=${encodeURIComponent(id)}`;
  const res = await fetch(url);
  return res.json();
}

let audioContext = null;
let audioLiberado = false;

function iniciarAudio(){
  try{
    if (!audioContext){
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass){
        console.warn('Este navegador não suporta Web Audio API.');
        return;
      }

      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended'){
      audioContext.resume().then(() => {
        audioLiberado = (audioContext.state === 'running');
        atualizarAvisoSom();
      }).catch(err => {
        console.warn('Não foi possível liberar o áudio:', err);
        atualizarAvisoSom();
      });
    } else {
      audioLiberado = true;
      atualizarAvisoSom();
    }

  }catch(err){
    console.warn('Erro ao iniciar áudio:', err);
    atualizarAvisoSom();
  }
}

function atualizarAvisoSom(){
  const aviso = document.getElementById('somAviso');
  if (!aviso) return;
  const liberado = !!audioContext && audioContext.state === 'running';
  aviso.textContent = liberado
    ? '🔔 Testar som de alerta'
    : '🔔 Toque aqui para ativar o som de alerta de novos pedidos';
  aviso.classList.toggle('ativo', liberado);
}

function tocarNota_(freq, inicio, duracao, volume){
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'square'; 
  osc.frequency.setValueAtTime(freq, inicio);

  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(volume, inicio + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

function tocarToqueCompleto_(inicio){
  const volume = 0.9; 
  tocarNota_(784, inicio, 0.22, volume);        
  tocarNota_(988, inicio + 0.24, 0.22, volume); 
  tocarNota_(1319, inicio + 0.48, 0.40, volume);
}

function tocarSomNovoPedido(){
  try{
    iniciarAudio();

    if (!audioContext){
      return;
    }

    const tocarAgora = () => {
      const agora = audioContext.currentTime;
      tocarToqueCompleto_(agora);
      tocarToqueCompleto_(agora + 1.1);
      tocarToqueCompleto_(agora + 2.2);
    };

    if (audioContext.state === 'running'){
      tocarAgora();
    } else {
      audioContext.resume().then(() => {
        atualizarAvisoSom();
        if (audioContext.state === 'running') tocarAgora();
      }).catch(err => {
        console.warn('Áudio ainda bloqueado, toque na tela para liberar:', err);
        atualizarAvisoSom();
      });
    }

  }catch(err){
    console.warn('Não foi possível tocar o som:', err);
  }
}

document.addEventListener('click', () => {
  iniciarAudio();
}, { passive: true });


let autoRefreshTimer = null;

const pedidosConhecidosPorData = {};

let pedidosAtuais = [];
let excluidosAtuais = [];
let dataAtualBR = '';

function startAutoRefresh(){
  if (autoRefreshTimer){
    clearInterval(autoRefreshTimer);
  }

  autoRefreshTimer = setInterval(loadOrders, 10000);
}

async function loadOrders(){
  const listEl = document.getElementById('ordersList');
  const summaryEl = document.getElementById('panelSummary');

  const inputVal =
    document.getElementById('dateFilter').value ||
    todayInputValue();

  const dataBR = dateInputToBR(inputVal);

  if (!CONFIG.orderCounterEndpoint){
    listEl.innerHTML =
      `<div class="empty">
        Configure uma URL em CONFIG.orderCounterEndpoint
        (arquivo config.js) primeiro.
      </div>`;

    summaryEl.textContent = '';
    return;
  }

  try{
    const url =
      `${CONFIG.orderCounterEndpoint}?listar=1&data=${encodeURIComponent(dataBR)}`;

    const res = await fetch(url);

    const data = await res.json();

    if (!data.ok){
      listEl.innerHTML =
        `<div class="empty">
          Não foi possível carregar os pedidos agora.
        </div>`;

      summaryEl.textContent = '';
      return;
    }

    const pedidos = data.pedidos || [];
    const excluidos = data.excluidos || [];

    pedidosAtuais = pedidos;
    excluidosAtuais = excluidos;
    dataAtualBR = dataBR;

    verificarNovosPedidos(pedidos, excluidos, dataBR);

    renderOrders(pedidos, excluidos, dataBR);

  }catch(err){
    console.error('Erro ao carregar pedidos:', err);

    listEl.innerHTML =
      `<div class="empty">
        Erro de conexão. Verifique a internet e tente atualizar de novo.
      </div>`;

    summaryEl.textContent = '';
  }
}


function verificarNovosPedidos(pedidos, excluidos, dataBR){

  const chaveData = dataBR;

  const idsAtivos = new Set(
    pedidos.map(p => String(p.id || p.numero))
  );

  const idsTodos = new Set([
    ...idsAtivos,
    ...excluidos.map(p => String(p.id || p.numero))
  ]);


  if (!pedidosConhecidosPorData[chaveData]){

    pedidosConhecidosPorData[chaveData] = idsTodos;

    return;
  }


  const pedidosConhecidos =
    pedidosConhecidosPorData[chaveData];

  const pedidosNovos = pedidos.filter(p => {

    const id = String(p.id || p.numero);

    return !pedidosConhecidos.has(id);
  });

  if (pedidosNovos.length > 0){

    console.log(
      `🔔 ${pedidosNovos.length} novo(s) pedido(s) recebido(s).`,
      pedidosNovos
    );

    tocarSomNovoPedido();

    if (pedidosNovos.length > 1){

      setTimeout(() => {
        tocarSomNovoPedido();
      }, 4000);
    }
  }


  pedidosConhecidosPorData[chaveData] = idsTodos;
}


function renderOrders(pedidos, excluidos, dataBR){
  const listEl = document.getElementById('ordersList');
  const summaryEl = document.getElementById('panelSummary');

  renderHistoricoExcluidos(excluidos, dataBR);

  if (pedidos.length === 0){

    listEl.innerHTML =
      `<div class="empty">
        ${excluidos.length > 0 ? 'Todos os pedidos desse dia foram excluídos.' : `Nenhum pedido em ${dataBR} ainda.`}
      </div>`;

    summaryEl.textContent =
      `${dataBR} · 0 pedidos`;

    return;
  }


  const totalDia = pedidos.reduce(
    (sum, p) => sum + (parseFloat(p.total) || 0),
    0
  );

  const totalFmt =
    totalDia.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );

  summaryEl.textContent =
    `${dataBR} · ${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} · total ${totalFmt}`;


  listEl.innerHTML =
    pedidos
      .slice()
      .reverse()
      .map(p => {

        const totalFmtItem =
          (parseFloat(p.total) || 0)
            .toLocaleString(
              'pt-BR',
              {
                style: 'currency',
                currency: 'BRL'
              }
            );

        const idPedido = String(p.id || p.numero);

        return `
          <div class="order-card">

            <div class="order-num">
              Nº ${String(p.numero).padStart(3, '0')}
            </div>

            <div class="order-info">

              <div class="order-cliente">
                ${p.cliente || 'Sem nome'}
              </div>

              <div class="order-meta">
                ${p.hora} · ${p.pagamento} · ${totalFmtItem}
              </div>

            </div>

            <a
              class="order-print"
              href="comanda.html?pedido=${encodeURIComponent(p.id)}"
              target="_blank"
              rel="noopener"
            >
              Imprimir →
            </a>

            <button
              class="order-delete"
              data-action="excluir-pedido"
              data-id="${idPedido}"
              title="Excluir pedido"
            >
              🗑️
            </button>

          </div>
        `;

      })
      .join('');
}

function renderHistoricoExcluidos(excluidos, dataBR){
  const wrap = document.getElementById('historicoExcluidos');
  const listEl = document.getElementById('historicoExcluidosList');
  const toggleBtn = document.getElementById('historicoExcluidosToggle');
  if (!wrap || !listEl || !toggleBtn) return;

  if (!excluidos || excluidos.length === 0){
    wrap.hidden = true;
    listEl.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  toggleBtn.textContent = `🗑️ Pedidos excluídos em ${dataBR} (${excluidos.length})`;

  const ordenados = excluidos.slice().sort((a, b) => b.numero - a.numero);

  listEl.innerHTML = ordenados.map(p => {
    const totalFmt = (parseFloat(p.total) || 0)
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `
      <div class="order-card excluido">
        <div class="order-num">Nº ${String(p.numero).padStart(3, '0')}</div>
        <div class="order-info">
          <div class="order-cliente">${p.cliente || 'Sem nome'}</div>
          <div class="order-meta">${p.hora} · ${p.pagamento} · ${totalFmt}</div>
        </div>
        <button
          class="order-restore"
          data-action="restaurar-pedido"
          data-id="${String(p.id || p.numero)}"
          title="Restaurar pedido"
        >
          ↺ Restaurar
        </button>
      </div>
    `;
  }).join('');
}

document.getElementById('gateBtn')
  .addEventListener('click', tryUnlock);

document.getElementById('gatePin')
  .addEventListener('keydown', e => {

    if (e.key === 'Enter'){
      tryUnlock();
    }

  });


document.getElementById('refreshBtn')
  .addEventListener('click', () => {

    iniciarAudio();

    loadOrders();
  });

document.getElementById('somAviso')
  .addEventListener('click', () => {
    iniciarAudio();
    setTimeout(() => {
      tocarSomNovoPedido();
    }, 150);
  });


document.getElementById('dateFilter')
  .addEventListener('change', () => {

    loadOrders();
  });


document.getElementById('ordersList')
  .addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="excluir-pedido"]');
    if (!btn) return;

    const id = btn.dataset.id;
    const pedido = pedidosAtuais.find(p => String(p.id || p.numero) === id);
    if (!pedido) return;

    const confirmado = confirm(
      `Excluir o pedido Nº ${String(pedido.numero).padStart(3, '0')} (${pedido.cliente || 'sem nome'})?\n\n` +
      `Ele vai sumir da lista e não vai entrar no total do dia. Você pode restaurar depois pelo histórico de excluídos.`
    );
    if (!confirmado) return;

    btn.disabled = true;
    btn.textContent = '…';

    try {
      const resultado = await excluirPedidoRemoto(id);
      if (!resultado.ok){
        alert('Não foi possível excluir o pedido agora. Tente de novo em instantes.');
        btn.disabled = false;
        btn.textContent = '🗑️';
        return;
      }
      await loadOrders();
    } catch (err){
      console.error('Erro ao excluir pedido:', err);
      alert('Erro de conexão ao excluir o pedido. Tente de novo.');
      btn.disabled = false;
      btn.textContent = '🗑️';
    }
  });

document.getElementById('historicoExcluidosList')
  .addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="restaurar-pedido"]');
    if (!btn) return;

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Restaurando…';

    try {
      const resultado = await restaurarPedidoRemoto(btn.dataset.id);
      if (!resultado.ok){
        alert('Não foi possível restaurar o pedido agora. Tente de novo em instantes.');
        btn.disabled = false;
        btn.textContent = textoOriginal;
        return;
      }
      await loadOrders();
    } catch (err){
      console.error('Erro ao restaurar pedido:', err);
      alert('Erro de conexão ao restaurar o pedido. Tente de novo.');
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });

document.getElementById('historicoExcluidosToggle')
  .addEventListener('click', () => {
    const listEl = document.getElementById('historicoExcluidosList');
    listEl.hidden = !listEl.hidden;
  });


if (checkAccess()){

  showPanel();

}else{

  showGate();

}