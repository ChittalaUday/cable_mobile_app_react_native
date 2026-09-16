import {
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Alert } from 'react-native';
import { Card, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  Button,
  colors,
  ScrollView,
  Text,
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

  const handleReview = (id: string, decision: 'approved' | 'rejected') => {
    Alert.alert(
      decision === 'approved' ? 'Approve Request' : 'Reject Request',
      `Are you sure you want to ${decision} this item modification request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Reject',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: () => {
            reviewRequest(
              { id, patch: { status: decision, reviewNotes: `Decision by ${role}` } },
              {
                onSuccess: () => {
                  refetch();
                  Alert.alert('Done', `Request marked as ${decision}.`);
                },
                onError: (err) => {
                  Alert.alert('Error', err.message ?? 'Review failed');
                },
              },
            );
          },
        },
      ],
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
                                ? 'bg-success-50'
                                : req.status === 'rejected'
                                  ? 'bg-danger-50'
                                  : 'bg-warning-50'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-bold uppercase ${
                                req.status === 'approved'
                                  ? 'text-success-700'
                                  : req.status === 'rejected'
                                    ? 'text-danger-600'
                                    : 'text-warning-700'
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
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={36} color={colors.neutral[400]} strokeWidth={1.5} />
                  <Text className="mt-2 text-sm font-medium text-muted-foreground">No pending approval requests</Text>
                </Card>
              )}
      </ScrollView>
    </View>
  );
}
