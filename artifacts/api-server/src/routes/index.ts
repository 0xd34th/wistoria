import { Router, type IRouter } from "express";
import healthRouter from "./health";
import redesignRouter from "./redesign";

const router: IRouter = Router();

router.use(healthRouter);
router.use(redesignRouter);

export default router;
