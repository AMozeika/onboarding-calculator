/* Browser UI, kept separate from the numerical model as in the reference panel. */
'use strict';
const O=window.Onboarding,$=id=>document.getElementById(id);
let p={...O.defaults},last=null;
const fmt=(v,d=2)=>v===null||v===undefined?'—':!Number.isFinite(v)?'∞':Math.abs(v)>=1e12||Math.abs(v)>0&&Math.abs(v)<.0001?v.toExponential(3):v.toLocaleString('en-GB',{maximumFractionDigits:d});
const groups=[['Population & deadline',[
 ['N','Number of newcomers',1,10000000,1,'Equal mining income; zero initial balances.'],
 ['gamma','Newcomer payout share γ (%)',0,100,.1,'Incumbents receive the remaining share.'],
 ['months','Deadline / plot horizon (months)',.01,12,.1,'12 months is the pre-unlock boundary.'],
 ['K','Blend balance requirement (LOGOS)',1e-9,1e9,'any','Unlocked tokens required per newcomer.']]],
 ['Stake & rewards',[
 ['S0','Initial active stake S₀ (LOGOS)',1,1e15,'any','Includes all capitalised participants.'],
 ['R0','Initial reward pool R₀ (LOGOS)',0,1e15,'any','No replenishment in this model.'],
 ['P','Leadership pot P_L (LOGOS/epoch)',0,1e12,'any','Unlocked income shared by all stakers.'],
 ['days','Days per epoch',.01,365,'any','Calendar conversion uses 365 days/year.']]],
 ['Mining policy',[
 ['beta','Immediately unlocked mining fraction β (%)',0,100,'any','0% = all locked; 1% means β = 0.01. Both portions are staked.'],
 ['m','Mining income m (LOGOS/newcomer/epoch)',0,1e15,'any','Used in “Evaluate income per newcomer”.'],
 ['M','Total mining payout M (LOGOS/epoch)',0,1e18,'any','Used in “Evaluate fixed total mining payout”.']]]];
function build(){
 $('controls').innerHTML=groups.map(([name,items])=>`<fieldset><legend>${name}</legend>${items.map(([id,label,min,max,step,hint])=>`<label class="ctl" id="field-${id}" for="${id}"><span>${label}</span><input id="${id}" type="number" min="${min}" max="${max}" step="${step}" aria-describedby="hint-${id}"><span id="hint-${id}" class="hint">${hint}</span>${id==='gamma'?'<input id="gamma-range" type="range" min="0" max="100" step="0.1" aria-label="Newcomer payout share slider">':''}</label>`).join('')}</fieldset>`).join('');
 for(const [,items]of groups)for(const [id]of items)$(id).addEventListener('input',()=>{
   p[id]=$(id).value===''?NaN:Number($(id).value)/(['gamma','beta'].includes(id)?100:1);
   if(id==='gamma'&&Number.isFinite(p.gamma))$('gamma-range').value=p.gamma*100;
   refresh();
 });
 $('gamma-range').addEventListener('input',e=>{p.gamma=Number(e.target.value)/100;$('gamma').value=e.target.value;refresh();});
 $('mode').addEventListener('change',e=>{p.mode=e.target.value;sync();refresh();});
 $('reset').addEventListener('click',()=>{p={...O.defaults};sync();refresh();});
 $('example').addEventListener('click',()=>{p={...O.defaults,mode:'income'};sync();refresh();});
 $('csv').addEventListener('click',download);
 sync();
}
function sync(){
 $('mode').value=p.mode;
 for(const [,items]of groups)for(const [id]of items)$(id).value=p[id]*(['gamma','beta'].includes(id)?100:1);
 $('gamma-range').value=p.gamma*100;
 $('field-m').hidden=p.mode!=='income';$('field-M').hidden=p.mode!=='total';
}
function readouts(rows){$('readouts').innerHTML=rows.map(([a,b,c])=>`<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('');}
function refresh(){
 try{last=O.evaluate(p);$('error').hidden=true;$('output').hidden=false;}
 catch(e){$('error').textContent=e.message.startsWith('beta must')?'Unlocked mining fraction β must be between 0% and 100%.':e.message;$('error').hidden=false;$('output').hidden=true;last=null;return;}
 const r=last,T=r.T,ver=$('verdict');
 if(r.M===null){
   ver.className='verdict bad';
   ver.innerHTML='<strong>No finite mining rate reaches this deadline</strong>The newcomer share of the leadership pot is too small, even with an unlimited mining pool.';
   if(r.target.status==='numerical')ver.innerHTML='<strong>Outside numerical solver range</strong>The target is too close to the revenue boundary to resolve a reliable mining rate.';
   if(r.target.status==='allocation')ver.innerHTML='<strong>No mining income is allocated to newcomers</strong>A zero newcomer payout share cannot fund initially tokenless newcomers, regardless of β.';
   readouts([['Leadership ceiling per newcomer',fmt(p.gamma*p.P*T/p.N,6)+' LOGOS',p.beta===0?'Strict upper bound for finite mining rates':'Newcomers receive no payout at γ = 0'],['Required unlocked balance',fmt(p.K,6)+' LOGOS','Per newcomer'],['Available pool',fmt(p.R0)+' LOGOS','Cannot remedy zero allocation or a leadership-only shortfall']]);
   $('plotnote').textContent='No required income exists for this target, so no trajectory is shown. Choose an evaluation mode to inspect a specified payout.';
   for(const id of ['stake','unlocked','pool']){$(id).innerHTML='';$(id+'-value').textContent='No finite solution';}
   $('csv').disabled=true;
 }else{
   const stopMonths=r.stop*p.days*12/365,hitMonths=r.hit===null?null:r.hit*p.days*12/365;
   ver.className='verdict'+(r.meets?'':r.stop<T?' warn':' bad');
   let title=r.meets?'Meets the deadline within the available pool':r.stop<T?'Pool runs out before the requested deadline':'Does not meet the requested deadline';
   let note=r.meets?`Every newcomer reaches ${fmt(p.K)} unlocked LOGOS by month ${fmt(hitMonths,3)} in the deterministic model.`:
     r.stop<T?`Mining stops at month ${fmt(stopMonths,3)}. The plotted balances continue with leadership income only.`:'Increase income, extend the deadline, or change the population and reward assumptions.';
   if(p.mode==='solve'&&r.target.status==='budget'){title='Required constant income exceeds the pool budget';note=`The formal solution needs ${fmt(r.cost)} LOGOS. The plots instead stop mining when the actual pool empties.`;}
   if(p.months===12&&r.hit!==null&&Math.abs(hitMonths-12)<1e-6)note+=' This reaches the threshold at the boundary, not strictly before one year.';
   ver.innerHTML=`<strong>${title}</strong>${note}`;
   const approx=O.approximations(p);
   readouts([
     [p.mode==='solve'?'Required mining income m':'Mining income m',fmt(r.m,4)+' LOGOS/epoch','Per newcomer; constant while funded'],
     ['Total mining payout M',fmt(r.M,2)+' LOGOS/epoch','Newcomers and incumbent miners combined'],
     ['Unlocked balance at deadline',fmt(r.end.b,6)+' LOGOS','Per newcomer; after enforcing the pool limit'],
     ['Directly mined unlocked balance',fmt(r.end.direct,6)+' LOGOS',`β = ${fmt(p.beta*100,6)}% of received mining income`],
     ['Accumulated leadership income',fmt(r.end.leadership,6)+' LOGOS','Unlocked and reinvested; excludes direct mining income'],
     ['Total stake at deadline',fmt(r.end.s,3)+' LOGOS','Includes locked and unlocked tokens'],
     ['Pool remaining at deadline',fmt(r.end.R,2)+' LOGOS',`${fmt(100*(p.R0-r.end.R)/(p.R0||1),2)}% of initial pool spent`],
     ['Full-horizon payout commitment',fmt(r.cost,2)+' LOGOS',r.cost>p.R0?'Exceeds budget; not a realised expenditure':'Within initial pool budget'],
     ['Qualification time',r.hit===null?'Not within one year':fmt(hitMonths,4)+' months','With mining stopped at pool exhaustion'],
     ['Pool exhaustion',Number.isFinite(stopMonths)?fmt(stopMonths,3)+' months':'Never (no payout)','Pre-unlock payout-policy projection'],
     ['Lower bound on required income',fmt(approx.leading,4)+' LOGOS/epoch','K_B / [βT + P_L T²/(2S₀)]; necessary, not sufficient'],
     ['First-corrected required income',fmt(approx.corrected,4)+' LOGOS/epoch',`Small-growth approximation only; ε = ${fmt(r.epsilon,3)} (needs ≪ 1)`]
   ]);
   $('plotnote').textContent=`Per-newcomer balances and the shared pool. Hover or touch a curve for values. ${p.months===12?'The endpoint is immediately before unlocking.':''}`;
   $('csv').disabled=false;drawAll();
 }
 const shares=[1,.75,.5,.25,.1];
 $('sweep').querySelector('tbody').innerHTML=Array.from({length:6},(_,i)=>`<tr><td>${i+1} month${i?'s':''}</td>${shares.map(gamma=>{const q=O.required({...p,months:i+1,gamma});return `<td class="${q.status}" title="${q.cost===null?'Insufficient leadership income':`Total required payout: ${fmt(q.cost)} LOGOS`}">${q.m===null?(q.status==='numerical'?'Unresolved':'No finite rate'):fmt(q.m,q.m<10?4:0)+(q.status==='budget'?' †':'')}</td>`;}).join('')}</tr>`).join('');
}
function drawAll(){if(!last||last.M===null)return;draw('stake','s','#14668c','LOGOS');draw('unlocked','b','#176b55','LOGOS',p.K);draw('pool','R','#a4661c','LOGOS');}
function draw(id,key,color,unit,threshold){
 const svg=$(id),w=Math.max(250,svg.clientWidth),h=svg.clientHeight,L=64,R=18,B=42,top=22,iw=w-L-R,ih=h-top-B;
 const points=last.points,max=Math.max(...points.map(x=>x[key]),threshold||0,1e-9)*1.12;
 const X=t=>L+t/last.T*iw,Y=v=>top+ih-v/max*ih;
 const short=v=>v>=1e9?fmt(v/1e9,2)+'B':v>=1e6?fmt(v/1e6,2)+'M':v>=1e3?fmt(v/1e3,1)+'k':fmt(v,3);
 let content=`<title>${id} over ${p.months} months</title><rect x="${L}" y="${top}" width="${iw}" height="${ih}" fill="none" stroke="#dce4e9"/>`;
 for(let i=0;i<=4;i++){
   const y=Y(max*i/4),x=L+iw*i/4;
   content+=`<path d="M${L} ${y}H${w-R}" stroke="#e6ecef"/><text x="${L-7}" y="${y+4}" text-anchor="end">${short(max*i/4)}</text><text x="${x}" y="${h-23}" text-anchor="${i===0?'start':i===4?'end':'middle'}">${fmt(p.months*i/4,2)}</text>`;
 }
 if(threshold)content+=`<path d="M${L} ${Y(threshold)}H${w-R}" stroke="#6b7680" stroke-dasharray="5 4"/><text x="${L+5}" y="${Y(threshold)-7}">K_B = ${fmt(threshold)}</text>`;
 content+=`<path d="${points.map((q,i)=>(i?'L':'M')+X(q.t)+','+Y(q[key])).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/><text x="${L}" y="14">${unit}</text><text x="${L+iw/2}" y="${h-3}" text-anchor="middle">Months since genesis</text>`;
 content+='<path id="'+id+'-cursor" stroke="#667886" stroke-dasharray="3 3" style="display:none"/>';
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=content;
 svg.querySelectorAll('text').forEach(e=>{e.setAttribute('fill','#536473');e.setAttribute('font-size','12');});
 const end=()=>$(id+'-value').textContent=`Month ${fmt(p.months)}: ${fmt(last.end[key],key==='b'?6:2)} LOGOS`;
 end();
 svg.onpointermove=e=>{
   if(!last)return;const rect=svg.getBoundingClientRect(),t=Math.max(0,Math.min(last.T,((e.clientX-rect.left)*w/rect.width-L)/iw*last.T));
   const q=O.state(t,last.M,p),line=$(id+'-cursor');line.style.display='';line.setAttribute('d',`M${X(t)} ${top}V${top+ih}`);
   $(id+'-value').textContent=`Month ${fmt(t*p.days*12/365,2)}: ${fmt(q[key],key==='b'?6:2)} LOGOS`;
 };
 svg.onpointerleave=()=>{$(id+'-cursor').style.display='none';end();};
}
function download(){
 if(!last||last.M===null)return;
 const header='months,epochs,stake_LOGOS,unlocked_LOGOS,locked_LOGOS,pool_LOGOS,N,gamma,m_LOGOS_per_epoch,M_LOGOS_per_epoch,S0,P_L,R0,K_B,epoch_days,beta,direct_unlocked_mining_LOGOS,leadership_LOGOS';
 const csv=[header,...last.points.map(q=>[q.t*p.days*12/365,q.t,q.s,q.b,q.locked,q.R,p.N,p.gamma,last.m,last.M,p.S0,p.P,p.R0,p.K,p.days,p.beta,q.direct,q.leadership].join(','))].join('\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='onboarding-trajectories.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
build();
try{$('selfcheck').textContent=`Self-check passed · ${O.checks()} Python-reference values agree`;}catch(e){$('selfcheck').className='badge bad';$('selfcheck').textContent='Numerical self-check failed — do not rely on these results';console.error(e);}
refresh();new ResizeObserver(drawAll).observe($('output'));
