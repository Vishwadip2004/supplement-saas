import crypto from 'crypto'
import { securityConfig } from './config'

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
}

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
    this.key = crypto.scryptSync(key, this.salt, securityConfig.encryption.keyLength, SCRYPT_PARAMS)
  }
  
  static async deriveKey(secretKey: string, salt: Buffer, keyLength: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(secretKey, salt, keyLength, SCRYPT_PARAMS, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey)
      })
    })
  }

  async initAsync(secretKey?: string, salt?: string): Promise<void> {
    const key = secretKey || process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    const saltHex = salt || process.env.ENCRYPTION_SALT
    if (!saltHex) {
      throw new Error('ENCRYPTION_SALT environment variable is required')
    }
    this.salt = Buffer.from(saltHex, 'hex')
    this.key = await Encryption.deriveKey(key, this.salt, securityConfig.encryption.keyLength)
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
let _initPromise: Promise<void> | null = null

export async function getEncryption(): Promise<Encryption> {
  if (!_encryption) {
    _encryption = new Encryption()
  }
  if (!_initPromise) {
    _initPromise = _encryption.initAsync()
  }
  await _initPromise
  return _encryption
}

export const encryption = new Proxy({} as Encryption, {
  get(_, prop) {
    if (!_encryption) {
      _encryption = new Encryption()
      _initPromise = _encryption.initAsync()
    }
    return (...args: unknown[]) => {
      return _initPromise!.then(() => (_encryption as unknown as Record<string, (...a: unknown[]) => unknown>)[prop as string](...args))
    }
  },
})