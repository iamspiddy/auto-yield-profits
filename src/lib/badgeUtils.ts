// Badge utility function to map status/state to valid badge variants
export function getBadgeVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case 'success':
    case 'approved':
    case 'completed':
    case 'verified':
      return 'secondary';
    case 'destructive':
    case 'rejected':
    case 'failed':
    case 'error':
      return 'destructive';
    case 'warning':
    case 'pending':
    case 'processing':
      return 'outline';
    default:
      return 'default';
  }
}