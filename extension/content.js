if (!window.__vendorClipper) {
  window.__vendorClipper = true;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'GET_DATA') return;
    sendResponse(scrape());
    return true;
  });

  function scrape() {
    const meta = (sel) => document.querySelector(sel)?.content?.trim() || '';
    const title = meta('meta[property="og:title"]') || document.title.trim();
    const desc  = meta('meta[property="og:description"]') || meta('meta[name="description"]');
    const image = meta('meta[property="og:image"]');
    const domain = location.hostname.replace(/^www\./, '');

    // Emails — scan visible text
    const bodyText = document.body?.innerText || '';
    const emailRe  = /\b[\w.+%-]+@[\w-]+\.[a-z]{2,}\b/gi;
    const emails   = [...new Set(bodyText.match(emailRe) || [])]
      .filter(e => !/noreply|no-reply|example|sentry|amazonaws|wixpress|squarespace/i.test(e));

    // Location from JSON-LD
    let location = '';
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const items = [].concat(JSON.parse(el.textContent));
        for (const item of items) {
          const addr = item.address || item.location?.address;
          if (addr) {
            location = [addr.addressLocality, addr.addressRegion]
              .filter(Boolean).join(', ');
            break;
          }
        }
      } catch (_) {}
      if (location) break;
    }

    // Category from keywords in page text
    const hay = (title + ' ' + desc + ' ' + domain + ' ' + bodyText.slice(0, 2000)).toLowerCase();
    const CATS = [
      ['photographer',   ['photograph', 'studio', 'portrait', 'videograph', 'cinemat']],
      ['venue',          ['venue', 'hall', 'ballroom', 'estate', 'barn', 'garden', 'airbnb', 'vrbo']],
      ['catering',       ['cater', 'cuisine', 'chef', 'buffet', 'food service']],
      ['florals',        ['florist', 'floral', 'flower', 'bouquet', 'centerpiece', 'bloom']],
      ['attire',         ['bridal', 'dress', 'gown', 'tuxedo', 'suit', 'bridesmaid']],
      ['cake',           ['cake', 'bakery', 'pastry', 'dessert table', 'cupcake']],
      ['entertainment',  ['dj ', ' dj,', 'disc jockey', 'band', 'musician', 'photo booth', 'entertainment']],
      ['tableware',      ['cutlery', 'tableware', 'linen', 'china', 'glassware', 'flatware', 'rental']],
      ['transportation', ['limousine', 'limo', 'luxury car', 'vintage car', 'shuttle service']],
      ['stationery',     ['invitation', 'stationery', 'calligraphy', 'save the date', 'escort card']],
    ];
    let category = 'other';
    for (const [cat, kws] of CATS) {
      if (kws.some(k => hay.includes(k))) { category = cat; break; }
    }

    // Services sentence — first sentence of description
    let services = '';
    if (desc) {
      const first = desc.split(/[.!?]/)[0].trim();
      services = first.length > 15 ? first : desc.slice(0, 120);
    }

    return { title, desc, image, domain, emails, location, category, services };
  }
}
