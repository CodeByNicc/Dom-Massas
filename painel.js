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
        audioLiberado = true;
      }).catch(err => {
        console.warn('Não foi possível liberar o áudio:', err);
      });
    } else {
      audioLiberado = true;
    }

  }catch(err){
    console.warn('Erro ao iniciar áudio:', err);
  }
}

function tocarSomNovoPedido(){
  try{
    iniciarAudio();

    if (!audioContext){
      return;
    }

    const agora = audioContext.currentTime;

    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, agora);

    gain1.gain.setValueAtTime(0.0001, agora);
    gain1.gain.exponentialRampToValueAtTime(0.35, agora + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, agora + 0.25);

    osc1.connect(gain1);
    gain1.connect(audioContext.destination);

    osc1.start(agora);
    osc1.stop(agora + 0.25);


    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1175, agora + 0.28);

    gain2.gain.setValueAtTime(0.0001, agora + 0.28);
    gain2.gain.exponentialRampToValueAtTime(0.35, agora + 0.30);
    gain2.gain.exponentialRampToValueAtTime(0.0001, agora + 0.55);

    osc2.connect(gain2);
    gain2.connect(audioContext.destination);

    osc2.start(agora + 0.28);
    osc2.stop(agora + 0.55);

  }catch(err){
    console.warn('Não foi possível tocar o som:', err);
  }
}

document.addEventListener('click', () => {
  iniciarAudio();
}, { passive: true });


let autoRefreshTimer = null;

const pedidosConhecidosPorData = {};

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

    verificarNovosPedidos(pedidos, dataBR);

    renderOrders(pedidos, dataBR);

  }catch(err){
    console.error('Erro ao carregar pedidos:', err);

    listEl.innerHTML =
      `<div class="empty">
        Erro de conexão. Verifique a internet e tente atualizar de novo.
      </div>`;

    summaryEl.textContent = '';
  }
}


function verificarNovosPedidos(pedidos, dataBR){

  const chaveData = dataBR;

  const idsAtuais = new Set(
    pedidos.map(p => String(p.id || p.numero))
  );


  if (!pedidosConhecidosPorData[chaveData]){

    pedidosConhecidosPorData[chaveData] = idsAtuais;

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
      }, 800);
    }
  }


  pedidosConhecidosPorData[chaveData] = idsAtuais;
}


function renderOrders(pedidos, dataBR){
  const listEl = document.getElementById('ordersList');
  const summaryEl = document.getElementById('panelSummary');

  if (pedidos.length === 0){

    listEl.innerHTML =
      `<div class="empty">
        Nenhum pedido em ${dataBR} ainda.
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

          </div>
        `;

      })
      .join('');
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


document.getElementById('dateFilter')
  .addEventListener('change', () => {

    loadOrders();
  });


if (checkAccess()){

  showPanel();

}else{

  showGate();

}