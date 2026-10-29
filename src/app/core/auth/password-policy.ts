// Keep aligned with Users RegistrationValidator.ValidatePasswordOnly on the backend.
export function meetsPasswordPolicy(password: string): boolean {
  if (!password || password.length < 8 || password.length > 128) return false;
  const characters = Array.from(password);
  return characters.some(char => /\p{Lu}/u.test(char))
    && characters.some(char => /\p{Ll}/u.test(char))
    && characters.some(char => /\p{Nd}/u.test(char))
    && characters.some(char => /[^\p{L}\p{Nd}]/u.test(char));
}
