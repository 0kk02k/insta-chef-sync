export interface PasswordStrength {
  score: number; // 0-4
  isValid: boolean;
  feedback: string[];
}

export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Check length
  if (password.length < 8) {
    feedback.push('Passwort muss mindestens 8 Zeichen lang sein');
  } else {
    score += 1;
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    feedback.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
  } else {
    score += 1;
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    feedback.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    feedback.push('Passwort muss mindestens eine Zahl enthalten');
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-[\]{};':"\\|,.<>/?]/.test(password)) {
    feedback.push('Passwort sollte mindestens ein Sonderzeichen enthalten');
  } else {
    score += 1;
  }

  // Check for common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123|abc|qwerty/i, // Sequential patterns
    /password|admin|user/i // Common words
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      feedback.push('Passwort sollte keine häufigen Muster enthalten');
      score = Math.max(0, score - 1);
      break;
    }
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    score: Math.min(score, 4),
    isValid,
    feedback
  };
};

export const getPasswordStrengthText = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'Sehr schwach';
    case 2:
      return 'Schwach';
    case 3:
      return 'Mittel';
    case 4:
      return 'Stark';
    default:
      return 'Sehr stark';
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'text-red-600';
    case 2:
      return 'text-orange-600';
    case 3:
      return 'text-yellow-600';
    case 4:
      return 'text-green-600';
    default:
      return 'text-green-700';
  }
};