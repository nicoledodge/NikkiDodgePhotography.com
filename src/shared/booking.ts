export type SocialProvider = "google" | "facebook" | "microsoft";
export interface BookingUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "admin" | "client";
}
export interface BookingStatus {
  enabled: boolean;
  providers: SocialProvider[];
  stripePublishableKey: string;
}
export interface BookingRequest {
  id: string;
  userId: string;
  packageId: "wedding" | "custom";
  name: string;
  telephone: string;
  eventDate: string;
  location: string;
  message: string;
  status: "requested" | "proposed" | "confirmed" | "expired" | "cancelled";
  createdAt: string;
  updatedAt: string;
  email?: string;
}
export interface Proposal {
  id: string;
  bookingId: string;
  version: number;
  coverage: string;
  totalCents: number;
  retainerCents: number;
  balanceDueDate: string;
  holdExpiresAt: string;
  status: "draft" | "sent" | "signed" | "expired" | "superseded" | "confirmed";
  contractSnapshot: string;
  contractHash: string;
  createdAt: string;
}
export interface ProposalSigner {
  id: string;
  proposalId: string;
  userId: string | null;
  email: string;
  name: string;
  role: "admin" | "client";
  signedAt: string | null;
}
export interface BookingPayment {
  id: string;
  proposalId: string;
  kind: "retainer" | "balance";
  amountCents: number;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  createdAt: string;
}
export interface BookingSignature {
  id: string;
  signerId: string;
  proposalId: string;
  legalName: string;
  method: "typed" | "drawn";
  signedAt: string;
}
export interface ContractTemplate {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}
export interface BookingDetail {
  booking: BookingRequest;
  proposal: Proposal | null;
  signers: ProposalSigner[];
  payments: BookingPayment[];
  contractText: string | null;
  signatures: BookingSignature[];
}
