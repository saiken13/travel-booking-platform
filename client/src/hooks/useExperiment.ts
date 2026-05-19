import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from '@apollo/client';
import { TRACK_EVENT } from '../graphql/mutations';
import type { EventType } from '../types';

// Deterministically assign a variant based on userId + experimentId
const assignVariant = (userId: string, experimentId: string, variants: string[]): string => {
  let hash = 0;
  const str = `${userId}:${experimentId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
};

const getUserId = (): string => {
  let id = localStorage.getItem('tbp_user_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('tbp_user_id', id);
  }
  return id;
};

export const useExperiment = (experimentId: string, variants: string[]) => {
  const userId = useMemo(() => getUserId(), []);
  const variant = useMemo(
    () => assignVariant(userId, experimentId, variants),
    [userId, experimentId, variants]
  );

  return { variant, userId };
};

export const useTracking = () => {
  const [trackEventMutation] = useMutation(TRACK_EVENT);

  const track = async (
    experimentId: string,
    variant: string,
    eventType: EventType,
    userId?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await trackEventMutation({
        variables: {
          experimentId,
          variant,
          userId: userId || getUserId(),
          eventType,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch {
      // Tracking failures must never break the UI
    }
  };

  return { track, getUserId };
};
