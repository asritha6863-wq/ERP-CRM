/**
 * getScopeFilter(user, selectors?)
 *
 * Builds a Prisma `where` clause based on the authenticated user's role,
 * plus optional top-bar company/branch selectors from query params.
 *
 *   ADMIN   → no mandatory filter; honours companyId / branchId from query params
 *   MANAGER → always locked to user.branchId; ignores branchId override
 *   SALES   → always locked to assignedToId = user.id; ignores both selectors
 *
 * @param {object} user        - req.user from auth middleware
 * @param {object} selectors   - { companyId?, branchId? } from req.query
 */
export function getScopeFilter(user, { companyId, branchId } = {}) {
  if (!user) return {};

  const filter = {};

  switch (user.role) {
    case 'ADMIN':
      if (companyId) filter.companyId = companyId;
      if (branchId)  filter.branchId  = branchId;
      break;

    case 'MANAGER':
      if (companyId)    filter.companyId = companyId;
      filter.branchId = user.branchId;    // always locked — ignore query param override
      break;

    case 'SALES':
      filter.assignedToId = user.id;      // always locked to own records
      break;

    default:
      break;
  }

  return filter;
}
