from app.services.langchain_gemini import gemini_service

class InterviewGenerator:
    """
    Implements the Blueprint's 18-Question Sequence:
    - Questions 1 to 3: Assessment-derived (code rationale, concurrency, edge cases)
    - Questions 4 to 8: Job Description-derived (5 questions targeting role requirements)
    - Questions 9 to 18: Adaptive Skill Questions (10 questions scaling difficulty up/down)
    """

    ASSESSMENT_QUESTIONS = [
        {
            "order": 1,
            "source": "assessment_derived",
            "skill_area": "Code Walkthrough & Architecture",
            "question_text": "In your practical assessment coding problem on the Token Bucket Rate Limiter, explain how your design ensures thread-safety under high-concurrency requests.",
            "difficulty": "medium"
        },
        {
            "order": 2,
            "source": "assessment_derived",
            "skill_area": "Concurrency & Race Conditions",
            "question_text": "What performance trade-offs did you consider between using a coarse-grained threading lock versus lock-free atomic CAS operations or Redis Lua scripts in your rate limiter?",
            "difficulty": "hard"
        },
        {
            "order": 3,
            "source": "assessment_derived",
            "skill_area": "Resilience & Distributed Systems",
            "question_text": "If thousands of distributed instances needed to synchronize the same rate-limit bucket across multiple availability zones, how would you evolve your in-memory implementation?",
            "difficulty": "hard"
        }
    ]

    JD_QUESTIONS = [
        {
            "order": 4,
            "source": "jd_derived",
            "skill_area": "FastAPI & ASGI Architecture",
            "question_text": "Our engineering stack heavily relies on FastAPI and asynchronous I/O. Explain how the ASGI event loop differs from WSGI, and how long-running blocking CPU tasks should be handled without choking request throughput.",
            "difficulty": "medium"
        },
        {
            "order": 5,
            "source": "jd_derived",
            "skill_area": "PostgreSQL Optimization",
            "question_text": "When scaling relational data models, how would you design database indexing strategies for high-frequency queries? Contrast B-Tree, GIN, and BRIN indexes in PostgreSQL.",
            "difficulty": "medium"
        },
        {
            "order": 6,
            "source": "jd_derived",
            "skill_area": "System Design & Distributed State",
            "question_text": "Describe how you would architect a resilient, idempotency-guaranteed payment or assessment submission pipeline that tolerates network partitions and duplicate requests.",
            "difficulty": "hard"
        },
        {
            "order": 7,
            "source": "jd_derived",
            "skill_area": "Microservices & API Security",
            "question_text": "In a distributed microservice architecture, how do you handle secure authentication and authorization across internal service-to-service calls versus external client requests?",
            "difficulty": "medium"
        },
        {
            "order": 8,
            "source": "jd_derived",
            "skill_area": "Engineering Quality & Testing",
            "question_text": "Explain your approach to continuous integration, unit testing versus integration testing, and maintaining schema migration integrity in production databases.",
            "difficulty": "medium"
        }
    ]

    ADAPTIVE_SKILL_POOL = [
        "Python Internals & Memory Management",
        "FastAPI Async Middleware & Dependencies",
        "PostgreSQL Transaction Isolation & MVCC",
        "Distributed Caching & Cache Invalidation",
        "Message Queues & Event-Driven Architecture",
        "WebSockets & Real-Time Stateful Connections",
        "Large Language Model Prompt Orchestration",
        "Data Pipeline Engineering & Vector Indexing",
        "Observability, Distributed Tracing & Metrics",
        "High-Availability Database Replication & Failover"
    ]

    def get_question_for_order(self, order: int, current_difficulty: str = "medium", job_title: str = "Software Engineer") -> dict:
        """
        Determines the question based on the 18-question blueprint specification.
        """
        if 1 <= order <= 3:
            q = self.ASSESSMENT_QUESTIONS[order - 1]
            return {
                "question_order": order,
                "question_source": q["source"],
                "skill_area": q["skill_area"],
                "question_text": q["question_text"],
                "difficulty_level": q["difficulty"]
            }
        elif 4 <= order <= 8:
            q = self.JD_QUESTIONS[order - 4]
            return {
                "question_order": order,
                "question_source": q["source"],
                "skill_area": q["skill_area"],
                "question_text": q["question_text"],
                "difficulty_level": q["difficulty"]
            }
        else:
            # Questions 9 to 18: Adaptive Skill Questions
            adaptive_idx = (order - 9) % len(self.ADAPTIVE_SKILL_POOL)
            skill = self.ADAPTIVE_SKILL_POOL[adaptive_idx]

            # Generate via Gemini AI with specified difficulty
            q_data = gemini_service.generate_adaptive_question(
                skill_area=skill,
                difficulty=current_difficulty,
                question_order=order,
                previous_context=f"Question {order} of 18 in adaptive assessment sequence for {job_title}."
            )

            return {
                "question_order": order,
                "question_source": "adaptive_skill",
                "skill_area": skill,
                "question_text": q_data.get("question_text", f"Explain core optimization strategies for {skill} under heavy production traffic."),
                "difficulty_level": current_difficulty
            }

interview_generator = InterviewGenerator()
