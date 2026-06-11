# User Roles

Status: unknown / to be confirmed

Source: current repo inspection.

The repo clearly uses Clerk-backed authentication and contains moderation/admin-oriented docs and flows, but a bounded current role model has not yet been verified from code in this adoption pass.

Safe current statement:

- authenticated users exist
- web and backend surfaces likely enforce additional role/permission boundaries

Do not infer a complete role matrix from legacy root docs without later validation.
