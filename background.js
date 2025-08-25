// Управление временем просмотра и блокировкой YouTube
// Основные константы - лимиты по умолчанию (30 минут просмотра и блокировки)

const DEFAULT_LIMIT_SEC = 30 * 60;
const DEFAULT_BLOCK_SEC = 30 * 60;

// Текущие настройки и состояние таймера
let settings = { limitSec: DEFAULT_LIMIT_SEC, blockSec: DEFAULT_BLOCK_SEC };
let state = {
  remaining: DEFAULT_LIMIT_SEC,
  blockedUntil: 0,
  lastActive: Date.now(),
  awaySince: 0
};

// Загрузка сохраненных настроек и состояния при запуске
(async () => {
  try {
    const data = await browser.storage.local.get(["settings", "state"]);
    // Восстанавливаем настройки если они есть
    if (data.settings) {
      settings.limitSec = Number(data.settings.limitSec) || DEFAULT_LIMIT_SEC;
      settings.blockSec = Number(data.settings.blockSec) || DEFAULT_BLOCK_SEC;
    }
    // Восстанавливаем состояние если оно есть
    if (data.state) {
      state = Object.assign(state, data.state);
      // Корректируем оставшееся время если лимит изменился
      if (state.remaining > settings.limitSec) state.remaining = settings.limitSec;
    }
    // Сохраняем актуальное состояние
    await browser.storage.local.set({ settings, state });
  } catch (e) { console.error(e); }
})();

// Функции для сохранения данных
function saveState()  { browser.storage.local.set({ state  }).catch(()=>{}); }
function saveAll()    { browser.storage.local.set({ state, settings }).catch(()=>{}); }

// Основная функция обновления состояния каждую секунду
async function tick() {
  const now = Date.now();

  // Если активна блокировка - просто ждем ее окончания
  if (state.blockedUntil && now < state.blockedUntil) { saveState(); return; }

  // Если блокировка только что закончилась - сбрасываем состояние
  if (state.blockedUntil && now >= state.blockedUntil) {
    state.blockedUntil = 0;
    state.remaining = settings.limitSec;
    state.awaySince = 0;
    saveState();
    return;
  }

  // Проверяем активна ли вкладка с YouTube
  let onYouTube = false;
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    onYouTube = !!(tab && tab.url && tab.url.includes("youtube.com"));
  } catch (_) {}

  // Логика работы таймера в зависимости от активности на YouTube
  if (onYouTube) {
    state.awaySince = 0;  // Сбрасываем таймер отсутствия
    if (state.remaining > 0) {
      state.remaining -= 1;  // Уменьшаем оставшееся время
    } else {
      state.blockedUntil = now + settings.blockSec * 1000;
    }
    state.lastActive = now;
  } else {
    // Если не на YouTube - отслеживаем время отсутствия
    if (!state.awaySince) state.awaySince = now;
    // Если отсутствовали дольше лимита - полностью восстанавливаем время
    if (now - state.awaySince >= settings.limitSec * 1000) {
      state.remaining = settings.limitSec;
      state.awaySince = now;
    }
  }

  saveState();
}

setInterval(tick, 1000);

// Обработчик сообщений от других частей расширения (popup, content scripts)
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") { sendResponse({}); return true; }

  // Запрос текущего состояния
  if (msg.type === "getState") {
    sendResponse({ state, settings, now: Date.now() });
    return true;
  }

  // Обновление настроек
  if (msg.type === "setSettings") {
    const lim = Math.max(1, Math.floor(Number(msg.limitSec) || DEFAULT_LIMIT_SEC));
    const blk = Math.max(1, Math.floor(Number(msg.blockSec) || DEFAULT_BLOCK_SEC));
    settings.limitSec = lim;
    settings.blockSec = blk;
    if (state.remaining > settings.limitSec) state.remaining = settings.limitSec;
    saveAll();
    sendResponse({ ok: true, state, settings });
    return true;
  }

  // Сброс таймера
  if (msg.type === "resetTimer") {
    state.blockedUntil = 0;
    state.remaining = settings.limitSec;
    state.awaySince = 0;
    saveState();
    sendResponse({ ok: true, state, settings });
    return true;
  }

  // Принудительный запуск блокировки
  if (msg.type === "startBlock") {
    state.blockedUntil = Date.now() + settings.blockSec * 1000;
    saveState();
    sendResponse({ ok: true, state, settings });
    return true;
  }

  // Принудительное снятие блокировки
  if (msg.type === "stopBlock") {
    state.blockedUntil = 0;
    saveState();
    sendResponse({ ok: true, state, settings });
    return true;
  }

  sendResponse({});
  return true;
});