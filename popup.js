const checkbox = document.getElementById('toggle');
const checkboxTags = document.getElementById('toggleTags');
const tagList = document.getElementById('tagList');
const checkboxTitles = document.getElementById('toggleTitles');
const titleList = document.getElementById('titleList');
const checkboxInvert = document.getElementById('toggleInvert');
const resetBtn = document.getElementById('resetBtn');

// Загрузка настроек
chrome.storage.sync.get(HABR_CONFIG.defaults, (data) => {
  checkbox.checked = data.enabled;
  checkboxTags.checked = data.tagsEnabled;
  tagList.value = data.hiddenTags;
  checkboxTitles.checked = data.titlesEnabled;
  titleList.value = data.hiddenTitles;
  checkboxInvert.checked = data.invertEnabled;

  setTimeout(() => {
    autoResize(tagList);
    autoResize(titleList);
  }, 0);
});

// Сохранение настройки фильтрации по хабу ИИ
checkbox.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: checkbox.checked }, reloadActiveTab);
});

// Сохранение настройки включения фильтрации по тегам
checkboxTags.addEventListener('change', () => {
  chrome.storage.sync.set({ tagsEnabled: checkboxTags.checked }, reloadActiveTab);
});

// Сохранение списка тегов для скрытия
tagList.addEventListener('input', () => {
  autoResize(tagList);
  chrome.storage.sync.set({ hiddenTags: tagList.value });
});

// Сохранение включения фильтра по заголовкам
checkboxTitles.addEventListener('change', () => {
  chrome.storage.sync.set({ titlesEnabled: checkboxTitles.checked }, reloadActiveTab);
});

// Сохранение списка слов для заголовков
titleList.addEventListener('input', () => {
  autoResize(titleList);
  chrome.storage.sync.set({ hiddenTitles: titleList.value });
});

// Инвертируем фильтры
checkboxInvert.addEventListener('change', () => {
  chrome.storage.sync.set({ invertEnabled: checkboxInvert.checked }, reloadActiveTab);
});

// Сброс настроек
let resetTimer;
const resetTextOriginal = 'Вернуть настройки по умолчанию';

resetBtn.addEventListener('click', () => {
  if (resetBtn.textContent !== 'Нажмите еще раз для сброса') {
    resetBtn.textContent = 'Нажмите еще раз для сброса';
    resetBtn.style.color = '#d93025';

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      resetBtn.textContent = resetTextOriginal;
      resetBtn.style.color = '#666';
    }, 5000);

    return;
  }

  chrome.storage.sync.set(HABR_CONFIG.defaults, () => {
    const def = HABR_CONFIG.defaults;
    checkbox.checked = def.enabled;
    checkboxTags.checked = def.tagsEnabled;
    tagList.value = def.hiddenTags;
    checkboxTitles.checked = def.titlesEnabled;
    titleList.value = def.hiddenTitles;
    checkboxInvert.checked = def.invertEnabled;

    autoResize(tagList);
    autoResize(titleList);

    resetBtn.textContent = resetTextOriginal;
    resetBtn.style.color = '#666';

    reloadActiveTab();
  });
});

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.url && HABR_CONFIG.isSupportedPage(tab.url)) {
      chrome.tabs.reload(tab.id);
    }
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  const newHeight = el.scrollHeight + 2;
  if (newHeight > 160) {
    el.style.height = '160px';
    el.style.overflowY = 'auto';
  } else {
    el.style.height = newHeight + 'px';
    el.style.overflowY = 'hidden';
  }
}
