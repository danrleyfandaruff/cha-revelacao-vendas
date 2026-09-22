import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1080,height:1920}});
 await page.goto(pathToFileURL(path.join(dir,'storyboard.html')).href);
 await page.evaluate(()=>window.ready);
 await page.evaluate(()=>{
  window.renderFrame('01-tipos',7,8,0,'Veja o passo a passo');
  document.querySelector('.scene.active h1').innerHTML='Sua comemoração.<br><em>Sua lista online.</em>';
  document.querySelector('.scene.active h1').style.fontSize='75px';
  document.querySelectorAll('.occasion').forEach(el=>el.classList.remove('hot'));
  document.querySelector('.disclosure').textContent='Escolha a ocasião. Personalize. Compartilhe.';
 });
 await page.screenshot({path:path.join(dir,'exports','capa-tiktok.jpg'),type:'jpeg',quality:96});
}finally{await browser.close();}
