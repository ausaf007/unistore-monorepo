const STORAGE_KEY = "uniblox.userId";

/**
 * Auth is out of scope (v1-build-plan.md §1): each browser mints a random id
 * on first visit and sends it as x-user-id on every request.
 */
export function getUserId(): string {
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}
