"""
Machine Learning Real-time Inference Engine for FastAPI Backend
Loads ColumnTransformer preprocessor and models for fast multi-dimensional evaluation.
"""
import os
import joblib
import numpy as np
import pandas as pd

class MLInterviewEvaluator:
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        self.models_dir = models_dir
        self.preprocessor = None
        self.regressor = None
        self.classifier = None
        self.is_ready = False
        self._load_models()

    def _load_models(self):
        try:
            prep_path = os.path.join(self.models_dir, "preprocessor.joblib")
            reg_path = os.path.join(self.models_dir, "score_regressor.joblib")
            cls_path = os.path.join(self.models_dir, "tier_classifier.joblib")

            if os.path.exists(prep_path) and os.path.exists(reg_path) and os.path.exists(cls_path):
                self.preprocessor = joblib.load(prep_path)
                self.regressor = joblib.load(reg_path)
                self.classifier = joblib.load(cls_path)
                self.is_ready = True
            else:
                self.is_ready = False
        except Exception as e:
            print(f"[WARN] Error loading ML models: {e}")
            self.is_ready = False

    def predict_evaluation(self, question_text: str, candidate_answer: str, reference_concept: str = "", skill_area: str = "Python", difficulty: str = "medium"):
        if not self.is_ready:
            ans_len = len(candidate_answer.strip().split())
            base_score = min(92, max(25, ans_len * 3.0))
            tier = "Expert" if base_score >= 85 else "Advanced" if base_score >= 70 else "Intermediate" if base_score >= 50 else "Novice"
            return {
                "accuracy_score": round(base_score, 1),
                "technical_score": round(base_score * 0.96, 1),
                "relevance_score": round(base_score * 0.98, 1),
                "communication_score": round(min(100, base_score * 1.04), 1),
                "overall_score": round(base_score, 1),
                "performance_tier": tier,
                "engine": "heuristic_fallback"
            }

        combined_text = f"{question_text} {candidate_answer}"
        input_df = pd.DataFrame([{
            "combined_text": combined_text,
            "skill_area": skill_area,
            "difficulty": difficulty
        }])

        X_transformed = self.preprocessor.transform(input_df)
        predicted_scores = self.regressor.predict(X_transformed)[0]

        acc_score = float(np.clip(predicted_scores[0], 0, 100))
        tech_score = float(np.clip(predicted_scores[1], 0, 100))
        rel_score = float(np.clip(predicted_scores[2], 0, 100))
        comm_score = float(np.clip(predicted_scores[3], 0, 100))
        overall = float(np.clip(predicted_scores[4], 0, 100))

        # Consistent performance tiering
        if overall >= 88:
            tier = "Expert"
        elif overall >= 72:
            tier = "Advanced"
        elif overall >= 50:
            tier = "Intermediate"
        else:
            tier = "Novice"

        return {
            "accuracy_score": round(acc_score, 1),
            "technical_score": round(tech_score, 1),
            "relevance_score": round(rel_score, 1),
            "communication_score": round(comm_score, 1),
            "overall_score": round(overall, 1),
            "performance_tier": tier,
            "engine": "trained_random_forest_nlp"
        }

evaluator_instance = MLInterviewEvaluator()
