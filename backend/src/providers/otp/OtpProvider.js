/** @typedef {'signup'|'login'|'password_reset'} OtpPurpose */

/**
 * Swappable OTP provider interface.
 * Replace DummyOtpProvider with a real SMS/email provider in production.
 */
export class OtpProvider {
  /** @returns {Promise<string>} */
  async generate() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<void>} */
  async send(_identifier, _otp, _purpose) {
    throw new Error('Not implemented');
  }
}
