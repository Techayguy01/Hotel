import sys
import os
# Add project root to sys.path to allow 'apps.brain' imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import json
import logging
import asyncio
import base64
import nest_asyncio
from dotenv import load_dotenv
from deepgram import DeepgramClient
import edge_tts

from apps.brain.agent import Agent

# Apply nest_asyncio to allow nested event loops if needed (though we try to stick to one main loop)
nest_asyncio.apply()

# Configure logging to stderr
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='[BRAIN] %(message)s')

load_dotenv()
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

async def process_audio_flow(agent, audio_b64):
    """
    1. STT: Deepgram
    2. Logic: Agent
    3. TTS: EdgeTTS
    """
    try:
        # 1. STT via Deepgram
        if not DEEPGRAM_API_KEY:
             return {"type": "ERROR", "text": "Deepgram API Key missing"}

        # Initialize with explicit api_key kwarg or rely on env
        deepgram = DeepgramClient(api_key=DEEPGRAM_API_KEY)
        audio_data = base64.b64decode(audio_b64)
        
        source = {'buffer': audio_data, 'mimetype': 'audio/wav'} 
        options = {
            "model": "nova-2",
            "smart_format": True
        }
        
        logging.info("Sending audio to Deepgram...")
        # v5 Flattened: request=source, **options (model=..., smart_format=...)
        response = deepgram.listen.v1.media.transcribe_file(request=source, **options)
        transcript = response.results.channels[0].alternatives[0].transcript
        logging.info(f"Transcript: {transcript}")

        if not transcript.strip():
             return {"type": "ASSISTANT_TEXT", "text": "I didn't hear anything."}

        # 2. Agent Logic
        reply_text = agent.process_message(transcript)
        logging.info(f"Agent Reply: {reply_text}")

        # 3. TTS via EdgeTTS
        communicate = edge_tts.Communicate(reply_text, "en-US-AvaNeural")
        
        # We need to collect the audio bytes
        mp3_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_data += chunk["data"]
        
        mp3_b64 = base64.b64encode(mp3_data).decode('utf-8')

        return {
            "type": "TTS_AUDIO",
            "text": reply_text,
            "audio": mp3_b64
        }

    except Exception as e:
        logging.error(f"Voice Flow Error: {e}")
        return {"type": "ERROR", "text": f"Voice Error: {str(e)}"}

def main():
    logging.info("Brain process started (Voice Enabled).")
    
    try:
        agent = Agent()
        logging.info("Agent initialized.")
    except Exception as e:
        logging.error(f"Failed to initialize Agent: {e}")
        agent = None

    # We need an asyncio loop for async STT/TTS
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            try:
                data = json.loads(line)
                msg_type = data.get("type", "PROCESS_TEXT")
                
                if msg_type == "PROCESS_TEXT":
                    text = data.get("text", "")
                    logging.info(f"Processing Text: {text}")
                    if agent:
                        reply = agent.process_message(text)
                        response = {"type": "ASSISTANT_TEXT", "text": reply}
                    else:
                        response = {"type": "ERROR", "text": "Agent offline"}
                    print(json.dumps(response), flush=True)

                elif msg_type == "PROCESS_AUDIO":
                    audio_b64 = data.get("audio", "")
                    logging.info(f"Processing Audio ({len(audio_b64)} bytes)")
                    
                    if agent:
                        # Run async flow synchronously here
                        response = loop.run_until_complete(process_audio_flow(agent, audio_b64))
                    else:
                        response = {"type": "ERROR", "text": "Agent offline"}
                        
                    print(json.dumps(response), flush=True)

                else:
                    logging.warning(f"Unknown message type: {msg_type}")

            except json.JSONDecodeError:
                logging.error(f"Invalid JSON: {line}")
            except Exception as e:
                logging.error(f"Error processing line: {e}")
                
    except KeyboardInterrupt:
        logging.info("Brain stopping...")
    finally:
        loop.close()

if __name__ == "__main__":
    main()
