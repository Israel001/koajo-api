import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

const deriveKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY ?? '';
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not configured.');
  }
  return createHash('sha256').update(secret).digest();
};

const getIv = (): Buffer => {
  const iv = process.env.ENCRYPTION_IV ?? '';
  if (iv) {
    return Buffer.from(iv, 'hex');
  }
  return randomBytes(12);
};

export const encryptSensitiveValue = (value: string): string => {
  const key = deriveKey();
  const iv = getIv();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

export const decryptSensitiveValue = (payload: string): string => {
  const key = deriveKey();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};
