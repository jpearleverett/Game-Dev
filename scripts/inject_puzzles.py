import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NARRATIVE_PATH = ROOT / "src" / "data" / "storyNarrative.json"
OUTLIERS_JS_PATH = ROOT / "src" / "data" / "branchingOutliers.js"

# Common stopwords to filter out
STOPWORDS = {
    "the", "and", "to", "of", "a", "in", "is", "it", "you", "that", "he", "was", "for", "on",
    "are", "with", "as", "i", "his", "they", "be", "at", "one", "have", "this", "from", "or",
    "had", "by", "word", "but", "what", "some", "we", "can", "out", "other", "were", "all",
    "there", "when", "up", "use", "your", "how", "said", "an", "each", "she", "which", "do",
    "their", "time", "if", "will", "way", "about", "many", "then", "them", "would", "write",
    "like", "so", "these", "her", "long", "make", "thing", "see", "him", "two", "has", "look",
    "more", "day", "could", "go", "come", "did", "my", "sound", "no", "most", "number", "who",
    "over", "know", "water", "than", "call", "first", "people", "may", "down", "side", "been",
    "now", "find", "any", "new", "work", "part", "take", "get", "place", "made", "live", "where",
    "after", "back", "little", "only", "round", "man", "year", "came", "show", "every", "good",
    "me", "give", "our", "under", "name", "very", "through", "just", "form", "sentence", "great",
    "think", "say", "help", "low", "line", "differ", "turn", "cause", "much", "mean", "before",
    "move", "right", "boy", "old", "too", "same", "tell", "does", "set", "three", "want", "air",
    "well", "also", "play", "small", "end", "put", "home", "read", "hand", "port", "large",
    "spell", "add", "even", "land", "here", "must", "big", "high", "such", "follow", "act",
    "why", "ask", "men", "change", "went", "light", "kind", "off", "need", "house", "picture",
    "try", "us", "again", "animal", "point", "mother", "world", "near", "build", "self", "earth",
    "father", "head", "stand", "own", "page", "should", "country", "found", "answer", "school",
    "grow", "study", "still", "learn", "plant", "cover", "food", "sun", "four", "between", "state",
    "keep", "eye", "never", "last", "let", "thought", "city", "tree", "cross", "farm", "hard",
    "start", "might", "story", "saw", "far", "sea", "draw", "left", "late", "run", "don't",
    "while", "press", "close", "night", "real", "life", "few", "north", "open", "seem", "together",
    "next", "white", "children", "begin", "got", "walk", "example", "ease", "paper", "group",
    "always", "music", "those", "both", "mark", "often", "letter", "until", "mile", "river",
    "car", "feet", "care", "second", "book", "carry", "took", "science", "eat", "room", "friend",
    "began", "idea", "fish", "mountain", "stop", "once", "base", "hear", "horse", "cut", "sure",
    "watch", "color", "face", "wood", "main", "enough", "plain", "girl", "usual", "young", "ready",
    "above", "ever", "red", "list", "though", "feel", "talk", "bird", "soon", "body", "dog",
    "family", "direct", "pose", "leave", "song", "measure", "door", "product", "black", "short",
    "numeral", "class", "wind", "question", "happen", "complete", "ship", "area", "half", "rock",
    "order", "fire", "south", "problem", "piece", "told", "knew", "pass", "since", "top", "whole",
    "king", "space", "heard", "best", "hour", "better", "true", "during", "hundred", "five",
    "remember", "step", "early", "hold", "west", "ground", "interest", "reach", "fast", "verb",
    "sing", "listen", "six", "table", "travel", "less", "morning", "ten", "simple", "several",
    "vowel", "toward", "war", "lay", "against", "pattern", "slow", "center", "love", "person",
    "money", "serve", "appear", "road", "map", "rain", "rule", "govern", "pull", "cold", "notice",
    "voice", "unit", "power", "town", "fine", "certain", "fly", "fall", "lead", "cry", "dark",
    "machine", "note", "wait", "plan", "figure", "star", "box", "noun", "field", "rest", "correct",
    "able", "pound", "done", "beauty", "drive", "stood", "contain", "front", "teach", "week",
    "final", "gave", "green", "oh", "quick", "develop", "ocean", "warm", "free", "minute", "strong",
    "special", "mind", "behind", "clear", "tail", "produce", "fact", "street", "inch", "multiply",
    "nothing", "course", "stay", "wheel", "full", "force", "blue", "object", "decide", "surface",
    "deep", "moon", "island", "foot", "system", "busy", "test", "record", "boat", "common", "gold",
    "possible", "plane", "stead", "dry", "wonder", "laugh", "thousand", "ago", "ran", "check",
    "game", "shape", "equate", "hot", "miss", "brought", "heat", "snow", "tire", "bring", "yes",
    "distant", "fill", "east", "paint", "language", "among", "grand", "ball", "yet", "wave",
    "drop", "heart", "am", "present", "heavy", "dance", "engine", "position", "arm", "wide",
    "sail", "material", "size", "vary", "settle", "speak", "weight", "general", "ice", "matter",
    "circle", "pair", "include", "divide", "syllable", "felt", "perhaps", "pick", "sudden",
    "count", "square", "reason", "length", "represent", "art", "subject", "region", "energy",
    "hunt", "probable", "bed", "brother", "egg", "ride", "cell", "believe", "fraction", "forest",
    "sit", "race", "window", "store", "summer", "train", "sleep", "prove", "lone", "leg",
    "exercise", "wall", "catch", "mount", "wish", "sky", "board", "joy", "winter", "sat", "written",
    "wild", "instrument", "kept", "glass", "grass", "cow", "job", "edge", "sign", "visit", "past",
    "soft", "fun", "bright", "gas", "weather", "month", "million", "bear", "finish", "happy",
    "hope", "flower", "clothe", "strange", "gone", "jump", "baby", "eight", "village", "meet",
    "root", "buy", "raise", "solve", "metal", "whether", "push", "seven", "paragraph", "third",
    "shall", "held", "hair", "describe", "cook", "floor", "either", "result", "burn", "hill",
    "safe", "cat", "century", "consider", "type", "law", "bit", "coast", "copy", "phrase",
    "silent", "tall", "sand", "soil", "roll", "temperature", "finger", "industry", "value",
    "fight", "lie", "beat", "excite", "natural", "view", "sense", "ear", "else", "quite",
    "broke", "case", "middle", "kill", "son", "lake", "moment", "scale", "loud", "spring",
    "observe", "child", "straight", "consonant", "nation", "dictionary", "milk", "speed",
    "method", "organ", "pay", "age", "section", "dress", "cloud", "surprise", "quiet", "stone",
    "tiny", "climb", "cool", "design", "poor", "lot", "experiment", "bottom", "key", "iron",
    "single", "stick", "flat", "twenty", "skin", "smile", "crease", "hole", "trade", "melody",
    "trip", "office", "receive", "row", "mouth", "exact", "symbol", "die", "least", "trouble",
    "shout", "except", "wrote", "seed", "tone", "join", "suggest", "clean", "break", "lady",
    "yard", "rise", "bad", "blow", "oil", "blood", "touch", "grew", "cent", "mix", "team",
    "wire", "cost", "lost", "brown", "wear", "garden", "equal", "sent", "choose", "fell", "fit",
    "flow", "fair", "bank", "collect", "save", "control", "decimal", "gentle", "woman", "captain",
    "practice", "separate", "difficult", "doctor", "please", "protect", "noon", "whose", "locate",
    "ring", "character", "insect", "caught", "period", "indicate", "radio", "spoke", "atom",
    "human", "history", "effect", "electric", "expect", "crop", "modern", "element", "hit",
    "student", "corner", "party", "supply", "bone", "rail", "imagine", "provide", "agree",
    "thus", "capital", "won't", "chair", "danger", "fruit", "rich", "thick", "soldier", "process",
    "operate", "guess", "necessary", "sharp", "wing", "create", "neighbor", "wash", "bat",
    "rather", "crowd", "corn", "compare", "poem", "string", "bell", "depend", "meat", "rub",
    "tube", "famous", "dollar", "stream", "fear", "sight", "thin", "triangle", "planet", "hurry",
    "chief", "colony", "clock", "mine", "tie", "enter", "major", "fresh", "search", "send",
    "yellow", "gun", "allow", "print", "dead", "spot", "desert", "suit", "current", "lift",
    "rose", "continue", "block", "chart", "hat", "sell", "success", "company", "subtract",
    "event", "particular", "deal", "swim", "term", "opposite", "wife", "shoe", "shoulder",
    "spread", "arrange", "camp", "invent", "cotton", "born", "determine", "quart", "nine",
    "truck", "noise", "level", "chance", "gather", "shop", "stretch", "throw", "shine",
    "property", "column", "molecule", "select", "wrong", "gray", "repeat", "require", "broad",
    "prepare", "salt", "nose", "plural", "anger", "claim", "continent", "oxygen", "sugar",
    "death", "pretty", "skill", "women", "season", "solution", "magnet", "silver", "thank",
    "branch", "match", "suffix", "especially", "fig", "afraid", "huge", "sister", "steel",
    "discuss", "forward", "similar", "guide", "experience", "score", "apple", "bought", "led",
    "pitch", "coat", "mass", "card", "band", "rope", "slip", "win", "dream", "evening",
    "condition", "feed", "tool", "total", "basic", "smell", "valley", "nor", "double", "seat",
    "arrive", "master", "track", "parent", "shore", "division", "sheet", "substance", "favor",
    "connect", "post", "spend", "chord", "fat", "glad", "original", "share", "station", "dad",
    "bread", "charge", "proper", "bar", "offer", "segment", "slave", "duck", "instant", "market",
    "degree", "populate", "chick", "dear", "enemy", "reply", "drink", "occur", "support",
    "speech", "nature", "range", "steam", "motion", "path", "liquid", "log", "meant", "quotient",
    "teeth", "shell", "neck", "bridge"
}

# Words that fit the Noir/Detective theme for fillers
FILLER_WORDS = [
    "FILE", "CASE", "LOCK", "CODE", "TIME", "FACT", "LIES", "TRUE", "DARK", "COLD",
    "RAIN", "CITY", "TOWN", "PORT", "DOCK", "SHIP", "PIER", "YARD", "ROOM", "DOOR",
    "WALL", "HALL", "ROOF", "FLOOR", "KEY", "SAFE", "NOTE", "LIST", "PLAN", "MAPS",
    "GRID", "DATA", "INFO", "TAPE", "FILM", "SHOT", "GLOW", "NEON", "LAMP", "BULB",
    "FUSE", "WIRE", "CORD", "LINE", "PATH", "ROAD", "SIGN", "POST", "MAIL", "SEAL",
    "STAMP", "COIN", "CASH", "BILL", "DEBT", "LOAN", "BOND", "DEAL", "SALE", "SOLD",
    "PAID", "COST", "RATE", "RANK", "ROLE", "TASK", "JOB", "DUTY", "WORK", "HIRE",
    "BOSS", "CHIEF", "HEAD", "LEAD", "CREW", "GANG", "TEAM", "SIDE", "ALLY", "FOE",
    "RIVAL", "HATE", "FEAR", "PAIN", "HURT", "HARM", "KILL", "DEAD", "GONE", "LOST",
    "PAST", "LATE", "SOON", "FAST", "SLOW", "WAIT", "HALT", "STOP", "EXIT", "BACK",
    "AWAY", "NEAR", "HERE", "SEEN", "SAID", "TOLD", "HELD", "KEPT", "TOOK", "GAVE",
    "MADE", "BUILT", "WORN", "TORN", "BROKE", "BENT", "BLUE", "GREY", "RED", "BLACK",
    "WHITE", "GOLD", "IRON", "STEEL", "LEAD", "ZINC", "DUST", "DIRT", "MUD", "SAND",
    "SMOKE", "HAZE", "FOG", "MIST", "RAIN", "SNOW", "WIND", "STORM", "HEAT", "COLD"
]

def extract_keywords(text, count=4):
    if not text:
        return []
    # Normalize text
    text = re.sub(r"[^a-zA-Z\s]", " ", text).lower()
    tokens = text.split()
    
    candidates = []
    seen = set()
    
    for token in tokens:
        if len(token) < 3: continue
        if token in STOPWORDS: continue
        if token in seen: continue
        
        # Heuristic: Prefer longer words, or nouns (hard to detect without NLTK)
        # Just basic length + uniqueness for now
        candidates.append(token.upper())
        seen.add(token)
    
    # Sort by length, descending (often more significant words)
    candidates.sort(key=lambda x: len(x), reverse=True)
    
    return candidates[:count]

def generate_grid(outliers, count=16):
    grid = list(outliers)
    while len(grid) < count:
        word = random.choice(FILLER_WORDS)
        if word not in grid:
            grid.append(word)
    
    random.shuffle(grid)
    return grid

def update_story_narrative():
    with open(NARRATIVE_PATH, 'r', encoding='utf-8') as f:
        narrative = json.load(f)
    
    case_content = narrative.get('caseContent', {})
    updated_count = 0
    
    for case_id, path_map in case_content.items():
        for path_key, entry in path_map.items():
            
            # Skip if board is already defined (unless we want to force update)
            # Assuming we want to inject if missing or incomplete
            
            bridge_text = entry.get('bridgeText') or ''
            narrative_text = entry.get('narrative') or ''
            source_text = bridge_text if bridge_text else narrative_text
            
            # Generate Outliers
            outliers = extract_keywords(source_text, count=4)
            
            if not outliers:
                outliers = ["CLUE", "LEAD", "PROOF", "TRUTH"] # Fallback
            elif len(outliers) < 4:
                 while len(outliers) < 4:
                     w = random.choice(FILLER_WORDS)
                     if w not in outliers:
                         outliers.append(w)
            
            grid = generate_grid(outliers)
            
            # Generate Theme
            theme_name = "INVESTIGATION"
            if bridge_text:
                # Extract first few words or capitalized concept
                words = bridge_text.split()
                if len(words) > 3:
                    theme_name = " ".join(words[:2]).upper()
                else:
                    theme_name = bridge_text.upper()
                theme_name = re.sub(r"[^A-Z\s]", "", theme_name).strip()
                if len(theme_name) > 15:
                    theme_name = theme_name[:15]
            
            # Create Board Config
            board_config = {
                "outlierWords": outliers,
                "grid": [grid[i:i+4] for i in range(0, 16, 4)], # 4x4 matrix
                "outlierTheme": {
                    "name": theme_name,
                    "icon": "🔎",
                    "summary": bridge_text[:100] + "..." if len(bridge_text) > 100 else bridge_text
                }
            }
            
            entry['board'] = board_config
            updated_count += 1
            
    with open(NARRATIVE_PATH, 'w', encoding='utf-8') as f:
        json.dump(narrative, f, indent=2, ensure_ascii=False)
    
    print(f"Updated {updated_count} entries in storyNarrative.json")

if __name__ == "__main__":
    update_story_narrative()
