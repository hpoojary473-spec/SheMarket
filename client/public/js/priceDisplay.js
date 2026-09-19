const PRICE_PANEL_ID = 'price-intelligence-result';

function formatMoney(value, formatter) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof formatter === 'function') return formatter(value);
  return `INR ${Number(value || 0).toFixed(0)}`;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function ensureStyles() {
  if (document.querySelector('[data-price-intelligence-styles]')) return;
  const style = document.createElement('style');
  style.dataset.priceIntelligenceStyles = 'true';
  style.textContent = `
    .price-intelligence-result {
      margin-top: 0.65rem;
      display: grid;
      gap: 0.45rem;
      color: var(--text-muted, #6b5f57);
      font-size: 0.9rem;
    }
    .price-intelligence-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }
    .price-demand-badge,
    .price-festival-tag {
      display: inline-flex;
      align-items: center;
      min-height: 1.45rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      background: rgba(140, 76, 42, 0.12);
      color: var(--terracotta, #8c4c2a);
    }
    .price-confidence-track {
      width: min(220px, 100%);
      height: 0.45rem;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(140, 76, 42, 0.16);
    }
    .price-confidence-fill {
      height: 100%;
      border-radius: inherit;
      background: var(--terracotta, #8c4c2a);
    }
  `;
  document.head.appendChild(style);
}

function renderPricePrediction(data, options = {}) {
  const input = document.querySelector('#recommended_price');
  if (!input || !data) return;

  ensureStyles();

  const field = input.closest('.field') || input.parentElement;
  if (!field) return;

  let panel = document.querySelector(`#${PRICE_PANEL_ID}`);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PRICE_PANEL_ID;
    panel.className = 'price-intelligence-result';
    panel.setAttribute('aria-live', 'polite');
    field.appendChild(panel);
  }

  const confidence = clampConfidence(data.confidence_score || 0.35);
  const demandLevel = String(data.demand_level || 'LOW').toUpperCase();
  const marketAverage = formatMoney(data.market_average, options.formatCurrency);

  panel.replaceChildren();

  const row = document.createElement('div');
  row.className = 'price-intelligence-row';

  const demand = document.createElement('span');
  demand.className = 'price-demand-badge';
  demand.textContent = `Demand ${demandLevel}`;
  row.appendChild(demand);

  if (data.seasonal_adjustment && data.festival) {
    const festival = document.createElement('span');
    festival.className = 'price-festival-tag';
    festival.textContent = data.festival;
    row.appendChild(festival);
  }

  const market = document.createElement('span');
  market.title = 'Average price from similar products in the marketplace; used to compare your cost with current selling prices.';
  market.textContent = marketAverage
    ? `Market average for similar products: ${marketAverage}`
    : 'Market average for similar products: not enough data yet';

  const confidenceLabel = document.createElement('span');
  confidenceLabel.title = 'Confidence shows how much real marketplace, demand, regional, and festival data was available for this suggestion.';
  confidenceLabel.textContent = `Confidence in suggestion: ${Math.round(confidence * 100)}%`;

  const track = document.createElement('div');
  track.className = 'price-confidence-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(Math.round(confidence * 100)));

  const fill = document.createElement('div');
  fill.className = 'price-confidence-fill';
  fill.style.width = `${Math.round(confidence * 100)}%`;
  track.appendChild(fill);

  panel.append(row, market, confidenceLabel, track);
}

window.SheMarketPriceDisplay = { render: renderPricePrediction };

export { renderPricePrediction };
