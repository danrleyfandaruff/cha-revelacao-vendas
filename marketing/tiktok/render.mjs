import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const ffmpeg=process.env.FFMPEG || '/tmp/listas-video-tools/node_modules/ffmpeg-static/ffmpeg';
const fps=30,sr=48000;
const scripts=JSON.parse(await readFile(path.join(dir,'narration.json'),'utf8'));
const short=process.argv.includes('--short');
const priceAtEnd=process.argv.includes('--price-at-end');
const selected=short?['00-abertura','01-tipos','08-painel','05-ativacao','09-final'].map(key=>scripts.find(s=>s.key===key)):scripts;
const scenes=priceAtEnd?[...selected.filter(s=>s.key!=='05-ativacao'),selected.find(s=>s.key==='05-ativacao')]:selected;
const captionPhrases={
 '00-abertura':['Presente repetido e lista perdida','nas mensagens?','Organize tudo em um só link,','com Listas para celebrar.'],
 '01-tipos':['Chá revelação, chá de bebê,','casamento, chá de panela,','casa nova ou aniversário.','Escolha a sua comemoração.'],
 '02-acesso':['Primeiro, entre com Google','ou crie sua conta com e-mail.'],
 '03-evento':['Escolha o tipo de evento','e preencha nome, local e data.'],
 '04-presentes':['Selecione os presentes,','ajuste as quantidades e salve sua lista.','Nos chás de bebê e revelação,','inclua também fraldas.'],
 '05-ativacao':['Ative por dezenove reais e noventa centavos','por evento. Pagamento único,','sem mensalidade.','São sessenta dias de acesso','após a ativação.'],
 '06-compartilhar':['Depois, compartilhe o link pelo WhatsApp.'],
 '07-convidado':['O convidado abre sem criar conta,','escolhe o presente e confirma a reserva.','Isso ajuda a evitar presentes repetidos.'],
 '08-painel':['E você acompanha as reservas','e confirmações no painel.'],
 '09-final':['Menos mensagens para organizar.','Mais tempo para celebrar.','Crie sua lista no site.'],
};
await mkdir(path.join(dir,'exports'),{recursive:true});
await mkdir(path.join(dir,'assets','qa'),{recursive:true});
let offset=0;
const samples=[];
for(const s of scenes){
 const decoded=spawnSync(ffmpeg,['-v','error','-i',path.join(dir,'assets','audio',s.key+'.mp3'),'-f','f32le','-ac','1','-ar',String(sr),'pipe:1'],{maxBuffer:20e6});
 if(decoded.status!==0)throw new Error(decoded.stderr.toString());
 const floats=new Float32Array(decoded.stdout.buffer,decoded.stdout.byteOffset,decoded.stdout.length/4);
 let energy=0,peak=0;for(const v of floats){energy+=v*v;peak=Math.max(peak,Math.abs(v));}
 const gain=Math.min(.13/Math.sqrt(energy/floats.length),.86/peak,3);
 s.start=offset;s.frames=Math.ceil((floats.length/sr+.18)*fps);s.duration=s.frames/fps;s.end=s.start+s.duration;
 s.audioLength=floats.length/sr;s.gain=gain;offset=s.end;
 samples.push(floats);
 const chunks=captionPhrases[s.key];
 const total=chunks.reduce((n,c)=>n+c.length,0);let elapsed=0;
 s.captions=chunks.map(text=>{const start=s.start+elapsed;elapsed+=s.audioLength*text.length/total;return {text,start,end:s.start+elapsed};});
}
const count=Math.round(offset*sr),mix=new Float32Array(count);
for(let j=0;j<scenes.length;j++){const start=Math.round(scenes[j].start*sr);for(let i=0;i<samples[j].length;i++)mix[start+i]+=samples[j][i]*scenes[j].gain;}
// Original synthesized bed: no samples, songs, or third-party recordings.
const beat=60/100,notes=[261.626,329.628,391.995,329.628,220,261.626,329.628,391.995];
for(let i=0;i<count;i++){
 const t=i/sr,b=Math.floor(t/beat),u=t%beat,n=notes[b%notes.length];
 const envelope=Math.min(1,t/1.5,(offset-t)/1.5);
 const pluck=.006*Math.exp(-u*7)*(Math.sin(2*Math.PI*n*u)+.3*Math.sin(2*Math.PI*n*2*u));
 const bass=.008*Math.exp(-u*12)*Math.sin(2*Math.PI*(b%4===0?65.406:55)*u);
 mix[i]+=envelope*(pluck+bass);
}
const wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(Math.max(-.97,Math.min(.97,mix[i]))*32767),44+i*2);
const name=(short?'listas-para-celebrar-anuncio-curto':'listas-para-celebrar-passo-a-passo')+(priceAtEnd?'-valor-no-final':'');
const audioPath=path.join(dir,'assets','audio',name+'.wav');await writeFile(audioPath,wav);
const time=t=>{const n=Math.round(t*1000);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;};
const captions=scenes.flatMap(s=>s.captions);
await writeFile(path.join(dir,'exports',name+'.srt'),captions.map((c,i)=>`${i+1}\n${time(c.start)} --> ${time(c.end)}\n${c.text}\n`).join('\n'));
await writeFile(path.join(dir,'exports',name+'-timeline.json'),JSON.stringify({width:1080,height:1920,fps,duration:offset,scenes},null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await page.goto(pathToFileURL(path.join(dir,'storyboard.html')).href);await page.evaluate(()=>window.ready);
if(priceAtEnd)await page.evaluate(()=>window.configurePriceAtEnd());
const output=path.join(dir,'exports',name+'.mp4');
const encoder=spawn(ffmpeg,['-y','-v','warning','-thread_queue_size','64','-f','image2pipe','-vcodec','mjpeg','-r',String(fps),'-i','pipe:0','-i',audioPath,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709:out_range=tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-c:a','aac','-b:a','192k','-ar','48000','-af','loudnorm=I=-16:LRA=9:TP=-1.5','-movflags','+faststart','-shortest',output],{stdio:['pipe','ignore','pipe']});
let error='';encoder.stderr.on('data',data=>error+=data.toString());
const completion=once(encoder,'close');
try{
 for(const s of scenes){
  console.log('Rendering',s.key,s.duration.toFixed(2),'seconds');
  for(let f=0;f<s.frames;f++){
   const local=f/fps,t=s.start+local;const cap=s.captions.find(c=>t>=c.start&&t<c.end)?.text||'';
   await page.evaluate(({key,t,duration,p,cap})=>window.renderFrame(key,t,duration,p,cap),{key:s.key,t:local,duration:s.duration,p:t/offset,cap});
   const frame=await page.screenshot({type:'jpeg',quality:92,animations:'disabled'});
   if(f===Math.min(45,s.frames-1))await writeFile(path.join(dir,'assets','qa',s.key+'.jpg'),frame);
   if(!encoder.stdin.write(frame))await once(encoder.stdin,'drain');
  }
 }
 encoder.stdin.end();const [code]=await completion;if(code!==0)throw new Error(error);
 console.log(JSON.stringify({output,duration:offset,frames:Math.round(offset*fps),warnings:error}));
}finally{await browser.close();if(encoder.exitCode===null)encoder.kill();}
