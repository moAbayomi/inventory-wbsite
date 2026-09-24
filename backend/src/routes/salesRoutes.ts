import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.ts";
import {
  newSaleSchema,
  saleIdSchema,
  listSalesQuerySchema,
  salesSummaryQuerySchema,
  salesTimeseriesQuerySchema,
} from "../schemas/sales.schema.ts";
import {
  newSale,
  getAllSales,
  getSalesDetails,
  getSalesSummary,
  getSalesTimeseries,
  exportSalesPdf,
} from "../controllers/salesController.ts";

const router = Router();

router.post("/", authenticateToken, validateBody(newSaleSchema), newSale);
router.get("/", authenticateToken, validateQuery(listSalesQuerySchema), getAllSales);

// Both of these must come before "/:id" -- otherwise Express would try to
// parse "summary"/"timeseries" as a sale id and 400 on the uuid check.
router.get("/summary", authenticateToken, validateQuery(salesSummaryQuerySchema), getSalesSummary);
router.get("/timeseries", authenticateToken, validateQuery(salesTimeseriesQuerySchema), getSalesTimeseries);

// Same filters as "/", but returns the whole matching set as a PDF instead
// of one paginated page of JSON -- must come before "/:id" for the same
// reason summary/timeseries do.
router.get("/export/pdf", authenticateToken, validateQuery(listSalesQuerySchema), exportSalesPdf);

router.get("/:id", authenticateToken, validateParams(saleIdSchema), getSalesDetails);

export default router;
