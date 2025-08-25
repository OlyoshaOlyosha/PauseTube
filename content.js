// Минимальный виджет + оверлей для отображения на YouTube

// Создает или возвращает элемент таймера
function ensureTimerEl() {
  let el = document.getElementById("sf-timer");
  if (!el) {
    el = document.createElement("div");
    el.id = "sf-timer";
    document.documentElement.appendChild(el);
  }
  return el;
}

// Создает или возвращает элемент overlay блокировки
function ensureOverlay() {
  let o = document.getElementById("sf-overlay");
  if (!o) {
    o = document.createElement("div");
    o.id = "sf-overlay";
    o.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(o);
  }
  return o;
}

// Удаляет overlay блокировки
function removeOverlay() {
  const o = document.getElementById("sf-overlay");
  if (o) o.remove();
}

// Форматирование времени из секунд в MM:SS
function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

// Основная функция обновления интерфейса
function updateUI() {
  // Запрашиваем текущее состояние у background скрипта
  browser.runtime.sendMessage({ type: "getState" }).then(({ state, now }) => {
    const timerEl = ensureTimerEl();

    // Если активна блокировка - показываем overlay
    if (state.blockedUntil && now < state.blockedUntil) {
      const remain = Math.ceil((state.blockedUntil - now) / 1000);
      const ov = ensureOverlay();
      ov.textContent = `⛔ Время вышло! Доступ будет через ${fmt(remain)}.`;
      timerEl.textContent = `Блок: ${fmt(remain)}`;
    } else {
      // Иначе показываем оставшееся время
      removeOverlay();
      timerEl.textContent = `⏳ ${fmt(state.remaining)}`;
    }
  }).catch(() => {});
}

setInterval(updateUI, 1000);
updateUI();