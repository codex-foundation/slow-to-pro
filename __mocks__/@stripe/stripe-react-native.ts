const StripeProvider = ({ children }: { children: unknown }) => children;
StripeProvider.displayName = 'MockStripeProvider';

export const initStripe = jest.fn().mockResolvedValue(undefined);
export const initPaymentSheet = jest.fn().mockResolvedValue({ error: null });
export const presentPaymentSheet = jest.fn().mockResolvedValue({ error: null });
export { StripeProvider };
export default { initStripe, initPaymentSheet, presentPaymentSheet, StripeProvider };
