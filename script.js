const BOX_PRICE = 29.99;
const PROTEIN_EXTRA_PRICE = 5.00;
const ACOMP_EXTRA_PRICE = 3.00;
const MAX_FREE_ACOMP = 5;

const MASSAS = [
  { id: "argolinha", name: "Argolinha" },
  { id: "espaguete", name: "Espaguete", desc: "A tradição" },
  { id: "penne", name: "Penne", desc: "O clássico" },
  { id: "fettuccine", name: "Fettuccine", desc: "Para molhos suculentos" }
];

const MOLHOS = [
  { id: "pomodoro", name: "Pomodoro", desc: "Tomates e manjericão" },
  { id: "branco", name: "Branco", desc: "Creme de queijos" },
  { id: "misto", name: "Misto", desc: "O equilíbrio (rosé)" }
];

const ACOMPANHAMENTOS = [
  { id: "bacon", name: "Bacon em cubos" },
  { id: "calabresa", name: "Calabresa fatiada" },
  { id: "frango", name: "Frango desfiado", extraPrice: 5.00 },
  { id: "presunto", name: "Presunto" },
  { id: "mussarela", name: "Mussarela" },
  { id: "milho", name: "Milho" },
  { id: "azeitona", name: "Azeitona" },
  { id: "tomate", name: "Tomate confit" },
  { id: "alho", name: "Alho frito" },
  { id: "ovo", name: "Ovo de codorna" },
  { id: "camarao", name: "Camarão", extraPrice: 5.00 },
  { id: "cebola", name: "Cebola roxa" }
];

function getAcompExtraPrice(item){
  return item.extraPrice != null ? item.extraPrice : ACOMP_EXTRA_PRICE;
}

const CHEF_SUGGESTIONS = [
  { name: "Don Carbonara", desc: "Linguine, em uma deliciosa emulsão de gemas e parmesão com cubos de bacon e pimenta do reino.", price: 29.99, img: "img/don-carbonara.jpg" },
  { name: "Don Alfredo", desc: "O clássico ultra cremoso à base de manteiga e parmesão, servido com frango desfiado.", price: 29.99, img: "img/don-alfredo.jpg" },
  { name: "Don Gamberi", desc: "Fettuccine envolvido em um delicioso molho de azeite e alho, com camarões, tomate fresco e cebolinho, trazendo um sabor leve e irresistível.", price: 29.99, img: "img/don-gamberi.jpeg" },
  { name: "Don Bolonhesa", desc: "Argolinha envolvida em um delicioso molho pomodoro com tomate italiano pelado e carne moída, finalizada com parmesão.", price: 29.99, img: "img/don-bolonhesa.jpeg" }
];

const BEBIDAS = [
  { name: "Antártica 350ml", price: 6.00 },
  { name: "Coca-Cola 350ml", price: 7.00 },
  { name: "H2O Limoneto", price: 8.00 },
  { name: "Água 500ml", price: 3.00 },
  { name: "Água com gás", price: 4.00 }
];

function toMinutos_(hhmm){
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function agoraNoFusoDaLoja_(){
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Recife',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const mapa = {};
  partes.forEach(p => mapa[p.type] = p.value);
  const diasSemana = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return {
    diaSemana: diasSemana[mapa.weekday],
    minutos: parseInt(mapa.hour, 10) * 60 + parseInt(mapa.minute, 10)
  };
}

function getStoreStatus(){
  const cfg = CONFIG.businessHours;
  const { diaSemana, minutos } = agoraNoFusoDaLoja_();

  if (diaSemana !== cfg.closedWeekday){
    for (const r of cfg.ranges){
      const inicio = toMinutos_(r.start), fim = toMinutos_(r.end);
      if (minutos >= inicio && minutos < fim){
        return { open: true, label: 'Aberto agora', detail: `Fecha às ${r.end}` };
      }
    }
    const proximoHoje = cfg.ranges.find(r => toMinutos_(r.start) > minutos);
    if (proximoHoje){
      return { open: false, label: 'Fechado agora', detail: `Abrimos hoje às ${proximoHoje.start}` };
    }
  }

  let dias = 1;
  let candidato = (diaSemana + 1) % 7;
  while (candidato === cfg.closedWeekday){
    dias++;
    candidato = (candidato + 1) % 7;
  }
  const quando = dias === 1 ? 'amanhã' : `em ${dias} dias`;
  return { open: false, label: 'Fechado agora', detail: `Abrimos ${quando} às ${cfg.ranges[0].start}` };
}

function updateStoreStatusUI(){
  const status = getStoreStatus();
  const el = document.getElementById('storeStatus');
  const labelEl = document.getElementById('storeStatusLabel');
  if (!el || !labelEl) return;

  labelEl.textContent = `${status.label} · ${status.detail}`;
  el.classList.toggle('open', status.open);
  el.classList.toggle('closed', !status.open);
  document.body.classList.toggle('store-closed', !status.open);

  return status.open;
}

let uidCounter = 1;
const cartItems = [];

let builderState = {
  massa: null,
  molho: null,
  acompanhamentos: [],
  proteinaExtra: 0
};

function formatBRL(v){
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function renderBuilder(){
  document.getElementById('massaGrid').innerHTML = MASSAS.map(m => `
    <label class="option-card ${builderState.massa === m.id ? 'selected' : ''}">
      <input type="radio" name="massa" value="${m.id}" data-action="set-massa" data-id="${m.id}" ${builderState.massa === m.id ? 'checked' : ''}>
      <div class="option-check"></div>
      <div class="option-name">${m.name}</div>
      ${m.desc ? `<div class="option-desc">${m.desc}</div>` : ''}
    </label>
  `).join('');

  document.getElementById('molhoGrid').innerHTML = MOLHOS.map(m => `
    <label class="option-card ${builderState.molho === m.id ? 'selected' : ''}">
      <input type="radio" name="molho" value="${m.id}" data-action="set-molho" data-id="${m.id}" ${builderState.molho === m.id ? 'checked' : ''}>
      <div class="option-check"></div>
      <div class="option-name">${m.name}</div>
      <div class="option-desc">${m.desc}</div>
    </label>
  `).join('');

  document.getElementById('acompGrid').innerHTML = ACOMPANHAMENTOS.map(a => {
    const idx = builderState.acompanhamentos.indexOf(a.id);
    const selecionado = idx !== -1;
    const extraPrice = getAcompExtraPrice(a);
    let tagHtml;
    if (selecionado && idx < MAX_FREE_ACOMP){
      tagHtml = `<div class="acomp-tag incluso">Incluso</div>`;
    } else if (selecionado){
      tagHtml = `<div class="acomp-tag extra">+ ${formatBRL(extraPrice)}</div>`;
    } else {
      tagHtml = `<div class="acomp-tag hint">+ ${formatBRL(extraPrice)} se extra</div>`;
    }
    return `
    <label class="option-card ${selecionado ? 'selected' : ''}">
      <input type="checkbox" value="${a.id}" data-action="toggle-acomp" data-id="${a.id}" ${selecionado ? 'checked' : ''}>
      <div class="option-check"></div>
      <div class="option-name">${a.name}</div>
      ${tagHtml}
    </label>
  `;
  }).join('');

  const count = builderState.acompanhamentos.length;
  const extraCount = Math.max(0, count - MAX_FREE_ACOMP);
  const extraTotal = calcAcompExtraTotal();
  document.getElementById('acompCounter').textContent =
    extraCount > 0
      ? `${count} selecionados (${MAX_FREE_ACOMP} inclusos + ${extraCount} extra${extraCount > 1 ? 's' : ''} · + ${formatBRL(extraTotal)})`
      : `${count} de ${MAX_FREE_ACOMP} inclusos selecionados`;

  document.getElementById('proteinaVal').textContent = builderState.proteinaExtra;

  updateBuilderTotal();
}

function setMassa(id){
  builderState.massa = id;
  renderBuilder();
}
function setMolho(id){
  builderState.molho = id;
  renderBuilder();
}
function toggleAcomp(id){
  const idx = builderState.acompanhamentos.indexOf(id);
  if (idx === -1) builderState.acompanhamentos.push(id);
  else builderState.acompanhamentos.splice(idx, 1);
  renderBuilder();
}
function changeProteina(delta){
  builderState.proteinaExtra = Math.max(0, builderState.proteinaExtra + delta);
  renderBuilder();
}

function calcAcompExtraTotal(){
  return builderState.acompanhamentos.reduce((total, id, idx) => {
    if (idx < MAX_FREE_ACOMP) return total;
    const item = ACOMPANHAMENTOS.find(a => a.id === id);
    return total + (item ? getAcompExtraPrice(item) : ACOMP_EXTRA_PRICE);
  }, 0);
}

function calcBuilderTotal(){
  return BOX_PRICE + calcAcompExtraTotal() + builderState.proteinaExtra * PROTEIN_EXTRA_PRICE;
}

function updateBuilderTotal(){
  document.getElementById('builderTotal').textContent = formatBRL(calcBuilderTotal());
  const valid = builderState.massa && builderState.molho && builderState.acompanhamentos.length > 0;
  document.getElementById('addBoxBtn').disabled = !valid;
}

function addBoxToCart(){
  if (!builderState.massa || !builderState.molho || builderState.acompanhamentos.length === 0) return;

  const massaName = MASSAS.find(m => m.id === builderState.massa).name;
  const molhoName = MOLHOS.find(m => m.id === builderState.molho).name;
  const acompNames = builderState.acompanhamentos.map(id => ACOMPANHAMENTOS.find(a => a.id === id).name);

  let detail = `${massaName} · Molho ${molhoName} · ${acompNames.join(', ')}`;
  if (builderState.proteinaExtra > 0) detail += ` · +${builderState.proteinaExtra} Proteína extra`;

  cartItems.push({
    uid: uidCounter++,
    name: "Monte seu Don",
    detail,
    unitPrice: calcBuilderTotal(),
    qty: 1
  });

  builderState = { massa: null, molho: null, acompanhamentos: [], proteinaExtra: 0 };
  renderBuilder();
  renderCart();
  openCart();
}

function renderChefSuggestions(){
  document.getElementById('chefGrid').innerHTML = CHEF_SUGGESTIONS.map(d => `
    <div class="dish-card">
      ${d.img ? `<div class="dish-img"><img src="${d.img}" alt="${d.name}" loading="lazy"></div>` : ''}
      <div class="dish-tag">Sugestão do chef</div>
      <div class="dish-name">${d.name}</div>
      <div class="dish-desc">${d.desc}</div>
      <div class="dish-footer">
        <span class="dish-price">${formatBRL(d.price)}</span>
        <button class="add-btn" data-action="add-simple" data-name="${d.name}" data-price="${d.price}">Adicionar</button>
      </div>
    </div>
  `).join('');
}

function renderBebidas(){
  document.getElementById('bebidasGrid').innerHTML = BEBIDAS.map(b => `
    <div class="dish-card">
      <div class="dish-name">${b.name}</div>
      <div class="dish-footer">
        <span class="dish-price">${formatBRL(b.price)}</span>
        <button class="add-btn" data-action="add-simple" data-name="${b.name}" data-price="${b.price}">Adicionar</button>
      </div>
    </div>
  `).join('');
}

let toastTimer = null;
function showToast(message){
  let toast = document.getElementById('toast');
  if (!toast){
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function bumpCartBadge(){
  const badge = document.getElementById('cartCount');
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
}

function addSimpleItem(name, price, btnEl){
  const existing = cartItems.find(i => i.name === name && !i.detail);
  if (existing){
    existing.qty += 1;
  } else {
    cartItems.push({ uid: uidCounter++, name, detail: "", unitPrice: price, qty: 1 });
  }
  renderCart();
  bumpCartBadge();
  showToast(`✓ ${name} adicionado à comanda`);

  if (btnEl){
    const original = btnEl.textContent;
    btnEl.textContent = 'Adicionado ✓';
    btnEl.classList.add('added');
    btnEl.disabled = true;
    setTimeout(() => {
      btnEl.textContent = original;
      btnEl.classList.remove('added');
      btnEl.disabled = false;
    }, 1100);
  }
}

function changeLineQty(uid, delta){
  const item = cartItems.find(i => i.uid === uid);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0){
    const idx = cartItems.indexOf(item);
    cartItems.splice(idx, 1);
  }
  renderCart();
}
function removeLine(uid){
  const idx = cartItems.findIndex(i => i.uid === uid);
  if (idx !== -1) cartItems.splice(idx, 1);
  renderCart();
}

function cartTotal(){
  return cartItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}
function cartCount(){
  return cartItems.reduce((sum, i) => sum + i.qty, 0);
}

function renderCart(){
  const body = document.getElementById('ticketBody');
  document.getElementById('cartCount').textContent = cartCount();
  document.getElementById('cartTotal').textContent = formatBRL(cartTotal());
  document.getElementById('goToCheckoutBtn').disabled = cartItems.length === 0;

  if (cartItems.length === 0){
    body.innerHTML = `<div class="ticket-empty">— comanda vazia —<br>monte seu Don ou adicione um item</div>`;
    return;
  }

  body.innerHTML = cartItems.map(item => `
    <div class="ticket-line">
      <div>
        <div class="name">${item.name}</div>
        ${item.detail ? `<div class="detail">${item.detail}</div>` : ''}
        <div class="qty-stepper">
          <button data-action="change-qty" data-uid="${item.uid}" data-delta="-1">−</button>
          <span class="qty-val">${item.qty}</span>
          <button data-action="change-qty" data-uid="${item.uid}" data-delta="1">+</button>
        </div>
      </div>
      <div class="line-price">${formatBRL(item.unitPrice * item.qty)}</div>
      <button class="remove-x" data-action="remove-line" data-uid="${item.uid}" title="Remover">✕</button>
    </div>
  `).join('');
}

const cartPanel = document.getElementById('cartPanel');
const overlay = document.getElementById('overlay');
const cartView = document.getElementById('cartView');
const checkoutView = document.getElementById('checkoutView');

function openCart(){
  cartPanel.classList.add('open');
  overlay.classList.add('open');
  showCartView();
}
function closeCart(){
  cartPanel.classList.remove('open');
  overlay.classList.remove('open');
}
function showCartView(){
  cartView.classList.add('view-active');
  checkoutView.classList.remove('view-active');
}
function showCheckoutView(){
  cartView.classList.remove('view-active');
  checkoutView.classList.add('view-active');
  renderSummaryRecap();
  updateTrocoUI();
}

function updateTrocoUI(){
  const trocoField = document.getElementById('trocoField');
  const isDinheiro = document.getElementById('custPayment').value === 'Dinheiro';
  trocoField.hidden = !isDinheiro;

  const info = document.getElementById('trocoInfo');
  if (!isDinheiro){
    info.textContent = '';
    info.className = 'troco-info';
    return;
  }

  const valorDado = parseFloat(document.getElementById('custTrocoPara').value);
  const total = cartTotal();

  if (isNaN(valorDado) || valorDado <= 0){
    info.textContent = '';
    info.className = 'troco-info';
    return;
  }
  if (valorDado < total){
    info.textContent = `Valor menor que o total do pedido (${formatBRL(total)}).`;
    info.className = 'troco-info warn';
    return;
  }
  const troco = valorDado - total;
  info.textContent = troco > 0
    ? `Troco: ${formatBRL(troco)}`
    : 'Sem troco (valor exato).';
  info.className = 'troco-info ok';
}

function getTrocoData(){
  const payment = document.getElementById('custPayment').value;
  if (payment !== 'Dinheiro') return null;
  const valorDado = parseFloat(document.getElementById('custTrocoPara').value);
  if (isNaN(valorDado) || valorDado <= 0) return null;
  const total = cartTotal();
  return { valorDado, troco: Math.max(0, valorDado - total) };
}

function localFallbackOrderInfo(){
  const now = new Date();
  return {
    numero: null, 
    id: null,     
    hora: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  };
}

async function getNextOrderInfo(summary){
  if (!CONFIG.orderCounterEndpoint) return localFallbackOrderInfo();

  try {
    const res = await fetch(CONFIG.orderCounterEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS no Apps Script
      body: JSON.stringify(summary)
    });
    const data = await res.json();
    if (data && data.ok){
      return { numero: data.numero, hora: data.hora, id: data.id || null };
    }
    return localFallbackOrderInfo();
  } catch (err){
    console.error('Não foi possível obter o número do pedido, usando reserva local:', err);
    return localFallbackOrderInfo();
  }
}

function renderSummaryRecap(){
  const lines = cartItems.map(i => `${i.qty}x ${i.name}${i.detail ? ' (' + i.detail + ')' : ''}`);
  document.getElementById('summaryRecap').innerHTML =
    lines.join('<br>') + `<br><strong>Total: ${formatBRL(cartTotal())}</strong>`;
}

async function sendOrderToWhatsapp(){
  const form = document.getElementById('checkoutForm');
  if (!form.reportValidity()) return;

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const payment = document.getElementById('custPayment').value;
  const notes = document.getElementById('custNotes').value.trim();

  const trocoData = getTrocoData();
  if (payment === 'Dinheiro'){
    const valorDadoRaw = parseFloat(document.getElementById('custTrocoPara').value);
    if (isNaN(valorDadoRaw) || valorDadoRaw <= 0){
      alert('Informe o valor que você vai pagar em dinheiro para calcularmos o troco.');
      document.getElementById('custTrocoPara').focus();
      return;
    }
    if (valorDadoRaw < cartTotal()){
      alert(`O valor informado é menor que o total do pedido (${formatBRL(cartTotal())}).`);
      document.getElementById('custTrocoPara').focus();
      return;
    }
  }

  const sendBtn = document.getElementById('sendWhatsBtn');
  const originalBtnText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = 'Gerando pedido...';

  const whatsWindow = window.open('', '_blank');
  if (whatsWindow){
    whatsWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Preparando seu pedido...</title>
        <style>
          body{
            margin:0; height:100vh; display:flex; flex-direction:column;
            align-items:center; justify-content:center; gap:16px;
            background:#7A1018; color:#F7ECD1;
            font-family:'Work Sans', Arial, sans-serif;
          }
          .spinner{
            width:38px; height:38px; border-radius:50%;
            border:4px solid rgba(247,236,209,.3); border-top-color:#F7ECD1;
            animation:girar .8s linear infinite;
          }
          @keyframes girar{ to{ transform:rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div>Preparando seu pedido...</div>
      </body>
      </html>
    `);
    whatsWindow.document.close();
  }

  let orderInfo;
  try {
    orderInfo = await getNextOrderInfo({
      cliente: name,
      telefone: phone,
      endereco: address,
      pagamento: payment,
      total: cartTotal(),
      trocoPara: trocoData ? trocoData.valorDado : null,
      troco: trocoData ? trocoData.troco : null,
      observacoes: notes,
      itens: cartItems.map(i => ({ name: i.name, detail: i.detail, qty: i.qty, unitPrice: i.unitPrice }))
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
  }

  const itemLines = cartItems.map(i => {
    const detailPart = i.detail ? `\n   _${i.detail}_` : '';
    return `• ${i.qty}x ${i.name} — ${formatBRL(i.unitPrice * i.qty)}${detailPart}`;
  }).join('\n');

  const printUrl = new URL('comanda.html', window.location.href);
  let incluirLinkNaMensagem = false;

  if (orderInfo.id){
    printUrl.searchParams.set('pedido', orderInfo.id);
  } else {

    const orderPayload = {
      numero: orderInfo.numero,
      hora: orderInfo.hora,
      items: cartItems.map(i => ({ name: i.name, detail: i.detail, qty: i.qty, unitPrice: i.unitPrice })),
      total: cartTotal(),
      customer: {
        name, phone, address, payment, notes,
        trocoPara: trocoData ? trocoData.valorDado : null,
        troco: trocoData ? trocoData.troco : null
      },
      date: Date.now()
    };
    printUrl.searchParams.set('pedido', encodeURIComponent(JSON.stringify(orderPayload)));
    incluirLinkNaMensagem = true;
  }

  const pedidoLabel = orderInfo.numero ? `Nº ${String(orderInfo.numero).padStart(3, '0')}` : `${orderInfo.hora}`;

  let message = `*Novo pedido — ${CONFIG.restaurantName}*\n`;
  message += `*Pedido ${pedidoLabel}*${orderInfo.numero ? ` · ${orderInfo.hora}` : ''}\n\n`;
  message += `${itemLines}\n\n`;
  message += `*Total: ${formatBRL(cartTotal())}*\n\n`;
  message += `*Cliente:* ${name}\n`;
  message += `*Telefone:* ${phone}\n`;
  message += `*Endereço:* ${address}\n`;
  message += `*Pagamento:* ${payment}\n`;
  if (trocoData){
    message += `*Troco para:* ${formatBRL(trocoData.valorDado)}\n`;
    message += `*Troco:* ${trocoData.troco > 0 ? formatBRL(trocoData.troco) : 'Não precisa'}\n`;
  }
  if (notes) message += `*Obs:* ${notes}\n`;
  if (incluirLinkNaMensagem){
    message += `\n🖨️ Imprimir comanda: ${printUrl.toString()}`;
  }

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;

  if (whatsWindow){
    whatsWindow.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}

function handleClick(e){
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'add-simple'){
    addSimpleItem(el.dataset.name, parseFloat(el.dataset.price), el);
  } else if (action === 'change-qty'){
    changeLineQty(parseInt(el.dataset.uid, 10), parseInt(el.dataset.delta, 10));
  } else if (action === 'remove-line'){
    removeLine(parseInt(el.dataset.uid, 10));
  }
}

function handleChange(e){
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'set-massa'){
    setMassa(el.dataset.id);
  } else if (action === 'set-molho'){
    setMolho(el.dataset.id);
  } else if (action === 'toggle-acomp'){
    toggleAcomp(el.dataset.id);
  }
}

document.getElementById('openCartBtn').addEventListener('click', openCart);
document.getElementById('closeCartBtn').addEventListener('click', closeCart);
document.getElementById('closeCartBtn2').addEventListener('click', closeCart);
document.getElementById('overlay').addEventListener('click', closeCart);
document.getElementById('goToCheckoutBtn').addEventListener('click', showCheckoutView);
document.getElementById('backToCartBtn').addEventListener('click', showCartView);
document.getElementById('sendWhatsBtn').addEventListener('click', sendOrderToWhatsapp);
document.getElementById('custPayment').addEventListener('change', updateTrocoUI);
document.getElementById('custTrocoPara').addEventListener('input', updateTrocoUI);
document.getElementById('addBoxBtn').addEventListener('click', addBoxToCart);
document.getElementById('proteinaMinus').addEventListener('click', () => changeProteina(-1));
document.getElementById('proteinaPlus').addEventListener('click', () => changeProteina(1));

document.getElementById('montar').addEventListener('click', handleClick);
document.getElementById('montar').addEventListener('change', handleChange);
document.getElementById('cardapio').addEventListener('click', handleClick);
document.getElementById('cartPanel').addEventListener('click', handleClick);

renderBuilder();
renderChefSuggestions();
renderBebidas();
renderCart();
showCartView();
updateStoreStatusUI();
setInterval(updateStoreStatusUI, 60000);