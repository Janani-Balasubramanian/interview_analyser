import random
from typing import Dict, Any, List
from ..core.config import settings


def mock_score_answer(transcript: str, question_text: str, domain: str, tier: str) -> Dict[str, Any]:
    """
    Mock AI scoring. Replace with real LLM call when OPENAI_API_KEY is set
    and USE_MOCK_AI = False.
    """
    # Simple heuristic based on length and keywords for demo
    word_count = len(transcript.split())
    
    # Base scores
    technical = min(95, 40 + word_count * 0.8 + random.uniform(-10, 15))
    communication = min(95, 50 + (20 if word_count > 40 else 5) + random.uniform(-8, 12))
    confidence = min(95, 55 + random.uniform(-15, 20))
    
    # Clamp
    technical = max(20, min(98, technical))
    communication = max(25, min(98, communication))
    confidence = max(20, min(98, confidence))
    
    total = round(technical * 0.4 + communication * 0.3 + confidence * 0.3, 1)
    
    feedback_points = []
    if technical < 60:
        feedback_points.append("Technical depth needs improvement. Try to include specific examples or concepts.")
    if communication < 60:
        feedback_points.append("Structure your answers more clearly (Situation → Action → Result).")
    if confidence < 60:
        feedback_points.append("Reduce filler words and speak with more conviction.")
    if total >= 80:
        feedback_points.append("Strong overall performance! Keep refining edge cases.")
    
    return {
        "total": total,
        "technical": round(technical, 1),
        "communication": round(communication, 1),
        "confidence": round(confidence, 1),
        "feedback": " ".join(feedback_points) if feedback_points else "Solid answer. Continue practicing.",
        "breakdown": {
            "technical_correctness": round(technical, 1),
            "communication_clarity": round(communication, 1),
            "confidence_delivery": round(confidence, 1)
        }
    }


async def score_answer_with_llm(transcript: str, question_text: str, domain: str, tier: str) -> Dict[str, Any]:
    """
    Real LLM scoring using OpenAI (or compatible).
    """
    if settings.USE_MOCK_AI or not settings.OPENAI_API_KEY:
        return mock_score_answer(transcript, question_text, domain, tier)
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        prompt = f"""
You are an expert technical interviewer evaluating a candidate's answer.

Domain: {domain}
Experience Tier: {tier}
Question: {question_text}

Candidate Answer:
{transcript}

Evaluate on three dimensions (0-100 each):
1. Technical / Domain Correctness (40% weight)
2. Communication & Structure (30% weight)
3. Confidence & Delivery (inferred from language) (30% weight)

Return a JSON object with:
{{
  "technical": <score>,
  "communication": <score>,
  "confidence": <score>,
  "total": <weighted average>,
  "feedback": "<2-3 sentences of constructive feedback>",
  "breakdown": {{
    "technical_correctness": <score>,
    "communication_clarity": <score>,
    "confidence_delivery": <score>
  }}
}}
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        import json
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"LLM scoring failed: {e}")
        return mock_score_answer(transcript, question_text, domain, tier)


def generate_interview_summary(scores: List[Dict]) -> Dict[str, Any]:
    if not scores:
        return {
            "total_score": 0,
            "confidence_score": 0,
            "communication_score": 0,
            "technical_score": 0,
            "feedback_summary": "No answers submitted.",
            "detailed_feedback": {}
        }
    
    avg_tech = sum(s.get("technical", 0) for s in scores) / len(scores)
    avg_comm = sum(s.get("communication", 0) for s in scores) / len(scores)
    avg_conf = sum(s.get("confidence", 0) for s in scores) / len(scores)
    total = round(avg_tech * 0.4 + avg_comm * 0.3 + avg_conf * 0.3, 1)
    
    summary = f"Overall score: {total}/100. "
    if total >= 80:
        summary += "Excellent performance. You demonstrated strong domain knowledge and clear communication."
    elif total >= 65:
        summary += "Good performance with room for improvement in depth and structure."
    else:
        summary += "Focus on strengthening fundamentals and practicing structured answers."
    
    return {
        "total_score": total,
        "confidence_score": round(avg_conf, 1),
        "communication_score": round(avg_comm, 1),
        "technical_score": round(avg_tech, 1),
        "feedback_summary": summary,
        "detailed_feedback": {
            "per_question": scores,
            "recommendations": [
                "Practice STAR method for behavioral questions",
                "Deepen technical explanations with real examples",
                "Work on reducing filler words"
            ]
        }
    }
