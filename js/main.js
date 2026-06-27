// ts-banner: scrollTop 阈值控制（向下滚收起、回顶展开）
// bottom-float: 滚动方向控制（向上滑立刻出现、向下滑立刻消失）
// top-stack / filter-region: 虚拟滚动热区，转发 touch/wheel deltaY 给 .scroll
(function () {
  const phone = document.querySelector('.phone');
  if (!phone) return;
  // 滚动容器 = window（模型 A：方便浏览器底栏自动隐藏）
  const getScrollTop = function () { return window.scrollY || document.documentElement.scrollTop || 0; };

  let lastTop = getScrollTop();
  let scrollStopTimer = null;
  window.addEventListener('scroll', function () {
    const t = getScrollTop();
    const delta = t - lastTop;

    // 滑动停止 150ms 后显示 bottom-float
    clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(function () {
      phone.classList.remove('float-hidden');
    }, 150);

    // sticky-bg 在滚动离开顶部后保持显示，回到顶部消失
    if (t > 0) {
      phone.classList.add('scrolled-down');
    } else {
      phone.classList.remove('scrolled-down');
    }

    // banner 收起/展开（位置阈值，迟滞防抖）
    if (t > 8 && !phone.classList.contains('scrolled')) {
      phone.classList.add('scrolled');
    } else if (t <= 4 && phone.classList.contains('scrolled')) {
      phone.classList.remove('scrolled');
    }

    // bottom-float 方向控制（噪声门槛 2px）
    if (Math.abs(delta) > 2) {
      if (delta > 0) {
        phone.classList.add('float-hidden');     // 向下滚 → 隐藏
      } else {
        phone.classList.remove('float-hidden');  // 向上滚 → 显示
      }
    }
    if (t <= 0) phone.classList.remove('float-hidden'); // 顶部强制显示

    // sticky-headers 内容切换：滚动至第二个 bet-substatus-img（未开赛）位置时切换
    const allSubs = document.querySelectorAll('.bet-substatus-img');
    const subEl = allSubs[1] || null;
    if (subEl) {
      const subRect = subEl.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-stack-h'))
                      + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--filter-h'));
      if (subRect.top <= stickyTop) {
        phone.classList.add('show-substatus');
      } else {
        phone.classList.remove('show-substatus');
      }
    }

    lastTop = t;
  }, { passive: true });

  // 模型 A：window 是滚动容器，touch / wheel 自然冒泡，无需转发热区

  // === ribbon 跟随 sb-row 横向滚动 ===
  // ribbon 在 filter-region 顶层独立浮动，初始 left:27px 对齐 MK 体育左上
  // 当 sb-row 横滑时同步 translateX，让 ribbon 视觉上贴着 MK sb-item 移动
  // 当 MK 完全滚出视口（scrollLeft 超过 MK 宽度）则淡出 ribbon
  // === bottom-float .sp 临时点击态适配 H5 浏览器 ===
  // 不是"选中态"——按下时显示玻璃高亮，松开/取消/移出后回到默认态
  // 用 pointer events 统一处理 touch + mouse，避免双绑
  const spList = document.querySelectorAll('.bottom-float .sp');
  spList.forEach(function (sp) {
    const press = function () { sp.classList.add('active'); };
    const release = function () {
      // 延迟 80ms 让进入动画播完再回弹，避免按一下看不到玻璃高亮
      setTimeout(function () { sp.classList.remove('active'); }, 80);
    };
    sp.addEventListener('pointerdown', press);
    ['pointerup', 'pointercancel', 'pointerleave', 'pointerout']
      .forEach(function (ev) { sp.addEventListener(ev, release); });
  });

  // sb-row 重构成"外层胶囊 + 内层滑动"，滚动监听挂在 .sb-row-inner 上
  // ribbon 用 rAF 同步、translate3d + will-change 触发 GPU 合成层，避免延迟
  const sbInner = document.querySelector('.sb-row-inner');
  const ribbon = document.querySelector('.ribbon-floating');
  if (sbInner && ribbon) {
    const MK_VISIBLE_RANGE = 80;
    let pendingSl = 0;
    let rafId = 0;
    const applyRibbon = function () {
      rafId = 0;
      const sl = pendingSl;
      ribbon.style.transform = 'translate3d(' + (-sl) + 'px,0,0)';
      ribbon.style.opacity = Math.max(0, 1 - sl / MK_VISIBLE_RANGE).toFixed(2);
    };
    const syncRibbon = function () {
      pendingSl = sbInner.scrollLeft;
      if (!rafId) rafId = requestAnimationFrame(applyRibbon);
    };
    sbInner.addEventListener('scroll', syncRibbon, { passive: true });
    syncRibbon();
  }
})();
