import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # --- CHAPTER 12: THE ENDGAME ---
    
    # 012A: The Final Action
    if case_id == '012A':
        # Aggressive-Ally-Contain-Power (Tyrant)
        if path_key == 'AACP':
            return [
                {'id': '12A-AACP-1', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'COMPROMISED', 'detail': 'She took the kill-switch. Her eyes are dead. I saved the city by breaking her.'},
                {'id': '12A-AACP-2', 'imageKey': 'blackEnvelope', 'title': 'KILL SWITCH', 'subtitle': 'SECURED', 'detail': 'Vance is gone. The network is mine. Order is maintained.'},
                {'id': '12A-AACP-3', 'imageKey': 'harborPrecinct', 'title': 'THE BUNKER', 'subtitle': 'COMMAND', 'detail': 'Operating from the shadows. Safe. Powerful. Alone.'}
            ]
        # Aggressive-Ally-Contain-Sacrifice (Anarchy)
        if path_key == 'AACS':
            return [
                {'id': '12A-AACS-1', 'imageKey': 'harborPrecinct', 'title': 'BURNING SERVER', 'subtitle': 'DESTRUCTION', 'detail': 'I let Vance wipe it. The financial grid is gone. Chaos is the price of Sarah\'s soul.'},
                {'id': '12A-AACS-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'SAVED', 'detail': '"You sacrificed the power." She looks at me with gratitude. We are clean.'},
                {'id': '12A-AACS-3', 'imageKey': 'blackEnvelope', 'title': 'FBI TIP', 'subtitle': 'ANONYMOUS', 'detail': 'Calling it in. Salvaging the evidence. Ending the empire.'}
            ]
        # Aggressive-Ally-Expose-Redeem (Reformer)
        if path_key == 'AAER' or path_key == 'MAER':
            return [
                {'id': '12A-AAER-1', 'imageKey': 'lex', 'title': 'LEGAL FILE', 'subtitle': 'THE WORK', 'detail': 'Warrants. Appeals. The slow grind. No more shortcuts.'},
                {'id': '12A-AAER-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'PARTNER', 'detail': 'Running interference. Keeping me honest. We are rebuilding.'},
                {'id': '12A-AAER-3', 'imageKey': 'blackEnvelope', 'title': 'BLACKWELL', 'subtitle': 'CLOSED', 'detail': 'Assets handed over. Ledgers shut. The shadow is gone.'}
            ]
        # Aggressive-Ally-Expose-Shadow (Overseer)
        if path_key == 'AAES':
            return [
                {'id': '12A-AAES-1', 'imageKey': 'default', 'title': 'VANCE', 'subtitle': 'ELIMINATED', 'detail': 'Swift. Ruthless. A permanent deletion from the narrative.'},
                {'id': '12A-AAES-2', 'imageKey': 'harborPrecinct', 'title': 'THE BUNKER', 'subtitle': 'CONTROL', 'detail': 'Shielded by legal chaos. Running the intelligence. The new Overseer.'},
                {'id': '12A-AAES-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'GONE', 'detail': 'She left a vacuum. I filled it. Stability through fear.'}
            ]
        # Aggressive-Prisoner-Escape-Fugitive (Exile)
        if path_key == 'APEF':
            return [
                {'id': '12A-APEF-1', 'imageKey': 'harborPrecinct', 'title': 'THE BOAT', 'subtitle': 'ESCAPE', 'detail': 'Engine running. No looking back. The city fades into the fog.'},
                {'id': '12A-APEF-2', 'imageKey': 'default', 'title': 'NEW ID', 'subtitle': 'GHOST', 'detail': 'A passport with a stranger\'s name. Freedom without purpose.'},
                {'id': '12A-APEF-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'LEFT BEHIND', 'detail': 'She has to clean up the mess alone. I chose myself.'}
            ]
        # Aggressive-Prisoner-Escape-Redeem (Commutation)
        if path_key == 'APER':
            return [
                {'id': '12A-APER-1', 'imageKey': 'harborPrecinct', 'title': 'U-TURN', 'subtitle': 'RETURN', 'detail': 'Walking away from the boat. Driving back to face the music.'},
                {'id': '12A-APER-2', 'imageKey': 'buyer', 'title': 'MARTINEZ', 'subtitle': 'THE DEAL', 'detail': 'The untainted ledger bought my life. Charges dropped to misdemeanor.'},
                {'id': '12A-APER-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'PRIDE', 'detail': 'She watched the surrender. I chose the hard way.'}
            ]
        # Aggressive-Prisoner-Law-Justice (Shared Felony) / MPLJ
        if path_key == 'APLJ' or path_key == 'MPLJ':
            return [
                {'id': '12A-APLJ-1', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE FELONY', 'detail': 'She took the key. Broke her oath. Chose the innocents over the law.'},
                {'id': '12A-APLJ-2', 'imageKey': 'blackEnvelope', 'title': 'THE LEAK', 'subtitle': 'HEADLINES', 'detail': 'Overseer exposed. Governor arrested. The system collapsed.'},
                {'id': '12A-APLJ-3', 'imageKey': 'harborPrecinct', 'title': 'MY SENTENCE', 'subtitle': 'FIVE YEARS', 'detail': 'Appeal rejected. The price of making the system admit failure.'}
            ]
        # Aggressive-Prisoner-Law-Freedom (Selfish) / MPLF
        if path_key == 'APLR' or path_key == 'MPLF':
            return [
                {'id': '12A-APLR-1', 'imageKey': 'blackEnvelope', 'title': 'BLACKMAIL', 'subtitle': 'MARTINEZ', 'detail': 'Sarah used the key to save me. Exposed FBI corruption instead.'},
                {'id': '12A-APLR-2', 'imageKey': 'default', 'title': 'CHARGES', 'subtitle': 'DROPPED', 'detail': 'I walked free. My conviction overturned. The innocents stayed inside.'},
                {'id': '12A-APLR-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'CONTEMPT', 'detail': '"You\'re dead to me." She handed me the file of the victims I abandoned.'}
            ]
        # Methodical-Ally-Flee-Power (Betrayal)
        if path_key == 'MAFP':
            return [
                {'id': '12A-MAFP-1', 'imageKey': 'voice', 'title': 'THE WIRE', 'subtitle': 'EXPOSED', 'detail': 'I gave Martinez the proof. Sarah arrested for sabotage.'},
                {'id': '12A-MAFP-2', 'imageKey': 'harborPrecinct', 'title': 'ARREST', 'subtitle': 'SARAH', 'detail': 'Led away in cuffs. She knows I sold her out to save the empire.'},
                {'id': '12A-MAFP-3', 'imageKey': 'blackEnvelope', 'title': 'THE THRONE', 'subtitle': 'SECURED', 'detail': 'No mole. No threats. Just absolute power and a heavy soul.'}
            ]
        # Methodical-Ally-Flee-Sacrifice (Penance)
        if path_key == 'MAFS':
            return [
                {'id': '12A-MAFS-1', 'imageKey': 'voice', 'title': 'WARNING', 'subtitle': 'ESCAPE', 'detail': 'I told her to run. Saved her from Victoria\'s wrath.'},
                {'id': '12A-MAFS-2', 'imageKey': 'blackEnvelope', 'title': 'ASSETS', 'subtitle': 'LOST', 'detail': 'Blackwell falls. I go to prison. But Sarah is clean.'},
                {'id': '12A-MAFS-3', 'imageKey': 'keeper', 'title': 'PRISON', 'subtitle': 'SEVEN YEARS', 'detail': 'The final payment. Sarah visits. "You saved me."'}
            ]
        # Methodical-Prisoner-Justice-Destroy (Nuclear)
        if path_key == 'MPJD':
            return [
                {'id': '12A-MPJD-1', 'imageKey': 'blackEnvelope', 'title': 'DATA DUMP', 'subtitle': 'GLOBAL', 'detail': 'Every file. Every secret. Uploaded to the world.'},
                {'id': '12A-MPJD-2', 'imageKey': 'harborPrecinct', 'title': 'CHAOS', 'subtitle': 'RESIGNATIONS', 'detail': 'The government dissolved. Accounts frozen. The nuclear option.'},
                {'id': '12A-MPJD-3', 'imageKey': 'default', 'title': 'BURNER', 'subtitle': 'CRUSHED', 'detail': 'Martinez called. I hung up. A fugitive with clean hands.'}
            ]
        # Methodical-Prisoner-Justice-Rule (Architect)
        if path_key == 'MPJR':
            return [
                {'id': '12A-MPJR-1', 'imageKey': 'harborPrecinct', 'title': 'PENTHOUSE', 'subtitle': 'MEETING', 'detail': 'The staff assembled. Nervous. I am the new Director.'},
                {'id': '12A-MPJR-2', 'imageKey': 'blackEnvelope', 'title': 'THE PURGE', 'subtitle': 'LIQUIDATION', 'detail': 'Exposing the corrupt lieutenants. Consolidating control.'},
                {'id': '12A-MPJR-3', 'imageKey': 'default', 'title': 'THE LEAK', 'subtitle': 'CONTROLLED', 'detail': 'Innocents freed. Leverage retained. The Benevolent King.'}
            ]

    # 012B: The Aftermath
    if case_id == '012B':
        # Reuse logic where appropriate or unique entries
        if path_key == 'AACP':
            return [
                {'id': '12B-AACP-1', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'SAFE', 'detail': 'Safest city in the region. Crime is zero. Freedom is optional.'},
                {'id': '12B-AACP-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'RELEASED', 'detail': '"You learned the lesson." She left, satisfied with her creation.'},
                {'id': '12B-AACP-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'GONE', 'detail': 'Taking the Project far away. She can\'t look at me.'}
            ]
        if path_key == 'AACS':
            return [
                {'id': '12B-AACS-1', 'imageKey': 'harborPrecinct', 'title': 'CHAOS', 'subtitle': 'RECOVERY', 'detail': 'Slow, grinding reform. Politics are messy. But honest.'},
                {'id': '12B-AACS-2', 'imageKey': 'default', 'title': 'PROBATION', 'subtitle': 'TWO YEARS', 'detail': 'Negotiated freedom. Full cooperation. Working in the light.'},
                {'id': '12B-AACS-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'LEADER', 'detail': 'Building the Project. A powerful, legitimate force.'}
            ]
        if path_key == 'AAER' or path_key == 'MAER':
            return [
                {'id': '12B-AAER-1', 'imageKey': 'sparkle', 'title': 'ELEANOR', 'subtitle': 'SIGNED', 'detail': 'She signed my papers. "You chose the hard road." Acceptance.'},
                {'id': '12B-AAER-2', 'imageKey': 'default', 'title': 'PROBATION', 'subtitle': 'DONE', 'detail': 'Three years served. Sentence complete. A quiet peace.'},
                {'id': '12B-AAER-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'PRISON', 'detail': 'She refused visitors. The empire died legally.'}
            ]
        if path_key == 'AAES':
            return [
                {'id': '12B-AAES-1', 'imageKey': 'harborPrecinct', 'title': 'BUNKER', 'subtitle': 'ISOLATION', 'detail': 'Shielded by chaos. Protected by secrets. The Overseer.'},
                {'id': '12B-AAES-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'RELEASED', 'detail': '"Power is the only way." She vanished into the night.'},
                {'id': '12B-AAES-3', 'imageKey': 'voice', 'title': 'DONATION', 'subtitle': 'ANONYMOUS', 'detail': 'Funding Sarah\'s work. She doesn\'t know it\'s blood money.'}
            ]
        if path_key == 'APEF':
            return [
                {'id': '12B-APEF-1', 'imageKey': 'default', 'title': 'COASTAL TOWN', 'subtitle': 'EXILE', 'detail': 'South America. Sun and silence. A legend who vanished.'},
                {'id': '12B-APEF-2', 'imageKey': 'voice', 'title': 'NEWS', 'subtitle': 'FROM HOME', 'detail': 'Sarah struggling for funding. She never forgave me.'},
                {'id': '12B-APEF-3', 'imageKey': 'blackEnvelope', 'title': 'LEAKS', 'subtitle': 'PENANCE', 'detail': 'Sending money anonymously. Buying silence from guilt.'}
            ]
        if path_key == 'APER':
            return [
                {'id': '12B-APER-1', 'imageKey': 'voice', 'title': 'THE TEAM', 'subtitle': 'RECONCILED', 'detail': 'Built on struggle. Trust earned back, inch by inch.'},
                {'id': '12B-APER-2', 'imageKey': 'lex', 'title': 'WORK', 'subtitle': 'OFF BOOKS', 'detail': 'Channeling aggression into truth. The silent engine.'},
                {'id': '12B-APER-3', 'imageKey': 'default', 'title': 'BADGE', 'subtitle': 'HONORARY', 'detail': 'Investigator of Integrity. A clean life.'}
            ]
        if path_key == 'APLJ' or path_key == 'MPLJ':
            return [
                {'id': '12B-APLJ-1', 'imageKey': 'voice', 'title': 'VISIT', 'subtitle': 'PRISON', 'detail': '"They\'re free, Jack." We bought their lives.'},
                {'id': '12B-APLJ-2', 'imageKey': 'default', 'title': 'RELEASE', 'subtitle': 'QUIET', 'detail': 'Debt paid. No fanfare. Just the open air.'},
                {'id': '12B-APLJ-3', 'imageKey': 'voice', 'title': 'JOB OFFER', 'subtitle': 'WAITING', 'detail': 'Sarah waited. A final act of loyalty.'}
            ]
        if path_key == 'APLR' or path_key == 'MPLF':
            return [
                {'id': '12B-APLR-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'GONE', 'detail': 'She built the Project without me. Fueled by contempt.'},
                {'id': '12B-APLR-2', 'imageKey': 'default', 'title': 'NO BADGE', 'subtitle': 'NO PURPOSE', 'detail': 'Living in a moral prison. Defined by the ghost of five victims.'},
                {'id': '12B-APLR-3', 'imageKey': 'blackEnvelope', 'title': 'MEMOS', 'subtitle': 'SHADOWS', 'detail': 'Leaking intel to Sarah. Penance she will never acknowledge.'}
            ]
        if path_key == 'MAFP':
            return [
                {'id': '12B-MAFP-1', 'imageKey': 'voice', 'title': 'LETTER', 'subtitle': 'FROM SARAH', 'detail': '"You lost the only thing that mattered." She returned the money.'},
                {'id': '12B-MAFP-2', 'imageKey': 'harborPrecinct', 'title': 'CITY', 'subtitle': 'SAFE', 'detail': 'Centralized control. Absolute order. A clean, quiet prison.'},
                {'id': '12B-MAFP-3', 'imageKey': 'default', 'title': 'ISOLATION', 'subtitle': 'COMPLETE', 'detail': 'A king in the dark. Traded morality for the throne.'}
            ]
        if path_key == 'MAFS':
            return [
                {'id': '12B-MAFS-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'CLEAN', 'detail': 'She launched the Project. Rebuilt the legal structure.'},
                {'id': '12B-MAFS-2', 'imageKey': 'keeper', 'title': 'PRISON', 'subtitle': 'VISIT', 'detail': '"You used corruption to build the clean path."'},
                {'id': '12B-MAFS-3', 'imageKey': 'default', 'title': 'RELEASE', 'subtitle': 'CHANGED', 'detail': 'Seven years older. No power. But I have her trust.'}
            ]
        if path_key == 'MPJD':
            return [
                {'id': '12B-MPJD-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'FAREWELL', 'detail': 'Sorrow and respect. "Now I disappear."'},
                {'id': '12B-MPJD-2', 'imageKey': 'default', 'title': 'FUGITIVE', 'subtitle': 'GHOST', 'detail': 'Traveling the world. Seeking justice for the forgotten.'},
                {'id': '12B-MPJD-3', 'imageKey': 'blackEnvelope', 'title': 'WHITE PAWN', 'subtitle': 'ANNIVERSARY', 'detail': 'Appears on my desk every year. Silent acknowledgment.'}
            ]
        if path_key == 'MPJR':
            return [
                {'id': '12B-MPJR-1', 'imageKey': 'voice', 'title': 'THE CALL', 'subtitle': 'FROM ABOVE', 'detail': 'I fund the Project. She refuses to see me.'},
                {'id': '12B-MPJR-2', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'CLEANEST', 'detail': 'Safest city in the country. Run by fear and certainty.'},
                {'id': '12B-MPJR-3', 'imageKey': 'default', 'title': 'ARCHITECT', 'subtitle': 'ALONE', 'detail': 'Free. Powerful. The Benevolent King.'}
            ]

    # 012C: The Endings (Polaroids reflect the final state)
    if case_id == '012C':
        if path_key == 'AACP': # The Tyrant
            return [
                {'id': '12C-AACP-1', 'imageKey': 'harborPrecinct', 'title': 'THE CITY', 'subtitle': 'ORDERED', 'detail': 'Safe. Efficient. Controlled.'},
                {'id': '12C-AACP-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'EXILE', 'detail': 'Running her project far away. A casualty of peace.'},
                {'id': '12C-AACP-3', 'imageKey': 'default', 'title': 'CROWN', 'subtitle': 'INVISIBLE', 'detail': 'The Tyrant ruled by the benevolent hand.'}
            ]
        if path_key == 'AACS': # The Exile
            return [
                {'id': '12C-AACS-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'POWERFUL', 'detail': 'Voice of integrity. Fighting the new corruption.'},
                {'id': '12C-AACS-2', 'imageKey': 'default', 'title': 'SHADOWS', 'subtitle': 'HOME', 'detail': 'Operating where the law cannot see.'},
                {'id': '12C-AACS-3', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'UNSTABLE', 'detail': 'Morally clean. Politically messy. Alive.'}
            ]
        if path_key == 'AAER' or path_key == 'MAER': # The Reformer
            return [
                {'id': '12C-AAER-1', 'imageKey': 'default', 'title': 'LEGACY', 'subtitle': 'QUIET', 'detail': 'Famous for integrity, not clearance rates.'},
                {'id': '12C-AAER-2', 'imageKey': 'harborPrecinct', 'title': 'SYSTEM', 'subtitle': 'HEALING', 'detail': 'Brick by painstaking brick.'},
                {'id': '12C-AAER-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'TEAM', 'detail': 'Repairing the damage of the first life.'}
            ]
        if path_key == 'AAES' or path_key == 'MAES': # The Overseer
            return [
                {'id': '12C-AAES-1', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'SAFE', 'detail': 'Ruled by the aggressive hand.'},
                {'id': '12C-AAES-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'FIGHTING', 'detail': 'Constantly battling the tide I control.'},
                {'id': '12C-AAES-3', 'imageKey': 'default', 'title': 'SOUL', 'subtitle': 'SOLD', 'detail': 'Sacrificed for ultimate order.'}
            ]
        if path_key == 'APEF': # The Wandering Ghost
            return [
                {'id': '12C-APEF-1', 'imageKey': 'default', 'title': 'GOLD CAGE', 'subtitle': 'SURVIVOR', 'detail': 'Isolated comfort. Safe but stripped.'},
                {'id': '12C-APEF-2', 'imageKey': 'harborPrecinct', 'title': 'DISTANCE', 'subtitle': 'EXILE', 'detail': 'Watching consequences from miles away.'},
                {'id': '12C-APEF-3', 'imageKey': 'blackEnvelope', 'title': 'MEMORY', 'subtitle': 'SHADOW', 'detail': 'Living in the shadow of the man I could have been.'}
            ]
        if path_key == 'APER': # The Redeemed
            return [
                {'id': '12C-APER-1', 'imageKey': 'default', 'title': 'BADGE', 'subtitle': 'HONORARY', 'detail': 'Investigator of Integrity.'},
                {'id': '12C-APER-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'WORK', 'detail': 'Anonymous engine of reform.'},
                {'id': '12C-APER-3', 'imageKey': 'sparkle', 'title': 'PEACE', 'subtitle': 'EARNED', 'detail': 'Found soul by giving up freedom.'}
            ]
        if path_key == 'APLJ' or path_key == 'MPLJ': # The Martyr
            return [
                {'id': '12C-APLJ-1', 'imageKey': 'harborPrecinct', 'title': 'CITY', 'subtitle': 'CLEAN', 'detail': 'Living anonymously in the city I saved.'},
                {'id': '12C-APLJ-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'HERO', 'detail': 'I paved the way for her rise.'},
                {'id': '12C-APLJ-3', 'imageKey': 'default', 'title': 'PRICE', 'subtitle': 'PAID', 'detail': 'Final payment for the necessary crime.'}
            ]
        if path_key == 'APLR' or path_key == 'MPLF': # The Hermit/Isolate
            return [
                {'id': '12C-APLR-1', 'imageKey': 'default', 'title': 'EXILE', 'subtitle': 'SELF-IMPOSED', 'detail': 'Freed but never free.'},
                {'id': '12C-APLR-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'SILENCE', 'detail': 'She understands the cost of my choice.'},
                {'id': '12C-APLR-3', 'imageKey': 'blackEnvelope', 'title': 'PENANCE', 'subtitle': 'SOLITARY', 'detail': 'Dismantling corruption from the shadows.'}
            ]
        if path_key == 'MAFP': # The Tyrant (Variant)
            return [
                {'id': '12C-MAFP-1', 'imageKey': 'default', 'title': 'THRONE', 'subtitle': 'DARK', 'detail': 'King in the dark.'},
                {'id': '12C-MAFP-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'BETRAYED', 'detail': 'Sacrificed for power.'},
                {'id': '12C-MAFP-3', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'ORDER', 'detail': 'Stability relies on my corruption.'}
            ]
        if path_key == 'MAFS': # The Exile (Variant)
            return [
                {'id': '12C-MAFS-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'TRUST', 'detail': 'She knows I saved her.'},
                {'id': '12C-MAFS-2', 'imageKey': 'default', 'title': 'PROJECT', 'subtitle': 'RESEARCH', 'detail': 'Silent arm of the reform.'},
                {'id': '12C-MAFS-3', 'imageKey': 'sparkle', 'title': 'REDEMPTION', 'subtitle': 'FOUND', 'detail': 'Paid the debt. Returned to light.'}
            ]
        if path_key == 'MPJD': # The Quiet Man
            return [
                {'id': '12C-MPJD-1', 'imageKey': 'default', 'title': 'GHOST', 'subtitle': 'OPERATIVE', 'detail': 'Outside the reach of law.'},
                {'id': '12C-MPJD-2', 'imageKey': 'blackEnvelope', 'title': 'PAWN', 'subtitle': 'WHITE', 'detail': 'Anniversary gift. Silent victory.'},
                {'id': '12C-MPJD-3', 'imageKey': 'harborPrecinct', 'title': 'HANDS', 'subtitle': 'CLEANEST', 'detail': 'No fame. No power. Just clean.'}
            ]
        if path_key == 'MPJR': # The Architect
            return [
                {'id': '12C-MPJR-1', 'imageKey': 'harborPrecinct', 'title': 'ASHPORT', 'subtitle': 'RULED', 'detail': 'Cleanest city. Run by shadows.'},
                {'id': '12C-MPJR-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'DISTANT', 'detail': 'She cannot reconcile the means.'},
                {'id': '12C-MPJR-3', 'imageKey': 'default', 'title': 'PARADOX', 'subtitle': 'KING', 'detail': 'The Benevolent King.'}
            ]

    return []

def main():
    print(f"Loading {NARRATIVE_PATH}...")
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    case_content = data.get('caseContent', {})
    target_cases = ['012A', '012B', '012C']
    updated_count = 0
    
    for case_id in target_cases:
        if case_id in case_content:
            for path_key in case_content[case_id]:
                polaroids = get_polaroid_data(case_id, path_key)
                if polaroids:
                    print(f"Injecting polaroids for {case_id} - {path_key}")
                    if 'evidenceBoard' not in case_content[case_id][path_key]:
                         case_content[case_id][path_key]['evidenceBoard'] = {}
                    case_content[case_id][path_key]['evidenceBoard']['polaroids'] = polaroids
                    updated_count += 1
    
    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully updated {updated_count} paths in {NARRATIVE_PATH}.")

if __name__ == "__main__":
    main()
