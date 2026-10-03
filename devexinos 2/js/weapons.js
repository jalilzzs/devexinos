/* =====================================================================
   WEAPONS / TOOLS: Fred carries no weapons, only a flashlight (and the
   phone camera flash). Light is both your tool and your risk: Devexinos
   sees a lit flashlight from much further away.
   ===================================================================== */
let flashOn=true,fl=1.8,camFlash=0;
function toggleFlash(){flashOn=!flashOn;sfx('click');el('bFlash').classList.toggle('lit',flashOn)}
function cameraFlash(){camFlash=1}
function updateFlashlight(dt){
  if(flashOn){if(Math.random()<.004+danger*.02)fl=.3+Math.random()*.6;else fl+=(1.8-fl)*.12}else fl=0;
  camFlash=Math.max(0,camFlash-dt*4);
  flash.intensity=fl+camFlash*4;
}
