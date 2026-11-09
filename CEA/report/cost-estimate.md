# Cost estimate — AWS deployment

**Region:** `us-east-1` (default)
**Pricing basis:** public on-demand prices at the time of writing (2026); verify
with the AWS Pricing Calculator before applying. Prices change and free-tier
rules are account-specific.

**Assumed steady state:** 2 tasks per ECS service, 730 hours/month, 10 GB in S3,
5 GB/month of CloudWatch Logs ingestion, about 1 ALB LCU average, 10 GB/month of
ALB egress, and 5 GB/month through the NAT. No Savings Plans or Spot.

## Monthly estimate (24/7, no free tier)

| Component | Unit price (approx.) | Quantity | Monthly |
|---|---|---:|---:|
| Fargate — API CPU | $0.04048 / vCPU-hour | 0.5 vCPU × 730 h | $14.78 |
| Fargate — API memory | $0.004445 / GB-hour | 1 GB × 730 h | $3.24 |
| Fargate — web CPU | $0.04048 / vCPU-hour | 1 vCPU × 730 h | $29.55 |
| Fargate — web memory | $0.004445 / GB-hour | 2 GB × 730 h | $6.49 |
| ALB base | $0.0225 / hour | 730 h | $16.43 |
| ALB LCU | $0.008 / LCU-hour | ~1 LCU × 730 h | $5.84 |
| NAT Gateway | $0.045 / hour | 730 h | $32.85 |
| NAT data processing | $0.045 / GB | 5 GB | $0.23 |
| Public IPv4 (NAT EIP) | $0.005 / hour | 730 h | $3.65 |
| RDS instance (`db.t4g.micro`) | $0.016 / hour | 730 h | $11.68 |
| RDS storage (gp3) | $0.115 / GB-month | 20 GB | $2.30 |
| S3 storage + requests | $0.023 / GB-month + requests | ~10 GB | $0.32 |
| ECR storage | $0.10 / GB-month | ~2 GB | $0.20 |
| CloudWatch Logs | $0.50 / GB ingested | 5 GB | $2.65 |
| Data transfer (ALB egress + cross-AZ) | $0.09 / GB + $0.01 / GB | ~11 GB | $1.10 |
| SSM SecureString parameters | free (standard) | 2 | $0.00 |
| CloudWatch alarms | first 10 free | 2 | $0.00 |
| **Total** | | | **≈ $131 / month** |
| **With ~10% buffer** | | | **≈ $144 / month** |

The Fargate compute ($54) and the network path (ALB $22 + NAT $33 + EIP $4 ≈ $59)
are about 86% of the bill. The database is a small fraction because
`db.t4g.micro` and 20 GiB are modest.

## 12-month free-tier adjustment

If the account still has the AWS Free Tier:

| Item | Free-tier allowance | Monthly saving |
|---|---|---:|
| RDS `db.t4g.micro`, Single-AZ | 750 h/month + 20 GB | ≈ $13.98 |
| S3 | 5 GB Standard storage | ≈ $0.12 |
| Data transfer out | 100 GB/month | ≈ $1.10 |
| CloudWatch Logs | 5 GB ingestion/storage | ≈ $2.65 |
| SSM SecureString / alarms | standard + first 10 alarms | $0.00 |
| **Free-tier-adjusted total** | | **≈ $113 / month** |

Fargate, ALB, NAT, and the public IPv4 address have no meaningful free tier and
remain the main cost.

## 72-hour grading window

Most of the cost is hourly, so a short deployment is cheap. For 3 days with the
default 2 tasks per service:

| Component | 72-hour cost |
|---|---:|
| Fargate (both services, 2 tasks each) | ≈ $5.34 |
| ALB (base + LCU) | ≈ $2.20 |
| NAT + data | ≈ $3.47 |
| Public IPv4 | ≈ $0.36 |
| RDS instance + storage | ≈ $1.38 (≈ $0 with free tier) |
| S3, ECR, logs, transfer | ≈ $0.55 |
| **Total** | **≈ $13 on-demand** |

With the free tier and 1 task per service (enough for screenshots and a light
load test), the 72-hour cost is roughly **$8–11**. A typical AWS credit balance
covers the whole assignment comfortably. **Destroy the stack after capturing
evidence** unless the instructor requires it to stay live.

## Cost-optimized demo profile

Set these in `terraform.tfvars` for a cheaper grading window:

```hcl
desired_count = 1
min_count     = 1
max_count     = 2
# Switch the ECS services to FARGATE_SPOT for ~70% off compute (edit ecs.tf
# capacity_provider_strategy if you want Spot).
```

| Profile | Monthly (24/7) | 72 hours |
|---|---:|---:|
| Default: 2 tasks, on-demand, free tier | ≈ $113 | ≈ $11 |
| Demo: 1 task, on-demand, free tier | ≈ $87 | ≈ $9 |
| Demo: 1 task, Fargate Spot, free tier | ≈ $70 | ≈ $7 |
| Default + RDS Multi-AZ | ≈ $127 (free-tier adjusted) | ≈ $12 |

## Cost controls already implemented

- One NAT Gateway instead of one per AZ.
- Right-sized Fargate tasks (0.25/0.5 vCPU).
- RDS `db.t4g.micro`, Single-AZ by default, 20 GiB gp3.
- 7-day CloudWatch log retention.
- ECR lifecycle keeps only 10 images.
- S3 `tmp/` objects expire after 1 day; noncurrent versions after 30 days.
- Container Insights and Performance Insights disabled.
- SSM SecureString instead of Secrets Manager.
- Optional ACM certificate has no charge for the certificate itself.

## Recommendations

1. Create an **AWS Budget** (for example, $50) with alerts at 50/80/100%.
2. Deploy shortly before the demo, capture screenshots, run the load test, then
   `terraform destroy`.
3. If the stack must stay live for weeks, use 1 task per service, Fargate Spot,
   and the free tier; consider a Compute Savings Plan only if the workload is
   long-lived.
4. Re-check prices in the AWS Pricing Calculator for the chosen region and
   account; this table is an estimate, not a quote.
