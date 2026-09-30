import { PaymentProvider } from './PaymentProvider.js';
import { v4 as uuidv4 } from 'uuid';

export class DummyPaymentProvider extends PaymentProvider {
  async processPayment({ orderNumber, amount, method }) {
    if (!method) {
      return { success: false, error: 'Payment method required' };
    }
    return {
      success: true,
      paymentRef: `DUMMY-${orderNumber}-${uuidv4().slice(0, 8)}`,
      amount,
      method,
      message: 'Payment simulated successfully (dummy provider)',
    };
  }
}
