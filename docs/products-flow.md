# Products Flow

Use this for the WhatsApp `2 / Products` experience.

## Goal

Keep products inside WhatsApp lightweight:

- show up to `10` active products
- rank by recent usage
- show `name`, `price`, and `stock`
- allow `Add new product`
- allow basic updates for an existing product

This is not full product management. Full product editing can stay in the dashboard later.

## Flow Type

- Use `With Endpoint`
- Flow ID env var:
  - `WHATSAPP_PRODUCTS_FLOW_ID`
- Endpoint URL:
  - `https://www.bindasystem.com/api/whatsapp/flows/products/endpoint`
- Flow token format:
  - `products:<business_id>:<profile_id>`

## Current app routes

- launch and completion handling:
  - [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- endpoint:
  - [app/api/whatsapp/flows/products/endpoint/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/products/endpoint/route.ts:1)
- save handler:
  - [app/api/whatsapp/flows/products/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/products/route.ts:1)

## Flow JSON

Use the complete file here:

- [docs/products-flow-complete.json](/Users/apple/Desktop/Project%20Baby/binda/docs/products-flow-complete.json:1)

## Behavior

1. Vendor sends `2` or `Products`
2. Bot launches the Products Flow
3. Meta calls the endpoint
4. Endpoint returns up to `10` active products plus `Add new product`
5. Vendor either:
   - creates a new product
   - or selects one product and updates it
6. Completed Flow comes back through the main WhatsApp webhook
7. App saves the change in Supabase

## Notes

- `stock_quantity` is optional in the database.
- If stock is empty, the app treats it as `Not tracked`.
- Existing product update screen shows current values in text and accepts optional replacement values.
- This design avoids a heavy catalog manager inside WhatsApp.
