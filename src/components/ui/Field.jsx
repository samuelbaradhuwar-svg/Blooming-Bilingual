import { useId } from 'react';

/**
 * A labelled form field. The label is tied to the input, so tapping the label focuses it
 * and screen readers announce what the field is for.
 *
 *   <Field label="Email">{id => <input id={id} type="email" ... />}</Field>
 */
export default function Field({ label, hint, children, style }) {
  const id = useId();
  return (
    <div className="form-group" style={style}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
