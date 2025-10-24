title High-Level DevOps Plan (Entra ID + AWS ALB + ECS)

actor DevOps
participant Entra as Azure Entra ID
participant AWSNet as AWS Networking/Security
participant ECS as ECS Fargate
participant ALB as AWS ALB
participant DNS as Route 53

DevOps->Entra: 1) Create AD Group (per app) & add users
DevOps->Entra: 2) App Registration (per app) + Client Secret
DevOps->Entra: 3) Assign AD Group to App Registration

DevOps->AWSNet: 4) Ensure VPC + Public/Private Subnets
DevOps->AWSNet: 5) Create Security Groups (ALB 443; ECS from ALB)
DevOps->AWSNet: 6) Issue TLS cert in ACM (per app domain)

DevOps->ECS: 7) Create Task Definition & Service (per app)\n(target group created/linked)

DevOps->ALB: 8) Create ALB (per app) with HTTPS listener (cert attached)
DevOps->ALB: 9) Add OIDC auth rule → Entra; then Forward → app TG

DevOps->Entra: 10) Update Redirect URI = https://<APP_DNS>/oauth2/idpresponse
DevOps->DNS: 11) Create DNS record <APP_DNS> → ALB DNS

note over DevOps,ALB: Repeat for 8 apps → 8 ALBs, 8 Entra Apps,\n8 AD Groups, 8 ECS Services