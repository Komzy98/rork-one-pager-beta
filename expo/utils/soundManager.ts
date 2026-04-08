import { Platform } from 'react-native';

// Simple sound manager without expo-av dependency
// Uses web audio API on web and haptic feedback on mobile

type SoundType = 'tap' | 'complete' | 'error' | 'success';

class SoundManager {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Simple initialization without expo-av
      this.isInitialized = true;
      console.log('Sound manager initialized (simplified version)');
    } catch (error) {
      console.warn('Failed to initialize sound manager:', error);
    }
  }

  async playSound(type: SoundType, volume: number = 1.0) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Simple sound feedback without expo-av
      if (Platform.OS === 'web') {
        // Web fallback - could use Web Audio API or HTML5 audio
        console.log(`Playing sound: ${type} at volume ${volume} (web)`);
        
        // Simple web audio beep for feedback
        if (typeof window !== 'undefined' && window.AudioContext) {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different frequencies for different sound types
            const frequencies = {
              tap: 800,
              complete: 1000,
              error: 400,
              success: 1200
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume * 0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
          } catch (webAudioError) {
            console.log(`Sound feedback: ${type} (web audio not available)`);
          }
        }
      } else {
        // Mobile fallback - use haptic feedback instead of audio
        try {
          const Haptics = require('expo-haptics');
          switch (type) {
            case 'tap':
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              break;
            case 'complete':
            case 'success':
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              break;
            case 'error':
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              break;
            default:
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          console.log(`Haptic feedback: ${type}`);
        } catch (hapticsError) {
          console.log(`Sound feedback: ${type} (haptics not available)`);
        }
      }
    } catch (error) {
      console.warn(`Failed to play sound ${type}:`, error);
    }
  }

  async cleanup() {
    try {
      // Simple cleanup
      this.isInitialized = false;
      console.log('Sound manager cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup sounds:', error);
    }
  }
}

export const soundManager = new SoundManager();