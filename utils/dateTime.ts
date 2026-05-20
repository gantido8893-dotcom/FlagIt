export function getSubmissionTimestamp(date: Date = new Date()): {
  datePosted: string;
  timePosted: string;
} {
  return {
    datePosted: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    timePosted: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}
