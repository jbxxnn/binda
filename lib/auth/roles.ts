/**
 * User Roles and Permissions
 * Defines roles and permission checking utilities
 */

export type UserRole = 'owner' | 'admin' | 'staff' | 'customer';

export interface UserPermissions {
  canManageTenant: boolean;
  canManageStaff: boolean;
  canManageServices: boolean;
  canManageCustomers: boolean;
  canManageAppointments: boolean;
  canManageWalkIns: boolean;
  canViewAnalytics: boolean;
  canBookAppointments: boolean;
  canCancelOwnAppointments: boolean;
}

/**
 * Get permissions for a user role
 */
export function getPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'owner':
      return {
        canManageTenant: true,
        canManageStaff: true,
        canManageServices: true,
        canManageCustomers: true,
        canManageAppointments: true,
        canManageWalkIns: true,
        canViewAnalytics: true,
        canBookAppointments: true,
        canCancelOwnAppointments: true,
      };

    case 'admin':
      return {
        canManageTenant: false, // Only owner can manage tenant settings
        canManageStaff: true,
        canManageServices: true,
        canManageCustomers: true,
        canManageAppointments: true,
        canManageWalkIns: true,
        canViewAnalytics: true,
        canBookAppointments: true,
        canCancelOwnAppointments: true,
      };

    case 'staff':
      return {
        canManageTenant: false,
        canManageStaff: false,
        canManageServices: false,
        canManageCustomers: true, // Can create customers for bookings
        canManageAppointments: true, // Can manage appointments assigned to them
        canManageWalkIns: true,
        canViewAnalytics: false,
        canBookAppointments: true,
        canCancelOwnAppointments: true,
      };

    case 'customer':
      return {
        canManageTenant: false,
        canManageStaff: false,
        canManageServices: false,
        canManageCustomers: false,
        canManageAppointments: false,
        canManageWalkIns: false,
        canViewAnalytics: false,
        canBookAppointments: true,
        canCancelOwnAppointments: true, // Can cancel their own appointments
      };

    default:
      return {
        canManageTenant: false,
        canManageStaff: false,
        canManageServices: false,
        canManageCustomers: false,
        canManageAppointments: false,
        canManageWalkIns: false,
        canViewAnalytics: false,
        canBookAppointments: false,
        canCancelOwnAppointments: false,
      };
  }
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof UserPermissions): boolean {
  return getPermissions(role)[permission];
}

/**
 * Check if a role can perform an action
 */
export function canPerformAction(
  role: UserRole,
  action: keyof UserPermissions,
): boolean {
  return hasPermission(role, action);
}

/**
 * Check if user is admin or owner
 */
export function isAdminOrOwner(role: UserRole): boolean {
  return role === 'admin' || role === 'owner';
}

/**
 * Check if user is staff or above
 */
export function isStaffOrAbove(role: UserRole): boolean {
  return role === 'staff' || role === 'admin' || role === 'owner';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    staff: 'Staff',
    customer: 'Customer',
  };
  return roleNames[role] || role;
}
