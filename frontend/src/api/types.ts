export type CredentialPayload = Record<string, any>;

export interface IssueResponse {
  message: string;
  credentialId: string;
  issuedBy: string;
  issuedAt: string;
}

export interface VerifyResponse {
  valid: boolean;
  credentialId?: string;
  issuedBy?: string;
  issuedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}
