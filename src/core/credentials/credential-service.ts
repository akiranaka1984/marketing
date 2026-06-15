/**
 * CredentialService — the application seam between the admin UI and the
 * {@link CredentialStore}. It validates every field at the boundary (RULES 第4条:
 * untrusted admin input) and owns key loading, so callers never touch raw crypto.
 *
 * The service is store-agnostic: today it wraps an in-memory store; a Postgres
 * adapter implementing the same port swaps in later with no change here.
 */

import { z } from "zod";
import { channelSchema } from "../profile/service-profile";
import { loadKey } from "./crypto";
import {
  InMemoryCredentialStore,
  type CredentialRef,
  type CredentialStore,
} from "./credential-store";

/** A secret is stored verbatim (never trimmed — tokens are byte-exact) but may not be blank. */
const secretSchema = z
  .string()
  .min(1)
  .refine((s) => s.trim().length > 0, "secret must not be blank");

const refInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  channel: channelSchema,
  name: z.string().trim().min(1),
});

const credentialInputSchema = refInputSchema.extend({ secret: secretSchema });

export type CredentialRefInput = z.infer<typeof refInputSchema>;
export type CredentialInput = z.infer<typeof credentialInputSchema>;

export class CredentialService {
  constructor(private readonly store: CredentialStore) {}

  async set(input: CredentialInput): Promise<void> {
    const { secret, ...ref } = credentialInputSchema.parse(input);
    await this.store.put(ref, secret);
  }

  async get(input: CredentialRefInput): Promise<string | null> {
    return this.store.get(refInputSchema.parse(input));
  }

  async has(input: CredentialRefInput): Promise<boolean> {
    return this.store.has(refInputSchema.parse(input));
  }

  async remove(input: CredentialRefInput): Promise<void> {
    await this.store.delete(refInputSchema.parse(input));
  }

  /** All stored credential identities (never secrets), sorted for stable display. */
  async list(): Promise<CredentialRef[]> {
    const refs = await this.store.list();
    return [...refs].sort(
      (a, b) =>
        a.tenantId.localeCompare(b.tenantId) ||
        a.channel.localeCompare(b.channel) ||
        a.name.localeCompare(b.name),
    );
  }

  /**
   * Which of the given field names are configured for a tenant+channel. Names are
   * supplied by the caller (the UI knows what a channel needs) so the service stays
   * generic — no per-channel field list is hardcoded here.
   */
  async fieldStatus(
    tenantId: string,
    channel: CredentialRef["channel"],
    names: readonly string[],
  ): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      names.map(
        async (name) => [name, await this.has({ tenantId, channel, name })] as const,
      ),
    );
    return Object.fromEntries(entries);
  }
}

/**
 * Build a service backed by an in-memory store, keyed from CREDENTIAL_ENCRYPTION_KEY.
 * Fails fast at the boundary if the app secret is missing or malformed.
 */
export function createInMemoryCredentialService(
  base64Key = process.env.CREDENTIAL_ENCRYPTION_KEY,
): CredentialService {
  if (!base64Key) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is not configured");
  }
  return new CredentialService(new InMemoryCredentialStore(loadKey(base64Key)));
}
