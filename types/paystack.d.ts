declare module 'paystack' {
    interface Paystack {
        transaction: {
            initialize: (params: {
                email: string;
                amount: number;
                reference?: string;
                callback_url?: string;
                metadata?: string;
                currency?: string;
                channels?: string[];
            }) => Promise<{
                status: boolean;
                message: string;
                data: {
                    authorization_url: string;
                    access_code: string;
                    reference: string;
                };
            }>;
            verify: (reference: string) => Promise<{
                status: boolean;
                message: string;
                data: {
                    status: string;
                    reference: string;
                    amount: number;
                    gateway_response: string;
                    paid_at: string;
                    channel: string;
                    currency: string;
                    ip_address: string;
                    metadata?: any;
                    customer: {
                        id: number;
                        email: string;
                        customer_code: string;
                    };
                };
            }>;
        };
    }

    const paystack: (secretKey: string) => Paystack;
    export = paystack;
}
