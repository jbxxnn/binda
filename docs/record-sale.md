# Record Sale Flow

Use this for the first WhatsApp Record Sale Flow in Meta.

Current app expectation:

- Flow type: `Without Endpoint`
- Entry screen ID: `RECORD_SALE`
- Returned payload keys:
  - `itemName`
  - `quantity`
  - `unitPrice`
  - `amountPaid`
  - `paymentStatus`
  - `paymentMethod`
  - `notes` optional

Important limitation for this first version:

- This Flow is still static.
- It does not yet load real products or customers from your database inside Meta.
- The backend will still save the sale correctly.
- Later, when we add a Flow endpoint, we can replace free text with live product and customer selectors.

After publishing the Flow:

1. Copy the Flow ID from Meta.
2. Set `WHATSAPP_RECORD_SALE_FLOW_ID` in production.
3. Redeploy.
4. Open WhatsApp and send `1` or `Record Sale`.

## Flow JSON Starter

```json
{
  "version": "7.3",
  "screens": [
    {
      "id": "RECORD_SALE",
      "title": "Record sale",
      "terminal": true,
      "success": true,
      "data": {},
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "recordSaleForm",
            "children": [
              {
                "type": "TextHeading",
                "text": "Record a sale"
              },
              {
                "type": "TextBody",
                "text": "Enter the item sold and money collected."
              },
              {
                "type": "TextInput",
                "name": "itemName",
                "label": "Product or service",
                "required": true,
                "input-type": "text",
                "helper-text": "Example: Chocolate cake"
              },
              {
                "type": "TextInput",
                "name": "quantity",
                "label": "Quantity",
                "required": true,
                "input-type": "number",
                "helper-text": "Example: 2"
              },
              {
                "type": "TextInput",
                "name": "unitPrice",
                "label": "Price per item",
                "required": true,
                "input-type": "number",
                "helper-text": "Example: 5000"
              },
              {
                "type": "TextInput",
                "name": "amountPaid",
                "label": "Money collected now",
                "required": true,
                "input-type": "number",
                "helper-text": "Enter 0 if customer has not paid yet"
              },
              {
                "type": "Dropdown",
                "name": "paymentStatus",
                "label": "Payment status",
                "required": true,
                "data-source": [
                  {
                    "id": "paid",
                    "title": "Paid"
                  },
                  {
                    "id": "partial",
                    "title": "Partial"
                  },
                  {
                    "id": "pending",
                    "title": "Pending"
                  }
                ]
              },
              {
                "type": "Dropdown",
                "name": "paymentMethod",
                "label": "Payment method",
                "required": true,
                "data-source": [
                  {
                    "id": "cash",
                    "title": "Cash"
                  },
                  {
                    "id": "transfer",
                    "title": "Transfer"
                  },
                  {
                    "id": "pos",
                    "title": "POS"
                  }
                ]
              },
              {
                "type": "TextArea",
                "name": "notes",
                "label": "Note (optional)",
                "required": false,
                "helper-text": "Example: Customer will balance tomorrow"
              },
              {
                "type": "Footer",
                "label": "Save sale",
                "on-click-action": {
                  "name": "complete",
                  "payload": {
                    "itemName": "${form.itemName}",
                    "quantity": "${form.quantity}",
                    "unitPrice": "${form.unitPrice}",
                    "amountPaid": "${form.amountPaid}",
                    "paymentStatus": "${form.paymentStatus}",
                    "paymentMethod": "${form.paymentMethod}",
                    "notes": "${form.notes}"
                  }
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Important Notes

- Keep the screen ID as `RECORD_SALE`.
- Keep the payload keys exactly as written above.
- Use `Without Endpoint` for this first Record Sale Flow.
- If Meta rejects `TextArea`, rebuild it in the visual editor with the same field key `notes`.
- The backend calculates total sale from `quantity × unitPrice`.
- `amountPaid` can be:
  - equal to full amount for `paid`
  - less than full amount for `partial`
  - `0` for `pending`

## Matching App Files

- [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- [app/api/whatsapp/flows/record-sale/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/route.ts:1)
