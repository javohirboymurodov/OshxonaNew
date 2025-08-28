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
      
      // Check if audio is allowed (user has interacted with page)
      if (!this.canPlayAudio()) {
        console.log('🔇 SOUND: Audio playback not allowed yet - user needs to interact with page first');
        return;
      }
      
      let audio = this.audioCache.get(soundFile);
      
      if (!audio) {
        console.log('🔊 SOUND: Creating new audio instance for:', soundFile);
        audio = new Audio(soundFile);
        audio.preload = 'auto';
        this.audioCache.set(soundFile, audio);
        
        // Add event listeners for debugging
        audio.addEventListener('loadstart', () => console.log('🔊 SOUND: Loading started'));
        audio.addEventListener('canplay', () => console.log('🔊 SOUND: Can play'));
        audio.addEventListener('error', (e) => console.error('🔇 SOUND: Error loading audio:', e));
      }
      
      // Reset audio to beginning and set volume
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      
      console.log('🔊 SOUND: Playing audio with volume:', volume);
      
      // Play the audio
      await audio.play();
      console.log('✅ SOUND: Audio played successfully');
    } catch (error) {
      console.error('❌ SOUND: Failed to play notification sound:', error);
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