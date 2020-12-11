import Sound from 'react-native-sound';

export default class SoundManager {
// Singleton
  static instance = null;

  /**
   * @returns {SoundManager}
   */
  static getInstance() {
    if (SoundManager.instance == null) {
        SoundManager.instance = new SoundManager();
    }

    return this.instance;
  }

  SYNC_SOUND_EFFECT = null;

  init() {
      Sound.setCategory("Playback");

      // Load the sound file 'sync.mp3' from the app bundle
      this.SYNC_SOUND_EFFECT = new Sound('sync.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Failed to load the sound', error);
          return;
        }
        // loaded successfully
        console.log('Duration in seconds: ' + this.SYNC_SOUND_EFFECT.getDuration() + 'Number of channels: ' + this.SYNC_SOUND_EFFECT.getNumberOfChannels());
      });
  }

  playSyncSound() {
      if (this.SYNC_SOUND_EFFECT != null) {
          this.SYNC_SOUND_EFFECT.play((success) => {
              if (success) {
                  console.log("Effect played");
              } else {
                  console.log("Failed to play");
              }
          });
      }
  }
}