import base64
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def _encode_image_to_base64(image_path: Path) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def _get_fallback_narration(alert_type: str, zone_id: Optional[str], tracked_id: int) -> str:
    zone_label = f"near '{zone_id.replace('_', ' ').title()}'" if zone_id else "in monitored area"
    if alert_type == "after_hours":
        return f"A person (ID {tracked_id}) was detected {zone_label} during restricted after-hours."
    elif alert_type == "loitering":
        return f"A person (ID {tracked_id}) has been loitering {zone_label} beyond the permitted threshold."
    elif alert_type == "fall":
        return f"Sudden fall or distress movement detected for person (ID {tracked_id})."
    return f"Security alert ({alert_type}) triggered for person (ID {tracked_id}) {zone_label}."


def narrate_alert(
    alert_type: str,
    zone_id: Optional[str],
    tracked_id: int,
    snapshot_path: Optional[Path] = None,
    timestamp: Optional[str] = None,
) -> str:
    """
    Generates a concise, plain-English narration for a confirmed alert using GPT-4o Vision,
    with robust deterministic fallback if API key is not configured.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return _get_fallback_narration(alert_type, zone_id, tracked_id)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=10.0)

        zone_desc = zone_id or "unspecified zone"
        prompt_text = (
            f"Alert Type: {alert_type}\n"
            f"Zone: {zone_desc}\n"
            f"Tracked Person ID: {tracked_id}\n"
            f"Timestamp: {timestamp or 'Just now'}\n\n"
            "Provide exactly ONE clear, professional sentence summarizing this security event for campus safety personnel."
        )

        content = [{"type": "text", "text": prompt_text}]

        if snapshot_path and Path(snapshot_path).exists():
            base64_image = _encode_image_to_base64(Path(snapshot_path))
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "low",
                    },
                }
            )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are the narration engine for an AI Campus Safety Intelligence System. Output exactly one concise, factual, plain-language sentence describing the incident.",
                },
                {"role": "user", "content": content},
            ],
            max_tokens=80,
            temperature=0.3,
        )
        narration = response.choices[0].message.content.strip()
        return narration if narration else _get_fallback_narration(alert_type, zone_id, tracked_id)
    except Exception as e:
        print(f"[LLM Narration] Falling back to default narration due to: {e}")
        return _get_fallback_narration(alert_type, zone_id, tracked_id)
