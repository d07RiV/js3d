import config from './config';

export default function checkSleep(body1, body2) {
  if (body1.sleeping && body2.sleeping) {
    return false;
  }
  if (body1.moves && body2.moves) {
    if (body1.motion > config.sleepWakeThreshold) {
      body2.wake();
    }
    if (body2.motion > config.sleepWakeThreshold) {
      body1.wake();
    }
  }
  return true;
}
