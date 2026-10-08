'use strict';
const canvas=document.getElementById('park'),ctx=canvas.getContext('2d');
let W=1200,H=560,tick=0;
const scene={distance:0,height:0,flip:0,spin:0,grind:false,bail:0,grab:0,shuvit:0,stance:1,balance:1,spinTurns:1};
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;canvas.width=W*Math.min(devicePixelRatio||1,2);canvas.height=H*Math.min(devicePixelRatio||1,2);ctx.setTransform(Math.min(devicePixelRatio||1,2),0,0,Math.min(devicePixelRatio||1,2),0,0);}
new ResizeObserver(resize).observe(canvas);
function poly(points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
function line(points,color,width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function box(x,y,w,h,depth,color,side,top){poly([[x,y-h],[x+w,y-h],[x+w,y],[x,y]],color);poly([[x+w,y],[x+w+depth,y-depth*.55],[x+w+depth,y-h-depth*.55],[x+w,y-h]],side);poly([[x,y-h],[x+depth,y-h-depth*.55],[x+w+depth,y-h-depth*.55],[x+w,y-h]],top);}
function tree(x,y,s){ellipse(x+8*s,y+2*s,22*s,6*s,'#728b7c20');line([[x,y],[x,y-65*s]],'#77937b',5*s);ellipse(x,y-74*s,24*s,31*s,'#8caf90');ellipse(x-14*s,y-61*s,20*s,23*s,'#9cbb98');ellipse(x+15*s,y-60*s,22*s,26*s,'#83a98b');}
function render(){
 ctx.clearRect(0,0,W,H);const mobile=W<600;const horizon=H*(mobile?.47:.40),ground=H*.78;const scale=Math.min(W/950,H/450)*(mobile?1.25:1);const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#c2d8cc');sky.addColorStop(1,'#dce7c9');ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon+80);
 ellipse(W*.74,horizon*.52,34*scale,34*scale,'#f4edb7');
 // The skyline and park scroll at different speeds with the rider.
 const cityOffset=(scene.distance*.12)%310;for(let i=-1;i<W/240+2;i++){const x=i*250-cityOffset,bh=(i%3===0?108:70)*scale;box(x,horizon,120*scale,bh,18*scale,['#a8beb4','#b0c7b7','#b8c8b7'][Math.abs(i)%3],'#99b3a7','#c1d1bd');for(let r=0;r<3;r++)for(let c=0;c<5;c++){ctx.fillStyle='#d3dfc7';ctx.fillRect(x+13*scale+c*20*scale,horizon-bh+14*scale+r*19*scale,7*scale,10*scale);} }
 poly([[0,horizon+12],[W,horizon+12],[W,H],[0,H]],'#bfd3be');poly([[0,horizon+50*scale],[W,horizon+50*scale],[W,H],[0,H]],'#b3c8ba');
 const fenceY=horizon+43*scale;line([[0,fenceY],[W,fenceY]],'#8da795',2*scale);line([[0,fenceY-24*scale],[W,fenceY-24*scale]],'#91ac99',2*scale);for(let x=-(scene.distance*.3)%55;x<W;x+=55)line([[x,fenceY+5],[x,fenceY-25*scale]],'#91ac99',2*scale);
 for(let i=-1;i<6;i++)tree(i*310-(scene.distance*.25)%310+90,horizon+40*scale,.65*scale);
 const slabs=(scene.distance*.6)%210;for(let i=-2;i<W/200+3;i++)line([[i*210-slabs,horizon+56*scale],[i*210-slabs-230,H]],'#9fb7a266',1);
 line([[0,ground+26*scale],[W,ground+26*scale]],'#c9d8c7',1);
 // A quarter pipe, ledges and rails make the playable lane.
 const set=typeof obstacles==='undefined'?[{x:800,type:'ramp',w:155},{x:1320,type:'rail',w:170},{x:1960,type:'block',w:70}]:obstacles;
 for(const ob of set){const x=W*.28+(ob.x-scene.distance)*scale;if(x<-250*scale||x>W+250*scale)continue;const y=ground;
 if(ob.type==='ramp'||ob.type==='kicker'){const w=ob.w*scale,h=(ob.type==='kicker'?36:67)*scale,d=27*scale;poly([[x+5,y+12],[x+w+40,y-9],[x+w+d,y-30],[x+w,y]],'#7c9a8a36');ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+w*.72,y-3,x+w,y-h);ctx.lineTo(x+w,y);ctx.closePath();ctx.fillStyle=ob.type==='kicker'?'#dfbb77':'#dc9d8b';ctx.fill();poly([[x+w,y-h],[x+w+d,y-h-d*.5],[x+w+d,y-d*.5],[x+w,y]],ob.type==='kicker'?'#bd9f65':'#b98178');line([[x,y],[x+d,y-d*.5]],'#e6b5a1',2*scale);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+w*.72,y-3,x+w,y-h);ctx.strokeStyle='#e9b9a3';ctx.lineWidth=3*scale;ctx.stroke();line([[x+w,y-h],[x+w+d,y-h-d*.5]],'#405850',3*scale);}
 if(ob.type==='rail'){ellipse(x+ob.w*scale*.5+12*scale,y+7*scale,ob.w*scale*.6,6*scale,'#6f8e7933');line([[x+10*scale,y],[x+10*scale,y-45*scale],[x+(ob.w-10)*scale,y-45*scale],[x+(ob.w-10)*scale,y]],'#526d61',5*scale);line([[x-5*scale,y-47*scale],[x+(ob.w+5)*scale,y-47*scale]],'#e0e3c2',5*scale);}
 if(ob.type==='block'){poly([[x+8,y+8],[x+ob.w*scale+35*scale,y-8],[x+ob.w*scale,y-14],[x,y]],'#71908033');box(x,y,ob.w*scale,29*scale,20*scale,'#9d98b7','#817e9b','#c4bcce');line([[x,y-29*scale],[x+ob.w*scale,y-29*scale]],'#e0d5e5',3*scale);}
 if(ob.type==='gap'){poly([[x,y-3],[x+ob.w*scale,y-3],[x+ob.w*scale+22*scale,y+22*scale],[x-10*scale,y+22*scale]],'#5b756a');line([[x,y-3],[x+ob.w*scale,y-3]],'#e7d6a7',4*scale);}
 if(ob.type==='downrail'){const w=ob.w*scale;ellipse(x+w*.5,y+8*scale,w*.55,6*scale,'#6f8e7933');line([[x+8*scale,y],[x+8*scale,y-60*scale],[x+w-8*scale,y-24*scale],[x+w-8*scale,y]],'#526d61',5*scale);line([[x,y-62*scale],[x+w,y-22*scale]],'#f0dfa7',5*scale);}
 if(ob.type==='ledge'){box(x,y,ob.w*scale,34*scale,23*scale,'#909dad','#748590','#b7c5cb');line([[x,y-34*scale],[x+ob.w*scale,y-34*scale]],'#e8e5ce',4*scale);}
 if(ob.type==='bench'){const w=ob.w*scale;line([[x+15*scale,y],[x+15*scale,y-34*scale],[x+w-15*scale,y-34*scale],[x+w-15*scale,y]],'#6f7560',6*scale);box(x,y-30*scale,w,8*scale,16*scale,'#d3aa77','#a68663','#e8c395');for(let i=1;i<4;i++)line([[x+w*i/4,y-38*scale],[x+w*i/4+16*scale,y-47*scale]],'#bd986c',1.5*scale);}
 if(ob.type==='stairs'){const step=ob.w/4;for(let i=0;i<4;i++)box(x+i*step*scale,y,step*scale,(4-i)*12*scale,20*scale,'#969fb9','#7f8ba4','#bcc6d3');}
 if(ob.type==='barrier'){const w=ob.w*scale;line([[x+7*scale,y],[x+12*scale,y-55*scale],[x+w-12*scale,y-55*scale],[x+w-7*scale,y]],'#647363',5*scale);box(x,y-25*scale,w,33*scale,12*scale,'#d5a066','#ad8053','#ebbc85');for(let i=0;i<3;i++)poly([[x+(i*20+4)*scale,y-58*scale],[x+(i*20+12)*scale,y-58*scale],[x+(i*20+25)*scale,y-25*scale],[x+(i*20+17)*scale,y-25*scale]],'#f2e8c4');}
 if(ob.type==='planter'){box(x,y,ob.w*scale,34*scale,18*scale,'#b98677','#966e64','#cba092');for(let i=0;i<3;i++)ellipse(x+(12+i*(ob.w-24)/2)*scale,y-39*scale,(ob.w/5)*scale,12*scale,['#819773','#8fa681','#9aaf86'][i]);}
 }
 // Skater is articulated so each trick has its own readable animation.
 const x=W*.28,y=ground-scene.height*scale,ss=scale*(mobile?1.16:1.14);ellipse(x+14*ss,ground+10*ss,35*ss,8*ss,'#526a4b28');ctx.save();ctx.translate(x,y);if(scene.bail)ctx.rotate(Math.sin(tick*20)*.7);const crouch=scene.height>0?8+scene.grab*12:Math.sin(tick*7)*1.3;const rot=scene.spin?Math.sin(scene.spin*Math.PI)*.8:scene.grind?-.06*(2-scene.balance):0;ctx.scale((scene.spin?Math.cos(scene.spin*Math.PI*2*scene.spinTurns)*.65+.35:1)*scene.stance,1);ctx.rotate(rot);
 const leg='#34493f',shirt='#f2f0d5';line([[-8*ss,(-41+crouch)*ss],[-19*ss,(-20+crouch)*ss],[-14*ss,-6*ss]],leg,10*ss);line([[5*ss,(-40+crouch)*ss],[21*ss,(-24+crouch)*ss],[18*ss,-6*ss]],leg,10*ss);
 line([[-17*ss,-6*ss],[-6*ss,-5*ss]],'#f4eee0',7*ss);line([[13*ss,-6*ss],[24*ss,-6*ss]],'#f4eee0',7*ss);
 poly([[-15*ss,(-76+crouch)*ss],[4*ss,(-78+crouch)*ss],[16*ss,(-44+crouch)*ss],[-10*ss,(-38+crouch)*ss]],shirt);line([[-11*ss,(-69+crouch)*ss],[-25*ss,(-56+crouch)*ss],[(scene.grab?-20:-39)*ss,((scene.grab?-18:-59)+crouch)*ss]],'#bf9475',6*ss);line([[5*ss,(-69+crouch)*ss],[22*ss,(-58+crouch)*ss],[36*ss,(-64+crouch)*ss]],'#bf9475',6*ss);line([[-11*ss,(-70+crouch)*ss],[-18*ss,(-62+crouch)*ss]],shirt,11*ss);line([[4*ss,(-70+crouch)*ss],[13*ss,(-64+crouch)*ss]],shirt,11*ss);
 line([[-4*ss,(-80+crouch)*ss],[-6*ss,(-86+crouch)*ss]],'#bc9171',8*ss);ellipse(-7*ss,(-93+crouch)*ss,10*ss,12*ss,'#c89d7b');poly([[-18*ss,(-96+crouch)*ss],[-16*ss,(-105+crouch)*ss],[0,(-107+crouch)*ss],[5*ss,(-98+crouch)*ss]],'#d5f367');line([[-16*ss,(-98+crouch)*ss],[9*ss,(-98+crouch)*ss]],'#879950',3*ss);
 ctx.save();ctx.translate(3*ss,2*ss);ctx.rotate(scene.flip?scene.flip*Math.PI*2:scene.grind?-.13:scene.grab?-.18:0);if(scene.shuvit)ctx.scale(Math.cos(scene.shuvit*Math.PI*2),1);line([[-31*ss,-3*ss],[-25*ss,0],[23*ss,0],[30*ss,-5*ss]],'#253c35',5*ss);line([[-22*ss,2*ss],[21*ss,2*ss]],'#d8ee70',2*ss);ellipse(-18*ss,7*ss,4*ss,4*ss,'#ececce');ellipse(18*ss,7*ss,4*ss,4*ss,'#ececce');ctx.restore();ctx.restore();
 // Foreground paint, curb and fast-moving joints.
 poly([[0,H-27*scale],[W,H-27*scale],[W,H],[0,H]],'#a1b49f');line([[0,H-27*scale],[W,H-27*scale]],'#d6dfc1',3*scale);for(let x=-(scene.distance*scale)%115;x<W;x+=115*scale)line([[x,H-26*scale],[x-15*scale,H]],'#8fa48e',1);ctx.save();ctx.translate(W*.75,H*.92);ctx.rotate(-.09);ctx.font=`700 ${12*scale}px sans-serif`;ctx.fillStyle='#819783';ctx.fillText('KEEP ROLLING',0,0);ctx.restore();
}
