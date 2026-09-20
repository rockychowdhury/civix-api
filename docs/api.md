Assume API prefix: `/api/v1`

### Auth

| Method | Endpoint                    | Purpose                        | Request body                                     |
| ------ | --------------------------- | ------------------------------ | ------------------------------------------------ |
| POST   | `/auth/register`            | Register citizen               | `email, phone?, password, first_name, last_name` |
| POST   | `/auth/login`               | Login                          | `email, password`                                |
| POST   | `/auth/logout`              | Logout current session         | —                                                |
| POST   | `/auth/refresh`             | Refresh access token           | `refresh_token`                                  |
| POST   | `/auth/verify-email`        | Verify email                   | `token`                                          |
| POST   | `/auth/resend-verification` | Resend verification            | `email`                                          |
| POST   | `/auth/forgot-password`     | Request reset                  | `email`                                          |
| POST   | `/auth/reset-password`      | Reset password                 | `token, password`                                |
| POST   | `/auth/change-password`     | Change password                | `current_password, new_password`                 |
| GET    | `/auth/me`                  | Current authenticated identity | —                                                |
| GET    | `/auth/sessions`            | List active sessions           | —                                                |
| DELETE | `/auth/sessions/:sessionId` | Revoke session                 | —                                                |
| POST   | `/auth/google`              | Google OAuth login/register    | `id_token`                                       |

### Users

| Method | Endpoint                | Purpose                   | Request body                      |
| ------ | ----------------------- | ------------------------- | --------------------------------- |
| GET    | `/users/me`             | Get own user              | —                                 |
| PATCH  | `/users/me`             | Update basic account data | `first_name?, last_name?, phone?` |
| DELETE | `/users/me`             | Soft-delete account       | —                                 |
| GET    | `/users`                | Admin list users          | —                                 |
| GET    | `/users/:userId`        | Get user                  | —                                 |
| PATCH  | `/users/:userId/status` | Change account status     | `status`                          |
| DELETE | `/users/:userId`        | Admin soft-delete user    | —                                 |

### Citizen Profiles

| Method | Endpoint               | Purpose                    | Request body                               |
| ------ | ---------------------- | -------------------------- | ------------------------------------------ |
| GET    | `/citizens/me`         | Get citizen profile        | —                                          |
| POST   | `/citizens/me`         | Create citizen profile     | `date_of_birth?, preferred_language?, ...` |
| PATCH  | `/citizens/me`         | Update citizen profile     | `date_of_birth?, preferred_language?, ...` |
| GET    | `/citizens/:citizenId` | Admin view citizen profile | —                                          |

### Staff Profiles / Memberships

| Method | Endpoint                                    | Purpose                      | Request body                                                              |
| ------ | ------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| POST   | `/staff`                                    | Create staff account/profile | `user_id, employee_code, designation?, joined_at?`                        |
| GET    | `/staff`                                    | List staff                   | `department_id?, team_id?, status?` as query                              |
| GET    | `/staff/:staffId`                           | Get staff profile            | —                                                                         |
| PATCH  | `/staff/:staffId`                           | Update staff profile         | `employee_code?, designation?`                                            |
| GET    | `/staff/:staffId/memberships`               | Staff membership history     | —                                                                         |
| POST   | `/staff/:staffId/memberships`               | Add department membership    | `department_id, team_id?, employment_role, effective_from, effective_to?` |
| PATCH  | `/staff/:staffId/memberships/:membershipId` | Update membership            | `team_id?, employment_role?, effective_to?, status?`                      |
| DELETE | `/staff/:staffId/memberships/:membershipId` | End membership               | `effective_to`                                                            |

### Roles

| Method | Endpoint                     | Purpose                  | Request body          |
| ------ | ---------------------------- | ------------------------ | --------------------- |
| GET    | `/roles`                     | List roles               | —                     |
| POST   | `/roles`                     | Create role              | `name, description?`  |
| GET    | `/roles/:roleId`             | Get role                 | —                     |
| PATCH  | `/roles/:roleId`             | Update role              | `name?, description?` |
| DELETE | `/roles/:roleId`             | Delete role              | —                     |
| GET    | `/roles/:roleId/permissions` | List role permissions    | —                     |
| PUT    | `/roles/:roleId/permissions` | Replace role permissions | `permission_ids[]`    |

### Permissions

| Method | Endpoint                     | Purpose          | Request body |
| ------ | ---------------------------- | ---------------- | ------------ |
| GET    | `/permissions`               | List permissions | —            |
| GET    | `/permissions/:permissionId` | Get permission   | —            |

### User Roles

| Method | Endpoint                       | Purpose         | Request body |
| ------ | ------------------------------ | --------------- | ------------ |
| GET    | `/users/:userId/roles`         | List user roles | —            |
| POST   | `/users/:userId/roles`         | Assign role     | `role_id`    |
| DELETE | `/users/:userId/roles/:roleId` | Remove role     | —            |

### Municipalities

| Method | Endpoint                          | Purpose                 | Request body                               |
| ------ | --------------------------------- | ----------------------- | ------------------------------------------ |
| GET    | `/municipalities`                 | List municipalities     | —                                          |
| POST   | `/municipalities`                 | Create municipality     | `name, slug, code, timezone, country_code` |
| GET    | `/municipalities/:municipalityId` | Get municipality        | —                                          |
| PATCH  | `/municipalities/:municipalityId` | Update municipality     | `name?, slug?, timezone?, status?`         |
| DELETE | `/municipalities/:municipalityId` | Deactivate municipality | —                                          |

### Zones

| Method | Endpoint               | Purpose            | Request body                  |
| ------ | ---------------------- | ------------------ | ----------------------------- |
| GET    | `/zones`               | List zones         | `municipality_id?` query      |
| POST   | `/zones`               | Create zone        | `municipality_id, name, code` |
| GET    | `/zones/:zoneId`       | Get zone           | —                             |
| PATCH  | `/zones/:zoneId`       | Update zone        | `name?, code?, status?`       |
| DELETE | `/zones/:zoneId`       | Deactivate zone    | —                             |
| GET    | `/zones/:zoneId/wards` | List wards in zone | —                             |

### Wards

| Method | Endpoint                     | Purpose                  | Request body                       |
| ------ | ---------------------------- | ------------------------ | ---------------------------------- |
| GET    | `/wards`                     | List wards               | `zone_id?, municipality_id?`       |
| POST   | `/wards`                     | Create ward              | `zone_id, name, code, boundary?`   |
| GET    | `/wards/:wardId`             | Get ward                 | —                                  |
| PATCH  | `/wards/:wardId`             | Update ward              | `name?, code?, boundary?, status?` |
| DELETE | `/wards/:wardId`             | Deactivate ward          | —                                  |
| GET    | `/wards/:wardId/departments` | Departments serving ward | —                                  |

### Departments

| Method | Endpoint                                           | Purpose               | Request body                                          |
| ------ | -------------------------------------------------- | --------------------- | ----------------------------------------------------- |
| GET    | `/departments`                                     | List departments      | `status?`                                             |
| POST   | `/departments`                                     | Create department     | `name, code, description?, email?, phone?`            |
| GET    | `/departments/:departmentId`                       | Get department        | —                                                     |
| PATCH  | `/departments/:departmentId`                       | Update department     | `name?, code?, description?, email?, phone?, status?` |
| DELETE | `/departments/:departmentId`                       | Deactivate department | —                                                     |
| GET    | `/departments/:departmentId/members`               | List department staff | —                                                     |
| POST   | `/departments/:departmentId/members`               | Add staff membership  | `staff_id, team_id?, employment_role, effective_from` |
| PATCH  | `/departments/:departmentId/members/:membershipId` | Update membership     | `team_id?, employment_role?, effective_to?, status?`  |
| DELETE | `/departments/:departmentId/members/:membershipId` | End membership        | `effective_to`                                        |
| GET    | `/departments/:departmentId/wards`                 | Get service areas     | —                                                     |
| PUT    | `/departments/:departmentId/wards`                 | Replace service areas | `ward_ids[]`                                          |

### Teams

| Method | Endpoint                               | Purpose           | Request body                |
| ------ | -------------------------------------- | ----------------- | --------------------------- |
| GET    | `/teams`                               | List teams        | `department_id?`            |
| POST   | `/teams`                               | Create team       | `department_id, name, code` |
| GET    | `/teams/:teamId`                       | Get team          | —                           |
| PATCH  | `/teams/:teamId`                       | Update team       | `name?, code?, status?`     |
| DELETE | `/teams/:teamId`                       | Deactivate team   | —                           |
| GET    | `/teams/:teamId/members`               | List team members | —                           |
| POST   | `/teams/:teamId/members`               | Add member        | `staff_membership_id`       |
| DELETE | `/teams/:teamId/members/:membershipId` | Remove member     | —                           |

### Request Types

| Method | Endpoint                 | Purpose                | Request body                 |
| ------ | ------------------------ | ---------------------- | ---------------------------- |
| GET    | `/request-types`         | List request types     | `municipality_id?`           |
| POST   | `/request-types`         | Create request type    | `name, code, description?`   |
| GET    | `/request-types/:typeId` | Get request type       | —                            |
| PATCH  | `/request-types/:typeId` | Update request type    | `name?, code?, description?` |
| DELETE | `/request-types/:typeId` | Delete/deactivate type | —                            |

### Categories

| Method | Endpoint                           | Purpose               | Request body                                                                                                     |
| ------ | ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/categories`                      | List categories       | `parent_id?, department_id?, status?`                                                                            |
| POST   | `/categories`                      | Create category       | `name, code, parent_id?, department_id?, default_priority, requires_location, requires_attachment`               |
| GET    | `/categories/:categoryId`          | Get category          | —                                                                                                                |
| PATCH  | `/categories/:categoryId`          | Update category       | `name?, code?, parent_id?, department_id?, default_priority?, requires_location?, requires_attachment?, status?` |
| DELETE | `/categories/:categoryId`          | Deactivate category   | —                                                                                                                |
| GET    | `/categories/:categoryId/children` | List child categories | —                                                                                                                |

### SLA Policies

| Method | Endpoint                             | Purpose                 | Request body                                                                                                           |
| ------ | ------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/sla-policies`                      | List SLA policies       | `category_id?, priority?, active?`                                                                                     |
| POST   | `/sla-policies`                      | Create SLA policy       | `category_id, priority, response_minutes, resolution_minutes, business_hours_only, escalation_enabled, effective_from` |
| GET    | `/sla-policies/:policyId`            | Get policy              | —                                                                                                                      |
| PATCH  | `/sla-policies/:policyId`            | Update policy           | `response_minutes?, resolution_minutes?, business_hours_only?, escalation_enabled?`                                    |
| POST   | `/sla-policies/:policyId/activate`   | Activate policy version | —                                                                                                                      |
| POST   | `/sla-policies/:policyId/deactivate` | Deactivate policy       | —                                                                                                                      |

### Routing Rules

| Method | Endpoint                 | Purpose             | Request body                                                                                 |
| ------ | ------------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/routing-rules`         | List routing rules  | `category_id?, ward_id?, department_id?, active?`                                            |
| POST   | `/routing-rules`         | Create routing rule | `category_id?, ward_id?, department_id, team_id?, priority?, priority_order, effective_from` |
| GET    | `/routing-rules/:ruleId` | Get rule            | —                                                                                            |
| PATCH  | `/routing-rules/:ruleId` | Update rule         | `category_id?, ward_id?, department_id?, team_id?, priority?, priority_order?, active?`      |
| DELETE | `/routing-rules/:ruleId` | Disable rule        | —                                                                                            |

### Locations

| Method | Endpoint                      | Purpose                      | Request body                                                    |
| ------ | ----------------------------- | ---------------------------- | --------------------------------------------------------------- |
| POST   | `/locations`                  | Create location              | `latitude, longitude, address_line, landmark?, postal_code?`    |
| GET    | `/locations/:locationId`      | Get location                 | —                                                               |
| PATCH  | `/locations/:locationId`      | Update location              | `latitude?, longitude?, address_line?, landmark?, postal_code?` |
| GET    | `/locations/:locationId/ward` | Resolve ward                 | —                                                               |
| GET    | `/locations/nearby`           | Find nearby locations/issues | —                                                               |

### Civic Issues

| Method | Endpoint                             | Purpose                        | Request body                                                            |
| ------ | ------------------------------------ | ------------------------------ | ----------------------------------------------------------------------- |
| GET    | `/civic-issues`                      | Search underlying civic issues | `category_id?, ward_id?, status?, priority?, lat?, lng?, radius?` query |
| POST   | `/civic-issues`                      | Create issue                   | `category_id, location_id, title, description, priority?`               |
| GET    | `/civic-issues/:issueId`             | Get issue                      | —                                                                       |
| PATCH  | `/civic-issues/:issueId`             | Update issue                   | `title?, description?, priority?, status?`                              |
| GET    | `/civic-issues/:issueId/reports`     | List citizen reports           | —                                                                       |
| GET    | `/civic-issues/:issueId/work-orders` | List work orders               | —                                                                       |
| POST   | `/civic-issues/:issueId/merge`       | Merge duplicate issue          | `target_issue_id, reason`                                               |
| POST   | `/civic-issues/:issueId/verify`      | Verify issue                   | `note?`                                                                 |

### Service Requests

| Method | Endpoint                                                 | Purpose                        | Request body                                                                                                                                  |
| ------ | -------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/service-requests`                                      | Search/filter requests         | `status?, category_id?, request_type_id?, ward_id?, department_id?, priority?, created_from?, created_to?, assigned_to?, page?, limit?` query |
| POST   | `/service-requests`                                      | Submit complaint/request       | `request_type_id, category_id, title, description, location_id, issue_id?, priority?`                                                         |
| GET    | `/service-requests/:requestId`                           | Get request                    | —                                                                                                                                             |
| PATCH  | `/service-requests/:requestId`                           | Update editable request        | `title?, description?, category_id?, location_id?`                                                                                            |
| DELETE | `/service-requests/:requestId`                           | Cancel own request             | `reason?`                                                                                                                                     |
| POST   | `/service-requests/:requestId/triage`                    | Triage request                 | `category_id?, priority?, department_id?, team_id?, issue_id?`                                                                                |
| POST   | `/service-requests/:requestId/accept`                    | Accept request                 | `note?`                                                                                                                                       |
| POST   | `/service-requests/:requestId/reject`                    | Reject request                 | `reason_code, note?`                                                                                                                          |
| POST   | `/service-requests/:requestId/reopen`                    | Reopen resolved/closed request | `reason`                                                                                                                                      |
| POST   | `/service-requests/:requestId/close`                     | Close completed request        | `note?`                                                                                                                                       |
| GET    | `/service-requests/:requestId/status-history`            | View lifecycle                 | —                                                                                                                                             |
| GET    | `/service-requests/:requestId/timeline`                  | Combined activity timeline     | —                                                                                                                                             |
| GET    | `/service-requests/:requestId/assignments`               | Assignment history             | —                                                                                                                                             |
| GET    | `/service-requests/:requestId/work-orders`               | Related work orders            | —                                                                                                                                             |
| GET    | `/service-requests/:requestId/comments`                  | Get comments                   | —                                                                                                                                             |
| POST   | `/service-requests/:requestId/comments`                  | Add comment                    | `body`                                                                                                                                        |
| GET    | `/service-requests/:requestId/attachments`               | List attachments               | —                                                                                                                                             |
| POST   | `/service-requests/:requestId/attachments`               | Upload evidence                | multipart: `file, metadata?`                                                                                                                  |
| DELETE | `/service-requests/:requestId/attachments/:attachmentId` | Remove attachment              | —                                                                                                                                             |
| GET    | `/service-requests/:requestId/feedback`                  | Get feedback                   | —                                                                                                                                             |
| POST   | `/service-requests/:requestId/feedback`                  | Submit citizen feedback        | `rating, comment?`                                                                                                                            |

### Assignments

| Method | Endpoint                                   | Purpose                      | Request body                                  |
| ------ | ------------------------------------------ | ---------------------------- | --------------------------------------------- |
| POST   | `/service-requests/:requestId/assignments` | Assign request to staff/team | `department_membership_id, team_id?, reason?` |
| GET    | `/service-requests/:requestId/assignments` | Assignment history           | —                                             |
| GET    | `/assignments/:assignmentId`               | Get assignment               | —                                             |
| PATCH  | `/assignments/:assignmentId`               | Update assignment            | `department_membership_id?, team_id?`         |
| POST   | `/assignments/:assignmentId/accept`        | Staff accepts assignment     | —                                             |
| POST   | `/assignments/:assignmentId/reject`        | Staff rejects assignment     | `reason`                                      |
| POST   | `/assignments/:assignmentId/unassign`      | Remove assignment            | `reason`                                      |

### Work Orders

| Method | Endpoint                                   | Purpose                       | Request body                                                                                 |
| ------ | ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/work-orders`                             | List/filter work orders       | `department_id?, team_id?, status?, priority?, assigned_to?, scheduled_from?, scheduled_to?` |
| POST   | `/service-requests/:requestId/work-orders` | Create operational work order | `department_id, team_id?, priority?, scheduled_start?, scheduled_end?, instructions?`        |
| GET    | `/work-orders/:workOrderId`                | Get work order                | —                                                                                            |
| PATCH  | `/work-orders/:workOrderId`                | Update work order             | `priority?, team_id?, scheduled_start?, scheduled_end?, instructions?`                       |
| POST   | `/work-orders/:workOrderId/start`          | Start field work              | `latitude?, longitude?`                                                                      |
| POST   | `/work-orders/:workOrderId/pause`          | Pause work                    | `reason`                                                                                     |
| POST   | `/work-orders/:workOrderId/resume`         | Resume work                   | —                                                                                            |
| POST   | `/work-orders/:workOrderId/complete`       | Complete field work           | `resolution_summary, resolution_code`                                                        |
| POST   | `/work-orders/:workOrderId/cancel`         | Cancel work order             | `reason`                                                                                     |
| GET    | `/work-orders/:workOrderId/updates`        | Work progress history         | —                                                                                            |
| POST   | `/work-orders/:workOrderId/updates`        | Add field update              | `update_type, note, latitude?, longitude?`                                                   |

### Resolutions

| Method | Endpoint                                | Purpose            | Request body               |
| ------ | --------------------------------------- | ------------------ | -------------------------- |
| POST   | `/work-orders/:workOrderId/resolutions` | Submit resolution  | `resolution_code, summary` |
| GET    | `/work-orders/:workOrderId/resolutions` | List resolutions   | —                          |
| GET    | `/resolutions/:resolutionId`            | Get resolution     | —                          |
| POST   | `/resolutions/:resolutionId/approve`    | Approve resolution | `note?`                    |
| POST   | `/resolutions/:resolutionId/reject`     | Reject resolution  | `reason`                   |

### Resolution Verification

| Method | Endpoint                                    | Purpose                     | Request body                            |
| ------ | ------------------------------------------- | --------------------------- | --------------------------------------- |
| POST   | `/service-requests/:requestId/verification` | Citizen verifies resolution | `verification_status, citizen_comment?` |
| GET    | `/service-requests/:requestId/verification` | Get verification result     | —                                       |
| POST   | `/resolutions/:resolutionId/verify`         | Staff/admin verification    | `verification_status, citizen_comment?` |

### Escalations

| Method | Endpoint                                   | Purpose            | Request body                             |
| ------ | ------------------------------------------ | ------------------ | ---------------------------------------- |
| GET    | `/escalations`                             | List escalations   | `status?, department_id?, trigger_type?` |
| GET    | `/escalations/:escalationId`               | Get escalation     | —                                        |
| POST   | `/service-requests/:requestId/escalations` | Manually escalate  | `to_user_id?, reason`                    |
| POST   | `/escalations/:escalationId/resolve`       | Resolve escalation | `note?`                                  |

### Comments

Use request-scoped comments above; no separate top-level CRUD is necessary except admin moderation:

| Method | Endpoint               | Purpose             | Request body |
| ------ | ---------------------- | ------------------- | ------------ |
| PATCH  | `/comments/:commentId` | Edit own comment    | `body`       |
| DELETE | `/comments/:commentId` | Soft-delete comment | —            |

### Attachments

| Method | Endpoint                     | Purpose                 | Request body |
| ------ | ---------------------------- | ----------------------- | ------------ |
| GET    | `/attachments/:attachmentId` | Get attachment metadata | —            |
| DELETE | `/attachments/:attachmentId` | Delete attachment       | —            |

### Feedback

| Method | Endpoint                | Purpose                             | Request body                                        |
| ------ | ----------------------- | ----------------------------------- | --------------------------------------------------- |
| GET    | `/feedback`             | Admin/department feedback analytics | `rating?, department_id?, category_id?, from?, to?` |
| GET    | `/feedback/:feedbackId` | Get feedback                        | —                                                   |
| PATCH  | `/feedback/:feedbackId` | Moderate feedback                   | `status?, moderation_note?`                         |

### Notifications

| Method | Endpoint                              | Purpose                    | Request body                         |
| ------ | ------------------------------------- | -------------------------- | ------------------------------------ |
| GET    | `/notifications`                      | List current notifications | `unread_only?, type?, page?, limit?` |
| GET    | `/notifications/:notificationId`      | Get notification           | —                                    |
| PATCH  | `/notifications/:notificationId/read` | Mark notification read     | —                                    |
| PATCH  | `/notifications/read-all`             | Mark all read              | —                                    |
| DELETE | `/notifications/:notificationId`      | Delete notification        | —                                    |
| GET    | `/notification-preferences`           | Get preferences            | —                                    |
| PUT    | `/notification-preferences`           | Replace preferences        | `preferences[]`                      |

### Audit Logs

| Method | Endpoint                  | Purpose            | Request body                                               |
| ------ | ------------------------- | ------------------ | ---------------------------------------------------------- |
| GET    | `/audit-logs`             | Admin audit search | `actor_id?, entity_type?, entity_id?, action?, from?, to?` |
| GET    | `/audit-logs/:auditLogId` | Get audit record   | —                                                          |

### Public / Discovery APIs

| Method | Endpoint                             | Purpose                     | Request body                                           |
| ------ | ------------------------------------ | --------------------------- | ------------------------------------------------------ |
| GET    | `/public/categories`                 | Public complaint categories | —                                                      |
| GET    | `/public/request-types`              | Public request types        | —                                                      |
| GET    | `/public/service-requests/:publicId` | Track request publicly      | —                                                      |
| GET    | `/public/civic-issues`               | Public issue map/list       | `category_id?, ward_id?, status?, lat?, lng?, radius?` |
| GET    | `/public/statistics`                 | Public service statistics   | `ward_id?, category_id?, from?, to?`                   |
| GET    | `/public/wards`                      | Public ward boundaries/info | —                                                      |
| GET    | `/public/departments`                | Public department directory | —                                                      |

### Operational / Dashboard APIs

| Method | Endpoint                | Purpose                      | Request body                               |
| ------ | ----------------------- | ---------------------------- | ------------------------------------------ |
| GET    | `/dashboard/citizen`    | Citizen dashboard            | —                                          |
| GET    | `/dashboard/staff`      | Staff workload dashboard     | —                                          |
| GET    | `/dashboard/department` | Department performance       | `from?, to?` query                         |
| GET    | `/dashboard/admin`      | Municipality-wide metrics    | `from?, to?, ward_id?, department_id?`     |
| GET    | `/dashboard/sla`        | SLA compliance metrics       | `from?, to?, department_id?, category_id?` |
| GET    | `/dashboard/heatmap`    | Complaint geographic heatmap | `from?, to?, category_id?, ward_id?`       |

### Recommended route structure

```text
/api/v1
├── auth
├── users
├── citizens
├── staff
├── roles
├── permissions
├── municipalities
├── zones
├── wards
├── departments
├── teams
├── request-types
├── categories
├── sla-policies
├── routing-rules
├── locations
├── civic-issues
├── service-requests
├── assignments
├── work-orders
├── resolutions
├── escalations
├── comments
├── attachments
├── feedback
├── notifications
├── notification-preferences
├── audit-logs
├── public
└── dashboard
```
