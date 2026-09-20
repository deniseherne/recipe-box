function escapeHtml(s) { return String(s).replace(/[&<>"\']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "\'":"&#39;"}[c])); }


const CATEGORY_ORDER = ["Thanksgiving", "Sauces", "Pasta", "Side", "Beef", "Soups", "Salads", "Breakfast", "Keto", "Main - Everyday", "Chicken", "Want to Try"];

const SIDEBAR_GROUPS = [
  {label: 'Main', cats: ['Pasta', 'Beef', 'Chicken', 'Keto', 'Main - Everyday']},
  {label: 'Side', cats: ['Side', 'Sauces', 'Salads']},
  {label: 'Breakfast', cats: ['Breakfast']},
  {label: 'Holiday', cats: ['Thanksgiving']},
  {label: 'Other', cats: ['Soups', 'Want to Try']}
];

function getCollapsedGroups() {
  try { return new Set(JSON.parse(localStorage.getItem('collapsedSidebarGroups') || '[]')); } catch(e) { return new Set(); }
}
function setCollapsedGroups(set) {
  try { localStorage.setItem('collapsedSidebarGroups', JSON.stringify(Array.from(set))); } catch(e) {}
}
function toggleGroup(label, evt) {
  if (evt) evt.stopPropagation();
  const collapsed = getCollapsedGroups();
  if (collapsed.has(label)) collapsed.delete(label); else collapsed.add(label);
  setCollapsedGroups(collapsed);
  route();
}

function slugify(s) {
  return encodeURIComponent(s);
}

function recipeKey(r) {
  return r.url;
}

function getNotes(url) {
  try {
    return localStorage.getItem('recipeNotes:' + url) || '';
  } catch(e) { return ''; }
}
function setNotes(url, val) {
  try {
    localStorage.setItem('recipeNotes:' + url, val); return true;
  } catch(e) { return false; }
}

function getReview(url) {
  try {
    const value = JSON.parse(localStorage.getItem('recipeReview:' + url) || '{}');
    return { tried: value?.tried === true, score: Number.isInteger(value?.score) && value.score >= 1 && value.score <= 10 ? value.score : null };
  } catch { return { tried: false, score: null }; }
}
function saveReview(url, review) {
  try { localStorage.setItem('recipeReview:' + url, JSON.stringify(review)); return true; }
  catch { return false; }
}
function reviewTag(url) {
  const review = getReview(url);
  return review.tried ? `<span class="tag tried-tag">Tried${review.score ? ` · ${review.score}/10` : ''}</span>` : '';
}
function renderTried() {
  renderSidebar('tried', null);
  const recipes = sortRecipes(RECIPES.filter(r => getReview(r.url).tried));
  document.getElementById('app').innerHTML = '<div class="breadcrumb">Tried recipes</div>' +
    (recipes.length ? '<div class="recipe-list">' + recipes.map(recipeCardHtml).join('') + '</div>' : '<div class="empty-state">No tried recipes yet. Open a recipe to mark it tried and give it a score.</div>');
}

function getFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem('favoriteRecipeUrls') || '[]')); } catch(e) { return new Set(); }
}
function setFavorites(set) {
  try { localStorage.setItem('favoriteRecipeUrls', JSON.stringify(Array.from(set))); } catch(e) {}
}
function isFavorite(url) { return getFavorites().has(url); }
function toggleFavorite(url, evt) {
  if (evt) evt.stopPropagation();
  const favs = getFavorites();
  if (favs.has(url)) favs.delete(url); else favs.add(url);
  setFavorites(favs);
  route();
}
function sortRecipes(list) {
  const favs = getFavorites();
  return [...list].sort((a, b) => {
    const fa = favs.has(a.url) ? 0 : 1;
    const fb = favs.has(b.url) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.title.localeCompare(b.title, undefined, {sensitivity: 'base'});
  });
}

function categoryCounts() {
  const counts = {};
  CATEGORY_ORDER.forEach(c => counts[c] = 0);
  RECIPES.forEach(r => r.categories.forEach(c => { counts[c] = (counts[c]||0) + 1; }));
  return counts;
}

function renderSidebar(activeKind, activeParam) {
  const counts = categoryCounts();
  const favCount = getFavorites().size;
  const collapsed = getCollapsedGroups();
  let html = `<div class="side-label">Browse</div>`;
  html += `<button type="button" class="side-item ${activeKind === 'home' ? 'active' : ''}" onclick="navigate('home')">
    <span>All Recipes</span><span class="badge">${RECIPES.length}</span>
  </button>`;
  html += `<button type="button" class="side-item ${activeKind === 'favorites' ? 'active' : ''}" onclick="navigate('favorites')">
    <span>★ Favorites</span><span class="badge">${favCount}</span>
  </button>`;
  html += `<button type="button" class="side-item ${activeKind === 'tried' ? 'active' : ''}" onclick="navigate('tried')"><span>Tried recipes</span><span class="badge">${RECIPES.filter(r => getReview(r.url).tried).length}</span></button>`;
  html += `<div class="side-divider"></div>`;

  SIDEBAR_GROUPS.forEach(group => {
    const catsWithRecipes = group.cats.filter(c => counts[c]);
    if (!catsWithRecipes.length) return;
    const groupTotal = catsWithRecipes.reduce((sum, c) => sum + counts[c], 0);
    const isCollapsed = collapsed.has(group.label);
    html += `<button type="button" class="side-group-header" onclick="toggleGroup('${group.label}', event)">
      <span class="chevron">${isCollapsed ? '▸' : '▾'}</span>
      <span>${group.label}</span>
      <span class="badge">${groupTotal}</span>
    </button>`;
    if (!isCollapsed) {
      catsWithRecipes.forEach(cat => {
        const isActive = activeKind === 'category' && activeParam === cat;
        html += `<button type="button" class="side-item sub-item ${isActive ? 'active' : ''}" onclick="navigate('category', '${slugify(cat)}')">
          <span>${cat}</span><span class="badge">${counts[cat]}</span>
        </button>`;
      });
    }
  });
  document.getElementById('sidebar').innerHTML = html;
}

function recipeCardHtml(r) {
  const img = r.image ? `<img class="thumb" src="${r.image}" alt="${r.title}" loading="lazy" onerror="this.style.display='none'">` : '';
  const fav = isFavorite(r.url);
  return `<div class="recipe-card" onclick="navigate('recipe', '${slugify(recipeKey(r))}')">
      <button class="fav-btn ${fav ? 'active' : ''}" onclick="toggleFavorite('${r.url}', event)" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">${fav ? '★' : '☆'}</button>
      ${img}
      <div class="card-body">
        <div class="title">${r.title}</div>
        <div class="meta">${[r.prepTime && ('Prep ' + r.prepTime), r.cookTime && ('Cook ' + r.cookTime), r.yield].filter(Boolean).join(' &middot; ')}</div>
        <div class="tags">${reviewTag(r.url)}${r.categories.map(c => `<span class="tag">${c}</span>`).join('')}</div>
      </div>
    </div>`;
}

function renderHome() {
  renderSidebar('home', null);
  let html = '<div class="recipe-list">';
  sortRecipes(RECIPES).forEach(r => { html += recipeCardHtml(r); });
  html += '</div>';
  document.getElementById('app').innerHTML = html;
}

function renderFavorites() {
  renderSidebar('favorites', null);
  const favs = getFavorites();
  const list = RECIPES.filter(r => favs.has(r.url));
  let html = `<div class="breadcrumb">Favorites</div>`;
  if (!list.length) {
    html += '<div class="empty-state">No favorites yet — click the star on any recipe to add it here.</div>';
  } else {
    html += '<div class="recipe-list">';
    sortRecipes(list).forEach(r => { html += recipeCardHtml(r); });
    html += '</div>';
  }
  document.getElementById('app').innerHTML = html;
}

function renderCategory(catEncoded) {
  const cat = decodeURIComponent(catEncoded);
  renderSidebar('category', cat);
  const recipes = sortRecipes(RECIPES.filter(r => r.categories.includes(cat)));
  let html = `<div class="breadcrumb">${cat}</div>`;
  html += '<div class="recipe-list">';
  recipes.forEach(r => { html += recipeCardHtml(r); });
  html += '</div>';
  document.getElementById('app').innerHTML = html;
}

function renderRecipe(urlEncoded) {
  const url = decodeURIComponent(urlEncoded);
  const r = RECIPES.find(x => x.url === url);
  if (!r) { document.getElementById('app').innerHTML = '<div class="empty-state">Recipe not found.</div>'; return; }
  renderSidebar('category', r.categories[0]);
  const fromCat = r.categories[0];
  let html = `<div class="breadcrumb"><a onclick="navigate('category', '${slugify(fromCat)}')">${fromCat}</a> &rsaquo; ${r.title}</div>`;
  html += '<div class="detail">';
  if (r.image) html += `<img class="hero" src="${r.image}" alt="${r.title}" onerror="this.style.display='none'">`;
  const fav = isFavorite(r.url);
  html += `<div class="detail-header-row"><h2>${r.title}</h2><button class="fav-btn-detail ${fav ? 'active' : ''}" onclick="toggleFavorite('${r.url}', event)">${fav ? '★ Favorited' : '☆ Add to Favorites'}</button></div>`;
  const review = getReview(r.url);
  html += `<fieldset class="recipe-review"><legend>My experience</legend>
    <label class="tried-control"><input id="triedRecipe" type="checkbox" ${review.tried ? 'checked' : ''}> I've tried this</label>
    <label for="recipeScore">My score</label>
    <select id="recipeScore" ${review.tried ? '' : 'disabled'}><option value="">Not rated</option>${Array.from({length:10}, (_, i) => `<option value="${i+1}" ${review.score === i+1 ? 'selected' : ''}>${i+1} / 10</option>`).join('')}</select>
    <span id="reviewStatus" role="status">Saved on this device only</span>
  </fieldset>`;
  if (r.description) html += `<div class="desc">${r.description}</div>`;
  html += '<div class="meta-row">';
  if (r.prepTime) html += `<div><strong>Prep</strong>${r.prepTime}</div>`;
  if (r.cookTime) html += `<div><strong>Cook</strong>${r.cookTime}</div>`;
  if (r.totalTime) html += `<div><strong>Total</strong>${r.totalTime}</div>`;
  if (r.yield) html += `<div><strong>Yield</strong>${r.yield}</div>`;
  html += '</div>';
  html += '<div class="detail-cols">';
  html += '<div><h3>Ingredients</h3><ul>' + r.ingredients.map(i => `<li>${i}</li>`).join('') + '</ul></div>';
  html += '<div><h3>Instructions</h3><ol>' + r.instructions.map(i => `<li>${i}</li>`).join('') + '</ol></div>';
  html += '</div>';
  html += `<div class="source-link">Original source: <a href="${r.url}" target="_blank" rel="noopener">${r.url}</a> &middot; kept for reference only</div>`;
  html += `<div class="notes-box">
    <h3>My Notes</h3>
    <textarea id="notesArea" placeholder="Log your tweaks here — swapped ingredients, timing changes, what worked...">${escapeHtml(getNotes(r.url))}</textarea>
    <div class="save-status" id="saveStatus"></div>
  </div>`;
  html += '</div>';
  document.getElementById('app').innerHTML = html;

  const triedInput = document.getElementById('triedRecipe');
  const scoreInput = document.getElementById('recipeScore');
  function updateReview() {
    const next = { tried: triedInput.checked, score: scoreInput.value ? Number(scoreInput.value) : null };
    if (saveReview(r.url, next)) {
      scoreInput.disabled = !next.tried;
      document.getElementById('reviewStatus').textContent = 'Saved on this device';
      renderSidebar('category', r.categories[0]);
    } else {
      const previous = getReview(r.url);
      triedInput.checked = previous.tried;
      scoreInput.value = previous.score ?? '';
      scoreInput.disabled = !previous.tried;
      document.getElementById('reviewStatus').textContent = 'Unable to save — browser storage is unavailable.';
    }
  }
  triedInput.addEventListener('change', updateReview);
  scoreInput.addEventListener('change', updateReview);
  document.getElementById('notesArea').addEventListener('input', function() {
    document.getElementById('saveStatus').textContent = setNotes(r.url, this.value)
      ? 'Saved on this device' : 'Unable to save — browser storage is unavailable.';
  });

}

function handleSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) { navigate('home'); return; }
  renderSidebar(null, null);
  const matches = sortRecipes(RECIPES.filter(r => [r.title, ...r.categories, ...r.ingredients].join(' ').toLowerCase().includes(q)));
  let html = `<div class="breadcrumb">Search results</div>`;
  if (!matches.length) {
    html += '<div class="empty-state">No recipes match that search.</div>';
  } else {
    html += '<div class="recipe-list">';
    matches.forEach(r => { html += recipeCardHtml(r); });
    html += '</div>';
  }
  document.getElementById('app').innerHTML = html;
  history.replaceState(null, '', '#search/' + encodeURIComponent(q));
}

function navigate(view, param) {
  document.body.classList.remove('nav-open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
  document.getElementById('search').value = '';
  if (view === 'home') window.location.hash = '';
  else if (view === 'favorites') window.location.hash = 'favorites';
  else if (view === 'tried') window.location.hash = 'tried';
  else if (view === 'category') window.location.hash = 'category/' + param;
  else if (view === 'recipe') window.location.hash = 'recipe/' + param;
}

function route() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) { renderHome(); return; }
  if (hash === 'favorites') { renderFavorites(); return; }
  if (hash === 'tried') { renderTried(); return; }
  const [view, param] = hash.split(/\/(.+)/);
  if (view === 'search' && param) { document.getElementById('search').value = decodeURIComponent(param); handleSearch(decodeURIComponent(param)); }
  else if (view === 'category' && param) renderCategory(param);
  else if (view === 'recipe' && param) renderRecipe(param);
  else renderHome();
}

window.addEventListener('hashchange', route);
route();

document.getElementById('menuToggle').addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', String(open));
});
if ('serviceWorker' in navigator) {
  let refreshing = false;
  const alreadyControlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (alreadyControlled && !refreshing) { refreshing = true; window.location.reload(); }
  });
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
