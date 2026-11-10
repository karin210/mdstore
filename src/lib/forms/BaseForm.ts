/**
 * Shared behaviour of every form: field values, which fields were edited (typed in) and left
 * (blurred), per-field validation, and the first wrong field to focus on submit.
 * Framework-agnostic: components re-render after calling a mutating method.
 *
 * - Guidance shows once a field was edited and its value is wrong, never on a pristine field.
 * - The border mark ("error" | "valid") shows only after the user left a field that has a value.
 */
export abstract class BaseForm<Field extends string, Values extends Record<Field, unknown>, Issue> {
  protected values: Values;
  private readonly initial_values: Values;
  private readonly field_order: readonly Field[];
  private readonly edited_fields = new Set<Field>();
  private readonly left_fields = new Set<Field>();

  protected constructor(initial_values: Values, field_order: readonly Field[]) {
    this.values = { ...initial_values };
    this.initial_values = initial_values;
    this.field_order = field_order;
  }

  /** The field's problem with its current value, or null when it is valid. */
  protected abstract get_field_issue(field: Field): Issue | null;

  get_value<Key extends Field>(field: Key): Values[Key] {
    return this.values[field];
  }

  set_value<Key extends Field>(field: Key, value: Values[Key]): void {
    this.values = { ...this.values, [field]: value };
    this.edited_fields.add(field);
  }

  /** Records that the user left the field (blur), which turns its border mark on. */
  mark_left(field: Field): void {
    this.left_fields.add(field);
  }

  /** On submit: every field counts as edited and left, so each wrong one shows its guidance. */
  mark_all_edited(): void {
    this.field_order.forEach((field) => {
      this.edited_fields.add(field);
      this.left_fields.add(field);
    });
  }

  is_field_valid(field: Field): boolean {
    return this.get_field_issue(field) === null;
  }

  was_edited(field: Field): boolean {
    return this.edited_fields.has(field);
  }

  get_guidance(field: Field): Issue | null {
    return this.edited_fields.has(field) ? this.get_field_issue(field) : null;
  }

  get_border_mark(field: Field): "error" | "valid" | undefined {
    if (!this.left_fields.has(field) || !this.has_content(field)) return undefined;
    return this.is_field_valid(field) ? "valid" : "error";
  }

  get first_invalid_field(): Field | null {
    return this.field_order.find((field) => !this.is_field_valid(field)) ?? null;
  }

  get is_valid(): boolean {
    return this.first_invalid_field === null;
  }

  get_values(): Values {
    return { ...this.values };
  }

  reset(): void {
    this.values = { ...this.initial_values };
    this.edited_fields.clear();
    this.left_fields.clear();
  }

  private has_content(field: Field): boolean {
    const value = this.values[field];
    if (typeof value === "string") return value !== "";
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  }
}
