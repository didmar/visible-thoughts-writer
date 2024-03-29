export const swapKeyValue = <
  S extends string | number | symbol,
  T extends string | number | symbol
>(
  obj: Record<T, S>
): Record<S, T> => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [v, k])
  ) as Record<S, T>;
};

export function withoutUndefinedValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) =>
      value !== undefined ? { ...acc, [key]: value } : acc,
    {}
  );
}

export enum WindowStatus {
  WAITING,
  READY,
}

export function setWindowStatus(windowStatus: WindowStatus): void {
  const favicon: HTMLElement | null = document.getElementById('favicon');
  if (favicon === null) console.error('Favicon not found!');

  switch (windowStatus) {
    case WindowStatus.WAITING:
      favicon?.setAttribute('href', '/icon_normal.png');
      document.title = 'Visible Thoughts Writer';
      break;
    case WindowStatus.READY:
      favicon?.setAttribute('href', '/icon_ready.png');
      document.title = 'READY to compose!';
      break;
  }
}

export async function playDing(): Promise<void> {
  const ding = document.getElementById('ding') as HTMLAudioElement;
  if (ding === null) console.error('Ding sound element not found!');
  console.log('Ding!');
  await ding?.play().catch(
    (e) => console.log(e) // will err if user has blocked audio autoplay
  );
}

export function arraysContainsArray<T>(arrs: T[][], arr: T[]): boolean {
  return (
    arrs.find(
      (elem: T[]) =>
        elem.length === arr.length &&
        elem.every((value, index) => value === arr[index])
    ) !== undefined
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

// Based on https://stackoverflow.com/a/51215842/2320087
export function downloadToJSON(filename: string, objectData: unknown): void {
  const contentType = 'application/json;charset=utf-8;';
  const a = document.createElement('a');
  a.download = filename;
  a.href =
    'data:' +
    contentType +
    ',' +
    encodeURIComponent(JSON.stringify(objectData, null, 2));
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export function zipWithPrev<T>(arr: T[]): Array<[T, T | undefined]> {
  return arr.map((v, i, a) => [v, a[i - 1]]);
}

/**
 * Return a copy of an array without duplicate values and without changing the order.
 * @param arr an array of any type
 * @returns a new array with duplicate values removed
 */
export const orderedArrayWithoutDupes = <T>(arr: T[]): T[] => {
  const seen: Set<T> = new Set();
  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const item: T = arr[i];

    if (!seen.has(item)) {
      result[result.length] = item;

      seen.add(item);
    }
  }

  return result;
};

/**
 * Sanitize a string to be used as a filename or slug.
 * @param str A string to slugify
 * @returns Slugified string
 */
export const slugify = (str: string): string => {
  return str
    .replace(/[ -]/g, '_')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase();
};
