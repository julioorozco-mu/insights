"use client";

import { useState } from "react";
import axios from "axios";
import { LiveStream, CreateLiveStreamData } from "@/types/live";
import { getErrorMessage } from "@/utils/handleError";

export function useLiveStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStream = async (data: CreateLiveStreamData): Promise<LiveStream | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post<LiveStream>("/api/live/create", data);
      return response.data;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getStreamStatus = async (streamId: string): Promise<{
    status: string;
    isActive: boolean;
  } | null> => {
    try {
      setError(null);
      const response = await axios.get(`/api/live/${streamId}/status`);
      return response.data;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    }
  };

  const startStream = async (streamId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`/api/live/${streamId}/start`);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async (streamId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`/api/live/${streamId}/stop`);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createStream,
    getStreamStatus,
    startStream,
    stopStream,
    loading,
    error,
  };
}
