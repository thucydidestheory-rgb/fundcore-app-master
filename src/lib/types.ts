// Tipe data FundCore — cerminan model data PRD §10.
// Dipakai bersama oleh halaman, server, dan worker.

export type CampaignStatus = 'draft' | 'active' | 'finished' | 'frozen';
export type DonationStatus = 'created' | 'pending' | 'paid' | 'expired' | 'failed';
export type FundraiserStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type UserRole = 'super_admin' | 'operator' | 'finance' | 'viewer' | 'fundraiser' | 'donor';
export type WaMsgType = 'created' | 'success' | 'followup';
export type WaMsgStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type WaAccountStatus = 'connected' | 'qr_needed' | 'disconnected';

export interface SiteSettings {
	siteName: string;
	tagline: string;
	logoUrl: string;
	faviconUrl: string;
	colorBg: string;
	colorBrand: string;
	colorAccent: string;
	orgName: string;
	orgAddress: string;
	orgContact: string;
	socials: { instagram: string; tiktok: string; facebook: string; youtube: string };
	skKemenkumham: string;
	akta: string;
	nib: string;
	platformFeePct: number;
	minDonation: number;
	invoiceExpiryHours: number;
	followupDelayMinutes: number;
}

export interface User {
	id: string;
	name: string;
	phone: string;
	email: string;
	passwordHash: string;
	role: UserRole;
	fundraiserStatus: FundraiserStatus;
	createdAt: string;
}

export interface Session {
	token: string;
	userId: string;
	createdAt: string;
}

export interface Category {
	id: string;
	name: string;
	slug: string;
	icon: string;
}

export interface Campaign {
	id: string;
	slug: string;
	ownerId: string;
	ownerName: string;
	verified: boolean;
	title: string;
	categoryId: string;
	targetAmount: number;
	collectedAmount: number;
	donorCount: number;
	status: CampaignStatus;
	urgent: boolean;
	startAt: string;
	endAt: string;
	coverUrl: string;
	story: string;
	receiver: string;
	createdAt: string;
	lastDonationAt: string | null;
}

export interface CampaignUpdate {
	id: string;
	campaignId: string;
	title: string;
	body: string;
	createdAt: string;
}

export interface Donation {
	id: string;
	campaignId: string;
	donorName: string;
	donorPhone: string;
	donorEmail: string | null;
	amount: number;
	isAnonymous: boolean;
	prayer: string | null;
	aamiinCount: number;
	status: DonationStatus;
	channel: string | null;
	invoiceRef: string;
	invoiceUrl: string | null;
	waAccountId: string | null;
	gatewayFee: number;
	platformFee: number;
	netAmount: number;
	utmSource: string | null;
	historyToken: string;
	createdAt: string;
	paidAt: string | null;
	expiredAt: string;
}

export interface Payment {
	id: string;
	donationId: string;
	provider: 'winpay';
	providerUuid: string | null;
	status: string;
	rawRequest: string | null;
	rawCallback: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface WaAccount {
	id: string;
	label: string;
	baseUrl: string;
	session: string;
	apiKey: string;
	phone: string | null;
	profileName: string | null;
	status: WaAccountStatus;
	isActive: boolean;
	lastCheckedAt: string | null;
}

export interface WaSetting {
	type: WaMsgType;
	isActive: boolean;
	template: string;
	delayMinutes: number;
}

export interface WaMessage {
	id: string;
	donationId: string;
	type: WaMsgType;
	waAccountId: string | null;
	toPhone: string;
	payload: string;
	status: WaMsgStatus;
	attempts: number;
	scheduledAt: string;
	sentAt: string | null;
	error: string | null;
}

export interface Disbursement {
	id: string;
	campaignId: string;
	amount: number;
	status: 'requested' | 'approved' | 'transferred';
	proofUrl: string | null;
	note: string | null;
	requestedBy: string;
	requestedAt: string;
	approvedBy: string | null;
}

export interface Content {
	banners: { id: string; title: string; subtitle: string; cta: string; href: string }[];
	faqs: { q: string; a: string }[];
	paymentNote: string;
	aboutBody: string;
	visi: string;
	misi: string;
	nilai: string;
}

export interface AuditLog {
	id: string;
	actorId: string;
	actorName: string;
	action: string;
	entity: string;
	before: string | null;
	after: string | null;
	ip: string;
	createdAt: string;
}

export interface DayStat {
	day: string;
	gross: number;
	gatewayFee: number;
	platformFee: number;
	net: number;
	count: number;
	paidCount: number;
	views: number;
	checkouts: number;
}

export interface FundraiserApplication {
	id: string;
	userId: string;
	userName: string;
	docType: string;
	docUrl: string;
	status: 'pending' | 'approved' | 'rejected';
	note: string | null;
	reviewedBy: string | null;
	reviewedAt: string | null;
	createdAt: string;
}

export interface DbShape {
	version: 1;
	site: SiteSettings;
	users: User[];
	sessions: Session[];
	categories: Category[];
	campaigns: Campaign[];
	updates: CampaignUpdate[];
	donations: Donation[];
	payments: Payment[];
	waAccounts: WaAccount[];
	waSettings: WaSetting[];
	waMessages: WaMessage[];
	disbursements: Disbursement[];
	applications: FundraiserApplication[];
	auditLogs: AuditLog[];
	contents: Content;
	statsDaily: DayStat[];
	seq: Record<string, number>;
}
