/**
 * @deprecated Call this only if not using ConfigModule. ConfigModule loads vault secrets automatically.
 */
export const initializeKeyVault = (): void => {
  console.warn(
    'initializeKeyVault is deprecated. Use ConfigModule which handles this automatically.',
  );
};

/**
 * @deprecated Use ConfigService instead
 * Get a secret value from environment variables
 */
export const getSecret = (name: string): string | undefined => {
  return process.env[name];
};

/**
 * @deprecated Use ConfigService instead
 * Get a secret value and throw error if not found
 */
export const getRequiredSecret = (name: string): string => {
  const value = getSecret(name);
  if (!value) {
    throw new Error(`Required secret "${name}" is missing`);
  }
  return value;
};

/**
 * @deprecated Use ConfigModule.isInitialized or check if ConfigService is available
 */
export const isKeyVaultInitialized = (): boolean => {
  return true; // Always true since we load at startup
};

/**
 * @deprecated For debugging, check process.env keys instead
 */
export const getLoadedSecretNames = (): string[] => {
  return Object.keys(process.env);
};
