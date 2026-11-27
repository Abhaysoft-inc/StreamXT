export class ApiError extends Error {
  constructor({ message, code = 'UNKNOWN_ERROR', statusCode = 500, fields = {}, details = null }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    this.details = details;
  }
}

let refreshPromise = null;

async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const { retryOnUnauthorized = true, headers, body, ...rest } = options;

  const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData);

  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : body,
    ...rest,
  });

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/signin')
  ) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      return apiFetch(path, { ...options, retryOnUnauthorized: false });
    }
  }

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  }

  if (!response.ok || (payload && payload.success === false)) {
    const errorInfo = payload?.error || {};
    throw new ApiError({
      message: errorInfo.message || `Request failed with status ${response.status}`,
      code: errorInfo.code || 'REQUEST_FAILED',
      statusCode: response.status,
      fields: errorInfo.fields || {},
      details: errorInfo.details || null,
    });
  }

  return payload?.data ?? payload;
}
