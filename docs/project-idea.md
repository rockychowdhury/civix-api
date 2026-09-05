# Project Direction: City Complaint & Service Request Platform

I would **not** build this as a generic “complaint CRUD application.” That would make the project look like:

> User creates complaint → Admin changes status → Done.

Instead, we can make it a realistic **municipal service operations system** where a complaint becomes a trackable operational case, gets routed to the correct department, assigned to a field worker, worked on under an SLA, verified with evidence, and finally closed with citizen feedback.

That gives us much richer backend engineering.

Current civic systems already demonstrate the value of location, category, tracking, department workflows, and public statistics. Bangladesh's GRS supports complaint submission, anonymous complaints and status tracking, while NYC 311 publishes service-request statistics by agency, request type and geography. ([GRS Bangladesh][1])

---

# 1. First: What Real Problem Are We Solving?

Imagine someone living in Dhaka notices:

> “The road beside my neighborhood has a huge pothole. It is getting dangerous during rain.”

Today, several things can go wrong.

### Problem A — The citizen does not know whom to contact

Is it:

* City Corporation?
* Roads department?
* WASA?
* Electricity authority?
* Traffic authority?

A citizen shouldn't have to understand the government's organizational structure.

### Problem B — Bad location information

“Near Mirpur 10” isn't enough for a technician.

The system needs:

> GPS + address + ward + optional landmark

So the responsible authority can locate the issue.

### Problem C — Wrong department assignment

A drainage issue sent to a road-maintenance department creates delay and manual handoffs.

The system should determine:

> Category → jurisdiction → department → responsible team

### Problem D — Multiple citizens report the same problem

Suppose 40 people report the same pothole.

Without deduplication:

> 40 complaints → 40 tickets → duplicated work.

Instead:

> 40 citizen reports → 1 underlying issue → 40 supporters/reporters

This is a very interesting domain problem.

### Problem E — “In Progress” can mean almost anything

A department may mark something as:

> In Progress

but nobody knows:

* Who is working on it?
* When did work start?
* What was actually done?
* Is someone physically at the location?
* What remains?

We need a proper work lifecycle.

### Problem F — SLA violations

A broken streetlight might have an expected response time of 48 hours.

A dangerous exposed electrical wire might require immediate escalation.

Therefore different request types need different:

> Priority + response SLA + resolution SLA.

### Problem G — Resolution without proof

A technician says:

> “Fixed.”

How does the citizen know?

We can require:

> Before photo → work notes → after photo → verification

This creates accountability.

### Problem H — Citizen submits a complaint and hears nothing

The system should continuously communicate:

> Submitted → Assigned → Technician dispatched → Work started → Resolved → Feedback requested

This is one of the strongest UX aspects of the project.

---

# 2. Our Product Concept

Let's give the system a clearer identity.

## Working name

**NagarFix**

> **NagarFix — Report. Track. Resolve.**

The platform connects citizens with municipal departments and field teams.

The important conceptual distinction is:

### Complaint

Something is wrong.

Examples:

* pothole
* garbage overflow
* broken streetlight
* blocked drain
* water leakage
* illegal dumping
* damaged sidewalk
* traffic signal malfunction

### Service Request

The citizen actively requests a municipal service.

Examples:

* waste pickup request
* tree trimming request
* road cleaning request
* streetlight inspection
* drainage cleaning
* bulky waste collection

Both can share the same underlying **Case / Service Request** workflow.

---

# 3. The Core Domain Model

I would structure the system around this concept:

```text
Citizen
   │
   ▼
Service Request
   │
   ├── Category
   ├── Location
   ├── Attachments
   └── Priority
          │
          ▼
     Triage / Routing
          │
          ├── Department
          ├── Ward
          └── SLA Policy
                 │
                 ▼
             Assignment
                 │
                 ▼
          Technician / Staff
                 │
                 ▼
             Work Order
                 │
                 ▼
          Progress Updates
                 │
                 ▼
          Resolution Evidence
                 │
                 ▼
             Verification
             /       \
         Approved   Rejected
             │         │
             ▼         └── Reopened
          Closed
             │
             ▼
       Citizen Feedback
```

This is much more interesting than simply:

```text
Complaint -> Status
```

---

# 4. Users and Their Responsibilities

I would use **five major roles**, but importantly, roles should represent actual responsibilities.

## 1. Citizen

Can:

* create requests
* upload images
* choose location
* track requests
* comment/add information
* confirm resolution
* reject an incorrect resolution
* rate service
* report duplicates

---

## 2. Department Staff / Dispatcher

This is the operational middle layer.

Can:

* review incoming requests
* validate reports
* assign department
* change priority
* merge duplicates
* assign work
* escalate overdue cases
* monitor SLA
* communicate with citizen

This role is extremely important.

---

## 3. Technician / Field Worker

Technicians should have a **restricted workflow**.

They don't need access to everything.

They see:

> My assigned work

Then:

```text
Assigned
   ↓
Accepted
   ↓
On Site
   ↓
Working
   ↓
Completed
```

They can submit:

* arrival time
* work notes
* material used
* before photo
* after photo
* completion note

---

## 4. Department Manager

Responsible for department performance.

Dashboard:

```text
Open Cases       128
Overdue           17
Due Today         23
Resolved This Week 94
SLA Compliance    91%
```

Can:

* manage staff
* reassign work
* approve escalations
* monitor SLA
* view department analytics

---

## 5. City Admin

System-wide administration.

Can manage:

* departments
* wards
* categories
* SLA policies
* users
* permissions
* service areas
* escalation rules
* public statistics
* system configuration

---

# 5. The Most Important Entity: Service Request

Instead of making `Complaint` the center of everything, I'd call the main entity:

## `ServiceRequest`

Because it can represent both complaints and service requests.

Example:

```text
SR-2026-000481

Type: Complaint
Category: Road > Pothole

Priority: HIGH

Location:
Lat: 23.8103
Lng: 90.4125

Ward: 19
Department: Roads & Infrastructure

Status: WORKING

SLA:
Response due: 24h
Resolution due: 72h
```

Now the backend has a proper case-management concept.

---

# 6. Category System

Don't make categories a flat enum.

Use a hierarchy.

```text
Road & Infrastructure
├── Pothole
├── Damaged Road
├── Broken Sidewalk
├── Road Sign
└── Traffic Signal

Waste Management
├── Garbage Overflow
├── Illegal Dumping
├── Missed Collection
└── Waste Pickup Request

Drainage
├── Blocked Drain
├── Waterlogging
├── Sewer Overflow
└── Drain Damage

Street Lighting
├── Light Not Working
├── Damaged Pole
├── Exposed Wire
└── Flickering Light
```

Each category can contain business rules:

```text
Category
   │
   ├── Department
   ├── Default Priority
   ├── Response SLA
   ├── Resolution SLA
   ├── Required Evidence
   └── Assignment Rules
```

That becomes powerful.

---

# 7. Location Intelligence

Location should not just be:

```text
address: string
```

We can model:

```text
Location
├── latitude
├── longitude
├── address
├── landmark
├── ward
└── zone
```

The system can derive:

```text
GPS
 ↓
Ward
 ↓
Zone
 ↓
Responsible Department
```

This means citizens don't need to understand administrative boundaries.

---

# 8. Smart Routing

One of the strongest backend problems.

Suppose someone reports:

> “Drainage blocked near my house.”

The system can determine:

```text
Category = Drainage
Location = Ward 12

        ↓

Routing Rules

        ↓

Department = Drainage Department
Zone = North Zone
Team = Drainage Team B
```

We can initially make this deterministic.

### Example

```text
IF category = "Streetlight"
AND ward IN department.serviceWards

THEN assign Street Lighting Department
```

Later, routing rules can become configurable.

---

# 9. SLA Engine

This is one of the features I strongly recommend.

Every category can have an SLA.

Example:

| Category                | Priority | Response SLA | Resolution SLA |
| ----------------------- | -------: | -----------: | -------------: |
| Exposed electrical wire | Critical |           1h |             6h |
| Water leakage           |     High |           4h |            24h |
| Pothole                 |   Medium |          12h |            72h |
| Garbage overflow        |   Medium |          12h |            24h |
| Streetlight             |      Low |          24h |            72h |

Then:

```text
created_at
      +
response_sla
      =
response_deadline
```

And:

```text
created_at
      +
resolution_sla
      =
resolution_deadline
```

The backend can automatically detect:

```text
NORMAL
DUE_SOON
OVERDUE
BREACHED
```

---

# 10. Don't Make Status a Simple Enum

This project is perfect for a **state machine**.

Instead of allowing:

```http
PATCH /requests/:id
{
  "status": "RESOLVED"
}
```

we define valid transitions.

For example:

```text
SUBMITTED
   ↓
TRIAGED
   ↓
ASSIGNED
   ↓
ACCEPTED
   ↓
IN_PROGRESS
   ↓
PENDING_VERIFICATION
   ↓
RESOLVED
   ↓
CLOSED
```

But there can be branches:

```text
SUBMITTED
   ├── REJECTED
   ├── DUPLICATE
   └── INSUFFICIENT_INFORMATION
```

And:

```text
RESOLVED
   ↓
Citizen disagrees
   ↓
REOPENED
   ↓
IN_PROGRESS
```

This gives us excellent business logic to implement.

---

# 11. Duplicate Complaint Handling

This could become one of our signature features.

Imagine:

```text
Complaint A
Pothole
GPS: 23.8101, 90.4121

Complaint B
Pothole
GPS: 23.8103, 90.4123

Complaint C
Pothole
GPS: 23.8099, 90.4124
```

The system detects that they are probably the same physical issue.

Instead of three independent cases:

```text
Issue #481
 ├── Reported by 12 citizens
 ├── 8 photos
 ├── 12 supporting reports
 └── 1 work order
```

This creates a distinction between:

### Citizen Report

and

### Underlying Civic Issue

That's a much more sophisticated domain model.

---

# 12. Issue vs Report

This is an architectural decision I really like for this project.

Instead of:

```text
Complaint
```

consider:

```text
CivicIssue
   │
   ├── Reports
   ├── WorkOrder
   ├── Assignments
   ├── Updates
   └── Resolution
```

For example:

```text
Civic Issue #1008
"Pothole on Road X"

Reports:
 ├── Citizen A
 ├── Citizen B
 ├── Citizen C
 └── Citizen D
```

That means reporting the same problem doesn't create duplicate operational work.

---

# 13. Resolution Verification

Technician:

```text
Work completed
     ↓
Upload after-photo
     ↓
Add resolution note
     ↓
Submit for verification
```

Then:

```text
Citizen
   ↓
Sees before + after
   ↓
"Resolved"
   OR
"Problem still exists"
```

If citizen rejects:

```text
RESOLVED
   ↓
REOPENED
   ↓
ASSIGNED AGAIN
```

This gives the system a real feedback loop.

Modern civic platforms also use before/after evidence and citizen confirmation/ratings as part of their workflow. ([Digi Janta][2])

---

# 14. Audit Log

This should be a first-class entity.

Example:

```text
08:30
Citizen submitted request

08:34
System assigned Drainage Department

08:51
Officer changed priority LOW → HIGH

09:05
Technician assigned

10:17
Technician accepted assignment

12:43
Technician marked On Site

14:21
Resolution evidence uploaded

15:00
Manager approved resolution

15:03
Citizen notified
```

A generic:

```text
updated_at
```

isn't enough.

We need:

```text
AuditLog
├── actor
├── action
├── entity
├── oldValue
├── newValue
├── timestamp
└── metadata
```

This will become useful for accountability and debugging.

---

# 15. Notifications

We shouldn't add notifications just because Nodemailer exists.

They solve actual problems.

### Citizen

```text
Your request has been submitted.

Your request was assigned to Drainage Department.

A technician has been assigned.

Work has started.

Your issue has been resolved.
```

### Staff

```text
New HIGH priority request assigned.

Request #SR-00182 is approaching SLA breach.

Request #SR-00412 has been reopened.
```

### Manager

```text
12 requests breached SLA today.
```

Channels can eventually be:

```text
Email
In-app
Push
```

But MVP can start with email + in-app notification records.

---

# 16. Redis — Give It a Real Purpose

Don't use Redis simply because Redis is in the tech stack.

Good uses here would be:

### Rate limiting

Prevent:

```text
POST /service-requests
```

being abused.

### Temporary OTP/session data

If custom authentication uses OTP.

### Caching

For expensive public analytics:

```text
GET /public/statistics
```

### Background job coordination

For:

* SLA checks
* notifications
* escalation processing

For example:

```text
Every minute

       ↓

Find requests approaching deadline

       ↓

Notify responsible staff

       ↓

Escalate overdue requests
```

---

# 17. Background Jobs

This project naturally benefits from asynchronous processing.

Example:

```text
Citizen submits request
        │
        ├── Save request
        ├── Return response immediately
        │
        └── Background jobs
              ├── send confirmation email
              ├── determine routing
              ├── detect potential duplicates
              ├── calculate SLA
              └── create notification
```

That makes the architecture much more realistic.

---

# 18. File Upload

Not:

> “Upload image because Cloudinary is available.”

The image actually serves as evidence.

We can distinguish:

```text
REPORT_EVIDENCE
BEFORE_WORK
DURING_WORK
AFTER_WORK
DOCUMENT
```

So an attachment has meaning.

Example:

```text
Attachment
├── serviceRequestId
├── uploadedBy
├── type
├── cloudinaryUrl
├── publicId
└── createdAt
```

---

# 19. Citizen Reputation / Abuse Prevention

A real complaint platform has an abuse problem.

Someone could submit:

> 500 fake complaints.

So we could implement a simple trust mechanism.

Not:

> “Citizen has 72 points.”

Rather:

```text
Citizen Trust Level

New
Regular
Trusted
Restricted
```

Signals:

* verified phone/email
* spam reports
* rejected complaints
* duplicate abuse
* confirmed legitimate reports

And rate limits become stricter for suspicious activity.

This is optional, but very realistic.

---

# 20. Public Transparency Portal

This is where the project becomes more than an internal ticketing system.

Citizens should be able to see aggregated statistics such as:

```text
Reported this month       12,481
Resolved                  9,842
In progress               1,932
Overdue                     707
Average resolution         31h
SLA compliance              88%
```

And:

```text
Top Problems

1. Waste overflow
2. Road damage
3. Drainage
4. Streetlights
5. Water leakage
```

This resembles the public-facing service-request analytics exposed by mature 311 systems. ([New York City Government][3])

---

# 21. Heatmap / Geographic Analytics

This is a particularly good feature for PostgreSQL.

We could have:

```text
Map

 🔴 🔴
 🔴
       🟡
             🟢
```

Managers can discover:

> “This ward repeatedly experiences drainage complaints.”

Then the system becomes useful not only for **responding to complaints**, but also for **urban planning**.

Traffy Fondue, for example, uses geolocated reports and aggregated complaint data for city-level analytics and planning. ([Frontiers][4])

---

# 22. Analytics That Actually Matter

Rather than generic:

```text
Total Users
Total Complaints
```

we should calculate operational KPIs.

### Department

```text
Average Response Time
Average Resolution Time
SLA Compliance
Open Workload
Overdue Requests
Reopen Rate
```

### Technician

```text
Assigned
Completed
Average Completion Time
Overdue Jobs
Reopened Jobs
```

### Category

```text
Complaint Volume
Resolution Rate
Average Resolution Time
```

### Geography

```text
Requests by Ward
Requests by Zone
Issue Hotspots
Recurring Issues
```

---

# 23. Scheduling and Assignment

Eventually a manager shouldn't manually pick a technician from:

> 100 employees.

We can create an assignment score:

```text
score =
    category_match
  + ward_match
  + current_workload
  + technician_availability
  + distance_from_issue
```

Then:

```text
Best Technician
        ↓
Suggested Assignment
```

The manager can accept or override it.

This is a great place to introduce algorithmic reasoning without unnecessarily introducing AI.

---

# 24. A Very Interesting Business Rule

Suppose a technician has:

```text
5 assigned jobs
```

and another has:

```text
1 assigned job
```

The system shouldn't simply choose the closest technician.

We could calculate:

```text
assignmentScore =
   skillMatch
   + locationDistance
   + workloadBalance
   + priority
```

This creates a genuine **resource allocation problem**.

---

# 25. Escalation Workflow

Suppose:

```text
Resolution SLA = 24 hours
```

At:

```text
18h → warning
22h → supervisor notification
24h → SLA breached
30h → department manager escalation
```

So the workflow becomes:

```text
Assigned
   ↓
Approaching SLA
   ↓
SLA Warning
   ↓
Overdue
   ↓
Escalated
```

This is excellent backend logic.

---

# 26. Recommended Core Features

I would divide the project into three levels.

## Phase 1 — Essential

These define the product.

```text
Authentication
RBAC
Citizen accounts

Departments
Categories
Wards / Locations

Service Requests
Attachments
Assignments

Status State Machine
Audit Logs

SLA Policies
Notifications

Technician workflow
Resolution evidence

Citizen feedback
Admin dashboard
```

---

## Phase 2 — Strong Engineering Features

These make the project stand out.

```text
Duplicate issue detection

Issue ↔ Reports relationship

Automatic department routing

Workload-based technician assignment

SLA escalation

Background jobs

Redis caching

Rate limiting

Advanced filtering/search

Geospatial queries

Public statistics
```

---

## Phase 3 — Advanced / Optional

Only after the core system is stable.

```text
AI category suggestion
AI priority suggestion
AI duplicate similarity
AI complaint summarization

Predictive hotspots
Resolution-time prediction

WhatsApp intake
SMS notifications
Push notifications

Open-data API
```

Notice that **AI is optional**.

The project is already technically interesting without it.

---

# 27. What I Would NOT Add

This is equally important.

I would avoid:

### ❌ Payments

There isn't a natural payment requirement here.

So Stripe/bKash shouldn't be forced into the project.

### ❌ Social feed

People don't need:

> “Like this pothole.”

A simple:

> “Report same issue”

is more useful.

### ❌ Chat system

Don't build a full Messenger clone.

Use:

```text
Request comments
```

where communication is context-specific.

### ❌ Overcomplicated AI

Don't start with:

> GPT + computer vision + recommendation engine + chatbot + agents.

The underlying workflow should work without AI.

---

# 28. Where Each Technology Actually Fits

This is how I'd justify the stack.

| Technology         | Actual Purpose                       |
| ------------------ | ------------------------------------ |
| Node.js            | Runtime                              |
| TypeScript         | Type-safe backend                    |
| Express            | REST API                             |
| PostgreSQL         | Core relational data                 |
| Prisma             | ORM + relations + transactions       |
| Zod                | Request validation                   |
| Redis              | Cache + rate limit + temporary state |
| Cloudinary         | Evidence/image storage               |
| Nodemailer/Resend  | Transactional notifications          |
| PostgreSQL indexes | Fast operational queries             |
| Postman            | API testing/documentation            |
| Render/Vercel      | Deployment                           |

This is important because every technology has a **domain reason**.

---

# 29. Initial Database Domain

Before writing Prisma models, I expect something roughly around:

```text
User
Role
Permission

CitizenProfile
StaffProfile

Department
DepartmentMember

Ward
Zone

Category
SlaPolicy
RoutingRule

ServiceRequest
ServiceRequestReport
Issue

Location

Assignment
WorkOrder
WorkUpdate

Attachment

StatusHistory
AuditLog

Notification
NotificationPreference

Feedback

Escalation
```

Not all of these need to become separate tables immediately.

We'll normalize them only where the domain requires it.

---

# 30. The Most Interesting Relationship

I think this will become one of the project's defining pieces:

```text
                CivicIssue
                    │
          ┌─────────┴─────────┐
          │                   │
      Reports            WorkOrder
     /   |   \                │
 Citizen Citizen Citizen      │
                              │
                       Technician
                              │
                       Work Updates
                              │
                       Resolution
                              │
                     Citizen Feedback
```

This solves the real-world problem of:

> **many people reporting one physical problem**

rather than treating every submission as an independent job.

---

# 31. A Concrete Example

Let's walk through a realistic case.

### Citizen submits

> “Drain beside Road 7 is blocked and water is accumulating.”

Uploads:

```text
2 photos
GPS coordinates
Description
```

### System

```text
Category = Drainage
Ward = 14
Priority = HIGH

Department = Drainage
Response SLA = 4h
Resolution SLA = 24h
```

### Duplicate detection

System finds:

```text
Existing Issue #882
Distance: 43 meters
Category: Same
Recent report: 2 hours ago
```

So:

```text
New report
      ↓
Attach to Issue #882
```

No unnecessary second work order.

### Dispatcher

Assigns:

```text
Technician #42
```

### Technician

```text
Accepted
   ↓
On Site
   ↓
Uploads before image
   ↓
Clears drain
   ↓
Uploads after image
   ↓
Completed
```

### Citizen

Receives:

> “Your reported drainage problem has been resolved.”

Sees:

```text
Before
After
Resolution note
```

Citizen says:

> ✅ Resolved

Then:

```text
Issue CLOSED
```

and submits:

```text
Rating: 4/5
```

Every important event is stored in the audit timeline.

That's the application.

---

# 32. The Product's Core Value Proposition

I would summarize the whole project as:

> **NagarFix turns scattered citizen complaints into accountable municipal work orders.**

The important transformation is:

```text
Citizen Report
      ↓
Verified Issue
      ↓
Smart Routing
      ↓
Responsible Team
      ↓
SLA-controlled Work
      ↓
Evidence-based Resolution
      ↓
Citizen Verification
      ↓
Public Accountability
```

That is a much stronger project story.

---

# 33. Our Engineering Challenges

This project can give you excellent interview discussion points.

### Database

* complex relational modeling
* composite indexes
* geospatial querying
* transactional consistency
* historical records

### Backend

* RBAC
* state machines
* assignment logic
* routing rules
* SLA calculations
* escalation logic

### Distributed/system concerns

* background jobs
* notification delivery
* Redis caching
* idempotency
* rate limiting

### Business logic

* duplicate reports
* reopening resolved cases
* workload balancing
* department jurisdiction
* citizen verification

### Observability/accountability

* audit logs
* status timeline
* SLA history

---

# 34. My Recommended MVP Boundary

I would **not** attempt to build everything above immediately.

The first real version should be:

```text
                   NAGARFIX
                      │
         ┌────────────┴────────────┐
         │                         │
      CITIZEN                  ADMIN/STAFF
         │                         │
   Create Request             Triage Request
         │                         │
   GPS + Category              Route
   Description                 Assign
   Attachments                    │
         │                        ▼
         │                   TECHNICIAN
         │                        │
         │                    Accept Job
         │                        │
         │                    Work Update
         │                        │
         │                    Resolution
         │                        │
         └───────────────┬────────┘
                         ▼
                  CITIZEN FEEDBACK
```

With these core mechanisms underneath:

```text
RBAC
+
State Machine
+
SLA
+
Assignment
+
Audit Log
+
Notifications
+
PostgreSQL Transactions
```

That is already a **serious backend project**.

---

# 35. One Important Architectural Decision

I'd recommend we treat this as a platform for **one city initially**, but model it so the architecture can later support multiple municipalities.

Conceptually:

```text
Platform
   │
   ├── City
   │    ├── Zones
   │    ├── Wards
   │    ├── Departments
   │    └── Staff
   │
   └── City
        ├── Zones
        ├── Wards
        ├── Departments
        └── Staff
```

So we get some of the benefits of multi-tenancy without making the MVP unnecessarily complicated.

---

# Final Project Definition

## **NagarFix — City Complaint & Service Request Platform**

**NagarFix is a municipal service management platform that allows citizens to report civic problems or request public services, while enabling city departments to intelligently route, assign, track, resolve, verify, and analyze those requests.**

### Core capabilities

```text
Citizen Reporting
      +
Location Intelligence
      +
Department Routing
      +
Issue Deduplication
      +
Technician Assignment
      +
SLA Management
      +
Field Work Tracking
      +
Resolution Evidence
      +
Citizen Verification
      +
Auditability
      +
Analytics
```

The key idea is **not** “a website where citizens submit complaints.”

It is:

> **A complete operational lifecycle for converting a citizen-reported problem into a verified municipal resolution.**

That gives us a strong foundation for the next stages: **requirements → domain entities → business rules → Prisma database design → state machine → API modules → architecture**.

[1]: https://grs.gov.bd/?utm_source=chatgpt.com "অভিযোগ প্রতিকার ব্যবস্থা"
[2]: https://digijanta.in/?utm_source=chatgpt.com "Digi Janta — Smart Nagar Palika Governance Platform"
[3]: https://www.nyc.gov/site/311reporting/311-reports/service-requests.page?utm_source=chatgpt.com "Service Requests - 311 Reporting"
[4]: https://www.frontiersin.org/journals/sustainable-cities/articles/10.3389/frsc.2025.1491621/full?utm_source=chatgpt.com "Frontiers | Traffy Fondue: a smart city citizen engagement"
