import json
from datetime import datetime, timezone, timedelta

class AssessmentEngine:
    # 55-minute assessment specifications
    SECTION_CONFIGS = {
        "aptitude": {"question_count": 10, "duration_minutes": 15},
        "verbal": {"question_count": 5, "duration_minutes": 5},
        "role_mcqs": {"question_count": 5, "duration_minutes": 5},
        "coding": {"question_count": 1, "duration_minutes": 30}
    }

    # Curated Question Bank for the 4 Sections
    DEFAULT_QUESTIONS = {
        "aptitude": [
            {"id": 1, "q": "A train passes a station platform in 36 seconds and a man standing on the platform in 20 seconds. If the speed of the train is 54 km/hr, what is the length of the platform?", "options": ["120 m", "240 m", "300 m", "360 m"], "correct": 1},
            {"id": 2, "q": "If 12 men or 18 women can reap a field in 14 days, in how many days can 8 men and 16 women reap the same field?", "options": ["8 days", "9 days", "10 days", "12 days"], "correct": 1},
            {"id": 3, "q": "The average weight of 8 persons increases by 2.5 kg when a new person comes in place of one of them weighing 65 kg. What is the weight of the new person?", "options": ["76 kg", "80 kg", "85 kg", "90 kg"], "correct": 2},
            {"id": 4, "q": "A sum of money invested at compound interest doubles itself in 4 years. In how many years will it amount to 8 times itself?", "options": ["8 years", "12 years", "16 years", "20 years"], "correct": 1},
            {"id": 5, "q": "In a mixture of 60 liters, the ratio of milk and water is 2:1. If this ratio is to be 1:2, then what quantity of water should be further added?", "options": ["20 liters", "30 liters", "40 liters", "60 liters"], "correct": 3},
            {"id": 6, "q": "What is the probability of getting a sum 9 from two throws of a standard dice?", "options": ["1/6", "1/8", "1/9", "1/12"], "correct": 2},
            {"id": 7, "q": "A vendor bought bananas at 6 for Rs. 10 and sold them at 4 for Rs. 6. Find his gain or loss percent.", "options": ["10% gain", "10% loss", "20% gain", "20% loss"], "correct": 1},
            {"id": 8, "q": "Find the number which when added to itself 13 times gives 112.", "options": ["7", "8", "9", "11"], "correct": 1},
            {"id": 9, "q": "The difference between simple and compound interests on Rs. 1200 for one year at 10% per annum compounded half-yearly is:", "options": ["Rs. 2.50", "Rs. 3.00", "Rs. 3.75", "Rs. 4.00"], "correct": 1},
            {"id": 10, "q": "Pointing to a photograph of a boy, Suresh said, 'He is the son of the only son of my mother.' How is Suresh related to that boy?", "options": ["Brother", "Uncle", "Cousin", "Father"], "correct": 3}
        ],
        "verbal": [
            {"id": 1, "q": "Choose the word most synonymous with EPHEMERAL:", "options": ["Transient", "Permanent", "Eternal", "Resilient"], "correct": 0},
            {"id": 2, "q": "Identify the grammatically correct sentence:", "options": ["Neither of the options are viable.", "Neither of the options is viable.", "Neither of the options were viable.", "Neither of the options have been viable."], "correct": 1},
            {"id": 3, "q": "Choose the word that best completes the sentence: 'The CEO's speech was so ________ that everyone in the auditorium was convinced.'", "options": ["Ambiguous", "Lucid", "Tenuous", "Esoteric"], "correct": 1},
            {"id": 4, "q": "Select the antonym for METICULOUS:", "options": ["Careless", "Scrupulous", "Fastidious", "Painstaking"], "correct": 0},
            {"id": 5, "q": "Read the analogy: CANDLE : WAX :: PAPER : ?", "options": ["Wood", "Book", "Pen", "Pulp"], "correct": 3}
        ],
        "role_mcqs": [
            {"id": 1, "q": "In Python, which built-in function returns a shallow copy of a dictionary?", "options": ["dict.clone()", "dict.copy()", "copy.deepcopy(dict)", "dict.duplicate()"], "correct": 1},
            {"id": 2, "q": "In FastAPI, which HTTP status code is sent by default on a successful POST resource creation?", "options": ["200 OK", "201 Created", "202 Accepted", "204 No Content"], "correct": 0},
            {"id": 3, "q": "Which PostgreSQL index type is specifically optimized for indexing JSONB structures and array containment?", "options": ["B-Tree", "Hash Index", "GIN (Generalized Inverted Index)", "BRIN"], "correct": 2},
            {"id": 4, "q": "In Next.js 14 App Router, what is the default rendering paradigm for components inside the app directory?", "options": ["Client Components", "Server Components", "Static Site Generation only", "Single Page React Component"], "correct": 1},
            {"id": 5, "q": "Which concurrency model does FastAPI utilize under the hood with ASGI servers like Uvicorn?", "options": ["Multi-process preemptive threads only", "AsyncIO single-threaded cooperative event loop", "Worker thread pool per HTTP socket", "Shared-memory actor architecture"], "correct": 1}
        ],
        "coding": [
            {
                "id": 1,
                "title": "Design a High-Throughput Token Bucket Rate Limiter",
                "difficulty": "Hard",
                "time_limit": "30 minutes",
                "description": (
                    "Implement an in-memory, thread-safe TokenBucketRateLimiter class in Python. "
                    "The rate limiter must allow requests up to a capacity 'burst_size' and replenish tokens at 'refill_rate' per second. "
                    "Include an `allow_request(tokens=1)` method that returns True if enough tokens are available and consumes them, or False otherwise."
                ),
                "starter_code": (
                    "import time\n"
                    "import threading\n\n"
                    "class TokenBucketRateLimiter:\n"
                    "    def __init__(self, capacity: int, refill_rate: float):\n"
                    "        self.capacity = capacity\n"
                    "        self.refill_rate = refill_rate\n"
                    "        self.tokens = capacity\n"
                    "        self.last_refill = time.time()\n"
                    "        self.lock = threading.Lock()\n\n"
                    "    def allow_request(self, tokens: int = 1) -> bool:\n"
                    "        with self.lock:\n"
                    "            now = time.time()\n"
                    "            elapsed = now - self.last_refill\n"
                    "            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)\n"
                    "            self.last_refill = now\n"
                    "            if self.tokens >= tokens:\n"
                    "                self.tokens -= tokens\n"
                    "                return True\n"
                    "            return False\n"
                )
            }
        ]
    }

    def get_assessment_payload(self, job_title: str) -> dict:
        """Returns the full 55-minute assessment structured payload with 4 sections."""
        return {
            "total_duration_minutes": 55,
            "sections": [
                {
                    "section_key": "aptitude",
                    "title": "Quantitative Aptitude",
                    "question_count": 10,
                    "duration_minutes": 15,
                    "questions": self.DEFAULT_QUESTIONS["aptitude"]
                },
                {
                    "section_key": "verbal",
                    "title": "Verbal Reasoning",
                    "question_count": 5,
                    "duration_minutes": 5,
                    "questions": self.DEFAULT_QUESTIONS["verbal"]
                },
                {
                    "section_key": "role_mcqs",
                    "title": f"Technical Core: {job_title}",
                    "question_count": 5,
                    "duration_minutes": 5,
                    "questions": self.DEFAULT_QUESTIONS["role_mcqs"]
                },
                {
                    "section_key": "coding",
                    "title": "Practical Engineering Problem",
                    "question_count": 1,
                    "duration_minutes": 30,
                    "problem": self.DEFAULT_QUESTIONS["coding"][0]
                }
            ]
        }

    def evaluate_submission(self, answers_payload: dict) -> dict:
        """
        Evaluates candidate answers across all 4 sections.
        Returns section scores and total composite score.
        """
        aptitude_answers = answers_payload.get("aptitude", {})
        verbal_answers = answers_payload.get("verbal", {})
        mcq_answers = answers_payload.get("role_mcqs", {})
        coding_submission = answers_payload.get("coding", "")

        # Score Aptitude (10 Qs)
        apt_correct = 0
        for q in self.DEFAULT_QUESTIONS["aptitude"]:
            qid = str(q["id"])
            if qid in aptitude_answers and int(aptitude_answers[qid]) == q["correct"]:
                apt_correct += 1
        apt_score = round((apt_correct / 10.0) * 100.0, 1)

        # Score Verbal (5 Qs)
        vbl_correct = 0
        for q in self.DEFAULT_QUESTIONS["verbal"]:
            qid = str(q["id"])
            if qid in verbal_answers and int(verbal_answers[qid]) == q["correct"]:
                vbl_correct += 1
        vbl_score = round((vbl_correct / 5.0) * 100.0, 1)

        # Score MCQs (5 Qs)
        mcq_correct = 0
        for q in self.DEFAULT_QUESTIONS["role_mcqs"]:
            qid = str(q["id"])
            if qid in mcq_answers and int(mcq_answers[qid]) == q["correct"]:
                mcq_correct += 1
        mcq_score = round((mcq_correct / 5.0) * 100.0, 1)

        # Score Coding Problem (heuristic based on lock/threading/time tokens)
        coding_score = 50.0
        if coding_submission:
            code_lower = coding_submission.lower()
            if "threading.lock" in code_lower or "lock" in code_lower:
                coding_score += 20.0
            if "time.time" in code_lower or "elapsed" in code_lower:
                coding_score += 15.0
            if "tokens" in code_lower and "allow_request" in code_lower:
                coding_score += 15.0
        coding_score = min(100.0, coding_score)

        # Composite Assessment Score: Aptitude (20%), Verbal (15%), Role MCQs (25%), Coding (40%)
        total_composite = round(
            apt_score * 0.20 + vbl_score * 0.15 + mcq_score * 0.25 + coding_score * 0.40,
            1
        )

        return {
            "aptitude_score": apt_score,
            "verbal_score": vbl_score,
            "role_mcqs_score": mcq_score,
            "coding_score": coding_score,
            "total_score": total_composite
        }

assessment_engine = AssessmentEngine()
