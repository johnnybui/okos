export function pickRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
