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
    this.salt = Buffer.from(salt || process.env.ENCRYPTION_SALT || crypto.randomBytes(16).toString('hex'), 'hex')
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
    const [ivHex, tagHex, encrypted] = encryptedText.split(':')
    
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

export const encryption = new Encryption()
