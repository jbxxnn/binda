# Onboarding Flow

Use this for the WhatsApp onboarding Flow in Meta.

Current app expectation:

- Flow type: `Without Endpoint`
- Entry screen ID: `BUSINESS_SETUP`
- Returned payload keys:
  - `businessName`
  - `ownerName`
  - `whatsappPhone`
  - `email` optional
  - `password` optional
  - `accessPin` optional
  - `categoryId`
  - `locationArea`
  - `otherLocationArea` optional
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
      "terminal": false,
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
                    "id": "773f0b14-1a00-41f0-95b9-4aa925391512",
                    "title": "Agriculture"
                  },
                  {
                    "id": "c81c0e5e-32f1-433d-bb14-f7c8cf96dc62",
                    "title": "Beauty"
                  },
                  {
                    "id": "55ccfbfa-16a2-4243-aa64-9f355b23e32e",
                    "title": "Education"
                  },
                  {
                    "id": "9e4ef1ad-8d76-4ec3-b9d4-8af0e70f35c7",
                    "title": "Electronics"
                  },
                  {
                    "id": "25461066-23b8-4717-85ed-2410011dcd3a",
                    "title": "Events"
                  },
                  {
                    "id": "020ce626-c3a9-47ef-8a0b-d5ca782ce038",
                    "title": "Fashion"
                  },
                  {
                    "id": "e9e32f5c-7935-4f3d-9c57-0267e94caf5c",
                    "title": "Food"
                  },
                  {
                    "id": "64888493-2305-4903-8388-0acd63198256",
                    "title": "Health"
                  },
                  {
                    "id": "ced6f5ca-03f9-469d-a7df-5e8c6c2fcee8",
                    "title": "Home Goods"
                  },
                  {
                    "id": "59aaec58-6b90-4813-84f4-25e3f65ea3c4",
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
                    "id": "a2290938-42d3-4deb-b06b-fab87fcbc81e",
                    "title": "Barkin Sale"
                  },
                  {
                    "id": "0f21f571-da02-4ca3-aedb-d451e1d3189d",
                    "title": "Bosso"
                  },
                  {
                    "id": "32bb5a67-0266-4d64-b46e-27dd1c248251",
                    "title": "Chanchaga"
                  },
                  {
                    "id": "1519223a-1a35-4be3-8d7b-bcbc717e2910",
                    "title": "City Gate"
                  },
                  {
                    "id": "761efdf8-771c-478a-8b7a-df594b6a880a",
                    "title": "Dutsen Kura"
                  },
                  {
                    "id": "1755f019-164b-40cd-a0b2-6eb9345479a6",
                    "title": "Gidan Kwano"
                  },
                  {
                    "id": "a32f47a8-b33b-46a8-855d-76a2f0ab7696",
                    "title": "Keteren Gwari"
                  },
                  {
                    "id": "2bb3c671-5914-4219-9b23-7dde0d8ab430",
                    "title": "Kpakungu"
                  },
                  {
                    "id": "47144dcc-7d67-4ad5-85c1-725c917512c0",
                    "title": "Limawa"
                  },
                  {
                    "id": "dc5bb500-78bc-4612-b7b3-df5bea45d999",
                    "title": "Maitumbi"
                  },
                  {
                    "id": "e8e39013-d6b2-49fc-9a5f-61eb11dd1d56",
                    "title": "Mobil"
                  },
                  {
                    "id": "4301e0ac-2078-45af-9c7f-c941284429b3",
                    "title": "Paiko Road"
                  },
                  {
                    "id": "87f5d02b-f46d-4bd6-bee1-a447fea6ecff",
                    "title": "Sauka Kahuta"
                  },
                  {
                    "id": "4551b82f-3232-40ad-bde9-9bb0893301b2",
                    "title": "Shango"
                  },
                  {
                    "id": "e5a02095-ba6e-4278-a886-19b930802cd9",
                    "title": "Tunga"
                  },
                  {
                    "id": "a773097e-7ca4-4493-8632-157248c87a7c",
                    "title": "Other"
                  }
                ]
              },
              {
                "type": "TextInput",
                "name": "otherLocationArea",
                "label": "If you selected Other, type your area",
                "required": false,
                "input-type": "text",
                "helper-text": "Example: Mandela Road"
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
                "label": "Next",
                "on-click-action": {
                  "name": "navigate",
                  "next": {
                    "type": "screen",
                    "name": "ACCOUNT_SETUP"
                  },
                  "payload": {
                    "businessName": "${form.businessName}",
                    "ownerName": "${form.ownerName}",
                    "whatsappPhone": "${form.whatsappPhone}",
                    "categoryId": "${form.categoryId}",
                    "locationArea": "${form.locationArea}",
                    "otherLocationArea": "${form.otherLocationArea}",
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
    },
    {
      "id": "ACCOUNT_SETUP",
      "title": "Create your account",
      "terminal": true,
      "success": true,
      "data": {
        "whatsappPhone": {
          "type": "string",
          "__example__": "+2348012345678"
        },
        "businessName": {
          "type": "string",
          "__example__": "Amina Cakes"
        },
        "ownerName": {
          "type": "string",
          "__example__": "Amina Musa"
        },
        "categoryId": {
          "type": "string",
          "__example__": "e9e32f5c-7935-4f3d-9c57-0267e94caf5c"
        },
        "locationArea": {
          "type": "string",
          "__example__": "Tunga"
        },
        "otherLocationArea": {
          "type": "string",
          "__example__": "Mandela Road"
        },
        "deliveryAvailable": {
          "type": "string",
          "__example__": "true"
        },
        "productsServices": {
          "type": "string",
          "__example__": "Birthday cakes, dessert cups"
        },
        "profileImageUrl": {
          "type": "string",
          "__example__": "https://example.com/image.jpg"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "accountSetupForm",
            "children": [
              {
                "type": "TextHeading",
                "text": "Create your account"
              },
              {
                "type": "TextBody",
                "text": "Add an email and password so you can sign in to your dashboard after setup."
              },
              {
                "type": "TextInput",
                "name": "email",
                "label": "Email address",
                "required": true,
                "input-type": "email",
                "helper-text": "Use an email you can sign in with"
              },
              {
                "type": "TextInput",
                "name": "password",
                "label": "Password",
                "required": true,
                "input-type": "password",
                "helper-text": "Use at least 8 characters"
              },
              {
                "type": "TextInput",
                "name": "accessPin",
                "label": "4-digit WhatsApp PIN",
                "required": true,
                "input-type": "number",
                "helper-text": "Use this PIN to approve WhatsApp actions"
              },
              {
                "type": "Footer",
                "label": "Finish setup",
                "on-click-action": {
                  "name": "complete",
                  "payload": {
                    "businessName": "${data.businessName}",
                    "ownerName": "${data.ownerName}",
                    "whatsappPhone": "${data.whatsappPhone}",
                    "email": "${form.email}",
                    "password": "${form.password}",
                    "accessPin": "${form.accessPin}",
                    "categoryId": "${data.categoryId}",
                    "locationArea": "${data.locationArea}",
                    "otherLocationArea": "${data.otherLocationArea}",
                    "deliveryAvailable": "${data.deliveryAvailable}",
                    "productsServices": "${data.productsServices}",
                    "profileImageUrl": "${data.profileImageUrl}"
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
- The backend saves WhatsApp numbers in one canonical format: `2348034310997`.
- These inputs all save to the same value: `08034310997`, `8034310997`, `2348034310997`, `+2348034310997`.
- Add a second screen for account creation with `email` and `password`.
- Add a 4-digit `accessPin` on the account screen. The backend stores a secure hash and uses it to verify WhatsApp actions.
- The app launch already sends the sender's current WhatsApp number as `data.whatsappPhone`, so use that as the field's initial value if Meta accepts `init-value` in your editor.
- Keep the fields and submit footer inside a `Form` container so `${form...}` bindings resolve correctly on submit.
- If `locationArea` is `Other`, the backend will store `otherLocationArea` instead.
- If Meta's editor rejects a control name like `RadioButtonsGroup` or `TextArea`, rebuild that field in the visual editor but keep the same field key.

## WhatsApp PIN Commands

- First-time setup fallback for existing vendors:
  - `SET PIN 1234`
- Verify after the PIN session expires:
  - `PIN 1234`
- Lock the current WhatsApp session:
  - `LOCK`

The session timeout is controlled by `WHATSAPP_PIN_SESSION_MINUTES`.

## Matching App Files

- [app/api/whatsapp/webhook/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/webhook/route.ts:1)
- [app/api/whatsapp/flows/onboarding/route.ts](/Users/apple/Desktop/Project%20Baby/binda/app/api/whatsapp/flows/onboarding/route.ts:1)
