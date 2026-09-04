import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";

/**
 * The common case: a labelled `<input>` with its validation message.
 *
 * A thin wrapper over `Field`, which owns the accessibility wiring. Anything
 * that is not a plain input — a textarea, a select, the editor — uses `Field`
 * directly rather than growing this component a variant at a time.
 */
export function FormField({
  name,
  label,
  errors,
  hint,
  className,
  ...inputProps
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "id">) {
  return (
    <Field label={label} errors={errors} hint={hint} className={className}>
      {(field) => <Input name={name} {...field} {...inputProps} />}
    </Field>
  );
}
