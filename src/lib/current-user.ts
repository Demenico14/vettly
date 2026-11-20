/** The signed-in user's id, published by the session provider for "is this me?" checks. */
let current = "";
export const setCurrentUserId = (id: string) => {
  current = id;
};
export const currentUserId = () => current;
