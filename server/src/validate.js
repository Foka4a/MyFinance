const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function requireString(value, fieldLabel) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldLabel} e obrigatorio`);
  }
  return value.trim();
}

export function optionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ValidationError('Campo de texto invalido');
  return value.trim() === '' ? null : value.trim();
}

export function requireEnum(value, allowed, fieldLabel) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ValidationError(`${fieldLabel} invalido`);
  }
  return value;
}

export function requirePositiveIntCents(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new ValidationError('Valor deve ser inteiro positivo em centavos');
  }
  return value;
}

export function requireNonNegativeIntCents(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError('Valor deve ser inteiro nao negativo em centavos');
  }
  return value;
}

export function requireIntCents(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ValidationError('Valor deve ser inteiro em centavos');
  }
  return value;
}

export function requireDate(value, fieldLabel = 'Data') {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(`${fieldLabel} invalida`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new ValidationError(`${fieldLabel} invalida`);
  }
  return value;
}

export function parseIntParam(value, fieldLabel) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${fieldLabel} invalido`);
  return n;
}

export function requireId(value, fieldLabel) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError(`${fieldLabel} invalido`);
  return n;
}
