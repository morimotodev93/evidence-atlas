type QueryCollection<T> = {
  all: () => PromiseLike<T[]> | AsyncIterable<T> | { toArray(): Promise<T[]> };
};

export async function findMany<T>(
  collection: QueryCollection<T>,
): Promise<T[]> {
  const result = await collection.all();

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    typeof (result as { toArray?: () => Promise<T[]> }).toArray === "function"
  ) {
    return await (result as { toArray: () => Promise<T[]> }).toArray();
  }

  if (
    result &&
    typeof (result as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
  ) {
    const rows: T[] = [];
    for await (const row of result as AsyncIterable<T>) {
      rows.push(row);
    }
    return rows;
  }

  return [];
}

export const prismaCompat = {
  findMany,
};
