import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useGame, GAME_STATUS } from '../context/GameContext';
import { useNavigationActions } from '../hooks/useNavigationActions';
import { COLORS } from '../constants/colors';

// Screens
import SplashScreen from '../screens/SplashScreen';
import PrologueScreen from '../screens/PrologueScreen';
import DeskScreen from '../screens/DeskScreen';
import EvidenceBoardScreen from '../screens/EvidenceBoardScreen';
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
    mode,
    purchaseBribe,
    purchaseFullUnlock,
    // LLM configuration
    storyGeneration,
    configureLLM,
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

      <Stack.Screen name="Solved">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);
          return (
            <CaseSolvedScreen
              activeCase={activeCase}
              status={status}
              submissionHistory={submissionHistory}
              confirmedOutliers={confirmedOutliers}
              onReadCaseFile={() => navigation.navigate('CaseFile')}
              onShare={actions.handleShareResults}
              onReturnHome={actions.handleReturnHome}
              isStoryMode={isStoryMode}
              storyCampaign={progress.storyCampaign}
              onAdvanceStory={actions.handleStoryContinue}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="CaseFile">
        {({ navigation }) => {
          const actions = useNavigationActions(navigation, game, audio);

          // SUBCHAPTER C FLOW: Navigate to puzzle after narrative complete
          const handleProceedToPuzzle = () => {
            if (activeCase?.id) {
              game.resetBoardForCase(activeCase.id);
            }
            navigation.navigate('Board');
          };

          return (
            <CaseFileScreen
              activeCase={activeCase}
              nextUnlockAt={progress.nextUnlockAt}
              storyCampaign={progress.storyCampaign}
              solvedCaseIds={progress.solvedCaseIds}
              onSelectDecision={selectStoryDecision}
              onSelectDecisionBeforePuzzle={selectDecisionBeforePuzzle}
              onSaveBranchingChoice={saveBranchingChoice}
              onProceedToPuzzle={handleProceedToPuzzle}
              isStoryMode={isStoryMode}
              onContinueStory={actions.handleStoryContinue}
              onReturnHome={actions.handleReturnHome}
              isGenerating={game.story?.generation?.isGenerating || false}
              generationStatus={game.story?.generation?.status}
              generationError={game.story?.generation?.error}
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
