const urlInput = document.getElementById('url');
const keyInput = document.getElementById('key');
const status   = document.getElementById('status');

// Load saved credentials on open
chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], ({ supabaseUrl, supabaseKey }) => {
  if (supabaseUrl) urlInput.value = supabaseUrl;
  if (supabaseKey) keyInput.value = supabaseKey;
  if (supabaseUrl && supabaseKey) setStatus('Connected', 'ok');
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const url = urlInput.value.trim().replace(/\/$/, '');
  const key = keyInput.value.trim();

  if (!url || !key) {
    setStatus('Both fields are required.', 'err');
    return;
  }
  if (!url.startsWith('https://')) {
    setStatus('URL must start with https://', 'err');
    return;
  }

  setStatus('Testing connection...', '');

  try {
    // Ping the vendor_clips table to verify credentials work
    const res = await fetch(url + '/rest/v1/vendor_clips?limit=1', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'HTTP ' + res.status);
    }
    chrome.storage.local.set({ supabaseUrl: url, supabaseKey: key }, () => {
      setStatus('Connected and saved!', 'ok');
    });
  } catch (err) {
    setStatus('Connection failed: ' + err.message, 'err');
  }
});

function setStatus(msg, type) {
  status.textContent = msg;
  status.className = type === 'ok' ? 'status-ok' : type === 'err' ? 'status-err' : '';
}
