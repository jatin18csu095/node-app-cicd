🔹 Phase 1 — Assessment & Prerequisites

☑ Identify on-premise Oracle database (version, size, schema, connectivity)
☑ Check network setup (VPC, subnets, routing, connectivity to AWS)
☑ Plan security: IAM roles, encryption (KMS), and access control
☑ Create or verify S3 bucket for data archive (naming, region, permissions)
☑ Create IAM roles/policies for RDS and S3 integration

⸻

🔹 Phase 2 — Database Migration / Setup

☑ Choose migration method:
 • AWS Database Migration Service (DMS) for continuous replication or
 • Data Pump export/import for one-time migration
☑ Create Amazon RDS for Oracle (or use existing Oracle on EC2)
☑ Configure VPC, subnet groups, and security groups for DB access
☑ Enable S3_INTEGRATION option group for RDS Oracle
☑ Attach IAM role to RDS with S3 access
☑ Test DB connectivity (SQL Developer / SQL*Plus)

⸻

🔹 Phase 3 — Data Export & Archival

☑ Use Oracle Data Pump to export schema/tables to DATA_PUMP_DIR
☑ Verify .dmp and .log files are generated successfully
☑ Use rdsadmin.rdsadmin_s3_tasks.upload_to_s3() to copy export files to S3
☑ Validate exported data in S3 bucket
☑ Apply proper storage class & lifecycle policies (e.g., move to Glacier after X days)
