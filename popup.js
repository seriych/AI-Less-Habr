const checkbox = document.getElementById('toggle');
const checkboxTags = document.getElementById('toggleTags');
const tagList = document.getElementById('tagList');
const checkboxTitles = document.getElementById('toggleTitles');
const titleList = document.getElementById('titleList');
const checkboxInvert = document.getElementById('toggleInvert');
const checkboxMl = document.getElementById('toggleMl');
const mlThreshold = document.getElementById('mlThreshold');
const mlThresholdValue = document.getElementById('mlThresholdValue');
const mlVetoThreshold = document.getElementById('mlVetoThreshold');
const mlVetoValue = document.getElementById('mlVetoValue');
const mlVetoFill = document.getElementById('mlVetoFill');
const mlHideFill = document.getElementById('mlHideFill');
const checkboxMlDebug = document.getElementById('toggleMlDebug');
const mlModelSelect = document.getElementById('mlModelSelect');
const resetBtn = document.getElementById('resetBtn');

const mlModelNames = Object.keys(globalThis.ML_MODELS || {});
const mlInfo = Object.fromEntries((globalThis.ML_INFO ? globalThis.ML_INFO.models : []).map((m) => [m.name, m]));
if (mlModelNames.length < 2) {
  document.getElementById('mlModelRow').style.display = 'none';
} else {
  for (const n of mlModelNames) {
    const o = document.createElement('option');
    o.value = n;
    const mi = mlInfo[n];
    let text = n;
    if (mi && mi.hoAUC != null) {
      text = `${n} - hoAUC ${mi.hoAUC.toFixed(3)}`;
      if (mi.feats != null) text += ` · feats ${mi.feats}`;
    }
    o.textContent = text;
    mlModelSelect.appendChild(o);
  }
  mlModelSelect.selectedIndex = 0;
}

chrome.storage.sync.get(HABR_CONFIG.defaults, (data) => {
  checkbox.checked = data.enabled;
  checkboxTags.checked = data.tagsEnabled;
  tagList.value = data.hiddenTags;
  checkboxTitles.checked = data.titlesEnabled;
  titleList.value = data.hiddenTitles;
  checkboxInvert.checked = data.invertEnabled;
  checkboxMl.checked = data.mlEnabled;
  mlThreshold.value = data.mlThreshold;
  mlVetoThreshold.value = data.mlVetoThreshold;
  updateSliderUi();
  checkboxMlDebug.checked = data.mlDebug;
  if (mlModelSelect.options.length > 0 && [...mlModelSelect.options].some(o => o.value === data.mlModel)) {
    mlModelSelect.value = data.mlModel;
  }

  setTimeout(() => {
    autoResize(tagList);
    autoResize(titleList);
  }, 0);
});

checkbox.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: checkbox.checked }, reloadActiveTab);
});

checkboxTags.addEventListener('change', () => {
  chrome.storage.sync.set({ tagsEnabled: checkboxTags.checked }, reloadActiveTab);
});

tagList.addEventListener('input', () => {
  autoResize(tagList);
  chrome.storage.sync.set({ hiddenTags: tagList.value });
});

checkboxTitles.addEventListener('change', () => {
  chrome.storage.sync.set({ titlesEnabled: checkboxTitles.checked }, reloadActiveTab);
});

titleList.addEventListener('input', () => {
  autoResize(titleList);
  chrome.storage.sync.set({ hiddenTitles: titleList.value });
});

checkboxInvert.addEventListener('change', () => {
  chrome.storage.sync.set({ invertEnabled: checkboxInvert.checked }, reloadActiveTab);
});

checkboxMl.addEventListener('change', () => {
  chrome.storage.sync.set({ mlEnabled: checkboxMl.checked }, reloadActiveTab);
});

const MIN_SLIDER_GAP = 5;

mlVetoThreshold.addEventListener('input', () => {
  let v = Math.round(parseFloat(mlVetoThreshold.value) * 100);
  let t = Math.round(parseFloat(mlThreshold.value) * 100);
  if (v + MIN_SLIDER_GAP > t) {
    v = Math.min(v, 100 - MIN_SLIDER_GAP);
    t = v + MIN_SLIDER_GAP;
    mlVetoThreshold.value = v / 100;
    mlThreshold.value = t / 100;
  }
  updateSliderUi();
});

mlThreshold.addEventListener('input', () => {
  let v = Math.round(parseFloat(mlVetoThreshold.value) * 100);
  let t = Math.round(parseFloat(mlThreshold.value) * 100);
  if (t - MIN_SLIDER_GAP < v) {
    t = Math.max(t, MIN_SLIDER_GAP);
    v = t - MIN_SLIDER_GAP;
    mlVetoThreshold.value = v / 100;
    mlThreshold.value = t / 100;
  }
  updateSliderUi();
});

mlVetoThreshold.addEventListener('change', saveMlThresholds);

mlThreshold.addEventListener('change', saveMlThresholds);

function saveMlThresholds() {
  chrome.storage.sync.set({
    mlVetoThreshold: parseFloat(mlVetoThreshold.value),
    mlThreshold: parseFloat(mlThreshold.value)
  }, reloadActiveTab);
}

function updateSliderUi() {
  const v = parseFloat(mlVetoThreshold.value) || 0;
  const t = parseFloat(mlThreshold.value) || 0.85;
  mlVetoFill.style.width = (v * 100) + '%';
  mlHideFill.style.left = (t * 100) + '%';
  mlHideFill.style.width = ((1 - t) * 100) + '%';
  mlVetoValue.textContent = Math.round(v * 100) + '%';
  mlThresholdValue.textContent = Math.round(t * 100) + '%';
}

checkboxMlDebug.addEventListener('change', () => {
  chrome.storage.sync.set({ mlDebug: checkboxMlDebug.checked }, reloadActiveTab);
});

mlModelSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ mlModel: mlModelSelect.value }, reloadActiveTab);
});

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

  chrome.storage.sync.remove('mlModel');
  chrome.storage.sync.set(HABR_CONFIG.defaults, () => {
    const def = HABR_CONFIG.defaults;
    checkbox.checked = def.enabled;
    checkboxTags.checked = def.tagsEnabled;
    tagList.value = def.hiddenTags;
    checkboxTitles.checked = def.titlesEnabled;
    titleList.value = def.hiddenTitles;
    checkboxInvert.checked = def.invertEnabled;
    checkboxMl.checked = def.mlEnabled;
    mlThreshold.value = def.mlThreshold;
    mlVetoThreshold.value = def.mlVetoThreshold;
    updateSliderUi();
    checkboxMlDebug.checked = def.mlDebug;
    mlModelSelect.selectedIndex = 0;

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
