import crypto from 'crypto';
import { config } from '../config.js';

class DummyPaymentProvider {
  async charge({ amount, method, orderNumber }) {
    if (method === 'cod') {
      return { status: 'pending', paymentStatus: 'cod', reference: `COD-${orderNumber}`, provider: 'dummy' };
    }
    if (!['card', 'upi'].includes(method)) {
      const err = new Error('Choose card, UPI, or cash on delivery.');
      err.status = 422;
      throw err;
    }
    return {
      status: 'paid',
      paymentStatus: 'paid',
      reference: `DUMMY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      provider: 'dummy',
      amount,
    };
  }
}

class RealPaymentProvider {
  async charge() {
    const err = new Error('Payment gateway is not configured yet. Set PAYMENT_PROVIDER=dummy until credentials are available.');
    err.status = 503;
    throw err;
  }
}

const providers = {
  dummy: new DummyPaymentProvider(),
  real: new RealPaymentProvider(),
};

export function getPaymentProvider() {
  return providers[config.paymentProvider] || providers.dummy;
}
