/** Border feedback of the add-word form, applied on the DOM like the old addWord.js. */
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const VALID_FLASH_MS = 2000;

export function clearFieldValidation(field: Field): void {
  field.style.borderColor = '';
  field.style.boxShadow = '';
}

/** Red border when invalid; green border for 2 s when valid. */
export function validateField(field: Field): boolean {
  const isValid = field.checkValidity() && (!field.required || field.value.trim() !== '');
  if (!isValid) {
    field.style.borderColor = '#ef4444';
    field.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
  } else {
    field.style.borderColor = '#10b981';
    field.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
    setTimeout(() => clearFieldValidation(field), VALID_FLASH_MS);
  }
  return isValid;
}

export function isFormField(target: EventTarget): target is Field {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
