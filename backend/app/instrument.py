"""The AI Pulse survey instrument — single source of truth.

The frontend fetches this from /api/meta so questions never drift
between client and server.
"""

DEPARTMENTS = [
    "Office of Academic Affairs",
    "Office of Academic",
    "Department of Computer Science and Engineering",
    "Department of Information Science and Engineering",
    "Department of Aerospace Engineering",
    "Department of Civil Engineering",
    "Department of Mechanical Engineering",
    "Department of Electrical and Electronics Engineering",
    "Department of Electronics and Communication Engineering",
    "Department of Food Technology",
    "Department of Humanities & Social Sciences",
    "Department of CERSSE",
    "Department of SSER",
    "Department of Jainology",
    "Department of Marine Science",
    "Department of Economics",
    "Department of Performing Arts and Cultural Studies",
    "Department of Languages",
    "Department of Journalism and Mass Communication",
    "Department of Law",
    "Department of Chemistry and Biochemistry",
    "Department of Biotechnology and Genetics",
    "Department of Microbiology and Botany",
    "Department of Data Analytics and Mathematical Science",
    "Department of Forensic Science",
    "Department of Physics and Electronics",
    "Department of Psychology and Allied Sciences",
    "Department of Allied Healthcare and Sciences",
    "Department of Computer Science and IT",
    "Department of Animation and Virtual Reality",
    "Department of Commerce",
    "Department of Management Studies",
    "Department of Design",
    "Department of Art and Design",
]

USAGE_ITEMS = [
    "I use generative AI (ChatGPT, Gemini, Copilot) for my academic work",
    "I use AI to generate ideas before starting to write anything",
    "I use AI to improve my grammar or language skills",
    "I use AI to summarize articles or study materials",
    "I use AI for non-academic work as well — email writing, travel, coding etc.",
]

DEPENDENCY_ITEMS = [
    "I depend on AI when I do not know how and where to begin a writing task",
    "I feel confident completing academic writing without using AI",
    "I generally accept AI-generated responses with little modification",
    "I generally accept AI-generated responses with no modification of any sort",
    "I have the habit of verifying AI-generated information before using it",
    "I critically evaluate AI responses before citing them in my work or arguments",
]

# Indices into DEPENDENCY_ITEMS
DEPENDENCY_IDX = [0, 2, 3]      # higher = more dependent
CRITICAL_IDX = [1, 4, 5]        # higher = more critical / autonomous

EXPERIENCE = {
    "duration": ["Less than 6 months", "6-12 months", "1-2 years", "More than 2 years"],
    "daily": [
        "Under 15 minutes",
        "15-30 minutes",
        "30-60 minutes",
        "1-2 hours",
        "2 hours or more",
    ],
    "tool": ["ChatGPT", "Gemini", "Copilot", "Claude", "Others"],
}

PERSONAS = {
    "power": {
        "key": "power",
        "name": "AI Power User",
        "icon": "rocketBig",
        "color": "#E85C1A",
        "tag": "High usage · High critical thinking",
        "desc": "You use AI heavily — but on your terms. You verify, edit and challenge what it gives you. This is exactly the AI-Ready profile industry is hunting for.",
    },
    "autopilot": {
        "key": "autopilot",
        "name": "AI Autopilot",
        "icon": "planeBig",
        "color": "#F5A623",
        "tag": "High usage · Low critical thinking",
        "desc": "AI is doing a lot of your flying. Great speed — but accepting outputs with little verification is a risk. Start questioning what it hands you and you level up fast.",
    },
    "critic": {
        "key": "critic",
        "name": "Cautious Critic",
        "icon": "searchBig",
        "color": "#2E5FD0",
        "tag": "Low usage · High critical thinking",
        "desc": "You think before you trust — a rare skill. Your critical instincts are strong; now increase hands-on AI practice and you'll convert judgment into fluency.",
    },
    "explorer": {
        "key": "explorer",
        "name": "AI Explorer",
        "icon": "sproutBig",
        "color": "#2F9E63",
        "tag": "Low usage · Building critical habits",
        "desc": "You're at the start of the map. Every quest starts here — build regular AI practice AND the habit of verifying outputs, and watch your XP climb.",
    },
}

# Ceiling of the XP bar: 17 answers × 10, level bonuses 30 + 40 + 50, the final
# reveal (20) and every achievement (5 + 15 + 25 + 10).
MAX_XP = 365
TOTAL_QUESTIONS = 17


def score(usage: list[int], dependency: list[int]) -> dict:
    """Compute sub-scale means and the persona quadrant."""
    usage_mean = sum(usage) / len(usage)
    dep_mean = sum(dependency[i] for i in DEPENDENCY_IDX) / len(DEPENDENCY_IDX)
    crit_mean = sum(dependency[i] for i in CRITICAL_IDX) / len(CRITICAL_IDX)

    if usage_mean >= 3:
        key = "power" if crit_mean >= 3 else "autopilot"
    else:
        key = "critic" if crit_mean >= 3 else "explorer"

    # 0-100 readiness: rewards usage + critical habits, penalises blind dependency
    readiness = round(
        max(0.0, min(100.0, (usage_mean * 8) + (crit_mean * 12) - (dep_mean * 4) + 20)),
        1,
    )

    return {
        "usage_score": round(usage_mean, 2),
        "dependency_score": round(dep_mean, 2),
        "critical_score": round(crit_mean, 2),
        "readiness": readiness,
        "persona": key,
    }


def meta() -> dict:
    return {
        "departments": DEPARTMENTS,
        "usage_items": USAGE_ITEMS,
        "dependency_items": DEPENDENCY_ITEMS,
        "experience": EXPERIENCE,
        "personas": PERSONAS,
        "max_xp": MAX_XP,
        "total_questions": TOTAL_QUESTIONS,
    }
