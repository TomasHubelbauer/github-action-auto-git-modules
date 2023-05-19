/**
 * @template T
 * @param {AsyncGenerator<T>} generator 
 * @returns {Promise<T[]>}
 */
export default async function drainAsyncGenerator(generator) {
  /** @type {T[]} */
  const items = [];
  for await (const item of generator) {
    items.push(item);
  }

  return items;
}
