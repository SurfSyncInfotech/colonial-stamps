export class PaymentProvider {
  async processPayment({ orderNumber, amount, method, customer }) {
    throw new Error('Not implemented');
  }
}
