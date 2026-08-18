export interface PasswordCheck {
  label: string
  pass: boolean
}

export function checkPassword(pw: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters',        pass: pw.length >= 8 },
    { label: 'Uppercase letter (A–Z)',        pass: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter (a–z)',        pass: /[a-z]/.test(pw) },
    { label: 'Number (0–9)',                  pass: /\d/.test(pw) },
    { label: 'Special character (!@#$…)',     pass: /[^A-Za-z0-9]/.test(pw) },
  ]
}

export function isPasswordStrong(pw: string): boolean {
  return checkPassword(pw).every(c => c.pass)
}
