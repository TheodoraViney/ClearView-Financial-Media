/**
 * Newsletter issue status rules shared by the Studio schema and the sending route. Free of `sanity` imports, so the
 * route does not bundle Studio code.
 */

// Scheduled and sent issues are locked: their content is already in Brevo. Cancel unlocks a scheduled one.
export const isLockedStatus = (status: unknown) => status === 'scheduled' || status === 'sent'
