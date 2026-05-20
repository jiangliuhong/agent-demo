from __future__ import annotations

import os

from dotenv import load_dotenv


def build_learning_prompt() -> str:
    load_dotenv()
    model_name = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    return (
        "LangChain agent learning project is ready.\n"
        f"Configured model: {model_name}\n"
        "Next step: replace this scaffold with a real chat model and tools."
    )
