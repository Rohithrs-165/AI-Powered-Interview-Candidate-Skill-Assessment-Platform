import os
import sys

# Ensure ml_engine is on Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml_engine")))

try:
    from predictor import evaluator_instance
except Exception as e:
    print(f"[ADAPTIVE] Notice on ML predictor: {e}")
    evaluator_instance = None

def evaluate_answer_and_adapt(
    question_text: str,
    candidate_answer: str,
    reference_concept: str = "",
    skill_area: str = "General",
    current_difficulty: str = "medium"
):
    """
    Evaluates candidate answer using trained Machine Learning models
    and calculates adaptive progression.
    """
    # 1. ML Scoring
    if evaluator_instance:
        scores = evaluator_instance.predict_evaluation(
            question_text=question_text,
            candidate_answer=candidate_answer,
            reference_concept=reference_concept,
            skill_area=skill_area,
            difficulty=current_difficulty
        )
    else:
        # Fallback scoring
        word_count = len(candidate_answer.strip().split())
        base = min(92, max(25, word_count * 2.8))
        scores = {
            "accuracy_score": round(base, 1),
            "technical_score": round(base * 0.96, 1),
            "relevance_score": round(base * 0.98, 1),
            "communication_score": round(min(100, base * 1.04), 1),
            "overall_score": round(base, 1),
            "performance_tier": "Advanced" if base >= 80 else "Intermediate" if base >= 55 else "Novice",
            "engine": "heuristic_fallback"
        }

    overall = scores["overall_score"]
    
    # 2. Adaptive Difficulty Transition Matrix
    diff_order = ["easy", "medium", "hard"]
    curr_idx = diff_order.index(current_difficulty.lower()) if current_difficulty.lower() in diff_order else 1

    if overall >= 80.0:
        decision_type = "increase"
        next_idx = min(len(diff_order) - 1, curr_idx + 1)
        reason = f"Candidate demonstrated high technical mastery ({overall:.1f}%). Escalating challenge to test advanced concepts."
    elif overall >= 55.0:
        decision_type = "maintain"
        next_idx = curr_idx
        reason = f"Candidate demonstrated solid competency ({overall:.1f}%). Maintaining {current_difficulty} difficulty for verification."
    else:
        decision_type = "decrease"
        next_idx = max(0, curr_idx - 1)
        reason = f"Candidate encountered difficulty with previous question ({overall:.1f}%). Adjusting to foundational concepts."

    next_difficulty = diff_order[next_idx]

    return {
        "scores": scores,
        "previous_difficulty": current_difficulty,
        "next_difficulty": next_difficulty,
        "decision_type": decision_type,
        "decision_reason": reason
    }
