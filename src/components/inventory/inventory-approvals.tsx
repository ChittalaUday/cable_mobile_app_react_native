import {
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import * as React from 'react';

import { dialogs } from '@/components/common/dialogs';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  Button,
  colors,
  ScrollView,
  Text,
  ThemedIcon,
  View,
} from '@/components/ui';
import {
  useApprovalRequests,
  useReviewApprovalRequest,
} from '@/lib/hooks/api/use-inventory';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export function InventoryApprovalsScreen({ basePath: _basePath }: { basePath: '/admin/inventory' | '/staff/inventory' }) {
  const role = useAuthStore.use.role();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: requests, isLoading, refetch } = useApprovalRequests();
  const { mutate: reviewRequest, isPending: isReviewing } = useReviewApprovalRequest();

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    const agreed = await dialogs.confirm({
      title: decision === 'approved' ? 'Approve Request' : 'Reject Request',
      message: `Are you sure you want to ${decision} this item modification request?`,
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      tone: decision === 'approved' ? 'default' : 'danger',
    });

    if (!agreed)
      return;

    reviewRequest(
      { id, patch: { status: decision, reviewNotes: `Decision by ${role}` } },
      {
        onSuccess: () => {
          refetch();
          void dialogs.notify('Done', `Request marked as ${decision}.`);
        },
        onError: (err) => {
          void dialogs.notify('Error', err.message ?? 'Review failed');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Approval Requests"
        subtitle="Review item modification & creation requests"
        showBack
        withSafeArea
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16 gap-3" showsVerticalScrollIndicator={false}>
        {isLoading
          ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            )
          : requests && requests.length > 0
            ? (
                requests.map((req) => {
                  const isPending = req.status === 'pending';
                  return (
                    <Card key={req.id} className="gap-2.5 border border-border p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`rounded-full px-2.5 py-0.5 ${
                              req.status === 'approved'
                                ? 'bg-success-50 dark:bg-success-900/40'
                                : req.status === 'rejected'
                                  ? 'bg-danger-50 dark:bg-danger-950/40'
                                  : 'bg-warning-50 dark:bg-warning-900/40'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-bold uppercase ${
                                req.status === 'approved'
                                  ? 'text-success-700 dark:text-success-300'
                                  : req.status === 'rejected'
                                    ? 'text-danger-600'
                                    : 'text-warning-700 dark:text-warning-300'
                              }`}
                            >
                              {req.status}
                            </Text>
                          </View>
                          <Text className="text-xs font-semibold text-muted-foreground capitalize">
                            {req.requestType.replace('_', ' ')}
                          </Text>
                        </View>

                        <Text className="text-[11px] text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </Text>
                      </View>

                      <View>
                        <Text className="text-sm font-bold text-foreground">
                          {req.targetItemName ?? (req.proposedData?.name as string) ?? 'Catalog Item'}
                        </Text>
                        <Text className="mt-1 text-xs text-muted-foreground">
                          Requested by:
                          {' '}
                          <Text className="font-semibold text-foreground">{req.requestedByName ?? 'Staff'}</Text>
                        </Text>
                        <Text className="mt-1 text-xs text-foreground italic">
                          "
                          {req.reason}
                          "
                        </Text>
                      </View>

                      {isAdmin && isPending && (
                        <View className="flex-row gap-2 pt-2">
                          <Button
                            label="Reject"
                            variant="outline"
                            className="flex-1 border-danger-500/50"
                            disabled={isReviewing}
                            onPress={() => handleReview(req.id, 'rejected')}
                          />
                          <Button
                            label="Approve"
                            className="flex-1 bg-success-600"
                            disabled={isReviewing}
                            onPress={() => handleReview(req.id, 'approved')}
                          />
                        </View>
                      )}
                    </Card>
                  );
                })
              )
            : (
                <Card className="items-center justify-center border border-border p-10">
                  <ThemedIcon icon={CheckmarkCircle02Icon} size={36} strokeWidth={1.5} colorClassName="text-muted-foreground" />
                  <Text className="mt-2 text-sm font-medium text-muted-foreground">No pending approval requests</Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
