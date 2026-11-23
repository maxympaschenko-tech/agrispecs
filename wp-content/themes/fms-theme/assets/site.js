(function(){'use strict';var btn=document.querySelector('.nav-toggle');var nav=document.getElementById('fms-menu');if(!btn||!nav)return;btn.addEventListener('click',function(){var open=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('is-open');btn.setAttribute('aria-expanded','false');});});})();

(function(){
  'use strict';
  document.querySelectorAll('[data-fms-1025r-checker]').forEach(function(panel){
    var input=panel.querySelector('input');
    var button=panel.querySelector('[data-fms-check]');
    var result=panel.querySelector('[data-fms-result]');
    if(!input||!button||!result)return;
    function check(){
      var serial=input.value.trim();
      if(!/^[0-9]{5,10}$/.test(serial)){
        result.textContent='Enter the numeric serial sequence (5–10 digits), not a model name or a complete VIN. Confirm your full machine identifier separately.';
        result.dataset.state='invalid';
        return;
      }
      var n=Number(serial);
      if(n<=153036){
        result.textContent='Deere lists LVA21036 as generally compatible with 1025R serials through 153036. This is only an initial kit reference. Verify your full machine serial and current replacement kit in Deere’s official parts catalog.';
      }else{
        result.textContent='Deere lists TA25769 as generally compatible with 1025R serials from 153037 onward. This is only an initial kit reference. Verify your full machine serial and current replacement kit in Deere’s official parts catalog.';
      }
      result.dataset.state='found';
    }
    button.addEventListener('click',check);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();check();}});
  });
})();


(function(){
  'use strict';
  document.querySelectorAll('[data-fms-hour-planner]').forEach(function(panel){
    var start=panel.querySelector('[data-fms-last]');
    var interval=panel.querySelector('[data-fms-interval]');
    var current=panel.querySelector('[data-fms-now]');
    var button=panel.querySelector('[data-fms-calculate]');
    var output=panel.querySelector('[data-fms-hour-result]');
    if(!start||!interval||!current||!button||!output)return;
    function fmt(value){return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);}
    function calculate(){
      var a=Number(start.value),b=Number(interval.value),c=Number(current.value);
      var fields=[start,interval,current];
      if(fields.some(function(node){return node.value.trim()==='';})||
         !Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(c)||
         a<0||c<0||b<=0||b>10000||a>999999||c>999999||c<a){
         output.textContent='Enter valid hour-meter readings (the current reading must not be before the last service) and a positive manual-specified interval.';
         output.dataset.state='invalid';
         return;
      }
      var next=a+b;
      var remaining=next-c;
      var message='Numerical checkpoint: '+fmt(next)+' engine hours. ';
      if(remaining>0){message+=fmt(remaining)+' operating hours remain before that checkpoint.';}
      else if(remaining===0){message+='Your current reading matches the checkpoint.';}
      else{message+='Your current reading is '+fmt(Math.abs(remaining))+' hours beyond that checkpoint.';}
      output.textContent=message+' Calendar-time and severe-service requirements may come earlier; consult your exact manual.';
      output.dataset.state='found';
    }
    button.addEventListener('click',calculate);
    [start,interval,current].forEach(function(field){
      field.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();calculate();}});
    });
  });
})();
