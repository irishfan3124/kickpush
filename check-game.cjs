const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{};
const gradient={addColorStop:noop};
const context=new Proxy({createLinearGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:noop,set:(t,p,v)=>(t[p]=v,true)});
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},parentElement:{classList:{toggle:noop}},addEventListener:noop,setAttribute:noop,querySelector:()=>({outerHTML:''}),getContext:()=>context,getBoundingClientRect:()=>({width:390,height:420})});return elements.get(id)}
const registry=new Map(),storage=new Map();
const sandbox={console,Math,Set,Promise,AbortController,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener:noop,modelContext:{registerTool:t=>registry.set(t.name,t)}},window:{addEventListener:noop},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,assert,registry};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function advance(seconds){for(let i=0;i<Math.round(seconds*120);i++)step(1/120)}
function flatRun(){start();obstacles.length=0;nextObstacle=100000;}
assert.equal(registry.size,2);
assert.equal(registry.get('get_skate_session').execute().state,'ready');
assert.equal(registry.get('start_skate_run').execute().state,'playing');
assert.throws(()=>registry.get('start_skate_run').execute(),/Finish the current run/);
flatRun();assert.equal(action('flip'),true);assert.equal(action('spin'),true);assert.equal(multiplier(),4);advance(1);assert.equal(scene.height,0);assert.equal(respawn,0);assert.equal(comboBase,950);advance(3.1);assert.equal(score,3800);assert.equal(comboCount,0);assert.equal(best,3800);
flatRun();action('flip');advance(1);action('grind');advance(4);assert.ok(comboCount>0);assert.equal(score,0);release();advance(3.1);assert.ok(score>0);
flatRun();action('spin');advance(1);bail();assert.equal(comboCount,0);assert.equal(score,0);advance(1.3);assert.equal(scene.bail,0);
flatRun();pause();const saved=remaining;advance(1);assert.equal(remaining,saved);resume();advance(1);assert.ok(remaining<saved);
flatRun();obstacles.push({x:5,type:'block',w:60,hit:false});advance(.1);assert.ok(respawn>0);
flatRun();obstacles.push({x:70,type:'block',w:60,hit:false});action('ollie');advance(.5);assert.equal(respawn,0);
flatRun();obstacles.push({x:5,type:'gap',w:85,hit:false});advance(.1);assert.ok(respawn>0);
flatRun();obstacles.push({x:5,type:'rail',w:165,hit:false});action('grind');advance(.1);assert.ok(railActive);assert.equal(scene.grind,true);assert.equal(action('flip'),true);assert.equal(railActive,null);advance(.4);assert.equal(respawn,0);
flatRun();action('flip');advance(.72);assert.equal(action('spin'),false);advance(.4);assert.equal(respawn,0);
flatRun();action('flip');advance(5);assert.equal(score,1350);advance(85.1);assert.equal(state,'finished');assert.equal(remaining,0);start();assert.equal(state,'playing');assert.equal(score,0);assert.equal(remaining,90);
for(const [w,h] of [[390,420],[1200,350],[844,250]]){W=w;H=h;render()}
console.log('PASS: aerial combos, multipliers, banking, manuals, bails, pause, obstacle collisions, rail transitions, late-trick rejection, full run, restart, WebMCP, mobile and desktop rendering.');
`,sandbox);
