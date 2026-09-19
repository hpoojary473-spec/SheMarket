const adminCharts = {};

document.addEventListener('DOMContentLoaded', () => {
  runAdminPage();
});

window.addEventListener('shemarket:languagechange', () => {
  runAdminPage();
});

function runAdminPage() {
  const page = document.body.dataset.page;

  if (page?.startsWith('admin') || page === 'shg-dashboard' || page === 'seller-management' || page === 'reports') {
    const user = SheMarket.requireAuth(['admin']);
    if (!user) return;
  }

  const handlers = {
    'shg-dashboard': loadShgDashboard,
    'seller-management': loadSellerManagement,
    reports: loadReports,
    'admin-orders': loadAdminOrders
  };

  handlers[page]?.();
}

async function loadShgDashboard() {
  try {
    const data = await SheMarket.request('/api/dashboard/admin');
    setAdminText('admin-products', data.totalProducts);
    setAdminText('admin-sellers', data.totalSellers);
    setAdminText('admin-revenue', SheMarket.formatCurrency(data.revenue));

    const groups = data.groups || [];
    const groupNode = document.querySelector('#shg-groups');
    groupNode.innerHTML = groups.length
      ? groups.map((group) => `
        <div class="panel shg-group-card">
          <span class="tag">${SheMarket.t('adminPortal')}</span>
          <h2>${SheMarket.escapeHtml(group.name)}</h2>
          <p class="muted">${SheMarket.escapeHtml(group.location || '')}</p>
          <p><strong>${group.members?.length || 0}</strong> ${SheMarket.translatePhrase('members')} &middot; <strong>${group.products?.length || 0}</strong> ${SheMarket.t('products')}</p>
        </div>
      `).join('')
      : '<div class="empty-state">No SHG groups created yet. Add them from MySQL or an admin import later.</div>';
    SheMarket.translateStaticText(document.querySelector('.app-main'));
  } catch (error) {
    SheMarket.toast(error.message, 'error');
  }
}

async function loadSellerManagement() {
  const body = document.querySelector('#seller-management-body');
  if (!body) return;

  async function refresh() {
    try {
      const sellers = await SheMarket.request('/api/admin/sellers');
      body.innerHTML = sellers.length
        ? sellers.map((seller) => `
          <tr>
            <td>${SheMarket.escapeHtml(seller.name)}</td>
            <td>${SheMarket.escapeHtml(seller.email)}</td>
            <td>${SheMarket.escapeHtml(SheMarket.normalizeLanguage(seller.language || 'English'))}</td>
            <td><span class="status ${seller.is_approved ? 'delivered' : ''}">${seller.is_approved ? SheMarket.translatePhrase('Approved') : SheMarket.translatePhrase('Pending')}</span></td>
            <td>
              ${seller.is_approved
                ? `<span class="muted">${SheMarket.translatePhrase('Ready to sell')}</span>`
                : `<button class="btn btn-small btn-primary" data-approve="${seller._id}">${SheMarket.translatePhrase('Approve')}</button>`}
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="5">No sellers registered yet.</td></tr>';
      SheMarket.translateStaticText(body);

      body.querySelectorAll('[data-approve]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await SheMarket.request(`/api/admin/sellers/${button.dataset.approve}/approve`, {
              method: 'PUT',
              body: {}
            });
            SheMarket.toast('Seller approved.', 'success');
            refresh();
          } catch (error) {
            SheMarket.toast(error.message, 'error');
          }
        });
      });
    } catch (error) {
      body.innerHTML = '<tr><td colspan="5">Unable to load sellers.</td></tr>';
      SheMarket.toast(error.message, 'error');
    }
  }

  refresh();
}

async function loadReports() {
  try {
    const data = await SheMarket.request('/api/dashboard/admin');
    const categories = {};
    data.products.forEach((product) => {
      const label = SheMarket.localizeCategory(product.category);
      categories[label] = (categories[label] || 0) + 1;
    });

    renderAdminChart(
      'category-report-chart',
      'doughnut',
      Object.keys(categories).length ? Object.keys(categories) : ['Textiles', 'Food', 'Handicrafts'].map((item) => SheMarket.localizeCategory(item)),
      Object.keys(categories).length ? Object.values(categories) : [8, 5, 6],
      SheMarket.translatePhrase('Products by Category')
    );

    const orderStatuses = {};
    data.orders.forEach((order) => {
      const status = SheMarket.translatePhrase(order.status);
      orderStatuses[status] = (orderStatuses[status] || 0) + 1;
    });

    renderAdminChart(
      'orders-report-chart',
      'bar',
      Object.keys(orderStatuses).length ? Object.keys(orderStatuses) : ['Pending', 'Shipped', 'Delivered'].map((item) => SheMarket.translatePhrase(item)),
      Object.keys(orderStatuses).length ? Object.values(orderStatuses) : [4, 6, 10],
      SheMarket.translatePhrase('Orders by Status')
    );
    SheMarket.translateStaticText(document.querySelector('.app-main'));
  } catch (error) {
    SheMarket.toast(error.message, 'error');
  }
}

function renderAdminChart(canvasId, type, labels, values, label) {
  function tryRender(attempt) {
    if (!window.Chart) {
      if (attempt < 20) setTimeout(() => tryRender(attempt + 1), 100);
      return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (adminCharts[canvasId]) adminCharts[canvasId].destroy();

    const palette = ['#F4A300', '#C15A2B', '#5F7F3A', '#244B5A', '#A64253', '#E8C84A', '#7A6655', '#3B1F0C'];
    const bgColors = labels.map((_, index) => palette[index % palette.length]);

    adminCharts[canvasId] = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: bgColors,
            borderColor: '#FDF6EC',
            borderWidth: 2,
            borderRadius: type === 'bar' ? 8 : 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: type === 'doughnut' ? 'bottom' : 'top' },
          tooltip: { backgroundColor: '#3B1F0C', padding: 12 }
        },
        scales: type === 'bar'
          ? {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(236,221,203,0.72)' }
            },
            x: { grid: { display: false } }
          }
          : {}
      }
    });
  }

  tryRender(0);
}

async function loadAdminOrders() {
  const body = document.querySelector('#admin-orders-body');
  if (!body) return;

  body.innerHTML = '<tr><td colspan="7"><div class="skeleton-line"></div></td></tr>';

  try {
    const orders = await SheMarket.request('/api/orders');
    body.innerHTML = orders.length
      ? orders.map((order) => adminOrderRow(order)).join('')
      : '<tr><td colspan="7">No orders yet.</td></tr>';
    SheMarket.translateStaticText(body);

    body.querySelectorAll('[data-admin-status-order]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await SheMarket.request(`/api/orders/${select.dataset.adminStatusOrder}/status`, {
            method: 'PUT',
            body: { status: select.value }
          });
          SheMarket.toast('Order status updated.', 'success');
          loadAdminOrders();
        } catch (error) {
          SheMarket.toast(error.message, 'error');
        }
      });
    });
  } catch (error) {
    body.innerHTML = '<tr><td colspan="7">Unable to load orders.</td></tr>';
    SheMarket.toast(error.message, 'error');
  }
}

function adminOrderRow(order) {
  const product = SheMarket.localizeProduct(order.product_id || {});
  const pickupStatuses = ['Confirmed', 'Ready for Pickup', 'Picked Up'];
  const deliveryStatuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
  const statuses = order.isPickup ? pickupStatuses : deliveryStatuses;
  const statusClass = String(order.status || '').toLowerCase().replace(/\s+/g, '-');

  return `
    <tr>
      <td>${SheMarket.escapeHtml(product.display_name || 'Product')} ${order.isPickup ? '<span class="tag">PICKUP</span>' : ''}</td>
      <td>${SheMarket.escapeHtml(order.buyer_id?.name || '-')}</td>
      <td>${SheMarket.escapeHtml(order.seller_id?.name || '-')}</td>
      <td>${order.quantity || 1}</td>
      <td>${SheMarket.formatCurrency(order.total_price)}</td>
      <td><span class="status ${statusClass}">${SheMarket.escapeHtml(SheMarket.translatePhrase(order.status || 'Pending'))}</span></td>
      <td>
        <select data-admin-status-order="${SheMarket.escapeHtml(order._id)}" aria-label="Update order status">
          ${statuses.map((status) => `
            <option value="${status}" ${status === order.status ? 'selected' : ''}>${SheMarket.escapeHtml(SheMarket.translatePhrase(status))}</option>
          `).join('')}
        </select>
      </td>
    </tr>
  `;
}

function setAdminText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}
