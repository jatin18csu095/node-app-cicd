✅ Action Items (copy-paste ready)
	1.	No action pending — request submitted and approved via SailPoint workflow.
	2.	No action pending — approval completed by Manager/Identity Team.
	3.	No action pending — AD Group successfully created in Entra.
	4.	No action pending — users added to AD group.
	5.	No action pending — Object ID already retrieved for app registration mapping.
	6.	No action pending — SSO intake request submitted through MyPruIT.
	7.	No action pending — engineer assigned for Entra app onboarding.
	8.	No action pending — application registered in Entra, Client ID and Tenant ID generated.
	9.	No action pending — client secret generated and stored in Secrets Manager.
	10.	No action pending — OIDC credentials (Client ID, Tenant ID, Secret) already shared with Deloitte team.
	11.	Action pending from Deloitte DevOps — update manifest.yaml in infra repo with OIDC parameters (Client ID, Tenant ID, Secret).
	12.	Action pending from Deloitte DevOps — redeploy infrastructure (ALB, Secrets Manager, Route53) after OIDC configuration is added.
	13.	Action pending from Deloitte Developers — update microservice repo and container definition with OIDC environment variables.
	14.	Action pending from Deloitte DevOps — validate ALB OIDC listener rule (“Authenticate using OIDC”) and confirm token flow.
	15.	Action pending from Prudential Identity/Security Team — submit OIDC onboarding requests per environment (QA, DR, PROD).
	16.	Joint action (Prudential + Deloitte) — Prudential to share OIDC endpoints; Deloitte to cross-verify Issuer, Authorization, and JWKS URLs with ALB configuration.