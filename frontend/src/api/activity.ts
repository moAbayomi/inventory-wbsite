import api from "./axios";

// NOT WIRED UP YET — GET /api/v1/events has no route on the backend today.
// inventoryEventsRoutes.ts only defines GET /events/items/:id (one item's
// history) and GET /events/:id (one event by id); there's no route that
// lists events system-wide, so this 404s if you call it. Building that
// list endpoint is exactly the backend work the admin-only activity log
// (Sep 20–29 backlog, § Access control & session risk in the PRD) needs
// anyway — do it there, not as a special case for the dashboard tile.
export const getRecentActivity = async (limit = 20) => {
  const res = await api.get("/events", { params: { limit } });
  const { events } = res.data;
  return events;
};
