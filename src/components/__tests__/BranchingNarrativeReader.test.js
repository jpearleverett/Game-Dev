/**
 * The first test that actually MOUNTS a screen component.
 *
 * Until the jest config grew a jest-expo project, nothing in src/components or
 * src/screens could be imported, let alone rendered — so the reader's page
 * index math, its EXAMINE plumbing and its choice gate were all unguarded,
 * despite being where several shipped bugs lived.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import BranchingNarrativeReader from '../BranchingNarrativeReader';

// The reader reads only `progress.settings` off the game context; a provider
// would drag the whole app graph in for no benefit here.
jest.mock('../../context/GameContext', () => ({
  useGame: () => ({ progress: { settings: { reducedMotion: true } } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const para = (word) => Array.from({ length: 60 }, () => word).join(' ');

const narrative = (endingResponse) => ({
  opening: {
    text: `The Silver Staircase turned back on itself. ${para('rain')}`,
    details: [
      { phrase: 'The Silver Staircase', note: 'It turns the wrong way.', evidenceCard: 'Silver Staircase', kind: 'place' },
    ],
  },
  firstChoice: {
    prompt: 'How does Jack move?',
    options: [
      { key: '1A', label: 'Follow it down', response: para('down') },
      { key: '1B', label: 'Mark the wall', response: para('mark') },
      { key: '1C', label: 'Walk away', response: para('away') },
    ],
  },
  secondChoices: [
    {
      afterChoice: '1A',
      prompt: 'And then?',
      options: [
        { key: '1A-2A', label: 'Keep going', response: endingResponse, summary: 'He keeps going.' },
        { key: '1A-2B', label: 'Turn back', response: endingResponse, summary: 'He turns back.' },
        { key: '1A-2C', label: 'Listen', response: endingResponse, summary: 'He listens.' },
      ],
    },
  ],
});

const mount = (props = {}) => {
  let tree;
  act(() => {
    tree = renderer.create(
      <BranchingNarrativeReader
        branchingNarrative={narrative(para('ending'))}
        reducedMotion
        {...props}
      />,
    );
  });
  return tree;
};

// NOTE: react-test-renderer produces no layout, so the reader's pagination
// (which is driven by the measured page width) yields no pages here. These
// tests therefore assert the module graph, the mount, the effects and the
// completion contract — not rendered page text.

describe('BranchingNarrativeReader mounts', () => {
  test('renders without throwing', () => {
    const tree = mount();
    expect(tree.toJSON()).toBeTruthy();
    act(() => tree.unmount());
  });

  test('renders with read-back history prepended', () => {
    // History pages are prepended ahead of the live ones and every index
    // calculation is relative to liveStartIndex; mounting with history at all
    // was impossible to check before this suite could run.
    const tree = mount({
      history: [
        { caseNumber: '001A', chapter: 1, subchapter: 1, title: 'Earlier', narrative: para('earlier') },
      ],
    });
    expect(tree.toJSON()).toBeTruthy();
    act(() => tree.unmount());
  });

  test('a placeholder ending does not report the narrative complete', () => {
    // The lazy-branching placeholder types in a few hundred ms; if it counted as
    // the last page, completion fired against a scene with no ending.
    const onComplete = jest.fn();
    const tree = mount({
      branchingNarrative: narrative(''),
      secondChoiceLoading: true,
      onComplete,
    });
    expect(onComplete).not.toHaveBeenCalled();
    act(() => tree.unmount());
  });
});
