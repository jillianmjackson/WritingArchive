// Lamp: click to switch between the two lamp images.
// The choice is remembered across pages.
(function () {
  // To add a sound later, drop a file in assets/audio/ and set the path,
  // relative to the site root, e.g. 'assets/audio/lamp-click.mp3'.
  const LAMP_SOUND = null;
  const STORAGE_KEY = 'lamp-switched';

  const lamp = document.querySelector('.lamp');
  if (lamp) {
    const root = new URL('../../', document.currentScript?.src || location.href);
    const sound = LAMP_SOUND ? new Audio(new URL(LAMP_SOUND, root)) : null;

    const setSwitched = (on) => lamp.setAttribute('aria-pressed', String(on));

    try {
      setSwitched(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch (_) {}

    lamp.addEventListener('click', () => {
      const on = lamp.getAttribute('aria-pressed') !== 'true';
      setSwitched(on);
      try {
        localStorage.setItem(STORAGE_KEY, String(on));
      } catch (_) {}
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    });
  }

  // Share links
  const share = document.querySelector('.share');
  if (share) {
    const url = location.href;
    const title = share.dataset.shareTitle;
    const enc = encodeURIComponent;
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      x: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`,
      email: `mailto:?subject=${enc(title)}&body=${enc(url)}`,
    };
    for (const [key, href] of Object.entries(links)) {
      const el = share.querySelector(`[data-share="${key}"]`);
      if (el) el.href = href;
    }

    const status = share.querySelector('.share-status');
    share.querySelector('[data-share="copy"]')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link copied';
      } catch (_) {
        status.textContent = 'Copy failed';
      }
      setTimeout(() => (status.textContent = ''), 2000);
    });
  }
})();
