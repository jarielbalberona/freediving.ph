# Incident Basics Runbook

## Severity levels
- Sev 1: active security/privacy breach or full production outage.
- Sev 2: major feature outage or critical moderation/control failure.
- Sev 3: degraded performance or isolated feature breakage.

## First 15 minutes
1. Declare incident channel and assign incident commander.
2. Capture exact start time and affected services.
3. Stabilize:
   - block abusive traffic if applicable
   - rollback recent deploy if clear regression
4. Validate health:
   - `GET /health`
   - `GET /health/ready`
   - error-rate and latency snapshot from metrics endpoint

## Containment playbook
1. Security/auth bug: restrict affected endpoint(s) behind temporary deny rules.
2. Data integrity issue: pause writes if corruption risk exists.
3. Moderation failure: temporarily elevate moderation review strictness.

## Communication
1. Post internal status updates every 30 minutes for Sev1/Sev2.
2. Keep updates factual: impact, mitigation, next checkpoint.

## Recovery and closeout
1. Verify root-cause fix in production.
2. Confirm critical user journeys.
3. Write post-incident summary with:
   - timeline
   - root cause
   - corrective actions
   - prevention tasks with owners
