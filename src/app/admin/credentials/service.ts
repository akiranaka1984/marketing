import {
  createInMemoryCredentialService,
  type CredentialService,
} from "@/core/credentials/credential-service";

/**
 * Process-wide credential service. Stored on globalThis so Next dev HMR reuses the
 * same instance across reloads. NOTE: the in-memory store is non-durable — secrets
 * are lost on server restart. A Postgres-backed CredentialStore replaces it later;
 * only this factory changes, the UI and actions stay the same.
 */
const globalForCreds = globalThis as unknown as {
  __credentialService?: CredentialService;
};

export function getCredentialService(): CredentialService {
  if (!globalForCreds.__credentialService) {
    globalForCreds.__credentialService = createInMemoryCredentialService();
  }
  return globalForCreds.__credentialService;
}
