# WhatsApp Flows

## Onboarding Flow Fields

- `businessName`
- `ownerName`
- `phoneNumber`
- `whatsappPhone`
- `categoryId`
- `locationArea`
- `deliveryAvailable`
- `productsServices`
- `profileImageUrl` optional

Submit onboarding data to:

`POST /api/whatsapp/flows/onboarding`

Example payload:

```json
{
  "userId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "businessName": "Amina Cakes",
  "ownerName": "Amina Musa",
  "phoneNumber": "+2348011111111",
  "whatsappPhone": "+2348011111111",
  "categoryId": "11111111-1111-1111-1111-111111111111",
  "locationArea": "Tunga",
  "deliveryAvailable": true,
  "productsServices": "Birthday cakes, dessert cups"
}
```

## Record Sale Flow Fields

- `businessId`
- `customerId` optional
- `recordedBy`
- `paymentStatus`
- `paymentMethod`
- `amountPaid`
- `notes` optional
- `items[]`

Submit sale data to:

`POST /api/whatsapp/flows/record-sale`

Example payload:

```json
{
  "businessId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "customerId": "c1111111-1111-1111-1111-111111111111",
  "recordedBy": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "paymentStatus": "paid",
  "paymentMethod": "transfer",
  "amountPaid": 15000,
  "notes": "Birthday order",
  "items": [
    {
      "productId": "f1111111-1111-1111-1111-111111111111",
      "itemName": "Small Birthday Cake",
      "quantity": 1,
      "unitPrice": 15000
    }
  ]
}
```
