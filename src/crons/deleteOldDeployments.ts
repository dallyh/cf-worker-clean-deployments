import { Env } from "..";

export async function deleteOldDeployments(env: Env) {
	console.log("Started scheduled event..." + new Date().toUTCString());

	if (!env.CLOUDFLARE_API_TOKEN) {
		throw new Error("CLOUDFLARE_API_TOKEN variable is not set!");
	}

	if (!env.CLOUDFLARE_ACCOUNT_ID) {
		throw new Error("CLOUDFLARE_ACCOUNT_ID variable is not set!");
	}

	if (!env.EXPIRATION_DAYS) {
		throw new Error("EXPIRATION_DAYS variable is not set!");
	}

	if (!env.PROJECT_NAMES) {
		throw new Error("PROJECT_NAMES variable is not set!");
	}

	for (const project of env.PROJECT_NAMES) {
		console.log(`Working on project ${project}...`);
		await deleteDeployments(env, project);
	}
}

async function deleteDeployments(env: Env, project: string, page: number | undefined = undefined) {
	const init = {
		headers: {
			"Content-Type": "application/json;charset=UTF-8",
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
		},
	};

	const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${project}/deployments`;
	const fetchEndpoint = `${endpoint}?per_page=25${page !== undefined ? `&page=${page}` : ""}`;

	const response = await fetch(fetchEndpoint, init);
	const deployments: any = await response.json();

	if (!response.ok) {
		throw new Error("Error in response: " + response.status);
	}

	console.log(`Current fetched page is ${deployments.result_info.page} out of ${deployments.result_info.total_pages}...`);

	for (const deployment of deployments.result) {
		if ((Date.now() - new Date(deployment.created_on).getTime()) / 86400000 > env.EXPIRATION_DAYS) {
			if (env.DRY_RUN) {
				console.log(
					`DRY_RUN: Deleting deployment: ${deployment.environment} - [${deployment.deployment_trigger.metadata.branch}][${deployment.deployment_trigger.metadata.commit_message}]@${deployment.url} (${deployment.id})`,
				);
				continue;
			}

			try {
				console.log(
					`Deleting deployment: ${deployment.environment} - [${deployment.deployment_trigger.metadata.branch}][${deployment.deployment_trigger.metadata.commit_message}]@${deployment.url} (${deployment.id})`,
				);

				const response = await fetch(`${endpoint}/${deployment.id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json;charset=UTF-8",
						Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
					},
				});

				const result = await response.json();

				if (!response.ok) {
					console.error("Failed to delete deployment: " + JSON.stringify(result));
				} else {
					console.log("Success.");
				}
			} catch (err) {
				console.error(`Failed: ${(err as Error).message}`);
			}
		}
	}

	if (deployments.result_info.total_pages > 1 && deployments.result_info.page !== deployments.result_info.total_pages) {
		const nextPage = deployments.result_info.page + 1;
		await deleteDeployments(env, project, nextPage);
	}
}
