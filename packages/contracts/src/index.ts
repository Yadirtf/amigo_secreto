/**
 * API contracts shared by the mobile app and the API (single source of truth).
 * Inputs are strict (unknown keys rejected) so operator injection like
 * `{"$ne": null}` never reaches the database layer.
 */
import { z } from 'zod';

// ---------- primitives ----------

export const Id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const IsoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const IsoDateTime = z.string().datetime();
export const PhotoDataUri = z
  .string()
  .max(60_000)
  .regex(/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+={0,2}$/);
export const InviteCodeInput = z
  .string()
  .min(10)
  .max(14)
  .regex(/^[A-Za-z0-9 -]+$/);
export const GroupStatus = z.enum(['open', 'drawn', 'revealed']);
export const ChatSide = z.enum(['giver', 'receiver']);

export const PublicProfile = z.object({
  id: Id,
  name: z.string(),
  photo: z.string().nullable(),
});

// ---------- errors ----------

export const ErrorCode = z.enum([
  'INVALID_INPUT',
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFLICT',
  'GROUP_LOCKED',
  'GROUP_FULL',
  'ALREADY_MEMBER',
  'INVITE_INVALID',
  'NOT_ENOUGH_PARTICIPANTS',
  'DRAW_IMPOSSIBLE',
  'DRAW_NOT_DONE',
  'REDRAW_LIMIT',
  'NOT_REVEALED',
  'CHAT_BLOCKED',
  'UNAUTHORIZED',
  'RATE_LIMITED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** Uniform error envelope. `message` is already human, in Colombian Spanish. */
export const ApiError = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// ---------- auth ----------

export const GoogleSignInRequest = z.strictObject({
  idToken: z.string().min(20).max(4096),
});
/** Staging/e2e only (disabled in production). */
export const DevSignInRequest = z.strictObject({
  key: z.string().min(16).max(200),
  name: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[\p{L}\p{N} ._-]+$/u),
});
export const RefreshRequest = z.strictObject({
  refreshToken: z.string().min(20).max(200),
});
export const LogoutRequest = z.strictObject({
  refreshToken: z.string().min(20).max(200),
  /** The device's push token, so this phone stops receiving notifications. */
  pushToken: z.string().max(200).optional(),
});
/** Deleting the account needs a fresh Google sign-in (threat model PT-08). */
export const DeleteMeRequest = z.strictObject({
  idToken: z.string().min(20).max(4096).optional(),
});
export const Me = z.object({
  id: Id,
  name: z.string(),
  photo: z.string().nullable(),
  email: z.string().nullable(),
});
export type Me = z.infer<typeof Me>;
export const Session = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: IsoDateTime,
  refreshToken: z.string(),
  user: Me,
  isNew: z.boolean(),
});
export type Session = z.infer<typeof Session>;

export const UpdateMeRequest = z.strictObject({
  name: z.string().min(1).max(40).optional(),
  photo: PhotoDataUri.nullable().optional(),
});
export const PushTokenRequest = z.strictObject({
  token: z
    .string()
    .max(200)
    .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
});

// ---------- groups ----------

export const Exclusion = z.tuple([Id, Id]);

export const GroupSummary = z.object({
  id: Id,
  name: z.string(),
  photo: z.string().nullable(),
  deliveryDate: IsoDay,
  daysLeft: z.number().int(),
  status: GroupStatus,
  memberCount: z.number().int(),
  isOrganizer: z.boolean(),
});
export type GroupSummary = z.infer<typeof GroupSummary>;

export const MemberView = PublicProfile.extend({
  participates: z.boolean(),
  isOrganizer: z.boolean(),
  isMe: z.boolean(),
});
export type MemberView = z.infer<typeof MemberView>;

export const GroupDetail = GroupSummary.extend({
  budgetCop: z.number().int().nullable(),
  inviteCode: z.string(),
  inviteExpiresAt: IsoDateTime,
  members: z.array(MemberView),
  exclusions: z.array(Exclusion),
  drawCount: z.number().int(),
  drawnAt: IsoDateTime.nullable(),
  revealedAt: IsoDateTime.nullable(),
  canDraw: z.boolean(),
  memberLimit: z.number().int(),
  redrawsLeft: z.number().int(),
});
export type GroupDetail = z.infer<typeof GroupDetail>;

export const GroupList = z.object({ groups: z.array(GroupSummary) });

export const CreateGroupRequest = z.strictObject({
  name: z.string().min(2).max(60),
  deliveryDate: IsoDay,
  budgetCop: z.number().int().min(1_000).max(50_000_000).nullable(),
  photo: PhotoDataUri.nullable().default(null),
  organizerParticipates: z.boolean().default(true),
});
export type CreateGroupRequest = z.input<typeof CreateGroupRequest>;

export const UpdateGroupRequest = z.strictObject({
  name: z.string().min(2).max(60).optional(),
  deliveryDate: IsoDay.optional(),
  budgetCop: z.number().int().min(1_000).max(50_000_000).nullable().optional(),
  photo: PhotoDataUri.nullable().optional(),
});
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequest>;

export const JoinRequest = z.strictObject({ code: InviteCodeInput });
export const ParticipationRequest = z.strictObject({ participates: z.boolean() });
export const ExclusionsRequest = z.strictObject({
  exclusions: z.array(Exclusion).max(200),
});
export const ConfirmRequest = z.strictObject({ confirm: z.literal(true) });

export const InvitePreview = z.object({
  name: z.string(),
  photo: z.string().nullable(),
  deliveryDate: IsoDay,
  organizerName: z.string(),
  memberCount: z.number().int(),
  status: GroupStatus,
  alreadyMember: z.boolean(),
  groupId: Id.nullable(),
});
export type InvitePreview = z.infer<typeof InvitePreview>;

// ---------- wishlist & assignment ----------

export const Wish = z.object({
  id: z.string(),
  text: z.string(),
  link: z.string().nullable(),
  size: z.string().nullable(),
});
export type Wish = z.infer<typeof Wish>;

export const WishInput = z.strictObject({
  id: z.string().max(40).optional(),
  text: z.string().min(1).max(140),
  link: z.string().max(500).nullable().optional(),
  size: z.string().max(30).nullable().optional(),
});
export type WishInput = z.infer<typeof WishInput>;

export const WishlistResponse = z.object({ items: z.array(Wish) });
export const PutWishlistRequest = z.strictObject({ items: z.array(WishInput).max(20) });

export const MyAssignment = z.object({
  groupId: Id,
  drawNumber: z.number().int(),
  recipient: PublicProfile,
  wishlist: z.array(Wish),
  chatBlocked: z.boolean(),
});
export type MyAssignment = z.infer<typeof MyAssignment>;

export const Reveal = z.object({
  groupId: Id,
  myGiver: PublicProfile.nullable(),
  pairs: z.array(z.object({ giver: PublicProfile, receiver: PublicProfile })),
});
export type Reveal = z.infer<typeof Reveal>;

// ---------- chat ----------

/** Same shape on both sides; never carries user ids. */
export const ChatMessage = z.strictObject({
  id: z.string(),
  mine: z.boolean(),
  text: z.string(),
  createdAt: IsoDateTime,
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ChatThread = z.strictObject({
  side: ChatSide,
  counterpart: PublicProfile.nullable(),
  blocked: z.boolean(),
  messages: z.array(ChatMessage),
  hasMore: z.boolean(),
});
export type ChatThread = z.infer<typeof ChatThread>;

export const SendMessageRequest = z.strictObject({ text: z.string().min(1).max(500) });
export const BlockRequest = z.strictObject({ blocked: z.boolean() });
export const ReportRequest = z.strictObject({
  messageId: z.string().max(64).nullable().default(null),
  reason: z.string().max(200).default(''),
});
export const ChatQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  before: IsoDateTime.optional(),
});

export const Ok = z.object({ ok: z.literal(true) });
