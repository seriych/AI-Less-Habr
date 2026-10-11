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

function getArticleHubs(article) {
  const hubs = [];
  article.querySelectorAll('a.tm-publication-hub__link').forEach(link => {
    const match = (link.getAttribute('href') || '').match(/\/hubs\/([a-z0-9_]+)/);
    if (match) hubs.push(match[1]);
  });
  return hubs;
}

function getArticleTitle(article) {
  const titleLink = article.querySelector('.tm-title__link span');
  if (titleLink) {
    return titleLink.textContent.trim().toLowerCase();
  }
  const strongP = article.querySelector('.tm-post-snippet__content p strong')
    || article.querySelector('.tm-post-snippet__content p');
  return strongP ? strongP.textContent.trim().toLowerCase() : '';
}

function getArticleLead(article) {
  const leadEl = article.querySelector('div.lead');
  if (leadEl) return leadEl.textContent.replace(/\s+/g, ' ').trim();
  const content = article.querySelector('.tm-post-snippet__content');
  if (!content) return '';
  const title = getArticleTitle(article);
  let text = content.textContent.replace(/\s+/g, ' ').trim();
  if (title && text.startsWith(title)) text = text.slice(title.length).trim();
  return text;
}

function getArticleUrl(article) {
  const link = article.querySelector('a.tm-title__link')
    || article.querySelector('a[href*="/articles/"], a[href*="/posts/"], a[href*="/news/"]');
  return link ? (link.getAttribute('href') || '') : '';
}

const scoreCache = new Map();
const feedScoreByTitle = new Map();

function normalizeTitle(title) {
  return title.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function scoreArticle(article) {
  const key = 'a:' + (getArticleUrl(article) || getArticleTitle(article));
  if (scoreCache.has(key)) return scoreCache.get(key);
  let p = 0;
  if (typeof mlScore === 'function') {
    p = Math.round(mlScore(getArticleTitle(article), getArticleLead(article), getArticleHubs(article), getArticleTags(article)) * 100) / 100;
  }
  scoreCache.set(key, p);
  const normTitle = normalizeTitle(getArticleTitle(article));
  if (normTitle) feedScoreByTitle.set(normTitle, p);
  return p;
}

function scoreTitle(title, key) {
  if (typeof mlScore !== 'function') return 0;
  const shared = feedScoreByTitle.get(normalizeTitle(title));
  if (shared !== undefined) return shared;
  if (scoreCache.has(key)) return scoreCache.get(key);
  const p = Math.round(mlScore(title, '', [], []) * 100) / 100;
  scoreCache.set(key, p);
  return p;
}

function scorePackCard(card, title, href) {
  const shared = feedScoreByTitle.get(normalizeTitle(title));
  if (shared !== undefined) return shared;
  const key = 'p:' + (href || normalizeTitle(title));
  if (scoreCache.has(key)) return scoreCache.get(key);
  const leadEl = card.querySelector('.description p');
  let p = 0;
  if (typeof mlScore === 'function') {
    p = Math.round(mlScore(title, leadEl ? leadEl.textContent : '', [], []) * 100) / 100;
  }
  scoreCache.set(key, p);
  return p;
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

function mlBadgeColor(p) {
  return `hsl(${Math.round(120 * (1 - p))},70%,${Math.round(33 + 12 * p)}%)`;
}

const BADGE_VISUAL = 'padding:2.3px 5px 1.7px;border-radius:6px;color:#fff;font-size:12px;line-height:1.2;font-weight:600;white-space:nowrap;';

// В SSR-контейнеры карточек узлы не вставлять (ломают гидрацию Vue): бейджи лент — overlay на <body>, новостей — absolute внутри заголовков
const badgeByAnchor = new Map();

function ensureOverlay() {
  let root = document.getElementById('ailess-ml-overlay');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ailess-ml-overlay';
    root.style.cssText = 'position:absolute;top:0;left:0;z-index:9999;pointer-events:none;';
    document.body.appendChild(root);
  }
  return root;
}

function badgeFirstLine(anchor) {
  const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
  let line = null;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim() || node.parentElement.closest('.ailess-ml-badge')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    line = range.getClientRects()[0];
    if (line) break;
  }
  const media = anchor.querySelector('img, video');
  if (media) {
    const rect = media.getBoundingClientRect();
    if (!line || rect.top < line.top) return rect;
  }
  return line;
}

function showMlBadge(anchor, p) {
  if (!anchor) return;
  const line = anchor.isConnected ? badgeFirstLine(anchor) : null;
  let badge = badgeByAnchor.get(anchor);
  if (!line || line.width === 0) {
    if (badge) badge.style.display = 'none';
    return;
  }
  const root = ensureOverlay();
  if (!badge) {
    badge = document.createElement('b');
    badge.className = 'ailess-ml-badge';
    badge.style.cssText = 'position:absolute;' + BADGE_VISUAL;
    root.appendChild(badge);
    badgeByAnchor.set(anchor, badge);
  }
  if (badge.style.display) badge.style.display = '';
  const text = Math.round(p * 100) + '%';
  if (badge.textContent !== text) badge.textContent = text;
  const background = mlBadgeColor(p);
  if (badge.style.background !== background) badge.style.background = background;
  const base = root.getBoundingClientRect();
  const badgeH = badge.offsetHeight;
  const left = line.left - base.left - badge.offsetWidth - 6;
  const top = line.height > badgeH * 2
    ? line.top - base.top + 2
    : line.top - base.top + (line.height - badgeH) / 2;
  badge.style.left = Math.round(left) + 'px';
  badge.style.top = Math.round(top) + 'px';
}

function pruneBadges() {
  badgeByAnchor.forEach((badge, anchor) => {
    if (!anchor.isConnected) {
      badge.remove();
      badgeByAnchor.delete(anchor);
    }
  });
}

function showMlBadgeDom(container, p) {
  if (!container) return;
  let badge = container.querySelector('.ailess-ml-badge');
  if (!badge) {
    badge = document.createElement('b');
    badge.className = 'ailess-ml-badge';
    badge.style.cssText = 'position:absolute;right:100%;margin-right:6px;z-index:9999;pointer-events:none;' + BADGE_VISUAL;
    container.style.position = 'relative';
    container.style.overflow = 'visible';
    container.insertBefore(badge, container.firstChild);
  }
  const text = Math.round(p * 100) + '%';
  if (badge.textContent !== text) badge.textContent = text;
  const background = mlBadgeColor(p);
  if (badge.style.background !== background) badge.style.background = background;
  const line = badgeFirstLine(container);
  if (!line) {
    badge.style.top = '2px';
    return;
  }
  const anchorTop = container.getBoundingClientRect().top;
  const badgeH = badge.getBoundingClientRect().height;
  const top = line.height > badgeH * 2
    ? line.top - anchorTop + 2
    : line.top - anchorTop + (line.height - badgeH) / 2;
  badge.style.top = Math.round(top) + 'px';
}

function clearBadges() {
  badgeByAnchor.clear();
  document.getElementById('ailess-ml-overlay')?.remove();
  document.querySelectorAll('.ailess-ml-badge').forEach(badge => {
    const holder = badge.parentElement;
    badge.remove();
    if (holder && holder.style.position === 'relative') {
      holder.style.position = '';
      holder.style.overflow = '';
    }
  });
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

    const mlModelNames = globalThis.ML_MODELS ? Object.keys(globalThis.ML_MODELS) : [];
    if (mlModelNames.length && globalThis.mlScoreFor) {
      const modelName = mlModelNames.includes(data.mlModel) ? data.mlModel : mlModelNames[0];
      globalThis.mlScore = globalThis.mlScoreFor(modelName);
    }

    const articles = document.querySelectorAll('.tm-articles-list article');
    const hiddenUrls = new Set();
    const hiddenTitles = new Set();

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

      let mlProbability = 0;
      const vetoActive = data.mlVetoThreshold > 0 && !data.invertEnabled;
      if (((!matches && data.mlEnabled) || (matches && vetoActive)) && typeof mlScore === 'function') {
        mlProbability = scoreArticle(article);
        if (!matches && data.mlEnabled && mlProbability >= data.mlThreshold) matches = true;
        else if (matches && vetoActive && mlProbability < data.mlVetoThreshold) matches = false;
      }
      if (data.mlDebug && !mlProbability) mlProbability = scoreArticle(article);

      if (matches) {
        const linkEl = article.querySelector('a.tm-title__link');
        if (linkEl && linkEl.getAttribute('href')) {
          hiddenUrls.add(linkEl.getAttribute('href'));
        }
        const normTitle = normalizeTitle(getArticleTitle(article));
        if (normTitle) hiddenTitles.add(normTitle);
        matchCount++;
      }

      let finalHide = data.invertEnabled ? !matches : matches;
      article.style.display = finalHide ? 'none' : '';
      if (data.mlDebug) showMlBadge(article.querySelector('h2.tm-title, .tm-post-snippet__content') || article, mlProbability);
    });

    const newsItems = document.querySelectorAll('.tm-news-block-layout .items li, .sidebar ul.tm-article-list-block__list li');
    newsItems.forEach(item => {
      const titleEl = item.querySelector('h3 span:not(.ailess-ml-badge), h2 span:not(.ailess-ml-badge), a.tm-article-list-block__item-title, a.tm-promo-post-link__link');
      const linkEl = item.querySelector('a');

      let matches = false;
      let propagated = false;

      if (data.titlesEnabled && activeTitleList.length > 0 && titleEl) {
        const title = titleEl.textContent.trim().toLowerCase();
        if (titleContainsWords(title, activeTitleList)) matches = true;
      }

      if (!matches && linkEl) {
        const href = linkEl.getAttribute('href');
        if (href && hiddenUrls.has(href)) {
          matches = true;
          propagated = true;
        }
      }

      if (!matches && titleEl) {
        const normTitle = normalizeTitle(titleEl.textContent);
        if (normTitle && hiddenTitles.has(normTitle)) {
          matches = true;
          propagated = true;
        }
      }

      let mlProbability = 0;
      const vetoActive = data.mlVetoThreshold > 0 && !data.invertEnabled;
      if (((!matches && data.mlEnabled) || (matches && !propagated && vetoActive))
          && typeof mlScore === 'function' && titleEl) {
        const title = titleEl.textContent.trim().toLowerCase();
        mlProbability = scoreTitle(title, 'n:' + (linkEl ? linkEl.getAttribute('href') : title));
        if (!matches && data.mlEnabled && mlProbability >= data.mlThreshold) matches = true;
        else if (matches && !propagated && vetoActive
                 && mlProbability < data.mlVetoThreshold) matches = false;
      }
      if (data.mlDebug && !mlProbability && titleEl) {
        const title = titleEl.textContent.trim().toLowerCase();
        mlProbability = scoreTitle(title, 'n:' + (linkEl ? linkEl.getAttribute('href') : title));
      }

      if (matches) matchCount++;

      const badgeContainer = titleEl ? titleEl.closest('h3, h2') || titleEl.closest('.tm-promo-post-link') || item : item;
      let finalHideNews = data.invertEnabled ? !matches : matches;
      item.style.display = finalHideNews ? 'none' : '';
      if (data.mlDebug) showMlBadgeDom(badgeContainer, mlProbability);
    });

    const packRoots = document.querySelectorAll(
      '.tm-pack-preview-card, .tm-articles-list__before-articles .tm-pack-preview, .tm-articles-list__before-articles .preview-card'
    );
    packRoots.forEach(pack => {
      const cards = pack.querySelectorAll('.article-content.full, .article-content.compact');
      cards.forEach(card => {
        const titleEl = card.querySelector('.tm-title__link span');
        if (!titleEl) return;
        const title = titleEl.textContent.trim().toLowerCase();
        const normTitle = normalizeTitle(title);
        const linkEl = card.querySelector('a.tm-title__link');
        const href = linkEl ? linkEl.getAttribute('href') : null;

        let matches = false;
        let propagated = false;

        if (data.titlesEnabled && activeTitleList.length > 0) {
          if (title && titleContainsWords(title, activeTitleList)) matches = true;
        }

        if (!matches && href && hiddenUrls.has(href)) {
          matches = true;
          propagated = true;
        }

        if (!matches && normTitle && hiddenTitles.has(normTitle)) {
          matches = true;
          propagated = true;
        }

        let mlProbability = 0;
        const vetoActive = data.mlVetoThreshold > 0 && !data.invertEnabled;
        if (((!matches && data.mlEnabled) || (matches && !propagated && vetoActive))
            && typeof mlScore === 'function') {
          mlProbability = scorePackCard(card, title, href);
          if (!matches && data.mlEnabled && mlProbability >= data.mlThreshold) matches = true;
          else if (matches && !propagated && vetoActive
                   && mlProbability < data.mlVetoThreshold) matches = false;
        }
        if (data.mlDebug && !mlProbability) mlProbability = scorePackCard(card, title, href);

        if (matches) matchCount++;

        const badgeContainer = card.querySelector('h2.tm-title, h3.tm-title') || card;
        const finalHidePack = data.invertEnabled ? !matches : matches;
        card.style.display = finalHidePack ? 'none' : '';
        if (data.mlDebug) showMlBadge(badgeContainer, mlProbability);
      });

      const packWrapper = pack.closest('.tm-pack-preview-card, .tm-articles-list__before-articles') || pack;
      const layout = pack.querySelector('.layout');
      const divider = pack.querySelector('.divider');
      const fullCard = pack.querySelector('.article-content.full');
      const fullHidden = fullCard && fullCard.style.display === 'none';
      if (layout) layout.style.gridTemplateColumns = fullHidden ? 'minmax(0,1fr)' : '';
      if (divider) divider.style.display = fullHidden ? 'none' : '';
      const anyVisible = [...cards].some(card => card.style.display !== 'none');
      packWrapper.style.display = anyVisible ? '' : 'none';
    });

    const dailyCards = document.querySelectorAll('.tm-page.pack-page .article-content');
    dailyCards.forEach(card => {
      const titleEl = card.querySelector('.tm-title__link span');
      if (!titleEl) return;
      const title = titleEl.textContent.trim().toLowerCase();
      const normTitle = normalizeTitle(title);
      const linkEl = card.querySelector('a.tm-title__link');
      const href = linkEl ? linkEl.getAttribute('href') : null;

      let matches = false;
      let propagated = false;

      if (data.titlesEnabled && activeTitleList.length > 0) {
        if (title && titleContainsWords(title, activeTitleList)) matches = true;
      }

      if (!matches && href && hiddenUrls.has(href)) {
        matches = true;
        propagated = true;
      }

      if (!matches && normTitle && hiddenTitles.has(normTitle)) {
        matches = true;
        propagated = true;
      }

      let mlProbability = 0;
      const vetoActive = data.mlVetoThreshold > 0 && !data.invertEnabled;
      if (((!matches && data.mlEnabled) || (matches && !propagated && vetoActive))
          && typeof mlScore === 'function') {
        mlProbability = scorePackCard(card, title, href);
        if (!matches && data.mlEnabled && mlProbability >= data.mlThreshold) matches = true;
        else if (matches && !propagated && vetoActive
                 && mlProbability < data.mlVetoThreshold) matches = false;
      }
      if (data.mlDebug && !mlProbability) mlProbability = scorePackCard(card, title, href);

      if (matches) matchCount++;

      const badgeContainer = card.querySelector('h2.tm-title') || card;
      const finalHideCard = data.invertEnabled ? !matches : matches;
      card.style.display = finalHideCard ? 'none' : '';
      if (data.mlDebug) showMlBadge(badgeContainer, mlProbability);
    });

    document.querySelectorAll('.tm-page.pack-page .section').forEach(section => {
      const cards = section.querySelectorAll('.article-content');
      const anyVisible = [...cards].some(card => card.style.display !== 'none');
      section.style.display = anyVisible ? '' : 'none';
    });

    if (data.mlDebug) pruneBadges();
    else clearBadges();

    chrome.runtime.sendMessage({
      type: 'hiddenCounter',
      count: matchCount,
      isInverted: data.invertEnabled
    });
  });
}

let filterScheduled = false;
function scheduleFilter() {
  if (filterScheduled) return;
  filterScheduled = true;
  requestAnimationFrame(() => {
    filterScheduled = false;
    applyFilter();
  });
}

const observer = new MutationObserver(scheduleFilter);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('resize', scheduleFilter);

applyFilter();
