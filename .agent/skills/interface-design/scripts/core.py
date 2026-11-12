#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interface Design Core - BM25 search engine for UI/UX design guidance
"""

import csv
import json
import re
from pathlib import Path
from math import log
from collections import defaultdict
from functools import lru_cache

# ============ CONFIGURATION ============
DATA_DIR = Path(__file__).parent.parent / "data"
MAX_RESULTS = 3
MAX_RESULTS_LIMIT = 20
RTL_LEVELS = ("full", "partial", "caveats")
RTL_LEVEL_CHOICES = ("all",) + RTL_LEVELS
RTL_DOMAINS = frozenset({"style", "product"})

CSV_CONFIG = {
    "style": {
        "file": "styles.csv",
        "search_cols": ["Style ID", "Style Category", "Aliases", "Keywords", "Best For", "Type", "AI Prompt Keywords"],
        "output_cols": ["Style ID", "Style Category", "Aliases", "Status", "Parent Style ID", "Replacement Domain", "Replacement ID", "Preferred Mode", "Type", "Keywords", "Primary Colors", "Effects & Animation", "Best For", "Light Mode ✓", "Dark Mode ✓", "Performance", "Accessibility", "Framework Compatibility", "Complexity", "AI Prompt Keywords", "CSS/Technical Keywords", "Implementation Checklist", "Design System Variables", "rtl_level"]
    },
    "color": {
        "file": "colors.csv",
        "search_cols": ["Product Type", "Notes"],
        "output_cols": ["Product Type", "Primary", "On Primary", "Secondary", "On Secondary", "Accent", "On Accent", "Background", "Foreground", "Card", "Card Foreground", "Muted", "Muted Foreground", "Border", "Destructive", "On Destructive", "Ring", "Notes"]
    },
    "chart": {
        "file": "charts.csv",
        "search_cols": ["Data Type", "Keywords", "Best Chart Type", "When to Use", "When NOT to Use", "Accessibility Notes"],
        "output_cols": ["Data Type", "Keywords", "Best Chart Type", "Secondary Options", "When to Use", "When NOT to Use", "Data Volume Threshold", "Color Guidance", "Accessibility Grade", "Accessibility Risk", "Accessibility Notes", "A11y Fallback", "Library Recommendation", "Interactive Level"]
    },
    "landing": {
        "file": "landing.csv",
        "search_cols": ["Pattern ID", "Pattern Name", "Aliases", "Keywords", "Conversion Optimization", "Section Order"],
        "output_cols": ["Pattern ID", "Pattern Name", "Aliases", "Keywords", "Section Order", "Primary CTA Placement", "Color Strategy", "Conversion Optimization"]
    },
    "product": {
        "file": "products.csv",
        "search_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Key Considerations"],
        "output_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Secondary Styles", "Landing Page Pattern", "Dashboard Style (if applicable)", "Color Palette Focus", "rtl_level"]
    },
    "ux": {
        "file": "ux-guidelines.csv",
        "search_cols": ["Category", "Issue", "Description", "Platform"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "typography": {
        "file": "typography.csv",
        "search_cols": ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For", "Heading Font", "Body Font"],
        "output_cols": ["Font Pairing Name", "Category", "Heading Font", "Body Font", "Mood/Style Keywords", "Best For", "Google Fonts URL", "CSS Import", "Tailwind Config", "Notes"]
    },
    "icons": {
        "file": "icons.csv",
        "search_cols": ["Category", "Icon Name", "Keywords", "Best For", "Library"],
        "output_cols": ["Category", "Icon Name", "Keywords", "Library", "Import Code", "Usage", "Best For", "Style", "Semantic Role", "Allowed Contexts"]
    },
    "gsap": {
        "file": "motion.csv",
        "search_cols": ["Category", "Intensity Tier", "Keywords", "Trigger"],
        "output_cols": ["Category", "Intensity Tier", "Trigger", "Duration", "Easing", "GSAP Snippet", "Framework Notes", "Do", "Don't", "Performance Notes"]
    },
    "react": {
        "file": "react-performance.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "web": {
        "file": "web-interface.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "app": {
        "file": "app-interface.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "google-fonts": {
        "file": "google-fonts.csv",
        "search_cols": ["Family", "Category", "Stroke", "Classifications", "Keywords", "Subsets", "Designers"],
        "output_cols": ["Family", "Category", "Stroke", "Classifications", "Styles", "Variable Axes", "Subsets", "Designers", "Popularity Rank", "Google Fonts URL"]
    }
}

STACK_CONFIG = {
    "react":            {"file": "stacks/react.csv"},
    "nextjs":           {"file": "stacks/nextjs.csv"},
    "vue":              {"file": "stacks/vue.csv"},
    "svelte":           {"file": "stacks/svelte.csv"},
    "astro":            {"file": "stacks/astro.csv"},
    "swiftui":          {"file": "stacks/swiftui.csv"},
    "react-native":     {"file": "stacks/react-native.csv"},
    "flutter":          {"file": "stacks/flutter.csv"},
    "nuxtjs":           {"file": "stacks/nuxtjs.csv"},
    "nuxt-ui":          {"file": "stacks/nuxt-ui.csv"},
    "html-tailwind":    {"file": "stacks/html-tailwind.csv"},
    "shadcn":           {"file": "stacks/shadcn.csv"},
    "jetpack-compose":  {"file": "stacks/jetpack-compose.csv"},
    "threejs":          {"file": "stacks/threejs.csv"},
    "angular":          {"file": "stacks/angular.csv"},
    "laravel":          {"file": "stacks/laravel.csv"},
    "javafx":           {"file": "stacks/javafx.csv"},
    "wpf":              {"file": "stacks/wpf.csv"},
    "winui":            {"file": "stacks/winui.csv"},
    "avalonia":         {"file": "stacks/avalonia.csv"},
    "uno":              {"file": "stacks/uno.csv"},
    "uwp":              {"file": "stacks/uwp.csv"},
}

# Common columns for all stacks
_STACK_COLS = {
    "search_cols": ["Category", "Guideline", "Description", "Do", "Don't", "Code Good", "Code Bad"],
    "output_cols": ["Category", "Guideline", "Description", "Do", "Don't", "Code Good", "Code Bad", "Severity", "Docs URL", "Applies To", "Status", "Verified At"]
}

AVAILABLE_STACKS = list(STACK_CONFIG.keys())
_STACK_CURRENT_VERSIONS = {
    "react": (19,), "nextjs": (16,), "vue": (3,), "svelte": (5,),
    "astro": (7,), "angular": (22,), "html-tailwind": (4,), "nuxtjs": (4,),
    "nuxt-ui": (4,), "react-native": (0, 86), "flutter": (3, 44),
    "swiftui": (16,), "jetpack-compose": (1, 11), "avalonia": (12,),
    "winui": (3,), "javafx": (26,), "threejs": (0, 185), "laravel": (13,),
}
_STACK_QUERY_NAMES = {
    "nextjs": r"next(?:\.js|js)?", "nuxtjs": r"nuxt(?:\.js|js)?",
    "html-tailwind": r"tailwind(?:\s*css)?", "nuxt-ui": r"nuxt\s*ui",
    "react-native": r"react[\s-]*native", "swiftui": r"(?:ios|swiftui\s+ios)",
    "jetpack-compose": r"(?:jetpack\s*)?compose", "threejs": r"three(?:\.js|js)?",
}

_QUERY_STOPWORDS = {
    "a", "an", "and", "for", "in", "of", "on", "or", "the", "to",
    "at", "is", "by", "if", "no", "so", "do", "be", "we", "it", "as", "are", "was"
}
_DOMAIN_SCORE_FLOORS = {"style": 4.3, "landing": 4.0, "product": 6.0, "icons": 5.8, "react": 3.3}
_SYNONYMS = {
    "q&a": "question answer", "e-commerce": "ecommerce", "dark-mode": "dark",
    "darkmode": "dark", "light-mode": "light", "lightmode": "light",
    "a11y": "accessibility", "nav": "navigation", "sign-up": "signup",
    "log-in": "login", "colour": "color", "colours": "colors",
    "customisation": "customization", "organisation": "organization",
    "behaviour": "behavior", "ux/ui": "ux ui",
}
_SYNONYM_PATTERNS = [
    (re.compile(r"(?<!\w)" + re.escape(variant) + r"(?!\w)", re.IGNORECASE), canonical)
    for variant, canonical in sorted(_SYNONYMS.items(), key=lambda item: len(item[0]), reverse=True)
]


def _normalize(text):
    for pattern, canonical in _SYNONYM_PATTERNS:
        text = pattern.sub(canonical, str(text))
    return text


# ============ BM25 IMPLEMENTATION ============
class BM25:
    """BM25 ranking algorithm for text search"""

    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus = []
        self.doc_lengths = []
        self.avgdl = 0
        self.idf = {}
        self.doc_freqs = defaultdict(int)
        self.N = 0

    def tokenize(self, text):
        """Lowercase, split, remove punctuation, filter short words"""
        text = re.sub(r'[^\w\s]', ' ', _normalize(str(text).lower()))
        return [w for w in text.split() if len(w) >= 2 and w not in _QUERY_STOPWORDS]

    def fit(self, documents):
        """Build BM25 index from documents"""
        self.corpus = [self.tokenize(doc) for doc in documents]
        self.N = len(self.corpus)
        if self.N == 0:
            return
        self.doc_lengths = [len(doc) for doc in self.corpus]
        self.avgdl = sum(self.doc_lengths) / self.N or 1.0

        for doc in self.corpus:
            seen = set()
            for word in doc:
                if word not in seen:
                    self.doc_freqs[word] += 1
                    seen.add(word)

        for word, freq in self.doc_freqs.items():
            self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query):
        """Score all documents against query"""
        query_tokens = [
            token for token in self.tokenize(query) if token not in _QUERY_STOPWORDS
        ]
        has_multiple_terms = len(query_tokens) > 1
        scores = []

        for idx, doc in enumerate(self.corpus):
            score = 0
            doc_len = self.doc_lengths[idx]
            term_freqs = defaultdict(int)
            for word in doc:
                term_freqs[word] += 1

            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs[token]
                    idf = self.idf[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    # Two-character acronyms are meaningful alone (AI, UI, AR),
                    # but should not overpower longer intent terms in a phrase.
                    weight = 0.25 if has_multiple_terms and len(token) == 2 else 1.0
                    score += weight * idf * numerator / denominator

            scores.append((idx, score))

        return sorted(scores, key=lambda x: x[1], reverse=True)


# ============ SEARCH FUNCTIONS ============
def _load_csv(filepath):
    """Load CSV rows and fail when any row does not match the header width."""
    with open(filepath, 'r', encoding='utf-8-sig', newline='') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return []

        rows = []
        expected_width = len(header)
        for line_number, row in enumerate(reader, start=2):
            if len(row) != expected_width:
                raise ValueError(
                    f"Malformed CSV {filepath}: line {line_number} has "
                    f"{len(row)} columns, expected {expected_width}"
                )
            rows.append(dict(zip(header, row)))

        return rows


_SEARCH_CACHE_ENABLED = True


def _source_signature(filepath):
    stat = filepath.stat()
    return (stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size, stat.st_ino)


@lru_cache(maxsize=16)
def _cached_index(filepath, signature, search_cols, row_status=None):
    data = _load_csv(filepath)
    if row_status is not None:
        data = [row for row in data if row.get("Status", "active") == row_status]
    documents = [" ".join(str(row.get(col, "")) for col in search_cols) for row in data]
    bm25 = BM25()
    bm25.fit(documents)
    return data, bm25


def _index_for(filepath, search_cols, row_status=None):
    loader = _cached_index if _SEARCH_CACHE_ENABLED else _cached_index.__wrapped__
    return loader(filepath.resolve(), _source_signature(filepath), tuple(search_cols), row_status)


def _search_csv(filepath, search_cols, output_cols, query, max_results, row_status=None,
                rtl_level=None, min_score=0.0, min_coverage=0.0, identity_col=None):
    """Core search function using BM25"""
    if not filepath.exists():
        return []

    data, bm25 = _index_for(filepath, search_cols, row_status)
    ranked = bm25.score(query)
    if rtl_level is not None:
        # Metadata eligibility must preserve corpus scores and precede the result limit.
        ranked = [(idx, score) for idx, score in ranked if _rtl_eligible(data[idx], rtl_level)]
    tokens = set(bm25.tokenize(query))
    if identity_col is not None:
        identities = [set(bm25.tokenize(row.get(identity_col, ""))) for row in data]
        identity_freqs = defaultdict(int)
        for identity in identities:
            for token in identity:
                identity_freqs[token] += 1
        identity_hits = {idx: sum(log((len(data) + 1) / (identity_freqs[token] + 1))
                                  for token in tokens & identities[idx]) for idx, _ in ranked}
        ranked.sort(key=lambda item: (identity_hits[item[0]], item[1]), reverse=True)
    named_guidelines = set()
    if len(tokens) >= 3 and "Guideline" in output_cols:
        for idx, _ in ranked:
            identity = set(bm25.tokenize(data[idx].get("Guideline", ""))) - {
                "use", "prefer", "avoid", "implement", "follow", "keep"
            }
            if len(identity) >= 3 and identity <= tokens:
                named_guidelines.add(idx)
    if named_guidelines:
        ranked.sort(key=lambda item: (item[0] in named_guidelines, item[1]), reverse=True)
    coverage = sum(token in bm25.idf for token in tokens) / len(tokens) if tokens else 0.0
    # Preserve the local one-term acronym and topic lookup contract.
    if len(tokens) == 1 or named_guidelines:
        min_score = 0.0
    if not ranked or ranked[0][1] <= min_score or coverage < min_coverage:
        return []

    # Get top results with score > 0
    results = []
    for idx, score in ranked[:max_results]:
        if score > 0:
            row = data[idx]
            results.append({col: row.get(col, "") for col in output_cols if col in row})

    return results


def _validate_max_results(max_results):
    """Reject result counts that are invalid or unsafe for prompt output."""
    if (
        isinstance(max_results, bool)
        or not isinstance(max_results, int)
        or not 1 <= max_results <= MAX_RESULTS_LIMIT
    ):
        raise ValueError(
            f"max_results must be an integer between 1 and {MAX_RESULTS_LIMIT}"
        )
    return max_results


def detect_domain(query):
    """Auto-detect the most relevant domain from query"""
    query_lower = _normalize(query.lower())
    if re.search(r"(?<!\w)(?:gsap|scrolltrigger)(?!\w)", query_lower):
        return "gsap"

    domain_keywords = {
        "color": ["color", "palette", "hex", "#", "rgb", "token", "semantic", "accent", "destructive", "muted", "foreground"],
        "chart": ["time series", "chart", "graph", "visualization", "trend", "bar chart", "pie", "scatter", "heatmap", "funnel", "forecast"],
        "landing": ["landing", "page", "cta", "conversion", "hero", "testimonial", "pricing", "section"],
        "product": ["saas", "ecommerce", "e-commerce", "fintech", "healthcare", "gaming", "portfolio", "crypto", "dashboard", "fitness", "restaurant", "hotel", "travel", "music", "education", "learning", "legal", "insurance", "medical", "beauty", "pharmacy", "dental", "pet", "dating", "wedding", "recipe", "delivery", "ride", "booking", "calendar", "timer", "tracker", "diary", "note", "chat", "messenger", "crm", "invoice", "parking", "transit", "vpn", "alarm", "weather", "sleep", "meditation", "fasting", "habit", "grocery", "meme", "wardrobe", "plant care", "reading", "flashcard", "puzzle", "trivia", "arcade", "photography", "streaming", "podcast", "newsletter", "marketplace", "freelancer", "coworking", "airline", "museum", "theater", "church", "non-profit", "charity", "kindergarten", "daycare", "senior care", "veterinary", "florist", "bakery", "brewery", "construction", "automotive", "real estate", "logistics", "agriculture", "coding bootcamp"],
        "style": ["style", "design", "ui", "minimalism", "glassmorphism", "neumorphism", "brutalism", "dark mode", "flat", "aurora", "css", "implementation", "variable", "checklist", "tailwind"],
        "ux": ["ux", "usability", "accessibility", "wcag", "touch", "scroll", "animation", "keyboard", "navigation", "mobile"],
        "typography": ["font pairing", "typography pairing", "heading font", "body font"],
        "google-fonts": ["google font", "font family", "font weight", "font style", "variable font", "noto", "font for", "find font", "font subset", "font language", "monospace font", "serif font", "sans serif font", "display font", "handwriting font", "font", "typography", "serif", "sans"],
        "icons": ["icon", "icons", "lucide", "phosphor", "heroicons", "symbol", "glyph", "pictogram", "svg icon"],
        "react": ["react", "next.js", "nextjs", "suspense", "memo", "usecallback", "useeffect", "rerender", "bundle", "waterfall", "barrel", "dynamic import", "rsc", "server component"],
        "web": ["aria", "focus", "outline", "semantic", "virtualize", "autocomplete", "form", "input type", "preconnect", "keyboard", "button"],
        "app": ["mobile app", "react native", "ios", "android", "touch target", "hitSlop", "safe area", "pressable", "gesture", "bottom tab"]
    }

    priority = ("ux", "product", "style", "color", "typography", "google-fonts",
                "chart", "landing", "icons", "react", "app", "web")
    scores = {
        domain: sum(max(1, len(keyword.split())) * (1 if domain == "product" else 2)
                    for keyword in keywords
                    if re.search(r'(?<!\w)' + re.escape(keyword) + r'(?!\w)', query_lower))
        for domain, keywords in domain_keywords.items()
    }
    if re.search(r"(?<!\w)#[0-9a-f]{3,8}(?!\w)", query_lower, re.IGNORECASE):
        scores["color"] += 2
    best = max(priority, key=lambda domain: (scores[domain], -priority.index(domain)))
    return best if scores[best] > 0 else "style"


@lru_cache(maxsize=2)
def _provenance_manifest(filepath, signature):
    return json.loads(filepath.read_text(encoding="utf-8"))


def _guidance_metadata(filepath, results):
    skill_root = Path(__file__).resolve().parents[1]
    relative = "data/" + filepath.relative_to(DATA_DIR).as_posix()
    manifest_path = skill_root / "UPSTREAM.json"
    manifest = _provenance_manifest(manifest_path, _source_signature(manifest_path))
    mirrored = next((item for item in manifest["files"] if item["local_path"] == relative), None)
    applicability = []
    for row in results:
        guideline = row.get("Guideline", "")
        recorded = manifest.get("guidance_applicability", {}).get(relative, {}).get(guideline)
        applicability.append(dict(recorded) if recorded else {"guideline": guideline, "version": "unknown", "source": row.get("Docs URL", "unknown")})
    return {
        "provenance": {"path": relative, "source_signature": list(_source_signature(filepath)),
                       "upstream_revision": mirrored.get("upstream_commit", manifest["upstream"]["commit"]) if mirrored else "unknown",
                       "status": mirrored["status"] if mirrored else "local_reference"},
        "applicability": applicability,
    }


def _style_rows():
    config = CSV_CONFIG["style"]
    filepath = DATA_DIR / config["file"]
    if not filepath.exists():
        return []
    rows, _ = _index_for(filepath, config["search_cols"])
    return rows


def _style_identity(rows, query, allow_contained=True):
    """Resolve stable names and aliases, preferring a specific named variant."""
    folded = str(query or "").strip().casefold()
    query_tokens = set(re.findall(r"\w+", folded))
    generic_tokens = {"app", "design", "interface", "style", "system", "ui"}
    candidates = []
    for row in rows:
        identities = [row.get("Style ID", ""), row.get("Style Category", "")]
        identities.extend(row.get("Aliases", "").split("|"))
        for identity in (value.strip() for value in identities if value.strip()):
            if folded == identity.casefold():
                return row
            if allow_contained:
                tokens = set(re.findall(r"\w+", identity.casefold()))
                if tokens <= query_tokens and any(len(token) >= 4 for token in tokens):
                    candidates.append((len(tokens - generic_tokens), len(tokens), len(identity), row))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[:3], reverse=True)
    best = candidates[0][:3]
    matches = {item[3].get("Style ID", item[3].get("Style Category")): item[3]
               for item in candidates if item[:3] == best}
    return next(iter(matches.values())) if len(matches) == 1 else None


def _style_search_destination(rows, matched):
    if matched is None or matched.get("Status", "active") != "deprecated":
        return matched, None
    parent_id = matched.get("Parent Style ID", "").strip()
    domain = matched.get("Replacement Domain", "").strip()
    replacement_id = matched.get("Replacement ID", "").strip()
    target_id = parent_id or (replacement_id if domain == "style" else "")
    if target_id:
        return next((row for row in rows if row.get("Style ID") == target_id), None), None
    return None, {"domain": domain, "id": replacement_id} if domain and replacement_id else None


def resolve_style(reference):
    """Return a fresh canonical row for a stable style ID, name, or alias."""
    rows = _style_rows()
    row, _ = _style_search_destination(rows, _style_identity(rows, reference, allow_contained=False))
    return dict(row) if row is not None else {}


def _normalize_rtl_level(rtl, domain):
    if rtl is None:
        return None
    level = str(rtl).strip().casefold()
    if level not in RTL_LEVEL_CHOICES:
        raise ValueError(f"unsupported rtl level {rtl!r}; expected one of {', '.join(RTL_LEVEL_CHOICES)}")
    if domain not in RTL_DOMAINS:
        raise ValueError("--rtl is only supported with --domain style or --domain product")
    return level


def _rtl_eligible(row, level):
    return level is None or row.get("rtl_level") in (RTL_LEVELS if level == "all" else (level,))


def search(query, domain=None, max_results=MAX_RESULTS, rtl=None):
    """Search guidance; optional RTL filtering requires a style/product domain."""
    try:
        max_results = _validate_max_results(max_results)
        rtl_level = _normalize_rtl_level(rtl, domain)
    except ValueError as exc:
        return {"error": str(exc), "domain": domain}

    try:
        style_rows = _style_rows() if domain is None or domain == "style" else []
    except (ValueError, csv.Error, OSError, UnicodeDecodeError) as exc:
        if domain == "style" or (domain is None and detect_domain(query) == "style"):
            return {"error": str(exc), "domain": domain, "file": CSV_CONFIG["style"]["file"]}
        style_rows = []
    matched_style = _style_identity(style_rows, query, allow_contained=False)
    if domain is None:
        domain = "style" if matched_style is not None else detect_domain(query)

    config = CSV_CONFIG.get(domain, CSV_CONFIG["style"])
    filepath = DATA_DIR / config["file"]
    if not filepath.exists():
        return {"error": f"File not found: {filepath}", "domain": domain}

    try:
        exact_style, redirect = (None, None)
        if config is CSV_CONFIG["style"]:
            exact_style, redirect = _style_search_destination(style_rows, _style_identity(style_rows, query))
        if exact_style is not None and not _rtl_eligible(exact_style, rtl_level):
            exact_style = None
        if exact_style is not None:
            results = [{col: exact_style[col] for col in config["output_cols"] if col in exact_style}]
        elif redirect is not None:
            results = []
        else:
            results = _search_csv(filepath, config["search_cols"], config["output_cols"], query,
                                  max_results, row_status="active" if config is CSV_CONFIG["style"] else None,
                                  rtl_level=rtl_level,
                                  min_score=_DOMAIN_SCORE_FLOORS.get(domain, 0.0),
                                  min_coverage=0.5 if domain == "landing" else 0.0,
                                  identity_col="Product Type" if domain == "product" else None)
    except (ValueError, csv.Error, OSError, UnicodeDecodeError) as exc:
        return {"error": str(exc), "domain": domain, "file": config["file"]}

    if domain == "icons" and re.search(r"(?<!\w)lucide(?!\w)", query, re.IGNORECASE):
        results = []

    result = {
        "domain": domain,
        "query": query,
        "file": config["file"],
        "count": len(results),
        **_guidance_metadata(filepath, results),
        "results": results
    }
    if redirect is not None:
        result["redirect"] = redirect
    return result


def _stack_query_requests_legacy(query, stack):
    """Keep explicit older framework requests separate from current guidance."""
    normalized = _normalize(str(query or "").casefold())
    if stack == "uwp":
        return True
    current = _STACK_CURRENT_VERSIONS.get(stack)
    if current is not None:
        name = _STACK_QUERY_NAMES.get(stack, re.escape(stack))
        name_prefix = rf"\b(?:{name})\s*(?:sdk|ui)?\s*(?:[@(]\s*)?"
        version_number = r"(?:v(?:ersion)?\s*)?(\d+)(?:\.(\d+))?(?!\w)"
        named_version = re.compile(name_prefix + version_number + r"\s*\)?")
        matches = [(match, tuple(int(value) for value in match.groups() if value is not None))
                   for match in named_version.finditer(normalized)]
        release_version = re.compile(r"\br(\d+)\b") if stack == "threejs" else None
        if release_version:
            matches.extend((match, (0, int(match.group(1))))
                           for match in release_version.finditer(normalized))
        matches.sort(key=lambda item: item[0].start())
        requested = [version for _, version in matches]
        if requested:
            # A migration's source version must not select its destination guidance.
            if matches and ("->" in normalized or re.search(r"\b(?:migrat\w*|upgrad\w*|downgrad\w*)\b|^from\b", normalized)):
                destination = re.split(r"\bto\b|->", normalized[matches[0][0].end():], maxsplit=1)
                if len(destination) == 2:
                    target = re.sub(r"^\s*(?:the\s+)?", "", destination[1])
                    qualifier = re.match(r"(?:current|latest|modern)\b\s*", target)
                    version_target = target[qualifier.end():] if qualifier else target
                    version = named_version.match(version_target) or re.match(version_number, version_target)
                    if version:
                        target_version = tuple(int(value) for value in version.groups() if value is not None)
                        return target_version < current[:len(target_version)]
                    release = re.match(rf"(?:{name_prefix})?{release_version.pattern}", version_target) if release_version else None
                    if release:
                        return (0, int(release.group(1))) < current
                    if qualifier and re.match(rf"(?:{name}\b|version\b|release\b|$)", version_target):
                        return False
                    if re.match(name_prefix + r"\b(?:current|latest|modern)\b", target):
                        return False
            return all(version < current[:len(version)] for version in requested)
    if re.search(r"\b(?:migrat\w*|upgrad\w*|replac\w*|instead|modern|current)\b", normalized):
        return False
    return bool(re.search(r"\b(?:legacy|deprecated)\b", normalized))


def _legacy_project_guidance(rows, query, stack, status):
    """Separate a new framework choice from migration of an existing app."""
    if stack != "uwp":
        return None
    normalized = _normalize(str(query or "").casefold())
    if re.search(r"\bexisting\b", normalized) and re.search(r"\b(?:migrat\w*|upgrad\w*|port(?:s|ed|ing)?)\b", normalized):
        fields = ("Guideline",)
        pattern = r"\b(?:plan|prepare)\b.*\bmigrat\w*\b"
    elif re.search(r"\b(?:brand new|new)\s+(?:app|application|project)\b", normalized):
        fields = ("Guideline", "Description", "Do")
        pattern = r"\b(?:prefer|choose|use)\b.*\bnew (?:apps?|projects?)\b"
    else:
        return None
    matches = [row for row in rows if (status is None or row.get("Status", "active") == status)
               and re.search(pattern, " ".join(row.get(field, "") for field in fields).casefold())]
    return matches[0] if len(matches) == 1 else None


def search_stack(query, stack, max_results=MAX_RESULTS):
    """Search stack-specific guidelines"""
    if stack not in STACK_CONFIG:
        return {"error": f"Unknown stack: {stack}. Available: {', '.join(AVAILABLE_STACKS)}"}

    filepath = DATA_DIR / STACK_CONFIG[stack]["file"]

    try:
        max_results = _validate_max_results(max_results)
    except ValueError as exc:
        return {"error": str(exc), "stack": stack}

    if not filepath.exists():
        return {"error": f"Stack file not found: {filepath}", "stack": stack}

    try:
        rows, _ = _index_for(filepath, _STACK_COLS["search_cols"])
        statuses = {row.get("Status", "unverified") for row in rows}
        legacy = _stack_query_requests_legacy(query, stack)
        unavailable = legacy and "deprecated" not in statuses and stack in _STACK_CURRENT_VERSIONS
        status = "deprecated" if legacy and "deprecated" in statuses else "active" if "active" in statuses else None
        exact = None if unavailable else _legacy_project_guidance(rows, query, stack, status)
        if exact is not None:
            results = [{col: exact[col] for col in _STACK_COLS["output_cols"] if col in exact}]
        else:
            results = [] if unavailable else _search_csv(
                filepath, _STACK_COLS["search_cols"], _STACK_COLS["output_cols"], query,
                max_results, row_status=status if statuses != {status} else None,
                min_score=0.0 if legacy else 3.6, min_coverage=0.0 if legacy else 1 / 3)
    except (ValueError, csv.Error, OSError, UnicodeDecodeError) as exc:
        return {"error": str(exc), "stack": stack, "file": STACK_CONFIG[stack]["file"]}

    return {
        "domain": "stack",
        "stack": stack,
        "query": query,
        "file": STACK_CONFIG[stack]["file"],
        "count": len(results),
        **_guidance_metadata(filepath, results),
        "results": results
    }
