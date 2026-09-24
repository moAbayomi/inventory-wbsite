import api from "./axios";
import type { EventsListResponse, EventType } from "../types/api";

export interface ListEventsParams {
  page?: number;
  limit?: number;
  type?: EventType;
  from?: string;
  to?: string;
}

export const listEvents = async (
  params: ListEventsParams = {},
): Promise<EventsListResponse> => {
  const res = await api.get<EventsListResponse>("/events", { params });
  return res.data;
};

// Same filters as listEvents, minus pagination -- the backend returns every
// matching event as one PDF instead of a page of JSON.
export const exportEventsPdf = async (
  params: Omit<ListEventsParams, "page" | "limit"> = {},
): Promise<Blob> => {
  const res = await api.get<Blob>("/events/export/pdf", {
    params,
    responseType: "blob",
  });
  return res.data;
};
