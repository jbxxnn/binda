# WhatsApp Integration Notes

## What is implemented

- Webhook verification with `hub.verify_token`
- Webhook signature validation with `x-hub-signature-256`
- Vendor command routing from incoming WhatsApp messages
- Flow launch helpers for onboarding, sale recording, and feedback
- Flow completion handling from `interactive.nfm_reply.response_json`

## Message behavior

- Unknown phone number:
  - tries to send onboarding Flow
  - falls back to a plain text setup message if no onboarding Flow ID is configured
- Known vendor:
  - `menu`, `start`, `hi`, `hello`, `help` show the business menu
  - slash commands, Ice Breakers, PIN actions, and interactive replies trigger their specific handlers
  - any other free text falls back to the vendor menu

## Supported Slash Commands

The bot also supports these exact text commands:

- `/sale`
- `/products`
- `/reports`
- `/feedback`

Current routing:

- `/sale`
  - launches the Record Sale Flow
- `/products`
  - opens the product view list
- `/reports`
  - sends today's business report
- `/feedback`
  - opens the Feedback Flow

## Recommended Ice Breakers

Configure these exact phrases in WhatsApp Manager:

- `Register my business`
- `Record a sale`
- `View products`
- `Business help`

Current routing:

- `Register my business`
  - unknown contact: opens onboarding
  - known vendor: explains that the business is already linked
- `Record a sale`
  - launches the Record Sale Flow
- `View products`
  - opens the product view list directly
- `Business help`
  - shows the vendor menu

## Required environment variables

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ONBOARDING_FLOW_ID`
- `WHATSAPP_RECORD_SALE_FLOW_ID`
- `WHATSAPP_ADD_PRODUCT_FLOW_ID`
- `WHATSAPP_UPDATE_PRODUCT_FLOW_ID`
- `WHATSAPP_FEEDBACK_FLOW_ID`
- `WHATSAPP_FLOW_MESSAGE_VERSION`

Current published Record Sale Flow ID:

- `1028448836252389`

## Flow token format

- Onboarding:
  - `onboarding:<whatsapp_number>`
- Record sale:
  - `record_sale:<business_id>:<profile_id>`
- Add product:
  - `add_product:<business_id>:<profile_id>`
- Update product:
  - `update_product:<business_id>:<profile_id>:<product_id>`
- Feedback:
  - `feedback:<business_id>:<profile_id>`

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
