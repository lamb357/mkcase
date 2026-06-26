// ts-banner: scrollTop 阈值控制（向下滚收起、回顶展开）
// bottom-float: 滚动方向控制（向上滑立刻出现、向下滑立刻消失）
// top-stack / filter-region: 虚拟滚动热区，转发 touch/wheel deltaY 给 .scroll
(function () {
  const phone = document.querySelector('.phone');
  const scrollEl = document.querySelector('.scroll');
  if (!phone || !scrollEl) return;
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
})();
