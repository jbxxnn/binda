# Record Sale Flow Endpoint Spec

Use this as the implementation target for the low-cost dynamic Record Sale Flow.

This is the next version after the current static Flow in [docs/record-sale.md](/Users/apple/Desktop/Project%20Baby/binda/docs/record-sale.md:1).

## Goal

Keep sale recording:

- fast for vendors
- cheap to operate at scale
- flexible when a product or customer does not already exist

## Operating Model

For each sale:

1. Vendor sends `1` or `Record Sale`
2. App sends one WhatsApp Flow message
3. Meta calls one Flow endpoint for dynamic data
4. Vendor submits once
5. App saves the sale
6. Bot sends one confirmation message

Avoid:

- multi-message sale wizards
- large catalog fetches
- AI parsing
- repeated Graph API calls for one sale

## Flow Type

- Use `With Endpoint`
- Entry screen ID: `SALE_MODE`
- Flow token format:
  - `record_sale:{businessId}:{recordedBy}`

## Endpoint Design

Create a new route:

- `POST /api/whatsapp/flows/record-sale/endpoint`

Purpose:

- return small dynamic option lists for products and customers
- drive screen-to-screen Flow transitions
- keep responses deterministic and cheap

Production endpoint URL:

- `https://www.bindasystem.com/api/whatsapp/flows/record-sale/endpoint`

## Data Limits

To keep cost and latency low, the endpoint should return only:

- up to `10` active products
- up to `20` recent customers

Recommended sort:

- products: most recently used first, then highest recent value, then name
- customers: most recent purchase first, then highest spend, then name

Fallbacks must always be present:

- `NEW_ITEM`
- `NEW_CUSTOMER`

## Screen Structure

### 1. `SELECT_PRODUCT`

Purpose:

- let vendor choose from a small list of active products or choose `New product`

Fields:

- `productId`
  - existing product ID values
  - `NEW_PRODUCT`

Data source:

- product options returned by endpoint

Next:

- if existing product selected -> `CUSTOMER_SELECT`
- if `NEW_PRODUCT` -> `NEW_PRODUCT`

### 2. `NEW_PRODUCT`

Purpose:

- allow vendor to enter a product that does not exist yet

Fields:

- `itemName`
- `unitPrice`
- `saveAsProduct`
  - `yes`
  - `no`

Next:

- `CUSTOMER_SELECT`

### 3. `CUSTOMER_SELECT`

Purpose:

- choose existing customer or create a new one

Fields:

- `customerMode`
  - existing customer ID values
  - `NEW_CUSTOMER`

Next:

- if existing customer selected -> `PAYMENT_DETAILS`
- if `NEW_CUSTOMER` -> `NEW_CUSTOMER`

### 4. `NEW_CUSTOMER`

Purpose:

- create a new customer inline without leaving WhatsApp

Fields:

- `customerName`
- `customerPhone` optional

Next:

- `PAYMENT_DETAILS`

### 5. `PAYMENT_DETAILS`

Purpose:

- collect final sale values

Fields:

- `quantity`
- `amountPaid`
- `paymentStatus`
  - `paid`
  - `partial`
  - `pending`
- `paymentMethod`
  - `cash`
  - `transfer`
  - `pos`
- `notes` optional

Derived values:

- total = `quantity × unitPrice`
- pending = `max(total - amountPaid, 0)`

Submit:

- `complete`

## Final Payload Contract

The Flow should submit this payload shape back through the WhatsApp webhook:

```json
{
  "productId": "11111111-1111-1111-1111-111111111111",
  "itemName": "Small Birthday Cake",
  "unitPrice": "15000",
  "saveAsProduct": "no",
  "customerMode": "8c8b0d88-4bf8-4d7a-9680-b5b7090f31b5",
  "customerId": "8c8b0d88-4bf8-4d7a-9680-b5b7090f31b5",
  "customerName": "",
  "customerPhone": "",
  "quantity": "1",
  "amountPaid": "15000",
  "paymentStatus": "paid",
  "paymentMethod": "transfer",
  "notes": "Birthday order"
}
```

For a new item and new customer:

```json
{
  "productId": "NEW_PRODUCT",
  "itemName": "Samosa tray",
  "unitPrice": "7000",
  "saveAsProduct": "yes",
  "customerMode": "NEW_CUSTOMER",
  "customerId": "",
  "customerName": "Hauwa Bello",
  "customerPhone": "2348034310997",
  "quantity": "1",
  "amountPaid": "3000",
  "paymentStatus": "partial",
  "paymentMethod": "cash",
  "notes": "Balance tomorrow"
}
```

## Endpoint Response Contract

The endpoint should return only what the next screen needs.

Example bootstrap response:

```json
{
  "screen": "SELECT_PRODUCT",
  "data": {
    "productOptions": [
      { "id": "NEW_PRODUCT", "title": "New product" },
      { "id": "11111111-1111-1111-1111-111111111111", "title": "Small Birthday Cake - 15000" },
      { "id": "22222222-2222-2222-2222-222222222222", "title": "Dessert Cup - 2500" }
    ],
    "customerOptions": [
      { "id": "NEW_CUSTOMER", "title": "New customer" },
      { "id": "8c8b0d88-4bf8-4d7a-9680-b5b7090f31b5", "title": "Hauwa Bello" },
      { "id": "7f60d9cc-0d81-4d35-8a1b-e39a1245f53a", "title": "Musa Stores" }
    ]
  }
}
```

## Meta Builder Setup

Create a new Flow in Meta with:

- Name: `Binda Record Sale`
- Type: `With Endpoint`
- Endpoint URL:
  - `https://www.bindasystem.com/api/whatsapp/flows/record-sale/endpoint`
- Entry screen:
  - `SALE_MODE`

Use the endpoint-driven approach for these parts:

- product list
- customer list
- screen transitions
- submit payload

Keep the exact field keys below aligned with the app code. Those keys are what the webhook and save route already expect.

## Meta Flow Field Keys

Use these exact names:

- `saleMode`
- `productId`
- `itemName`
- `unitPrice`
- `saveAsProduct`
- `customerMode`
- `customerId`
- `customerName`
- `customerPhone`
- `quantity`
- `amountPaid`
- `paymentStatus`
- `paymentMethod`
- `notes`

## Meta Flow JSON Starter

This is a builder starter for the `With Endpoint` version.

Important:

- treat this as the structure to recreate in Meta
- if Meta rejects a component type or property name, rebuild that control in the visual editor
- keep the same screen IDs and field keys
- keep the final submit payload exactly aligned

```json
{
  "version": "7.3",
  "data_api_version": "3.0",
  "routing_model": {
    "SALE_MODE": ["SELECT_PRODUCT", "NEW_ITEM"],
    "SELECT_PRODUCT": ["CUSTOMER_SELECT"],
    "NEW_ITEM": ["CUSTOMER_SELECT"],
    "CUSTOMER_SELECT": ["NEW_CUSTOMER", "PAYMENT_DETAILS"],
    "NEW_CUSTOMER": ["PAYMENT_DETAILS"],
    "PAYMENT_DETAILS": []
  },
  "screens": [
    {
      "id": "SALE_MODE",
      "title": "Record sale",
      "data": {
        "productOptions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" }
            }
          },
          "__example__": [
            { "id": "NEW_ITEM", "title": "Enter new item" },
            { "id": "11111111-1111-1111-1111-111111111111", "title": "Small Cake - 15000" }
          ]
        },
        "customerOptions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" }
            }
          },
          "__example__": [
            { "id": "NEW_CUSTOMER", "title": "New customer" },
            { "id": "22222222-2222-2222-2222-222222222222", "title": "Hauwa Bello" }
          ]
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "saleModeForm",
            "children": [
              {
                "type": "TextHeading",
                "text": "Record a sale"
              },
              {
                "type": "TextBody",
                "text": "Choose a saved product or enter a new item."
              },
              {
                "type": "Dropdown",
                "name": "saleMode",
                "label": "How do you want to record this sale?",
                "required": true,
                "data-source": [
                  {
                    "id": "existing_product",
                    "title": "Choose existing product"
                  },
                  {
                    "id": "new_item",
                    "title": "Enter new item"
                  }
                ]
              },
              {
                "type": "Footer",
                "label": "Continue",
                "on-click-action": {
                  "name": "data_exchange",
                  "payload": {
                    "saleMode": "${form.saleMode}"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "id": "SELECT_PRODUCT",
      "title": "Choose product",
      "data": {
        "productOptions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" }
            }
          },
          "__example__": [
            { "id": "NEW_ITEM", "title": "Enter new item" },
            { "id": "11111111-1111-1111-1111-111111111111", "title": "Small Cake - 15000" }
          ]
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "selectProductForm",
            "children": [
              {
                "type": "Dropdown",
                "name": "productId",
                "label": "Choose product",
                "required": true,
                "data-source": "${data.productOptions}"
              },
              {
                "type": "Footer",
                "label": "Continue",
                "on-click-action": {
                  "name": "data_exchange",
                  "payload": {
                    "saleMode": "existing_product",
                    "productId": "${form.productId}"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "id": "NEW_ITEM",
      "title": "New item",
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "newItemForm",
            "children": [
              {
                "type": "TextInput",
                "name": "itemName",
                "label": "Item name",
                "required": true,
                "input-type": "text"
              },
              {
                "type": "TextInput",
                "name": "unitPrice",
                "label": "Price per item",
                "required": true,
                "input-type": "number"
              },
              {
                "type": "RadioButtonsGroup",
                "name": "saveAsProduct",
                "label": "Save this for future use?",
                "required": true,
                "data-source": [
                  { "id": "yes", "title": "Yes" },
                  { "id": "no", "title": "No" }
                ]
              },
              {
                "type": "Footer",
                "label": "Continue",
                "on-click-action": {
                  "name": "navigate",
                  "next": {
                    "type": "screen",
                    "name": "CUSTOMER_SELECT"
                  },
                  "payload": {
                    "saleMode": "new_item",
                    "itemName": "${form.itemName}",
                    "unitPrice": "${form.unitPrice}",
                    "saveAsProduct": "${form.saveAsProduct}"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "id": "CUSTOMER_SELECT",
      "title": "Choose customer",
      "data": {
        "customerOptions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" }
            }
          },
          "__example__": [
            { "id": "NEW_CUSTOMER", "title": "New customer" },
            { "id": "22222222-2222-2222-2222-222222222222", "title": "Hauwa Bello" }
          ]
        },
        "saleMode": {
          "type": "string",
          "__example__": "new_item"
        },
        "productId": {
          "type": "string",
          "__example__": "11111111-1111-1111-1111-111111111111"
        },
        "itemName": {
          "type": "string",
          "__example__": "Samosa tray"
        },
        "unitPrice": {
          "type": "string",
          "__example__": "7000"
        },
        "saveAsProduct": {
          "type": "string",
          "__example__": "yes"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "customerSelectForm",
            "children": [
              {
                "type": "Dropdown",
                "name": "customerMode",
                "label": "Choose customer",
                "required": true,
                "data-source": "${data.customerOptions}"
              },
              {
                "type": "Footer",
                "label": "Continue",
                "on-click-action": {
                  "name": "data_exchange",
                  "payload": {
                    "saleMode": "${data.saleMode}",
                    "productId": "${data.productId}",
                    "itemName": "${data.itemName}",
                    "unitPrice": "${data.unitPrice}",
                    "saveAsProduct": "${data.saveAsProduct}",
                    "customerMode": "${form.customerMode}"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "id": "NEW_CUSTOMER",
      "title": "New customer",
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "newCustomerForm",
            "children": [
              {
                "type": "TextInput",
                "name": "customerName",
                "label": "Customer name",
                "required": true,
                "input-type": "text"
              },
              {
                "type": "TextInput",
                "name": "customerPhone",
                "label": "Customer phone (optional)",
                "required": false,
                "input-type": "phone"
              },
              {
                "type": "Footer",
                "label": "Continue",
                "on-click-action": {
                  "name": "navigate",
                  "next": {
                    "type": "screen",
                    "name": "PAYMENT_DETAILS"
                  },
                  "payload": {
                    "customerMode": "NEW_CUSTOMER",
                    "customerId": "",
                    "customerName": "${form.customerName}",
                    "customerPhone": "${form.customerPhone}"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "id": "PAYMENT_DETAILS",
      "title": "Payment details",
      "terminal": true,
      "success": true,
      "data": {
        "saleMode": {
          "type": "string",
          "__example__": "existing_product"
        },
        "productId": {
          "type": "string",
          "__example__": "11111111-1111-1111-1111-111111111111"
        },
        "itemName": {
          "type": "string",
          "__example__": "Small Birthday Cake"
        },
        "unitPrice": {
          "type": "string",
          "__example__": "15000"
        },
        "saveAsProduct": {
          "type": "string",
          "__example__": "no"
        },
        "customerMode": {
          "type": "string",
          "__example__": "NEW_CUSTOMER"
        },
        "customerId": {
          "type": "string",
          "__example__": ""
        },
        "customerName": {
          "type": "string",
          "__example__": "Hauwa Bello"
        },
        "customerPhone": {
          "type": "string",
          "__example__": "2348034310997"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "paymentDetailsForm",
            "children": [
              {
                "type": "TextInput",
                "name": "quantity",
                "label": "Quantity",
                "required": true,
                "input-type": "number"
              },
              {
                "type": "TextInput",
                "name": "amountPaid",
                "label": "Money collected now",
                "required": true,
                "input-type": "number"
              },
              {
                "type": "Dropdown",
                "name": "paymentStatus",
                "label": "Payment status",
                "required": true,
                "data-source": [
                  { "id": "paid", "title": "Paid" },
                  { "id": "partial", "title": "Partial" },
                  { "id": "pending", "title": "Pending" }
                ]
              },
              {
                "type": "Dropdown",
                "name": "paymentMethod",
                "label": "Payment method",
                "required": true,
                "data-source": [
                  { "id": "cash", "title": "Cash" },
                  { "id": "transfer", "title": "Transfer" },
                  { "id": "pos", "title": "POS" }
                ]
              },
              {
                "type": "TextArea",
                "name": "notes",
                "label": "Note (optional)",
                "required": false
              },
              {
                "type": "Footer",
                "label": "Save sale",
                "on-click-action": {
                  "name": "complete",
                  "payload": {
                    "saleMode": "${data.saleMode}",
                    "productId": "${data.productId}",
                    "itemName": "${data.itemName}",
                    "unitPrice": "${data.unitPrice}",
                    "saveAsProduct": "${data.saveAsProduct}",
                    "customerMode": "${data.customerMode}",
                    "customerId": "${data.customerId}",
                    "customerName": "${data.customerName}",
                    "customerPhone": "${data.customerPhone}",
                    "quantity": "${form.quantity}",
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

## Practical Builder Notes

- The backend endpoint already exists at [app/api/whatsapp/flows/record-sale/endpoint/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/endpoint/route.ts:1).
- The save route already accepts the final payload at [app/api/whatsapp/flows/record-sale/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/route.ts:1).
- If Meta rejects `TextArea`, rebuild it visually and keep the field name `notes`.
- If Meta rejects direct `"${data.productOptions}"` or `"${data.customerOptions}"` assignment, bind those controls in the visual editor using the same field keys and endpoint data objects.
- The most important things to preserve are:
  - screen IDs
  - field names
  - final `complete` payload keys

## Backend Save Rules

Extend [app/api/whatsapp/flows/record-sale/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/route.ts:1) to support these cases.

### Existing product

- verify `productId` belongs to the business
- use selected product name and price as defaults
- allow submitted `unitPrice` override

### New product + save as product = `yes`

- create new `products` row
- use new `product_id` in `transaction_items`

### New product + save as product = `no`

- create `transaction_items` row with `product_id = null`

### Existing customer

- verify `customerId` belongs to the business

### New customer

- create `customers` row first
- normalize `customerPhone` to `234XXXXXXXXXX` if provided

## Validation Rules

- `itemName` minimum 2 chars
- `quantity` must be positive
- `unitPrice` must be 0 or more
- `amountPaid` must be 0 or more
- `amountPaid` must not exceed total unless you explicitly want overpayment support
- if `paymentStatus = paid`, `amountPaid` should equal total
- if `paymentStatus = pending`, `amountPaid` should be `0`
- if `paymentStatus = partial`, `amountPaid` should be greater than `0` and less than total

## Security Rules

- trust only the server-decoded `flow_token` for `businessId` and `recordedBy`
- never trust business or user IDs coming from editable Flow fields
- verify selected product/customer belongs to the business before saving
- keep this endpoint server-side only with admin Supabase client
- continue validating WhatsApp webhook signatures

## Implementation Sequence

### Phase 1

- add endpoint route
- return capped product/customer lists
- keep save route simple

### Phase 2

- extend save route for:
  - `saveAsProduct`
  - `NEW_CUSTOMER`
  - product/customer ownership checks

### Phase 3

- update webhook Flow completion logic
- launch the new `With Endpoint` Flow instead of the static one

## Matching App Files

- [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- [app/api/whatsapp/flows/record-sale/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/record-sale/route.ts:1)
- [docs/record-sale.md](/Users/apple/Desktop/Project%20Baby/binda/docs/record-sale.md:1)
