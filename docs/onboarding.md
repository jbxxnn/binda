# Onboarding Flow

Use this for the WhatsApp onboarding Flow in Meta.

Current app expectation:

- Flow type: `Without Endpoint`
- Entry screen ID: `BUSINESS_SETUP`
- Returned payload keys:
  - `businessName`
  - `ownerName`
  - `whatsappPhone`
  - `categoryId`
  - `locationArea`
  - `deliveryAvailable`
  - `productsServices`
  - `profileImageUrl`

After publishing the Flow:

1. Copy the Flow ID from Meta.
2. Set `WHATSAPP_ONBOARDING_FLOW_ID` in production.
3. Redeploy.
4. Test with a number that is not already registered.

## Flow JSON Starter

```json
{
  "version": "7.3",
  "screens": [
    {
      "id": "BUSINESS_SETUP",
      "title": "Set up your business",
      "terminal": true,
      "success": true,
      "data": {
        "whatsappPhone": {
          "type": "string",
          "__example__": "+2348012345678"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "businessSetupForm",
            "children": [
              {
                "type": "TextHeading",
                "text": "Set up your business"
              },
              {
                "type": "TextBody",
                "text": "Tell us about your business so Binda can help you record sales and track customers."
              },
              {
                "type": "TextInput",
                "name": "businessName",
                "label": "Business name",
                "required": true,
                "input-type": "text",
                "helper-text": "Example: Amina Cakes"
              },
              {
                "type": "TextInput",
                "name": "ownerName",
                "label": "Owner name",
                "required": true,
                "input-type": "text",
                "helper-text": "Example: Amina Musa"
              },
              {
                "type": "TextInput",
                "name": "whatsappPhone",
                "label": "WhatsApp number",
                "required": true,
                "input-type": "phone",
                "init-value": "${data.whatsappPhone}",
                "helper-text": "Use full number format"
              },
              {
                "type": "Dropdown",
                "name": "categoryId",
                "label": "Business category",
                "required": true,
                "data-source": [
                  {
                    "id": "11111111-1111-1111-1111-111111111111",
                    "title": "Food"
                  },
                  {
                    "id": "22222222-2222-2222-2222-222222222222",
                    "title": "Fashion"
                  },
                  {
                    "id": "33333333-3333-3333-3333-333333333333",
                    "title": "Beauty"
                  },
                  {
                    "id": "44444444-4444-4444-4444-444444444444",
                    "title": "Services"
                  }
                ]
              },
              {
                "type": "Dropdown",
                "name": "locationArea",
                "label": "Area in Minna",
                "required": true,
                "data-source": [
                  {
                    "id": "Tunga",
                    "title": "Tunga"
                  },
                  {
                    "id": "Bosso",
                    "title": "Bosso"
                  },
                  {
                    "id": "Chanchaga",
                    "title": "Chanchaga"
                  },
                  {
                    "id": "Maitumbi",
                    "title": "Maitumbi"
                  },
                  {
                    "id": "Kpakungu",
                    "title": "Kpakungu"
                  },
                  {
                    "id": "Gidan Kwano",
                    "title": "Gidan Kwano"
                  }
                ]
              },
              {
                "type": "RadioButtonsGroup",
                "name": "deliveryAvailable",
                "label": "Do you deliver?",
                "required": true,
                "data-source": [
                  {
                    "id": "true",
                    "title": "Yes"
                  },
                  {
                    "id": "false",
                    "title": "No"
                  }
                ]
              },
              {
                "type": "TextArea",
                "name": "productsServices",
                "label": "What do you sell?",
                "required": true,
                "helper-text": "Example: Birthday cakes, dessert cups, small chops"
              },
              {
                "type": "TextInput",
                "name": "profileImageUrl",
                "label": "Business image link (optional)",
                "required": false,
                "input-type": "text"
              },
              {
                "type": "Footer",
                "label": "Finish setup",
                "on-click-action": {
                  "name": "complete",
                  "payload": {
                    "businessName": "${form.businessName}",
                    "ownerName": "${form.ownerName}",
                    "whatsappPhone": "${form.whatsappPhone}",
                    "categoryId": "${form.categoryId}",
                    "locationArea": "${form.locationArea}",
                    "deliveryAvailable": "${form.deliveryAvailable}",
                    "productsServices": "${form.productsServices}",
                    "profileImageUrl": "${form.profileImageUrl}"
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

- Keep the screen ID as `BUSINESS_SETUP`.
- Keep the payload keys exactly as written above.
- Use `Without Endpoint` for this onboarding Flow.
- `whatsappPhone` should be the only number field in the Flow.
- The app launch already sends the sender's current WhatsApp number as `data.whatsappPhone`, so use that as the field's initial value if Meta accepts `init-value` in your editor.
- Keep the fields and submit footer inside a `Form` container so `${form...}` bindings resolve correctly on submit.
- If Meta's editor rejects a control name like `RadioButtonsGroup` or `TextArea`, rebuild that field in the visual editor but keep the same field key.

## Matching App Files

- [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- [app/api/whatsapp/flows/onboarding/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/onboarding/route.ts:1)
