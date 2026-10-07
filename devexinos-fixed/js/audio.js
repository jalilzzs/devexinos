/* =====================================================================
   DEVEXINOS / js/audio.js
   Web Audio engine: synthesized fallbacks + custom sfx_/bgm_ files
   ===================================================================== */
/* =====================================================================
   AUDIO (Web Audio, unlocked on first tap). Every sound has a synthesized
   fallback; dropping sfx_*.mp3/ogg/wav or bgm_*.mp3 replaces it.
   ===================================================================== */
let AC,master,sfxG,bgmG,droneG,bgmSrc,chaseSrc,noiseBuf;const custom={buf:{}};
function initAudio(){
  try{
    if(AC){if(AC.state==='suspended')AC.resume();return}
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();sfxG=AC.createGain();bgmG=AC.createGain();droneG=AC.createGain();
    sfxG.connect(master);bgmG.connect(master);droneG.connect(bgmG);master.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=180;lp.connect(droneG);
    [55,55.8,82.4].forEach((f,i)=>{const o=AC.createOscillator();o.type=i<2?'sawtooth':'sine';o.frequency.value=f;const g=AC.createGain();g.gain.value=i<2?.5:.25;o.connect(g);g.connect(lp);o.start()});
    const lfo=AC.createOscillator();lfo.frequency.value=.07;const lg=AC.createGain();lg.gain.value=90;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
    applyVol();
  }catch(e){console.warn('Audio unavailable',e)}
}
function playBuf(name,vol=1,loop=false){const b=custom.buf[name];if(!b||!AC)return null;const s=AC.createBufferSource();s.buffer=b;s.loop=loop;const g=AC.createGain();g.gain.value=vol;s.connect(g);g.connect(name.startsWith('bgm')?bgmG:sfxG);s.start();return s}
function refreshBgm(){if(!AC)return;if(bgmSrc){try{bgmSrc.stop()}catch(e){}bgmSrc=null}if(custom.buf.bgm_main){droneG.gain.value=0;bgmSrc=playBuf('bgm_main',1,true)}else droneG.gain.value=1}
function setChase(on){if(!AC||!custom.buf.bgm_chase)return;if(on&&!chaseSrc)chaseSrc=playBuf('bgm_chase',1,true);if(!on&&chaseSrc){try{chaseSrc.stop()}catch(e){}chaseSrc=null}}
function tone(f,d,type='sine',v=.1,w=0,to=0){if(!AC)return;const t0=AC.currentTime+w,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(to)o.frequency.exponentialRampToValueAtTime(to,t0+d);g.gain.setValueAtTime(v,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(g);g.connect(sfxG);o.start(t0);o.stop(t0+d+.05)}
function noise(d,v=.1,type='lowpass',f=800,q=1,w=0){if(!AC)return;const t0=AC.currentTime+w,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.setValueAtTime(v,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);s.connect(fl);fl.connect(g);g.connect(sfxG);s.start(t0,Math.random());s.stop(t0+d+.05)}
const SFX={
  click(){tone(380,.05,'square',.07)},
  pickup(){tone(520,.08,'triangle',.18);tone(780,.12,'triangle',.16,.07)},
  step(v=1){noise(.09,.06*v,'lowpass',420)},
  door(){noise(1.2,.25,'lowpass',160);tone(70,1.2,'sawtooth',.07,0,45)},
  grind(){noise(2.6,.3,'lowpass',120);tone(55,2.6,'sawtooth',.1,0,38)},
  thump(v=.5){tone(75,.22,'sine',v,0,38)},
  whisper(){noise(1.5,.13,'bandpass',2600,3);noise(1.2,.08,'bandpass',1500,5,.3)},
  growl(){tone(60,1.8,'sawtooth',.25,0,32);noise(1.8,.2,'lowpass',300)},
  scare(){tone(190,1.3,'sawtooth',.2,0,40);noise(1.3,.3,'highpass',2000)},
  beep(f=700){tone(f,.09,'square',.09)},
  buzz(){tone(120,.5,'sawtooth',.14)},
  spark(){noise(.3,.25,'highpass',3000)},
  fire(){noise(6,.1,'lowpass',900)},
  hum(){tone(60,3,'sawtooth',.06)},
  amira(){tone(420,2.6,'sine',.1,0,300);tone(630,2.6,'sine',.04,0,450);noise(2.6,.05,'bandpass',1800,2)},
  musicbox(){[523,659,784,659,523,659,784,1047,988,784,659,784,880,784,659,523].forEach((f,i)=>tone(f*(i>11?.99:1),.9,'triangle',.13,i*.42))}
};
function sfx(name,a){if(!AC)return;if(custom.buf['sfx_'+name]){playBuf('sfx_'+name,1);return}const f=SFX[name];if(f)f(a)}
document.addEventListener('click',e=>{if(e.target.closest('button,.rbtn,.mbtn'))sfx('click')},true);
