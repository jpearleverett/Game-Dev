import { Platform } from 'react-native';

// This is a facade for an analytics service (like Firebase, Amplitude, or Mixpanel).
// In a real implementation, you would initialize the SDKs here.

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.queue = [];
    this.userId = null;
    this.userProperties = {};
  }

  init() {
    // Simulate initialization
    console.log('[Analytics] Initializing...');
    this.initialized = true;
    this.flushQueue();
  }

  identify(userId, properties = {}) {
    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };
    this.logEvent('user_identified', { userId, ...properties });
  }

  setUserProperties(properties) {
    this.userProperties = { ...this.userProperties, ...properties };
    // console.log('[Analytics] Set User Properties:', properties);
  }

  logEvent(eventName, params = {}) {
    if (!this.initialized) {
      this.queue.push({ eventName, params });
      return;
    }

    const eventData = {
      event: eventName,
      params: {
        ...params,
        platform: Platform.OS,
        timestamp: Date.now(),
      },
    };

    // In production, replace this with: analytics().logEvent(eventName, params);
    if (__DEV__) {
      console.log(`[Analytics Event]: ${eventName}`, JSON.stringify(params, null, 2));
    }
  }

  flushQueue() {
    this.queue.forEach(({ eventName, params }) => {
      this.logEvent(eventName, params);
    });
    this.queue = [];
  }

  // Specific Game Events
  logLevelStart(caseId, mode) {
    this.logEvent('level_start', { caseId, mode });
  }

  logLevelComplete(caseId, mode, attemptsUsed, success) {
    this.logEvent('level_complete', {
      caseId,
      mode,
      attemptsUsed,
      success,
      result: success ? 'solved' : 'failed',
    });
  }

  logWordSelected(word, isCorrect) {
    this.logEvent('word_selected', { word, isCorrect });
  }
  
  logScreenView(screenName) {
      this.logEvent('screen_view', { screen_name: screenName });
  }
}

export const analytics = new AnalyticsService();
