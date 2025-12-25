from django.core.cache import cache


def cache_get(key: str):
    return cache.get(key)


def cache_set(key: str, value, timeout: int = 300):
    cache.set(key, value, timeout)


def cache_delete(key: str):
    cache.delete(key)


def cache_key(prefix: str, *parts: str):
    joined = ":".join(str(p) for p in parts if p is not None)
    return f"{prefix}:{joined}" if joined else prefix
