import { test as base, expect as baseExpect } from '@playwright/test';
import { PageManager } from '../pages';

type CustomFixtures = {
  pageManager: PageManager;
  authenticatedPageManager: PageManager;
};

export const test = base.extend<CustomFixtures>({
  // Page Manager fixture - provides access to all page objects for auth tests
  pageManager: async ({ page }, use) => {
    const pageManager = new PageManager(page);
    await use(pageManager);
  },

  // Authenticated Page Manager fixture - for tests that should run authenticated
  // Authentication is handled by storageState in playwright.config.ts
  // This fixture only provides the PageManager with an already authenticated session
  authenticatedPageManager: async ({ page }, use) => {
    const pageManager = new PageManager(page);
    // No login needed - storageState handles authentication
    await use(pageManager);
  },
});

export const expect = baseExpect;
