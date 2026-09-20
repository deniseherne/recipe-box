const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = __dirname + '/site/';
const elements = new Map();
const storage = new Map();
let rejectWrites = false;
const getElement = id => {
  if (!elements.has(id)) elements.set(id, {innerHTML:'', textContent:'', value:'', checked:false, disabled:false, listeners:{}, addEventListener(type, callback){this.listeners[type]=callback;}, setAttribute(){}});
  return elements.get(id);
};
const ctx = vm.createContext({
  localStorage:{getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>{if(rejectWrites)throw Error('Full');storage.set(key,value);}},
  document:{getElementById:getElement,body:{classList:{remove(){},toggle(){return false;}}}},
  window:{location:{hash:''},addEventListener(){}},history:{replaceState(){}},navigator:{},console,
});
vm.runInContext(fs.readFileSync(root+'recipes.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'app.js','utf8'),ctx);
const url='https://theproteinchef.co/slow-cooker-taco-soup-recipe/';
assert.equal(vm.runInContext('RECIPES.length',ctx),90);
ctx.renderRecipe(encodeURIComponent(url));
assert.match(getElement('app').innerHTML,/My experience/);
const tried=getElement('triedRecipe'),score=getElement('recipeScore');
tried.checked=true;score.value='8';tried.listeners.change();
assert.equal(ctx.getReview(url).tried,true);assert.equal(ctx.getReview(url).score,8);
assert.match(ctx.recipeCardHtml({url,categories:[],title:'Test'}),/Tried.*8\/10/);
ctx.renderTried();assert.match(getElement('app').innerHTML,/Slow Cooker Taco Soup/);
tried.checked=false;tried.listeners.change();assert.equal(score.disabled,true);assert.equal(ctx.getReview(url).score,8);
ctx.renderTried();assert.match(getElement('app').innerHTML,/No tried recipes yet/);
tried.checked=true;score.value='10';rejectWrites=true;tried.listeners.change();
assert.equal(ctx.getReview(url).tried,false);assert.equal(tried.checked,false);assert.match(getElement('reviewStatus').textContent,/Unable to save/);
rejectWrites=false;storage.set('recipeReview:'+url,'{"tried":true,"score":11}');assert.equal(ctx.getReview(url).score,null);
storage.set('recipeReview:'+url,'broken');assert.equal(ctx.getReview(url).tried,false);
console.log('PASS: recipe import, review persistence, scores, cards, Tried filter, retained score, storage failure and invalid data.');
