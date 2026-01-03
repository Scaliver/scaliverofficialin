// Common breached passwords list (top 200 most common)
const COMMON_BREACHED_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234", "111111",
  "1234567", "dragon", "123123", "baseball", "abc123", "football", "monkey", "letmein",
  "696969", "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890",
  "michael", "654321", "pussy", "superman", "1qaz2wsx", "7777777", "fuckyou", "121212",
  "000000", "qazwsx", "123qwe", "killer", "trustno1", "jordan", "jennifer", "zxcvbnm",
  "asdfgh", "hunter", "buster", "soccer", "harley", "batman", "andrew", "tigger",
  "sunshine", "iloveyou", "fuckme", "2000", "charlie", "robert", "thomas", "hockey",
  "ranger", "daniel", "starwars", "klaster", "112233", "george", "asshole", "computer",
  "michelle", "jessica", "pepper", "1111", "zxcvbn", "555555", "11111111", "131313",
  "freedom", "777777", "pass", "fuck", "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love", "ashley", "6969", "nicole", "chelsea",
  "biteme", "matthew", "access", "yankees", "987654321", "dallas", "austin", "thunder",
  "taylor", "matrix", "william", "corvette", "hello", "martin", "heather", "secret",
  "fucker", "merlin", "diamond", "1234qwer", "gfhjkm", "hammer", "silver", "222222",
  "88888888", "anthony", "justin", "test", "bailey", "q1w2e3r4t5", "patrick", "internet",
  "scooter", "orange", "11111", "golfer", "cookie", "richard", "samantha", "bigdog",
  "guitar", "jackson", "whatever", "mickey", "chicken", "sparky", "snoopy", "maverick",
  "phoenix", "camaro", "sexy", "peanut", "morgan", "welcome", "falcon", "cowboy",
  "ferrari", "samsung", "andrea", "smokey", "steelers", "joseph", "mercedes", "dakota",
  "arsenal", "eagles", "melissa", "boomer", "booboo", "spider", "nascar", "monster",
  "tigers", "yellow", "xxxxxx", "123123123", "gateway", "marina", "diablo", "bulldog",
  "qwer1234", "compaq", "purple", "hardcore", "banana", "junior", "hannah", "123654",
  "porsche", "lakers", "iceman", "money", "cowboys", "987654", "london", "tennis",
  "999999", "ncc1701", "coffee", "scooby", "0000", "miller", "boston", "q1w2e3r4",
  "fuckoff", "brandon", "yamaha", "chester", "mother", "forever", "johnny", "edward",
]);

// Password strength requirements
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else {
    strengthScore += 1;
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  } else {
    strengthScore += 1;
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  } else {
    strengthScore += 1;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  } else {
    strengthScore += 1;
  }

  // Check against common breached passwords
  if (COMMON_BREACHED_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password has been found in data breaches. Please choose a different password");
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (strengthScore >= 4 && password.length >= 12) {
    strength = 'strong';
  } else if (strengthScore >= 3 && password.length >= 8) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

// Get color for password strength indicator
export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'weak':
    default:
      return 'text-red-500';
  }
}

// Get background color for password strength bar
export function getStrengthBarColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'weak':
    default:
      return 'bg-red-500';
  }
}

// Get width for password strength bar
export function getStrengthBarWidth(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'w-full';
    case 'medium':
      return 'w-2/3';
    case 'weak':
    default:
      return 'w-1/3';
  }
}
