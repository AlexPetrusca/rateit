export const resolveEmulatorLoopback = (url, platform) => (
  platform === 'android'
    ? url.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, (_, protocol) => `${protocol}10.0.2.2`)
    : url
);
