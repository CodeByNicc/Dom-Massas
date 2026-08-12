function formatBRL(v){
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function getOrderFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('pedido');
  if (!raw) return null;
  try{
    return JSON.parse(decodeURIComponent(raw));
  }catch(e){
    return null;
  }
}

function renderReceipt(order){
  const root = document.getElementById('receiptRoot');

  if (!order){
    root.innerHTML = `<div class="empty-state">Nenhum pedido encontrado nesse link.</div>`;
    return;
  }

  const itemsHtml = order.items.map(i => `
    <div class="receipt-item">
      <div class="line1"><span>${i.qty}x ${i.name}</span><span>${formatBRL(i.unitPrice * i.qty)}</span></div>
      ${i.detail ? `<div class="line-detail">${i.detail}</div>` : ''}
    </div>
  `).join('');

  const date = new Date(order.date);
  const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  root.innerHTML = `
    <div class="receipt">
      <div class="receipt-header">
        <div class="receipt-logo">Don Massas</div>
        <div class="receipt-sub">O sabor que você manda</div>
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
        <div class="val">${order.customer.address}</div>
      </div>
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

const order = getOrderFromUrl();
renderReceipt(order);

document.getElementById('printBtn').addEventListener('click', () => window.print());