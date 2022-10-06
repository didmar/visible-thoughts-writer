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
