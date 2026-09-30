import { config } from '../config.js';

/**
 * OTP providers are swappable. The dummy provider is for development only.
 * A real provider should implement sendCode() and, if the gateway generates
 * the code itself, return that code so it can be stored hashed.
 */
class DummyOtpProvider {
  async sendCode({ destination, purpose }) {
    const code = config.otp.dummyCode;
    console.log(`[otp:dummy] ${purpose} code for ${destination} is ${code}`);
    return { code, provider: 'dummy' };
  }
}

class RealOtpProvider {
  async sendCode() {
    const err = new Error('Real OTP provider is not configured yet. Set OTP_PROVIDER=dummy for development, or add gateway credentials.');
    err.status = 503;
    throw err;
  }
}

const providers = {
  dummy: new DummyOtpProvider(),
  real: new RealOtpProvider(),
};

export function getOtpProvider() {
  return providers[config.otp.provider] || providers.dummy;
}
