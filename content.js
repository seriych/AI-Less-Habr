function parseList(listString) {
  if (!listString || !listString.trim()) return [];
  return listString
    .split(/[\n,]+/)
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);
}

function getArticleTags(article) {
  const tagList = article.querySelector('.tag-list');
  if (!tagList) return [];

  const spans = tagList.querySelectorAll('ul span');
  const tags = [];
  spans.forEach(span => {
    const text = span.textContent.trim().toLowerCase();
    if (text) tags.push(text);
  });
  return tags;
}

function getArticleTitle(article) {
  const titleLink = article.querySelector('.tm-title__link span');
  if (titleLink) {
    return titleLink.textContent.trim().toLowerCase();
  }
  return '';
}

function titleContainsWords(title, wordList) {
  for (const word of wordList) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^а-яёa-z0-9])${escapedWord}([^а-яёa-z0-9]|$)`, 'i');
    if (regex.test(title)) {
      return true;
    }
  }
  return false;
}

function applyFilter() {
  if (!chrome.runtime?.id) {
    if (typeof observer !== 'undefined') observer.disconnect();
    return;
  }

  chrome.storage.sync.get(HABR_CONFIG.defaults, (data) => {
    if (chrome.runtime.lastError) {
      chrome.runtime.sendMessage({ type: 'hiddenCounter', count: 0, isInverted: false });
      return;
    }

    const articles = document.querySelectorAll('.tm-articles-list article');
    const hiddenUrls = new Set();

    const rawTitles = parseList(data.hiddenTitles);
    const rawTags = parseList(data.hiddenTags);
    const combinedTagList = data.tagsEnabled ? [...new Set([...rawTags, ...rawTitles])] : [];
    const activeTitleList = data.titlesEnabled ? rawTitles : [];

    let matchCount = 0;

    articles.forEach(article => {
      let matches = false;

      if (data.enabled && article.querySelector('a[href*="/hubs/artificial_intelligence/"]')) {
        matches = true;
      }

      if (!matches && data.tagsEnabled && combinedTagList.length > 0) {
        const articleTags = getArticleTags(article);
        if (articleTags.some(tag => combinedTagList.includes(tag))) matches = true;
      }

      if (!matches && data.titlesEnabled && activeTitleList.length > 0) {
        const title = getArticleTitle(article);
        if (title && titleContainsWords(title, activeTitleList)) matches = true;
      }

      if (matches) {
        const linkEl = article.querySelector('a.tm-title__link');
        if (linkEl && linkEl.getAttribute('href')) {
          hiddenUrls.add(linkEl.getAttribute('href'));
        }
        matchCount++;
      }

      let finalHide = data.invertEnabled ? !matches : matches;
      article.style.display = finalHide ? 'none' : '';
    });

    const newsItems = document.querySelectorAll('.tm-news-block-layout .items li, .sidebar ul.tm-article-list-block__list li');
    newsItems.forEach(item => {
      const titleEl = item.querySelector('h3 span, h2 span, a.tm-article-list-block__item-title');
      const linkEl = item.querySelector('a');

      let matches = false;

      if (data.titlesEnabled && activeTitleList.length > 0 && titleEl) {
        const title = titleEl.textContent.trim().toLowerCase();
        if (titleContainsWords(title, activeTitleList)) matches = true;
      }

      if (!matches && linkEl) {
        const href = linkEl.getAttribute('href');
        if (href && hiddenUrls.has(href)) {
          matches = true;
        }
      }

      if (matches) matchCount++;

      let finalHideNews = data.invertEnabled ? !matches : matches;
      item.style.display = finalHideNews ? 'none' : '';
    });

    chrome.runtime.sendMessage({
      type: 'hiddenCounter',
      count: matchCount,
      isInverted: data.invertEnabled
    });
  });
}

const observer = new MutationObserver(applyFilter);
observer.observe(document.body, { childList: true, subtree: true });

applyFilter();
