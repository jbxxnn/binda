# WhatsApp Integration Notes

## What is implemented

- Webhook verification with `hub.verify_token`
- Webhook signature validation with `x-hub-signature-256`
- Vendor command routing from incoming WhatsApp messages
- Flow launch helpers for onboarding and sale recording
- Flow completion handling from `interactive.nfm_reply.response_json`

## Message behavior

- Unknown phone number:
  - tries to send onboarding Flow
  - falls back to a plain text setup message if no onboarding Flow ID is configured
- Known vendor:
  - `menu`, `start`, `hi`, `hello`, `help` show the business menu
  - `1` or `record sale` launches the record sale Flow if configured
  - `2` or `products` launches the products Flow if configured
  - `3` or `customers` sends the customers dashboard link
  - `4` or `reports` sends a quick report
  - `5` or `profile` sends business profile details
  - `6` or `settings` sends the settings link

## Required environment variables

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ONBOARDING_FLOW_ID`
- `WHATSAPP_RECORD_SALE_FLOW_ID`
- `WHATSAPP_PRODUCTS_FLOW_ID`
- `WHATSAPP_FLOW_MESSAGE_VERSION`

Current published Record Sale Flow ID:

- `1028448836252389`

## Flow token format

- Onboarding:
  - `onboarding:<whatsapp_number>`
- Record sale:
  - `record_sale:<business_id>:<profile_id>`
- Products:
  - `products:<business_id>:<profile_id>`

These tokens are used when a completed Flow comes back through the webhook so the app can decide what to save.

## Encrypted Flow Endpoint

The project now includes an encrypted `With Endpoint` Flow route for Record Sale:

- `POST /api/whatsapp/flows/record-sale/endpoint`

And for Products:

- `POST /api/whatsapp/flows/products/endpoint`

It supports:

- Meta-encrypted Flow endpoint requests
- plain JSON fallback for local testing

Setup guide:

- [docs/whatsapp-flow-encryption.md](/Users/apple/Desktop/Project%20Baby/binda/docs/whatsapp-flow-encryption.md:1)

## Current reference points

- Meta Flows guide says completed Flow data is returned to the message webhook as `interactive.nfm_reply.response_json`.
- Meta notes the Flow response does not include the Flow ID, so `flow_token` should be used to identify the Flow instance.
