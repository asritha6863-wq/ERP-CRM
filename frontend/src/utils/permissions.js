// Role-based permission helpers for the frontend

export function isAdmin(user) {
  return user?.role === 'ADMIN';
}

export function isManager(user) {
  return user?.role === 'MANAGER';
}

export function isSales(user) {
  return user?.role === 'SALES';
}

// Masters management is Admin-only
export function canAccessMasters(user) {
  return user?.role === 'ADMIN';
}

// Only Admin and Manager can filter by staff
export function canSeeStaffFilter(user) {
  return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}
