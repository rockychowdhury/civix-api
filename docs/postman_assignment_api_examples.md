# Assignment Module - Postman API Examples

Use these examples to test the Assignment module endpoints in Postman. 
*Note: Make sure to replace `:id` and any `uuid-here` placeholders with actual UUIDs from your database, and ensure you are passing the required Bearer Token in the `Authorization` header.*

---

## 1. Create an Assignment
**Method**: `POST`  
**Endpoint**: `/api/v1/assignments`  
*(Assigns a Work Order to either a specific Technician or a Team)*

**Payload (Individual Assignment)**:
```json
{
  "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "assignedToId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Payload (Team Assignment)**:
```json
{
  "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "teamId": "987e6543-e21b-34c5-b897-1234567890ab"
}
```

---

## 2. Get My Assignments (Technician View)
**Method**: `GET`  
**Endpoint**: `/api/v1/assignments/my-assignments?page=1&limit=10&status=PENDING`  
*(Fetches assignments assigned directly to the authenticated user, or to a team they belong to)*

**Payload**: *None (Use Query Parameters)*

---

## 3. Get All Assignments (Dispatcher/Admin View)
**Method**: `GET`  
**Endpoint**: `/api/v1/assignments?page=1&limit=10&status=TEAM_ASSIGNED`  
*(Fetches all assignments in the system. Can filter by `status`, `teamId`, `assignedToId`, `workOrderId`)*

**Payload**: *None (Use Query Parameters)*

---

## 4. Get Assignment by ID
**Method**: `GET`  
**Endpoint**: `/api/v1/assignments/550e8400-e29b-41d4-a716-446655440000`  
*(Fetches detailed relations including the Work Order, Civic Issue, and Team Members)*

**Payload**: *None*

---

## 5. Update Status (Accept/Reject)
**Method**: `PATCH`  
**Endpoint**: `/api/v1/assignments/550e8400-e29b-41d4-a716-446655440000/status`  
*(Used by the assigned technician or team lead to acknowledge the assignment)*

**Payload**:
```json
{
  "status": "ACCEPTED", 
  "notes": "I have reviewed the details and will proceed."
}
```
*(Status must be `"ACCEPTED"` or `"REJECTED"`)*

---

## 6. Reassign Assignment
**Method**: `PATCH`  
**Endpoint**: `/api/v1/assignments/550e8400-e29b-41d4-a716-446655440000/reassign`  
*(Used by Dispatchers or Team Leads to hand over an assignment to someone else)*

**Payload (Reassign to individual)**:
```json
{
  "assignedToId": "123e4567-e89b-12d3-a456-426614174000",
  "reason": "Previous technician called in sick."
}
```

**Payload (Reassign to team)**:
```json
{
  "teamId": "987e6543-e21b-34c5-b897-1234567890ab",
  "reason": "Escalating to the advanced plumbing team."
}
```

---

## 7. Unassign (Revoke) Assignment
**Method**: `PATCH`  
**Endpoint**: `/api/v1/assignments/550e8400-e29b-41d4-a716-446655440000/unassign`  
*(Used by Dispatchers to pull a work order back to the `TRIAGED` queue without immediately assigning it)*

**Payload**: *None (Empty Body)*


# Staff & Team Hierarchy Module - Postman API Examples

---

## 8. Create Platform Admin
**Method**: `POST`  
**Endpoint**: `/api/v1/staff/platform-admin`  
*(Can only be called by SUPER_ADMIN)*

**Payload**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "platform@example.com",
  "password": "securepassword123",
  "phone": "1234567890",
  "designation": "Head of Platform"
}
```

---

## 9. Create City Admin
**Method**: `POST`  
**Endpoint**: `/api/v1/staff/city-admin`  
*(Can only be called by SUPER_ADMIN or PLATFORM_ADMIN)*

**Payload**:
```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "cityadmin@example.com",
  "password": "securepassword123",
  "municipalityId": "municipality-uuid-here"
}
```

---

## 10. Create Department Staff (Manager, Dispatcher, Technician)
**Methods**: `POST`  
**Endpoints**:
- `/api/v1/staff/department-manager`
- `/api/v1/staff/dispatcher`
- `/api/v1/staff/technician`  
*(Contextual auth: Callers must have authority over the specified department)*

**Payload (Applicable for all 3 endpoints)**:
```json
{
  "firstName": "Bob",
  "lastName": "Builder",
  "email": "tech@example.com",
  "password": "securepassword123",
  "departmentId": "department-uuid-here"
}
```

---

## 11. Get All Staff & Get Technicians (Auto-Filtered)
**Method**: `GET`  
**Endpoints**: 
- `/api/v1/staff?page=1&limit=10`
- `/api/v1/staff/technicians?page=1&limit=10`  
*(Automatically filters results based on the caller's level of authority)*

**Payload**: *None (Use Query Parameters)*

---

## 12. Create a Team
**Method**: `POST`  
**Endpoint**: `/api/v1/teams`  
*(Used by Managers/Dispatchers to assemble teams for assignments)*

**Payload**:
```json
{
  "name": "Rapid Response Plumbers",
  "code": "RRP-01",
  "departmentId": "department-uuid-here",
  "leaderId": "leader-staff-uuid-here",
  "memberIds": [
    "member-1-uuid-here",
    "member-2-uuid-here"
  ]
}
```

---

## 13. Get All Teams (Auto-Filtered)
**Method**: `GET`  
**Endpoint**: `/api/v1/teams?page=1&limit=10`  
*(Automatically filters results based on the caller's level of authority)*

**Payload**: *None (Use Query Parameters)*
