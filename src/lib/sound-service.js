/* global Howl */
/**
 * Sound service module.
 * Audio playing for effects (one-time sounds) and ambiants (looping background sounds).
 */
const FADE_DELAY = 2000;

export class SoundService {
  constructor() {
    /* Keep a record of cached sounds */
    this.sounds = new Map();
    /* Keep a record of currently playing ambiant sounds */
    this.ambiants = new Map();
  }

  /**
   * Return a Howler sound object, registering it on first invocation.
   *
   * @params {String}   name    Name of a sound
   * @returns {Object}          Howler sound object.
   */
  fetchSound(name) {
    let sound = this.sounds.get(name);
    if (sound === undefined) {
      // Register the new sound
      sound = new Howl({
        src: [`sounds/${name}.webm`,
              `sounds/${name}.ogg`,
              `sounds/${name}.mp3`,
             ],
      });
      this.sounds.set(name, sound);
    }
    return sound;
  }

  /**
   * Play a set of sounds once.
   *
   * @params {Array} array Array of sounds, in the form
   *                      [['sound1', volume1], ['sound2, volume2], ...]
   */
  effect(array) {
    const sounds = new Map(array);
    sounds.forEach((volume, name) => {
      const sound = this.fetchSound(name);
      let vol;
      if (volume < 0) {
        vol = 0;
      } else if (volume > 100) {
        vol = 100;
      } else {
        vol = volume;
      }

      const id = sound.play();
      sound.volume(vol / 100, id);
    });
  }

  /**
   * Play a set of ambiant sounds (i.e. looping, with fade-in/out effects).
   *
   * @params {Array}  array  Array of ambiant sounds, in the form
   *                         [ ['sound1', volume1], ['sound2, volume2], ... ]
   */
  ambiant(array) {
    const sounds = new Map(array);

    // First, fade out all other ambiant sounds.
    this.ambiants.forEach(({ sound, id }, name) => {
      if (sounds.get(name) === undefined) {
        sound.once('fade', idx => {
          // Stop when faded, for recycling
          sound.stop(idx);
        }, id);
        sound.fade(sound.volume(id), 0, FADE_DELAY, id);
        this.ambiants.delete(name);
      }
    });

    // Then, enable all requested sounds
    sounds.forEach((volume, name) => {
      const ambiant = this.ambiants.get(name);
      let vol;
      if (volume < 0) {
        vol = 0;
      } else if (volume > 100) {
        vol = 100;
      } else {
        vol = volume;
      }

      if (ambiant === undefined) {
        // New ambiant sound: fade volume in.
        const sound = this.fetchSound(name);
        const id = sound.play();
        sound.fade(0, vol / 100, FADE_DELAY, id);
        sound.loop(true, id);
        this.ambiants.set(name, { sound, id });
      } else {
        // Active ambiant sound: fade volume to new value (i.e. adapt volume).
        const { sound, id } = ambiant;
        if (sound.volume(id) !== vol / 100) {
          sound.fade(sound.volume(id), vol / 100, FADE_DELAY, id);
        }
      }
    });
  }

  /**
   * Stop all sounds and reset ambiant sound records.
   */
  stop() {
    // Stop all sounds.
    this.sounds.forEach(sound => {
      sound.stop();
    });
    // Reset map of ambiant sounds.
    this.ambiants = new Map();
  }
}

export default SoundService;
