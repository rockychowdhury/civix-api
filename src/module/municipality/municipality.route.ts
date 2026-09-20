import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MunicipalityController } from "./municipality.controller";
import { MunicipalityValidation } from "./municipality.validation";

const router = Router();

router.get(
	"/",
	requirePermission(Action.READ, Resource.MUNICIPALITY),
	MunicipalityController.getMunicipalities,
);
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.MUNICIPALITY),
	validateRequest(MunicipalityValidation.createMunicipalitySchema),
	MunicipalityController.createMunicipality,
);
router.get(
	"/:municipalityId",
	requirePermission(Action.READ, Resource.MUNICIPALITY),
	MunicipalityController.getMunicipalityById,
);
router.patch(
	"/:municipalityId",
	requirePermission(Action.UPDATE, Resource.MUNICIPALITY),
	validateRequest(MunicipalityValidation.updateMunicipalitySchema),
	MunicipalityController.updateMunicipality,
);
router.delete(
	"/:municipalityId",
	requirePermission(Action.DELETE, Resource.MUNICIPALITY),
	MunicipalityController.deleteMunicipality,
);

export const MunicipalityRoutes = router;
