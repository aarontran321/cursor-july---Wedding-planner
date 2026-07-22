const CATS = {
  photographer:   { icon: '📷', label: 'Photographer',   color: '#7c5cbf' },
  venue:          { icon: '🏛️',  label: 'Venue',          color: '#2d7d46' },
  catering:       { icon: '🍽️',  label: 'Catering',       color: '#c25b30' },
  florals:        { icon: '🌸', label: 'Florals',        color: '#c05a8a' },
  attire:         { icon: '👗', label: 'Attire',         color: '#b8860b' },
  cake:           { icon: '🎂', label: 'Cake & Desserts',color: '#9b59b6' },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#2980b9' },
  tableware:      { icon: '🥂', label: 'Tableware',      color: '#6d8a6e' },
  transportation: { icon: '🚗', label: 'Transportation', color: '#2c3e50' },
  stationery:     { icon: '💌', label: 'Stationery',     color: '#c0392b' },
  other:          { icon: '💍', label: 'Vendor',         color: '#c9748e' },
};

// --- Kick off both requests immediately ---

const screenshotP = new Promise(resolve => {
  chrome.runtime.sendMessage({ type: 'CAPTURE' }, res => {
    resolve(res?.ok ? res.dataUrl : null);
  });
});

const pageDataP = new Promise(resolve => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const id = tabs[0]?.id;
    if (!id) return resolve({});
    const timeout = setTimeout(() => resolve({}), 1500);
    chrome.tabs.sendMessage(id, { type: 'GET_DATA' }, res => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) return resolve({});
      resolve(res || {});
    });
  });
});

// --- Phase timeline ---

// Shutter flash
setTimeout(() => {
  document.getElementById('flash').classList.add('flash-go');
}, 160);

// Phase 2: Analyzing (t = 950ms)
setTimeout(async () => {
  const dataUrl = await screenshotP;
  showPhase('analyze');
  const img = document.getElementById('ss-img');
  if (dataUrl) img.src = dataUrl;
}, 950);

// Phase 3: Card (t = 4050ms)
setTimeout(async () => {
  const [dataUrl, data] = await Promise.all([screenshotP, pageDataP]);
  showPhase('card');
  buildCard(data, dataUrl);
}, 4050);

// --- Helpers ---

function showPhase(name) {
  document.querySelectorAll('.phase').forEach(el => el.classList.add('hidden'));
  document.getElementById('p-' + name).classList.remove('hidden');
}

function buildCard(data, screenshot) {
  const { title = '', image = '', domain = '', emails = [], location = '', category = 'other', services = '' } = data;
  const cat = CATS[category] || CATS.other;

  // Image: og:image preferred, fallback to screenshot
  const cardImg = document.getElementById('card-img');
  if (image) {
    cardImg.src = image;
    cardImg.onerror = () => { cardImg.src = screenshot || ''; };
  } else if (screenshot) {
    cardImg.src = screenshot;
  }

  // Category badge
  const badge = document.getElementById('cat-badge');
  badge.textContent = cat.icon + ' ' + cat.label;
  badge.style.background = cat.color;

  // Title
  document.getElementById('card-title').textContent = title || domain || 'Wedding Vendor';

  // Build 3 bullets — mock data
  const bullets = [
    { icon: '📧', text: 'djchelo@santiago.com' },
    { icon: '📍', text: 'Based in Toronto with 10+ years of experience spinning at weddings, semiformals, proms, and private events' },
    { icon: '🎵', text: 'They do weddings, proms, semiformals, corporate events, and birthday parties — full sound & lighting setup included' },
  ];

  const ul = document.getElementById('card-bullets');
  ul.innerHTML = bullets.map(b =>
    '<li><span class="bullet-icon">' + b.icon + '</span><span>' + escHtml(b.text) + '</span></li>'
  ).join('');

  // Supabase save
  document.getElementById('btn-save').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const clip = {
      title:          title || domain || 'Wedding Vendor',
      domain:         domain || null,
      category:       category,
      email:          bullets[0].text,
      location:       bullets[1].text,
      services:       bullets[2].text,
      image_url:      image || null,
      screenshot_url: null,
    };

    const { supabaseUrl, supabaseKey } = await getCredentials();

    if (!supabaseUrl || !supabaseKey) {
      showToast('Open Settings to connect Supabase first.', '#c25b30');
      btn.disabled = false;
      btn.textContent = 'Save to Board';
      return;
    }

    try {
      const res = await fetch(supabaseUrl + '/rest/v1/vendor_clips', {
        method: 'POST',
        headers: {
          'apikey':        supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(clip),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'HTTP ' + res.status);
      }
      showToast('Saved to Supabase!', '#2d7d46');
      btn.textContent = 'Saved!';
    } catch (err) {
      showToast('Error: ' + err.message, '#c25b30');
      btn.disabled = false;
      btn.textContent = 'Save to Board';
    }
  });

  document.getElementById('btn-dismiss').addEventListener('click', () => window.close());
  document.getElementById('btn-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function getCredentials() {
  return new Promise(resolve =>
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], resolve)
  );
}

function showToast(msg, bg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = bg || '#1a1a1a';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
