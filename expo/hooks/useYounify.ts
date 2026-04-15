import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { secureTokenStorage, YounifyTokens } from '@/utils/secureTokenStorage';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

export type YounifyConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired';

export interface ConnectedService {
  id: string;
  name: string;
  icon: string;
  color: string;
  connectedAt: string;
}

export const [YounifyProvider, useYounify] = createContextHook(() => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<YounifyConnectionStatus>('disconnected');
  const [tokens, setTokens] = useState<YounifyTokens | null>(null);
  const [connectedServices, setConnectedServices] = useState<ConnectedService[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadStoredTokens();
    }
  }, [user?.id]);

  const loadStoredTokens = useCallback(async () => {
    try {
      const stored = await secureTokenStorage.getTokens();
      if (stored) {
        const isExpired = await secureTokenStorage.isTokenExpired();
        if (isExpired) {
          console.log('⏰ [Younify] Stored tokens expired, will need renewal');
          setConnectionStatus('expired');
          setTokens(stored);
        } else {
          console.log('✅ [Younify] Loaded valid stored tokens');
          setTokens(stored);
          setConnectionStatus('connected');
        }
      } else {
        console.log('ℹ️ [Younify] No stored tokens found');
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ [Younify] Failed to load stored tokens:', error);
      setConnectionStatus('disconnected');
    }
  }, []);

  const createSessionMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('🎬 [Younify] Creating session via backend...');
      return trpcClient.younify.createSession.mutate({ userId });
    },
    onSuccess: async (data) => {
      const newTokens: YounifyTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };
      await secureTokenStorage.storeTokens(newTokens);
      if (user?.id) {
        await secureTokenStorage.storeUserId(user.id);
      }
      setTokens(newTokens);
      setConnectionStatus('connected');
      setLastError(null);
      console.log('✅ [Younify] Session created and tokens stored');
    },
    onError: (error: any) => {
      console.error('❌ [Younify] Session creation failed:', error.message);
      setConnectionStatus('error');
      setLastError(error.message || 'Failed to connect to streaming services');
    },
  });

  const renewSessionMutation = useMutation({
    mutationFn: async ({ userId, refreshToken }: { userId: string; refreshToken: string }) => {
      console.log('🔄 [Younify] Renewing session via backend...');
      return trpcClient.younify.renewSession.mutate({ userId, refreshToken });
    },
    onSuccess: async (data) => {
      const newTokens: YounifyTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };
      await secureTokenStorage.storeTokens(newTokens);
      setTokens(newTokens);
      setConnectionStatus('connected');
      setLastError(null);
      console.log('✅ [Younify] Session renewed and tokens stored');
    },
    onError: (error: any) => {
      console.error('❌ [Younify] Session renewal failed:', error.message);
      setConnectionStatus('error');
      setLastError(error.message || 'Failed to renew streaming session');
    },
  });

  const connect = useCallback(async () => {
    if (!user?.id) {
      console.error('❌ [Younify] Cannot connect: no user ID');
      setLastError('You must be logged in to connect streaming services');
      return;
    }
    setConnectionStatus('connecting');
    setLastError(null);
    createSessionMutation.mutate(user.id);
  }, [user?.id, createSessionMutation]);

  const renewSession = useCallback(async () => {
    if (!user?.id || !tokens?.refreshToken) {
      console.error('❌ [Younify] Cannot renew: missing user ID or refresh token');
      return;
    }
    setConnectionStatus('connecting');
    renewSessionMutation.mutate({
      userId: user.id,
      refreshToken: tokens.refreshToken,
    });
  }, [user?.id, tokens?.refreshToken, renewSessionMutation]);

  const disconnect = useCallback(async () => {
    console.log('🔌 [Younify] Disconnecting...');
    await secureTokenStorage.clearTokens();
    setTokens(null);
    setConnectedServices([]);
    setConnectionStatus('disconnected');
    setLastError(null);
    console.log('✅ [Younify] Disconnected');
  }, []);

  const reconnect = useCallback(async () => {
    if (tokens?.refreshToken && user?.id) {
      await renewSession();
    } else {
      await connect();
    }
  }, [tokens?.refreshToken, user?.id, renewSession, connect]);

  const isConnecting = createSessionMutation.isPending || renewSessionMutation.isPending;

  return {
    connectionStatus,
    tokens,
    connectedServices,
    lastError,
    isConnecting,
    connect,
    disconnect,
    reconnect,
    renewSession,
  };
});
