(() => {
 'use strict';
 const nameText=document.getElementById('name-text');
 if(!nameText)return;
 const originalName=nameText.textContent;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const duration=1150;
 const scrambleCharacters='<>/#%*+?~';
 let animationFrame=null;
 let previousTime=null;
 let elapsed=0;
 let lastScrambleTime=0;
 let finished=false;
 let pauseObserver=null;
 function finish(){
  finished=true;
  if(animationFrame!==null)cancelAnimationFrame(animationFrame);
  animationFrame=null;
  nameText.textContent=originalName;
  nameText.classList.remove('name-intro');
  nameText.style.removeProperty('width');
  nameText.dataset.introState='complete';
  if(pauseObserver)pauseObserver.disconnect();
  reducedMotion.removeEventListener('change',handleMotionChange);
 }
 function animateName(time){
  animationFrame=null;
  if(finished||document.body.classList.contains('paused'))return;
  if(previousTime!==null)elapsed+=time-previousTime;
  previousTime=time;
  if(elapsed>=duration){finish();return;}
  if(elapsed-lastScrambleTime>=45){
   const resolvedLetters=Math.floor(Math.min(1,elapsed/850)*originalName.length);
   nameText.textContent=[...originalName].map((letter,index)=>index<resolvedLetters?letter:scrambleCharacters[Math.floor(Math.random()*scrambleCharacters.length)]).join('');
   lastScrambleTime=elapsed;
  }
  animationFrame=requestAnimationFrame(animateName);
 }
 function resume(){
  if(finished||animationFrame!==null||document.body.classList.contains('paused'))return;
  previousTime=null;
  animationFrame=requestAnimationFrame(animateName);
 }
 function handleMotionChange(){if(reducedMotion.matches)finish();}
 if(reducedMotion.matches){finish();return;}
 nameText.style.width=nameText.getBoundingClientRect().width+'px';
 nameText.classList.add('name-intro');
 nameText.dataset.introState='playing';
 pauseObserver=new MutationObserver(()=>{
  if(document.body.classList.contains('paused')){
   if(animationFrame!==null)cancelAnimationFrame(animationFrame);
   animationFrame=null;
   previousTime=null;
  }else resume();
 });
 pauseObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 reducedMotion.addEventListener('change',handleMotionChange);
 resume();
})();
