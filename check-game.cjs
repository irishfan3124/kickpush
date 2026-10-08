const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const noop = () => {}, gradient = { addColorStop: noop };
const drawing = new Proxy({ createLinearGradient: () => gradient }, {get: (t,k) => k in t ? t[k] : noop, set: (t,k,v) => (t[k]=v,true)});
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {textContent:'',hidden:false,style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},parentElement:{classList:{toggle:noop}},addEventListener:noop,setAttribute:noop,querySelector:()=>({outerHTML:''}),getContext:()=>drawing,getBoundingClientRect:()=>({width:390,height:420})});
  return elements.get(id);
}
const registry = new Map(), storage = new Map();
const sandbox = {console,Math,Set,Map,Promise,AbortController,devicePixelRatio:1,assert,registry,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener:noop,modelContext:{registerTool:t=>registry.set(t.name,t)}},window:{addEventListener:noop},ResizeObserver:class{observe(){}},requestAnimationFrame:noop};
vm.createContext(sandbox);
const source = fs.readFileSync('dist/game.js','utf8') + '\n' + fs.readFileSync('dist/skating.js','utf8');
vm.runInContext(source + `
function advance(seconds,hz=120){for(let i=0;i<Math.round(seconds*hz);i++)step(1/hz)}
function flatRun(){start();obstacles.length=0;nextObstacle=100000;selectedFlip='kickflip';selectedSpin='360'}
function seededRun(seed){start();obstacles.length=0;nextObstacle=700;courseIndex=0;courseBag=[];courseSeed=seed;populate()}
assert.equal(registry.size,2);
assert.equal(registry.get('get_skate_session').execute().state,'ready');
assert.equal(registry.get('start_skate_run').execute().state,'playing');
assert.throws(()=>registry.get('start_skate_run').execute(),/Finish the current run/);

// Real-course regression: one trick scores before an obstacle; a later bail preserves it.
for(const hz of [30,60,120])for(let seed=1;seed<=12;seed++){
  seededRun(seed);action('flip');advance(1.8,hz);assert.equal(score,1350);assert.equal(runBanks,1);
  assert.ok(scene.distance<obstacles[0].x);const saved=score;bail();assert.equal(score,saved);
}
// Automatic ramp air must bank before the next feature, even at the fastest cruising speed.
for(const type of ['kicker','ramp'])for(const hz of [30,60,120]){
  flatRun();remaining=10;obstacles.push({x:5,type,w:165,hit:false},{x:740,type:'barrier',w:50,hit:false});
  advance(2.3,hz);assert.ok(score>=200);assert.equal(runBails,0);assert.ok(scene.distance<740);
}
flatRun();action('flip');action('spin');assert.equal(multiplier(),4);
assert.equal(action('bank'),false);advance(.96);assert.equal(scene.height,0);assert.equal(comboBase,950);
assert.equal(action('bank'),true);assert.equal(score,3800);assert.equal(comboCount,0);assert.equal(action('bank'),false);
const protectedScore=score;action('flip');advance(.3);bail();assert.equal(score,protectedScore);

// A manual deliberately extends a combo, but releasing or banking always cashes it in.
flatRun();action('flip');advance(.5);action('grind');advance(1.3);
assert.equal(score,0);assert.ok(manualActive);assert.ok(comboCount>=3);release();advance(.72);assert.ok(score>0);assert.equal(respawn,0);
flatRun();action('grind');advance(MANUAL_LIMIT+.1);assert.equal(score,0);assert.equal(runBails,1);
flatRun();action('grind');advance(.4);assert.equal(action('bank'),true);const manualBank=score;advance(.5);assert.equal(score,manualBank);assert.equal(hold,false);

// Air trick variants, grabs and landing in switch stance.
for(const variant of Object.keys(FLIPS)){
  flatRun();selectedFlip=variant;assert.equal(action('flip'),true);advance(1.8);
  assert.equal(score,(100+FLIPS[variant].points)*3);assert.equal(runBails,0);
}
for(const variant of Object.keys(SPINS)){
  flatRun();selectedSpin=variant;action('spin');advance(1);assert.equal(stance,variant==='360'?1:-1);assert.equal(runBails,0);
}
flatRun();selectedSpin='180';action('spin');advance(1);action('flip');
assert.equal(comboBase,350+100*.65*1.2+350*1.2);bail();assert.equal(pendingSwitch,false);
flatRun();action('flip');assert.equal(action('grab'),false);advance(.38);assert.equal(action('grab'),true);advance(1.4);assert.equal(runBails,0);assert.equal(score,3000);
flatRun();action('grab');action('spin');advance(1.8);assert.equal(score,3600);
flatRun();action('flip');advance(.72);assert.equal(action('spin'),false);advance(1);assert.equal(runBails,0);
flatRun();addTrick('Kickflip',350);addTrick('360 Spin',500);addTrick('Kickflip',350);assert.equal(comboBase,350+500+350*.65);
flatRun();pause();const savedTime=remaining;advance(1);assert.equal(remaining,savedTime);resume();advance(1);assert.ok(remaining<savedTime);

// Every solid obstacle is jumpable, and every grind feature can be banked or popped out of.
for(const type of ['block','stairs','barrier','planter','gap']){
  flatRun();obstacles.push({x:5,type,w:60,hit:false});advance(.1);assert.equal(runBails,1);
  flatRun();obstacles.push({x:70,type,w:95,hit:false});action('ollie');advance(1.8);assert.equal(runBails,0,type);assert.ok(score>0);
}
for(const type of ['rail','downrail','ledge','bench']){
  flatRun();obstacles.push({x:5,type,w:165,hit:false});action('grind');advance(.1);
  assert.ok(railActive);assert.equal(scene.grind,true);assert.ok(comboNames.includes(OBSTACLE_TYPES[type].grind));
  assert.equal(action('bank'),true);assert.equal(railActive,null);advance(1.1);assert.equal(runBails,0,type);assert.ok(score>0);
  flatRun();obstacles.push({x:5,type,w:165,hit:false});action('grind');advance(.1);assert.equal(action('flip'),true);assert.equal(railActive,null);advance(.4);assert.equal(runBails,0);
}

// Full generated runs check real pacing rather than an empty park.
const layouts=new Set();
for(let seed=1;seed<=16;seed++){
  seededRun(seed);layouts.add(obstacles.map(ob=>ob.type+':'+ob.w+':'+ob.x).join(','));const seen=new Set();
  for(let frame=0;frame<90*60+1&&state==='playing';frame++){
    const ob=obstacles.find(item=>item.x+item.w>=scene.distance);
    if(ob){seen.add(ob.type);const def=OBSTACLE_TYPES[ob.type],ahead=ob.x-scene.distance;
      if(def.grind&&ahead<10&&scene.distance<=ob.x+ob.w)action('grind');else if(hold&&!railActive)release();
      if(!def.launch&&!def.grind&&ahead<70&&ahead>0&&scene.height===0)action('flip');
      if(railActive&&scene.distance-railActive.x>30)action('bank');
    }
    step(1/60);
  }
  assert.equal(state,'finished');assert.ok(runBanks>=15,'Multiple separate banks on seed '+seed);
  assert.ok(score>10000);assert.ok(seen.size>=10,'Obstacle variety on seed '+seed);assert.equal(runBails,0,'Playable course on seed '+seed);
}
assert.ok(layouts.size>1);start();assert.equal(state,'playing');assert.equal(score,0);assert.equal(remaining,90);
for(const [width,height]of[[390,330],[1200,350],[844,230]]){
  W=width;H=height;obstacles.length=0;Object.keys(OBSTACLE_TYPES).forEach((type,index)=>obstacles.push({x:index*80,type,w:100}));render();
}
console.log('PASS: banking before real obstacles at 30/60/120 fps, instant banking, protected scores, manual balance, trick variants, switch bonuses, repeated-trick penalties, eleven obstacles, grind exits, sixteen full 90-second courses, responsive rendering and WebMCP.');
`,sandbox);
