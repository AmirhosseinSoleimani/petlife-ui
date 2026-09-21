export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  uppercasePattern: /[A-Z]/,
  lowercasePattern: /[a-z]/,
  digitPattern: /\d/,
  specialCharacterPattern: /[^A-Za-z0-9]/
} as const;

export type PasswordPolicyRuleId = 'length' | 'uppercase' | 'lowercase' | 'digit' | 'specialCharacter';

export interface PasswordPolicyRule {
  id: PasswordPolicyRuleId;
  label: string;
}

export const PASSWORD_POLICY_RULES: readonly PasswordPolicyRule[] = [
  { id: 'length', label: 'auth.passwordRuleLength' },
  { id: 'uppercase', label: 'auth.passwordRuleUppercase' },
  { id: 'lowercase', label: 'auth.passwordRuleLowercase' },
  { id: 'digit', label: 'auth.passwordRuleDigit' },
  { id: 'specialCharacter', label: 'auth.passwordRuleSpecial' }
];

export function passwordPolicyState(password: string): Record<PasswordPolicyRuleId, boolean> {
  return {
    length: password.length >= PASSWORD_POLICY.minLength && password.length <= PASSWORD_POLICY.maxLength,
    uppercase: PASSWORD_POLICY.uppercasePattern.test(password),
    lowercase: PASSWORD_POLICY.lowercasePattern.test(password),
    digit: PASSWORD_POLICY.digitPattern.test(password),
    specialCharacter: PASSWORD_POLICY.specialCharacterPattern.test(password)
  };
}

export function passwordMeetsPolicy(password: string): boolean {
  return Object.values(passwordPolicyState(password)).every(Boolean);
}
