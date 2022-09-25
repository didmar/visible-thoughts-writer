export function enumKeys<O extends object, K extends keyof O = keyof O>(
  obj: O
): K[] {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
}

export function withoutUndefinedValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) =>
      value !== undefined ? { ...acc, [key]: value } : acc,
    {}
  );
}
