import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
