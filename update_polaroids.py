from pathlib import Path


def build_block(entries, indent):
    def esc(value: str) -> str:
        return value.replace("'", "\\'")

    lines = [f"{indent}evidenceBoard: {{", f"{indent}  polaroids: ["]
    for entry in entries:
        lines.extend([
            f"{indent}    {{",
            f"{indent}      id: '{esc(entry['id'])}',",
            f"{indent}      imageKey: '{esc(entry['imageKey'])}',",
            f"{indent}      title: '{esc(entry['title'])}',",
            f"{indent}      subtitle: '{esc(entry['subtitle'])}',",
            f"{indent}      detail: '',",
            f"{indent}    }},",
        ])
    lines.append(f"{indent}  ],")
    lines.append(f"{indent}}},")
    return '\n'.join(lines)

polaroid_data = {
    '001A': [
        {'id': '001A-confessor-arrival', 'imageKey': 'midnightConfessor', 'title': 'Midnight Confessor Arrival', 'subtitle': "Perfumed stranger outside Jack's door"},
        {'id': '001A-eleanor-call', 'imageKey': 'eleanorBellamy', 'title': "Eleanor's Emergency Call", 'subtitle': 'Greystone inmate pleads for help'},
        {'id': '001A-ultimatum-envelope', 'imageKey': 'blackEnvelope', 'title': 'Twelve-Day Ultimatum', 'subtitle': 'Black envelope sealed in red wax'},
    ],
    '001B': [
        {'id': '001B-visitation-booth', 'imageKey': 'eleanorBellamy', 'title': 'Greystone Visitation Booth', 'subtitle': 'Eleanor shackled and coughing from ricin'},
        {'id': '001B-scarlet-visitor', 'imageKey': 'midnightConfessor', 'title': 'Scarlet Visitor Log', 'subtitle': 'Woman in red noted by Greystone guards'},
        {'id': '001B-ricin-note', 'imageKey': 'blackEnvelope', 'title': 'Ricin Warning Note', 'subtitle': '"Ask her about the woman in red" message'},
    ],
    '001C': [
        {'id': '001C-ruined-study', 'imageKey': 'harborPrecinct', 'title': 'Bellamy Estate Study', 'subtitle': 'Safe cracked and ledgers scattered'},
        {'id': '001C-day-one-pawn', 'imageKey': 'blackEnvelope', 'title': 'Day One Pawn Marker', 'subtitle': "Chess token left on Richard's desk"},
        {'id': '001C-sarah-sweep', 'imageKey': 'sarahReeves', 'title': 'Sarah Reeves Sweep', 'subtitle': 'Flashlight search through broken glass'},
    ],
    '002A': [
        {'id': '002A-claire-dossier', 'imageKey': 'claireThornhill', 'title': 'Claire Thornhill Dossier', 'subtitle': "Daughter reopening her father's case"},
        {'id': '002A-silas-surveillance', 'imageKey': 'silasReed', 'title': 'Silas Reed Surveillance', 'subtitle': 'Partner caught on Thornhill ledgers'},
        {'id': '002A-blueline-backroom', 'imageKey': 'bluelineDiner', 'title': 'Blueline Diner Backroom', 'subtitle': "Claire's evidence spread across the booth"},
    ],
    '002B': [
        {'id': '002B-silas-confession', 'imageKey': 'silasReed', 'title': "Silas's Confession Tape", 'subtitle': 'Admits to framing Marcus Thornhill'},
        {'id': '002B-encrypted-orders', 'imageKey': 'blackEnvelope', 'title': 'Encrypted Orders Ledger', 'subtitle': 'Seven-year directives signed "M.C."'},
        {'id': '002B-marina-balcony', 'imageKey': 'harborPrecinct', 'title': 'Marina District Balcony', 'subtitle': 'Silas meets Jack above the harbor'},
    ],
    '002C': [
        {'id': '002C-maya-hostage', 'imageKey': 'mayaBellamy', 'title': 'Maya Bellamy Hostage', 'subtitle': 'Tea service leverage inside the penthouse'},
        {'id': '002C-victoria-reveal', 'imageKey': 'victoriaAshford', 'title': 'Victoria Ashford Reveal', 'subtitle': 'Emily Cross alive in scarlet dress'},
        {'id': '002C-blackwell-skyline', 'imageKey': 'harborPrecinct', 'title': 'Blackwell Penthouse Skyline', 'subtitle': 'Ashford empire watching over Ashport'},
    ],
    '003B': [
        {'id': '003B-marcus-backroom', 'imageKey': 'marcusWebb', 'title': 'Marcus Webb Backroom', 'subtitle': 'Antique dealer spilling secrets'},
        {'id': '003B-emily-portrait', 'imageKey': 'emilyCross', 'title': 'Emily Cross Gallery Portrait', 'subtitle': 'Society photo Marcus kept hidden'},
        {'id': '003B-ledger', 'imageKey': 'blackEnvelope', 'title': 'Bellamy Embezzlement Ledger', 'subtitle': 'Proof that framed Eleanor Bellamy'},
    ],
    '003C': [
        {'id': '003C-helen-breakdown', 'imageKey': 'helenPrice', 'title': 'Helen Price Breakdown', 'subtitle': 'Queen of Convictions begging for immunity'},
        {'id': '003C-annotated-dossier', 'imageKey': 'blackEnvelope', 'title': 'Annotated Case Dossier', 'subtitle': "Victoria's notes on every rigged conviction"},
        {'id': '003C-interview-room', 'imageKey': 'harborPrecinct', 'title': 'Interview Room Three', 'subtitle': 'Where Helen confesses behind glass'},
    ],
    '004A': [
        {'id': '004A-price-podium', 'imageKey': 'helenPrice', 'title': 'Helen Price at Podium', 'subtitle': 'Confession broadcast to Ashport press'},
        {'id': '004A-press-row', 'imageKey': 'harborPrecinct', 'title': 'Press Row Flashbulbs', 'subtitle': "Cameras capturing the Queen's fall"},
        {'id': '004A-surveillance-clip', 'imageKey': 'blackEnvelope', 'title': 'Grange Torture Footage', 'subtitle': 'Clip Helen plays to melt her crown'},
    ],
    '004B': [
        {'id': '004B-sarah-briefing', 'imageKey': 'sarahReeves', 'title': 'Sarah Reeves Briefing', 'subtitle': 'Integrity Project briefing room'},
        {'id': '004B-witness-binder', 'imageKey': 'blackEnvelope', 'title': 'Witness Binder Stack', 'subtitle': 'Twelve affidavits for FBI review'},
        {'id': '004B-grange-arrest', 'imageKey': 'harborPrecinct', 'title': 'Deputy Chief in Cuffs', 'subtitle': 'Grange arrested live on stream'},
    ],
    '004C': [
        {'id': '004C-victoria-lesson', 'imageKey': 'victoriaAshford', 'title': "Victoria's Penthouse Lesson", 'subtitle': 'Scarlet lecturer framed by the skyline'},
        {'id': '004C-portrait-reveal', 'imageKey': 'harborPrecinct', 'title': 'Portrait of Jack Halloway', 'subtitle': 'Commissioned indictment of a detective'},
        {'id': '004C-lisa-envelope', 'imageKey': 'lisaChen', 'title': 'Lisa Chen Envelope', 'subtitle': 'Evidence bundle for Day Five'},
    ],
    '005A': [
        {'id': '005A-lisa-release', 'imageKey': 'lisaChen', 'title': 'Dr. Lisa Chen Released', 'subtitle': 'Scientist walking free after eight years'},
        {'id': '005A-victoria-orders', 'imageKey': 'blackEnvelope', 'title': "Victoria's Day Five Orders", 'subtitle': 'Fresh black envelope with new demands'},
        {'id': '005A-evidence-drive', 'imageKey': 'harborPrecinct', 'title': 'Evidence Drive Inventory', 'subtitle': '217 tainted cases catalogued'},
    ],
    '005B': [
        {'id': '005B-helios-warehouse', 'imageKey': 'harborPrecinct', 'title': 'Helios Warehouse', 'subtitle': 'Hidden forensic lab beneath the docks'},
        {'id': '005B-sarah-command', 'imageKey': 'sarahReeves', 'title': "Sarah's Command Center", 'subtitle': 'Integrity Project war room'},
        {'id': '005B-tom-wade-call', 'imageKey': 'tomWade', 'title': 'Tom Wade on the Line', 'subtitle': 'Confession crackling through static'},
    ],
    '005C': [
        {'id': '005C-marine-rope', 'imageKey': 'blackEnvelope', 'title': 'Marine Rope Sample', 'subtitle': "Wrong knot from Victoria's staging"},
        {'id': '005C-dna-scrapings', 'imageKey': 'blackEnvelope', 'title': 'DNA Scrapings Vials', 'subtitle': "Collected beneath Tom's fingernails"},
        {'id': '005C-marina-map', 'imageKey': 'harborPrecinct', 'title': 'Ashport Marina Holdings', 'subtitle': 'Shell companies tied to Victoria'},
    ],
    '006A': [
        {'id': '006A-margaret-porch', 'imageKey': 'margaretHalloway', 'title': 'Margaret Halloway', 'subtitle': 'Ex-wife rebuilding after retaliation'},
        {'id': '006A-carjacked-sedan', 'imageKey': 'harborPrecinct', 'title': 'Carjacked Sedan Evidence', 'subtitle': "Scene of Thornhill's revenge strike"},
        {'id': '006A-kitchen-wall', 'imageKey': 'blackEnvelope', 'title': 'Kitchen Photo Wall', 'subtitle': 'New family stitched together without Jack'},
    ],
    '006B': [
        {'id': '006B-murphys-booth', 'imageKey': 'murphysBar', 'title': "Murphy's Bar Back Booth", 'subtitle': 'Neutral ground for uneasy truce'},
        {'id': '006B-job-offer', 'imageKey': 'blackEnvelope', 'title': 'Deputy Director Offer', 'subtitle': "Victoria's promise slid across the table"},
        {'id': '006B-wade-case-box', 'imageKey': 'blackEnvelope', 'title': 'Wade Evidence Box', 'subtitle': 'DNA, rope, confession compiled'},
    ],
    '006C': [
        {'id': '006C-silas-arraignment', 'imageKey': 'silasReed', 'title': 'Silas Reed Arraignment', 'subtitle': 'Guilty plea recorded in open court'},
        {'id': '006C-emily-scar-study', 'imageKey': 'victoriaAshford', 'title': 'Emily Scar Study', 'subtitle': "Matching injury proving Victoria's identity"},
        {'id': '006C-cross-files', 'imageKey': 'blackEnvelope', 'title': 'Cross Case Files', 'subtitle': 'Autopsy, photos, redacted transcripts'},
    ],
    '007A': [
        {'id': '007A-appeals-chamber', 'imageKey': 'harborPrecinct', 'title': 'Appeals Court Chamber', 'subtitle': 'Judge Rosen presiding over reversal'},
        {'id': '007A-exhibit-folder', 'imageKey': 'blackEnvelope', 'title': 'Exhibit Folder', 'subtitle': 'Shell records introduced at appeal'},
        {'id': '007A-eleanor-freed', 'imageKey': 'eleanorBellamy', 'title': 'Eleanor Bellamy Freed', 'subtitle': 'Conviction overturned in open court'},
    ],
    '007B': [
        {'id': '007B-sarah-packing', 'imageKey': 'sarahReeves', 'title': 'Sarah Reeves Packing Up', 'subtitle': 'Office boxes stacked to leave precinct'},
        {'id': '007B-integrity-roadmap', 'imageKey': 'blackEnvelope', 'title': 'Integrity Project Roadmap', 'subtitle': 'Claire and Lisa planning the rebuild'},
        {'id': '007B-shell-architect', 'imageKey': 'harborPrecinct', 'title': 'Shell Corporation Architect', 'subtitle': 'Whistleblower stepping into the light'},
    ],
    '007C': [
        {'id': '007C-empty-desk', 'imageKey': 'harborPrecinct', 'title': "Jack's Empty Desk", 'subtitle': 'Late-night rain streaking the window'},
        {'id': '007C-stacked-files', 'imageKey': 'blackEnvelope', 'title': 'Stacked Innocence Files', 'subtitle': 'Five exonerations waiting in order'},
        {'id': '007C-day-seven-text', 'imageKey': 'blackEnvelope', 'title': 'Day Seven Text Alert', 'subtitle': "Confessor noting who's missing"},
    ],
    '008A': [
        {'id': '008A-fbi-at-dawn', 'imageKey': 'harborPrecinct', 'title': 'FBI at Dawn', 'subtitle': "Agents surrounding Jack's doorway"},
        {'id': '008A-federal-holding', 'imageKey': 'harborPrecinct', 'title': 'Federal Holding Cell', 'subtitle': 'Nathan Thornhill across the bench'},
        {'id': '008A-victoria-note', 'imageKey': 'blackEnvelope', 'title': "Victoria's Holding Note", 'subtitle': '"Fight the system" scrawled in red'},
    ],
    '008B': [
        {'id': '008B-release-order', 'imageKey': 'blackEnvelope', 'title': 'Release Order File', 'subtitle': 'Thirty-six hours then out'},
        {'id': '008B-emily-message', 'imageKey': 'emilyCross', 'title': 'Emily Cross Message', 'subtitle': 'Four days left warning'},
        {'id': '008B-sarah-question', 'imageKey': 'sarahReeves', 'title': "Sarah's Question", 'subtitle': 'Join Victoria or refuse her empire?'},
    ],
    '008C': [
        {'id': '008C-forked-road', 'imageKey': 'blackEnvelope', 'title': 'Forked Road Diagram', 'subtitle': 'Path to Victoria versus path to law'},
        {'id': '008C-pending-cases', 'imageKey': 'blackEnvelope', 'title': 'Pending Appeals Board', 'subtitle': 'Five innocents still inside'},
        {'id': '008C-victoria-gallery', 'imageKey': 'victoriaAshford', 'title': "Victoria's Gallery Offer", 'subtitle': 'Promise of power showcased in glass'},
    ],
    '009A': [
        {'id': '009A-gallery-entry', 'imageKey': 'harborPrecinct', 'title': 'Gallery Entry Installation', 'subtitle': 'Cases displayed as public art'},
        {'id': '009A-forged-reports', 'imageKey': 'blackEnvelope', 'title': 'Forged Lab Reports', 'subtitle': 'Tom Wade edits under protective glass'},
        {'id': '009A-empty-eyes', 'imageKey': 'victoriaAshford', 'title': "Empty Eyes Portrait", 'subtitle': "Victoria's painting of Jack's guilt"},
    ],
    '009B': [
        {'id': '009B-city-hall', 'imageKey': 'harborPrecinct', 'title': 'City Hall Under Siege', 'subtitle': 'Riots and raids ignite Ashport'},
        {'id': '009B-sarah-podium', 'imageKey': 'sarahReeves', 'title': 'Sarah Reeves at Podium', 'subtitle': 'FBI briefing turning revenge legit'},
        {'id': '009B-helen-note', 'imageKey': 'helenPrice', 'title': 'Helen Price Final Note', 'subtitle': 'Apology released posthumously'},
    ],
    '009C': [
        {'id': '009C-blood-recorder', 'imageKey': 'blackEnvelope', 'title': 'Bloodstained Recorder', 'subtitle': "Emily's captivity pressed to tape"},
        {'id': '009C-ec-scrawl', 'imageKey': 'emilyCross', 'title': 'E.C. Scrawl', 'subtitle': '"Listen and learn" instruction'},
        {'id': '009C-midnight-rain', 'imageKey': 'harborPrecinct', 'title': 'Midnight Rain Living Room', 'subtitle': "Sarah's couch under stormlight"},
    ],
    '010A': [
        {'id': '010A-agent-martinez', 'imageKey': 'agentMartinez', 'title': 'Agent Martinez Briefing', 'subtitle': 'Dawn raid countdown on Victoria'},
        {'id': '010A-wade-evidence', 'imageKey': 'tomWade', 'title': 'Tom Wade Evidence Locker', 'subtitle': 'DNA, rope, confession sealed'},
        {'id': '010A-appeal-dockets', 'imageKey': 'blackEnvelope', 'title': 'Appeal Dockets Stack', 'subtitle': 'Five innocents waiting for release'},
    ],
    '010B': [
        {'id': '010B-recorded-confession', 'imageKey': 'harborPrecinct', 'title': 'Recorded Confession Playback', 'subtitle': 'Jack admits obstruction to buy time'},
        {'id': '010B-twentyfour-deal', 'imageKey': 'blackEnvelope', 'title': 'Twenty-Four Hour Deal', 'subtitle': 'Emily asks for one more day alive'},
        {'id': '010B-five-case-files', 'imageKey': 'blackEnvelope', 'title': 'Five Case Files Spread', 'subtitle': 'Eleanor, Lisa, James, Marcus, Teresa'},
    ],
    '010C': [
        {'id': '010C-exoneration-orders', 'imageKey': 'blackEnvelope', 'title': 'Exoneration Orders Signed', 'subtitle': 'Lisa, James, Eleanor walk free'},
        {'id': '010C-fbi-testimony', 'imageKey': 'harborPrecinct', 'title': 'FBI Testimony Transcript', 'subtitle': 'Martinez recording in evidence'},
        {'id': '010C-emily-promise', 'imageKey': 'emilyCross', 'title': "Emily's Promise Warehouse", 'subtitle': 'Agreement before surrender'},
    ],
    '011A': [
        {'id': '011A-fbi-interview', 'imageKey': 'harborPrecinct', 'title': 'FBI Interview Room', 'subtitle': 'Recorder humming between agents'},
        {'id': '011A-wade-evidence', 'imageKey': 'tomWade', 'title': 'Wade Case Evidence Spread', 'subtitle': 'DNA, rope, confession reexamined'},
        {'id': '011A-ec-exchange', 'imageKey': 'emilyCross', 'title': 'Emily Cross Exchange', 'subtitle': 'Warehouse invitation for final bargain'},
    ],
    '011B': [
        {'id': '011B-margaret-call', 'imageKey': 'margaretHalloway', 'title': "Margaret's Call", 'subtitle': 'Pride and fear in equal measure'},
        {'id': '011B-integrity-plan', 'imageKey': 'blackEnvelope', 'title': 'Integrity Project Plan', 'subtitle': 'Rebecca Moss strategy binder'},
        {'id': '011B-emily-rain', 'imageKey': 'emilyCross', 'title': 'Emily in the Rain', 'subtitle': 'Jeans, sweatshirt, confession in the dark'},
    ],
    '011C': [
        {'id': '011C-necessity-notes', 'imageKey': 'blackEnvelope', 'title': 'Necessity Defense Notes', 'subtitle': 'Rebecca builds the argument'},
        {'id': '011C-sarah-support', 'imageKey': 'sarahReeves', 'title': "Sarah's Support Ride", 'subtitle': 'Conviction Integrity car waiting'},
        {'id': '011C-emily-dawn-message', 'imageKey': 'emilyCross', 'title': "Emily's Dawn Message", 'subtitle': '"See you in twelve years" text'},
    ],
    '012A': [
        {'id': '012A-warehouse-floor', 'imageKey': 'harborPrecinct', 'title': 'Lamplight Warehouse Floor', 'subtitle': 'Rain-soaked concrete underfoot'},
        {'id': '012A-unloaded-revolver', 'imageKey': 'blackEnvelope', 'title': 'Unloaded Revolver', 'subtitle': 'Choice without bullets on the table'},
        {'id': '012A-burned-contract', 'imageKey': 'blackEnvelope', 'title': 'Burned Contract', 'subtitle': 'Victoria sets her empire ablaze'},
    ],
    '012B': [
        {'id': '012B-lucia-countdown', 'imageKey': 'harborPrecinct', 'title': "Lucia's Countdown Cards", 'subtitle': 'Birthday tally kept in prison letters'},
        {'id': '012B-dismissed-ledger', 'imageKey': 'blackEnvelope', 'title': 'Dismissed Evidence Ledger', 'subtitle': "Sarah's book rewriting procedure"},
        {'id': '012B-prison-letters', 'imageKey': 'blackEnvelope', 'title': 'Prison Letters Stack', 'subtitle': 'Eleanor, Teresa, Mrs. Martinez replies'},
    ],
    '012C': [
        {'id': '012C-integrity-vote', 'imageKey': 'harborPrecinct', 'title': 'Integrity Commission Vote', 'subtitle': "Four to three in Jack's favor"},
        {'id': '012C-fallen-king', 'imageKey': 'blackEnvelope', 'title': 'Fallen White King', 'subtitle': 'Chess piece waiting on Jack\'s desk'},
        {'id': '012C-coffee-napkin', 'imageKey': 'blackEnvelope', 'title': 'Coffee Shop Napkin', 'subtitle': 'Emma Reeves? scribbled invitation'},
    ],
}

ordered_cases = [
    '001A', '001B', '003C', '001C', '002A', '002B', '002C', '003B',
    '004A', '004B', '004C', '005A', '005B', '005C', '006A', '006B', '006C',
    '007A', '007B', '007C', '008A', '008B', '008C', '009A', '009B', '009C',
    '010A', '010B', '010C', '011A', '011B', '011C', '012A', '012B', '012C'
]

text = Path('src/data/cases.js').read_text()
parts = []
last_index = 0
search_pos = 0
for case_number in ordered_cases:
    start = text.find('evidenceBoard:', search_pos)
    if start == -1:
        raise SystemExit(f'evidenceBoard not found for {case_number}')
    brace_start = text.find('{', start)
    depth = 0
    i = brace_start
    while i < len(text):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                brace_end = i
                break
        i += 1
    else:
        raise SystemExit('Unclosed brace for evidenceBoard')
    end = brace_end + 1
    if end < len(text) and text[end] == ',':
        end += 1
    prefix = text[last_index:start].rstrip(' ')
    parts.append(prefix)
    line_start = text.rfind('\n', 0, start) + 1
    indent = text[line_start:start]
    indent = indent[:len(indent) - len(indent.lstrip())]
    parts.append('\n' + build_block(polaroid_data[case_number], indent))
    last_index = end
    search_pos = end
parts.append(text[last_index:])
updated = ''.join(parts)

case_marker = "caseNumber: '003A'"
pos = updated.find(case_marker)
if pos == -1:
    raise SystemExit('003A case not found')
sub = updated[pos:]
bridge_idx = sub.find('bridgeText')
if bridge_idx == -1:
    raise SystemExit('bridgeText not found for 003A')
bridge_start = pos + bridge_idx
array_start = updated.find('[', bridge_start)
if array_start == -1:
    raise SystemExit('bridge array start missing for 003A')
depth = 0
for i in range(array_start, len(updated)):
    if updated[i] == '[':
        depth += 1
    elif updated[i] == ']':
        depth -= 1
        if depth == 0:
            array_end = i
            break
else:
    raise SystemExit('bridge array end missing for 003A')
insertion_point = updated.find(',', array_end)
if insertion_point == -1:
    raise SystemExit('comma after bridgeText missing for 003A')
insertion_point += 1
line_start = updated.rfind('\n', 0, bridge_start) + 1
indent = updated[line_start:bridge_start]
indent = indent[:len(indent) - len(indent.lstrip())]
block_003A = '\n' + build_block([
    {'id': '003A-archive-raid', 'imageKey': 'sarahReeves', 'title': "Sarah's Archive Raid", 'subtitle': 'Condemned precinct files unlocked'},
    {'id': '003A-waterlogged-files', 'imageKey': 'harborPrecinct', 'title': 'Waterlogged Witness Files', 'subtitle': 'Reports Sarah drags back into daylight'},
    {'id': '003A-flash-drive', 'imageKey': 'blackEnvelope', 'title': 'Condemned Precinct Flash Drive', 'subtitle': 'Evidence handed to Jack at dawn'},
], indent) + '\n'

final_text = updated[:insertion_point] + block_003A + updated[insertion_point:]
Path('src/data/cases.js').write_text(final_text)
