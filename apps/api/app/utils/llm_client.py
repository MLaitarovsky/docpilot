"""OpenAI API wrapper with JSON mode, retries, and exponential backoff."""

import json
import logging
import time

from openai import APIError, OpenAI, RateLimitError

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-initialised so the worker only creates it once
_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def call_llm(
    system_prompt: str,
    user_prompt: str,
    *,
    json_mode: bool = True,
    model: str | None = None,
    max_retries: int = 3,
) -> dict:
    """Send a chat completion request and return parsed JSON.

    Args:
        system_prompt: The system instruction.
        user_prompt:   The user message (usually the document text).
        json_mode:     If True, requests structured JSON output.
        model:         Override the default model from config.
        max_retries:   Number of retry attempts on transient failures.

    Returns:
        Parsed JSON dict from the model's response.

    Raises:
        ValueError: If the response cannot be parsed as JSON after all retries.
        APIError:   If the OpenAI API returns a non-retryable error.
    """
    client = _get_client()
    chosen_model = model or settings.llm_model

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    extra_kwargs: dict = {}
    if json_mode:
        extra_kwargs["response_format"] = {"type": "json_object"}

    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=chosen_model,
                messages=messages,
                temperature=0.1,
                **extra_kwargs,
            )

            content = response.choices[0].message.content or ""

            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                last_error = ValueError(f"Invalid JSON from LLM: {e}")
                logger.warning(
                    "Attempt %d/%d — malformed JSON, retrying: %s",
                    attempt,
                    max_retries,
                    str(e),
                )

        except RateLimitError as e:
            last_error = e
            wait = 2**attempt
            logger.warning(
                "Attempt %d/%d — rate limited, waiting %ds: %s",
                attempt,
                max_retries,
                wait,
                str(e),
            )
            time.sleep(wait)

        except APIError as e:
            # Non-retryable API errors (auth, bad request, etc.)
            if e.status_code and e.status_code < 500:
                raise
            last_error = e
            wait = 2**attempt
            logger.warning(
                "Attempt %d/%d — server error %s, waiting %ds",
                attempt,
                max_retries,
                e.status_code,
                wait,
            )
            time.sleep(wait)

    raise last_error or ValueError("LLM call failed after all retries")
