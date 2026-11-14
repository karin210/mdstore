# API route handlers: one purpose per handler

How to organise API endpoints so that each one does one job, with its own rules and its own guard. Follow it whenever you add an endpoint, change what an existing one does, or are tempted to add a flag, a mode or a branch to a handler.

- **The codebase wins.** If the project already organises its handlers a different way, follow it, don't mix two, and mention the difference.
- **One handler per purpose,** not one per HTTP method. A resource may have several handlers for the same method when they serve different purposes.
- **Thin handlers.** Shared logic lives in server utilities, not in copies of a handler.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. One purpose, one handler

In a booking app:

- `bookings/index.post` lets a customer book for themselves; the identity comes from their token.
- `bookings/on-behalf.post` lets staff book for a customer; the target comes from the body, the booking is created already confirmed, and staff aren't notified.
- `bookings/[id].patch` edits a booking.
- `bookings/[id]/accept-reschedule.patch` and `bookings/[id]/final-cost.patch` each make one specific change.

## 2. Split instead of branching

When a new requirement would change **who may call the handler, what it validates, what it writes, or which side effects it fires** (notifications, metrics, emails), create a new handler. Don't add a mode flag (`?mode=staff`, `asStaff: true`) or conditionals to the existing one.

The existing handler stays untouched, so its behaviour and its authorization can't regress.

## 3. When to keep it in one handler

When the difference is small: an optional field, a filter or sort parameter, pagination, as long as authorization, validation and side effects stay the same.

## 4. Name the path for the purpose

Use kebab-case and the purpose (`on-behalf`, `accept-reschedule`, `final-cost`, `count`), following the route naming rules: descriptive, specific, and not so generic that it will collide later.

## 5. Each handler is self-contained in its contract

- **Its own validation schema** for its own input.
- **Its own authorization guard at the top,** before anything else runs.
- **A short comment at the head of the file** saying what it does and how it differs from its siblings.

```ts
// Staff books on behalf of a customer. Unlike `index.post`, the customer comes from
// the body, the booking is created confirmed, and staff are not notified.
export default async function handler(request: Request): Promise<Response> {
  const staff = await requireRole(request, "staff");
  const input = onBehalfSchema.parse(await request.json());
  // ...
}
```

## 6. Share logic, not handlers

Pieces used by several handlers live in the server utilities folder: validation helpers, repositories, mappers, metrics and notifications. The handlers stay thin and nothing is copy-pasted. If two handlers need the same rule, move the rule, not the handler.

## 7. Frameworks with one file for all methods

Some frameworks put every method of a route in one file (Next.js `route.ts`, SvelteKit `+server.ts`). Split by path segment instead (`bookings/on-behalf/route.ts`).

## 8. Checklist

- Each handler has one job, named by its purpose.
- No `mode` flag or `asX` boolean changes who may call it or what it writes.
- Each handler has its own schema and guard, and a header comment.
- Shared logic is in the server utilities, not copied.
