import { deleteOldDeployments } from "./crons/deleteOldDeployments";

export interface Env {
	CLOUDFLARE_API_TOKEN: string;
	CLOUDFLARE_ACCOUNT_ID: string;
	DRY_RUN: boolean;
	PROJECT_NAMES: string[];
	EXPIRATION_DAYS: number;
}

export const workerHandler = {
	async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
		await deleteOldDeployments(env);
	},
};

export default workerHandler;
