import type { LicenseDecision, SessionInfo } from './generated/ui';

// Re-export generated types used by API consumers
export type {
  AdminUserPasswordSetRequest,
  UserProfileUpdate,
  UserPasswordChangeRequest,
  SessionInfo,
  LicenseDecision,
  LicenseRevalidationResponse,
} from './generated/ui';

// Permissions types: the YAML spec marks boolean fields optional (they have
// defaults), but the API always returns them. Keep strict non-optional booleans
// to match the runtime contract and avoid `boolean | undefined` noise.
export interface AssetPermissions {
  enabled: boolean;
  canView: boolean;
  canCreateNew: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  restrictTo: string[];
}

export interface AssetPermissions2 extends AssetPermissions {
  restrictToAssetIds: string[];
  restrictToCategoryIds: string[];
}

export interface Permissions {
  stats: { enabled: boolean; canView: boolean; canEditCustomViews: boolean };
  campaigns: AssetPermissions;
  trafficSources: AssetPermissions;
  offerSources: AssetPermissions;
  offers: AssetPermissions2;
  landers: AssetPermissions2;
  systemLinks: { enabled: boolean; canView: boolean };
  storedLinks: {
    enabled: boolean; canView: boolean; canCreateNew: boolean;
    canEdit: boolean; canDelete: boolean; canResetStats: boolean;
  };
  trafficFilters: {
    enabled: boolean; canView: boolean; canCreateNew: boolean;
    canEdit: boolean; canDelete: boolean; canApplyToPastStats: boolean;
  };
  dataUpdates: {
    enabled: boolean; canUpdateConversions: boolean;
    canUpdateTrafficCost: boolean; canResetStats: boolean;
  };
  systemUpdates: { enabled: boolean; canView: boolean; canInstallUpdate: boolean };
}

export interface UserProfile {
  id: string;
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  avatarURL: string;
  isAdmin: boolean;
  enabled: boolean;
  permissions: Permissions;
}

export type LicenseState = LicenseDecision['state'];
export type LicenseStatus = LicenseDecision;
export type SessionResponse = SessionInfo;

export interface ApiError {
  code: number;
  message: string;
  errorCode?: string;
}
