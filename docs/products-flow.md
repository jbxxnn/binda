# Products Flow

Use this for the WhatsApp `2 / Products` manage experience.

## Goal

Keep products inside WhatsApp lightweight:

- use a native WhatsApp list message for picking products
- open a Flow only for `Add product` or `Update product`
- use two separate Flows because Meta does not allow one Flow to start on multiple disconnected screens

This is not full product management. Full product editing can stay in the dashboard later.

## Flow Type

Use `With Endpoint` for both Flows.

Add Product Flow:

- env var:
  - `WHATSAPP_ADD_PRODUCT_FLOW_ID`
- JSON:
  - [docs/add-product-flow.json](/Users/apple/Desktop/Project%20Baby/binda/docs/add-product-flow.json:1)
- flow token format:
  - `add_product:<business_id>:<profile_id>`

Update Product Flow:

- env var:
  - `WHATSAPP_UPDATE_PRODUCT_FLOW_ID`
- JSON:
  - [docs/update-product-flow.json](/Users/apple/Desktop/Project%20Baby/binda/docs/update-product-flow.json:1)
- flow token format:
  - `update_product:<business_id>:<profile_id>:<product_id>`

Shared endpoint URL:

- `https://www.bindasystem.com/api/whatsapp/flows/products/endpoint`

## Current app routes

- launch and completion handling:
  - [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- endpoint:
  - [app/api/whatsapp/flows/products/endpoint/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/products/endpoint/route.ts:1)
- save handler:
  - [app/api/whatsapp/flows/products/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/products/route.ts:1)

## Flow JSON

Use these two files:

- [docs/add-product-flow.json](/Users/apple/Desktop/Project%20Baby/binda/docs/add-product-flow.json:1)
- [docs/update-product-flow.json](/Users/apple/Desktop/Project%20Baby/binda/docs/update-product-flow.json:1)

## Behavior

1. Vendor sends `2` or `Products`
2. Bot shows two reply buttons:
   - `View Products`
   - `Manage Products`
3. If vendor chooses `Manage Products`, bot sends a native interactive list:
   - up to `9` products
   - `Add new product`
4. If vendor taps `Add new product`, bot launches the Add Product Flow
5. If vendor taps an existing product, bot launches the Update Product Flow
6. Meta calls the endpoint on Flow init
7. Endpoint returns either:
   - `NEW_PRODUCT`
   - `UPDATE_PRODUCT`
8. Completed Flow comes back through the main WhatsApp webhook
9. App saves the change in Supabase

## Notes

- `stock_quantity` is optional in the database.
- If stock is empty, the app treats it as `Not tracked`.
- Existing product update screen shows current values in text and accepts optional replacement values.
- `NEW_PRODUCT` and `UPDATE_PRODUCT` live in separate Flows to satisfy Meta's routing validation.
- This design avoids a heavy catalog manager inside WhatsApp.
