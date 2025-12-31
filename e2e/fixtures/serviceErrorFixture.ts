import { test as base } from '@playwright/test';
import { simulateServiceError, restoreService } from '../utils/simulateServiceError';

export const serviceErrorTest = base.extend<{
  serviceError: (
    serviceName: string,
    methodName: string,
    type: 'throw' | 'reject' | 'timeout' | 'custom',
    options?: any
  ) => Promise<void>;
}>({
  serviceError: async ({ page }, use) => {
    const helper = async (serviceName: string, methodName: string, type: any, options: any = {}) => {
      await simulateServiceError(page, serviceName, methodName, type, options);
    };

    await use(helper);

    await restoreService(page);
  },
});


export const expect = base.expect;

