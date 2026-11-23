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
