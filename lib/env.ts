function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappOnboardingFlowId: process.env.WHATSAPP_ONBOARDING_FLOW_ID,
  whatsappRecordSaleFlowId: process.env.WHATSAPP_RECORD_SALE_FLOW_ID,
  whatsappFlowMessageVersion: process.env.WHATSAPP_FLOW_MESSAGE_VERSION ?? "3",
  whatsappPinSessionMinutes: Number(process.env.WHATSAPP_PIN_SESSION_MINUTES ?? "30"),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000"
};

export const requireServerEnv = () => ({
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY")
});
