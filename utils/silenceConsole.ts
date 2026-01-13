// Global console silencer
// This disables all console.log and console.warn calls at runtime
// while keeping console.error for real errors.
// Import this module once at app startup (in App.tsx).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (..._args: any[]) => { };

// console.log = noop;
// console.warn = noop;

export { };


