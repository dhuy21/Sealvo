/** Word types are Prisma enum names; phrasal verbs are stored as `ph.v` and displayed that way. */
export function displayWordType(type: string): string {
  return type === 'ph_v' ? 'ph.v' : type;
}

/** `type : meaning`, or just the meaning when the word has no type. */
export function formatTypeMeaning(type: string | null | undefined, meaning: string): string {
  return type ? `${displayWordType(type)} : ${meaning}` : meaning;
}
