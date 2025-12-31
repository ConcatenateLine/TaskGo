// simulateServiceError.ts
// Usage examples:
//
// Simulate error in TaskService.deleteTask
// await simulateServiceError(page, 'taskService', 'deleteTask', 'reject', { message: 'Unable to delete task' });
// Simulate error in UserService.updateProfile
// await simulateServiceError(page, 'userService', 'updateProfile', 'reject', { message: 'Profile update failed' });
// Simulate timeout in ProjectService.createProject
// await simulateServiceError(page, 'projectService', 'createProject', 'timeout', { message: 'Project creation timed out', delayMs: 2000 });
//

export async function simulateServiceError(
  page,
  serviceName: string, // e.g. 'taskService', 'userService'
  methodName: string,  // e.g. 'deleteTask', 'updateProfile'
  type: 'throw' | 'reject' | 'timeout' | 'custom',
  options: { message?: string; customError?: any; delayMs?: number } = {}
) {
  await page.evaluate(
    ([serviceName, methodName, type, options]) => {
      const svc = (window as any)[serviceName];
      if (svc?.[methodName]) {
        const original = svc[methodName];

        switch (type) {
          case 'throw':
            svc[methodName] = () => {
              throw new Error(options.message || 'Forced throw error');
            };
            break;

          case 'reject':
            svc[methodName] = () =>
              Promise.reject(new Error(options.message || 'Forced reject error'));
            break;

          case 'timeout':
            svc[methodName] = () =>
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(options.message || 'Forced timeout error')),
                  options.delayMs || 3000
                )
              );
            break;

          case 'custom':
            svc[methodName] = () =>
              Promise.reject(
                options.customError || { code: 123, msg: options.message || 'Custom error' }
              );
            break;
        }

        (window as any).__restoreServiceMethod = () => (svc[methodName] = original);
      }
    },
    [serviceName, methodName, type, options]
  );
}

export async function restoreService(page) {
  await page.evaluate(() => (window as any).__restoreServiceMethod?.());
}

