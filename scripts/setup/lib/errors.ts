export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function compactError(error: unknown, maxLength = 50): string {
  const message = getErrorMessage(error).replace(/\s+/g, " ").trim();
  return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
}
