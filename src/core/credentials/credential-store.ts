/**
 * CredentialStore — per-tenant, per-channel secret storage, ENCRYPTED AT REST.
 *
 * Channel API credentials are entered via the admin UI and never appear in code or
 * .env (RULES 第4条). Plaintext exists only transiently in memory during put/get;
 * what is stored is always ciphertext. The in-memory implementation here models a
 * DB row store; a Postgres-backed adapter implements the same port later.
 */

import { decryptSecret, encryptSecret } from "./crypto";
import type { Channel } from "../profile/service-profile";

export interface CredentialRef {
  tenantId: string;
  channel: Channel;
  /** Field name, e.g. "accessToken", "adAccountId". */
  name: string;
}

export interface CredentialStore {
  put(ref: CredentialRef, secret: string): Promise<void>;
  get(ref: CredentialRef): Promise<string | null>;
  has(ref: CredentialRef): Promise<boolean>;
  delete(ref: CredentialRef): Promise<void>;
}

/**
 * Unambiguous identity for a ref. JSON.stringify escapes separators, so distinct
 * tuples can never alias each other. Doubles as the map key AND the GCM AAD, which
 * binds each ciphertext to its owning tenant/channel/name (a swapped DB blob fails
 * to authenticate under a different ref).
 */
function refIdentity(ref: CredentialRef): string {
  return JSON.stringify([ref.tenantId, ref.channel, ref.name]);
}

export class InMemoryCredentialStore implements CredentialStore {
  /** Maps ref identity → ciphertext. Never holds plaintext. */
  private readonly rows = new Map<string, string>();

  constructor(private readonly encryptionKey: Buffer) {}

  async put(ref: CredentialRef, secret: string): Promise<void> {
    const id = refIdentity(ref);
    this.rows.set(id, encryptSecret(secret, this.encryptionKey, id));
  }

  async get(ref: CredentialRef): Promise<string | null> {
    const id = refIdentity(ref);
    const ciphertext = this.rows.get(id);
    if (ciphertext === undefined) return null;
    return decryptSecret(ciphertext, this.encryptionKey, id);
  }

  async has(ref: CredentialRef): Promise<boolean> {
    return this.rows.has(refIdentity(ref));
  }

  async delete(ref: CredentialRef): Promise<void> {
    this.rows.delete(refIdentity(ref));
  }
}
