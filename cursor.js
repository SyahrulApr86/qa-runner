// Injected into every page: draws a red dot following the mouse and a ripple on click,
// so cursor movement/clicks are visible in the recorded video.
(function () {
  function init() {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:16px;height:16px;border-radius:50%;background:rgba(255,0,0,0.85);border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);pointer-events:none;z-index:2147483647;left:0;top:0;transform:translate(-50%,-50%);transition:left 0.05s linear, top 0.05s linear;';
    document.documentElement.appendChild(dot);

    document.addEventListener('mousemove', (e) => {
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    }, true);

    document.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:8px;height:8px;border-radius:50%;background:transparent;border:3px solid rgba(255,0,0,0.9);pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);animation:qaRipple 0.5s ease-out forwards;`;
      document.documentElement.appendChild(ripple);
      setTimeout(() => ripple.remove(), 550);
    }, true);

    const style = document.createElement('style');
    style.textContent = '@keyframes qaRipple { from { width:8px;height:8px;opacity:1; } to { width:48px;height:48px;opacity:0; } }';
    document.documentElement.appendChild(style);
  }

  if (document.documentElement) {
    init();
  } else {
    const poll = setInterval(() => {
      if (document.documentElement) {
        clearInterval(poll);
        init();
      }
    }, 10);
  }
})();
