import { describe, it, expect, beforeEach } from 'vitest'
import { Encryption } from '../security/encryption'

process.env.ENCRYPTION_KEY = 'test-secret-key-for-testing'
process.env.ENCRYPTION_SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'

describe('Encryption', () => {
  let enc: Encryption

  beforeEach(() => {
    enc = new Encryption()
  })

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text roundtrip', () => {
      const plaintext = 'Hello, World!'
      const encrypted = enc.encrypt(plaintext)
      const decrypted = enc.decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same text'
      const encrypted1 = enc.encrypt(plaintext)
      const encrypted2 = enc.encrypt(plaintext)
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle long text', () => {
      const plaintext = 'a'.repeat(10000)
      const encrypted = enc.encrypt(plaintext)
      const decrypted = enc.decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should throw on invalid encrypted text format', () => {
      expect(() => enc.decrypt('invalid')).toThrow('Invalid encrypted text format')
    })

    it('should throw on tampered ciphertext', () => {
      const encrypted = enc.encrypt('test')
      const parts = encrypted.split(':')
      parts[2] = parts[2].slice(0, -2) + 'ff'
      expect(() => enc.decrypt(parts.join(':'))).toThrow()
    })
  })

  describe('hash', () => {
    it('should produce consistent SHA-256 hash', () => {
      const hash1 = enc.hash('test input')
      const hash2 = enc.hash('test input')
      expect(hash1).toBe(hash2)
    })

    it('should produce 64-char hex string', () => {
      const hash = enc.hash('anything')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = enc.hash('input1')
      const hash2 = enc.hash('input2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateToken', () => {
    it('should generate token of specified byte length (hex = 2x)', () => {
      const token = enc.generateToken(32)
      expect(token).toHaveLength(64)
    })

    it('should generate unique tokens', () => {
      const token1 = enc.generateToken(32)
      const token2 = enc.generateToken(32)
      expect(token1).not.toBe(token2)
    })

    it('should default to 32 bytes', () => {
      const token = enc.generateToken()
      expect(token).toHaveLength(64)
    })
  })

  describe('constructor', () => {
    it('should throw if ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY
      expect(() => new Encryption()).toThrow('ENCRYPTION_KEY')
      process.env.ENCRYPTION_KEY = 'test-secret-key-for-testing'
    })

    it('should throw if ENCRYPTION_SALT is missing', () => {
      delete process.env.ENCRYPTION_SALT
      expect(() => new Encryption()).toThrow('ENCRYPTION_SALT')
      process.env.ENCRYPTION_SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'
    })
  })
})
