import express from "express";
import { TeamController } from "./team.controller";
import { TeamValidation } from "./team.validation";
import { requireAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

router.get("/", requireAuth, TeamController.getAllTeams);

router.post(
	"/",
	requireAuth,
	validateRequest(TeamValidation.createTeamSchema),
	TeamController.createTeam,
);

export const TeamRoutes = router;
