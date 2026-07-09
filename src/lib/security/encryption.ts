import crypto from 'crypto'
import { securityConfig } from './config'

export class Encryption {
  private key: Buffer
  private algorithm = securityConfig.encryption.algorithm
  private salt: Buffer
  
  constructor(secretKey?: string, salt?: string) {
    const key = secretKey || process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    const saltHex = salt || process.env.ENCRYPTION_SALT
    if (!saltHex) {
      throw new Error('ENCRYPTION_SALT environment variable is required')
    }
    this.salt = Buffer.from(saltHex, 'hex')
    this.key = crypto.scryptSync(key, this.salt, securityConfig.encryption.keyLength)
  }
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(securityConfig.encryption.ivLength)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = (cipher as crypto.CipherGCM).getAuthTag()
    
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  }
  
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')
    if (parts.length !== 3 || parts.some(p => !p)) {
      throw new Error('Invalid encrypted text format')
    }
    const [ivHex, tagHex, encrypted] = parts
    
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
    ;(decipher as crypto.DecipherGCM).setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
  
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex')
  }
  
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
}

let _encryption: Encryption | null = null

export function getEncryption(): Encryption {
  if (!_encryption) {
    _encryption = new Encryption()
  }
  return _encryption
}

export const encryption = new Proxy({} as Encryption, {
  get(_, prop) {
    return (getEncryption() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
