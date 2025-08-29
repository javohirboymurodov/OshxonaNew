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
  static async playNotification(soundFile: string = '/beep.wav', volume: number = 0.7): Promise<void> {
    try {
      // Try multiple audio play methods for better compatibility
      
      // Method 1: Cached audio
      let audio = this.audioCache.get(soundFile);
      if (!audio) {
        audio = new Audio(soundFile);
        audio.volume = Math.max(0, Math.min(1, volume));
        this.audioCache.set(soundFile, audio);
      }
      
      // Reset and play
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      
      try {
        await audio.play();
        return;
      } catch (cacheError) {
        // Try alternative methods if cached fails
      }
      
      // Method 2: Fresh audio instance
      try {
        const freshAudio = new Audio(soundFile);
        freshAudio.volume = volume;
        await freshAudio.play();
        return;
      } catch (freshError) {
        // Continue to next method
      }
      
      // Method 3: HTML5 Audio with promise handling

      try {
        const promiseAudio = new Audio(soundFile);
        promiseAudio.volume = volume;
        const playPromise = promiseAudio.play();
        if (playPromise !== undefined) {
          await playPromise;

          return;
        }
      } catch (promiseError) {

      }
      

      
          } catch (error) {
        console.error('Failed to play notification sound:', error);
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
    } catch (error) {

      return false;
    }
  }
  
  /**
   * Preload notification sounds for better performance
   */
  static preloadSounds(): void {
    try {
      const audio = new Audio('/beep.wav');
      audio.preload = 'auto';
      audio.volume = 0.01; // Very quiet preload
      this.audioCache.set('/beep.wav', audio);
    } catch (error) {
      console.warn('Failed to preload notification sound:', error);
    }
  }
}