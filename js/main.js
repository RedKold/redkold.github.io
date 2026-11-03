(function () {
  'use strict';

  // ---------- 夜间模式 ----------
  var root = document.documentElement;
  function currentTheme() { return root.getAttribute('data-theme') || 'light'; }

  function setToggleIcon(theme) {
    var icon = document.querySelector('#theme-toggle .theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      var label = theme === 'dark' ? '切换日间模式' : '切换夜间模式';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
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
      tocBox.parentElement.classList.add('no-toc');
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

  // Mark the current navigation destination, including paginated archive pages.
  document.querySelectorAll('.site-nav a').forEach(function (link) {
    var path = new URL(link.href).pathname.replace(/\/$/, '');
    var current = location.pathname.replace(/\/$/, '');
    if (path ? (current === path || current.indexOf(path + '/') === 0) : current === '') {
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('.typography table').forEach(function (table) {
    if (table.closest('.highlight')) return;
    var wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', '表格，可横向滚动');
    table.before(wrap);
    wrap.appendChild(table);
  });

  // Native dialog supplies focus trapping and Escape handling.
  function initImageViewer() {
    if (!window.HTMLDialogElement) return;
    var images = [];
    document.querySelectorAll('.typography img, .post-cover img').forEach(function (img) {
      if (img.closest('pre, code') || img.classList.contains('no-zoom')) return;
      var link = img.closest('a');
      // Preserve links that use an image to navigate somewhere else.
      if (link && link.href !== img.src && !/\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(link.href)) return;
      var rawAlt = img.getAttribute('alt') || '';
      var sized = rawAlt.match(/^(.*?)\|(\d+)(?:x(\d+))?$/);
      if (sized) {
        rawAlt = sized[1];
        img.style.maxWidth = Math.min(Number(sized[2]), 2000) + 'px';
        img.style.width = '100%';
      }
      img.alt = rawAlt;
      img.decoding = 'async';
      if (!img.closest('.post-cover')) img.loading = 'lazy';
      var caption = img.title || (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(rawAlt) ? '' : rawAlt);
      var noteTitle = img.closest('.note');
      if (!caption && noteTitle) {
        var title = noteTitle.querySelector('.note-title');
        if (title) caption = title.textContent;
      }
      if (!link) {
        link = document.createElement('a');
        link.href = img.getAttribute('data-original') || img.currentSrc || img.src;
        img.before(link);
        link.appendChild(img);
      }
      link.classList.add('image-link');
      link.setAttribute('aria-label', '放大图片' + (caption ? '：' + caption : ''));
      var index = images.length;
      images.push({ image: img, link: link, caption: caption });
      link.addEventListener('click', function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        open(index);
      });
      if (caption && !img.closest('figure') && link.parentElement.childNodes.length === 1) {
        var label = document.createElement('span');
        label.className = 'image-caption';
        label.textContent = caption;
        // Keep figure-like content valid inside Markdown paragraphs.
        link.after(label);
      }
    });
    if (!images.length) return;
    var dialog = document.createElement('dialog');
    dialog.className = 'image-viewer';
    dialog.setAttribute('aria-label', '图片阅览');
    dialog.innerHTML = '<div class="viewer-toolbar">' +
      '<span class="viewer-counter" aria-live="polite"></span>' +
      '<button type="button" data-action="out" aria-label="缩小">−</button>' +
      '<button type="button" data-action="zoom" aria-label="放大图片">＋</button>' +
      '<button type="button" data-action="reset" aria-label="适应窗口">↺</button>' +
      '<a class="viewer-original" target="_blank" rel="noopener">原图 ↗</a>' +
      '<button type="button" data-action="close" aria-label="关闭图片阅览" autofocus>×</button></div>' +
      '<div class="viewer-stage"><img class="viewer-image" alt="" draggable="false"><span class="viewer-status" role="status"></span></div>' +
      '<button type="button" class="viewer-prev" aria-label="上一张">‹</button>' +
      '<button type="button" class="viewer-next" aria-label="下一张">›</button>' +
      '<div class="viewer-footer"><p class="viewer-caption"></p><p class="viewer-help">方向键切换 · 双击 / 双指缩放 · 拖动查看 · Esc 关闭</p></div>';
    document.body.appendChild(dialog);
    var stage = dialog.querySelector('.viewer-stage');
    var picture = dialog.querySelector('.viewer-image');
    var status = dialog.querySelector('.viewer-status');
    var prev = dialog.querySelector('.viewer-prev');
    var next = dialog.querySelector('.viewer-next');
    var zoomIn = dialog.querySelector('[data-action="zoom"]');
    var zoomOut = dialog.querySelector('[data-action="out"]');
    var index = 0, scale = 1, x = 0, y = 0;
    var savedOverflow = '', opener = null;
    var pointers = new Map(), lastDistance = 0, startX = 0, startY = 0;
    function transform() {
      var maxX = Math.max(0, (picture.offsetWidth * scale - stage.clientWidth) / 2);
      var maxY = Math.max(0, (picture.offsetHeight * scale - stage.clientHeight) / 2);
      x = Math.min(maxX, Math.max(-maxX, x));
      y = Math.min(maxY, Math.max(-maxY, y));
      picture.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
      stage.classList.toggle('is-zoomed', scale > 1);
      zoomIn.disabled = scale >= 5;
      zoomOut.disabled = scale <= 1;
    }
    function zoom(value) { scale = Math.max(1, Math.min(5, value)); transform(); }
    function reset() { scale = 1; x = y = 0; transform(); }
    function show(value) {
      index = (value + images.length) % images.length;
      pointers.clear(); lastDistance = 0;
      var item = images[index];
      status.textContent = '正在载入…';
      picture.style.opacity = '0';
      picture.alt = item.image.alt;
      picture.src = item.link.href;
      dialog.querySelector('.viewer-original').href = item.link.href;
      dialog.querySelector('.viewer-caption').textContent = item.caption;
      dialog.querySelector('.viewer-counter').textContent = (index + 1) + ' / ' + images.length;
      prev.disabled = next.disabled = images.length < 2;
      reset();
    }
    picture.addEventListener('load', function () { status.textContent = ''; picture.style.opacity = '1'; transform(); });
    picture.addEventListener('error', function () { status.textContent = '图片载入失败，可点击「原图」重试'; });
    function open(value) {
      opener = images[value].link;
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      show(value);
    }
    dialog.addEventListener('close', function () {
      document.body.style.overflow = savedOverflow;
      pointers.clear();
      if (opener) opener.focus({ preventScroll: true });
    });
    dialog.querySelector('[data-action="close"]').onclick = function () { dialog.close(); };
    zoomIn.onclick = function () { zoom(scale + .5); };
    zoomOut.onclick = function () { zoom(scale - .5); };
    dialog.querySelector('[data-action="reset"]').onclick = reset;
    prev.onclick = function () { show(index - 1); };
    next.onclick = function () { show(index + 1); };
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') show(index - 1);
      else if (event.key === 'ArrowRight') show(index + 1);
      else if (event.key === '+' || event.key === '=') zoom(scale + .5);
      else if (event.key === '-') zoom(scale - .5);
      else if (event.key === '0') reset();
      else return;
      event.preventDefault();
    });
    stage.addEventListener('dblclick', function () { zoom(scale > 1 ? 1 : 2.5); });
    stage.addEventListener('wheel', function (event) {
      event.preventDefault(); zoom(scale + (event.deltaY < 0 ? .2 : -.2));
    }, { passive: false });
    function distance() {
      var values = Array.from(pointers.values());
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    }
    stage.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture(event.pointerId);
      if (pointers.size === 1) { startX = event.clientX; startY = event.clientY; }
      if (pointers.size === 2) lastDistance = distance();
      stage.classList.toggle('is-dragging', scale > 1);
    });
    stage.addEventListener('pointermove', function (event) {
      var last = pointers.get(event.pointerId);
      if (!last) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        var d = distance();
        if (lastDistance) zoom(scale * d / lastDistance);
        lastDistance = d;
      } else if (scale > 1) {
        x += event.clientX - last.x; y += event.clientY - last.y; transform();
      }
    });
    function release(event) {
      if (!pointers.has(event.pointerId)) return;
      if (event.type === 'pointerup' && pointers.size === 1 && scale === 1 && !lastDistance) {
        var dx = event.clientX - startX, dy = event.clientY - startY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
      }
      pointers.delete(event.pointerId);
      if (!pointers.size) { lastDistance = 0; stage.classList.remove('is-dragging'); }
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    window.addEventListener('resize', function () { if (dialog.open) reset(); });
  }
  initImageViewer();
})();
