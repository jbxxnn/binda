# WhatsApp Flow Encryption Setup

Publishing a `With Endpoint` WhatsApp Flow requires endpoint encryption.

Meta’s guide:

- [Implement your Flow endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint#upload-public-key)

## What this project now supports

The Record Sale endpoint at:

- `POST /api/whatsapp/flows/record-sale/endpoint`

can now handle:

- plain JSON requests for local testing
- encrypted Meta Flow endpoint requests for production publishing

Relevant files:

- [app/api/whatsapp/flows/record-sale/endpoint/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/endpoint/route.ts:1)
- [lib/whatsapp-flow-crypto.ts](/Users/apple/Desktop/Project%20Baby/binda/lib/whatsapp-flow-crypto.ts:1)

## Environment Variable

Add this to Vercel and local env:

- `WHATSAPP_FLOW_PRIVATE_KEY`

You can store it as:

- full PEM text
- or base64-encoded PEM text

## Generate Keys

Run these locally:

```bash
openssl genrsa -out whatsapp-flow-private.pem 2048
openssl rsa -in whatsapp-flow-private.pem -pubout -out whatsapp-flow-public.pem
```

## Add Private Key To Env

Option 1: paste PEM directly into `WHATSAPP_FLOW_PRIVATE_KEY`

Example:

```env
WHATSAPP_FLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
```

Option 2: base64-encode it first

```bash
base64 -i whatsapp-flow-private.pem
```

Then store that output in:

```env
WHATSAPP_FLOW_PRIVATE_KEY=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0t...
```

## Upload Public Key In Meta

In WhatsApp Manager / Flow setup:

1. Open your Flow configuration
2. Find the endpoint encryption or public key section
3. Upload the contents of:
   - `whatsapp-flow-public.pem`
4. Save

This uploaded public key is what Meta uses to encrypt Flow endpoint requests to your server.

## Deployment Steps

1. Add `WHATSAPP_FLOW_PRIVATE_KEY` to Vercel production env
2. Redeploy
3. Upload `whatsapp-flow-public.pem` in Meta
4. Configure Flow endpoint URL:
   - `https://www.bindasystem.com/api/whatsapp/flows/record-sale/endpoint`
5. Publish the Flow

## Notes

- The current implementation assumes Meta sends:
  - `encrypted_flow_data`
  - `encrypted_aes_key`
  - `initial_vector`
- The server decrypts the request with your RSA private key
- The server encrypts the response using the same AES key and an inverted IV

## Related Env Keys

- `WHATSAPP_RECORD_SALE_FLOW_ID`
- `WHATSAPP_FLOW_PRIVATE_KEY`
- `WHATSAPP_FLOW_MESSAGE_VERSION`
