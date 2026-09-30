const assert=require('node:assert/strict');
const O=require('./model.js');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
console.log('Reference checks:',O.checks());
const p={...O.defaults};
const cases=[[1,1,5142298.13],[2,1,219084.78],[5,1,21470.81],[6,.75,15376.43],[6,.5,18143.42],[6,.25,35460.85]];
for(const [months,gamma,m]of cases){const r=O.required({...p,months,gamma});near(r.m,m,1e-6);near(gamma*O.A(O.epochs({...p,months}),r.M,p)/p.N,p.K);}
assert.equal(O.required({...p,months:1,gamma:.75}).status,'revenue');
assert.equal(O.required({...p,gamma:.75}).status,'feasible');
assert.equal(O.required({...p,gamma:.5}).status,'budget');
assert.equal(O.required({...p,P:0}).status,'revenue');
assert.equal(O.required({...p,gamma:0}).status,'allocation');
const stopped=O.evaluate({...p,N:1000,mode:'income',m:10000,months:12});
near(stopped.end.b,.44979852639844);near(stopped.end.R,0);
const noPool=O.evaluate({...p,R0:0,mode:'income'});near(noPool.end.s,0);near(noPool.end.b,0);
const noMining=O.evaluate({...p,mode:'income',m:0});near(noMining.end.s,0);near(noMining.end.R,p.R0);
for(const gamma of [0,.1,.25,.5,.75,1]){
 const r=O.evaluate({...p,gamma,mode:'total',M:1e6,months:12});
 near(r.end.b,gamma*2.61659976448167);near(r.end.R,1333333.33333333);
 for(const q of r.points){near(q.s,q.locked+q.b);assert.ok(q.R>=0);near(q.total,p.S0+(p.R0-q.R)+p.P*q.t);}
}
for(const bad of [{N:0},{N:1.5},{months:13},{gamma:-1},{S0:NaN}])assert.throws(()=>O.evaluate({...p,...bad}));
// Independent RK4 of a representative individual, rather than the closed form.
for(const M of [1,1e6,1e8]){
 const T=20,n=10000,dt=T/n,m=M/p.N;let s=0,b=0;
 const f=(t,s)=>p.P*s/(p.S0+(M+p.P)*t);
 for(let j=0;j<n;j++){
   const t=j*dt,k1=f(t,s),k2=f(t+dt/2,s+dt/2*(m+k1)),k3=f(t+dt/2,s+dt/2*(m+k2)),k4=f(t+dt,s+dt*(m+k3));
   const db=dt*(k1+2*k2+2*k3+k4)/6;b+=db;s+=m*dt+db;
 }
 near(b,O.A(T,M,p)/p.N,1e-8);
}
console.log('All deadline, pool-stop, zero-input, allocation, and ODE cross-checks passed.');

// Split mining income, preserving total stake and pool dynamics at fixed payout.
for(const beta of [0,1e-6,1e-4,.01,1]){
 for(const R0 of [0,1000,p.R0]){
  const q={...p,beta,R0,mode:'income'},r=O.evaluate(q),base=O.evaluate({...q,beta:0});
  near(r.end.s,base.end.s);near(r.end.R,base.end.R);
  near(r.end.b,base.end.b+beta*r.m*Math.min(r.T,r.stop));
  for(const x of r.points){near(x.s,x.locked+x.b);near(x.b,x.direct+x.leadership);assert.ok(x.locked>=0);}
 }
 const q={...p,beta},r=O.required(q),T=O.epochs(q);
 near(beta*r.m*T+p.gamma*O.A(T,r.M,q)/p.N,p.K,1e-9);
 assert.ok(r.m>=O.approximations(q).leading*(1-1e-9));
}
let previous=Infinity;
for(const beta of [0,1e-6,1e-5,1e-4,.001,.01,1]){
 const rate=O.required({...p,beta}).m;assert.ok(rate<previous);previous=rate;
}
for(const beta of [1e-4,.01,1]){
 const q={...p,beta,P:0},r=O.required(q);
 near(r.m,p.K/(beta*O.epochs(q)),1e-10);
 near(O.approximations(q).corrected,r.m);
 assert.equal(O.required({...q,gamma:0}).status,'allocation');
}
for(const beta of [-.01,1.01,NaN])assert.throws(()=>O.evaluate({...p,beta}));
// Independent RK4 includes liquid mining in db/dt, with an explicit pool-stop segment.
for(const beta of [0,.0001,1]){
 const q={...p,beta,R0:1000000},M=100000,m=M/q.N,T=20,stop=q.R0/M;
 let s=0,b=0;
 for(const [start,end,mining] of [[0,stop,m],[stop,T,0]]){
  const n=4000,dt=(end-start)/n;
  const f=(t,s)=>q.P*s/(q.S0+M*Math.min(t,stop)+q.P*t);
  for(let j=0;j<n;j++){
   const t=start+j*dt,k1=f(t,s),k2=f(t+dt/2,s+dt/2*(mining+k1)),k3=f(t+dt/2,s+dt/2*(mining+k2)),k4=f(t+dt,s+dt*(mining+k3));
   const leadership=dt*(k1+2*k2+2*k3+k4)/6;
   s+=mining*dt+leadership;b+=beta*mining*dt+leadership;
  }
 }
 const actual=O.state(T,M,q);near(actual.s,s,1e-9);near(actual.b,b,1e-9);
}
console.log('Beta split, endpoints, lower bounds, monotonicity, and pool-stop RK4 checks passed.');
