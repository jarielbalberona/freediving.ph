declare module "@playwright/test" {
  export const test: {
    (name: string, fn: (args: { page: any }) => Promise<void> | void): void;
    skip: (condition: boolean, description?: string) => void;
  };

  export const expect: any;
  export const devices: Record<string, any>;
  export const defineConfig: (config: any) => any;
}
