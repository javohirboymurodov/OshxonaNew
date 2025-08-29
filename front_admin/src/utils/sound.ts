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
      console.log('🔊 Playing sound:', soundFile, 'volume:', volume);
      
      // Try multiple audio play methods for better compatibility
      
      // Method 1: Cached audio
      let audio = this.audioCache.get(soundFile);
      if (!audio) {
        console.log('🔊 Creating new Audio instance for:', soundFile);
        audio = new Audio(soundFile);
        audio.volume = Math.max(0, Math.min(1, volume));
        this.audioCache.set(soundFile, audio);
      }
      
      // Reset and play
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      

      
      try {
        console.log('🔊 Attempting to play cached audio...');
        await audio.play();
        console.log('🔊 ✅ Cached audio played successfully');
        return;
      } catch (cacheError) {
        console.log('🔊 ❌ Cached audio failed:', cacheError.message);
      }
      
      // Method 2: Fresh audio instance
      console.log('🔊 Trying fresh audio instance...');
      try {
        const freshAudio = new Audio(soundFile);
        freshAudio.volume = volume;
        await freshAudio.play();
        console.log('🔊 ✅ Fresh audio played successfully');
        return;
      } catch (freshError) {
        console.log('🔊 ❌ Fresh audio failed:', freshError.message);
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
        console.error('🔊 ❌ All sound play methods failed:', error);
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
      console.log('🔊 Sound preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload notification sound:', error);
    }
  }
}