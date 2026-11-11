# Error handling and HTTP status codes

How a server answers when something goes wrong, and how a client reads the answer: safe messages, the right status code, no leaked internals. Follow it whenever you write or change an API route, a form action, a server function or the client code that calls them.

- **The codebase wins.** If the project already has an error handler or a response shape, extend it, don't mix two, and mention the difference.
- **The status code is the signal; the body only adds detail.** Never respond `200 OK` with a failure inside the body (`{ "success": false }`).
- **One central place.** Errors are translated by a central handler or helper, so no route can forget to.

## 1. Never leak internal errors

Raw database, driver, framework or runtime errors never reach the client or the UI: duplicate-key messages, SQL errors, stack traces, file paths, connection strings, ORM or model names, third-party API payloads. They expose the schema and the infrastructure to attackers, and they mean nothing to real users.

- **Never forward a caught error into a response.** No `statusMessage: err.message`, no `res.send(err)`, no `return { error }` with a caught object. Build the response from a known, whitelisted message.
- **Production has debug and verbose error output disabled.**

## 2. Translate errors into meaningful messages

Catch the known failure cases on the server and map each to a clear message in the user's terms, with the right status and a next step.

| Situation | Status | Message (example) |
|---|---|---|
| Duplicate value (email already registered) | `409` | "An account with this email already exists. Try signing in instead." |
| Invalid input | `400` or `422` | Field-level messages the client shows next to the right field |
| Record not found | `404` | "We couldn't find that booking." |
| Not signed in | `401` | "Sign in to continue." |
| Signed in but not allowed | `403` | "You don't have access to this." |
| Anything not mapped | `500` | "Something went wrong on our side. Please try again in a moment." plus a request ID |

- **Auth errors stay vague where enumeration matters:** "Incorrect email or password", not which one was wrong.
- **Where revealing that a resource exists is itself sensitive,** answer `404` instead of `403`.

## 3. Log the technical error on the server

- Log the full original error (message, stack, route, method, user id) with the server logger, so it can be debugged.
- Never log secrets, passwords, tokens or full personal data.
- Attach a short **request (correlation) ID** to the log entry and return it in the generic `500` body, so a user can quote it to support.

## 4. Pick the status code deliberately

Set it explicitly with the framework's mechanism; don't rely on the default `200`, and make a thrown error produce a non-2xx response.

- **Success:** `200` read or update that returns data; `201 Created` for a new resource (include its `Location` or the record); `202 Accepted` for work queued asynchronously; `204 No Content` when there is nothing to return (typical for `DELETE`).
- **Redirects:** `301`/`308` permanent, `302`/`303`/`307` temporary; `304 Not Modified` with caching headers where it applies.
- **Client errors:** `400` malformed or invalid request; `401` not authenticated; `403` authenticated but not allowed; `404` not found; `405` method not allowed; `409` conflict (duplicate, version clash); `410` permanently gone; `413` payload too large; `415` unsupported media type; `422` well-formed but failing validation; `429` rate limited, with `Retry-After`.
- **Server errors:** `500` unexpected failure; `502`/`503`/`504` upstream or availability problems, with `Retry-After` when known.
- **Never** use `500` for something the client caused, and never use a `4xx` for a real server fault.

## 5. A stable error body

Pair each error status with one shape, so the client can rely on it:

```json
{
  "message": "Check the highlighted fields.",
  "fieldErrors": { "email": "Add the @ and the domain." },
  "requestId": "a1b2c3d4"
}
```

`message` is user-safe and always present. `fieldErrors` appears on validation errors only. `requestId` appears on unexpected errors. Nothing internal ever goes in it.

## 6. Handle statuses on the client

A resolved `fetch` doesn't mean success. Check `response.ok` (or catch the thrown error) before reading the body, then branch on the meaningful codes:

- `401` → start the sign-in flow.
- `403` → show a "no access" view.
- `404` → show the not-found state.
- `409` and `422` → show the conflict or field message next to the field.
- `429` and `5xx` → offer a retry, with backoff.

The UI shows the server's safe message, or a local fallback, in the project's error component. Never a raw `error.message`, a console dump or a JSON blob. Pair every message with a retry or a next step.

## 7. Checklist

- No internal detail can reach a response: the unmapped case returns the generic `500` and a request ID.
- Known failures map to the right status and a message in the user's terms.
- The technical error is logged with the request ID and no secrets.
- No failure travels inside a `200` body.
- The client checks the status before using the body and handles `401`, `403`, `404`, `409`/`422`, `429` and `5xx`.
