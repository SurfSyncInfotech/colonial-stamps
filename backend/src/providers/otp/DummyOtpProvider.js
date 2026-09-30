import { OtpProvider } from './OtpProvider.js';

const DUMMY_OTP = '123456';

export class DummyOtpProvider extends OtpProvider {
  async generate() {
    return DUMMY_OTP;
  }

  async send(identifier, otp, purpose) {
    console.log(`[DummyOtpProvider] OTP for ${purpose} → ${identifier}: ${otp}`);
  }
}
