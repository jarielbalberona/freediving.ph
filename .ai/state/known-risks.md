# Known Risks

- Autonomous execution can amplify vague specifications. Every phase must define scope, verification, and hard stops clearly.
- The runner can invoke Codex, but it cannot guarantee good judgment. Skills and phase files must constrain behavior.
- Generated reports are useful only if verification evidence is concrete. Avoid optimistic summaries without command output.
- Repo state may contain unrelated dirty changes. Agents must inspect and preserve them.
- Product areas involving safety, verification, authentication, privacy, payments, or destructive data changes require conservative hard-stop behavior.
