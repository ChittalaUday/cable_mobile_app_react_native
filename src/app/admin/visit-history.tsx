import * as React from 'react';
import { VisitsList } from '@/components/visits/visits-list';

export default function AdminVisitHistoryRoute() {
  return <VisitsList basePath="/admin" />;
}
