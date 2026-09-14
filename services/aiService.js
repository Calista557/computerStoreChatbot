export async function extractSearchCriteria(customerMessage) {
  const text = customerMessage.toLowerCase();
  const criteria = {};

  // Category
  if (text.includes('desktop') || text.includes('computer')) {
    criteria.category = 'desktop';
  }
  if (text.includes('laptop')) {
    criteria.category = 'laptop';
  }
  if (text.includes('all in one') || text.includes('all-in-one') || text.includes('aio')) {
    criteria.category = 'all-in-one';
  }
  if (text.includes('monitor') || text.includes('screen')) {
    criteria.category = 'monitor';
  }
  if (text.includes('graphics card') || text.includes('graphic card') || text.includes('gpu')) {
    criteria.category = 'gpu';
  }
  if (text.includes('server')) {
    criteria.category = 'server';
  }
  if (text.includes('standalone')) {
    criteria.category = 'standalone-system';
  }
  if (text.includes('thin client')) {
    criteria.category = 'thin-client';
  }
  if (text.includes('keyboard')) {
    criteria.category = 'keyboard';
  }
  if (text.includes('mouse')) {
    criteria.category = 'mouse';
  }
  if (text.includes('accessory') || text.includes('accessories')) {
    criteria.category = 'accessory';
  }

  // Brand
  if (text.includes('dell')) criteria.brand = 'Dell';
  if (text.includes('hp')) criteria.brand = 'HP';

  // RAM -- allow "8gb ram" or "8gb of ram"
  const ramMatch = text.match(/(\d+)\s*gb\s*(?:of\s*)?ram/);
  if (ramMatch) criteria.minRam = Number(ramMatch[1]);

  // Storage type
  if (text.includes('nvme')) criteria.storageType = 'NVMe';
  else if (text.includes('ssd')) criteria.storageType = 'SSD';
  else if (text.includes('hdd')) criteria.storageType = 'HDD';

  // Price -- handles "under 100000", "under 100k", "not more than 150,000"
  const maxPriceMatch = text.match(/(?:under|below|less than|not more than|within)\s*(?:₦|ngn|naira)?\s*([\d,]+)\s*(k)?/);
  if (maxPriceMatch) {
    let value = Number(maxPriceMatch[1].replace(/,/g, ''));
    if (maxPriceMatch[2]) value *= 1000; // "100k" -> 100000
    criteria.maxPrice = value;
  }

  const minPriceMatch = text.match(/(?:above|over|more than|at least)\s*(?:₦|ngn|naira)?\s*([\d,]+)\s*(k)?/);
  if (minPriceMatch) {
    let value = Number(minPriceMatch[1].replace(/,/g, ''));
    if (minPriceMatch[2]) value *= 1000;
    criteria.minPrice = value;
  }

  return criteria;
}

export function detectIntent(customerMessage) {
  const text = customerMessage.toLowerCase();

  if (text.includes('buy') || text.includes('purchase') || text.includes('i want it') || text.includes('i will take it')) {
    return 'ready-to-buy';
  }
  if (text.includes('delivery') || text.includes('deliver') || text.includes('ship')) {
    return 'wants-delivery';
  }
  if (
    text.includes('reduce the price') ||
    text.includes('best price') ||
    text.includes('last price') ||
    text.includes('discount') ||
    text.includes('negotiate')
  ) {
    return 'wants-negotiation';
  }
  if (text.includes('warranty') || text.includes('guarantee')) {
    return 'wants-warranty-info';
  }
  if (text.includes('speak to someone') || text.includes('talk to someone') || text.includes('human') || text.includes('staff')) {
    return 'needs-human-help';
  }

  return 'other';
}

export async function generateReply(customerMessage, products) {
  if (products.length === 0) {
    return 'Sorry, I could not find a matching computer in our current inventory. A staff member can check for you.';
  }

  // Describe every real match, not just the first -- an omitted real
  // option is still an inaccurate answer.
  const descriptions = products.slice(0, 3).map((product) => {
    const configuration = Array.isArray(product.configurations)
      ? product.configurations[0]
      : product.configurations;

    if (!configuration) return `${product.name} (${product.condition || 'condition not listed'})`;

    const parts = [
      configuration.ram ? `${configuration.ram}GB RAM` : null,
      configuration.storage ? `${configuration.storage}GB ${configuration.storageType || ''}`.trim() : null,
    ].filter(Boolean);

    const specsText = parts.length ? ` — ${parts.join(', ')}` : '';
    const priceText = configuration.price ? `, ₦${configuration.price.toLocaleString()}` : '';

    return `${product.name}${specsText}${priceText}`;
  });

  const intro = products.length > 1 ? `We have ${products.length} matching options:` : 'Yes, we have this:';
  const more = products.length > 3 ? `\n(and ${products.length - 3} more -- ask if you want to see them all)` : '';

  return `${intro}\n${descriptions.map((d) => `- ${d}`).join('\n')}${more}`;
}