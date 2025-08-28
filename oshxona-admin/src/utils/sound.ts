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
      console.log('🔊 SOUND: Attempting to play notification sound:', soundFile);
      
      // Try multiple audio play methods for better compatibility
      
      // Method 1: Cached audio
      let audio = this.audioCache.get(soundFile);
      if (!audio) {
        console.log('🔊 SOUND: Creating new audio instance for:', soundFile);
        audio = new Audio(soundFile);
        audio.volume = Math.max(0, Math.min(1, volume));
        this.audioCache.set(soundFile, audio);
      }
      
      // Reset and play
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      
      console.log('🔊 SOUND: Method 1 - Trying cached audio');
      
      try {
        await audio.play();
        console.log('✅ SOUND: Method 1 successful');
        return;
      } catch (cacheError) {
        console.log('🔇 SOUND: Method 1 failed:', cacheError);
      }
      
      // Method 2: Fresh audio instance
      console.log('🔊 SOUND: Method 2 - Trying fresh audio instance');
      try {
        const freshAudio = new Audio(soundFile);
        freshAudio.volume = volume;
        await freshAudio.play();
        console.log('✅ SOUND: Method 2 successful');
        return;
      } catch (freshError) {
        console.log('🔇 SOUND: Method 2 failed:', freshError);
      }
      
      // Method 3: HTML5 Audio with promise handling
      console.log('🔊 SOUND: Method 3 - Promise-based play');
      try {
        const promiseAudio = new Audio(soundFile);
        promiseAudio.volume = volume;
        const playPromise = promiseAudio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('✅ SOUND: Method 3 successful');
          return;
        }
      } catch (promiseError) {
        console.log('🔇 SOUND: Method 3 failed:', promiseError);
      }
      
      console.error('❌ SOUND: All methods failed');
      
    } catch (error) {
      console.error('❌ SOUND: Critical error:', error);
    }
  }
  
  /**
   * Check if audio can be played (requires user interaction)
   */
  private static canPlayAudio(): boolean {
    try {
      // Create a silent audio element to test if we can play audio
      const testAudio = new Audio();
      console.log('🔊 SOUND: Audio API available:', testAudio.paused !== undefined);
      return testAudio.paused !== undefined;
    } catch (error) {
      console.error('🔇 SOUND: Audio API not available:', error);
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