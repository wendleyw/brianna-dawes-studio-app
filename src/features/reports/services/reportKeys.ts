export const reportKeys = {
  all: ['reports'] as const,
  activity: (limit?: number) => [...reportKeys.all, 'activity', limit] as const,
};
