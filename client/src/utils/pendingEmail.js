const KEY = 'odaklan_pending_email';

export const getPendingEmail = () => sessionStorage.getItem(KEY);
export const setPendingEmail = (email) => sessionStorage.setItem(KEY, email);
export const clearPendingEmail = () => sessionStorage.removeItem(KEY);