const PLANNER_KEY = 'recipeBoxMealPlans:v1';
let plannerState;
let plannerSuggestions = [];
let plannerMessage = '';
function readPlanner() {
  if (!plannerState) {
    try { plannerState = MealPlanner.cleanState(JSON.parse(localStorage.getItem(PLANNER_KEY) || '{}'), RECIPES); }
    catch { plannerState = MealPlanner.cleanState({}, RECIPES); }
  }
  return plannerState;
}
function activePlan() { const state = readPlanner(); return state.plans.find(p => p.id === state.active); }
function changePlanner(change, message = 'Saved on this device') {
  const next = JSON.parse(JSON.stringify(readPlanner()));
  change(next, next.plans.find(p => p.id === next.active));
  try {
    localStorage.setItem(PLANNER_KEY, JSON.stringify(next));
    plannerState = next;
    plannerMessage = message;
    return true;
  } catch {
    plannerMessage = 'Unable to save — browser storage is unavailable. Your previous saved plan is unchanged.';
    const status = document.getElementById('plannerStatus');
    if (status) status.textContent = plannerMessage;
    return false;
  }
}
function planDateLabel(plan) { return `${plan.start} – ${MealPlanner.datePlus(plan.start, plan.weeks * 7 - 1)}`; }
function recipeOption(r) { return `<option value="${escapeHtml(r.url)}">${escapeHtml(r.title)}</option>`; }
function renderPlanner() {
  const state = readPlanner(), plan = activePlan();
  renderSidebar('plan');
  document.getElementById('app').innerHTML = `<div class="planner">
    <div class="planner-heading"><div><div class="eyebrow">Dinner, planned</div><h2>My meal plan</h2><p>Pick meals for one or two weeks. Save room for leftovers.</p></div><button class="primary-button" id="newPlan">New plan</button></div>
    <div class="planner-panel planner-settings">
      <label>Saved plans<select id="savedPlan">${state.plans.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === plan.id ? 'selected' : ''}>${planDateLabel(p)} · ${p.meals.length} meals</option>`).join('')}</select></label>
      <label>Start date<input id="planStart" type="date" value="${plan.start}" required></label>
      <label>Plan length<select id="planWeeks"><option value="1" ${plan.weeks === 1 ? 'selected' : ''}>1 week</option><option value="2" ${plan.weeks === 2 ? 'selected' : ''}>2 weeks</option></select></label>
      <label>Default servings<input id="planServings" type="number" min="1" max="50" step="1" required value="${plan.servings}"></label>
      <p class="planner-hint">8 servings = dinner for four + four leftover portions. Changes save automatically on this device; plans do not sync between devices.</p>
    </div>
    <p id="plannerStatus" class="planner-status" role="status">${escapeHtml(plannerMessage || 'Choose meals below. Changes save automatically on this device.')}</p>
    <div class="planner-panel"><h3>Add a recipe</h3><div class="planner-add">
      <label>Find a saved recipe<input type="search" id="planSearch" placeholder="Search recipe names…"></label>
      <label>Recipe<select id="planRecipe">${sortRecipes(RECIPES).map(recipeOption).join('')}</select></label>
      <label>Week<select id="addWeek">${weekOptions(plan, 1)}</select></label>
      <button class="primary-button" id="addToPlan">Add meal</button>
    </div>${!plan.meals.length ? '<div class="starter-callout"><strong>Your eight-meal keto-style menu</strong><p>No seafood, chili or beef tips. Includes the suggested sides and enough for leftovers, using full recipe batches (8–12 servings).</p><button id="starterPlan" class="secondary-button">Use our eight meals + sides</button></div>' : ''}</div>
    <div class="plan-weeks">${Array.from({length:plan.weeks}, (_, i) => weekHtml(plan, i + 1)).join('')}</div>
    <section class="planner-panel"><h3>Suggest meals</h3><p>Discover untried meals already in your recipe box. Suggestions skip meals in this plan.</p>
      <div class="suggest-settings"><label>How many?<input id="suggestCount" type="number" min="1" max="14" required value="${state.prefs.count}"></label>
      ${[['keto','Keto / low-carb choices'],['untried','Only recipes I haven’t tried'],['seafood','No seafood'],['chili','No chili'],['beefTips','No beef tips']].map(([key,label]) => `<label class="check-label"><input id="pref-${key}" type="checkbox" ${state.prefs[key] ? 'checked' : ''}>${label}</label>`).join('')}
      <button class="primary-button" id="suggestMeals">Suggest meals</button></div>
      <p class="planner-hint">Keto-style choices use recipe labels and our selected meals, not calculated carb totals. Serve fajitas without tortillas or rice.</p>
      <div id="suggestions" aria-live="polite">${suggestionsHtml(plan)}</div>
    </section>
    <section class="planner-panel" id="grocerySection"><div class="planner-heading"><div><h3>Grocery list</h3><p>Combined ingredients for every planned meal and its listed sides.</p></div><div class="button-row"><button id="copyGroceries" class="secondary-button">Copy list</button><button id="downloadGroceries" class="secondary-button">Download list</button></div></div>
      <label>Extra groceries or sides (one item per line)<textarea id="extraGroceries" rows="3" placeholder="2 avocados&#10;1 cup sour cream">${escapeHtml(plan.extra)}</textarea></label>
      <p class="planner-hint">Amounts are recipe totals; round up to store packages. Different ingredient forms or units remain separate. Check your pantry before shopping.</p>
      <div id="groceryRows">${groceryHtml(plan)}</div>
    </section>
  </div>`;
  document.getElementById('newPlan').onclick = () => {
    if (state.plans.length >= 100) { plannerMessage = 'You have 100 saved plans. Reuse a saved plan to continue.'; renderPlanner(); return; }
    changePlanner((s) => { const p = MealPlanner.freshPlan(); p.servings = plan.servings; s.plans.unshift(p); s.active = p.id; }, 'New plan created. Your earlier plans are still saved.');
    plannerSuggestions = []; renderPlanner();
  };
  document.getElementById('savedPlan').onchange = e => { changePlanner(s => {s.active = e.target.value;}); plannerSuggestions = []; renderPlanner(); };
  document.getElementById('planStart').onchange = e => { if (e.target.checkValidity() && e.target.value) changePlanner((s,p) => {p.start = e.target.value;}); renderPlanner(); };
  document.getElementById('planWeeks').onchange = e => {
    const weeks = Number(e.target.value);
    changePlanner((s,p) => {p.weeks = weeks; if (weeks === 1) p.meals.forEach(m => {m.week = 1;});}, weeks === 1 && plan.meals.some(m => m.week === 2) ? 'Saved. Week 2 meals moved to Week 1.' : 'Saved on this device');
    renderPlanner();
  };
  document.getElementById('planServings').onchange = e => { if(e.target.checkValidity()) changePlanner((s,p) => {p.servings = Number(e.target.value);}, 'Default saved for new meals. Existing meal portions are unchanged.'); renderPlanner(); };
  document.getElementById('planSearch').oninput = e => {
    const matches = sortRecipes(RECIPES.filter(r => r.title.toLowerCase().includes(e.target.value.toLowerCase())));
    document.getElementById('planRecipe').innerHTML = matches.length ? matches.map(recipeOption).join('') : '<option value="">No matching recipes</option>';
    document.getElementById('addToPlan').disabled = !matches.length;
  };
  document.getElementById('addToPlan').onclick = () => addPlannedRecipe(document.getElementById('planRecipe').value, Number(document.getElementById('addWeek').value));
  const starter = document.getElementById('starterPlan');
  if (starter) starter.onclick = () => { changePlanner((s,p) => {p.meals = MealPlanner.starterMeals(p, RECIPES);}, 'Eight meals and sides saved. Full batches make 8–12 servings each.'); renderPlanner(); };
  document.getElementById('suggestMeals').onclick = () => {
    const count = document.getElementById('suggestCount');
    if (!count.reportValidity()) return;
    const prefs = {count:Number(count.value)};
    for (const key of ['keto','untried','seafood','chili','beefTips']) prefs[key] = document.getElementById('pref-'+key).checked;
    if (!changePlanner(s => {s.prefs = prefs;}, 'Suggestion preferences saved on this device.')) return;
    plannerSuggestions = MealPlanner.suggest(RECIPES, activePlan(), prefs, getReview);
    document.getElementById('suggestions').innerHTML = suggestionsHtml(activePlan(), true);
    document.getElementById('plannerStatus').textContent = plannerMessage;
  };
  for (const key of ['keto','untried','seafood','chili','beefTips']) {
    document.getElementById('pref-'+key).onchange = e => {
      const value=e.target.checked;
      if(!changePlanner(s=>{s.prefs[key]=value;},'Suggestion preferences saved on this device.'))e.target.checked=!value;
      document.getElementById('plannerStatus').textContent=plannerMessage;
    };
  }
  document.getElementById('extraGroceries').onchange = e => {
    if(changePlanner((s,p) => {p.extra = e.target.value;})) document.getElementById('groceryRows').innerHTML = groceryHtml(activePlan());
    document.getElementById('plannerStatus').textContent = plannerMessage;
  };
  document.getElementById('copyGroceries').onclick = async () => {
    try { await navigator.clipboard.writeText(MealPlanner.groceryText(activePlan(), RECIPES)); document.getElementById('plannerStatus').textContent = 'Grocery list copied.'; }
    catch { document.getElementById('plannerStatus').textContent = 'Copy is unavailable in this browser. Use Download list instead.'; }
  };
  document.getElementById('downloadGroceries').onclick = () => {
    const blob = new Blob([MealPlanner.groceryText(activePlan(), RECIPES)], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'groceries-'+activePlan().start+'.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function weekOptions(plan, selected) { return Array.from({length:plan.weeks}, (_, i) => `<option value="${i+1}" ${selected === i+1 ? 'selected' : ''}>Week ${i+1}</option>`).join(''); }
function weekHtml(plan, week) {
  const meals = plan.meals.filter(m => m.week === week);
  return `<section class="planner-panel"><div class="week-heading"><h3>Week ${week}</h3><span>${MealPlanner.datePlus(plan.start,(week-1)*7)} · ${meals.length} meals</span></div>
    ${meals.length ? meals.map(m => {
      const r = RECIPES.find(r => r.url === m.url), index = plan.meals.indexOf(m), base = MealPlanner.baseServings(r);
      return `<article class="planned-meal"><a href="#recipe/${encodeURIComponent(r.url)}">${escapeHtml(r.title)}</a>
        ${m.side ? `<p>${escapeHtml(m.side)}</p>` : ''}
        <div class="meal-controls"><label>Servings<input type="number" min="1" max="50" step="1" required value="${m.servings}" aria-label="Servings for ${escapeHtml(r.title)}" onchange="updatePlannedMeal(${index}, 'servings', this)"></label>
        <label>Week<select aria-label="Week for ${escapeHtml(r.title)}" onchange="updatePlannedMeal(${index}, 'week', this)">${weekOptions(plan,m.week)}</select></label>
        <button class="text-button" onclick="removePlannedMeal(${index})" aria-label="Remove ${escapeHtml(r.title)} from plan">Remove</button></div>
        <details class="scaled-ingredients"><summary>Ingredients for ${m.servings} servings${base ? '' : ' (check original yield)'}</summary><ul>${MealPlanner.groceries({...plan,meals:[{...m,extras:[]}],extra:'',checked:[]},RECIPES).map(row=>`<li>${escapeHtml(row.text)}</li>`).join('')}</ul><p>Use the original cooking method; larger batches may need extra pans. Original yield: ${escapeHtml(r.yield || 'not specified')}.</p></details>
      </article>`;
    }).join('') : '<p class="planner-hint">No meals yet. Add recipes or choose suggestions below.</p>'}</section>`;
}
function addPlannedRecipe(url, week = 1) {
  const recipe = RECIPES.find(r => r.url === url); if (!recipe) return;
  if (activePlan().meals.length >= 100) { plannerMessage = 'This plan has 100 meals. Start a new plan to add more.'; renderPlanner(); return; }
  if (changePlanner((s,p) => {p.meals.push(MealPlanner.addMeal(p,recipe,week));}, recipe.title+' added and saved.')) plannerSuggestions = plannerSuggestions.filter(r => r.url !== url);
  renderPlanner();
}
function addRecipeFromDetail(urlEncoded) {
  const recipe = RECIPES.find(r=>r.url === decodeURIComponent(urlEncoded)); if(!recipe)return;
  const week=Number(document.getElementById('detailPlanWeek').value);
  const ok=changePlanner((s,p)=>{p.meals.push(MealPlanner.addMeal(p,recipe,week));},recipe.title+' added to your plan.');
  document.getElementById('detailPlanStatus').textContent=ok?`Saved to Week ${week}, ${planDateLabel(activePlan())}.`:plannerMessage;
}
function updatePlannedMeal(index, key, control) {
  if (!control.checkValidity()) { control.reportValidity(); return; }
  changePlanner((s,p) => {p.meals[index][key] = Number(control.value);}); renderPlanner();
}
function removePlannedMeal(index) { changePlanner((s,p) => {p.meals.splice(index,1);}, 'Meal removed and plan saved.'); renderPlanner(); }
function suggestionsHtml(plan, requested = false) {
  const suggestions = plannerSuggestions.filter(r => !plan.meals.some(m => m.url === r.url));
  if (!suggestions.length) return requested ? '<p class="suggestion-notice">No matching unplanned meals remain. Try turning off “Only recipes I haven’t tried” or adjusting your preferences.</p>' : '';
  const less = suggestions.length < readPlanner().prefs.count;
  return `<div class="suggestion-heading"><strong>${suggestions.length} suggestions${less ? ' — fewer matches are available' : ''}</strong><label>Add to<select id="suggestWeek">${weekOptions(plan,1)}</select></label><button class="secondary-button" onclick="addAllSuggestions()">Add all to plan</button></div>
    <div class="suggestion-grid">${suggestions.map(r => `<article class="suggestion-card"><a href="#recipe/${encodeURIComponent(r.url)}">${escapeHtml(r.title)}</a><p>${escapeHtml(r.totalTime || r.prepTime || '')}</p><button class="secondary-button" onclick="addPlannedRecipe(decodeURIComponent('${encodeURIComponent(r.url)}'), Number(document.getElementById('suggestWeek').value))">Add to plan</button></article>`).join('')}</div>`;
}
function addAllSuggestions() {
  const week=Number(document.getElementById('suggestWeek').value);
  if(changePlanner((s,p) => {plannerSuggestions.forEach(r => {if(p.meals.length<100 && !p.meals.some(m => m.url === r.url)) p.meals.push(MealPlanner.addMeal(p,r,week));});}, 'Suggestions added and plan saved.'))plannerSuggestions=[];
  renderPlanner();
}
function groceryHtml(plan) {
  const rows = MealPlanner.groceries(plan,RECIPES);
  if (!rows.length) return '<p class="planner-hint">Add meals to build your grocery list.</p>';
  let category = '', html = '';
  rows.forEach((row,i) => {
    if(row.category !== category) {if(category)html+='</div>';category=row.category;html+=`<h4>${category}</h4><div class="grocery-group">`;}
    html+=`<label class="grocery-item"><input type="checkbox" ${plan.checked.includes(row.checkKey)?'checked':''} onchange="checkGrocery(${i}, this)"><span><span class="grocery-text">${escapeHtml(row.text)}</span><small>${row.sources.map(escapeHtml).join(' · ')}</small></span></label>`;
  });
  return html+'</div>';
}
function checkGrocery(index,control) {
  const row=MealPlanner.groceries(activePlan(),RECIPES)[index];if(!row)return;
  const checked=control.checked;
  if(!changePlanner((s,p) => {p.checked=p.checked.filter(k=>k!==row.checkKey);if(checked)p.checked.push(row.checkKey);}))control.checked=!checked;
  document.getElementById('plannerStatus').textContent=plannerMessage;
}
