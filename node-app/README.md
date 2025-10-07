Got it 👍 — here’s a concise message-style summary that directly reflects the data from your Excel file:

⸻

Message: Pre-Migration Access and Permissions – GIFT Archive

Below is the list of all required permissions and accesses to be in place before migration:
	•	Account Level: Access to create service-linked roles (for DMS, Glue, SSM).
	•	VPC / Networking: Permissions to create ENIs, Security Groups, VPC Endpoints, Route Tables; ensure port 1521 open between DMS and DB.
	•	EC2 (Jump/VDI): Permission to launch instances and SSM access for remote connectivity.
	•	KMS: Encrypt/Decrypt and DataKey permissions on KMS keys used by S3, RDS, and replication.
	•	Secrets Manager: Read access to DB credential secrets.
	•	CloudWatch Logs: Write access for DMS logs (AmazonDMSCloudWatchLogsRole).
	•	DMS Roles: Service-linked roles (AWSServiceRoleForDMS, AmazonDMSVPCManagementRole) and task execution role with S3 and Secrets access.
	•	S3: Read/Write/List permissions on migration and results buckets; bucket policy to allow DMS role.
	•	Glue: AWSGlueServiceRole with access to S3/KMS and Glue Database/Table creation.
	•	Athena: Query and result write permissions to S3 results bucket.
	•	RDS / Target DB: Create, Modify, Describe permissions on DB instance; inbound from DMS instance allowed.
	•	Oracle Source DB: User with CREATE SESSION, SELECT ANY TABLE, EXECUTE DBMS_LOGMNR privileges; supplemental logging enabled.
	•	Datapump / SCT: EXP_FULL_DATABASE and IMP_FULL_DATABASE privileges for data export/import.
	•	IAM: Ability to create, attach, and pass roles (limited to migration-specific roles).

All above accesses should be validated and approved before migration to ensure smooth DMS setup, replication, and post-migration validation.

⸻

Would you like me to make this message directly editable (in Word or Excel “Notes” tab format)?