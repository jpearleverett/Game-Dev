import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { SEASON_ONE_CASES } from '../data/cases';
import { STATUS, getCaseByNumber, formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter } from '../data/storyContent';
import { advanceWithDecision, advanceSubchapter, caseOrder } from '../utils/storyAdvance';
import {
  addClue as boardAddClue,
  addClues as boardAddClues,
} from '../data/caseBoard';
import {
  makeFragment as umMakeFragment,
  addFragments as umAddFragments,
  addRelations as umAddRelations,
  connectFragments as umConnect,
  senseConnection as umSense,
  resolveReading as umResolveReading,
  recordDescent as umRecordDescent,
  recordTheory as umRecordTheory,
  resolveTheory as umResolveTheory,
  nameFoil as umNameFoil,
  drawDailyStir as umDrawStir,
  resolveDailyStir as umResolveStir,
  touchUnderMap as umTouch,
  claimByFoil as umClaimByFoil,
  seedNewGamePlus as umSeedNewGamePlus,
  clarity as umClarity,
  motifCount,
  keystoneCount,
  mapDepth,
  foilPresence,
  bestFlawlessStreak,
} from '../data/underMap';
// Removed: internal usePersistence hook call
import { useGameLogic } from '../hooks/useGameLogic';
import { notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { analytics } from '../services/AnalyticsService';
import { createTraceId, llmTrace, log } from '../utils/llmTrace';
import { purchaseService } from '../services/PurchaseService';
import {
  scheduleDailyStirReminder,
  scheduleUnlockNotification,
  cancelUnlockNotification,
  installNotificationOpenListener,
} from '../services/dailyStirNotifications';
import { ACHIEVEMENTS } from '../data/achievementsData';
import { useAudio } from './AudioContext';
import { useStory } from './StoryContext';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

export { STATUS };
export const GAME_STATUS = STATUS;

// Updated: Accepts persistence props injected from parent
export function GameProvider({
  children,
  progress,
  hydrationComplete,
  updateProgress,
  updateSettings,
  markPrologueSeen,
  markTutorialComplete,
  setPremiumUnlocked,
  markCaseBriefingSeen,
  clearProgress
}) {
  const audio = useAudio();
  const story = useStory();

  useEffect(() => {
    analytics.init();
  }, []);

  // RETENTION: local notifications (fully defensive no-ops on web / denial).
  // 1) Daily stir reminder — the once-a-day "the map stirred" habit hook.
  useEffect(() => {
    if (hydrationComplete) scheduleDailyStirReminder();
  }, [hydrationComplete]);
  // 2) The unlock VERDICT hook: coming back to a verdict on your own sealed
  // reading is a far stronger re-entry than "next chapter available". Scheduled
  // at nextStoryUnlockAt; cancelled if the lock is consumed early (trail/bribe)
  // or the campaign completes.
  const nextStoryUnlockAtIso = progress?.storyCampaign?.nextStoryUnlockAt || null;
  const latestSealedBelief = progress?.storyCampaign?.underMap?.theories?.[0]?.interpretation || null;
  useEffect(() => {
    if (!hydrationComplete) return;
    if (nextStoryUnlockAtIso) scheduleUnlockNotification(nextStoryUnlockAtIso, latestSealedBelief);
    else cancelUnlockNotification();
  }, [hydrationComplete, nextStoryUnlockAtIso, latestSealedBelief]);
  // 3) Measure whether the hooks WORK: app opens that came from a notification.
  useEffect(() => installNotificationOpenListener(({ kind }) => {
    analytics.logEvent('notification_open', { kind });
  }), []);

  const {
    gameState,
    activeCase,
    toggleWordSelection: coreToggleWordSelection,
    submitGuess: coreSubmitGuess,
    resetBoardForCase,
    initializeGame,
    setActiveCaseInternal,
    gameDispatch,
  } = useGameLogic(SEASON_ONE_CASES, progress, updateProgress);

  const [mode, setMode] = useState('daily');
  const [achievementToast, setAchievementToast] = useState(null);

  // Initialize game state when persistence is ready
  useEffect(() => {
    if (hydrationComplete && !gameState.hydrationComplete) {
      let initialCaseId = progress.currentCaseId;
      initializeGame(progress, initialCaseId);
    }
  }, [hydrationComplete, gameState.hydrationComplete, progress, initializeGame]);

  const activateStoryCase = useCallback(
    async ({ skipLock = false, mode: targetMode = 'daily' } = {}) => {
      // Story Mode Logic
      if (targetMode === 'story') {
          const traceId = createTraceId('activateStoryCase');
          const result = story.activateStoryCase({ skipLock });
          llmTrace('GameContext', traceId, 'activateStoryCase.activateStoryCaseResult', {
            ok: !!result?.ok,
            reason: result?.reason,
            skipLock,
            returnedCaseNumber: result?.caseNumber,
            awaitingDecision: !!story.storyCampaign?.awaitingDecision,
            pendingDecisionCase: story.storyCampaign?.pendingDecisionCase,
            storyChapter: story.storyCampaign?.chapter,
            storySubchapter: story.storyCampaign?.subchapter,
            activeCaseNumber: story.storyCampaign?.activeCaseNumber,
          }, result?.ok ? 'debug' : 'warn');
          if (!result.ok) return result;

          const caseNumber = result.caseNumber;
          const pathKey = story.getCurrentPathKey(caseNumber);
          llmTrace('GameContext', traceId, 'activateStoryCase.resolvedTarget', { caseNumber, pathKey }, 'debug');

          // Check if we need to generate content for this case
          // isDynamicChapter returns true for 1B, 1C, and all of chapters 2-12
          // (1A is static but has branching; its content is in storyNarrative.json)
          if (isDynamicChapter(caseNumber)) {
            log.debug('GameContext', `Ensuring story content for ${caseNumber} (path: ${pathKey})...`);
            const genStartTime = Date.now();
            const genResult = await story.ensureStoryContent(caseNumber, pathKey);
            const genDuration = Date.now() - genStartTime;
            llmTrace('GameContext', traceId, 'activateStoryCase.ensureStoryContent.result', {
              caseNumber,
              pathKey,
              ok: !!genResult?.ok,
              reason: genResult?.reason,
              generated: !!genResult?.generated,
              isFallback: !!genResult?.isFallback,
              isEmergencyFallback: !!genResult?.isEmergencyFallback,
              durationMs: genDuration,
            }, genResult?.ok ? 'debug' : 'warn');

            // CRITICAL: If generation fails, we MUST return error - never continue
            // Player will see error screen with retry button
            if (!genResult.ok) {
              console.error(`[GameContext] Cannot continue - generation failed: ${genResult.reason}`);
              console.error(`[GameContext] Error details: ${genResult.error || 'unknown error'}`);
              return {
                ok: false,
                reason: genResult.reason,
                error: genResult.error || 'Generation failed. Please try again.',
                caseNumber
              };
            } else {
              // Log success details (verbose mode only for normal operation)
              if (genResult.isFallback || genResult.isEmergencyFallback) {
                console.warn(`[GameContext] Using FALLBACK content for ${caseNumber}`);
              } else if (genResult.generated) {
                log.debug('GameContext', `AI content ready for ${caseNumber} (${genDuration}ms)`);
              } else {
                log.debug('GameContext', `Content cached for ${caseNumber}`);
              }
            }
          }

          const targetCase = getCaseByNumber(caseNumber);

          if (!targetCase) return { ok: false, reason: 'missing-case-data' };

          setActiveCaseInternal(targetCase.id);
          setMode('story');
          llmTrace('GameContext', traceId, 'activateStoryCase.navigationReady', {
            caseId: targetCase.id,
            caseNumber,
            pathKey,
          }, 'debug');

          // Analytics
          analytics.logLevelStart(targetCase.id, 'story', pathKey);

          // Trigger background generation via StoryContext
          // Now handles all subchapters robustly, not just subchapter 1
          const { chapter } = parseCaseNumber(caseNumber);
          if (chapter < 12) {
            story.handleBackgroundGeneration(caseNumber, pathKey);
          }

          // NOTE: No early Chapter 2 prefetch. Generation now happens when player makes
          // their choice at end of Chapter 1C, and puzzle-solving time masks the ~45s generation.
          // This saves an LLM call (no longer generating both A and B paths speculatively).

          // Return caseNumber to avoid stale closure issues in navigation
          return { ok: true, caseId: targetCase.id, caseNumber };
      }

      // Daily Mode Logic
      const targetCaseId = progress.currentCaseId;
      const targetCase = SEASON_ONE_CASES.find(c => c.id === targetCaseId) || SEASON_ONE_CASES[0];

      setActiveCaseInternal(targetCase.id);
      setMode('daily');
      analytics.logLevelStart(targetCase.id, 'daily');
      return { ok: true, caseId: targetCase.id };

    },
    [story, setActiveCaseInternal, progress.currentCaseId]
  );

  // Helper to parse case number (duplicated from original context for local use)
  const parseCaseNumber = (caseNumber) => {
    if (!caseNumber) return { chapter: 1, subchapter: 1 };
    const chapterSegment = caseNumber.slice(0, 3);
    const letter = caseNumber.slice(3, 4);
    const chapter = parseInt(chapterSegment, 10) || 1;
    const subchapter = { 'A': 1, 'B': 2, 'C': 3 }[letter] || 1;
    return { chapter, subchapter };
  };

  const enterStoryCampaign = useCallback(({ reset = false } = {}) => {
    if (reset) {
        // NEW GAME+: restarting after a COMPLETED run carries The Other Reader
        // over (named, presence 1) — the city remembers being read. A restart
        // mid-campaign stays a clean slate.
        updateProgress((prev) => {
          const old = normalizeStoryCampaignShape(prev.storyCampaign);
          const fresh = normalizeStoryCampaignShape(null);
          if (old.completed) {
            fresh.underMap = umSeedNewGamePlus(old.underMap);
            fresh.ngPlus = (old.ngPlus || 0) + 1;
            analytics.logEvent('ng_plus_start', { run: fresh.ngPlus });
          }
          return { storyCampaign: fresh };
        });
        return true;
    }
    return activateStoryCase({ mode: 'story' });
  }, [updateProgress, activateStoryCase]);

  const continueStoryCampaign = useCallback(() => {
    return activateStoryCase({ mode: 'story' });
  }, [activateStoryCase]);

  // Daily-hook: free bypass of the soft cadence. Clears the unlock timer and
  // continues immediately (skipLock), so an engaged player is never hard-walled.
  const pickUpTrailNow = useCallback(() => {
    const current = normalizeStoryCampaignShape(progress.storyCampaign);
    if (current.nextStoryUnlockAt) {
      updateProgress({
        storyCampaign: { ...current, nextStoryUnlockAt: null },
        nextUnlockAt: null,
      });
    }
    return activateStoryCase({ mode: 'story', skipLock: true });
  }, [progress.storyCampaign, updateProgress, activateStoryCase]);

  const openStoryCase = useCallback((caseId) => {
      const targetCase = SEASON_ONE_CASES.find(c => c.id === caseId);
      if (!targetCase) return false;
      
      setActiveCaseInternal(targetCase.id);
      setMode('story');
      
      const pathKey = story.getCurrentPathKey(targetCase.caseNumber);
      analytics.logLevelStart(targetCase.id, 'story', pathKey);
      return true;
  }, [setActiveCaseInternal, story]);

  const exitStoryCampaign = useCallback(() => {
      setMode('daily');
      const dailyCaseId = progress.currentCaseId;
      setActiveCaseInternal(dailyCaseId);
  }, [progress.currentCaseId, setActiveCaseInternal]);

  const ensureDailyStoryCase = useCallback(() => {
      const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
      if (currentStory.activeCaseNumber && !currentStory.awaitingDecision) {
          const storyCase = SEASON_ONE_CASES.find(c => c.caseNumber === currentStory.activeCaseNumber);
          if (storyCase && storyCase.id !== progress.currentCaseId) {
              setActiveCaseInternal(storyCase.id);
              setMode('daily');
              updateProgress({ currentCaseId: storyCase.id });
              return { ok: true, caseId: storyCase.id };
          }
      }
      return activateStoryCase({ mode: 'daily' });
  }, [progress.storyCampaign, progress.currentCaseId, activateStoryCase, setActiveCaseInternal, updateProgress]);

  const purchaseBribe = useCallback(async () => {
      try {
          const offerings = await purchaseService.getOfferings();
          const bribePackage = offerings?.current?.availablePackages?.find(
              p => p.product.identifier === 'com.deadletters.bribe_clerk'
          );
          
          if (!bribePackage) throw new Error('Bribe package not found');
  
          const { customerInfo } = await purchaseService.purchasePackage(bribePackage);
          
          if (customerInfo.entitlements.active['com.deadletters.bribe_clerk']?.isActive) {
               const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
               let updates = {
                   storyCampaign: {
                       ...currentStory,
                       nextStoryUnlockAt: null 
                   }
               };

               if (currentStory.activeCaseNumber) {
                   const nextCase = SEASON_ONE_CASES.find(c => c.caseNumber === currentStory.activeCaseNumber);
                   if (nextCase) {
                       setActiveCaseInternal(nextCase.id);
                       updates.currentCaseId = nextCase.id;
                   }
               }
               
               updateProgress(updates);
               notificationHaptic(Haptics.NotificationFeedbackType.Success);
               return true;
          }
          return false;
      } catch (e) {
          if (!e.userCancelled) {
            console.warn('Bribe purchase failed', e);
          }
          return false;
      }
  }, [progress.storyCampaign, updateProgress, setActiveCaseInternal]);

  const purchaseFullUnlock = useCallback(async () => {
       try {
          const offerings = await purchaseService.getOfferings();
          const fullPackage = offerings?.current?.availablePackages?.find(
              p => p.product.identifier === 'com.deadletters.full_unlock'
          );
          
          if (!fullPackage) throw new Error('Full unlock package not found');
  
          const { customerInfo } = await purchaseService.purchasePackage(fullPackage);
          
          if (customerInfo.entitlements.active['com.deadletters.full_unlock']?.isActive) {
               updateProgress({
                   premiumUnlocked: true,
                   storyCampaign: {
                       ...normalizeStoryCampaignShape(progress.storyCampaign),
                       fullUnlock: true,
                       nextStoryUnlockAt: null
                   }
               });
               notificationHaptic(Haptics.NotificationFeedbackType.Success);
               return true;
          }
          return false;
      } catch (e) {
          if (!e.userCancelled) {
            console.warn('Full unlock purchase failed', e);
          }
          return false;
      }
  }, [progress.storyCampaign, updateProgress]);

  const unlockNextCaseIfReady = useCallback(() => {
      if (!progress.nextUnlockAt) return;
      const nowIso = new Date().toISOString();
      if (nowIso >= progress.nextUnlockAt) {
          const currentUnlocked = progress.unlockedCaseIds || [];
          const seasonCount = SEASON_ONE_CASES.length; 
          if (currentUnlocked.length < seasonCount) {
               const nextId = currentUnlocked.length + 1;
               updateProgress({
                   unlockedCaseIds: Array.from(new Set([...currentUnlocked, nextId])),
                   nextUnlockAt: null
               });
          }
      }
  }, [progress, updateProgress]);

  const advanceToCase = useCallback((caseId) => {
      setActiveCaseInternal(caseId);
      if (mode === 'daily') {
          updateProgress({ currentCaseId: caseId });
      }
  }, [setActiveCaseInternal, mode, updateProgress]);

  const toggleWordSelection = useCallback((word) => {
    coreToggleWordSelection(word);
  }, [coreToggleWordSelection]);

  const submitGuess = useCallback(() => {
      const result = coreSubmitGuess();
      if (!result) return;

      const { status: nextStatus, attemptsUsed, caseId } = result;

      // Analytics
      const pathKey = story.getCurrentPathKey(activeCase.caseNumber);
      if (nextStatus === STATUS.SOLVED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, true, pathKey);
      } else if (nextStatus === STATUS.FAILED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, false, pathKey);
      }

      if (nextStatus === STATUS.SOLVED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Success);
          audio.playVictory();
      } else if (nextStatus === STATUS.FAILED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Error);
          audio.playFailure();
      } else {
          impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
          audio.playSubmit();
      }
      
      if (nextStatus === STATUS.SOLVED || nextStatus === STATUS.FAILED) {
          const nowIso = new Date().toISOString();
          
          const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
          const isStoryCase = activeCase.caseNumber === currentStory.activeCaseNumber;

          // Only update story state if we're solving the ACTUAL current story case.
          // This prevents state corruption when solving a non-story case while in story mode.
          if (isStoryCase && (mode === 'story' || nextStatus === STATUS.SOLVED)) {
              const completedCaseNumbers = Array.from(
                  new Set([...(currentStory.completedCaseNumbers || []), activeCase.caseNumber])
              );
              
              const isFinalSubchapter = currentStory.subchapter >= 3; 
              
              let updatedStory = {
                  ...currentStory,
                  completedCaseNumbers,
                  startedAt: currentStory.startedAt || nowIso,
              };

              if (isFinalSubchapter) {
                  // NARRATIVE-FIRST FLOW: Check if a pre-puzzle decision was made
                  // If so, apply it now and advance to the next chapter
                  const preDecision = currentStory.preDecision;
                  if (preDecision && preDecision.caseNumber === activeCase.caseNumber) {
                    log.debug('GameContext', `C subchapter solved with pre-decision: applying Option ${preDecision.optionKey}`);
                    // Apply the pre-decision - this will update storyCampaign and advance
                    // We need to merge our completedCaseNumbers update with the apply
                    story.applyPreDecision();
                    // Don't set awaitingDecision - the applyPreDecision handles advancement
                    return;
                  }

                  // No pre-decision: fall back to original flow (show decision after puzzle)
                  // Store the decision options so we can include title/focus in choice history
                  // This enables the LLM to know WHAT the player chose, not just "A" or "B"
                  const pendingDecisionOptions = {};
                  if (activeCase.storyDecision?.optionA) {
                    pendingDecisionOptions.A = {
                      title: activeCase.storyDecision.optionA.title,
                      focus: activeCase.storyDecision.optionA.focus,
                    };
                  }
                  if (activeCase.storyDecision?.optionB) {
                    pendingDecisionOptions.B = {
                      title: activeCase.storyDecision.optionB.title,
                      focus: activeCase.storyDecision.optionB.focus,
                    };
                  }
                  // Fallback to options[] array if optionA/optionB not available
                  if (!pendingDecisionOptions.A && activeCase.storyDecision?.options?.[0]) {
                    const opt = activeCase.storyDecision.options[0];
                    pendingDecisionOptions[opt.key || 'A'] = { title: opt.title, focus: opt.focus };
                  }
                  if (!pendingDecisionOptions.B && activeCase.storyDecision?.options?.[1]) {
                    const opt = activeCase.storyDecision.options[1];
                    pendingDecisionOptions[opt.key || 'B'] = { title: opt.title, focus: opt.focus };
                  }

                  updatedStory = {
                      ...updatedStory,
                      awaitingDecision: true,
                      pendingDecisionCase: activeCase.caseNumber,
                      pendingDecisionOptions, // Store decision titles for LLM context
                      lastDecision: null,
                  };
              } else {
                  const nextSubchapter = currentStory.subchapter + 1;
                  const nextCaseNumber = formatCaseNumber(currentStory.chapter, nextSubchapter);
                  updatedStory = {
                      ...updatedStory,
                      subchapter: nextSubchapter,
                      activeCaseNumber: nextCaseNumber,
                      awaitingDecision: false,
                      pendingDecisionCase: null,
                  };
              }

              updateProgress({
                  storyCampaign: updatedStory,
                  nextUnlockAt: updatedStory.nextStoryUnlockAt
              });

              // Keep the reducer's active case id in sync with the story position.
              // The evidence-board path previously advanced storyCampaign without
              // updating activeCaseId (unlike the logic-puzzle path), which left the
              // active case stale and could snap the player back to 001A.
              if (updatedStory.activeCaseNumber && !updatedStory.awaitingDecision) {
                  const advancedCase = getCaseByNumber(updatedStory.activeCaseNumber);
                  if (advancedCase?.id) {
                      setActiveCaseInternal(advancedCase.id);
                  }
              }

          } else {
              const distributionKey = nextStatus === STATUS.SOLVED 
                  ? Math.max(1, Math.min(activeCase.attempts || 4, attemptsUsed)) 
                  : 'fail';
              
              const unlockedCaseIds = Array.from(new Set([...progress.unlockedCaseIds, caseId]));
              
              const newStats = {
                  streak: nextStatus === STATUS.SOLVED ? progress.streak + 1 : 0,
                  bestStreak: nextStatus === STATUS.SOLVED 
                      ? Math.max(progress.bestStreak, progress.streak + 1) 
                      : progress.bestStreak,
                  solvedCaseIds: nextStatus === STATUS.SOLVED
                      ? Array.from(new Set([...progress.solvedCaseIds, caseId]))
                      : progress.solvedCaseIds,
                  failedCaseIds: nextStatus === STATUS.FAILED
                      ? Array.from(new Set([...progress.failedCaseIds, caseId]))
                      : progress.failedCaseIds,
                  attemptsDistribution: {
                      ...progress.attemptsDistribution,
                      [distributionKey]: (progress.attemptsDistribution[distributionKey] || 0) + 1
                  },
                  lastPlayedDate: nowIso,
                  unlockedCaseIds,
              };
              
              updateProgress(newStats);

              // §8.1 bridge: finishing the daily word puzzle resolves today's
              // Under-Map stir (advances the days-mapped streak + deepens the
              // drifted fragment). Functional + underMap-only, so it never
              // clobbers the campaign (see the non-story guard above).
              if (nextStatus === STATUS.SOLVED) {
                  updateProgress((prev) => {
                      const camp = normalizeStoryCampaignShape(prev.storyCampaign);
                      const before = camp.underMap;
                      const after = umResolveStir(before);
                      if (after?.dailyStir?.resolved === before?.dailyStir?.resolved
                          && after?.dailyStreak === before?.dailyStreak) {
                          return null;
                      }
                      return { storyCampaign: { ...camp, underMap: after } };
                  });
              }
          }
      }
  }, [coreSubmitGuess, mode, progress, activeCase, updateProgress, story, audio, setActiveCaseInternal]);

  const completeLogicPuzzle = useCallback(({ caseId, caseNumber, mistakes: puzzleMistakes = 0 } = {}) => {
      if (!caseId || !caseNumber) return;
      // NOTE: no `mode !== story` guard — this is only called from the story gates
      // (Under-Map CONNECT / Theory climax), and a transiently-stale mode must never
      // block the campaign advance (that stranded the player at 001A).

      const nowIso = new Date().toISOString();
      const pathKey = story.getCurrentPathKey(caseNumber);

      analytics.logLevelComplete(caseId, mode || 'story', Math.max(1, puzzleMistakes + 1), true, pathKey);
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
      audio.playVictory();

      const { chapter, subchapter } = parseCaseNumber(caseNumber);
      const isFinalSubchapter = subchapter >= 3;
      // The position we WOULD advance to (derived from the completed case).
      const targetOrder = isFinalSubchapter ? (chapter + 1) * 10 + 1 : chapter * 10 + (subchapter + 1);

      // Post-puzzle decision options (only used in the no-pre-decision fallback).
      const sd = activeCase?.storyDecision;
      const pendingDecisionOptions = {};
      if (sd?.optionA) pendingDecisionOptions.A = { title: sd.optionA.title, focus: sd.optionA.focus };
      if (sd?.optionB) pendingDecisionOptions.B = { title: sd.optionB.title, focus: sd.optionB.focus };
      if (!pendingDecisionOptions.A && sd?.options?.[0]) pendingDecisionOptions[sd.options[0].key || 'A'] = { title: sd.options[0].title, focus: sd.options[0].focus };
      if (!pendingDecisionOptions.B && sd?.options?.[1]) pendingDecisionOptions[sd.options[1].key || 'B'] = { title: sd.options[1].title, focus: sd.options[1].focus };

      let advancedCaseNumber = null;

      // FUNCTIONAL + FORWARD-ONLY: read the latest campaign, derive the next position
      // from the COMPLETED case, and only ever move forward. This is robust to the
      // campaign/navigation drift that previously stranded the player at 001A.
      updateProgress((prev) => {
        const current = normalizeStoryCampaignShape(prev.storyCampaign);
        const curOrder = caseOrder(current.activeCaseNumber);

        if (isFinalSubchapter) {
          const pre = current.preDecision;
          if (pre && pre.caseNumber === caseNumber) {
            if (targetOrder <= curOrder) return null; // already advanced past this climax
            const updatedStory = advanceWithDecision(current, {
              decisionCase: caseNumber,
              optionKey: pre.optionKey,
              optionTitle: pre.optionTitle,
              optionFocus: pre.optionFocus,
              timestamp: pre.timestamp,
            });
            advancedCaseNumber = updatedStory.activeCaseNumber;
            return { storyCampaign: updatedStory, nextUnlockAt: updatedStory.nextStoryUnlockAt };
          }
          // No pre-decision: surface the post-puzzle decision panel (only if we
          // haven't already advanced past this case).
          if (curOrder > caseOrder(caseNumber)) return null; // already advanced past this case
          return {
            storyCampaign: {
              ...current,
              completedCaseNumbers: Array.from(new Set([...(current.completedCaseNumbers || []), caseNumber])),
              startedAt: current.startedAt || nowIso,
              awaitingDecision: true,
              pendingDecisionCase: caseNumber,
              pendingDecisionOptions,
              lastDecision: null,
            },
          };
        }

        if (targetOrder <= curOrder) return null; // already advanced past this subchapter
        const updatedStory = advanceSubchapter(current, caseNumber, { startedAt: nowIso });
        advancedCaseNumber = updatedStory.activeCaseNumber;
        return { storyCampaign: updatedStory, nextUnlockAt: updatedStory.nextStoryUnlockAt };
      });

      if (advancedCaseNumber) {
        const nextCase = getCaseByNumber(advancedCaseNumber);
        if (nextCase?.id) setActiveCaseInternal(nextCase.id);
      }
  }, [mode, updateProgress, story, audio, setActiveCaseInternal, activeCase]);

  // ========== CASE BOARD (DEDUCTION) ==========
  // Mutations to the running deduction board. Each reads the current campaign,
  // applies a pure caseBoard helper, and writes back via updateProgress (which
  // auto-persists). Centralised here so every screen posts to one board.
  const _mutateCaseBoard = useCallback((mutator) => {
    // Functional update: read the LATEST campaign at write time so a Case Board
    // write can never clobber a concurrent story advance (the 1C -> 1A reset).
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const nextBoard = mutator(current.caseBoard);
      if (nextBoard === current.caseBoard) return null;
      return { storyCampaign: { ...current, caseBoard: nextBoard } };
    });
  }, [updateProgress]);

  const addCaseClue = useCallback((clue) => _mutateCaseBoard((b) => boardAddClue(b, clue)), [_mutateCaseBoard]);
  const addCaseClues = useCallback((clues) => _mutateCaseBoard((b) => boardAddClues(b, clues)), [_mutateCaseBoard]);

  // ========== UNDER-MAP ==========
  // Functional updates (read latest at write time) so these never clobber a
  // concurrent story advance.
  const ingestSceneFragments = useCallback((fragments, relations, meta = {}) => {
    const frags = Array.isArray(fragments) ? fragments : [];
    const rels = Array.isArray(relations) ? relations : [];
    if (!frags.length && !rels.length) return null;
    const currentSnapshot = normalizeStoryCampaignShape(progress.storyCampaign);
    let snapshotMap = currentSnapshot.underMap;
    if (frags.length) {
      snapshotMap = umAddFragments(snapshotMap, frags.map((f) => umMakeFragment({ ...f, caseNumber: meta.caseNumber, chapter: meta.chapter })));
    }
    if (rels.length) snapshotMap = umAddRelations(snapshotMap, rels, { caseNumber: meta.caseNumber });
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      let um = current.underMap;
      if (frags.length) {
        um = umAddFragments(um, frags.map((f) => umMakeFragment({ ...f, caseNumber: meta.caseNumber, chapter: meta.chapter })));
      }
      if (rels.length) um = umAddRelations(um, rels, { caseNumber: meta.caseNumber });
      if (um === current.underMap) return null;
      return { storyCampaign: { ...current, underMap: um } };
    });
    if (frags.length) {
      analytics.logEvent('examine_fragment', { count: frags.length, caseNumber: meta.caseNumber || null });
    }
    return snapshotMap;
  }, [progress.storyCampaign, updateProgress]);

  const connectUnderMap = useCallback((aId, bId) => {
    const current = normalizeStoryCampaignShape(progress.storyCampaign);
    const result = umConnect(current.underMap, aId, bId);
    if (result.map !== current.underMap) {
      updateProgress((prev) => {
        const c = normalizeStoryCampaignShape(prev.storyCampaign);
        const r = umConnect(c.underMap, aId, bId);
        if (r.map === c.underMap) return null;
        return { storyCampaign: { ...c, underMap: r.map } };
      });
    }
    return result; // { revealed, valid, alreadyConnected } for the UI reveal
  }, [progress.storyCampaign, updateProgress]);

  // CONNECT-as-deduction (Move 1): probe a pair WITHOUT mutating, so the UI can
  // surface candidate readings (choose-the-truth) and spend a probe only on a miss.
  const senseUnderMap = useCallback((aId, bId) => {
    const current = normalizeStoryCampaignShape(progress.storyCampaign);
    return umSense(current.underMap, aId, bId);
  }, [progress.storyCampaign]);

  // Commit a connection with the player's chosen reading. Returns the result
  // (node, correctReading, alreadyConnected, upgraded) for the reveal UI.
  const resolveUnderMapReading = useCallback((aId, bId, chosenRevelation) => {
    const current = normalizeStoryCampaignShape(progress.storyCampaign);
    const result = umResolveReading(current.underMap, aId, bId, chosenRevelation);
    if (result.map !== current.underMap) {
      updateProgress((prev) => {
        const c = normalizeStoryCampaignShape(prev.storyCampaign);
        const r = umResolveReading(c.underMap, aId, bId, chosenRevelation);
        if (r.map === c.underMap) return null;
        return { storyCampaign: { ...c, underMap: r.map } };
      });
      if (result.correctReading && (result.revealed?.node || result.upgraded)) {
        story.prefetchAfterUnderMapReveal?.(current.activeCaseNumber, result.map);
      }
    }
    return result;
  }, [progress.storyCampaign, updateProgress, story]);

  // FOIL INCURSION: at presence >= 2, The Other Reader claims one hidden thread
  // when a chapter's gated descent opens (at most once per chapter). Returns the
  // claim ({ relation, node }) or null so the board can announce it.
  const claimUnderMapByFoil = useCallback((chapter) => {
    const current = normalizeStoryCampaignShape(progress.storyCampaign);
    const probe = umClaimByFoil(current.underMap, { chapter });
    if (!probe.claimed) return null;
    updateProgress((prev) => {
      const c = normalizeStoryCampaignShape(prev.storyCampaign);
      const r = umClaimByFoil(c.underMap, { chapter });
      if (!r.claimed) return null;
      return { storyCampaign: { ...c, underMap: r.map } };
    });
    analytics.logEvent('foil_claim', { chapter });
    return probe.claimed;
  }, [progress.storyCampaign, updateProgress]);

  // Record a completed descent for the flawless-mapping streak (tense-but-forgiving).
  const recordUnderMapDescent = useCallback(({ hadMisstep = false } = {}) => {
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const afterDescent = umRecordDescent(current.underMap, { hadMisstep });
      const um = umResolveStir(afterDescent);
      if (um === current.underMap) return null;
      return { storyCampaign: { ...current, underMap: um } };
    });
  }, [updateProgress]);

  // Bear out a sealed belief once the story reveals whether it was right (Move 3).
  // Idempotent: resolveTheory only flips the first still-unresolved theory for the
  // chapter, so re-applying the same scene's resolution is a safe no-op.
  const resolveUnderMapBelief = useCallback(({ chapter, correct } = {}) => {
    if (!Number.isFinite(chapter) || typeof correct !== 'boolean') return;
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const um = current.underMap;
      // Skip cleanly if there's nothing to resolve (normalizeUnderMap always
      // clones, so we can't rely on reference equality to detect the no-op).
      const hasUnresolved = Array.isArray(um?.theories)
        && um.theories.some((t) => t.chapter === chapter && t.correct == null);
      if (!hasUnresolved) return null;
      return { storyCampaign: { ...current, underMap: umResolveTheory(um, chapter, correct) } };
    });
    analytics.logEvent('belief_resolved', { chapter, correct });
  }, [updateProgress]);

  // THE OTHER READER: pin the foil's name the first time a scene names them.
  // Idempotent: skip if there's no foil or it's already named.
  const nameUnderMapFoil = useCallback((name) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const f = current.underMap?.foil;
      if (!f || f.name) return null;
      return { storyCampaign: { ...current, underMap: umNameFoil(current.underMap, clean) } };
    });
  }, [updateProgress]);

  // Daily on-ramp (§8.1): draw today's drifting fragment (idempotent per day) and
  // resolve it (advances the days-mapped streak). Guarded against render churn.
  const drawUnderMapDailyStir = useCallback(() => {
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const um = umDrawStir(current.underMap);
      const a = current.underMap?.dailyStir;
      const b = um?.dailyStir;
      const unchanged = (!a && !b)
        || (a && b && a.date === b.date && a.fragmentId === b.fragmentId && a.resolved === b.resolved);
      if (unchanged) return null;
      return { storyCampaign: { ...current, underMap: um } };
    });
  }, [updateProgress]);

  const resolveUnderMapDailyStir = useCallback(() => {
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const before = current.underMap;
      const um = umResolveStir(before);
      if (um?.dailyStir?.resolved === before?.dailyStir?.resolved && um?.dailyStreak === before?.dailyStreak) {
        return null;
      }
      return { storyCampaign: { ...current, underMap: um } };
    });
  }, [updateProgress]);

  const recordUnderMapTheory = useCallback((theory) => {
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const um = umRecordTheory(current.underMap, theory);
      if (um === current.underMap) return null;
      return { storyCampaign: { ...current, underMap: um } };
    });
    analytics.logEvent('theory_sealed', {
      chapter: theory?.chapter ?? null,
      grounded: theory?.grounded ?? null,
    });
  }, [updateProgress]);

  const touchUnderMap = useCallback(() => {
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      return { storyCampaign: { ...current, underMap: umTouch(current.underMap) } };
    });
  }, [updateProgress]);

  // FINALE: after chapter 12's belief is sealed there is no chapter to advance to —
  // the campaign freezes in its post-game state instead of erroring toward a
  // nonexistent "013A". Marks the final case complete, clears the pre-decision so
  // the Theory screen can't re-seal/re-trigger the ending, and stamps completion.
  // Functional + idempotent (clobber-safe, per the campaign-advance invariant).
  const markCampaignComplete = useCallback(({ caseNumber, endingId = null } = {}) => {
    const nowIso = new Date().toISOString();
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      if (current.completed) return null;
      const cl = umClarity(current.underMap);
      analytics.logEvent('campaign_complete', {
        endingId: endingId || null,
        clarityRatio: cl.ratio,
        resolvedBeliefs: cl.resolved,
        ngPlus: current.ngPlus || 0,
      });
      return {
        storyCampaign: {
          ...current,
          completedCaseNumbers: Array.from(new Set([
            ...(current.completedCaseNumbers || []),
            ...(caseNumber ? [caseNumber] : []),
          ])),
          preDecision: null,
          awaitingDecision: false,
          pendingDecisionCase: null,
          nextStoryUnlockAt: null,
          completed: true,
          completedAt: nowIso,
          endingId: endingId || current.endingId || null,
          endingReachedAt: nowIso,
        },
        nextUnlockAt: null,
      };
    });
  }, [updateProgress]);

  // ========== ENDINGS & ACHIEVEMENTS SYSTEM ==========

  const unlockEnding = useCallback((endingId, playthroughDetails = {}) => {
    const nowIso = new Date().toISOString();
    const currentEndings = progress.endings || { unlockedEndingIds: [], endingDetails: {}, totalEndingsReached: 0 };
    
    const alreadyUnlocked = currentEndings.unlockedEndingIds.includes(endingId);
    
    const updatedEndings = {
      ...currentEndings,
      unlockedEndingIds: alreadyUnlocked 
        ? currentEndings.unlockedEndingIds 
        : [...currentEndings.unlockedEndingIds, endingId],
      endingDetails: {
        ...currentEndings.endingDetails,
        [endingId]: {
          unlockedAt: currentEndings.endingDetails[endingId]?.unlockedAt || nowIso,
          lastReachedAt: nowIso,
          reachCount: (currentEndings.endingDetails[endingId]?.reachCount || 0) + 1,
          ...playthroughDetails,
        },
      },
      totalEndingsReached: currentEndings.totalEndingsReached + 1,
      firstEndingId: currentEndings.firstEndingId || endingId,
      firstEndingAt: currentEndings.firstEndingAt || nowIso,
    };

    const updatedCheckpoints = {
      ...(progress.chapterCheckpoints || {}),
      unlocked: true,
    };

    updateProgress({ 
      endings: updatedEndings,
      chapterCheckpoints: updatedCheckpoints,
    });

    analytics.logEvent?.('ending_unlocked', { endingId, isNew: !alreadyUnlocked });
    
    return !alreadyUnlocked;
  }, [progress.endings, progress.chapterCheckpoints, updateProgress]);

  const dismissAchievementToast = useCallback(() => {
    setAchievementToast(null);
  }, []);

  const unlockAchievement = useCallback((achievementId, context = {}) => {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return false;
    const nowIso = new Date().toISOString();
    updateProgress((prev) => {
      const currentAchievements = prev.achievements || { unlockedAchievementIds: [], achievementDetails: {}, totalPoints: 0 };
      if (currentAchievements.unlockedAchievementIds.includes(achievementId)) return null;
      return {
        achievements: {
          ...currentAchievements,
          unlockedAchievementIds: [...currentAchievements.unlockedAchievementIds, achievementId],
          achievementDetails: {
            ...currentAchievements.achievementDetails,
            [achievementId]: {
              unlockedAt: nowIso,
              ...context,
            },
          },
          totalPoints: (currentAchievements.totalPoints || 0) + (achievement.points || 0),
          lastCheckedAt: nowIso,
        },
      };
    });
    setAchievementToast({ id: achievementId, achievement, at: nowIso });
    notificationHaptic(Haptics.NotificationFeedbackType.Success);
    analytics.logEvent?.('achievement_unlocked', { achievementId, points: achievement.points || 0 });
    return true;
  }, [updateProgress]);

  const checkAchievements = useCallback(() => {
    const currentAchievements = progress.achievements?.unlockedAchievementIds || [];
    const unlocked = new Set(currentAchievements);
    const storyCampaign = normalizeStoryCampaignShape(progress.storyCampaign);
    const underMap = storyCampaign.underMap;
    const fragments = Array.isArray(underMap.fragments) ? underMap.fragments : [];
    const nodes = (Array.isArray(underMap.nodes) ? underMap.nodes : []).filter((n) => !n.unresolvedReading);
    const theories = Array.isArray(underMap.theories) ? underMap.theories : [];
    const endings = progress.endings?.unlockedEndingIds || [];
    const depth = mapDepth(underMap);
    const hour = new Date().getHours();

    const candidates = [
      ['THE_BEGINNING', progress.seenPrologue],
      ['FIRST_FRAGMENT', fragments.length >= 1],
      ['FIRST_TRUTH', nodes.length >= 1],
      ['CLEAN_DESCENT', bestFlawlessStreak(underMap) >= 1],
      ['FLAWLESS_THREE', bestFlawlessStreak(underMap) >= 3],
      ['FIRST_BELIEF', theories.length >= 1],
      ['READING_HELD', theories.some((t) => t.correct === true)],
      ['READING_SUBVERTED', theories.some((t) => t.correct === false)],
      ['MOTIF_DEEPENED', motifCount(underMap) >= 1],
      ['KEYSTONE_FOUND', keystoneCount(underMap) >= 1],
      ['MAP_TAKING_SHAPE', depth.total > 0 && depth.ratio >= 0.5],
      ['OTHER_READER_STIRS', foilPresence(underMap) >= 1],
      ['OTHER_READER_MANIFEST', foilPresence(underMap) >= 2],
      ['CHAPTER_THREE', (storyCampaign.chapter || 1) >= 3],
      ['FIRST_ENDING', endings.length >= 1],
      ['CLEAR_EYED', endings.includes('ending_clear')],
      ['HALF_BLIND', endings.includes('ending_half')],
      ['DECEIVED', endings.includes('ending_deceived')],
      ['NIGHT_READER', hour >= 0 && hour < 4],
      ['SEVEN_DAYS_MAPPED', (underMap.bestDailyStreak || underMap.dailyStreak || 0) >= 7],
    ];

    const newUnlocks = candidates
      .filter(([id, ok]) => ok && ACHIEVEMENTS[id] && !unlocked.has(id))
      .map(([id]) => id);
    if (!newUnlocks.length) return [];

    const nowIso = new Date().toISOString();
    updateProgress((prev) => {
      const current = prev.achievements || { unlockedAchievementIds: [], achievementDetails: {}, totalPoints: 0 };
      const existing = new Set(current.unlockedAchievementIds || []);
      const ids = newUnlocks.filter((id) => !existing.has(id));
      if (!ids.length) return null;
      const details = { ...(current.achievementDetails || {}) };
      let points = current.totalPoints || 0;
      ids.forEach((id) => {
        details[id] = { unlockedAt: nowIso };
        points += ACHIEVEMENTS[id]?.points || 0;
      });
      return {
        achievements: {
          ...current,
          unlockedAchievementIds: [...(current.unlockedAchievementIds || []), ...ids],
          achievementDetails: details,
          totalPoints: points,
          lastCheckedAt: nowIso,
        },
      };
    });

    const latestId = newUnlocks[newUnlocks.length - 1];
    setAchievementToast({ id: latestId, achievement: ACHIEVEMENTS[latestId], at: nowIso, count: newUnlocks.length });
    notificationHaptic(Haptics.NotificationFeedbackType.Success);
    newUnlocks.forEach((achievementId) => {
      analytics.logEvent?.('achievement_unlocked', { achievementId, points: ACHIEVEMENTS[achievementId]?.points || 0 });
    });
    return newUnlocks;
  }, [progress, updateProgress]);

  useEffect(() => {
    if (!hydrationComplete) return;
    checkAchievements();
  }, [
    hydrationComplete,
    checkAchievements,
    progress.seenPrologue,
    progress.storyCampaign,
    progress.endings,
  ]);

  const saveChapterCheckpoint = useCallback((chapter, subchapter, pathKey) => {
    const nowIso = new Date().toISOString();
    const currentCheckpoints = progress.chapterCheckpoints || { checkpoints: [], unlocked: false };
    
    const checkpoint = {
      id: `${chapter}-${subchapter}-${pathKey}-${Date.now()}`,
      chapter,
      subchapter,
      pathKey,
      savedAt: nowIso,
      storyCampaignSnapshot: { ...progress.storyCampaign },
    };

    const existingIndex = currentCheckpoints.checkpoints.findIndex(
      cp => cp.chapter === chapter && cp.pathKey === pathKey
    );

    let updatedCheckpoints;
    if (existingIndex >= 0) {
      updatedCheckpoints = [...currentCheckpoints.checkpoints];
      updatedCheckpoints[existingIndex] = checkpoint;
    } else {
      updatedCheckpoints = [...currentCheckpoints.checkpoints, checkpoint];
    }

    updateProgress({
      chapterCheckpoints: {
        ...currentCheckpoints,
        checkpoints: updatedCheckpoints,
      },
    });
  }, [progress.chapterCheckpoints, progress.storyCampaign, updateProgress]);

  const startFromChapter = useCallback((checkpoint) => {
    if (!checkpoint?.storyCampaignSnapshot) return false;

    const nowIso = new Date().toISOString();
    
    const restoredCampaign = {
      ...checkpoint.storyCampaignSnapshot,
      isReplayBranch: true,
      replayStartedAt: nowIso,
      replayFromChapter: checkpoint.chapter,
    };

    updateProgress({
      storyCampaign: restoredCampaign,
      chapterCheckpoints: {
        ...progress.chapterCheckpoints,
        activeReplayBranch: checkpoint.id,
      },
    });

    return true;
  }, [progress.chapterCheckpoints, updateProgress]);

  const updateGameplayStats = useCallback((updates) => {
    const currentStats = progress.gameplayStats || {};
    updateProgress({
      gameplayStats: {
        ...currentStats,
        ...updates,
      },
    });
  }, [progress.gameplayStats, updateProgress]);

  const stateValue = useMemo(() => ({
    ...gameState,
    progress,
    hydrationComplete,
    activeCase,
    mode,
    cases: SEASON_ONE_CASES,
    storyGeneration: story.generation, // Mapping for backward compatibility if needed, or update consumers
  }), [gameState, progress, hydrationComplete, activeCase, mode, story.generation]);

  const dispatchValue = useMemo(() => ({
    toggleWordSelection,
    submitGuess,
    resetBoardForCase,
    advanceToCase,
    unlockNextCaseIfReady,
    updateSettings,
    markPrologueSeen,
    markTutorialComplete,
    setPremiumUnlocked,
    clearProgress,
    markCaseBriefingSeen,
    enterStoryCampaign,
    continueStoryCampaign,
    pickUpTrailNow,
    openStoryCase,
    exitStoryCampaign,
    ensureDailyStoryCase,
    selectStoryDecision: story.selectStoryDecision,
    selectDecisionBeforePuzzle: story.selectDecisionBeforePuzzle, // NARRATIVE-FIRST: Pre-puzzle decision for C subchapters
    prefetchTheoryBranches: story.prefetchTheoryBranches,
    prefetchAfterUnderMapReveal: story.prefetchAfterUnderMapReveal, // CONNECT beat: warm the next subchapter while the player draws connections
    saveBranchingChoice: story.saveBranchingChoice, // TRUE INFINITE BRANCHING: Save player's interactive narrative path
    // NOTE: speculativePrefetchForFirstChoice removed - no longer needed with narrative-first flow
    // Audio is handled via AudioContext but exposed here if needed for backward compatibility or direct calls?
    // Ideally consumers use useAudio(), but GameContext was the facade.
    // We removed setAudioController from here.
    purchaseBribe,
    purchaseFullUnlock,
    // Story generation actions - delegated to StoryContext
    configureLLM: story.configureLLM,
    ensureStoryContent: story.ensureStoryContent,
    ensureSecondChoiceResponses: story.ensureSecondChoiceResponses,
    generateForCase: story.generateForCase,
    generateChapter: story.generateChapter,
    cancelGeneration: story.cancelGeneration,
    clearGenerationError: story.clearGenerationError,
    clearAutoRetry: story.clearAutoRetry, // Clear auto-retry flag after handling
    completeLogicPuzzle,
    // Case Board (deduction)
    addCaseClue,
    addCaseClues,
    ingestSceneFragments,
    connectUnderMap,
    senseUnderMap,
    resolveUnderMapReading,
    recordUnderMapDescent,
    claimUnderMapByFoil,
    resolveUnderMapBelief,
    nameUnderMapFoil,
    drawUnderMapDailyStir,
    resolveUnderMapDailyStir,
    recordUnderMapTheory,
    touchUnderMap,
    // Endings & Achievements
    markCampaignComplete,
    unlockEnding,
    unlockAchievement,
    checkAchievements,
    achievementToast,
    dismissAchievementToast,
    saveChapterCheckpoint,
    startFromChapter,
    updateGameplayStats,
    addCaseClue,
    addCaseClues,
    ingestSceneFragments,
    connectUnderMap,
    senseUnderMap,
    resolveUnderMapReading,
    recordUnderMapDescent,
    claimUnderMapByFoil,
    resolveUnderMapBelief,
    nameUnderMapFoil,
    drawUnderMapDailyStir,
    resolveUnderMapDailyStir,
    recordUnderMapTheory,
    touchUnderMap,
  }), [
    toggleWordSelection,
    submitGuess,
    resetBoardForCase,
    advanceToCase,
    unlockNextCaseIfReady,
    updateSettings,
    markPrologueSeen,
    markTutorialComplete,
    setPremiumUnlocked,
    clearProgress,
    markCaseBriefingSeen,
    enterStoryCampaign,
    continueStoryCampaign,
    pickUpTrailNow,
    openStoryCase,
    exitStoryCampaign,
    ensureDailyStoryCase,
    story,
    purchaseBribe,
    purchaseFullUnlock,
    markCampaignComplete,
    unlockEnding,
    unlockAchievement,
    checkAchievements,
    achievementToast,
    dismissAchievementToast,
    saveChapterCheckpoint,
    startFromChapter,
    updateGameplayStats,
    completeLogicPuzzle,
    addCaseClue,
    addCaseClues,
    ingestSceneFragments,
    connectUnderMap,
    senseUnderMap,
    resolveUnderMapReading,
    recordUnderMapDescent,
    claimUnderMapByFoil,
    resolveUnderMapBelief,
    nameUnderMapFoil,
    drawUnderMapDailyStir,
    resolveUnderMapDailyStir,
    recordUnderMapTheory,
    touchUnderMap,
  ]);

  return (
    <GameDispatchContext.Provider value={dispatchValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
}

export function useGame() {
  const state = useContext(GameStateContext);
  const dispatch = useContext(GameDispatchContext);

  if (!state || !dispatch) {
    throw new Error('useGame must be used within a GameProvider');
  }

  return useMemo(() => ({ ...state, ...dispatch }), [state, dispatch]);
}

/** Non-throwing state access — returns the state context or null (no provider). */
export function useGameStateOptional() {
  return useContext(GameStateContext);
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameDispatchContext);
  if (!context) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }
  return context;
}
