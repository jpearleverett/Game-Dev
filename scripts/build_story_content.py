#!/usr/bin/env python3
"""
Utility to convert the branching narrative Word docs into structured JSON
data that the app can consume at runtime.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from docx import Document  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs" / "story-revised"
OUTPUT_PATH = ROOT / "src" / "data" / "storyNarrative.json"

CASE_LETTERS = {1: "A", 2: "B", 3: "C"}


def _normalize_path_token(token: str) -> str:
    token = token.strip()
    token = token.replace("Super-Path", "").replace("super-path", "")
    token = token.replace("Path", "").replace("path", "")
    token = token.strip()
    if not token:
        return token
    # Preserve hyphenated letter codes like A-F-L by stripping hyphens
    if re.fullmatch(r"[A-Za-z0-9\-]+", token):
        token = token.replace("-", "")
    # If there is still whitespace, take the first segment (e.g., "Aggressive Ally")
    token = token.split()[0]
    return token


def sanitize_path_key(token: Optional[str]) -> str:
    if not token:
        return "ROOT"
    primary = _normalize_path_token(token)
    cleaned = re.sub(r"[^A-Za-z0-9]", "", primary).upper()
    return cleaned or "ROOT"


def derive_path_key_from_filename(path: Path) -> str:
    stem = path.stem  # e.g., "Chapter 5 AF"
    parts = stem.split()
    if len(parts) <= 2:
        return "ROOT"
    token = " ".join(parts[2:])
    return sanitize_path_key(token)


@dataclass
class DecisionOption:
    key: str
    title: str
    consequence: Optional[str] = None
    focus: Optional[str] = None
    stats: Optional[str] = None
    outcome: Optional[str] = None
    next_chapter: Optional[int] = None
    next_path_key: Optional[str] = None
    raw_lines: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "key": self.key,
            "title": self.title,
            "consequence": self.consequence,
            "focus": self.focus,
            "stats": self.stats,
            "outcome": self.outcome,
            "nextChapter": self.next_chapter,
            "nextPathKey": self.next_path_key,
            "details": self.raw_lines,
        }


@dataclass
class Subchapter:
    chapter: int
    index: int
    path_key: str
    title: str
    bridge_text: Optional[str]
    paragraphs: List[str] = field(default_factory=list)
    decision: Optional[Dict] = None
    previously: Optional[str] = None

    def case_number(self) -> str:
        letter = CASE_LETTERS.get(self.index)
        if not letter:
            raise ValueError(f"Unexpected subchapter index {self.index} in chapter {self.chapter}")
        return f"{self.chapter:03d}{letter}"

    def to_entry(self) -> Dict:
        entry = {
            "chapter": self.chapter,
            "subchapter": self.index,
            "title": self.title,
            "bridgeText": self.bridge_text,
            "narrative": "\n\n".join(self.paragraphs).strip(),
        }
        if self.decision:
            entry["decision"] = self.decision
        if self.previously:
            entry["previously"] = self.previously
        return entry


CHAPTER_PATTERN = re.compile(r"Ch(?:apter)?\s*(\d+)", re.IGNORECASE)
PATH_PATTERN = re.compile(r"Path\s+([A-Za-z0-9\-]+)", re.IGNORECASE)
CHAPTER_CODE_PATTERN = re.compile(r"Chapter\s+\d+\s*:\s*([A-Za-z0-9\-]+)", re.IGNORECASE)


def extract_target(line: str) -> (Optional[int], Optional[str]):
    """
    Attempt to parse the target chapter/path key from a line of text.
    """
    chapter = None
    chapter_match = CHAPTER_PATTERN.search(line)
    if chapter_match:
        try:
            chapter = int(chapter_match.group(1))
        except ValueError:
            chapter = None

    path_fragment = None
    path_match = PATH_PATTERN.search(line)
    if path_match:
        path_fragment = path_match.group(1)
    else:
        code_match = CHAPTER_CODE_PATTERN.search(line)
        if code_match:
            path_fragment = code_match.group(1)
        else:
            quoted = re.search(r'"([^"]+)"', line)
            if quoted:
                path_fragment = quoted.group(1)

    path_key = sanitize_path_key(path_fragment)
    if path_fragment is None:
        path_key = "ROOT"
    return chapter, path_key


def extract_previously_block(line: str) -> Optional[str]:
    if "PREVIOUSLY" not in line.upper():
        return None
    match = re.search(r"PREVIOUSLY\s*:?", line, re.IGNORECASE)
    if not match:
        return None
    remainder = line[match.end():].strip()
    if not remainder:
        return None
    if "\n\n" in remainder:
        remainder = remainder.split("\n\n", 1)[0].strip()
    normalized_lines = [
        segment.strip().strip('"\u201c\u201d')
        for segment in remainder.splitlines()
        if segment.strip()
    ]
    normalized = "\n".join(normalized_lines).strip()
    return normalized or None


def parse_docx_file(path: Path) -> List[Subchapter]:
    document = Document(path)
    chapter_number = None
    path_key = derive_path_key_from_filename(path)

    subchapters: List[Subchapter] = []
    current_sub: Optional[Subchapter] = None
    current_bridge: Optional[str] = None
    decision_section: Optional[Dict] = None
    current_option: Optional[DecisionOption] = None
    decision_intro: List[str] = []
    pending_previously: Optional[str] = None

    for paragraph in document.paragraphs:
        line = paragraph.text.strip()
        if not line:
            continue

        previously_fragment = extract_previously_block(line)
        if previously_fragment:
            pending_previously = previously_fragment
            continue

        chapter_match = re.match(r"Chapter\s+(\d+)", line, re.IGNORECASE)
        if chapter_match and chapter_number is None:
            chapter_number = int(chapter_match.group(1))
            continue

        if line.startswith("PUZZLE"):
            # puzzle unlock marker, ignore
            continue

        if line.startswith("Bridge Text:"):
            current_bridge = line.split("Bridge Text:", 1)[1].strip().strip('"')
            continue

        if line.startswith("Subchapter"):
            if current_sub:
                subchapters.append(current_sub)
            sub_header = line
            sub_match = re.match(r"Subchapter\s+(\d+)\.(\d+)", sub_header, re.IGNORECASE)
            if not sub_match:
                raise ValueError(f"Unable to parse subchapter header '{sub_header}' in {path}")
            chap = int(sub_match.group(1))
            index = int(sub_match.group(2))
            title_part = sub_header.split(" - ", 1)[1] if " - " in sub_header else sub_header
            current_sub = Subchapter(
                chapter=chap,
                index=index,
                path_key=path_key,
                title=title_part.strip(),
                bridge_text=current_bridge,
            )
            current_bridge = None
            if pending_previously:
                current_sub.previously = pending_previously
                pending_previously = None
            continue

        if line == "[DECISION POINT]":
            if current_sub:
                subchapters.append(current_sub)
                current_sub = None
            decision_section = {"intro": [], "options": []}
            decision_intro = decision_section["intro"]
            current_option = None
            continue

        if line.startswith("OPTION") and decision_section is not None:
            if current_option:
                decision_section["options"].append(current_option)
            option_match = re.match(r"OPTION\s+([A-Z0-9]+)\s*:\s*(.*)", line)
            if not option_match:
                raise ValueError(f"Malformed option line '{line}' in {path}")
            key = option_match.group(1).strip()
            title = option_match.group(2).strip().strip('"')
            current_option = DecisionOption(key=key, title=title)
            continue

        if decision_section is not None:
            if line.startswith("END CHAPTER") or line.startswith("[PATH"):
                continue
            if current_option is None:
                decision_intro.append(line)
            else:
                if line.startswith("Consequence:"):
                    current_option.consequence = line.split("Consequence:", 1)[1].strip()
                elif line.startswith("Focus:"):
                    current_option.focus = line.split("Focus:", 1)[1].strip()
                elif line.startswith("Stats:"):
                    current_option.stats = line.split("Stats:", 1)[1].strip()
                elif line.startswith("Outcome:"):
                    current_option.outcome = line.split("Outcome:", 1)[1].strip()
                    chapter, target_path = extract_target(line)
                    if chapter and target_path and current_option.next_chapter is None:
                        current_option.next_chapter = chapter
                        current_option.next_path_key = target_path
                else:
                    # attempt to extract chapter/path info from any line
                    chapter, target_path = extract_target(line)
                    if chapter and target_path and current_option.next_chapter is None:
                        current_option.next_chapter = chapter
                        current_option.next_path_key = target_path
                    else:
                        current_option.raw_lines.append(line)
            continue

        # Narrative lines
        if current_sub:
            current_sub.paragraphs.append(line)

    if current_option and decision_section:
        decision_section["options"].append(current_option)

    if current_sub:
        subchapters.append(current_sub)

    if decision_section and subchapters:
        subchapters[-1].decision = {
            "intro": decision_section.get("intro", []),
            "options": [option.to_dict() for option in decision_section.get("options", [])],
        }

    if chapter_number is None:
        raise ValueError(f"Failed to determine chapter number for {path}")

    # Sanity-check chapter numbers across subchapters
    for sub in subchapters:
        if sub.chapter != chapter_number:
            sub.chapter = chapter_number

    return subchapters


def build_story_dataset() -> Dict:
    case_content: Dict[str, Dict[str, Dict]] = {}

    doc_paths = sorted(
        p for p in DOCS_DIR.glob("*.docx") if "old-story" not in p.as_posix()
    )

    for doc_path in doc_paths:
        subchapters = parse_docx_file(doc_path)
        for sub in subchapters:
            entry = sub.to_entry()
            case_number = sub.case_number()
            case_bucket = case_content.setdefault(case_number, {})
            key = sub.path_key
            if key in case_bucket:
                raise ValueError(f"Duplicate entry for case {case_number} path {key} ({doc_path})")
            case_bucket[key] = entry

    return {"caseContent": case_content}


def main():
    dataset = build_story_dataset()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as fp:
        json.dump(dataset, fp, ensure_ascii=False, indent=2)
    print(f"Wrote story dataset to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size} bytes).")


if __name__ == "__main__":
    main()

