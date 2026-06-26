# WhatsApp Flows API Guide (Create, Update & Publish)

This guide documents the process of creating, updating, and publishing WhatsApp Flows using the Meta Graph API and Postman. This approach avoids relying on the Meta Flow Builder UI, which can sometimes fail with UI-specific errors (e.g. `Property TextEncoder doesn't exist`).

---

# Requirements

Before starting, ensure you have:

* Meta Developer App
* WhatsApp Business Account (WABA)
* Access Token with `whatsapp_business_management`
* WABA ID
* Flow JSON file
* (Optional) Endpoint URL for Data Exchange Flows

Current API Version:

```
v25.0
```

---

# Base URL

```
https://graph.facebook.com/v25.0
```

---

# Authentication

Every request uses:

Authorization

```
Bearer YOUR_ACCESS_TOKEN
```

---

# Create a New Flow

### Endpoint

```
POST /{WABA_ID}/flows
```

Example

```
POST https://graph.facebook.com/v25.0/WABA_ID/flows
```

Headers

```
Content-Type: application/json
```

Body

```json
{
  "name": "Record Sale",
  "categories": ["OTHER"],
  "flow_json": {
    // Entire Flow JSON goes here
  }
}
```

Successful response

```json
{
    "id": "FLOW_ID",
    "success": true,
    "validation_errors": []
}
```

Save the returned Flow ID.

---

# Configure Endpoint (Only for Data Exchange Flows)

Skip this step for flows that do not use Data Exchange.

Endpoint

```
POST /{FLOW_ID}
```

Example

```
POST https://graph.facebook.com/v25.0/FLOW_ID
```

Body

```json
{
  "endpoint_uri": "https://your-domain.com/api/whatsapp/flows/endpoint"
}
```

Successful response

```json
{
    "success": true
}
```

---

# Publish Flow

Endpoint

```
POST /{FLOW_ID}/publish
```

Example

```
POST https://graph.facebook.com/v25.0/FLOW_ID/publish
```

No request body is required.

Successful response

```json
{
    "success": true
}
```

---

# Update an Existing Flow

Updating does **not** require creating a new Flow.

Upload a new Flow JSON asset to the existing Flow.

Endpoint

```
POST /{FLOW_ID}/assets
```

Example

```
POST https://graph.facebook.com/v25.0/FLOW_ID/assets
```

Body

Choose:

```
form-data
```

Fields

| Key        | Type | Value     |
| ---------- | ---- | --------- |
| file       | File | flow.json |
| name       | Text | flow.json |
| asset_type | Text | FLOW_JSON |

Successful response

```json
{
    "success": true,
    "validation_errors": []
}
```

If validation errors exist, they will be returned without preventing the upload.

Example

```json
{
    "success": true,
    "validation_errors": [
        {
            "error": "...",
            "message": "..."
        }
    ]
}
```

Fix the reported issues and upload again.

---

# Publish Updated Flow

After successfully updating the Flow JSON, publish again.

Endpoint

```
POST /{FLOW_ID}/publish
```

No body required.

Successful response

```json
{
    "success": true
}
```

---

# Deprecate a Flow

Published flows cannot be deleted.

They can only be deprecated.

Endpoint

```
POST /{FLOW_ID}/deprecate
```

Example

```
POST https://graph.facebook.com/v25.0/FLOW_ID/deprecate
```

No request body required.

---

# Common Validation Errors

### Property not allowed

Example

```
Property 'init-value' is not allowed in 'TextInput'
```

Solution

Remove the unsupported property from the component.

---

### Missing Terminal Screen

Example

```
MISSING_TERMINAL_SCREEN
```

Solution

Ensure one screen contains:

```json
{
    "terminal": true,
    "success": true
}
```

---

### Validation Errors

The Graph API validates Flow JSON during both creation and updates.

Always check:

```json
validation_errors
```

before attempting to publish.

---

# Recommended Development Workflow

```
Edit flow.json
        │
        ▼
POST /FLOW_ID/assets
        │
        ▼
validation_errors == []
        │
        ▼
POST /FLOW_ID/publish
        │
        ▼
Test on WhatsApp
```

For a brand new Flow:

```
Create Flow
        │
        ▼
Set Endpoint (if required)
        │
        ▼
Publish
        │
        ▼
Test
```

---

# Notes

* Use the Graph API instead of the Meta Flow Builder UI when possible.
* The Graph API provides precise validation errors that are often easier to debug than UI errors.
* Data Exchange flows require an `endpoint_uri` before they can function correctly.
* Keep your `flow.json` under version control (Git) so every change is tracked.
* A successful upload (`success: true`) does not guarantee the Flow can be published; always ensure `validation_errors` is an empty array before publishing.
