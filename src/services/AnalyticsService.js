import { Platform } from 'react-native';
import * as Device from 'expo-device';

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
    // In production: firebase.analytics().setAnalyticsCollectionEnabled(true);
    
    const deviceInfo = {
        deviceModel: Device.modelName,
        osVersion: Device.osVersion,
        manufacturer: Device.manufacturer
    };
    
    this.setUserProperties(deviceInfo);
    
    console.log('[Analytics] Initialized with device info:', deviceInfo);
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
        ...this.userProperties, // Attach user props to context if needed
        platform: Platform.OS,
        timestamp: Date.now(),
      },
    };

    // In production: analytics().logEvent(eventName, params);
    // Amplitude: amplitude.getInstance().logEvent(eventName, params);
    if (__DEV__) {
      // console.log(`[Analytics Event]: ${eventName}`, JSON.stringify(params, null, 2));
    }
  }

  flushQueue() {
    this.queue.forEach(({ eventName, params }) => {
      this.logEvent(eventName, params);
    });
    this.queue = [];
  }

  // Specific Game Events
  logLevelStart(caseId, mode, pathKey = 'ROOT') {
    this.logEvent('level_start', { caseId, mode, pathKey });
  }

  logLevelComplete(caseId, mode, attemptsUsed, success, pathKey = 'ROOT') {
    this.logEvent('level_complete', {
      caseId,
      mode,
      attemptsUsed,
      success,
      result: success ? 'solved' : 'failed',
      pathKey
    });
  }

  logDecision(caseId, decisionKey) {
    this.logEvent('story_decision', { caseId, decisionKey });
  }

  logWordSelected(word, isCorrect) {
    this.logEvent('word_selected', { word, isCorrect });
  }
  
  logScreenView(screenName) {
      this.logEvent('screen_view', { screen_name: screenName });
  }
}

export const analytics = new AnalyticsService();
