function formatBRL(v){
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

async function resolveOrder(){
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('pedido');
  if (!raw) return { error: 'empty' };

  try{
    const decoded = JSON.parse(decodeURIComponent(raw));
    if (decoded && decoded.items) return { order: decoded };
  }catch(e){
  }

  if (!CONFIG.orderCounterEndpoint){
    return { error: 'not-found' };
  }
  try{
    const url = `${CONFIG.orderCounterEndpoint}?id=${encodeURIComponent(raw)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.ok && data.order) return { order: data.order };
    return { error: 'not-found' };
  }catch(err){
    console.error('Falha ao buscar o pedido na planilha:', err);
    return { error: 'fetch-failed' };
  }
}

function renderReceipt(order){
  const root = document.getElementById('receiptRoot');

  if (!order){
    root.innerHTML = `<div class="empty-state">Nenhum pedido encontrado nesse link.</div>`;
    return;
  }

  const date = order.date ? new Date(order.date) : null;
  const dateStr = date
    ? date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
    : `${order.dataFormatada || ''} ${order.hora || ''}`.trim();
  const pedidoLabel = order.numero ? `Pedido Nº ${String(order.numero).padStart(3, '0')}` : `Pedido · ${order.hora || dateStr}`;

  const itemsHtml = order.items.map(i => `
    <div class="receipt-item">
      <div class="line1"><span>${i.qty}x ${i.name}</span><span>${formatBRL(i.unitPrice * i.qty)}</span></div>
      ${i.detail ? `<div class="line-detail">${i.detail}</div>` : ''}
    </div>
  `).join('');

  root.innerHTML = `
    <div class="receipt">
      <div class="receipt-header">
        <div class="receipt-logo">Don Massas</div>
        <div class="receipt-sub">O sabor que você manda</div>
        <div class="receipt-order-num">${pedidoLabel}</div>
        <div class="receipt-meta">${dateStr}</div>
      </div>
      <div class="dash"></div>
      ${itemsHtml}
      <div class="dash"></div>
      <div class="receipt-total"><span>TOTAL</span><span>${formatBRL(order.total)}</span></div>
      <div class="dash"></div>
      <div class="receipt-block">
        <div class="label">Cliente</div>
        <div class="val">${order.customer.name}</div>
      </div>
      <div class="receipt-block">
        <div class="label">Telefone</div>
        <div class="val">${order.customer.phone}</div>
      </div>
      <div class="receipt-block">
        <div class="label">Endereço</div>
        <div class="val">${order.customer.address}${order.customer.bairro ? ' — ' + order.customer.bairro : ''}</div>
      </div>
      ${order.customer.bairro ? `
      <div class="receipt-block">
        <div class="label">Subtotal / Taxa de entrega</div>
        <div class="val">${formatBRL(order.subtotal != null ? order.subtotal : (order.total - taxaEntregaPorBairro(order.customer.bairro)))} + ${formatBRL(order.taxaEntrega != null ? order.taxaEntrega : taxaEntregaPorBairro(order.customer.bairro))}</div>
      </div>` : ''}
      <div class="receipt-block">
        <div class="label">Pagamento</div>
        <div class="val">${order.customer.payment}</div>
      </div>
      ${order.customer.payment === 'Dinheiro' && order.customer.trocoPara ? `
      <div class="receipt-block">
        <div class="label">Troco para</div>
        <div class="val">${formatBRL(order.customer.trocoPara)} ${order.customer.troco > 0 ? '(troco: ' + formatBRL(order.customer.troco) + ')' : '(sem troco)'}</div>
      </div>` : ''}
      ${order.customer.notes ? `
      <div class="receipt-block">
        <div class="label">Observações</div>
        <div class="val">${order.customer.notes}</div>
      </div>` : ''}
      <div class="dash"></div>
      <div class="receipt-footer">Obrigado pelo pedido!</div>
    </div>
  `;
}

function renderError(kind){
  const root = document.getElementById('receiptRoot');
  const messages = {
    'empty': 'Nenhum pedido encontrado nesse link.',
    'not-found': 'Não encontramos esse pedido. O link pode estar incompleto.',
    'fetch-failed': 'Não foi possível carregar esse pedido agora. Verifique sua internet e tente novamente.'
  };
  root.innerHTML = `<div class="empty-state">${messages[kind] || messages['not-found']}</div>`;
}

async function init(){
  const root = document.getElementById('receiptRoot');
  root.innerHTML = `<div class="empty-state">Carregando comanda...</div>`;

  const result = await resolveOrder();
  if (result.error){
    renderError(result.error);
    return;
  }
  renderReceipt(result.order);
}

init();

document.getElementById('printBtn').addEventListener('click', () => window.print());