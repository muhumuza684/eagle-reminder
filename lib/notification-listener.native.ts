import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { setPendingCheckpointAck } from './pending-notification-action';

export function CheckpointNotificationListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        commitmentId?: string;
        checkpointStage?: 'day_before' | 'three_hours';
      };

      if (!data?.commitmentId || !data?.checkpointStage) return;
      if (
        response.actionIdentifier !== 'done' &&
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }

      setPendingCheckpointAck({
        commitmentId: data.commitmentId,
        stage: data.checkpointStage,
      });
    });

    return () => subscription.remove();
  }, []);

  return null;
}
