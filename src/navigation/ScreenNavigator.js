import React, { useEffect, useRef } from 'react';
import { Share, View, Text } from 'react-native';
import { GAME_STATUS } from '../context/GameContext';
import { COLORS } from '../constants/colors';
import { useAudioController } from '../hooks/useAudioController';

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

export default function ScreenNavigator({ activeScreen, setActiveScreen, game, fontsReady }) {
    const {
        hydrationComplete,
        status,
        activeCase,
        attemptsRemaining,
        selectedWords,
        confirmedOutliers,
        lockedMainWords,
        submissionHistory,
        progress,
        cases,
        toggleWordSelection,
        submitGuess,
        resetBoardForCase,
        advanceToCase,
        updateSettings,
        markPrologueSeen,
        setPremiumUnlocked,
        clearProgress,
        mode,
        enterStoryCampaign,
        continueStoryCampaign,
        openStoryCase,
        exitStoryCampaign,
        markCaseBriefingSeen,
        ensureDailyStoryCase,
        selectStoryDecision,
        unlockNextCaseIfReady,
    } = game;

    const audio = useAudioController(activeScreen, progress.settings);
    const previousStatusRef = useRef(status);

    useEffect(() => {
        unlockNextCaseIfReady();
    }, [unlockNextCaseIfReady, progress.nextUnlockAt]);

    useEffect(() => {
        if (activeScreen === 'board' && status === GAME_STATUS.FAILED) {
            setActiveScreen('solved');
        }
    }, [status, activeScreen, setActiveScreen]);

    useEffect(() => {
        if (status !== previousStatusRef.current) {
            if (status === GAME_STATUS.SOLVED) {
                audio.playVictory();
            } else if (status === GAME_STATUS.FAILED) {
                audio.playFailure();
            }
            previousStatusRef.current = status;
        }
    }, [status, audio]);

    const bootReady = fontsReady && hydrationComplete;
    const isStoryMode = mode === 'story';
    const storyCampaign = progress.storyCampaign || {};
    const activeCaseNumber = activeCase?.caseNumber;
    const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
    const pendingDailyStoryAdvance =
        !isStoryMode &&
        Boolean(
            storyActiveCaseNumber &&
            activeCaseNumber &&
            storyActiveCaseNumber !== activeCaseNumber &&
            !storyCampaign.awaitingDecision,
        );

    const handlePrologueComplete = () => {
        markPrologueSeen();
        setActiveScreen('desk');
    };

    const handleSplashContinue = () => {
        if (!bootReady) return;
        if (progress.seenPrologue) {
            setActiveScreen('desk');
        } else {
            setActiveScreen('prologue');
        }
    };

    const handleStartCase = () => {
        const bypassCompletedGuard = pendingDailyStoryAdvance;
        if (!bypassCompletedGuard) {
            if (status === GAME_STATUS.SOLVED) {
                setActiveScreen('caseFile');
                return;
            }
            if (status === GAME_STATUS.FAILED) {
                setActiveScreen('solved');
                return;
            }
        }

        if (!isStoryMode) {
            const ensureResult = ensureDailyStoryCase?.();
            if (!ensureResult || !ensureResult.ok) {
                setActiveScreen('caseFile');
                return;
            }
            const targetCaseId = ensureResult.caseId ?? activeCase?.id;
            if (targetCaseId) {
                resetBoardForCase(targetCaseId);
            }
        } else if (activeCase?.id) {
            resetBoardForCase(activeCase.id);
        }
        setActiveScreen('board');
    };

    const handleSelectArchiveCase = (caseId) => {
        advanceToCase(caseId);
        setActiveScreen('board');
    };

    const handleToggleWord = (word) => {
        audio.playSelect();
        toggleWordSelection(word);
    };

    const handleSubmit = () => {
        submitGuess();
    };

    const handleShareResults = async (message) => {
        try {
            await Share.share({ message });
        } catch (error) {
            console.warn('Share failed', error);
        }
    };

    const handleSettingsUpdate = (partial) => {
        updateSettings(partial);
    };

    const handleResetProgress = async () => {
        await clearProgress();
        setActiveScreen('prologue');
    };

    const handlePurchasePremium = () => {
        setPremiumUnlocked(true);
    };

    const handleRestorePremium = () => {
        setPremiumUnlocked(true);
    };

    const handleReplayTutorial = () => {
        setActiveScreen('prologue');
    };

    const handleOpenStoryHub = () => {
        setActiveScreen('story');
    };

    const handleStoryStart = (reset = false) => {
        const result = enterStoryCampaign(reset ? { reset: true } : {});
        if (result) {
            setActiveScreen('board');
        }
    };

    const handleStoryRestart = () => {
        handleStoryStart(true);
    };

    const handleStoryContinue = () => {
        const opened = continueStoryCampaign();
        if (opened) {
            setActiveScreen('board');
        }
    };

    const handleStorySelectCase = (caseId) => {
        const opened = openStoryCase(caseId);
        if (opened) {
            setActiveScreen('board');
        }
    };

    const handleExitStory = () => {
        exitStoryCampaign();
        setActiveScreen('desk');
    };

    const handleBoardBack = () => {
        setActiveScreen(isStoryMode ? 'story' : 'desk');
    };

    const handleReturnHome = () => {
        setActiveScreen(isStoryMode ? 'story' : 'desk');
    };

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

    switch (activeScreen) {
        case 'splash':
            return (
                <SplashScreen
                    onContinue={handleSplashContinue}
                    reducedMotion={progress.settings.reducedMotion}
                    bootReady={bootReady}
                />
            );
        case 'prologue':
            return <PrologueScreen onBegin={handlePrologueComplete} reducedMotion={progress.settings.reducedMotion} />;
        case 'desk':
            return (
                <DeskScreen
                    activeCase={activeCase}
                    progress={progress}
                    onStartCase={handleStartCase}
                    onOpenArchive={() => setActiveScreen('archive')}
                    onOpenStats={() => setActiveScreen('stats')}
                    onOpenSettings={() => setActiveScreen('settings')}
                    onOpenMenu={() => setActiveScreen('menu')}
                    onOpenNarrative={() => setActiveScreen('caseFile')}
                    onOpenStoryCampaign={handleOpenStoryHub}
                />
            );
        case 'board':
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
                    onToggleWord={handleToggleWord}
                    onSubmitGuess={handleSubmit}
                    onBack={handleBoardBack}
                    onSkipToResults={() => setActiveScreen('solved')}
                />
            );
        case 'solved':
            return (
                <CaseSolvedScreen
                    activeCase={activeCase}
                    status={status}
                    submissionHistory={submissionHistory}
                    confirmedOutliers={confirmedOutliers}
                    onReadCaseFile={() => setActiveScreen('caseFile')}
                    onShare={handleShareResults}
                    onReturnHome={handleReturnHome}
                    isStoryMode={isStoryMode}
                    storyCampaign={progress.storyCampaign}
                    onAdvanceStory={handleStoryContinue}
                />
            );
        case 'caseFile':
            return (
                <CaseFileScreen
                    activeCase={activeCase}
                    nextUnlockAt={progress.nextUnlockAt}
                    storyCampaign={progress.storyCampaign}
                    onSelectDecision={selectStoryDecision}
                    isStoryMode={isStoryMode}
                    onContinueStory={handleStoryContinue}
                    onReturnHome={handleReturnHome}
                    onBack={() => {
                        if (status === GAME_STATUS.SOLVED || status === GAME_STATUS.FAILED) {
                            setActiveScreen('solved');
                        } else {
                            setActiveScreen(isStoryMode ? 'story' : 'desk');
                        }
                    }}
                />
            );
        case 'archive':
            return (
                <ArchiveScreen
                    cases={cases}
                    progress={progress}
                    onSelectCase={handleSelectArchiveCase}
                    onBack={() => setActiveScreen('desk')}
                    onUnlockPremium={() => setActiveScreen('settings')}
                />
            );
        case 'stats':
            return <StatsScreen progress={progress} onBack={() => setActiveScreen('desk')} />;
        case 'menu':
            return (
                <MenuScreen
                    onBack={() => setActiveScreen('desk')}
                    onReplayTutorial={handleReplayTutorial}
                    onShare={handleShareResults}
                />
            );
        case 'settings':
            return (
                <SettingsScreen
                    settings={progress.settings}
                    premiumUnlocked={progress.premiumUnlocked}
                    onUpdateSettings={handleSettingsUpdate}
                    onResetProgress={handleResetProgress}
                    onReplayTutorial={handleReplayTutorial}
                    onPurchasePremium={handlePurchasePremium}
                    onRestorePremium={handleRestorePremium}
                    onBack={() => setActiveScreen('desk')}
                />
            );
        case 'story':
            return (
                <StoryCampaignScreen
                    storyCampaign={progress.storyCampaign}
                    onContinueStory={handleStoryContinue}
                    onStartStory={handleStoryStart}
                    onRestartStory={handleStoryRestart}
                    onBack={handleExitStory}
                    onExitToDesk={handleExitStory}
                />
            );
        default:
            return null;
    }
}

const styles = {
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
};
