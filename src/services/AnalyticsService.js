import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Analytics with a real (optional) sink: a dependency-free PostHog-compatible
// HTTP transport. With no POSTHOG_API_KEY configured everything degrades to the
// old local facade — the game NEVER blocks on analytics, and every network call
// is fire-and-forget + fully defensive. Retention is an empirical game: this is
// what makes the funnels (first session, gate returns, probe economy, clarity)
// tunable against data instead of vibes.

const DISTINCT_ID_KEY = '@dead_letters/analytics_id';
const FLUSH_INTERVAL_MS = 20000;
const FLUSH_BATCH_SIZE = 25;
const MAX_BUFFER = 200; // hard cap so a dead network can't grow memory forever

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.queue = [];
    this.userId = null;
    this.userProperties = {};
    // Remote sink state (config baked at bundle time via app.config.js extra).
    this.apiKey = Constants.expoConfig?.extra?.posthogApiKey || null;
    this.host = (Constants.expoConfig?.extra?.posthogHost || 'https://us.i.posthog.com').replace(/\/$/, '');
    this.distinctId = null;
    this.buffer = [];
    this.flushTimer = null;
  }

  init() {
    const deviceInfo = {
        deviceModel: Device.modelName,
        osVersion: Device.osVersion,
        manufacturer: Device.manufacturer
    };

    this.setUserProperties(deviceInfo);

    console.log(`[Analytics] Initialized (remote sink: ${this.apiKey ? 'PostHog' : 'none'})`);
    this.initialized = true;
    this.flushQueue();

    if (this.apiKey && !this.flushTimer) {
      this._ensureDistinctId();
      this.flushTimer = setInterval(() => { this._flushRemote(); }, FLUSH_INTERVAL_MS);
    }
  }

  async _ensureDistinctId() {
    if (this.distinctId) return this.distinctId;
    try {
      let id = await AsyncStorage.getItem(DISTINCT_ID_KEY);
      if (!id) {
        id = `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem(DISTINCT_ID_KEY, id);
      }
      this.distinctId = id;
    } catch (_e) {
      this.distinctId = `dl_session_${Math.random().toString(36).slice(2, 10)}`;
    }
    return this.distinctId;
  }

  _enqueueRemote(eventName, properties) {
    if (!this.apiKey) return;
    this.buffer.push({
      event: eventName,
      properties: { ...properties, $lib: 'dead-letters' },
      timestamp: new Date().toISOString(),
    });
    if (this.buffer.length > MAX_BUFFER) this.buffer = this.buffer.slice(-MAX_BUFFER);
    if (this.buffer.length >= FLUSH_BATCH_SIZE) this._flushRemote();
  }

  async _flushRemote() {
    if (!this.apiKey || !this.buffer.length) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      const distinctId = await this._ensureDistinctId();
      await fetch(`${this.host}/batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          batch: batch.map((e) => ({ ...e, distinct_id: distinctId })),
        }),
      });
    } catch (_e) {
      // Network failure: requeue (bounded) and try again on the next flush.
      this.buffer = [...batch, ...this.buffer].slice(-MAX_BUFFER);
    }
  }

  identify(userId, properties = {}) {
    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };
    this.logEvent('user_identified', { userId, ...properties });
  }

  setUserProperties(properties) {
    this.userProperties = { ...this.userProperties, ...properties };
  }

  logEvent(eventName, params = {}) {
    if (!this.initialized) {
      this.queue.push({ eventName, params });
      return;
    }

    const properties = {
      ...params,
      ...this.userProperties,
      platform: Platform.OS,
    };

    this._enqueueRemote(eventName, properties);
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
