const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const P = require('./site/planner-core.js');
const recipes = vm.runInNewContext(fs.readFileSync(__dirname+'/site/recipes.js','utf8')+';RECIPES');
let p = P.freshPlan(); p.start='2026-09-21'; p.meals=P.starterMeals(p,recipes);
assert.equal(p.meals.length,8);
assert.equal(p.meals.filter(m=>m.week===2).length,4);
assert.ok(p.meals.every(m=>m.servings>=8));
let list=P.groceries(p,recipes);
const find=(name,unit)=>list.find(r=>r.name===name&&r.unit===unit);
assert.equal(find('eggs','').quantity,20); // 4 for parmesan, 4 Tex-Mex, 12 frittata
assert.equal(find('heavy cream','tsp').quantity,120); // 4 tbsp + 1 cup + 4 tbsp + 1/2 cup + 1/2 cup
assert.equal(find('olive oil','tsp').quantity,93); // mains 45 tsp, sides 48 tsp
assert.equal(find('ground beef','oz').quantity,48);
assert.equal(find('bacon slices','').quantity,14);
assert.equal(find('zucchini','').quantity,8);
assert.equal(find('avocados','').quantity,8);
assert.ok(list.some(r=>r.text.includes('skin-on, bone-in chicken thighs')));
assert.ok(list.some(r=>r.text.includes('skinless, boneless chicken breast')));
assert.ok(list.some(r=>r.text.includes('chopped, cooked broccoli')));
assert.match(P.groceryText(p,recipes),/2026-10-04/);
assert.match(P.groceryText(p,recipes),/3 lb ground beef/);
const checkedRow=find('zucchini','');p.checked=[checkedRow.checkKey];
assert.match(P.groceryText(p,recipes),/\[x\] 8 zucchini/);
p.meals[0].servings=16;
assert.notEqual(P.groceries(p,recipes).find(r=>r.name==='zucchini').checkKey,checkedRow.checkKey);
assert.deepEqual(P.parseIngredient('1 1/2 tsp salt',2),{name:'salt',quantity:3,unit:'tsp',factor:2,raw:false});
assert.equal(P.parseIngredient('½ cup cream',2).quantity,48);
assert.equal(P.parseIngredient('1-2 tsp spice',2).raw,true);
assert.equal(P.parseIngredient('1 (8 ounce) package cheese',2).quantity,2);
assert.equal(P.parseIngredient('salt to taste',2).raw,true);
const clean=P.cleanState({plans:[p,{id:'bad',start:'2026-02-30'}],active:p.id,prefs:{count:999,keto:false}},recipes);
assert.equal(clean.plans.length,1);assert.equal(clean.prefs.count,14);assert.equal(clean.prefs.keto,false);
assert.equal(P.cleanState({plans:[null,{}]},recipes).plans.length,1);
const testPrefs={...P.DEFAULT_PREFS,count:14};
const suggestions=P.suggest(recipes,p,testPrefs,()=>({tried:false}),()=>.5);
assert.ok(suggestions.length>0);
assert.ok(suggestions.every(r=>!p.meals.some(m=>m.url===r.url)));
assert.ok(suggestions.every(r=>!/chili|chilli|beef tips|salmon|tuna|shrimp/i.test(r.title)));
assert.equal(P.suggest(recipes,p,testPrefs,()=>({tried:true})).length,0);
assert.equal(P.eligible({title:'Chicken fajitas',ingredients:['chili powder'],categories:['Chicken']},{...testPrefs,keto:false},{tried:false}),true);
assert.equal(P.eligible({title:'Low-carb shrimp',ingredients:[],categories:[]},testPrefs,{}),false);
// Browser storage integration: reload, isolation, and failed writes must retain prior data.
const storage=new Map(), elements=new Map();let reject=false;
const getElement=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',checked:false,setAttribute(){},addEventListener(){}});return elements.get(id);};
function browser(){
  const ctx=vm.createContext({console,MealPlanner:P,RECIPES:recipes,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(reject)throw Error('blocked');storage.set(k,v);}},
    document:{getElementById:getElement},getReview:()=>({tried:false}),renderSidebar(){},sortRecipes:r=>r,
    escapeHtml:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
  vm.runInContext(fs.readFileSync(__dirname+'/site/planner.js','utf8'),ctx);return ctx;
}
let browser1=browser();browser1.changePlanner((s,p)=>{p.meals=P.starterMeals(p,recipes);p.extra='2 avocados';});
let browser2=browser();assert.equal(browser2.activePlan().meals.length,8);assert.equal(browser2.activePlan().extra,'2 avocados');
reject=true;assert.equal(browser2.changePlanner((s,p)=>{p.meals=[];}),false);assert.equal(browser2.activePlan().meals.length,8);
reject=false;browser2.changePlanner((s,p)=>{const next=P.freshPlan();next.id='another-plan';s.plans.push(next);s.active=next.id;});
assert.equal(browser2.activePlan().meals.length,0);assert.equal(browser2.readPlanner().plans[0].meals.length,8);
browser2.changePlanner((s,p)=>{p.extra='<img src=x onerror=alert(1)>';});browser2.renderPlanner();
assert.ok(!getElement('app').innerHTML.includes('<img src=x'));
console.log('PASS: starter plan, exact scaled totals, sides, package/fraction handling, checklist quantities, date validation, suggestion exclusions, storage reload, failed writes, plan isolation, and escaped custom text.');
