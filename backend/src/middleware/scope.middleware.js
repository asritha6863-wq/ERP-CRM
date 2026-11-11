// Builds a Prisma `where` clause based on the authenticated user's role:
//   ADMIN   → no filter (sees all data)
//   MANAGER → filtered to their branch
//   SALES   → filtered to records assigned to them
export function getScopeFilter(user) {
  if (!user) return {};

  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'MANAGER':
      return { branchId: user.branchId };
    case 'SALES':
      return { assignedToId: user.id };
    default:
      return {};
  }
}
