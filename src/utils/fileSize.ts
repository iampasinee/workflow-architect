export const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes === 0) return '0 B';
  if (sizeBytes < 1024) return `${Math.round(sizeBytes)} B`;
  return `${(sizeBytes / 1024).toFixed(2)} KB`;
};
