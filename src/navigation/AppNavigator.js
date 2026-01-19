import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useGame, GAME_STATUS } from '../context/GameContext';
import { useNavigationActions } from '../hooks/useNavigationActions';
import { COLORS } from '../constants/colors';
import { getPuzzleMode, getPuzzleRouteName } from '../utils/puzzleMode';

// Screens
import SplashScreen from '../screens/SplashScreen';
import PrologueScreen from '../screens/PrologueScreen';
import DeskScreen from '../screens/DeskScreen';
import EvidenceBoardScreen from '../screens/EvidenceBoardScreen';
import LogicPuzzleScreen from '../screens/LogicPuzzleScreen';
import CaseSolvedScreen from '../screens/CaseSolvedScreen';
import CaseFileScreen from '../screens/CaseFileScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MenuScreen from '../screens/MenuScreen';
import StoryCampaignScreen from '../screens/StoryCampaignScreen';
// New screens for replayability features
import EndingGalleryScreen from '../screens/EndingGalleryScreen';
import ChapterSelectScreen from '../screens/ChapterSelectScreen';
import AchievementsScreen from '../screens/AchievementsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ fontsReady, audio }) {
  const game = useGame();
  const {
    hydrationComplete,
    activeCase,
    attemptsRemaining,
    selectedWords,
    confirmedOutliers,
    lockedMainWords,
    submissionHistory,
    progress,
    cases,
    status,
    toggleWordSelection,
    markCaseBriefingSeen,
    selectStoryDecision,
    selectDecisionBeforePuzzle, // NARRATIVE-FIRST: Pre-puzzle decision for C subchapters
    saveBranchingChoice, // TRUE INFINITE BRANCHING: Save player's path through interactive narrative
    unlockNextCaseIfReady,
    openStoryCase,
    mode,
    purchaseBribe,
    purchaseFullUnlock,
    // LLM configuration
    storyGeneration,
    configureLLM,
    clearAutoRetry, // Background resilience: clear auto-retry flag
  } = game;

  if (!fontsReady) {
    return (
      <View style={styles.loadingSurface}>
        <Text style={styles.loadingText}>Loading Noir...</Text>
      </View>
    );
  }

  if (!hydrationComplete) {
    return (
      <View style={styles.loadingSurface}>
        <Text style={styles.loadingText}>Preparing Case Files...</Text>
      </View>
    );
  }

  const isStoryMode = mode === 'story';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Default to fade for a smoother, noir feel
        contentStyle: { backgroundColor: COLORS.background },
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <SplashScreen
              onContinue={actions.handleSplashContinue}
              reducedMotion={progress.settings.reducedMotion}
              bootReady={fontsReady && hydrationComplete}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Prologue">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <PrologueScreen
              onBegin={actions.handlePrologueComplete}
              reducedMotion={progress.settings.reducedMotion}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Desk">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <DeskScreen
              activeCase={activeCase}
              progress={progress}
              onStartCase={actions.handleStartCase}
              onOpenArchive={() => navigation.navigate('Archive')}
              onOpenStats={() => navigation.navigate('Stats')}
              onOpenSettings={() => navigation.navigate('Settings')}
              onOpenMenu={() => navigation.navigate('Menu')}
              onOpenNarrative={() => navigation.navigate('CaseFile')}
              onOpenStoryCampaign={actions.handleOpenStoryHub}
              onBribe={purchaseBribe}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Board">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <EvidenceBoardScreen
              activeCase={activeCase}
              cases={cases}
              storyProgress={progress.storyCampaign}
              solvedCaseIds={progress.solvedCaseIds}
              attemptsRemaining={attemptsRemaining}
              selectedWords={selectedWords}
              confirmedOutliers={confirmedOutliers}
              lockedMainWords={lockedMainWords}
              status={status}
              colorBlindMode={progress.settings.colorBlindMode}
              highContrast={progress.settings.highContrast}
              hintsEnabled={progress.settings.hintsEnabled}
              premiumUnlocked={progress.premiumUnlocked}
              reducedMotion={progress.settings.reducedMotion}
              briefingSeen={Boolean(activeCase && progress.seenBriefings && progress.seenBriefings[activeCase.id])}
              onBriefingSeen={markCaseBriefingSeen}
              onToggleWord={actions.handleToggleWord}
              onSubmitGuess={actions.handleSubmit}
              onBack={actions.handleBoardBack}
              onSkipToResults={() => navigation.navigate('Solved')}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="LogicPuzzle">
        {({ navigation }) => (
          <LogicPuzzleScreen navigation={navigation} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Solved">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          // NARRATIVE-FIRST FIX: Check if user has story progress even if not in explicit story mode
          const hasStoryProgress = progress.storyCampaign?.chapter != null && progress.storyCampaign?.activeCaseNumber;
          const effectivelyStoryMode = isStoryMode || hasStoryProgress;
          return (
            <CaseSolvedScreen
              activeCase={activeCase}
              status={status}
              submissionHistory={submissionHistory}
              confirmedOutliers={confirmedOutliers}
              onReadCaseFile={() => navigation.navigate('CaseFile')}
              onShare={actions.handleShareResults}
              onReturnHome={actions.handleReturnHome}
              isStoryMode={effectivelyStoryMode}
              storyCampaign={progress.storyCampaign}
              onAdvanceStory={actions.handleStoryContinue}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="CaseFile">
        {({ navigation, route }) => {
          const actions = useNavigationActions(navigation, game, audio);

          // If navigation provided a specific case number, prefer that case's data.
          // This avoids a transient frame where `activeCase` is still the previous case
          // right after advancing the story (e.g., 001A -> 001B).
          const targetCaseNumber = route?.params?.caseNumber;
          const caseFromParams = targetCaseNumber
            ? cases.find((c) => c.caseNumber === targetCaseNumber)
            : null;

          // Store the initial caseFromParams in a ref to prevent losing it during re-renders.
          // This is important because state updates (like preDecision) can cause re-renders,
          // and we need to ensure the screen always shows the correct case.
          const initialCaseRef = React.useRef(caseFromParams);
          if (caseFromParams && (!initialCaseRef.current || initialCaseRef.current.caseNumber !== caseFromParams.caseNumber)) {
            initialCaseRef.current = caseFromParams;
          }

          // Use the stored case to ensure stability across re-renders
          const stableCaseFromParams = initialCaseRef.current;
          const resolvedActiveCase = stableCaseFromParams || activeCase;

          // SUBCHAPTER C FLOW: Navigate to puzzle after narrative complete
          const handleProceedToPuzzle = () => {
            const puzzleMode = getPuzzleMode(resolvedActiveCase?.caseNumber, effectivelyStoryMode);
            const routeName = getPuzzleRouteName(puzzleMode);
            if (routeName === 'Board' && resolvedActiveCase?.id) {
              game.resetBoardForCase(resolvedActiveCase.id);
            }
            navigation.navigate(routeName);
          };

          // Track the last synced case to prevent infinite loop.
          // The issue: openStoryCase changes when boardLayouts changes (ADVANCE_CASE dispatch),
          // which would re-trigger this effect. Using a ref to track already-synced cases
          // breaks the loop without removing necessary dependencies.
          const lastSyncedCaseRef = React.useRef(null);

          // Keep game state aligned with explicit navigation params.
          // Use a ref for openStoryCase to avoid the effect depending on callback changes.
          const openStoryCaseRef = React.useRef(openStoryCase);
          openStoryCaseRef.current = openStoryCase;

          React.useEffect(() => {
            if (!stableCaseFromParams?.id) return;
            if (activeCase?.caseNumber === stableCaseFromParams.caseNumber) return;
            // Guard: Don't re-sync if we already synced this case
            if (lastSyncedCaseRef.current === stableCaseFromParams.caseNumber) return;
            lastSyncedCaseRef.current = stableCaseFromParams.caseNumber;
            openStoryCaseRef.current?.(stableCaseFromParams.id);
          }, [stableCaseFromParams?.id, stableCaseFromParams?.caseNumber, activeCase?.caseNumber]);

          // NARRATIVE-FIRST FIX: Check if user has story progress even if not in explicit story mode
          // This ensures the "Solve Puzzle" button appears correctly for all story chapters
          const hasStoryProgress = progress.storyCampaign?.chapter != null && progress.storyCampaign?.activeCaseNumber;
          const effectivelyStoryMode = isStoryMode || hasStoryProgress;

          return (
            <CaseFileScreen
              activeCase={resolvedActiveCase}
              nextUnlockAt={progress.nextUnlockAt}
              storyCampaign={progress.storyCampaign}
              solvedCaseIds={progress.solvedCaseIds}
              onSelectDecision={selectStoryDecision}
              onSelectDecisionBeforePuzzle={selectDecisionBeforePuzzle}
              onSaveBranchingChoice={saveBranchingChoice}
              onProceedToPuzzle={handleProceedToPuzzle}
              isStoryMode={effectivelyStoryMode}
              onContinueStory={actions.handleStoryContinue}
              onReturnHome={actions.handleReturnHome}
              isGenerating={game.story?.generation?.isGenerating || false}
              generationStatus={game.story?.generation?.status}
              generationError={game.story?.generation?.error}
              shouldAutoRetry={game.story?.generation?.shouldAutoRetry || false}
              getPendingGeneration={game.story?.generation?.getPendingGeneration}
              onAutoRetry={() => {
                // Handle auto-retry after returning from background
                console.log('[AppNavigator] Auto-retry triggered');
                clearAutoRetry?.();
                actions.handleStoryContinue();
              }}
              onBack={() => {
                 if (status === GAME_STATUS.SOLVED || status === GAME_STATUS.FAILED) {
                     navigation.navigate('Solved');
                 } else {
                     navigation.navigate(isStoryMode ? 'Story' : 'Desk');
                 }
              }}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Archive">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <ArchiveScreen
              cases={cases}
              progress={progress}
              onSelectCase={actions.handleSelectArchiveCase}
              onBack={() => navigation.navigate('Desk')}
              onUnlockPremium={() => navigation.navigate('Settings')}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Stats">
        {({ navigation }) => {
          return (
            <StatsScreen
              progress={progress}
              onBack={() => navigation.navigate('Desk')}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Menu">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          const endingsCount = progress.endings?.unlockedEndingIds?.length || 0;
          const achievementsCount = progress.achievements?.unlockedAchievementIds?.length || 0;
          const hasCompletedStory = progress.chapterCheckpoints?.unlocked || false;
          
          return (
            <MenuScreen
              onBack={() => navigation.navigate('Desk')}
              onReplayTutorial={actions.handleReplayTutorial}
              onShare={actions.handleShareResults}
              onOpenEndingGallery={() => navigation.navigate('EndingGallery')}
              onOpenAchievements={() => navigation.navigate('Achievements')}
              onOpenChapterSelect={() => navigation.navigate('ChapterSelect')}
              hasCompletedStory={hasCompletedStory}
              endingsCount={endingsCount}
              achievementsCount={achievementsCount}
              totalAchievements={30}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Settings">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <SettingsScreen
              settings={progress.settings}
              premiumUnlocked={progress.premiumUnlocked}
              onUpdateSettings={actions.handleSettingsUpdate}
              onResetProgress={actions.handleResetProgress}
              onReplayTutorial={actions.handleReplayTutorial}
              onPurchasePremium={actions.handlePurchasePremium}
              onRestorePremium={actions.handleRestorePremium}
              onBack={() => navigation.navigate('Desk')}
              llmConfigured={storyGeneration?.isConfigured}
              onConfigureLLM={configureLLM}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Story">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <StoryCampaignScreen
              storyCampaign={progress.storyCampaign}
              onContinueStory={actions.handleStoryContinue}
              onStartStory={actions.handleStoryStart}
              onRestartStory={actions.handleStoryRestart}
              onBack={actions.handleExitStory}
              onExitToDesk={actions.handleExitStory}
              onBribe={purchaseBribe}
              onPurchaseFullUnlock={purchaseFullUnlock}
              premiumUnlocked={progress.premiumUnlocked}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="EndingGallery">
        {({ navigation }) => {
          return (
            <EndingGalleryScreen
              unlockedEndingIds={progress.endings?.unlockedEndingIds || []}
              endingDetails={progress.endings?.endingDetails || {}}
              onBack={() => navigation.goBack()}
              onSelectEnding={(ending) => {
                // Could navigate to ending detail or trigger share
              }}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="ChapterSelect">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <ChapterSelectScreen
              storyCampaign={progress.storyCampaign}
              checkpoints={progress.chapterCheckpoints?.checkpoints || []}
              isUnlocked={progress.chapterCheckpoints?.unlocked || false}
              onSelectChapter={(chapter) => {
                // Handle chapter selection for replay
                actions.handleChapterSelect?.(chapter);
              }}
              onBack={() => navigation.goBack()}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="Achievements">
        {({ navigation }) => {
          return (
            <AchievementsScreen
              unlockedAchievementIds={progress.achievements?.unlockedAchievementIds || []}
              achievementDetails={progress.achievements?.achievementDetails || {}}
              totalPoints={progress.achievements?.totalPoints || 0}
              onBack={() => navigation.goBack()}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingSurface: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontFamily: 'WorkSans_500Medium',
    letterSpacing: 2.4,
  },
});
