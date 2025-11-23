import json
import re
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NARRATIVE_PATH = ROOT / "src" / "data" / "storyNarrative.json"
OUTLIERS_JS_PATH = ROOT / "src" / "data" / "branchingOutliers.js"

# Reuse stopwords and logic
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

def extract_keywords(text, count=4):
    if not text:
        return []
    text = re.sub(r"[^a-zA-Z\s]", " ", text).lower()
    tokens = text.split()
    candidates = []
    seen = set()
    for token in tokens:
        if len(token) < 3: continue
        if token in STOPWORDS: continue
        if token in seen: continue
        candidates.append(token.upper())
        seen.add(token)
    candidates.sort(key=lambda x: len(x), reverse=True)
    return candidates[:count]

def main():
    with open(NARRATIVE_PATH, 'r', encoding='utf-8') as f:
        narrative = json.load(f)
    
    case_content = narrative.get('caseContent', {})
    branching_sets = {}
    
    for case_id, path_map in case_content.items():
        # We only care about decision points, which are usually 'C' chapters or where 'decision' exists
        # However, we might have multiple paths for the same case_id (e.g. 011C path APE vs 011C path MAF)
        # BRANCHING_OUTLIER_SETS is keyed by case_id.
        # If there are conflicting decision sets for different paths, we have a problem.
        # But usually the structure of the decision is similar or we merge them?
        
        # Let's assume the decision options are what matters.
        
        for path_key, entry in path_map.items():
            decision = entry.get('decision')
            if not decision:
                continue
                
            options = decision.get('options', [])
            if not options:
                continue
            
            # We found a decision. Create/Update entry for this case_id
            # Note: If multiple paths have decisions for the same case_id, 
            # we might be overwriting. ideally we'd check if they are the same.
            
            sets = []
            for opt in options:
                key = opt.get('key', 'A')
                title = opt.get('title', 'Option')
                consequence = opt.get('consequence', '')
                focus = opt.get('focus', '')
                
                text_source = f"{title} {consequence} {focus}"
                words = extract_keywords(text_source, 4)
                while len(words) < 4:
                    words.append("ACTION") # Fallback
                
                # Generate descriptions (mock)
                descriptions = {w: f"{w} relates to {title}." for w in words}
                
                sets.append({
                    "optionKey": key,
                    "label": title[:20],
                    "theme": {
                        "name": title.upper(),
                        "icon": "⚔️" if key == 'A' else "🛡️", # Simple heuristic
                        "summary": consequence or f"Choose {title}"
                    },
                    "words": words,
                    "descriptions": descriptions
                })
            
            branching_sets[case_id] = {
                "attempts": 6,
                "sets": sets
            }
            
    # Generate JS output
    js_content = "export const BRANCHING_OUTLIER_SETS = {\n"
    for case_id, data in sorted(branching_sets.items()):
        js_content += f"  '{case_id}': {json.dumps(data, indent=4)},\n"
    js_content += "};\n"
    
    with open(OUTLIERS_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"Updated branchingOutliers.js with {len(branching_sets)} entries.")

if __name__ == "__main__":
    main()
