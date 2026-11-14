# Classes for complex objects

When to model an object as a class, and what goes inside it, so its rules live in one place. Follow it whenever you build something that carries its own rules and behaviour, such as a booking, a user, a form or a loading state, and not only data.

- **The codebase wins.** If the project already models these objects another way, follow it, don't mix two, and mention the difference.
- **Behaviour decides.** Reach for a class when the object has rules that would otherwise be duplicated. Plain data stays a plain type.
- **Readability beats ceremony.** When a class and the simplest readable solution conflict, choose the simplest.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. What belongs in the class

Data, validation, state transitions and derived values live together, so every use behaves the same:

- **Fields,** typed, with `private` and `readonly` where they fit.
- **Validation rules,** per field and for the whole object, returning field-level errors.
- **Derived getters:** `isValid`, `isPending`, `canCancel`, `fullName`, `endsAt`.
- **State transitions:** `submit()`, `cancel()`, `reset()`.
- **Conversions** between the class and the plain record types shared with the server: `fromRecord(record)` and `toPayload()`.

Typical candidates: `Booking`, `User`, `LoginForm`, `SignUpForm` and async state holders. Don't scatter the same rules across components, stores and utilities as loose helpers over plain objects.

## 2. Loading state is a class too

Wrap async status in one small reusable class instead of an ad-hoc `isLoading` boolean in every component:

```ts
type Status = "idle" | "loading" | "success" | "error";

export class AsyncState<T> {
  status: Status = "idle";
  data: T | null = null;
  errorMessage: string | null = null;

  async run(task: () => Promise<T>): Promise<void> {
    this.status = "loading";
    this.errorMessage = null;
    try {
      this.data = await task();
      this.status = "success";
    } catch {
      // Both outcomes leave "loading", so a failed task never leaves the UI stuck.
      this.errorMessage = "Something went wrong. Please try again.";
      this.status = "error";
    }
  }
}
```

## 3. Forms are classes

A form is an object that owns its fields, which ones the user has edited, per-field validation, its guidance messages and its `firstInvalidField`. Then inline guidance and "focus the first wrong field on submit" are implemented once and reused by every form.

## 4. Keep them focused and testable

- **One class, one responsibility.**
- **Framework-agnostic:** plain TypeScript with no UI-framework imports, in a utilities or types folder, so they can be unit tested and shared with the server.
- **Inject dependencies** (an API client, a clock, a logger) through the constructor or method arguments rather than hard-wiring them.
- **Composition over deep inheritance.** A small abstract base class (`BaseForm`) is fine for behaviour that really is shared.

## 5. Wire them into reactivity deliberately

- Make instances reactive with your framework's mechanism, and expose state through fields and getters, so templates stay declarative.
- Keep instances out of shared stores when they would break serialisation. Store plain records in shared state and rebuild instances with `Class.fromRecord()`.
- **Never send a class instance over the wire.** Send `toPayload()`.
- The server validates against the same rules, and still re-validates independently.

## 6. Don't overdo it

A list item, a config object or an API response shape stays a plain `interface` or `type`. If the object has no rules and no behaviour, it doesn't need a class.

## 7. Checklist

- The rules and derived values are in the class, not scattered in components.
- Async status uses one shared holder that always clears the loading state.
- Forms own their fields, validation and first invalid field.
- Classes are framework-agnostic, injected with their dependencies and unit tested.
- Instances are rebuilt from records and sent as payloads, never serialised directly.
