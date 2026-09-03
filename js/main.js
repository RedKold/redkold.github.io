(function () {
  'use strict';

  // ---------- 夜间模式 ----------
  var root = document.documentElement;
  function currentTheme() { return root.getAttribute('data-theme') || 'light'; }

  function setToggleIcon(theme) {
    var icon = document.querySelector('#theme-toggle .theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  }

  function sendGiscusTheme(frame, theme) {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: theme } } }, 'https://giscus.app');
    }
  }

  var giscusTheme = null;
  function applyGiscusTheme(theme) {
    var wrap = document.getElementById('giscus-wrap');
    if (!wrap) return;
    var light = wrap.getAttribute('data-light') || 'light';
    var dark = wrap.getAttribute('data-dark') || 'dark';
    giscusTheme = theme === 'dark' ? dark : light;
    var script = wrap.querySelector('script[src*="giscus.app"]');
    if (script) script.setAttribute('data-theme', giscusTheme);
    sendGiscusTheme(wrap.querySelector('iframe'), giscusTheme);
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('ink-theme', theme); } catch (e) { /* 忽略无痕模式限制 */ }
    setToggleIcon(theme);
    applyGiscusTheme(theme);
  }

  function initTheme() {
    setToggleIcon(currentTheme());
    applyGiscusTheme(currentTheme());
    // 若 URL 指定了 theme，则以此为准并写入偏好
    var q = new URLSearchParams(location.search).get('theme');
    if (q === 'dark' || q === 'light') applyTheme(q);

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }

    // 监听 giscus iframe 挂载后同步主题
    var wrap = document.getElementById('giscus-wrap');
    if (wrap && 'MutationObserver' in window) {
      var obs = new MutationObserver(function () {
        var frame = wrap.querySelector('iframe');
        if (frame && giscusTheme && !frame.__giscusThemeBound) {
          frame.__giscusThemeBound = true;
          sendGiscusTheme(frame, giscusTheme);
          frame.addEventListener('load', function () { sendGiscusTheme(frame, giscusTheme); });
        }
      });
      obs.observe(wrap, { childList: true, subtree: true });
    }
    window.addEventListener('load', function () { applyGiscusTheme(currentTheme()); });
  }

  initTheme();

  // 目录：从正文 h2/h3 生成，带滚动高亮
  var tocList = document.getElementById('toc-list');
  var content = document.getElementById('post-content');
  var tocBox = document.getElementById('toc');

  if (tocList && content) {
    var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3'));
    if (headings.length) {
      var items = [];
      headings.forEach(function (h, i) {
        if (!h.id) h.id = 'heading-' + (i + 1);
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        if (h.tagName === 'H3') li.className = 'toc-sub';
        li.appendChild(a);
        tocList.appendChild(li);
        items.push({ li: li, h: h });
      });

      var current = null;
      function onScroll() {
        var pos = window.scrollY + 140;
        var active = null;
        items.forEach(function (item) {
          if (item.h.getBoundingClientRect().top + window.scrollY <= pos) active = item;
        });
        if (active !== current) {
          if (current) current.li.classList.remove('active');
          if (active) active.li.classList.add('active');
          current = active;
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } else if (tocBox) {
      tocBox.style.display = 'none';
    }
  } else if (tocBox) {
    tocBox.style.display = 'none';
  }

  // 回到顶部
  var btn = document.getElementById('back-top');
  if (btn) {
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- 代码复制 ----------
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  function initCopyButtons() {
    var postContent = document.querySelector('.post-content');
    if (!postContent) return;

    var targets = Array.prototype.slice.call(postContent.querySelectorAll('.highlight'));
    postContent.querySelectorAll('pre').forEach(function (p) {
      if (!p.closest('.highlight')) targets.push(p);
    });

    targets.forEach(function (el) {
      if (el.parentElement && el.parentElement.classList.contains('code-wrap')) return;

      var wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      el.parentNode.replaceChild(wrap, el);
      wrap.appendChild(el);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', '复制代码');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"></rect>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
        '<span class="copy-label">复制</span>';

      var codeEl = el.tagName === 'PRE' ? el : (el.querySelector('td.code') || el.querySelector('pre') || el);
      btn.addEventListener('click', function () {
        var text = (codeEl.innerText || '').replace(/\n+$/, '');
        if (!text) return;
        copyText(text).then(function () {
          btn.classList.add('copied');
          btn.querySelector('.copy-label').textContent = '已复制';
          setTimeout(function () {
            btn.classList.remove('copied');
            btn.querySelector('.copy-label').textContent = '复制';
          }, 1600);
        });
      });

      wrap.appendChild(btn);
    });
  }

  initCopyButtons();
})();
