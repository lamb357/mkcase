// 模型 A：window 是滚动容器，scroll handler 用 rAF 节流避免卡顿
(function () {
  const phone = document.querySelector('.phone');
  if (!phone) return;

  // === Phone scale 适配：仅移动端按浏览器宽度等比缩放，桌面端固定 390×844 ===
  // 用 matchMedia 检测：hover + 精确指针 → 视为桌面（鼠标 + 触控板设备）
  const DESIGN_W = 390;
  const desktopMq = window.matchMedia('(hover: hover) and (pointer: fine)');
  const fitPhone = function () {
    if (desktopMq.matches) {
      document.documentElement.style.setProperty('--phone-scale', '1');
      document.body.classList.add('is-desktop');
    } else {
      const scale = window.innerWidth / DESIGN_W;
      document.documentElement.style.setProperty('--phone-scale', scale.toFixed(4));
      document.body.classList.remove('is-desktop');
    }
  };
  fitPhone();
  window.addEventListener('resize', fitPhone, { passive: true });
  window.addEventListener('orientationchange', fitPhone, { passive: true });
  // 设备切换（极少见但可能：插拔鼠标改变 pointer 类型）
  if (desktopMq.addEventListener) {
    desktopMq.addEventListener('change', fitPhone);
  } else if (desktopMq.addListener) {
    desktopMq.addListener(fitPhone);  // 旧 Safari fallback
  }

  // 桌面端 .phone 是 scroll container；移动端 window 是 scroll container
  const getY = function () {
    if (desktopMq.matches) {
      return phone.scrollTop || 0;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  };

  // 缓存 CSS 变量（避免每帧 getComputedStyle）
  let topStackH = 0, filterH = 0;
  const refreshVars = function () {
    const cs = getComputedStyle(document.documentElement);
    topStackH = parseFloat(cs.getPropertyValue('--top-stack-h')) || 0;
    filterH = parseFloat(cs.getPropertyValue('--filter-h')) || 0;
  };
  refreshVars();
  window.addEventListener('resize', refreshVars, { passive: true });
  window.addEventListener('orientationchange', refreshVars, { passive: true });

  // 缓存目标元素
  const subEl = document.querySelectorAll('.bet-substatus-img')[1] || null;

  let lastTop = getY();
  let pendingRaf = 0;
  let stopTimer = 0;

  const onFrame = function () {
    pendingRaf = 0;
    const t = getY();
    const delta = t - lastTop;

    // 1. sticky-bg：离开顶部就显示
    if (t > 0) phone.classList.add('scrolled-down');
    else phone.classList.remove('scrolled-down');

    // 2. banner 折叠（迟滞防抖 4 / 8 阈值）
    if (t > 8) {
      if (!phone.classList.contains('scrolled')) phone.classList.add('scrolled');
    } else if (t <= 4) {
      if (phone.classList.contains('scrolled')) phone.classList.remove('scrolled');
    }

    // 3. bottom-float 方向：向下滚隐藏、向上滚显示（≥2px 噪声门）
    if (Math.abs(delta) > 2) {
      if (delta > 0) phone.classList.add('float-hidden');
      else phone.classList.remove('float-hidden');
    }
    if (t <= 0) phone.classList.remove('float-hidden');

    // 4. show-substatus：第二个 bet-substatus-img 上推到 sticky 位置时切换
    if (subEl) {
      const subTop = subEl.getBoundingClientRect().top;
      if (subTop <= topStackH + filterH) phone.classList.add('show-substatus');
      else phone.classList.remove('show-substatus');
    }

    lastTop = t;
  };

  const onScroll = function () {
    // rAF 节流，每帧最多执行一次
    if (!pendingRaf) pendingRaf = requestAnimationFrame(onFrame);
    // 滑动停止 180ms 后让 bottom-float 重新出现
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      phone.classList.remove('float-hidden');
    }, 180);
  };
  // 同时监听 window 和 .phone scroll：桌面端 .phone 滚，移动端 window 滚
  window.addEventListener('scroll', onScroll, { passive: true });
  phone.addEventListener('scroll', onScroll, { passive: true });

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
