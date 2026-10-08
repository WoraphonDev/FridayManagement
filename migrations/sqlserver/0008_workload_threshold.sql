-- T-088 FR-50: organization-wide workload highlight threshold (open tasks per person per week).
ALTER TABLE dbo.[organizations] ADD [workload_threshold] INT NOT NULL CONSTRAINT [df_organizations_workload_threshold] DEFAULT (10) CONSTRAINT [ck_organizations_workload_threshold] CHECK ([workload_threshold] BETWEEN 1 AND 1000);
