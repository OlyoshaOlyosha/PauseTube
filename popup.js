// Логика всплывающего окна расширения

// Форматирование времени из секунд в MM:SS
function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

// Загрузка и отображение текущего состояния
async function loadAndRender() {
  const infoEl = document.getElementById("info");
  const limitEl = document.getElementById("limitMin");
  const blockEl = document.getElementById("blockMin");

  try {
    // Запрашиваем текущее состояние у background скрипта
    const res = await browser.runtime.sendMessage({ type: "getState" });
    if (!res || !res.state || !res.settings) {
      infoEl.textContent = "Ошибка связи";
      return;
    }

    const { state, settings, now } = res;

    // Инициализация полей ввода если они пустые
    if (!limitEl.value) limitEl.value = Math.max(1, Math.round(settings.limitSec / 60));
    if (!blockEl.value) blockEl.value = Math.max(1, Math.round(settings.blockSec / 60));

    // Отображение текущего состояния
    if (state.blockedUntil && now < state.blockedUntil) {
      const remain = Math.ceil((state.blockedUntil - now) / 1000);
      infoEl.textContent = "Блокировка: " + fmt(remain);
    } else {
      infoEl.textContent = "Осталось: " + fmt(state.remaining);
    }
  } catch (e) {
    infoEl.textContent = "Ошибка связи";
    console.error(e);
  }
}

// Обработчик сохранения настроек
document.getElementById("saveBtn").addEventListener("click", async () => {
  const limitMin = Math.max(1, parseInt(document.getElementById("limitMin").value || "30", 10));
  const blockMin = Math.max(1, parseInt(document.getElementById("blockMin").value || "30", 10));
  try {
    await browser.runtime.sendMessage({
      type: "setSettings",
      limitSec: limitMin * 60,
      blockSec: blockMin * 60
    });
  } catch (e) { console.error(e); }
  loadAndRender();
});

// Обработчик сброса таймера
document.getElementById("resetBtn").addEventListener("click", async () => {
  try { await browser.runtime.sendMessage({ type: "resetTimer" }); } catch (e) {}
  loadAndRender();
});

// Обработчик принудительного запуска блокировки
document.getElementById("startBlockBtn").addEventListener("click", async () => {
  try { await browser.runtime.sendMessage({ type: "startBlock" }); } catch (e) {}
  loadAndRender();
});

// Обработчик принудительного снятия блокировки
document.getElementById("stopBlockBtn").addEventListener("click", async () => {
  try { await browser.runtime.sendMessage({ type: "stopBlock" }); } catch (e) {}
  loadAndRender();
});

setInterval(loadAndRender, 1000);
loadAndRender();