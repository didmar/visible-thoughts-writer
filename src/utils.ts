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

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
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

export function* intersperse<T, U>(
  a: T[],
  delim: U
): Generator<T | U, void, unknown> {
  let first = true;
  for (const x of a) {
    if (!first) yield delim;
    first = false;
    yield x;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

// Based on https://stackoverflow.com/a/51215842/2320087
export function downloadToJSON(objectData: unknown): void {
  const filename = 'export.json';
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
