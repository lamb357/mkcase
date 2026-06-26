// ts-banner: scrollTop 阈值控制（向下滚收起、回顶展开）
// bottom-float: 滚动方向控制（向上滑立刻出现、向下滑立刻消失）
// top-stack / filter-region: 虚拟滚动热区，转发 touch/wheel deltaY 给 .scroll
(function () {
  const phone = document.querySelector('.phone');
  const scrollEl = document.querySelector('.scroll');
  if (!phone || !scrollEl) return;

  // === 整页根据浏览器宽度等比缩放（design width = 390px）===
  // 仅在触屏设备启用；桌面端 @media (hover) 已经覆盖 transform: none
  const DESIGN_W = 390;
  const fitPhone = function () {
    const scale = window.innerWidth / DESIGN_W;
    document.documentElement.style.setProperty('--phone-scale', scale.toFixed(4));
  };
  fitPhone();
  window.addEventListener('resize', fitPhone);
  window.addEventListener('orientationchange', fitPhone);
  let lastTop = scrollEl.scrollTop;
  scrollEl.addEventListener('scroll', function () {
    const t = scrollEl.scrollTop;
    const delta = t - lastTop;

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

    lastTop = t;
  }, { passive: true });

  // 把 top-stack 和 filter-region 变成虚拟滚动热区
  const hotZones = [
    document.querySelector('.top-stack'),
    document.querySelector('.filter-region')
  ].filter(Boolean);

  hotZones.forEach(function (el) {
    let lastY = 0;
    el.addEventListener('touchstart', function (e) {
      lastY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      const y = e.touches[0].clientY;
      scrollEl.scrollTop += (lastY - y);
      lastY = y;
    }, { passive: true });
    el.addEventListener('wheel', function (e) {
      scrollEl.scrollTop += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  });

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
  const sbInner = document.querySelector('.sb-row-inner');
  const ribbon = document.querySelector('.ribbon-floating');
  if (sbInner && ribbon) {
    const MK_VISIBLE_RANGE = 80;
    const syncRibbon = function () {
      const sl = sbInner.scrollLeft;
      ribbon.style.transform = 'translateX(' + (-sl) + 'px)';
      const opacity = Math.max(0, 1 - sl / MK_VISIBLE_RANGE);
      ribbon.style.opacity = opacity.toFixed(2);
    };
    sbInner.addEventListener('scroll', syncRibbon, { passive: true });
    syncRibbon();
  }
})();
