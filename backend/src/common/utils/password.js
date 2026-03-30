const PASSWORD_MIN_LENGTH = 8;

const isStrongPassword = (password) => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) return false;
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
};

const getPasswordValidationMessage = () =>
  `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial`;

module.exports = { isStrongPassword, getPasswordValidationMessage };
