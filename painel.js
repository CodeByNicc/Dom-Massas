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

// Toca um "toque" de campainha: 3 bipes (padrão sol-si-mi) em sequência.
function tocarToqueCompleto_(inicio){
  const volume = 0.9; // bem mais alto que antes (era 0.35)
  tocarNota_(784, inicio, 0.22, volume);        // sol
  tocarNota_(988, inicio + 0.24, 0.22, volume); // si
  tocarNota_(1319, inicio + 0.48, 0.40, volume);// mi (nota final mais longa, sustenta o alerta)
}

function tocarSomNovoPedido(){
  try{
    iniciarAudio();

    if (!audioContext){
      return;
    }

    const tocarAgora = () => {
      const agora = audioContext.currentTime;
      // Repete o toque 3 vezes, espaçado, pra ficar impossível de não perceber.
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
      }, 4000);
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


if (checkAccess()){

  showPanel();

}else{

  showGate();

}