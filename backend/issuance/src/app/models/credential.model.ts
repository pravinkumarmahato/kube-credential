export type CredentialPayload = Record<string, any>;

export interface IssuedRecord {
  id: string;
  payload: string;
  issuedAt: string;
  issuedBy: string;
}
