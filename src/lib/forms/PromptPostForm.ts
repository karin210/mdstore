import { BaseForm } from "@/lib/forms/BaseForm";
import {
  check_author_handle,
  check_category,
  check_file,
  check_list,
  check_preview_line_count,
  check_text,
  check_works_with,
  PREVIEW_LINES,
  PROMPT_POST_FIELDS,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";

export interface PromptPostValues {
  title: string;
  tagline: string;
  summary: string;
  category: string;
  author_handle: string;
  meant_for: string;
  highlights: string;
  usage_steps: string;
  works_with: string[];
  file: File | null;
  preview_line_count: string;
}

const EMPTY_POST: PromptPostValues = {
  title: "",
  tagline: "",
  summary: "",
  category: "",
  author_handle: "",
  meant_for: "",
  highlights: "",
  usage_steps: "",
  works_with: [],
  file: null,
  preview_line_count: String(PREVIEW_LINES.default),
};

/** The upload form's fields and rules; the create action re-checks everything on the server. */
export class PromptPostForm extends BaseForm<PromptPostField, PromptPostValues, ValidationIssue> {
  constructor() {
    super(EMPTY_POST, PROMPT_POST_FIELDS);
  }

  protected get_field_issue(field: PromptPostField): ValidationIssue | null {
    const values = this.values;
    switch (field) {
      case "title":
      case "tagline":
      case "summary":
        return check_text(field, values[field]);
      case "meant_for":
      case "highlights":
      case "usage_steps":
        return check_list(field, values[field]);
      case "category":
        return check_category(values.category);
      case "author_handle":
        return check_author_handle(values.author_handle);
      case "works_with":
        return check_works_with(values.works_with);
      case "file":
        return check_file(values.file);
      case "preview_line_count":
        return check_preview_line_count(values.preview_line_count);
    }
  }

  /** The values as the multipart body the create action reads (the file travels as a File). */
  to_form_data(locale: string): FormData {
    const form_data = new FormData();
    const values = this.values;
    form_data.set("locale", locale);
    form_data.set("title", values.title);
    form_data.set("tagline", values.tagline);
    form_data.set("summary", values.summary);
    form_data.set("category", values.category);
    form_data.set("author_handle", values.author_handle);
    form_data.set("meant_for", values.meant_for);
    form_data.set("highlights", values.highlights);
    form_data.set("usage_steps", values.usage_steps);
    values.works_with.forEach((tool) => form_data.append("works_with", tool));
    if (values.file) form_data.set("file", values.file);
    form_data.set("preview_line_count", values.preview_line_count);
    return form_data;
  }
}
