/** Response shapes returned by the Your Employee API (server/src/lib/serializers.ts). */

export type Role = 'WORKER' | 'EMPLOYER' | 'ADMIN';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Availability = 'FULL_TIME' | 'PART_TIME' | 'DAILY' | 'WEEKENDS';
export type WageType = 'HOURLY' | 'DAILY' | 'MONTHLY' | 'FIXED';
export type EmployerType = 'INDIVIDUAL' | 'BUSINESS';
export type JobStatus = 'PENDING_PAYMENT' | 'OPEN' | 'FILLED' | 'CLOSED' | 'REMOVED';
export type ApplicationStatus = 'PENDING' | 'SHORTLISTED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type HireStatus = 'PENDING_PAYMENT' | 'OFFERED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
export type PaymentPurpose = 'WORKER_SUBSCRIPTION' | 'JOB_POST' | 'HIRE';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type PaymentProvider = 'SSLCOMMERZ' | 'STRIPE';

export type Page<T> = { items: T[]; nextCursor: string | null };

export type Category = { id: string; slug: string; name: string; nameBn: string; icon: string };
export type Division = { name: string; nameBn: string; districts: string[] };
export type Pricing = { workerMonthly: number; jobPost: number; hire: number; subscriptionDays: number; currency: 'BDT' };

/** A payment gateway the server offers. Prices are in minor units of `currency`. */
export type PaymentMethod = {
  id: PaymentProvider;
  name: string;
  description: string;
  currency: string;
  prices: Record<PaymentPurpose, number>;
  enabled: boolean;
};

export type Meta = {
  categories: Category[];
  divisions: Division[];
  pricing: Pricing;
  paymentMethods: PaymentMethod[];
  features: { googleSignIn: boolean; payments: boolean };
};

export type PublicWorker = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  gender: Gender;
  age: number | null;
  division: string;
  district: string;
  area: string;
  bio: string | null;
  skills: string[];
  experienceYears: number;
  expectedWage: number;
  wageType: WageType;
  availability: Availability;
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  verified: boolean;
  categories: Category[];
  memberSince: string;
};

export type OwnWorker = PublicWorker & {
  phone: string;
  dateOfBirth: string | null;
  nidNumber: string;
  nidImageId: string | null;
  address: string | null;
  status: ApprovalStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  subscriptionExpiresAt: string | null;
  subscriptionActive: boolean;
};

export type PublicEmployer = {
  id: string;
  displayName: string;
  type: EmployerType;
  avatarUrl: string | null;
  district: string;
  area: string;
  verified: boolean;
  memberSince: string;
};

export type OwnEmployer = PublicEmployer & {
  fullName: string;
  companyName: string | null;
  phone: string;
  nidNumber: string | null;
  tradeLicense: string | null;
  division: string;
  address: string | null;
  about: string | null;
  status: ApprovalStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  hireCredits: number;
};

export type Me = {
  user: { id: string; name: string; email: string; image: string | null; role: Role | null };
  worker: OwnWorker | null;
  employer: OwnEmployer | null;
  pricing: Pricing;
};

export type Job = {
  id: string;
  categoryId: string;
  category: Category;
  title: string;
  description: string;
  wageAmount: number;
  wageType: WageType;
  workersNeeded: number;
  startDate: string;
  durationDays: number;
  division: string;
  district: string;
  area: string;
  address: string | null;
  isUrgent: boolean;
  status: JobStatus;
  publishedAt: string | null;
  applicationsCount: number;
  hiredCount: number;
  createdAt: string;
  employer: PublicEmployer;
};

export type JobListItem = Job & { myApplication: { id: string; status: ApplicationStatus } | null };

export type JobDetail = {
  job: Job;
  isOwner: boolean;
  myApplication: { id: string; status: ApplicationStatus; message: string | null; hireId: string | null } | null;
  fee: number;
};

export type MyApplication = {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  hire: { id: string; status: HireStatus } | null;
  job: Job;
};

export type Applicant = {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  hire: { id: string; status: HireStatus } | null;
  worker: PublicWorker;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  jobTitle: string;
  employer: PublicEmployer;
};

export type WorkerDetail = {
  worker: PublicWorker;
  subscriptionActive: boolean;
  contact: { phone: string } | null;
  hires: { id: string; status: HireStatus; title: string }[];
  hireCredits: number;
  reviews: Review[];
};

export type Hire = {
  id: string;
  jobId: string | null;
  applicationId: string | null;
  categoryId: string;
  category: Category;
  source: 'APPLICATION' | 'DIRECT';
  title: string;
  description: string | null;
  wageAmount: number;
  wageType: WageType;
  startDate: string;
  division: string;
  district: string;
  area: string;
  address: string | null;
  status: HireStatus;
  paidWithCredit: boolean;
  offeredAt: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  employer: PublicEmployer;
  worker: PublicWorker;
  review: { id: string; rating: number; comment: string | null; createdAt: string } | null;
  contact: { phone: string; name: string; address: string | null } | null;
};

export type Payment = {
  id: string;
  tranId: string;
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  referenceId: string | null;
  /** Minor units (poisha, cents) of `currency`. */
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
};

// ─── Admin ────────────────────────────────────────────────────────────────

export type AdminStats = {
  users: number;
  workers: Record<ApprovalStatus, number>;
  employers: Record<ApprovalStatus, number>;
  activeSubscribers: number;
  openJobs: number;
  activeHires: number;
  completedHires: number;
  revenue: {
    /** Successful payments across all currencies. */
    payments: number;
    /** One entry per currency (BDT first); amounts in minor units, never mixed. */
    currencies: CurrencyRevenue[];
  };
};

export type CurrencyRevenue = {
  currency: string;
  total: number;
  payments: number;
  thisMonth: number;
  byPurpose: Partial<Record<PaymentPurpose, { amount: number; count: number }>>;
  last7Days: { date: string; amount: number }[];
};

export type AdminWorker = OwnWorker & { email: string; joinedAt?: string };
export type AdminEmployer = OwnEmployer & { email: string; joinedAt?: string };

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role | null;
  createdAt: string;
  workerProfile: { id: string; status: ApprovalStatus } | null;
  employerProfile: { id: string; status: ApprovalStatus } | null;
};

export type AdminPayment = Omit<Payment, 'referenceId'> & {
  bankTranId: string | null;
  user: { name: string; email: string; role: Role | null };
};

export type AdminCategory = Category & {
  sortOrder: number;
  isActive: boolean;
  _count: { workers: number; jobs: number };
};

export type AdminJob = Omit<Job, 'employer'> & { employer: PublicEmployer };
