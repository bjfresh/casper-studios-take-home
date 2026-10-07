# middleware/

Cross-cutting request handling: auth, rate limiting, caching, request ids, and
the error handler that maps `AppError` → status code (unknown errors → 500,
unavailable dependency → 503).
