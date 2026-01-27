import Paystack from 'paystack';

// Initialize Paystack with Secret Key
// In production, ensure PAYSTACK_SECRET_KEY is set
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY || '');

interface InitializePaymentParams {
    email: string;
    amount: number; // In kobo/cents (e.g., 500000 = 5000.00)
    reference?: string;
    callback_url?: string;
    metadata?: any;
    currency?: string;
}

export const PaystackService = {
    /**
     * Initialize a transaction
     */
    initializeTransaction: async (params: InitializePaymentParams) => {
        try {
            // Paystack SDK usually expects a callback, but we can promise-wrap it or use valid SDK methods.
            // The 'paystack' npm package structure varies. 
            // If it's the standard official unofficial wrapper:
            // paystack.transaction.initialize(params) -> Returns Promise or result

            // Note: Many npm packages for paystack are wrappers. 
            // If the installed package is 'paystack' (by gligoran), it uses promises.

            const response = await paystack.transaction.initialize({
                email: params.email,
                amount: params.amount, // Expects lowest denomination
                reference: params.reference,
                callback_url: params.callback_url,
                metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
                currency: params.currency || 'NGN'
            });

            return response; // { status: boolean, message: string, data: { optimization_url: string, access_code: string, reference: string } }
        } catch (error) {
            console.error('Paystack Initialize Error:', error);
            throw error;
        }
    },

    /**
     * Verify a transaction
     */
    verifyTransaction: async (reference: string) => {
        try {
            const response = await paystack.transaction.verify(reference);
            return response; // { status: boolean, message: string, data: { status: 'success' | 'failed', ... } }
        } catch (error) {
            console.error('Paystack Verify Error:', error);
            throw error;
        }
    }
};
