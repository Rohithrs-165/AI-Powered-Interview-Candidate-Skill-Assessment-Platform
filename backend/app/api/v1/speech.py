from fastapi import APIRouter
from pydantic import BaseModel
from app.services.speech_service import speech_service

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    lang: str = "en"

@router.post("/synthesize")
def synthesize_speech(req: TTSRequest):
    audio_base64 = speech_service.text_to_speech_base64(req.text, lang=req.lang)
    return {
        "status": "success",
        "audio_url": audio_base64
    }
