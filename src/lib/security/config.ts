export const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET,
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  
  session: {
    maxAge: 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,
    historyCount: 12,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: false,
  },
  
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  },
  
  api: {
    maxRequestSize: '10mb',
    timeout: 30000,
  },
}

if (process.env.NODE_ENV === 'production' && !securityConfig.jwt.secret) {
  console.error('[SECURITY] WARNING: JWT_SECRET/NEXTAUTH_SECRET is not configured. JWT verification may fail.')
}
