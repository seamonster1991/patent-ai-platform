// Global type definitions for the application

interface DashboardTestListeners {
  reportGenerated: (event: CustomEvent) => void;
  bookmarkAdded: (event: CustomEvent) => void;
  dashboardRefresh: (event: CustomEvent) => void;
}

declare global {
  interface Window {
    dashboardTestListeners?: DashboardTestListeners;
  }
}

export {};