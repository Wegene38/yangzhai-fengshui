/* ========== 安装到桌面 / 主屏幕 ========== */
(function () {
  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // 轻提示(样式内联注入,三个页面通用)
  function toast(html, ms) {
    document.getElementById('yz-install-toast')?.remove();
    const style = document.createElement('style');
    style.textContent = `
      .yz-toast{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);
        max-width:min(420px,90vw);background:#2b2620;color:#f7f1e3;padding:.9rem 1.2rem;
        border-radius:12px;font-size:.92rem;line-height:1.7;z-index:999;box-shadow:0 8px 26px rgba(0,0,0,.3);}
      .yz-toast b{color:#d4af37}
      .yz-toast .yz-x{float:right;margin-left:.6rem;cursor:pointer;opacity:.7}
    `;
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.className = 'yz-toast';
    el.id = 'yz-install-toast';
    el.innerHTML = `<span class="yz-x" data-x>✕</span>${html}`;
    document.body.appendChild(el);
    el.querySelector('[data-x]').addEventListener('click', () => el.remove());
    if (ms) setTimeout(() => el.remove(), ms);
  }

  const iOSSteps = `
    📲 <b>安装到手机桌面(两步):</b><br/>
    1. 点 Safari 底部中间的 <b>分享按钮</b>(方框加箭头);<br/>
    2. 选 <b>「添加到主屏幕」</b>,确认即可。以后从主屏幕点开,就是全屏 App。
  `;

  function hideButtons() {
    document.querySelectorAll('.install-btn').forEach(b => (b.hidden = true));
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelectorAll('.install-btn').forEach(b => (b.hidden = false));
  });

  window.addEventListener('appinstalled', () => {
    toast('✅ 安装成功!以后从桌面 / 主屏幕打开,就是全屏 App,离线也能用。', 5000);
    hideButtons();
  });

  document.querySelectorAll('.install-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (isStandalone()) {
        toast('你现在已经在 App 模式里啦 🎉');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') hideButtons();
        return;
      }
      if (isIOS()) toast(iOSSteps, 12000);
      else {
        toast(
          '📲 <b>安装方法:</b>点浏览器地址栏右侧的 <b>「⊕ 安装 / 添加到主屏幕」</b>图标,或在菜单里选「安装应用」。',
          10000
        );
      }
    });
  });
})();
