import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

const APP_NAME = 'SupplementShop Pro'

export function createTOTPSecret(email: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  })
}

export async function generateQRCodeDataUri(totp: OTPAuth.TOTP): Promise<string> {
  const uri = totp.toString()
  return QRCode.toDataURL(uri, { width: 192, margin: 1 })
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

export function getTOTPUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  return totp.toString()
}
