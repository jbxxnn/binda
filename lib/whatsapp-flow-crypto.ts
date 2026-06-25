import crypto from "node:crypto";

import { env } from "@/lib/env";

type EncryptedFlowBody = {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
};

type DecryptedFlowEnvelope<T> = {
  aesKey: Buffer;
  initialVector: Buffer;
  payload: T;
};

function getFlowPrivateKey() {
  const configuredKey = env.whatsappFlowPrivateKey;

  if (!configuredKey) {
    throw new Error("Missing WHATSAPP_FLOW_PRIVATE_KEY for encrypted WhatsApp Flow endpoint.");
  }

  const normalizedInput = configuredKey.trim().replace(/^['"]|['"]$/g, "");

  if (normalizedInput.includes("BEGIN")) {
    return normalizedInput.replace(/\\n/g, "\n");
  }

  const decoded = Buffer.from(normalizedInput, "base64").toString("utf8").trim();

  if (decoded.includes("BEGIN")) {
    return decoded.replace(/\\n/g, "\n");
  }

  throw new Error(
    "WHATSAPP_FLOW_PRIVATE_KEY is not a valid PEM or base64-encoded PEM private key."
  );
}

function getAesGcmAlgorithm(aesKey: Buffer) {
  if (aesKey.length === 16) {
    return "aes-128-gcm";
  }

  if (aesKey.length === 24) {
    return "aes-192-gcm";
  }

  if (aesKey.length === 32) {
    return "aes-256-gcm";
  }

  throw new Error(`Unsupported AES key length: ${aesKey.length}`);
}

function invertBytes(buffer: Buffer) {
  return Buffer.from(buffer.map((value) => value ^ 0xff));
}

export function isEncryptedFlowRequest(value: unknown): value is EncryptedFlowBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.encrypted_flow_data === "string" &&
    typeof candidate.encrypted_aes_key === "string" &&
    typeof candidate.initial_vector === "string"
  );
}

export function decryptWhatsAppFlowRequest<T>(body: EncryptedFlowBody): DecryptedFlowEnvelope<T> {
  const privateKey = getFlowPrivateKey();
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    Buffer.from(body.encrypted_aes_key, "base64")
  );
  const initialVector = Buffer.from(body.initial_vector, "base64");
  const encryptedPayload = Buffer.from(body.encrypted_flow_data, "base64");
  const authTag = encryptedPayload.subarray(encryptedPayload.length - 16);
  const ciphertext = encryptedPayload.subarray(0, encryptedPayload.length - 16);
  const decipher = crypto.createDecipheriv(getAesGcmAlgorithm(aesKey), aesKey, initialVector);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

  return {
    aesKey,
    initialVector,
    payload: JSON.parse(decrypted) as T
  };
}

export function encryptWhatsAppFlowResponse(payload: unknown, aesKey: Buffer, initialVector: Buffer) {
  const responseIv = invertBytes(initialVector);
  const cipher = crypto.createCipheriv(getAesGcmAlgorithm(aesKey), aesKey, responseIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted_flow_data: Buffer.concat([encrypted, authTag]).toString("base64"),
    initial_vector: responseIv.toString("base64")
  };
}

export function encryptWhatsAppFlowResponseBody(
  payload: unknown,
  aesKey: Buffer,
  initialVector: Buffer
) {
  return encryptWhatsAppFlowResponse(payload, aesKey, initialVector).encrypted_flow_data;
}
