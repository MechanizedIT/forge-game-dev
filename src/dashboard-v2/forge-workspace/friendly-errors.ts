export function friendlyRunError(value: string): string {
  if (/Project HEAD, inventory, or quest revision changed after contract approval/iu.test(value)) {
    return "Forge's saved safety check is out of date. No game files changed. Choose Stop safely, then start this Step again.";
  }
  return value;
}

export function repairActualNote(value: string): string {
  const marker = "\nActual:";
  const markerIndex = value.indexOf(marker);
  return (markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value).trim();
}
