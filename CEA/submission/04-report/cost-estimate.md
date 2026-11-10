# Cost estimate

**Region:** us-east-1 · **Prices:** AWS public on-demand list prices (verify in
the [AWS Pricing Calculator](https://calculator.aws/) before submitting; free-tier
and credit eligibility depend on the account).

**Baseline:** default `terraform.tfvars` — 1 web + 1 api Fargate task
(0.25 vCPU / 0.5 GB each), running 730 h/month, ~5 GB through the NAT,
~10 GB served to users, ~1 GB of logs.

## Monthly estimate

| Component | Unit price | Quantity | Monthly (USD) |
|---|---|---|---:|
| Fargate vCPU | $0.04048 / vCPU-h | 2 × 0.25 vCPU × 730 h | 14.78 |
| Fargate memory | $0.004445 / GB-h | 2 × 0.5 GB × 730 h | 3.24 |
| ALB | $0.0225 / h | 730 h | 16.43 |
| ALB capacity units | $0.008 / LCU-h | ~0.5 LCU × 730 h | 2.92 |
| NAT gateway | $0.045 / h | 730 h | 32.85 |
| NAT data processing | $0.045 / GB | 5 GB | 0.23 |
| Public IPv4 addresses | $0.005 / h each | 3 (NAT EIP + 2 ALB) × 730 h | 10.95 |
| RDS `db.t4g.micro` (Single-AZ) | $0.016 / h | 730 h | 11.68 |
| RDS gp3 storage | $0.115 / GB-month | 20 GB | 2.30 |
| S3 storage + requests | $0.023 / GB-month | < 5 GB | 0.10 |
| ECR storage | $0.10 / GB-month | ~4 GB (10 images × 2 repos) | 0.40 |
| CloudWatch Logs | $0.50 / GB ingested | 1 GB | 0.50 |
| Data transfer out | $0.09 / GB | 10 GB | 0.90 |
| SSM standard parameters, Service Connect, ECS, IAM, VPC endpoint (gateway) | free | | 0.00 |
| **Total** | | | **≈ 97 / month** |

- **Per day:** ≈ **$3.20**. A one-week grading window costs about **$22**.
- **At full scale** (both services at `max_tasks = 2`): +$18 → ≈ $115 / month.
- **Free tier** (if the account is eligible): RDS `db.t4g.micro` 750 h + 20 GB
  is free, saving ≈ $14 → ≈ $83 / month.

Where the money goes: the **network path** (NAT $33 + ALB $19 + public IPv4
$11 ≈ $63, 65 %) costs more than compute ($18) and the database ($14) combined.
That is typical for small workloads and drives the optimisations below.

## Cost optimisations applied

1. **One NAT gateway instead of one per AZ** — saves ≈ $33/month plus a second
   EIP ($3.65). The S3 **gateway endpoint** (free) keeps all PDF traffic off
   the NAT, so NAT data charges stay near zero.
2. **Elastic, right-sized compute** — services run 1 task each and scale to 2
   only under load (instead of a fixed 2 + 2), at 0.25 vCPU / 0.5 GB. Saves
   ≈ $18/month versus always running two of each.
3. **Storage hygiene** — S3 `tmp/` uploads expire after 1 day, ECR keeps only 10
   images per repository, logs are kept 7 days.
4. **Ephemeral environment** — the whole stack is one `terraform apply` /
   `terraform destroy`; it only exists while it is needed.

## Further options (not applied)

| Option | Saving | Trade-off |
|---|---|---|
| ARM64 (Graviton) Fargate tasks | ~20 % of Fargate | Images must be built for `linux/arm64` |
| Fargate Spot for extra tasks | up to 70 % of those tasks | Tasks can be interrupted |
| Compute Savings Plan (1 yr) | ~20–50 % of Fargate | Commitment |
| Interface VPC endpoints instead of NAT | none at this size | Four endpoints × 2 AZs ≈ $58/month — more than the NAT |
| Tasks in public subnets, no NAT | ≈ $37/month | Weaker isolation; violates the private-app-tier design |
