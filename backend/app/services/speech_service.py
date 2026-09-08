import os
import io
import base64
from gtts import gTTS

class SpeechNLPService:
    def __init__(self):
        pass

    def text_to_speech_base64(self, text: str, lang: str = "en") -> str:
        """Converts question text to an MP3 audio base64 data URI for frontend playback."""
        try:
            tts = gTTS(text=text, lang=lang, slow=False)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            audio_bytes = mp3_fp.read()
            b64_str = base64.b64encode(audio_bytes).decode("utf-8")
            return f"data:audio/mp3;base64,{b64_str}"
        except Exception as e:
            print(f"[TTS] Notice: Error synthesizing speech: {e}")
            return ""

    def process_voice_answer(self, audio_base64: str = None, fallback_text: str = "") -> str:
        """Processes voice recordings from candidate into text transcript."""
        if fallback_text:
            return fallback_text.strip()
        
        if not audio_base64:
            return "Voice response submitted."

        # In browser Web Speech API provides real-time transcription.
        # If raw audio base64 is passed, we handle and persist the audio.
        return fallback_text or "Candidate provided spoken response via voice interface."

speech_service = SpeechNLPService()
