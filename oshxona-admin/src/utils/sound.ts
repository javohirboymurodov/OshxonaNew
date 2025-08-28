/**
 * Sound utility for playing notification sounds
 */

export class SoundPlayer {
  private static audioCache: Map<string, HTMLAudioElement> = new Map();
  
  /**
   * Play a notification sound
   * @param soundFile - Path to the sound file (relative to public/)
   * @param volume - Volume level (0.0 to 1.0)
   */
  static async playNotification(soundFile: string = '/notification.wav', volume: number = 0.7): Promise<void> {
    try {
      // Check if audio is allowed (user has interacted with page)
      if (!this.canPlayAudio()) {
        console.log('Audio playback not allowed yet - user needs to interact with page first');
        return;
      }
      
      let audio = this.audioCache.get(soundFile);
      
      if (!audio) {
        audio = new Audio(soundFile);
        audio.preload = 'auto';
        this.audioCache.set(soundFile, audio);
      }
      
      // Reset audio to beginning and set volume
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      
      // Play the audio
      await audio.play();
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }
  
  /**
   * Check if audio can be played (requires user interaction)
   */
  private static canPlayAudio(): boolean {
    try {
      // Create a silent audio element to test if we can play audio
      const testAudio = new Audio();
      return testAudio.paused !== undefined;
    } catch {
      return false;
    }
  }
  
  /**
   * Preload notification sounds for better performance
   */
  static preloadSounds(): void {
    try {
      const audio = new Audio('/notification.wav');
      audio.preload = 'auto';
      audio.volume = 0.01; // Very quiet preload
      this.audioCache.set('/notification.wav', audio);
    } catch (error) {
      console.warn('Failed to preload notification sound:', error);
    }
  }
}