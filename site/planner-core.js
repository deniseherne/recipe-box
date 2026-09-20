/* Meal planning and grocery calculations, shared by the app and its tests. */
(function (root) {
  const STARTER = [
    {title:'Keto Chicken Parmesan', servings:8, side:'Zucchini noodles and green salad', extras:['4 zucchini','8 cups mixed salad greens','4 tablespoons olive oil','2 tablespoons white wine vinegar']},
    {title:'Easy Sheet Pan Chicken Fajitas', servings:10, side:'Lettuce wraps, avocado and sour cream; no tortillas or rice', extras:['2 heads butter lettuce','4 avocados','1 cup sour cream']},
    {title:'Keto Chicken and Broccoli Casserole', servings:12, side:'Cucumber salad', extras:['3 cucumbers','2 tablespoons olive oil','2 tablespoons white wine vinegar']},
    {title:'Keto Tex-Mex Ground Beef Casserole', servings:12, side:'Avocado and shredded lettuce', extras:['4 avocados','1 head romaine lettuce']},
    {title:'Keto Smothered Chicken Thighs', servings:8, side:'Roasted asparagus', extras:['2 pounds asparagus','2 tablespoons olive oil']},
    {title:'Low-Carb Italian Chicken Tenders', servings:8, side:'Roasted zucchini and green salad', extras:['4 zucchini','8 cups mixed salad greens','4 tablespoons olive oil','2 tablespoons white wine vinegar']},
    {title:'Keto Sheet Pan Frittata', servings:8, side:'Green salad', extras:['8 cups mixed salad greens','2 tablespoons olive oil','1 tablespoon white wine vinegar']},
    {title:'Lemon-Roasted Chicken', servings:12, side:'Cauliflower mash and sauteed spinach', extras:['2 heads cauliflower','2 pounds fresh spinach','4 tablespoons butter','1/2 cup heavy cream','2 tablespoons olive oil']}
  ];
  const DEFAULT_PREFS = {keto:true, untried:true, seafood:true, chili:true, beefTips:true, count:4};
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00')) && new Date(value+'T12:00:00').getDate() === Number(value.slice(-2));
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function datePlus(date, days) { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()+days); return localDate(d); }
  function baseServings(recipe) { const n = Number.parseFloat(recipe.yield); return n > 0 ? n : null; }
  function freshPlan() { return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),start:localDate(),weeks:2,servings:8,meals:[],checked:[],extra:''}; }
  function cleanPlan(p, recipes) {
    if (!p || typeof p !== 'object' || !validDate(p.start) || typeof p.id !== 'string') return null;
    const weeks = p.weeks === 1 ? 1 : 2;
    return {id:p.id.slice(0,80),start:p.start,weeks,servings:clamp(p.servings,8,1,50),extra:typeof p.extra==='string'?p.extra.slice(0,10000):'',
      checked:Array.isArray(p.checked)?p.checked.filter(x=>typeof x==='string').slice(0,1000):[],
      meals:(Array.isArray(p.meals)?p.meals:[]).filter(m=>m && recipes.some(r=>r.url===m.url)).slice(0,100).map((m,i)=>({
        id:typeof m.id==='string'?m.id.slice(0,80):'meal-'+i,url:m.url,week:m.week===2 && weeks===2?2:1,
        servings:clamp(m.servings,8,1,50),side:typeof m.side==='string'?m.side.slice(0,500):'',
        extras:Array.isArray(m.extras)?m.extras.filter(x=>typeof x==='string').slice(0,50):[],extraBase:clamp(m.extraBase,8,1,50)
      }))};
  }
  function clamp(n, fallback, min, max) { n=Number(n); return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback; }
  function cleanState(raw, recipes) {
    const plans=(Array.isArray(raw?.plans)?raw.plans:[]).map(p=>cleanPlan(p,recipes)).filter(Boolean).slice(0,100);
    if (!plans.length) plans.push(freshPlan());
    const prefs={...DEFAULT_PREFS};
    for(const key of ['keto','untried','seafood','chili','beefTips']) if(typeof raw?.prefs?.[key]==='boolean') prefs[key]=raw.prefs[key];
    prefs.count=clamp(raw?.prefs?.count,4,1,14);
    return {version:1,plans,active:plans.some(p=>p.id===raw?.active)?raw.active:plans[0].id,prefs};
  }
  function addMeal(plan,recipe,week=1,servings=plan.servings) {
    return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),url:recipe.url,week:week===2&&plan.weeks===2?2:1,servings,side:'',extras:[],extraBase:servings};
  }
  function starterMeals(plan,recipes) {
    return STARTER.map((s,i)=>{
      const r=recipes.find(r=>r.title===s.title); if(!r)return null;
      return {...addMeal(plan,r,plan.weeks===2&&i>=4?2:1,s.servings),side:s.side,extras:s.extras,extraBase:s.servings};
    }).filter(Boolean);
  }
  function eligible(recipe,prefs,review) {
    const title=recipe.title.toLowerCase(); const ingredients=recipe.ingredients.join(' ').toLowerCase();
    if(prefs.seafood && /\b(salmon|tuna|shrimp|prawn|fish|cod|tilapia|haddock|halibut|trout|sardine|anchov\w*|crab|lobster|clam|mussel|oyster|scallop|seafood)\b/.test(title+' '+ingredients))return false;
    if(prefs.chili && /\bchill?i\b/.test(title))return false;
    if(prefs.beefTips && /beef tips/.test(title))return false;
    if(prefs.untried && review?.tried)return false;
    if(/\b(cookies?|cake|mousse|smoothie|bark|granola|sauce|dip|marinade|pesto|crisps|spinach squares|sausage balls|protein bites)\b/.test(title))return false;
    if(recipe.categories.includes('Side')||recipe.categories.includes('Dessert')||recipe.categories.includes('Snack'))return false;
    if(/broccoli salad|roasted leeks|zucchini hash|creamed spinach/.test(title))return false;
    if(prefs.keto && !(/keto|low.carb/.test(title) || STARTER.some(s=>s.title===recipe.title) || ['Cobb Salad','Delicious Egg Salad'].includes(recipe.title)))return false;
    return true;
  }
  function suggest(recipes,plan,prefs,getReview,random=Math.random) {
    const planned=new Set(plan.meals.map(m=>m.url));
    const candidates=recipes.filter(r=>!planned.has(r.url)&&eligible(r,prefs,getReview(r.url)));
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    return candidates.slice(0,clamp(prefs.count,4,1,14));
  }
  function numberValue(s) { return s.trim().split(/\s+/).reduce((sum,n)=>sum+(n.includes('/')?Number(n.split('/')[0])/Number(n.split('/')[1]):Number(n)),0); }
  function amount(n) {
    const rounded=Math.round(n*100)/100;
    return String(rounded);
  }
  function parseIngredient(line,factor) {
    const normalized=line.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g,c=>' '+({'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'}[c])).trim();
    const match=normalized.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/);
    // Ranges and package sizes stay explicit; never infer a weight for a cup or a whole item.
    if(!match || /^[-–]/.test(match[2]))return {name:line,quantity:null,unit:'',factor,raw:true};
    let quantity=numberValue(match[1])*factor,rest=match[2],unit='';
    const units=rest.match(/^(cups?|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|ounces?|oz)\b\s*/i);
    if(units){const u=units[1].toLowerCase();rest=rest.slice(units[0].length);if(/^(cup|tablespoon|tbsp|teaspoon|tsp)/.test(u)){unit='tsp';quantity*=u.startsWith('cup')?48:/^(tablespoon|tbsp)/.test(u)?3:1;}else{unit='oz';quantity*= /^(pound|lb)/.test(u)?16:1;}}
    return {name:rest,quantity,unit,factor,raw:false};
  }
  function canonical(name) {
    // Strip only a trailing preparation instruction. Commas can be part of the
    // ingredient itself ("skinless, boneless chicken" or "chopped, cooked broccoli").
    let n=name.toLowerCase().replace(/,\s*(?:crushed|divided|cubed|sliced|chopped|minced|thawed|thawed and drained|cut into .+|white and green parts separated and sliced|chopped and cooked crisp)$/,'').replace(/\s+/g,' ').trim();
    const aliases={'heavy whipping cream':'heavy cream','extra virgin olive oil':'olive oil','large eggs':'eggs','large egg':'eggs','egg':'eggs','grated parmesan cheese':'grated parmesan','grated sharp cheddar cheese':'cheddar cheese','grated cheddar cheese':'cheddar cheese','cheddar':'cheddar cheese','shredded cheddar cheese':'cheddar cheese','ground black pepper':'black pepper','cloves garlic':'garlic cloves','clove garlic':'garlic cloves','slices bacon':'bacon slices','slice bacon':'bacon slices','heads cauliflower':'cauliflower heads','head cauliflower':'cauliflower heads'};
    return aliases[n]||n;
  }
  function category(name) {
    if(/broth|stock/.test(name))return 'Pantry & seasonings';
    if(/chicken|ground beef|bacon|turkey|pork(?! rind)|sausage/.test(name))return 'Meat & poultry';
    if(/cheese|cheddar|parmesan|mozzarella|cream|butter$|ghee|eggs?\b/.test(name))return 'Dairy & eggs';
    if(/lettuce|salad greens|zucchini|avocado|cucumber|asparagus|spinach|cauliflower heads|onions?|mushroom|bell peppers|lemon|garlic cloves|rosemary/.test(name) && !/powder|dried/.test(name))return 'Produce';
    if(/broccoli|frozen|riced cauliflower/.test(name))return 'Vegetables / frozen';
    return 'Pantry & seasonings';
  }
  function displayQuantity(quantity,unit) {
    if(unit==='tsp') {if(quantity>=24)return amount(quantity/48)+' cups';if(quantity>=3)return amount(quantity/3)+' tbsp';return amount(quantity)+' tsp';}
    if(unit==='oz')return quantity>=16?amount(quantity/16)+' lb':amount(quantity)+' oz';
    return amount(quantity);
  }
  function groceries(plan,recipes) {
    const rows=new Map();
    function add(line,factor,source){
      const parsed=parseIngredient(line,factor);const name=canonical(parsed.name);
      const key=parsed.raw?'raw|'+line+'|'+factor:name+'|'+parsed.unit;
      if(!rows.has(key))rows.set(key,{key,name,unit:parsed.unit,quantity:parsed.raw?null:0,raw:parsed.raw,factor,line,sources:[],category:category(name)});
      const row=rows.get(key);if(!parsed.raw)row.quantity+=parsed.quantity;
      if(!row.sources.includes(source))row.sources.push(source);
    }
    plan.meals.forEach(m=>{const r=recipes.find(r=>r.url===m.url);if(!r)return;const base=baseServings(r);r.ingredients.forEach(line=>add(line,base?m.servings/base:1,r.title+(base?'':' (original quantities; yield unknown)')));m.extras.forEach(line=>add(line,m.servings/m.extraBase,r.title+' — side'));});
    plan.extra.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>add(line,1,'Extra item'));
    return [...rows.values()].map(row=>({...row,text:row.raw?(row.factor===1?row.line:row.line+' — '+amount(row.factor)+'× recipe quantity'):displayQuantity(row.quantity,row.unit)+' '+row.name,
      // Changing a quantity creates a new checklist key instead of hiding a new shopping need.
      checkKey:row.key+'|'+(row.raw?row.factor:amount(row.quantity))})).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
  }
  function groceryText(plan,recipes) {
    const rows=groceries(plan,recipes);
    let text=`GROCERY LIST\n${plan.start} through ${datePlus(plan.start,plan.weeks*7-1)}\n\nMeals:\n`;
    plan.meals.forEach(m=>{const r=recipes.find(r=>r.url===m.url);if(r)text+=`- Week ${m.week}: ${r.title} (${m.servings} servings)${m.side?' + '+m.side:''}\n`;});
    text+='\nQuantities are recipe totals, not rounded store packages. Check pantry supplies. Different forms or units stay separate.\n';
    let cat='';for(const row of rows){if(row.category!==cat){cat=row.category;text+='\n'+cat.toUpperCase()+'\n';}text+=`[${plan.checked.includes(row.checkKey)?'x':' '}] ${row.text}\n`;}
    return text;
  }
  const api={STARTER,DEFAULT_PREFS,localDate,datePlus,baseServings,freshPlan,cleanState,cleanPlan,clamp,addMeal,starterMeals,eligible,suggest,parseIngredient,groceries,groceryText};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MealPlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this);
