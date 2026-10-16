// SOUNDS: replace any sound by dropping a file in assets/audio/sfx/ with the same name (mp3/ogg/wav). Missing file = built-in synth sound.
export const SOUNDS={
 engine:'sfx/engine.mp3',      // looping engine (pitch follows speed/gears)
 horn:'sfx/horn.mp3', brake:'sfx/brake.mp3', crash:'sfx/crash.mp3', pass:'sfx/pass.mp3', cash:'sfx/cash.mp3',
 levelup:'sfx/levelup.mp3', click:'sfx/click.mp3', message:'sfx/message.mp3', shutter:'sfx/shutter.mp3',
 ambience:'sfx/city.mp3'       // optional looping city ambience
};
// Optional per-car engine loops: id from carsConfig.js -> file. No entry = uses SOUNDS.engine (or synth).
export const CAR_ENGINES={ r4l:'sfx/engine_r4l.mp3', p404:'sfx/engine_p404.mp3', p307:'sfx/engine_p307.mp3', clio:'sfx/engine_clio.mp3', duster:'sfx/engine_duster.mp3', p208:'sfx/engine_p208.mp3', partner:'sfx/engine_partner.mp3', dduster:'sfx/engine_dduster.mp3', polo:'sfx/engine_polo.mp3' };
