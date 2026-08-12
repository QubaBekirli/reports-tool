import asyncio
import httpx
from app.config import settings

# Semaphore to prevent overwhelming the LLM backend with concurrent requests
_llm_sem = asyncio.Semaphore(3)


async def ollama_generate(
    prompt: str, system: str = "", model: str | None = None, num_predict: int = 4096
) -> str:
    if settings.llm_provider == "openrouter":
        return await _openrouter_generate(prompt, system, model, num_predict)
    return await _ollama_generate(prompt, system, model, num_predict)


# ── Ollama (local) ──

async def _ollama_generate(
    prompt: str, system: str, model: str | None, num_predict: int
) -> str:
    url = f"{settings.ollama_url}/api/chat"
    payload = {
        "model": model or settings.ollama_model,
        "messages": [],
        "stream": False,
        "options": {"temperature": 0.1, "top_p": 0.9, "num_predict": num_predict},
    }
    if system:
        payload["messages"].append({"role": "system", "content": system})
    payload["messages"].append({"role": "user", "content": prompt})

    async with _llm_sem:
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                try:
                    data = resp.json()
                    return data.get("message", {}).get("content", "").strip()
                except Exception:
                    raw = resp.text
                    print(f"[Ollama] JSON parse failed, raw: {raw[:300]}")
                    return raw[:500] if raw else ""
        except httpx.ConnectError as e:
            print(f"[Ollama] Connection refused at {url}: {e}")
            raise RuntimeError(f"Ollama serveri cavab vermir ({settings.ollama_url}). "
                               "Ollama-nın işlədiyindən əmin olun.") from e
        except httpx.TimeoutException:
            print(f"[Ollama] Request timed out (180s) at {url}")
            raise RuntimeError("Ollama cavab vaxtı keçdi (>180s). Daha kiçik model seçin.") from None
        except Exception as e:
            print(f"[Ollama] Unexpected error: {type(e).__name__}: {e}")
            raise


# ── OpenRouter (cloud, OpenAI-compatible) ──

async def _openrouter_generate(
    prompt: str, system: str, model: str | None, num_predict: int
) -> str:
    if not settings.openrouter_api_key:
        raise RuntimeError(
            "OpenRouter API açarı təyin edilməyib. Ayarlar səhifəsindən əlavə edin."
        )

    url = f"{settings.openrouter_base_url}/chat/completions"
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model or settings.openrouter_model,
        "messages": messages,
        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": num_predict,
    }
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost",
        "X-Title": "GRC Audit Tool",
    }

    async with _llm_sem:
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        except httpx.TimeoutException:
            raise RuntimeError("OpenRouter cavab vaxtı keçdi (>180s).") from None
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            body = e.response.text[:300] if e.response.text else ""
            print(f"[OpenRouter] HTTP {status_code}: {body}")
            if status_code == 401:
                raise RuntimeError("OpenRouter API açarı yanlışdır. Yoxlayın və yenidən daxil edin.") from e
            if status_code == 429:
                raise RuntimeError("OpenRouter rate limit. Bir az gözləyin və yenidən cəhd edin.") from e
            raise RuntimeError(f"OpenRouter xətası ({status_code}): {body[:200]}") from e
        except Exception as e:
            print(f"[OpenRouter] Unexpected error: {type(e).__name__}: {e}")
            raise


# ── Model listing / health checks ──

async def list_ollama_models() -> list[dict]:
    url = f"{settings.ollama_url}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "name":           m.get("name", ""),
                    "size":           str(m.get("size", "")),
                    "parameter_size": m.get("details", {}).get("parameter_size", ""),
                    "quantization":   m.get("details", {}).get("quantization_level", ""),
                }
                for m in data.get("models", [])
            ]
    except Exception:
        return []


async def check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_url}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def check_openrouter() -> bool:
    if not settings.openrouter_api_key:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.openrouter_base_url}/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
            return resp.status_code == 200
    except Exception:
        return False


async def list_openrouter_models() -> list[dict]:
    if not settings.openrouter_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{settings.openrouter_base_url}/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("data", []):
                mid = m.get("id", "")
                pricing = m.get("pricing", {})
                is_free = pricing.get("prompt", "0") == "0" and pricing.get("completion", "0") == "0"
                if ":free" in mid or is_free:
                    models.append({
                        "name": mid,
                        "size": "free",
                        "parameter_size": "",
                        "quantization": "free" if is_free else "",
                    })
            return models[:30]
    except Exception:
        return []
