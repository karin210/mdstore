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
  private readonly initialValues: Values;
  private readonly fieldOrder: readonly Field[];
  private readonly editedFields = new Set<Field>();
  private readonly leftFields = new Set<Field>();

  protected constructor(initialValues: Values, fieldOrder: readonly Field[]) {
    this.values = { ...initialValues };
    this.initialValues = initialValues;
    this.fieldOrder = fieldOrder;
  }

  /** The field's problem with its current value, or null when it is valid. */
  protected abstract getFieldIssue(field: Field): Issue | null;

  getValue<Key extends Field>(field: Key): Values[Key] {
    return this.values[field];
  }

  setValue<Key extends Field>(field: Key, value: Values[Key]): void {
    this.values = { ...this.values, [field]: value };
    this.editedFields.add(field);
  }

  /** Records that the user left the field (blur), which turns its border mark on. */
  markLeft(field: Field): void {
    this.leftFields.add(field);
  }

  /** On submit: every field counts as edited and left, so each wrong one shows its guidance. */
  markAllEdited(): void {
    this.fieldOrder.forEach((field) => {
      this.editedFields.add(field);
      this.leftFields.add(field);
    });
  }

  isFieldValid(field: Field): boolean {
    return this.getFieldIssue(field) === null;
  }

  wasEdited(field: Field): boolean {
    return this.editedFields.has(field);
  }

  getGuidance(field: Field): Issue | null {
    return this.editedFields.has(field) ? this.getFieldIssue(field) : null;
  }

  getBorderMark(field: Field): "error" | "valid" | undefined {
    if (!this.leftFields.has(field) || !this.hasContent(field)) return undefined;
    return this.isFieldValid(field) ? "valid" : "error";
  }

  get firstInvalidField(): Field | null {
    return this.fieldOrder.find((field) => !this.isFieldValid(field)) ?? null;
  }

  get isValid(): boolean {
    return this.firstInvalidField === null;
  }

  getValues(): Values {
    return { ...this.values };
  }

  reset(): void {
    this.values = { ...this.initialValues };
    this.editedFields.clear();
    this.leftFields.clear();
  }

  private hasContent(field: Field): boolean {
    const value = this.values[field];
    if (typeof value === "string") return value !== "";
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  }
}
