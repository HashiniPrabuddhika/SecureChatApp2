import CryptoJS from 'crypto-js';

const AES_SECRET = 'YourSuperSecureKey';

export function encryptMessage(text) {
  return CryptoJS.AES.encrypt(text, AES_SECRET).toString();
}

export function decryptMessage(cipher) {
  const bytes = CryptoJS.AES.decrypt(cipher, AES_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
export function isEncrypted(cipher) {
  return cipher && cipher.startsWith('U2FsdGVkX');
}