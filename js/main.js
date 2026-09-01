(function () {
  'use strict';

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
})();
