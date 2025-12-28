import { useCallback } from 'react';
import { Share } from 'react-native';

export function useNavigationActions(navigation, game, audio) {
  const {
    status,
    activeCase,
    progress,
    resetBoardForCase,
    advanceToCase,
    submitGuess,
    toggleWordSelection,
    updateSettings,
    clearProgress,
    setPremiumUnlocked,
    markPrologueSeen,
    markCaseBriefingSeen,
    enterStoryCampaign,
    continueStoryCampaign,
    openStoryCase,
    exitStoryCampaign,
    ensureDailyStoryCase,
    selectStoryDecision,
  } = game;

  const isStoryMode = game.mode === 'story';
  const storyCampaign = progress.storyCampaign || {};

  // SUBCHAPTER C FLOW: Check if we need to show narrative before puzzle
  // For subchapter C, the flow is: Narrative -> Puzzle -> Decision
  // This gives the LLM time to generate next chapter while player solves puzzle
  const needsNarrativeFirstForC = useCallback((caseNumber) => {
    if (!caseNumber) return false;
    const subchapterLetter = caseNumber.slice(3, 4);
    if (subchapterLetter !== 'C') return false;

    // Check if branching narrative has been completed for this C
    const branchingChoices = storyCampaign?.branchingChoices || [];
    const hasCompletedBranching = branchingChoices.some(bc => bc.caseNumber === caseNumber);

    // If no branching choice saved, player hasn't read the narrative yet
    return !hasCompletedBranching;
  }, [storyCampaign?.branchingChoices]);
  const activeCaseNumber = activeCase?.caseNumber;
  const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
  
  // Logic to determine if we need to advance the daily story
  const pendingDailyStoryAdvance =
    !isStoryMode &&
    Boolean(
      storyActiveCaseNumber &&
      activeCaseNumber &&
      storyActiveCaseNumber !== activeCaseNumber &&
      !storyCampaign.awaitingDecision,
    );

  const handlePrologueComplete = useCallback(() => {
    markPrologueSeen();
    navigation.replace('Desk');
  }, [markPrologueSeen, navigation]);

  const handleSplashContinue = useCallback(() => {
    if (progress.seenPrologue) {
      navigation.replace('Desk');
    } else {
      navigation.replace('Prologue');
    }
  }, [progress.seenPrologue, navigation]);

  const handleStartCase = useCallback(async () => {
    const bypassCompletedGuard = pendingDailyStoryAdvance;

    // If the game is finished (solved/failed) and we aren't forced to move to next daily story case
    if (!bypassCompletedGuard) {
      if (status === 'solved') {
        navigation.navigate('CaseFile');
        return;
      }
      if (status === 'failed') {
        navigation.navigate('Solved');
        return;
      }
    }

    if (!isStoryMode) {
      const ensureResult = await ensureDailyStoryCase?.();
      if (!ensureResult || !ensureResult.ok) {
        navigation.navigate('CaseFile');
        return;
      }
      const targetCaseId = ensureResult.caseId ?? activeCase?.id;
      if (targetCaseId) {
        resetBoardForCase(targetCaseId);
      }
    } else if (activeCase?.id) {
      resetBoardForCase(activeCase.id);
    }
    navigation.navigate('Board');
  }, [
    pendingDailyStoryAdvance,
    status,
    isStoryMode,
    ensureDailyStoryCase,
    activeCase,
    resetBoardForCase,
    navigation,
  ]);

  const handleSelectArchiveCase = useCallback((caseId) => {
    advanceToCase(caseId);
    navigation.navigate('Board');
  }, [advanceToCase, navigation]);

  const handleToggleWord = useCallback((word) => {
    audio?.playSelect();
    toggleWordSelection(word);
  }, [toggleWordSelection, audio]);

  const handleSubmit = useCallback(() => {
    submitGuess();
  }, [submitGuess]);

  const handleShareResults = useCallback(async (message) => {
    try {
      await Share.share({ message });
    } catch (error) {
      console.warn('Share failed', error);
    }
  }, []);

  const handleSettingsUpdate = useCallback((partial) => {
    updateSettings(partial);
  }, [updateSettings]);

  const handleResetProgress = useCallback(async () => {
    await clearProgress();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Prologue' }],
    });
  }, [clearProgress, navigation]);

  const handlePurchasePremium = useCallback(() => {
    setPremiumUnlocked(true);
  }, [setPremiumUnlocked]);

  const handleRestorePremium = useCallback(() => {
    setPremiumUnlocked(true);
  }, [setPremiumUnlocked]);

  const handleReplayTutorial = useCallback(() => {
    navigation.navigate('Prologue');
  }, [navigation]);

  const handleOpenStoryHub = useCallback(() => {
    navigation.navigate('Story');
  }, [navigation]);

  const handleStoryStart = useCallback(async (reset = false) => {
    if (reset) {
      // Reset doesn't need async - just resets and returns true
      enterStoryCampaign({ reset: true });
      return;
    }
    // Starting story activates case which may trigger generation
    const result = await enterStoryCampaign({});
    if (result?.ok) {
      // SUBCHAPTER C FLOW: For C, go to narrative first, then puzzle
      // This gives LLM time to generate next chapter while player solves puzzle
      const targetCaseNumber = storyCampaign?.activeCaseNumber;
      if (needsNarrativeFirstForC(targetCaseNumber)) {
        console.log('[Navigation] Subchapter C detected - showing narrative before puzzle');
        navigation.navigate('CaseFile');
      } else {
        navigation.navigate('Board');
      }
    }
    // If not ok, the overlay will show the error/not-configured state
  }, [enterStoryCampaign, navigation, storyCampaign?.activeCaseNumber, needsNarrativeFirstForC]);

  const handleStoryRestart = useCallback(() => {
    handleStoryStart(true);
  }, [handleStoryStart]);

  const handleStoryContinue = useCallback(async () => {
    const result = await continueStoryCampaign();
    if (result?.ok) {
      // SUBCHAPTER C FLOW: For C, go to narrative first, then puzzle
      // This gives LLM time to generate next chapter while player solves puzzle
      const targetCaseNumber = storyCampaign?.activeCaseNumber;
      if (needsNarrativeFirstForC(targetCaseNumber)) {
        console.log('[Navigation] Subchapter C detected - showing narrative before puzzle');
        navigation.navigate('CaseFile');
      } else {
        navigation.navigate('Board');
      }
    }
    // If not ok, the overlay will show the error/not-configured state
  }, [continueStoryCampaign, navigation, storyCampaign?.activeCaseNumber, needsNarrativeFirstForC]);

  const handleStorySelectCase = useCallback(async (caseId) => {
    const opened = await openStoryCase(caseId);
    if (opened) {
      navigation.navigate('Board');
    }
  }, [openStoryCase, navigation]);

  const handleExitStory = useCallback(() => {
    exitStoryCampaign();
    navigation.navigate('Desk');
  }, [exitStoryCampaign, navigation]);

  const handleBoardBack = useCallback(() => {
    navigation.navigate(isStoryMode ? 'Story' : 'Desk');
  }, [isStoryMode, navigation]);

  const handleReturnHome = useCallback(() => {
    navigation.navigate('Desk');
  }, [navigation]);

  return {
    handlePrologueComplete,
    handleSplashContinue,
    handleStartCase,
    handleSelectArchiveCase,
    handleToggleWord,
    handleSubmit,
    handleShareResults,
    handleSettingsUpdate,
    handleResetProgress,
    handlePurchasePremium,
    handleRestorePremium,
    handleReplayTutorial,
    handleOpenStoryHub,
    handleStoryStart,
    handleStoryRestart,
    handleStoryContinue,
    handleStorySelectCase,
    handleExitStory,
    handleBoardBack,
    handleReturnHome,
    markCaseBriefingSeen,
    selectStoryDecision,
  };
}
