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
assert.equal(O.required({...p,gamma:0}).status,'revenue');
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
